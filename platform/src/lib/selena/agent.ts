import { NYCMAID_PROMPT, NYCMAID_PLAYBOOK } from './tenants/nycmaid'
// Yinez — The NYC Maid's brain.
// One agent. All channels. All clients. Full ops. Full memory.
// Replaces Maria, Selena, Selena2.

import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { runTool } from '@/lib/selena/tools'
import { getCurrentTenantId } from '@/lib/tenant'
import { buildPlaybook } from './build-playbook'
import { getAgentConfig } from './agent-config-loader'
import { resolveAnthropic } from '@/lib/anthropic-client'
import { getPersona, applyPersonaToConfig, renderPersonaExtras } from './persona-file'

export type Channel = 'sms' | 'web' | 'email' | 'telegram'

export interface YinezResult {
  text: string
  toolsCalled: string[]
  bookingCreated?: boolean
  escalated?: boolean
}

// Per-turn structured context the caller assembles BEFORE asking Yinez. Lets
// her treat "5" as a rating reply (not a greeting) when last_outbound was a
// rating prompt, "paid" as confirmable when expected_balance is set, etc.
// Anything the caller can't or didn't pre-fetch may be omitted.
export interface YinezContext {
  last_outbound?: { sms_type: string; created_at: string; booking_id: string | null } | null
  linked_booking?: {
    id: string
    start_time: string
    status: string
    hourly_rate: number | null
    payment_status: string | null
    expected_balance_cents?: number | null
  } | null
  expected_balance_cents?: number | null
  recent_inbounds?: Array<{ message: string; created_at: string }>
  escalation_locked?: boolean
}

// No module-level client: per-tenant billing means the Anthropic key is
// resolved per request from the conversation's tenant (its own key if set,
// platform key otherwise). See resolveAnthropic() in lib/anthropic-client.

export const YINEZ_PROMPT = NYCMAID_PROMPT

// Generic agent discipline shared by every tenant — the slice of YINEZ_PROMPT
// before nyc-maid's persona begins. Non-nyc-maid tenants ride this + their own
// buildPlaybook() output instead of nyc-maid's cleaning persona. nyc-maid keeps
// the full YINEZ_PROMPT verbatim.
const SHARED_PREAMBLE = YINEZ_PROMPT.slice(0, YINEZ_PROMPT.indexOf('You are Yinez. You run The NYC Maid'))

// Byte-identical guard (design-doc safety gate): nyc-maid's assembled prompt must
// equal its authored prompt exactly. Fires if any future slice drifts the crown jewel.
if (SHARED_PREAMBLE + NYCMAID_PLAYBOOK !== NYCMAID_PROMPT) {
  throw new Error('[selena] nyc-maid prompt invariant broken: SHARED_PREAMBLE + NYCMAID_PLAYBOOK !== NYCMAID_PROMPT')
}

const TOOLS: Anthropic.Tool[] = [
  { name: 'create_booking', description: 'Create a booking after recap confirmation. Args: date, time, service_type (regular/deep/move_in_out/airbnb/emergency), hourly_rate, estimated_hours, recurring_type (one_time/weekly/biweekly/monthly). For brand-new clients with no profile on file, ALSO pass client_name (REQUIRED for new clients) plus client_email and client_address if collected — the handler auto-creates the client record.', input_schema: { type: 'object' as const, properties: { date: { type: 'string' }, time: { type: 'string' }, service_type: { type: 'string' }, hourly_rate: { type: 'number' }, estimated_hours: { type: 'number' }, recurring_type: { type: 'string' }, client_name: { type: 'string' }, client_email: { type: 'string' }, client_address: { type: 'string' } }, required: ['date', 'time', 'service_type', 'hourly_rate', 'estimated_hours'] } },
  { name: 'lookup_bookings', description: "Get current client's upcoming bookings.", input_schema: { type: 'object' as const, properties: {}, required: [] } },
  { name: 'reschedule_booking', description: 'Reschedule an existing booking. Args: booking_id, new_date, new_time.', input_schema: { type: 'object' as const, properties: { booking_id: { type: 'string' }, new_date: { type: 'string' }, new_time: { type: 'string' } }, required: ['booking_id', 'new_date', 'new_time'] } },
  { name: 'cancel_booking', description: 'Cancel a booking. Args: booking_id, reason.', input_schema: { type: 'object' as const, properties: { booking_id: { type: 'string' }, reason: { type: 'string' } }, required: ['booking_id'] } },
  { name: 'confirm_payment', description: 'Mark client payment confirmed. Args: method (zelle/venmo/cashapp/card), sender_name (optional, if paid by someone else).', input_schema: { type: 'object' as const, properties: { method: { type: 'string' }, sender_name: { type: 'string' } }, required: ['method'] } },
  { name: 'check_payment', description: 'Check payment status / outstanding balance for current client.', input_schema: { type: 'object' as const, properties: {}, required: [] } },
  { name: 'send_pin', description: 'Resend portal PIN to current client.', input_schema: { type: 'object' as const, properties: {}, required: [] } },
  { name: 'resend_confirmation', description: 'Resend booking confirmation email to current client.', input_schema: { type: 'object' as const, properties: {}, required: [] } },
  { name: 'update_account', description: 'Update client account info. Args: field (address/email/phone), value.', input_schema: { type: 'object' as const, properties: { field: { type: 'string' }, value: { type: 'string' } }, required: ['field', 'value'] } },
  { name: 'request_callback', description: 'Flag for owner callback. Args: reason.', input_schema: { type: 'object' as const, properties: { reason: { type: 'string' } }, required: ['reason'] } },
  { name: 'report_issue', description: 'Document a complaint. Args: severity (low/medium/high), description.', input_schema: { type: 'object' as const, properties: { severity: { type: 'string' }, description: { type: 'string' } }, required: ['severity', 'description'] } },
  { name: 'remember', description: 'Save a fact for future conversations. Args: type, content. Per-client types: preference, observation, issue, payment, instruction (saves under the current conversation\'s client). Global types: lesson, rule (no client_id — applies to ALL future conversations; use these when Jeff teaches you something general about the business). On Telegram with Jeff, prefer lesson/rule.', input_schema: { type: 'object' as const, properties: { type: { type: 'string' }, content: { type: 'string' } }, required: ['type', 'content'] } },
  { name: 'recall', description: 'Look up what we remember about the current client. Returns saved preferences, past issues, observations.', input_schema: { type: 'object' as const, properties: {}, required: [] } },
  { name: 'get_today_summary', description: "Today's bookings, payouts owed, outstanding payments, cleaners on duty.", input_schema: { type: 'object' as const, properties: {}, required: [] } },
  { name: 'get_revenue', description: 'Revenue for a period. Args: period (today/week/month/ytd).', input_schema: { type: 'object' as const, properties: { period: { type: 'string' } }, required: ['period'] } },
  { name: 'lookup_client', description: 'Find a client by name or phone. Returns profile, booking count, LTV, last booking.', input_schema: { type: 'object' as const, properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'list_bookings', description: 'Bookings for a date or date range, optionally filtered by cleaner. Args: date or from_date+to_date, optional cleaner_id.', input_schema: { type: 'object' as const, properties: { date: { type: 'string' }, from_date: { type: 'string' }, to_date: { type: 'string' }, cleaner_id: { type: 'string' } }, required: [] } },
  { name: 'lookup_cleaner', description: 'Cleaner profile: last 5 jobs, payout owed, ratings. Args: name.', input_schema: { type: 'object' as const, properties: { name: { type: 'string' } }, required: ['name'] } },
  { name: 'get_outstanding_payments', description: 'Clients with unpaid bookings, oldest first.', input_schema: { type: 'object' as const, properties: {}, required: [] } },
  { name: 'get_at_risk_clients', description: 'Clients with no booking 45+ days.', input_schema: { type: 'object' as const, properties: {}, required: [] } },
  { name: 'search_messages', description: 'Search SMS messages from last 30 days. Args: query.', input_schema: { type: 'object' as const, properties: { query: { type: 'string' } }, required: ['query'] } },

  // Owner-only CONTROL tools — destructive. Confirm with the user before calling.
  { name: 'assign_cleaner_to_booking', description: 'Assign a cleaner to a booking. Args: booking_id, cleaner_id.', input_schema: { type: 'object' as const, properties: { booking_id: { type: 'string' }, cleaner_id: { type: 'string' } }, required: ['booking_id', 'cleaner_id'] } },
  { name: 'send_message_to_client', description: 'Send an SMS or email to a specific client from The NYC Maid. Args: client_id, message, channel (sms or email, default sms).', input_schema: { type: 'object' as const, properties: { client_id: { type: 'string' }, message: { type: 'string' }, channel: { type: 'string' } }, required: ['client_id', 'message'] } },
  { name: 'send_message_to_cleaner', description: 'SMS a specific cleaner. Args: cleaner_id, message.', input_schema: { type: 'object' as const, properties: { cleaner_id: { type: 'string' }, message: { type: 'string' } }, required: ['cleaner_id', 'message'] } },
  { name: 'send_broadcast', description: 'Broadcast an SMS to a group. Args: audience (all_clients/recurring_clients/all_cleaners), message. CONFIRM before calling — this hits everyone.', input_schema: { type: 'object' as const, properties: { audience: { type: 'string' }, message: { type: 'string' } }, required: ['audience', 'message'] } },
  { name: 'create_manual_booking', description: 'Create a booking directly without going through the chat flow. Args: client_id, date, time, service_type, hourly_rate, estimated_hours, optional cleaner_id.', input_schema: { type: 'object' as const, properties: { client_id: { type: 'string' }, date: { type: 'string' }, time: { type: 'string' }, service_type: { type: 'string' }, hourly_rate: { type: 'number' }, estimated_hours: { type: 'number' }, cleaner_id: { type: 'string' } }, required: ['client_id', 'date', 'time', 'service_type', 'hourly_rate', 'estimated_hours'] } },
  { name: 'update_booking', description: 'Update booking fields. Args: booking_id, fields (object — allowed: status, payment_status, cleaner_id, hourly_rate, start_time, end_time, notes, service_type). Duration is derived from start_time/end_time — there is no estimated_hours column.', input_schema: { type: 'object' as const, properties: { booking_id: { type: 'string' }, fields: { type: 'object' } }, required: ['booking_id', 'fields'] } },
  { name: 'approve_refund', description: 'Approve a refund (records approval; Stripe processing is separate). Args: booking_id, amount_dollars, reason.', input_schema: { type: 'object' as const, properties: { booking_id: { type: 'string' }, amount_dollars: { type: 'number' }, reason: { type: 'string' } }, required: ['booking_id', 'amount_dollars', 'reason'] } },
  { name: 'mark_payment_received', description: 'Mark payment received outside Stripe (e.g. Zelle/Venmo manually verified). Args: booking_id, amount_dollars, method.', input_schema: { type: 'object' as const, properties: { booking_id: { type: 'string' }, amount_dollars: { type: 'number' }, method: { type: 'string' } }, required: ['booking_id', 'amount_dollars', 'method'] } },
  { name: 'mark_payout_paid', description: 'Mark a cleaner payout as paid. Args: payout_id.', input_schema: { type: 'object' as const, properties: { payout_id: { type: 'string' } }, required: ['payout_id'] } },
  { name: 'block_client', description: 'Mark a client as do_not_service. Args: client_id, reason.', input_schema: { type: 'object' as const, properties: { client_id: { type: 'string' }, reason: { type: 'string' } }, required: ['client_id', 'reason'] } },
  { name: 'create_client', description: 'Create a new client record AND link the current conversation to it so the transcript appears in their feed. Call this immediately after lookup_client returns no match. Args: name, phone, optional email.', input_schema: { type: 'object' as const, properties: { name: { type: 'string' }, phone: { type: 'string' }, email: { type: 'string' } }, required: ['name', 'phone'] } },

  // Cleaner CRUD
  { name: 'create_cleaner', description: 'Add a new cleaner. Args: name, phone, optional email, optional zone.', input_schema: { type: 'object' as const, properties: { name: { type: 'string' }, phone: { type: 'string' }, email: { type: 'string' }, zone: { type: 'string' } }, required: ['name', 'phone'] } },
  { name: 'update_cleaner', description: 'Update a cleaner. Args: cleaner_id, fields (object — allowed: name, phone, email, zone, status, sms_consent, hourly_rate, has_car, labor_only).', input_schema: { type: 'object' as const, properties: { cleaner_id: { type: 'string' }, fields: { type: 'object' } }, required: ['cleaner_id', 'fields'] } },
  { name: 'deactivate_cleaner', description: 'Set cleaner status to inactive. Args: cleaner_id, reason.', input_schema: { type: 'object' as const, properties: { cleaner_id: { type: 'string' }, reason: { type: 'string' } }, required: ['cleaner_id'] } },
  { name: 'list_cleaners', description: 'List all cleaners with status filter. Args: status (active/inactive/all, default active).', input_schema: { type: 'object' as const, properties: { status: { type: 'string' } }, required: [] } },

  // Recurring schedules
  { name: 'list_recurring', description: 'List recurring schedules. Optional client_id or status filter.', input_schema: { type: 'object' as const, properties: { client_id: { type: 'string' }, status: { type: 'string' } }, required: [] } },
  { name: 'pause_recurring', description: 'Pause a recurring schedule until a date. Args: schedule_id, until_date (YYYY-MM-DD).', input_schema: { type: 'object' as const, properties: { schedule_id: { type: 'string' }, until_date: { type: 'string' } }, required: ['schedule_id'] } },
  { name: 'resume_recurring', description: 'Resume a paused recurring schedule. Args: schedule_id.', input_schema: { type: 'object' as const, properties: { schedule_id: { type: 'string' } }, required: ['schedule_id'] } },
  { name: 'cancel_recurring', description: 'Cancel a recurring schedule. Args: schedule_id, reason.', input_schema: { type: 'object' as const, properties: { schedule_id: { type: 'string' }, reason: { type: 'string' } }, required: ['schedule_id'] } },

  // Deals / sales pipeline
  { name: 'list_deals', description: 'List deals (sales pipeline) by stage. Args: stage (active/won/lost/all).', input_schema: { type: 'object' as const, properties: { stage: { type: 'string' } }, required: [] } },
  { name: 'create_deal', description: 'Create a deal. Args: client_id, value_dollars, follow_up_at (ISO), optional note.', input_schema: { type: 'object' as const, properties: { client_id: { type: 'string' }, value_dollars: { type: 'number' }, follow_up_at: { type: 'string' }, note: { type: 'string' } }, required: ['client_id'] } },
  { name: 'update_deal', description: 'Update a deal. Args: deal_id, fields (object — allowed: stage, value_dollars, follow_up_at, follow_up_note, notes).', input_schema: { type: 'object' as const, properties: { deal_id: { type: 'string' }, fields: { type: 'object' } }, required: ['deal_id', 'fields'] } },

  // Notifications
  { name: 'list_notifications', description: 'List recent notifications. Args: type (optional), limit (default 20).', input_schema: { type: 'object' as const, properties: { type: { type: 'string' }, limit: { type: 'number' } }, required: [] } },
  { name: 'mark_notification_read', description: 'Mark a notification as read. Args: notification_id.', input_schema: { type: 'object' as const, properties: { notification_id: { type: 'string' } }, required: ['notification_id'] } },

  // Cleaner applications
  { name: 'list_cleaner_applications', description: 'List cleaner applications. Args: status (pending/approved/rejected/all, default pending).', input_schema: { type: 'object' as const, properties: { status: { type: 'string' } }, required: [] } },
  { name: 'approve_cleaner_application', description: 'Approve a cleaner application. Args: application_id.', input_schema: { type: 'object' as const, properties: { application_id: { type: 'string' } }, required: ['application_id'] } },
  { name: 'reject_cleaner_application', description: 'Reject a cleaner application. Args: application_id, reason.', input_schema: { type: 'object' as const, properties: { application_id: { type: 'string' }, reason: { type: 'string' } }, required: ['application_id'] } },

  // Settings + service types
  { name: 'get_setting', description: 'Read a row from the settings table. Args: key.', input_schema: { type: 'object' as const, properties: { key: { type: 'string' } }, required: ['key'] } },
  { name: 'update_setting', description: 'Upsert a settings row. Args: key, value (any JSON).', input_schema: { type: 'object' as const, properties: { key: { type: 'string' }, value: {} }, required: ['key', 'value'] } },
  { name: 'list_service_types', description: 'List configured service types.', input_schema: { type: 'object' as const, properties: {}, required: [] } },

  // Stripe + cron
  { name: 'process_stripe_refund', description: 'Actually issue a Stripe refund (after approve_refund). Args: booking_id, amount_dollars, reason.', input_schema: { type: 'object' as const, properties: { booking_id: { type: 'string' }, amount_dollars: { type: 'number' }, reason: { type: 'string' } }, required: ['booking_id', 'amount_dollars'] } },
  { name: 'trigger_cron', description: 'Manually fire a cron endpoint by name (e.g. payment-reminder, rating-prompt, reminders).', input_schema: { type: 'object' as const, properties: { name: { type: 'string' } }, required: ['name'] } },

  // Cleaner availability
  { name: 'block_cleaner_dates', description: 'Mark a cleaner unavailable for a date range. Args: cleaner_id, from_date, to_date, reason.', input_schema: { type: 'object' as const, properties: { cleaner_id: { type: 'string' }, from_date: { type: 'string' }, to_date: { type: 'string' }, reason: { type: 'string' } }, required: ['cleaner_id', 'from_date', 'to_date'] } },

  // Skills — Jeff-authored procedures Yinez follows. Different from `remember`: skills are
  // structured procedures (name + when_to_use + body), memories are facts. Active skills
  // auto-load into the system prompt every conversation. Use these when Jeff teaches a
  // multi-step workflow ("when X happens, here\'s how to handle it").
  { name: 'list_skills', description: 'List Yinez\'s skills. Args: include_inactive (default false).', input_schema: { type: 'object' as const, properties: { include_inactive: { type: 'boolean' } }, required: [] } },
  { name: 'create_skill', description: 'Create a new skill (procedure Yinez should follow when a trigger matches). Args: name (short slug), when_to_use (one-line trigger description — what conversation pattern activates this), body (the procedure / script / checklist). Use when Jeff teaches a workflow.', input_schema: { type: 'object' as const, properties: { name: { type: 'string' }, when_to_use: { type: 'string' }, body: { type: 'string' } }, required: ['name', 'when_to_use', 'body'] } },
  { name: 'update_skill', description: 'Update a skill. Args: name (the skill name), fields (object — allowed: when_to_use, body, active).', input_schema: { type: 'object' as const, properties: { name: { type: 'string' }, fields: { type: 'object' } }, required: ['name', 'fields'] } },
  { name: 'deactivate_skill', description: 'Stop loading a skill into context (preserves it). Args: name.', input_schema: { type: 'object' as const, properties: { name: { type: 'string' } }, required: ['name'] } },
  { name: 'activate_skill', description: 'Reactivate a previously deactivated skill. Args: name.', input_schema: { type: 'object' as const, properties: { name: { type: 'string' } }, required: ['name'] } },
  { name: 'record_skill_use', description: 'Increment a skill\'s hit_count when you actually follow it. Call this AFTER you reply using a skill\'s procedure, so we can see which skills get used. Args: name.', input_schema: { type: 'object' as const, properties: { name: { type: 'string' } }, required: ['name'] } },
  { name: 'get_briefing', description: 'Owner briefing — new skills, new lessons, low-scored conversations, escalations, payouts pending, outstanding payments, all within the last N hours (default 24). Use when Jeff opens Telegram and says "briefing", "what\'s up", "catch me up", or you want to proactively surface what changed.', input_schema: { type: 'object' as const, properties: { since_hours: { type: 'number' } }, required: [] } },
  { name: 'score_cleaners', description: 'Run the smart-scheduling algorithm on a candidate slot. Returns the SAME ranked cleaner list Jeff sees in the admin booking form: availability, conflicts (with the conflicting client + time), day-off reasons, score, zone match, car requirement, home-by-time. Use BEFORE creating a booking to plan the assignment, or to answer "who can do this slot?". Args: date (YYYY-MM-DD), time ("9am" or "09:00"), duration_hours, optional client_address, client_id, exclude_booking_id, hourly_rate.', input_schema: { type: 'object' as const, properties: { date: { type: 'string' }, time: { type: 'string' }, duration_hours: { type: 'number' }, client_address: { type: 'string' }, client_id: { type: 'string' }, exclude_booking_id: { type: 'string' }, hourly_rate: { type: 'number' } }, required: ['date', 'time', 'duration_hours'] } },
  { name: 'get_smart_suggestion', description: 'For an existing booking, return the saved suggestion reason + a fresh re-scoring of all cleaners for that slot. Use when Jeff asks "why did you pick X?" or "who else could do this job?". Args: booking_id.', input_schema: { type: 'object' as const, properties: { booking_id: { type: 'string' } }, required: ['booking_id'] } },
  { name: 'suggest_times', description: 'OWNER-ONLY. When nobody fits the time you wanted, scan the day and return the best ALTERNATE start times, each paired with the cleaner who fits it — ranked smart-cluster first (a cleaner already finishing a job nearby beats an isolated slot). Use when the owner asks "nobody\'s free at 10, what times work?" or to plan around a tight day. Args: date (YYYY-MM-DD), duration_hours, optional client_address, client_id, hourly_rate, team_size, requested_time ("10:00" — excluded from results), exclude_booking_id. NEVER use on a client channel — clients self-book.', input_schema: { type: 'object' as const, properties: { date: { type: 'string' }, duration_hours: { type: 'number' }, client_address: { type: 'string' }, client_id: { type: 'string' }, hourly_rate: { type: 'number' }, team_size: { type: 'number' }, requested_time: { type: 'string' }, exclude_booking_id: { type: 'string' } }, required: ['date', 'duration_hours'] } },
]

/**
 * Resolve the tenant for a given conversation. Looks up the
 * sms_conversations row for an explicit tenant_id; falls back to the
 * default tenant (nycmaid) if the conversation row pre-dates the tenant
 * column or the lookup fails. Never throws — Yinez must keep talking.
 */
async function resolveTenantForConversation(conversationId: string): Promise<string> {
  try {
    const { data } = await supabaseAdmin
      .from('sms_conversations')
      .select('tenant_id')
      .eq('id', conversationId)
      .single()
    const tid = (data as { tenant_id?: string } | null)?.tenant_id
    if (tid) return tid
  } catch {
    // fall through to default
  }
  return getCurrentTenantId()
}

export function isOwner(phone: string | null | undefined): boolean {
  if (!phone) return false
  const list = (process.env.OWNER_PHONES || '').split(',').map((p) => p.replace(/\D/g, '').slice(-10)).filter(Boolean)
  const norm = phone.replace(/\D/g, '').slice(-10)
  return list.includes(norm)
}

// nycmaid's well-known UUID — when the tenant being served IS nycmaid, the
// hardcoded references inside YINEZ_PROMPT are correct as-is.
const NYCMAID_TENANT_ID = '00000000-0000-0000-0000-000000000001'

/**
 * Build a brand-override preamble for non-nycmaid tenants. Yinez's main
 * system prompt was authored for The NYC Maid and contains hardcoded
 * references (company name, phone, domain, payment handles). Rather than
 * rewrite the prompt and risk regressing tested behavior, we PREPEND a
 * brand override that instructs Yinez to substitute tenant-specific
 * values everywhere.
 *
 * For the nycmaid tenant the override is empty — the original prompt is
 * already correct.
 */
async function buildBrandOverride(tenantId: string): Promise<string> {
  if (tenantId === NYCMAID_TENANT_ID) return ''

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, name, slug, domain, phone, email, industry, address, tagline, website_url, primary_color, agent_name')
    .eq('id', tenantId)
    .single()

  if (!tenant) return ''

  const cfg = (tenant as { brand_config?: Record<string, unknown> }).brand_config || {}
  const phone = tenant.phone || (cfg.phone as string) || '<not configured>'
  const email = tenant.email || (cfg.email as string) || '<not configured>'
  const domain = tenant.domain || tenant.website_url?.replace(/^https?:\/\//, '').replace(/\/$/, '') || '<not configured>'
  const portal = `${tenant.website_url || `https://${tenant.domain || ''}`}/portal`
  const industry = tenant.industry || 'home services'
  // FullLoop platform default agent is "Jefe"; each tenant may override via
  // tenants.agent_name. The template prompt below names the agent "Yinez" 40+
  // times (nycmaid's persona) — substitute the tenant's agent name everywhere.
  const agentName = tenant.agent_name || 'Jefe'

  return `=== BRAND OVERRIDE — READ FIRST, APPLY THROUGHOUT ===

You are working for ${tenant.name} — NOT The NYC Maid. The system prompt below
was originally written for The NYC Maid and contains hardcoded references that
must be SUBSTITUTED with the values below for every interaction.

Your name is ${agentName}. The template prompt below calls the agent "Yinez"
everywhere — that is The NYC Maid's persona, NOT yours. Whenever the prompt says
"Yinez" (introductions, "I'm Yinez", "me llamo Yinez", "are you a bot" answer,
every example), use "${agentName}" instead. Introduce yourself as ${agentName}.
You are NOT Yinez and you never call yourself Yinez.

Substitution table (apply mentally on every reference):
  Agent name        "Yinez"                  →  "${agentName}"
  Company name      "The NYC Maid"          →  "${tenant.name}"
  Phone             "(212) 202-8400"         →  "${phone}"
  Domain            "thenycmaid.com"         →  "${domain}"
  Email             "hi@thenycmaid.com"      →  "${email}"
  Venmo handle      "@thenycmaid"            →  (use ${tenant.name}'s configured handle, or omit)
  Portal            "thenycmaid.com/portal"  →  "${portal}"
  Industry          "cleaning service"       →  "${industry}"
  ${tenant.tagline ? `Tagline                                          →  "${tenant.tagline}"` : ''}

When you'd quote any nycmaid-specific value above, substitute the right column.
NEVER quote The NYC Maid, the (212) 202-8400 number, thenycmaid.com, or
hi@thenycmaid.com to a ${tenant.name} client. Those are template artifacts.

Pricing, policies, and tools that are nycmaid-specific (cleaning rates,
"Insured up to $1 million", etc) DO NOT APPLY here. If a tool or response
would only make sense for nycmaid, ask the owner instead of inventing.

If anything in the prompt below conflicts with this override, the override
wins. Period.

=== END BRAND OVERRIDE — ORIGINAL TEMPLATE PROMPT FOLLOWS ===

`
}

export async function loadContext(tenantId: string, phone: string | null, _conversationId: string): Promise<string> {
  const parts: string[] = []

  if (isOwner(phone)) {
    parts.push('CONTEXT: You are talking to Jeff, the owner of The NYC Maid. Use admin tools freely. Be terse with real numbers.')
  }

  if (phone && !isOwner(phone)) {
    const last10 = phone.replace(/\D/g, '').slice(-10)
    // Phone may match multiple client rows (duplicates created by lead intake vs. booking flow).
    // .maybeSingle() returned null on dupes, so Yinez was treating returning clients as brand-new.
    // Pick the canonical record: 'active' beats 'potential', then most-recent created_at.
    const { data: clientCandidates } = await supabaseAdmin
      .from('clients')
      .select('id, name, address, email, last_rate, notes, created_at, preferred_cleaner_id, status')
      .eq('tenant_id', tenantId)
      .ilike('phone', `%${last10}%`)
      .limit(5)

    const client = (clientCandidates || []).slice().sort((a, b) => {
      const sa = a.status === 'active' ? 0 : 1
      const sb = b.status === 'active' ? 0 : 1
      if (sa !== sb) return sa - sb
      return (b.created_at || '').localeCompare(a.created_at || '')
    })[0] || null

    if (client) {
      const { count: bookingCount } = await supabaseAdmin
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('client_id', client.id)
      parts.push(`CLIENT: ${client.name || 'name unknown'} | ${bookingCount || 0} prior bookings | last rate $${client.last_rate || '?'}/hr | address: ${client.address || 'unknown'}`)
      if (client.notes) parts.push(`NOTES: ${client.notes}`)

      // Preferred cleaner — surface so Yinez can mention them when booking.
      if (client.preferred_cleaner_id) {
        const { data: pref } = await supabaseAdmin
          .from('cleaners')
          .select('name')
          .eq('tenant_id', tenantId)
          .eq('id', client.preferred_cleaner_id)
          .maybeSingle()
        if (pref?.name) {
          parts.push(`PREFERRED CLEANER: ${pref.name}. When this client books, mention you'll send ${pref.name} if available ("you've been with ${pref.name} — I'll see if she's free for that slot"). If ${pref.name} is NOT available for the time they want, name a backup. Don't promise ${pref.name} until smart-schedule confirms.`)
        }
      }

      const { data: memories } = await supabaseAdmin
        .from('yinez_memory')
        .select('type, content')
        .eq('tenant_id', tenantId)
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
        .limit(10)
      if (memories && memories.length > 0) {
        parts.push('REMEMBERED:\n' + memories.map((m) => `- [${m.type}] ${m.content}`).join('\n'))
      }
    }
  }

  // Global lessons + rules Jeff has taught Yinez. Apply to every conversation regardless of channel
  // or client. These are the institutional knowledge layer — pricing exceptions, cleaner-specific
  // rules, policy clarifications, anything Jeff said "from now on, do X."
  const { data: globalLessons } = await supabaseAdmin
    .from('yinez_memory')
    .select('type, content, created_at')
    .eq('tenant_id', tenantId)
    .is('client_id', null)
    .in('type', ['lesson', 'rule', 'instruction'])
    .order('created_at', { ascending: false })
    .limit(50)
  if (globalLessons && globalLessons.length > 0) {
    parts.push(
      'LESSONS FROM JEFF (apply to ALL conversations):\n' +
        globalLessons.map((l) => `- [${l.type}] ${l.content}`).join('\n'),
    )
  }

  // Skills — structured procedures. Active rows auto-load. Yinez should follow the body
  // verbatim when the conversation matches `when_to_use`. Different from lessons (one-liners) —
  // skills are full workflows.
  const { data: skills } = await supabaseAdmin
    .from('yinez_skills')
    .select('name, when_to_use, body')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .order('updated_at', { ascending: false })
    .limit(40)
  if (skills && skills.length > 0) {
    parts.push(
      'SKILLS (follow these procedures when their trigger matches):\n' +
        skills
          .map((s) => `── SKILL: ${s.name}\nWHEN: ${s.when_to_use}\nDO:\n${s.body}`)
          .join('\n\n'),
    )
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' })
  parts.push(`TODAY: ${today}`)

  return parts.length > 0 ? '\n\n' + parts.join('\n\n') : ''
}

// Literal NYC-template tokens leak into DETERMINISTIC (non-LLM) responses in
// core.ts — booking confirmations, quick replies, fallback messages. The brand
// override only steers the LLM; those hardcoded strings bypass it. So for
// non-nycmaid tenants we rewrite the final outbound text token-by-token here.
// This is the safety net that lets a tenant be served without auditing all ~65
// hardcoded brand references individually.
async function applyBrandRewrite(text: string, tenantId: string): Promise<string> {
  if (!text || tenantId === NYCMAID_TENANT_ID) return text
  try {
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('name, domain, phone, email, website_url, agent_name')
      .eq('id', tenantId)
      .single()
    if (!tenant) return text
    const domain = tenant.domain || tenant.website_url?.replace(/^https?:\/\//, '').replace(/\/$/, '') || ''
    let out = text
    if (domain) out = out.replace(/thenycmaid\.com\/portal/gi, `${domain}/portal`)
    if (domain) out = out.replace(/thenycmaid\.com/gi, domain)
    if (tenant.email) out = out.replace(/hi@thenycmaid\.com/gi, tenant.email)
    // any (212) 202-XXXX nycmaid line → tenant phone
    if (tenant.phone) out = out.replace(/\(?212\)?[\s.\-]*202[\s.\-]*\d{4}/g, tenant.phone)
    if (tenant.name) out = out.replace(/\bThe NYC Maid\b/g, tenant.name).replace(/\bNYC Maid\b/g, tenant.name)
    // Agent name: deterministic core.ts strings ("I'm Yinez…") bypass the LLM
    // brand override. Rewrite the persona name to the tenant's agent (Jefe by
    // default). nycmaid early-returns above, so its "Yinez" is never touched.
    out = out.replace(/\bYinez\b/g, tenant.agent_name || 'Jefe')
    return out
  } catch {
    return text
  }
}

// Public entry point. Runs the agent, then rewrites NYC-template branding out of
// the response for non-nycmaid tenants before it ever reaches the customer.
export async function askSelena(channel: Channel, message: string, conversationId: string, phone?: string, ctx?: YinezContext): Promise<YinezResult> {
  const result = await askSelenaCore(channel, message, conversationId, phone, ctx)
  try {
    const tenantId = await resolveTenantForConversation(conversationId)
    if (tenantId !== NYCMAID_TENANT_ID && result?.text) {
      result.text = await applyBrandRewrite(result.text, tenantId)
    }
  } catch {
    // never let brand rewrite break a response
  }
  return result
}

async function askSelenaCore(channel: Channel, message: string, conversationId: string, phone?: string, ctx?: YinezContext): Promise<YinezResult> {
  const result: YinezResult = { text: '', toolsCalled: [] }

  try {
    const lookupPhone = phone || null
    // Resolve tenant for this conversation. v1: derive from sms_conversations.tenant_id;
    // fall back to current tenant (nycmaid) if the conversation row hasn't been
    // tagged yet. Phase 3.2: every downstream tool query gains .eq('tenant_id', tenantId).
    const tenantId = await resolveTenantForConversation(conversationId)

    // Resolve the Anthropic client for THIS tenant (their key if set, platform
    // key otherwise). Replaces the old global singleton so each tenant bills
    // against its own key.
    const anthropic = await resolveAnthropic(tenantId)

    // Phase 3.2 guard LIFTED (2026-07-02): the handler-level tenant-scoping sweep
    // is complete. Audit of every .from() in tools.ts (58/58) and core.ts (78/78)
    // confirmed each query is either tenant-scoped (.eq('tenant_id')), a unique
    // id/fk lookup (row-specific, derived from the tenant's own conversation), or
    // a global/config table (yinez_skills, yinez_memory, tenants, settings).
    // isCleanerPhone now requires tenantId. Yinez runs for every tenant, each on
    // its own tenant-scoped data + its own assembled playbook (below).

    // nyc-maid keeps its authored prompt verbatim. Every other tenant now gets
    // the shared discipline preamble + its OWN config-driven playbook — replacing
    // the old "ship nyc-maid's prompt + pretend you're {tenant}" brandOverride hack.
    // nyc-maid short-circuits to its verbatim authored prompt (byte-identical).
    // Every other tenant: shared discipline + config-driven playbook, now with
    // its authored personality file (selena_config) folded in and appended.
    let basePrompt: string
    if (tenantId === NYCMAID_TENANT_ID) {
      basePrompt = SHARED_PREAMBLE + NYCMAID_PLAYBOOK
    } else {
      const [cfg, persona] = await Promise.all([getAgentConfig(tenantId), getPersona(tenantId)])
      basePrompt = SHARED_PREAMBLE + buildPlaybook(applyPersonaToConfig(cfg, persona)) + renderPersonaExtras(persona)
    }
    const context = await loadContext(tenantId, lookupPhone, conversationId)
    const ctxBlock = ctx ? buildCtxBlock(ctx) : ''
    const channelNote = channel === 'telegram'
      ? `\n\nCHANNEL: Telegram — Jeff's private owner bot. The person here is ALWAYS Jeff (the owner). No client warmth, no "Hola I'm Yinez", no emojis. Terse, direct, real numbers from tools only.

Vague opener ("hey", "morning", "what's up") → call \`get_briefing\` first, lead with the raw digest. Quiet window → one line ("Quiet 24h. 3 bookings, no escalations.").

When Jeff teaches you something:
- Single fact/rule → \`remember\` (type: 'lesson' or 'rule', no client_id).
- Multi-step procedure → \`create_skill\` (name + when_to_use + body).
- Confirm only AFTER the tool returned ok. Format: "Saved as <thing>." If no tool maps, say so honestly — never fake-confirm.

When you don't know → "I don't know — show me once and I'll save it."
When you flubbed on another channel → flag it here unprompted next check-in.`
      : ''
    const systemPrompt = basePrompt + context + channelNote + ctxBlock

    const { data: msgs } = await supabaseAdmin
      .from('sms_conversation_messages')
      .select('direction, message')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20)

    const messages: Array<{ role: 'user' | 'assistant'; content: string | Anthropic.Messages.ContentBlockParam[] }> = (msgs || []).map((m) => ({
      role: (m.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.message,
    }))
    messages.push({ role: 'user', content: message })

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 45000)

    try {
      for (let i = 0; i < 5; i++) {
        const response = await anthropic.messages.create(
          { model: 'claude-sonnet-4-6', max_tokens: 1024, system: systemPrompt, messages, tools: TOOLS },
          { signal: controller.signal },
        )

        const textBlocks = response.content.filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
        const toolBlocks = response.content.filter((b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use')

        if (textBlocks.length > 0) {
          result.text = textBlocks.map((b) => b.text).join(' ').trim()
        }

        if (toolBlocks.length === 0) break

        messages.push({ role: 'assistant', content: response.content as Anthropic.Messages.ContentBlockParam[] })

        const toolResults: Anthropic.Messages.ToolResultBlockParam[] = []
        for (const tool of toolBlocks) {
          result.toolsCalled.push(tool.name)
          let toolResult: string
          try {
            toolResult = await runTool(tool.name, tool.input as Record<string, unknown>, conversationId, lookupPhone, result, tenantId)
          } catch (err) {
            console.error(`[Yinez:tool:${tool.name}]`, err)
            toolResult = JSON.stringify({ error: (err as Error).message })
          }
          toolResults.push({ type: 'tool_result', tool_use_id: tool.id, content: toolResult, ...(toolResult.includes('"error"') ? { is_error: true } : {}) })
        }
        messages.push({ role: 'user', content: toolResults })
      }
    } finally {
      clearTimeout(timeout)
    }

    if (!result.text) {
      console.error('[Yinez] empty response after tool loop', { conversationId, phone: lookupPhone })
      // No canned dead-end. Empty result = caller logs + admin sees gap; never
      // a menu fallback that locks the conversation in a loop.
      result.text = ''
    }

    // Truncation cap — SMS will fragment past ~480 anyway; web/admin can run long.
    const cap = channel === 'sms' ? 600 : 4000
    if (result.text.length > cap) result.text = result.text.slice(0, cap - 3) + '...'
    return result
  } catch (err) {
    console.error('[Yinez:main]', err)
    // Surface error to admin (notify is best-effort), return empty so the
    // caller can decide what to do — never a canned dead-end.
    void err
    result.text = ''
    return result
  }
}

// Format a YinezContext into a CONTEXT block appended to the system prompt.
// Keeps the agent grounded in what the caller knows (last_outbound, expected
// balance, recent history) so a "5" lands as a rating, not a greeting.
export function buildCtxBlock(ctx: YinezContext): string {
  const lines: string[] = []
  if (ctx.last_outbound) {
    const ts = ctx.last_outbound.created_at.replace('T', ' ').slice(0, 19)
    lines.push(`- last_outbound: ${ctx.last_outbound.sms_type}${ctx.last_outbound.booking_id ? ` (booking ${ctx.last_outbound.booking_id})` : ''} at ${ts} UTC`)
  }
  if (ctx.linked_booking) {
    const lb = ctx.linked_booking
    const start = lb.start_time.replace('T', ' ').slice(0, 16)
    const bal = lb.expected_balance_cents != null ? `, expected_balance $${(lb.expected_balance_cents / 100).toFixed(2)}` : ''
    lines.push(`- linked_booking: ${lb.id} | ${start} | status=${lb.status} | rate=$${lb.hourly_rate || '?'}/hr | payment=${lb.payment_status || 'none'}${bal}`)
  }
  if (ctx.expected_balance_cents != null && !ctx.linked_booking) {
    lines.push(`- expected_balance: $${(ctx.expected_balance_cents / 100).toFixed(2)}`)
  }
  if (ctx.recent_inbounds && ctx.recent_inbounds.length > 0) {
    lines.push('- recent_inbounds (newest first):')
    for (const m of ctx.recent_inbounds.slice(0, 5)) {
      lines.push(`  · ${m.message.slice(0, 120)}`)
    }
  }
  if (ctx.escalation_locked) {
    lines.push('- escalation_locked: true (owner is handling — defer)')
  }
  if (lines.length === 0) return ''
  return '\n\nCONTEXT (assembled by the caller for THIS turn — trust over your priors):\n' + lines.join('\n') + '\n\nUse this context to interpret short replies. "5" + last_outbound rating_prompt = rating. "paid" + expected_balance set = treat as payment claim, call check_payment to verify before celebrating.'
}
