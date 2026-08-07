import { NYCMAID_PROMPT, NYCMAID_PLAYBOOK } from './tenants/nycmaid'
// Yinez — The NYC Maid's brain.
// One agent. All channels. All clients. Full ops. Full memory.
// Replaces Maria, Selena, Selena2.

import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { runTool } from '@/lib/selena/tools'
import { getCurrentTenantId } from '@/lib/tenant'
import { NYCMAID_TENANT_ID } from '@/lib/nycmaid/tenant'
import { resolveAnthropic } from '@/lib/anthropic-client'
import { logAnthropicUsage } from '@/lib/ai-usage'
import { resolveBasePlaybook } from './resolve-base-prompt'

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

export const TOOLS: Anthropic.Tool[] = [
  // create_booking is intentionally NOT offered to the model — self-book-only
  // enforcement (nycmaid cc92e0e6 parity). She never creates a client's
  // booking herself; she directs them to the tenant's self-book form and, for
  // an existing booking, to reschedule/cancel below (owner-approval gated).
  // The owner creates bookings directly via create_manual_booking instead.
  { name: 'lookup_bookings', description: "Get current client's upcoming bookings.", input_schema: { type: 'object' as const, properties: {}, required: [] } },
  { name: 'reschedule_booking', description: 'Request a reschedule on an existing booking (subject to policy: no first-time, 7+ days notice for recurring). Does NOT move the booking — flags it for owner approval. Tell the client it is pending, not confirmed. Args: booking_id, new_date, new_time.', input_schema: { type: 'object' as const, properties: { booking_id: { type: 'string' }, new_date: { type: 'string' }, new_time: { type: 'string' } }, required: ['booking_id', 'new_date', 'new_time'] } },
  { name: 'cancel_booking', description: 'Request cancellation of a booking (subject to policy: no first-time, 7+ days notice for recurring). Does NOT cancel it — flags it for owner approval. Tell the client it is pending, not confirmed. Args: booking_id, reason.', input_schema: { type: 'object' as const, properties: { booking_id: { type: 'string' }, reason: { type: 'string' } }, required: ['booking_id'] } },
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
  { name: 'list_bookings', description: 'Bookings for a date or date range, optionally filtered by cleaner, client, or status. Args: date or from_date+to_date (optional if client_id given), optional cleaner_id, client_id, status, limit.', input_schema: { type: 'object' as const, properties: { date: { type: 'string' }, from_date: { type: 'string' }, to_date: { type: 'string' }, cleaner_id: { type: 'string' }, client_id: { type: 'string' }, status: { type: 'string' }, limit: { type: 'number' } }, required: [] } },
  { name: 'lookup_cleaner', description: 'Cleaner profile: last 5 jobs, payout owed, ratings. Args: name.', input_schema: { type: 'object' as const, properties: { name: { type: 'string' } }, required: ['name'] } },
  { name: 'get_outstanding_payments', description: 'Clients with unpaid bookings, oldest first.', input_schema: { type: 'object' as const, properties: {}, required: [] } },
  { name: 'get_at_risk_clients', description: 'Clients with no booking 45+ days.', input_schema: { type: 'object' as const, properties: {}, required: [] } },
  { name: 'get_client_stats', description: 'Total client count, active/inactive/new-this-month counts, referral count, total revenue, average LTV, and client source breakdown. Use this for "how many clients do we have" — do not estimate from get_at_risk_clients.', input_schema: { type: 'object' as const, properties: {}, required: [] } },
  { name: 'search_messages', description: 'Search SMS messages from last 30 days. Args: query.', input_schema: { type: 'object' as const, properties: { query: { type: 'string' } }, required: ['query'] } },

  // Owner-only CONTROL tools — destructive. Confirm with the user before calling.
  { name: 'assign_cleaner_to_booking', description: 'Assign a cleaner to a booking. Args: booking_id, cleaner_id.', input_schema: { type: 'object' as const, properties: { booking_id: { type: 'string' }, cleaner_id: { type: 'string' } }, required: ['booking_id', 'cleaner_id'] } },
  { name: 'send_message_to_client', description: 'Send an SMS or email to a specific client from The NYC Maid. Args: client_id, message, channel (sms or email, default sms).', input_schema: { type: 'object' as const, properties: { client_id: { type: 'string' }, message: { type: 'string' }, channel: { type: 'string' } }, required: ['client_id', 'message'] } },
  { name: 'send_message_to_cleaner', description: 'SMS a specific cleaner. Args: cleaner_id, message.', input_schema: { type: 'object' as const, properties: { cleaner_id: { type: 'string' }, message: { type: 'string' } }, required: ['cleaner_id', 'message'] } },
  { name: 'send_broadcast', description: 'Broadcast an SMS to a group. Args: audience (all_clients/recurring_clients/all_cleaners), message. CONFIRM before calling — this hits everyone.', input_schema: { type: 'object' as const, properties: { audience: { type: 'string' }, message: { type: 'string' } }, required: ['audience', 'message'] } },
  { name: 'create_manual_booking', description: 'Create a booking directly without going through the chat flow. Args: client_id, date, time, service_type, hourly_rate, estimated_hours, optional cleaner_id.', input_schema: { type: 'object' as const, properties: { client_id: { type: 'string' }, date: { type: 'string' }, time: { type: 'string' }, service_type: { type: 'string' }, hourly_rate: { type: 'number' }, estimated_hours: { type: 'number' }, cleaner_id: { type: 'string' } }, required: ['client_id', 'date', 'time', 'service_type', 'hourly_rate', 'estimated_hours'] } },
  { name: 'update_booking', description: 'Update booking fields. Args: booking_id, fields (object — allowed: status, payment_status, cleaner_id, hourly_rate, price, start_time, end_time, notes, service_type). price is the total invoiced amount in cents; hourly_rate is the per-hour rate — they are different columns. Duration is derived from start_time/end_time — there is no estimated_hours column.', input_schema: { type: 'object' as const, properties: { booking_id: { type: 'string' }, fields: { type: 'object' } }, required: ['booking_id', 'fields'] } },
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

  // Catalog — the item list used by booking, quotes, and invoices.
  { name: 'create_catalog_item', description: 'Create a catalog item (service/project/product/equipment). Args: name, optional description, notes, item_type (service/project/product/equipment, default service), per_unit (hour/job/unit/sqft/linear_ft/visit/day/custom, default job), unit_label (only if per_unit=custom), price_cents, price_is_starting, min_charge_cents, cost_cents, taxable (default true), category, sort_order, active (default true).', input_schema: { type: 'object' as const, properties: { name: { type: 'string' }, description: { type: 'string' }, notes: { type: 'string' }, item_type: { type: 'string' }, per_unit: { type: 'string' }, unit_label: { type: 'string' }, price_cents: { type: 'number' }, price_is_starting: { type: 'boolean' }, min_charge_cents: { type: 'number' }, cost_cents: { type: 'number' }, taxable: { type: 'boolean' }, category: { type: 'string' }, sort_order: { type: 'number' }, active: { type: 'boolean' } }, required: ['name'] } },
  { name: 'update_catalog_item', description: 'Update a catalog item. Args: item_id, fields (object — allowed: name, description, notes, active, sort_order, price_cents, price_is_starting, min_charge_cents, cost_cents, taxable, category, item_type, per_unit, unit_label).', input_schema: { type: 'object' as const, properties: { item_id: { type: 'string' }, fields: { type: 'object' } }, required: ['item_id', 'fields'] } },
  { name: 'delete_catalog_item', description: 'Delete a catalog item. Args: item_id.', input_schema: { type: 'object' as const, properties: { item_id: { type: 'string' } }, required: ['item_id'] } },

  // Jobs (field-service projects vertical) — jobs are created only via
  // create_job_from_quote (see quotes section), never directly.
  { name: 'list_jobs', description: 'List jobs with a per-job payment rollup (contracted/paid/due/overdue) and client name. No args.', input_schema: { type: 'object' as const, properties: {}, required: [] } },
  { name: 'update_job', description: "Update a job. Args: job_id, fields (object — allowed: status [unscheduled/scheduled/in_progress/completed/cancelled], title, notes, starts_on, ends_on). Setting status to completed/in_progress stamps the corresponding timestamp automatically.", input_schema: { type: 'object' as const, properties: { job_id: { type: 'string' }, fields: { type: 'object' } }, required: ['job_id', 'fields'] } },

  // Job sub-resources. Photo capture (uploading a new photo) and the PDF
  // job-report export are NOT exposed — a chat tool can't upload a file or
  // return binary content through a JSON tool result.
  { name: 'list_job_checklist', description: "List a job's checklist items. Args: job_id.", input_schema: { type: 'object' as const, properties: { job_id: { type: 'string' } }, required: ['job_id'] } },
  { name: 'add_job_checklist_item', description: 'Add a checklist item to a job. Args: job_id, label.', input_schema: { type: 'object' as const, properties: { job_id: { type: 'string' }, label: { type: 'string' } }, required: ['job_id', 'label'] } },
  { name: 'update_job_checklist_item', description: 'Toggle done or edit the label of a job checklist item. Args: job_id, item_id, optional done (boolean), label.', input_schema: { type: 'object' as const, properties: { job_id: { type: 'string' }, item_id: { type: 'string' }, done: { type: 'boolean' }, label: { type: 'string' } }, required: ['job_id', 'item_id'] } },
  { name: 'delete_job_checklist_item', description: 'Delete a job checklist item. Args: job_id, item_id.', input_schema: { type: 'object' as const, properties: { job_id: { type: 'string' }, item_id: { type: 'string' } }, required: ['job_id', 'item_id'] } },
  { name: 'list_job_expenses', description: "List a job's expenses/receipts. Args: job_id.", input_schema: { type: 'object' as const, properties: { job_id: { type: 'string' } }, required: ['job_id'] } },
  { name: 'add_job_expense', description: 'Log an expense/receipt against a job. If budget_line_item_id is set, that budget line\'s actual cost is recomputed automatically. Args: job_id, category, amount_dollars, optional vendor_name, vendor_id, service_type_id, budget_line_item_id, description, receipt_url, date (YYYY-MM-DD, default today).', input_schema: { type: 'object' as const, properties: { job_id: { type: 'string' }, category: { type: 'string' }, amount_dollars: { type: 'number' }, vendor_name: { type: 'string' }, vendor_id: { type: 'string' }, service_type_id: { type: 'string' }, budget_line_item_id: { type: 'string' }, description: { type: 'string' }, receipt_url: { type: 'string' }, date: { type: 'string' } }, required: ['job_id', 'category', 'amount_dollars'] } },
  { name: 'delete_job_expense', description: 'Remove an expense/receipt from a job. Args: job_id, expense_id.', input_schema: { type: 'object' as const, properties: { job_id: { type: 'string' }, expense_id: { type: 'string' } }, required: ['job_id', 'expense_id'] } },
  { name: 'list_job_photos', description: "List a job's photo gallery (metadata — URLs, tags, captions, pairing). Args: job_id.", input_schema: { type: 'object' as const, properties: { job_id: { type: 'string' } }, required: ['job_id'] } },
  { name: 'update_job_photo', description: 'Update tags, before/after pairing, or caption on an existing job photo. Args: job_id, photo_id, optional tags (array of strings), pair_id, caption.', input_schema: { type: 'object' as const, properties: { job_id: { type: 'string' }, photo_id: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } }, pair_id: { type: 'string' }, caption: { type: 'string' } }, required: ['job_id', 'photo_id'] } },
  { name: 'list_job_photo_comments', description: 'List comments on a job photo. Args: job_id, photo_id.', input_schema: { type: 'object' as const, properties: { job_id: { type: 'string' }, photo_id: { type: 'string' } }, required: ['job_id', 'photo_id'] } },
  { name: 'add_job_photo_comment', description: 'Add a comment to a job photo. Args: job_id, photo_id, body, optional author.', input_schema: { type: 'object' as const, properties: { job_id: { type: 'string' }, photo_id: { type: 'string' }, body: { type: 'string' }, author: { type: 'string' } }, required: ['job_id', 'photo_id', 'body'] } },
  { name: 'create_job_session', description: 'Schedule a work session (a booking) on a job. Args: job_id, start_time (ISO), optional end_time, duration_hours (default 2), team_member_id, assignee_ids (array), crew_id, service_type, notes, price_cents.', input_schema: { type: 'object' as const, properties: { job_id: { type: 'string' }, start_time: { type: 'string' }, end_time: { type: 'string' }, duration_hours: { type: 'number' }, team_member_id: { type: 'string' }, assignee_ids: { type: 'array', items: { type: 'string' } }, crew_id: { type: 'string' }, service_type: { type: 'string' }, notes: { type: 'string' }, price_cents: { type: 'number' } }, required: ['job_id', 'start_time'] } },
  { name: 'update_job_session', description: "Move, reassign, retitle, renote, or progress a job's scheduled session. Setting status to completed logs it and releases any stage-gated payments. Args: job_id, session_id, optional start_time, end_time, duration_hours, team_member_id, assignee_ids, crew_id, service_type, notes, status (confirmed/in_progress/completed/cancelled/pending).", input_schema: { type: 'object' as const, properties: { job_id: { type: 'string' }, session_id: { type: 'string' }, start_time: { type: 'string' }, end_time: { type: 'string' }, duration_hours: { type: 'number' }, team_member_id: { type: 'string' }, assignee_ids: { type: 'array', items: { type: 'string' } }, crew_id: { type: 'string' }, service_type: { type: 'string' }, notes: { type: 'string' }, status: { type: 'string' } }, required: ['job_id', 'session_id'] } },
  { name: 'delete_job_session', description: 'Remove a scheduled session from a job. Args: job_id, session_id.', input_schema: { type: 'object' as const, properties: { job_id: { type: 'string' }, session_id: { type: 'string' } }, required: ['job_id', 'session_id'] } },
  { name: 'get_job_budget_variance', description: "A job's budget vs. actuals (from its source quote's saved budget template, if any). Args: job_id.", input_schema: { type: 'object' as const, properties: { job_id: { type: 'string' } }, required: ['job_id'] } },
  { name: 'update_job_payment', description: 'Update a payment on a job\'s payment plan (mark invoiced/paid/void). Args: job_id, payment_id, status (pending/invoiced/paid/void).', input_schema: { type: 'object' as const, properties: { job_id: { type: 'string' }, payment_id: { type: 'string' }, status: { type: 'string' } }, required: ['job_id', 'payment_id', 'status'] } },

  // Crews — named reusable groups of team members, assignable to a job session.
  { name: 'list_crews', description: 'List crews with their member rosters.', input_schema: { type: 'object' as const, properties: {}, required: [] } },
  { name: 'create_crew', description: 'Create a crew. Args: name, optional color, optional member_ids (team member ids).', input_schema: { type: 'object' as const, properties: { name: { type: 'string' }, color: { type: 'string' }, member_ids: { type: 'array', items: { type: 'string' } } }, required: ['name'] } },
  { name: 'update_crew', description: 'Update a crew and/or replace its member roster. Args: crew_id, optional fields (name, color, active), optional member_ids (replaces the full roster).', input_schema: { type: 'object' as const, properties: { crew_id: { type: 'string' }, fields: { type: 'object' }, member_ids: { type: 'array', items: { type: 'string' } } }, required: ['crew_id'] } },
  { name: 'delete_crew', description: 'Delete a crew. Args: crew_id.', input_schema: { type: 'object' as const, properties: { crew_id: { type: 'string' } }, required: ['crew_id'] } },

  // Equipment — depreciable physical assets checked out/returned on jobs.
  { name: 'list_equipment', description: 'List equipment (depreciable physical assets).', input_schema: { type: 'object' as const, properties: {}, required: [] } },
  { name: 'create_equipment', description: 'Add a piece of equipment. Args: name, optional asset_tag, acquisition_cost_cents, acquisition_date (YYYY-MM-DD), useful_life_months, salvage_value_cents, status (default available), notes.', input_schema: { type: 'object' as const, properties: { name: { type: 'string' }, asset_tag: { type: 'string' }, acquisition_cost_cents: { type: 'number' }, acquisition_date: { type: 'string' }, useful_life_months: { type: 'number' }, salvage_value_cents: { type: 'number' }, status: { type: 'string' }, notes: { type: 'string' } }, required: ['name'] } },
  { name: 'update_equipment', description: 'Update equipment. Args: equipment_id, fields (object — allowed: name, service_type_id, category_id, asset_tag, acquisition_cost_cents, acquisition_date, useful_life_months, salvage_value_cents, status, notes, active).', input_schema: { type: 'object' as const, properties: { equipment_id: { type: 'string' }, fields: { type: 'object' } }, required: ['equipment_id', 'fields'] } },
  { name: 'delete_equipment', description: 'Delete equipment. Args: equipment_id.', input_schema: { type: 'object' as const, properties: { equipment_id: { type: 'string' } }, required: ['equipment_id'] } },

  // Inventory — physical stock/materials, distinct from the sellable catalog.
  { name: 'list_inventory', description: 'List inventory items (physical stock/materials).', input_schema: { type: 'object' as const, properties: {}, required: [] } },
  { name: 'create_inventory_item', description: 'Add an inventory item. Args: name, optional sku, category, unit_label (default unit), quantity_on_hand, unit_cost_cents, reorder_threshold, notes.', input_schema: { type: 'object' as const, properties: { name: { type: 'string' }, sku: { type: 'string' }, category: { type: 'string' }, unit_label: { type: 'string' }, quantity_on_hand: { type: 'number' }, unit_cost_cents: { type: 'number' }, reorder_threshold: { type: 'number' }, notes: { type: 'string' } }, required: ['name'] } },
  { name: 'update_inventory_item', description: 'Update an inventory item. Args: item_id, fields (object — allowed: name, sku, category, category_id, unit_label, quantity_on_hand, unit_cost_cents, reorder_threshold, notes, active).', input_schema: { type: 'object' as const, properties: { item_id: { type: 'string' }, fields: { type: 'object' } }, required: ['item_id', 'fields'] } },
  { name: 'delete_inventory_item', description: 'Delete an inventory item. Args: item_id.', input_schema: { type: 'object' as const, properties: { item_id: { type: 'string' } }, required: ['item_id'] } },

  // Vendors — supplier directory for purchasing.
  { name: 'list_vendors', description: 'List vendors.', input_schema: { type: 'object' as const, properties: {}, required: [] } },
  { name: 'create_vendor', description: 'Add a vendor. Args: name, optional phone, email, category, address, notes.', input_schema: { type: 'object' as const, properties: { name: { type: 'string' }, phone: { type: 'string' }, email: { type: 'string' }, category: { type: 'string' }, address: { type: 'string' }, notes: { type: 'string' } }, required: ['name'] } },
  { name: 'update_vendor', description: 'Update a vendor. Args: vendor_id, fields (object — allowed: name, phone, email, category, address, notes, active).', input_schema: { type: 'object' as const, properties: { vendor_id: { type: 'string' }, fields: { type: 'object' } }, required: ['vendor_id', 'fields'] } },
  { name: 'delete_vendor', description: 'Delete a vendor. Args: vendor_id.', input_schema: { type: 'object' as const, properties: { vendor_id: { type: 'string' } }, required: ['vendor_id'] } },

  // Quotes — line_items is an array of {name, quantity, unit_price_cents, optional description, optional/selected for optional line items}.
  { name: 'list_quotes', description: 'List quotes. Args: optional status, client_id, deal_id, limit (default 100).', input_schema: { type: 'object' as const, properties: { status: { type: 'string' }, client_id: { type: 'string' }, deal_id: { type: 'string' }, limit: { type: 'number' } }, required: [] } },
  { name: 'create_quote', description: 'Create a draft quote. Args: optional client_id, deal_id, title, description, contact_name, contact_email, contact_phone, service_address, line_items (array of {name, quantity, unit_price_cents}), tax_rate_bps, discount_cents, terms, notes, valid_until (YYYY-MM-DD).', input_schema: { type: 'object' as const, properties: { client_id: { type: 'string' }, deal_id: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' }, contact_name: { type: 'string' }, contact_email: { type: 'string' }, contact_phone: { type: 'string' }, service_address: { type: 'string' }, line_items: { type: 'array', items: { type: 'object' } }, tax_rate_bps: { type: 'number' }, discount_cents: { type: 'number' }, terms: { type: 'string' }, notes: { type: 'string' }, valid_until: { type: 'string' } }, required: [] } },
  { name: 'update_quote', description: 'Update a draft/sent quote (cannot edit accepted or converted). Args: quote_id, fields (object — allowed: title, description, contact_name, contact_email, contact_phone, service_address, terms, notes, valid_until, client_id, line_items, tax_rate_bps, discount_cents — changing line_items/tax_rate_bps/discount_cents recomputes totals).', input_schema: { type: 'object' as const, properties: { quote_id: { type: 'string' }, fields: { type: 'object' } }, required: ['quote_id', 'fields'] } },
  { name: 'delete_quote', description: 'Delete a draft/sent quote (cannot delete accepted or converted). Args: quote_id.', input_schema: { type: 'object' as const, properties: { quote_id: { type: 'string' } }, required: ['quote_id'] } },
  { name: 'send_quote', description: 'Mark a quote sent and get its public link. Does NOT deliver the link — follow up with send_message_to_client to actually send it. Args: quote_id.', input_schema: { type: 'object' as const, properties: { quote_id: { type: 'string' } }, required: ['quote_id'] } },
  { name: 'create_job_from_quote', description: 'Convert an accepted quote into a job (multi-session project with a payment plan). Args: quote_id.', input_schema: { type: 'object' as const, properties: { quote_id: { type: 'string' } }, required: ['quote_id'] } },

  // Invoices
  { name: 'list_invoices', description: 'List invoices. Args: optional status, client_id, limit (default 100).', input_schema: { type: 'object' as const, properties: { status: { type: 'string' }, client_id: { type: 'string' }, limit: { type: 'number' } }, required: [] } },
  { name: 'create_invoice', description: 'Create a draft invoice, optionally from a booking or quote. Args: optional client_id, booking_id, quote_id, entity_id, title, description, contact_name, contact_email, contact_phone, service_address, line_items (array of {name, quantity, unit_price_cents}), tax_rate_bps, discount_cents, terms, notes, due_date (YYYY-MM-DD) or due_days (from today).', input_schema: { type: 'object' as const, properties: { client_id: { type: 'string' }, booking_id: { type: 'string' }, quote_id: { type: 'string' }, entity_id: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' }, contact_name: { type: 'string' }, contact_email: { type: 'string' }, contact_phone: { type: 'string' }, service_address: { type: 'string' }, line_items: { type: 'array', items: { type: 'object' } }, tax_rate_bps: { type: 'number' }, discount_cents: { type: 'number' }, terms: { type: 'string' }, notes: { type: 'string' }, due_date: { type: 'string' }, due_days: { type: 'number' } }, required: [] } },
  { name: 'update_invoice', description: 'Update a draft/sent invoice (cannot edit paid/partial/void/refunded). Args: invoice_id, fields (object — allowed: title, description, contact_name, contact_email, contact_phone, service_address, terms, notes, due_date, client_id).', input_schema: { type: 'object' as const, properties: { invoice_id: { type: 'string' }, fields: { type: 'object' } }, required: ['invoice_id', 'fields'] } },
  { name: 'void_invoice', description: 'Void an invoice (cannot void one with payments recorded — refund first). Args: invoice_id, optional reason.', input_schema: { type: 'object' as const, properties: { invoice_id: { type: 'string' }, reason: { type: 'string' } }, required: ['invoice_id'] } },
  { name: 'send_invoice', description: 'Mark an invoice sent and get its public link. Does NOT deliver the link — follow up with send_message_to_client. Args: invoice_id.', input_schema: { type: 'object' as const, properties: { invoice_id: { type: 'string' } }, required: ['invoice_id'] } },
  { name: 'record_invoice_payment', description: 'Record a manual payment against an invoice (Zelle/Venmo/cash/check/etc — NOT for Stripe, which posts automatically via webhook). Args: invoice_id, amount_dollars, method (zelle/venmo/cash/check/stripe/card/bank_transfer/other, default other), optional reference_id, sender_name.', input_schema: { type: 'object' as const, properties: { invoice_id: { type: 'string' }, amount_dollars: { type: 'number' }, method: { type: 'string' }, reference_id: { type: 'string' }, sender_name: { type: 'string' } }, required: ['invoice_id', 'amount_dollars'] } },

  // Documents (e-signature) — list/void only. Creating a document or sending
  // it for signature requires uploading an actual PDF, which this chat
  // interface cannot do — use the dashboard's Documents page for those.
  { name: 'list_documents', description: 'List e-signature documents and their signer status. Args: optional status, limit (default 100).', input_schema: { type: 'object' as const, properties: { status: { type: 'string' }, limit: { type: 'number' } }, required: [] } },
  { name: 'void_document', description: 'Void an e-signature document. Args: document_id, optional reason.', input_schema: { type: 'object' as const, properties: { document_id: { type: 'string' }, reason: { type: 'string' } }, required: ['document_id'] } },

  // Finance ledger — reports are read-only; expenses/recurring-expenses/chart-
  // of-accounts/payroll-payment are bookkeeping records, not live money
  // movement (no Stripe/ACH transfer happens from any tool here).
  { name: 'get_ar_aging', description: 'Accounts receivable aging — unpaid invoices/bookings bucketed by days past due. Optional entity_id.', input_schema: { type: 'object' as const, properties: { entity_id: { type: 'string' } }, required: [] } },
  { name: 'get_balance_sheet', description: 'Balance sheet as of a date. Args: optional as_of (YYYY-MM-DD, default today), entity_id.', input_schema: { type: 'object' as const, properties: { as_of: { type: 'string' }, entity_id: { type: 'string' } }, required: [] } },
  { name: 'get_trial_balance', description: "Trial balance — every account's debit/credit totals for a period, with a proof the books balance. Args: optional from (default this year start), to (default today), entity_id.", input_schema: { type: 'object' as const, properties: { from: { type: 'string' }, to: { type: 'string' }, entity_id: { type: 'string' } }, required: [] } },
  { name: 'get_pnl', description: 'Profit & Loss statement for a period. Args: optional from (default this month start), to (default this month end), entity_id.', input_schema: { type: 'object' as const, properties: { from: { type: 'string' }, to: { type: 'string' }, entity_id: { type: 'string' } }, required: [] } },
  { name: 'get_cash_flow_forecast', description: 'Weekly cash-flow forecast (inflows from scheduled bookings + unpaid invoices, outflows from recurring expenses). Args: optional weeks (1-12, default 4), entity_id.', input_schema: { type: 'object' as const, properties: { weeks: { type: 'number' }, entity_id: { type: 'string' } }, required: [] } },
  { name: 'get_chart_of_accounts', description: 'List the chart of accounts.', input_schema: { type: 'object' as const, properties: {}, required: [] } },
  { name: 'create_account', description: 'Add a chart-of-accounts entry. Args: code, name, type, optional subtype, parent_id, is_bank_account.', input_schema: { type: 'object' as const, properties: { code: { type: 'string' }, name: { type: 'string' }, type: { type: 'string' }, subtype: { type: 'string' }, parent_id: { type: 'string' }, is_bank_account: { type: 'boolean' } }, required: ['code', 'name', 'type'] } },
  { name: 'list_expenses', description: 'List expenses. Args: optional entity_id, limit (default 100).', input_schema: { type: 'object' as const, properties: { entity_id: { type: 'string' }, limit: { type: 'number' } }, required: [] } },
  { name: 'create_expense', description: 'Record an expense. Args: category, amount_dollars, optional description, receipt_url, date (YYYY-MM-DD, default today), entity_id.', input_schema: { type: 'object' as const, properties: { category: { type: 'string' }, amount_dollars: { type: 'number' }, description: { type: 'string' }, receipt_url: { type: 'string' }, date: { type: 'string' }, entity_id: { type: 'string' } }, required: ['category', 'amount_dollars'] } },
  { name: 'list_recurring_expenses', description: 'List active recurring expenses (rent, insurance, software subs, etc).', input_schema: { type: 'object' as const, properties: {}, required: [] } },
  { name: 'create_recurring_expense', description: 'Add a recurring expense. Args: label, amount_cents, frequency (daily/weekly/biweekly/monthly/quarterly/yearly), optional category, start_date (YYYY-MM-DD, default today), end_date, notes.', input_schema: { type: 'object' as const, properties: { label: { type: 'string' }, category: { type: 'string' }, amount_cents: { type: 'number' }, frequency: { type: 'string' }, start_date: { type: 'string' }, end_date: { type: 'string' }, notes: { type: 'string' } }, required: ['label', 'amount_cents', 'frequency'] } },
  { name: 'get_payroll_summary', description: 'Pending payroll per active team member — unpaid completed-booking hours × pay rate.', input_schema: { type: 'object' as const, properties: {}, required: [] } },
  { name: 'record_payroll_payment', description: 'Record a payroll payment already made outside the system (Zelle/check/etc — this does NOT transfer money, only records that it happened and updates the ledger). Args: team_member_id, amount_dollars, optional method, period_start, period_end (YYYY-MM-DD — providing both prevents a duplicate record for the same period).', input_schema: { type: 'object' as const, properties: { team_member_id: { type: 'string' }, amount_dollars: { type: 'number' }, method: { type: 'string' }, period_start: { type: 'string' }, period_end: { type: 'string' } }, required: ['team_member_id', 'amount_dollars'] } },

  // HR — employee records distinct from the basic team_members CRUD above.
  // Document upload isn't exposed (same "chat can't produce a file" limit as documents).
  { name: 'list_employees', description: 'HR roster — every team member with employment type, HR status, hire date, title, comp type/rate, Stripe Connect status.', input_schema: { type: 'object' as const, properties: {}, required: [] } },
  { name: 'get_employee_hr_profile', description: 'Full HR profile for one team member: basics, HR profile fields, recent notes, Stripe Connect status. Args: team_member_id.', input_schema: { type: 'object' as const, properties: { team_member_id: { type: 'string' } }, required: ['team_member_id'] } },
  { name: 'update_employee_hr_profile', description: "Update (or create) a team member's HR profile. Args: team_member_id, fields (object — allowed: employment_type [contractor_1099/employee_w2], hr_status [active/on_leave/terminated], comp_type [per_job/hourly/salary], pay_period [per_job/weekly/biweekly/semimonthly/monthly], pay_rate_cents, hire_date, termination_date, title, department, emergency_contact_name, emergency_contact_phone, date_of_birth).", input_schema: { type: 'object' as const, properties: { team_member_id: { type: 'string' }, fields: { type: 'object' } }, required: ['team_member_id', 'fields'] } },
  { name: 'add_employee_hr_note', description: 'Add an HR note to a team member (writeup, kudos, review, or general note). Args: team_member_id, body, optional kind (note/writeup/kudos/review, default note), author_name.', input_schema: { type: 'object' as const, properties: { team_member_id: { type: 'string' }, body: { type: 'string' }, kind: { type: 'string' }, author_name: { type: 'string' } }, required: ['team_member_id', 'body'] } },

  // Leads
  { name: 'block_referrer_domain', description: 'Block a referrer domain from counting as a lead source (spam/junk traffic). Args: domain.', input_schema: { type: 'object' as const, properties: { domain: { type: 'string' } }, required: ['domain'] } },
  { name: 'unblock_referrer_domain', description: 'Unblock a previously blocked referrer domain. Args: domain.', input_schema: { type: 'object' as const, properties: { domain: { type: 'string' } }, required: ['domain'] } },
  { name: 'override_lead_conversion', description: 'Manually toggle whether a lead click counts as a conversion or a sale (marking a sale also marks it converted). Args: lead_click_id, type (conversion or sale).', input_schema: { type: 'object' as const, properties: { lead_click_id: { type: 'string' }, type: { type: 'string' } }, required: ['lead_click_id', 'type'] } },
  { name: 'verify_lead_conversion', description: 'Set a manual truth flag on a lead click after human verification. Args: lead_click_id, field (true_conversion or true_close), value (boolean).', input_schema: { type: 'object' as const, properties: { lead_click_id: { type: 'string' }, field: { type: 'string' }, value: { type: 'boolean' } }, required: ['lead_click_id', 'field', 'value'] } },
  { name: 'list_lead_domains', description: 'List tenant marketing domains with visit and CTA-click counts.', input_schema: { type: 'object' as const, properties: {}, required: [] } },

  // Referrals — marking a commission paid can move REAL money via Stripe
  // Connect. Confirm with the user before calling mark_referral_commission_paid.
  { name: 'list_referrals', description: 'List referral program entries.', input_schema: { type: 'object' as const, properties: {}, required: [] } },
  { name: 'create_referral', description: 'Create a referral entry. Args: name, optional email, phone, code (auto-generated if omitted), commission_rate (0-1).', input_schema: { type: 'object' as const, properties: { name: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' }, code: { type: 'string' }, commission_rate: { type: 'number' } }, required: ['name'] } },
  { name: 'update_referral', description: 'Update a referral entry. Args: referral_id, fields (object — allowed: status, name, email, phone, commission_rate, reward_amount, total_earned).', input_schema: { type: 'object' as const, properties: { referral_id: { type: 'string' }, fields: { type: 'object' } }, required: ['referral_id', 'fields'] } },
  { name: 'set_referrer_stripe_ineligible', description: "Flag (or unflag) a referrer as unable to complete Stripe Connect onboarding — the ONLY way to unlock manual (Zelle/Apple Cash) payout for them once they're otherwise Connect-eligible. Args: referrer_id, stripe_ineligible (boolean).", input_schema: { type: 'object' as const, properties: { referrer_id: { type: 'string' }, stripe_ineligible: { type: 'boolean' } }, required: ['referrer_id', 'stripe_ineligible'] } },
  { name: 'list_referral_commissions', description: 'List referral commissions. Args: optional status, referrer_id.', input_schema: { type: 'object' as const, properties: { status: { type: 'string' }, referrer_id: { type: 'string' } }, required: [] } },
  { name: 'create_referral_commission', description: 'Create a commission for a booking that has a referrer attached. Args: booking_id.', input_schema: { type: 'object' as const, properties: { booking_id: { type: 'string' } }, required: ['booking_id'] } },
  { name: 'mark_referral_commission_paid', description: "Mark a referral commission paid. If the referrer is Stripe Connect ready, this ACTUALLY TRANSFERS REAL MONEY via Stripe Connect — confirm with the user first. If not Connect-ready, requires they be flagged stripe_ineligible first (set_referrer_stripe_ineligible), then records a manual payout. Args: commission_id, optional paid_via (zelle/apple_cash/etc — only used for the manual/ineligible path).", input_schema: { type: 'object' as const, properties: { commission_id: { type: 'string' }, paid_via: { type: 'string' } }, required: ['commission_id'] } },

  // Sales partners — same real-money caveat on mark_sales_partner_commission_paid.
  { name: 'create_sales_partner', description: "Onboard a new sales partner: creates the record (inactive), generates their Commission Sales Partner Agreement, and emails them a sign link. Their PIN login activates once they sign. Args: name, email, optional phone, tier (standard/tier2/tier3, default standard).", input_schema: { type: 'object' as const, properties: { name: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' }, tier: { type: 'string' } }, required: ['name', 'email'] } },
  { name: 'list_sales_partners', description: 'List sales partners.', input_schema: { type: 'object' as const, properties: {}, required: [] } },
  { name: 'update_sales_partner', description: 'Update a sales partner. Args: sales_partner_id, optional active, tier (standard/tier2/tier3), commission_rate (0-1), stripe_ineligible (boolean — the escape hatch that unlocks manual payout).', input_schema: { type: 'object' as const, properties: { sales_partner_id: { type: 'string' }, active: { type: 'boolean' }, tier: { type: 'string' }, commission_rate: { type: 'number' }, stripe_ineligible: { type: 'boolean' } }, required: ['sales_partner_id'] } },
  { name: 'list_sales_partner_commissions', description: 'List sales partner commissions. Args: optional status, sales_partner_id.', input_schema: { type: 'object' as const, properties: { status: { type: 'string' }, sales_partner_id: { type: 'string' } }, required: [] } },
  { name: 'mark_sales_partner_commission_paid', description: 'Mark a sales partner commission paid. If the partner is Stripe Connect ready, this ACTUALLY TRANSFERS REAL MONEY via Stripe Connect — confirm with the user first. If not Connect-ready, requires stripe_ineligible be set first (update_sales_partner), then records a manual payout. Args: commission_id, optional paid_via.', input_schema: { type: 'object' as const, properties: { commission_id: { type: 'string' }, paid_via: { type: 'string' } }, required: ['commission_id'] } },

  // Campaigns — send_campaign fans out real email/SMS to every matching client. Confirm audience size first.
  { name: 'list_campaigns', description: 'List marketing campaigns.', input_schema: { type: 'object' as const, properties: {}, required: [] } },
  { name: 'create_campaign', description: 'Create a draft campaign. Args: name, type (email/sms/both), optional subject, body, recipient_filter (all/active).', input_schema: { type: 'object' as const, properties: { name: { type: 'string' }, type: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string' }, recipient_filter: { type: 'string' } }, required: ['name', 'type'] } },
  { name: 'send_campaign', description: "Send a draft campaign — dispatches real email/SMS to every matching client (or an explicit client_ids list). CONFIRM audience size with the user before calling — this reaches everyone. Args: campaign_id, optional client_ids (overrides the campaign's own recipient_filter).", input_schema: { type: 'object' as const, properties: { campaign_id: { type: 'string' }, client_ids: { type: 'array', items: { type: 'string' } } }, required: ['campaign_id'] } },

  // Google Business Profile — publishes LIVE, no draft/approval step.
  { name: 'list_google_posts', description: 'List Google Business Profile posts.', input_schema: { type: 'object' as const, properties: {}, required: [] } },
  { name: 'create_google_post', description: 'Publish (or draft with AI) a Google Business Profile post. Call with generate_ai:true and a topic first to get draft text back WITHOUT publishing, then call again with summary set to actually publish. Args: optional summary (publishes when present), generate_ai, topic, call_to_action_type, call_to_action_url, photo_url.', input_schema: { type: 'object' as const, properties: { summary: { type: 'string' }, generate_ai: { type: 'boolean' }, topic: { type: 'string' }, call_to_action_type: { type: 'string' }, call_to_action_url: { type: 'string' }, photo_url: { type: 'string' } }, required: [] } },
  { name: 'list_google_reviews', description: 'List Google Business reviews and whether Google is connected.', input_schema: { type: 'object' as const, properties: {}, required: [] } },
  { name: 'reply_to_google_review', description: 'Reply (or AI-draft a reply) to a Google review. Call with generate_ai:true first to get draft text back WITHOUT posting, then call again with reply set to actually publish it live to Google. Args: review_id, optional reply (posts when present), generate_ai.', input_schema: { type: 'object' as const, properties: { review_id: { type: 'string' }, reply: { type: 'string' }, generate_ai: { type: 'boolean' } }, required: ['review_id'] } },

  // Social (Facebook/Instagram) — publishes LIVE.
  { name: 'post_to_social', description: 'Publish a post to Facebook or Instagram. Args: platform (facebook or instagram); for facebook: message (required), optional photo_url; for instagram: caption and image_url (both required).', input_schema: { type: 'object' as const, properties: { platform: { type: 'string' }, message: { type: 'string' }, photo_url: { type: 'string' }, caption: { type: 'string' }, image_url: { type: 'string' } }, required: ['platform'] } },

  // Reviews (on-site testimonials, distinct from Google reviews above)
  { name: 'list_reviews', description: 'List on-site reviews/testimonials (any status).', input_schema: { type: 'object' as const, properties: {}, required: [] } },
  { name: 'request_review', description: 'Send a review request to a client via email/SMS. Args: client_id, optional booking_id.', input_schema: { type: 'object' as const, properties: { client_id: { type: 'string' }, booking_id: { type: 'string' } }, required: ['client_id'] } },
  { name: 'update_review', description: 'Update/moderate a review. Args: review_id, fields (object — allowed: status, rating, comment, google_review_url, requested_at, completed_at, text, response, source, service_type, neighborhood, team_member_name, images, video_url, verified, published_at).', input_schema: { type: 'object' as const, properties: { review_id: { type: 'string' }, fields: { type: 'object' } }, required: ['review_id', 'fields'] } },

  // Settings — the legacy booking-flow service editor (settings/services table
  // is service_types, same table create_catalog_item writes, narrower fields).
  { name: 'list_settings_services', description: 'List services from the booking-flow service editor.', input_schema: { type: 'object' as const, properties: {}, required: [] } },
  { name: 'create_settings_service', description: 'Create a booking-flow service. Args: name, optional description, default_duration_hours, default_hourly_rate, pricing_model, price_cents, per_unit, min_charge_cents.', input_schema: { type: 'object' as const, properties: { name: { type: 'string' }, description: { type: 'string' }, default_duration_hours: { type: 'number' }, default_hourly_rate: { type: 'number' }, pricing_model: { type: 'string' }, price_cents: { type: 'number' }, per_unit: { type: 'string' }, min_charge_cents: { type: 'number' } }, required: ['name'] } },

  // RBAC — update_role_permissions is the highest-governance-risk tool here:
  // it changes what every OTHER role in the tenant is allowed to do (e.g.
  // granting staff finance.payroll). Confirm with the user before calling it.
  { name: 'get_role_permissions', description: 'Read the full permission matrix: every permission in the catalog, each customizable role\'s defaults vs effective (defaults + overrides), and the raw overrides.', input_schema: { type: 'object' as const, properties: {}, required: [] } },
  { name: 'update_role_permissions', description: 'Change what a role (admin/manager/staff — never owner, which is always full access) can do. This can grant or remove real capabilities like finance.payroll or clients.delete for every user with that role — confirm with the user before calling. Args: overrides — object keyed by role, each value an object of {permission: true|false} deltas from that role\'s defaults (e.g. {"manager": {"finance.payroll": true}}).', input_schema: { type: 'object' as const, properties: { overrides: { type: 'object' } }, required: ['overrides'] } },

  // Business profile — the tenant's own public-facing info (name, hours, description, etc).
  { name: 'get_business_profile', description: 'Read the tenant\'s public business profile fields (name, hours, description, contact info, etc — tenant-visible fields only).', input_schema: { type: 'object' as const, properties: {}, required: [] } },
  { name: 'update_business_profile', description: 'Update the tenant\'s public business profile. Args: fields — object keyed by profile field key (use get_business_profile to see valid keys) to new value.', input_schema: { type: 'object' as const, properties: { fields: { type: 'object' } }, required: ['fields'] } },

  // Service area
  { name: 'get_service_area', description: 'Read the tenant\'s configured service area (local/national, states, zones).', input_schema: { type: 'object' as const, properties: {}, required: [] } },
  { name: 'update_service_area', description: 'Update the tenant\'s service area. Args: service_area (object matching the ServiceArea shape — see get_service_area\'s output for the current shape).', input_schema: { type: 'object' as const, properties: { service_area: { type: 'object' } }, required: ['service_area'] } },

  // Dashboard user accounts (tenant_members) — creating a user mints and
  // hands over real login credentials via email/SMS. Confirm with the user
  // before calling create_dashboard_user or reset_dashboard_user_pin.
  { name: 'list_dashboard_users', description: 'List dashboard login accounts (owner/admin/manager/staff) for this tenant.', input_schema: { type: 'object' as const, properties: {}, required: [] } },
  { name: 'create_dashboard_user', description: "Create a new dashboard login account and send them their PIN via email/SMS. Args: name, optional role (owner/admin/manager/staff, default staff), email, phone. Returns the PIN once — it can't be retrieved again after this.", input_schema: { type: 'object' as const, properties: { name: { type: 'string' }, role: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' } }, required: ['name'] } },
  { name: 'update_dashboard_user', description: 'Update a dashboard user. Args: user_id, fields (object — allowed: name, email, phone, role).', input_schema: { type: 'object' as const, properties: { user_id: { type: 'string' }, fields: { type: 'object' } }, required: ['user_id', 'fields'] } },
  { name: 'delete_dashboard_user', description: 'Remove a dashboard login account (cannot remove the last owner). Args: user_id.', input_schema: { type: 'object' as const, properties: { user_id: { type: 'string' } }, required: ['user_id'] } },
  { name: 'reset_dashboard_user_pin', description: "Reset a dashboard user's login PIN and get the new one (returned once — it can't be retrieved again after this). Args: user_id, optional pin (4-8 digits — auto-generated if omitted).", input_schema: { type: 'object' as const, properties: { user_id: { type: 'string' }, pin: { type: 'string' } }, required: ['user_id'] } },

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
  { name: 'seo_status', description: "OWNER-ONLY. This business's SEO health from SIGNAL. Returns per-site letter grade (A–F, scored on money keywords, goal = top 3), open issue counts by type (deep_underperformer = page ranks poorly, needs content; striking_distance = one push from page 1; low_ctr = title/meta rewrite; competitor_gap = a rival outranks you on a money keyword; not_indexed = Google isn't showing the page at all), the top competitor gaps, and how many automated fixes are pending vs applied. Use whenever the owner asks about SEO, search rankings, Google traffic, visibility, or how their site is doing in search. No args.", input_schema: { type: 'object' as const, properties: {}, required: [] } },
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

const normPhone = (p: string): string => p.replace(/\D/g, '').slice(-10)

/**
 * Per-tenant owner check. A phone is the owner of tenant T iff it matches T's
 * own `owner_phone`. This is the ONLY cross-tenant-safe source: the owner of
 * tenant A must NEVER be treated as the owner of tenant B.
 *
 * The legacy global `OWNER_PHONES` env was authored specifically for The NYC
 * Maid (loadContext hardcodes "the business owner" for it, and Jeff's phone
 * lives there). We honor it ONLY for the nycmaid tenant so we don't dark Jeff's
 * live owner access — it is deliberately NOT consulted for any other tenant.
 */
export async function isOwnerOfTenant(phone: string | null | undefined, tenantId: string): Promise<boolean> {
  if (!phone) return false
  const norm = normPhone(phone)
  if (!norm) return false

  try {
    const { data } = await supabaseAdmin
      .from('tenants')
      .select('owner_phone')
      .eq('id', tenantId)
      .single()
    const ownerPhone = (data as { owner_phone?: string | null } | null)?.owner_phone
    if (ownerPhone && normPhone(ownerPhone) === norm) return true
  } catch {
    // fall through — a DB hiccup must not silently grant owner access
  }

  if (tenantId === NYCMAID_TENANT_ID) {
    const list = (process.env.OWNER_PHONES || '').split(',').map(normPhone).filter(Boolean)
    if (list.includes(norm)) return true
  }

  return false
}

// Dead code removed here (2026-07-28): a `buildBrandOverride()` function that
// was never called anywhere in the codebase — superseded by the config-driven
// playbook system (see resolve-base-prompt.ts) before it was ever wired in.

export async function loadContext(tenantId: string, phone: string | null, _conversationId: string): Promise<string> {
  const parts: string[] = []

  const ownerCaller = await isOwnerOfTenant(phone, tenantId)
  if (ownerCaller) {
    parts.push('CONTEXT: You are talking to the business owner. Use admin tools freely. Be terse with real numbers.')
  }

  if (phone && !ownerCaller) {
    const last10 = phone.replace(/\D/g, '').slice(-10)
    // Phone may match multiple client rows (duplicates created by lead intake vs. booking flow).
    // .maybeSingle() returned null on dupes, so Yinez was treating returning clients as brand-new.
    // Pick the canonical record: 'active' beats 'potential', then most-recent created_at.
    const { data: clientCandidates } = await supabaseAdmin
      .from('clients')
      .select('id, name, address, email, last_rate, notes, created_at, preferred_team_member_id, status')
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
      if (client.preferred_team_member_id) {
        const { data: pref } = await supabaseAdmin
          .from('team_members')
          .select('name')
          .eq('tenant_id', tenantId)
          .eq('id', client.preferred_team_member_id)
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
    // brand override. Rewrite the persona name to the tenant's agent (Selena
    // by default — never Jefe, a separate real platform-GM entity; this
    // mix-up has recurred across sessions). nycmaid early-returns above, so
    // its "Yinez" is never touched.
    out = out.replace(/\bYinez\b/g, tenant.agent_name || 'Selena')
    return out
  } catch {
    return text
  }
}

// Public entry point. Runs the agent, then rewrites NYC-template branding out of
// the response for non-nycmaid tenants before it ever reaches the customer.
//
// tenantId (2026-07-25, Jeff — full channel-parity fix): resolveTenantForConversation()
// only knows how to resolve a REAL sms_conversations.id — every caller whose
// conversationId lives in a different table (e.g. comhub-email's threadId,
// a comhub_threads.id) has to fall back to getCurrentTenantId(), which has no
// signed tenant header to read inside a cron loop iterating multiple tenants
// and throws. Callers that already know their own tenant (any per-tenant loop)
// should pass it directly instead of gambling on that fallback.
export async function askSelena(channel: Channel, message: string, conversationId: string, phone?: string, ctx?: YinezContext, tenantId?: string): Promise<YinezResult> {
  const result = await askSelenaCore(channel, message, conversationId, phone, ctx, tenantId)
  try {
    const tid = tenantId || await resolveTenantForConversation(conversationId)
    if (tid !== NYCMAID_TENANT_ID && result?.text) {
      result.text = await applyBrandRewrite(result.text, tid)
    }
  } catch {
    // never let brand rewrite break a response
  }
  return result
}

async function askSelenaCore(channel: Channel, message: string, conversationId: string, phone?: string, ctx?: YinezContext, tenantIdOverride?: string): Promise<YinezResult> {
  const result: YinezResult = { text: '', toolsCalled: [] }

  try {
    const lookupPhone = phone || null
    // Resolve tenant for this conversation. v1: derive from sms_conversations.tenant_id;
    // fall back to current tenant (nycmaid) if the conversation row hasn't been
    // tagged yet. Phase 3.2: every downstream tool query gains .eq('tenant_id', tenantId).
    // tenantIdOverride (2026-07-25): callers that already know their tenant skip
    // this guesswork entirely — see askSelena's tenantId param doc above.
    const tenantId = tenantIdOverride || await resolveTenantForConversation(conversationId)

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

    // One call path for every tenant — nyc-maid's verbatim authored playbook
    // vs. every other tenant's config-driven one is resolved as DATA inside
    // resolveBasePlaybook(), not as a branch in this shared reasoning loop.
    const basePrompt = SHARED_PREAMBLE + await resolveBasePlaybook(tenantId)
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
        void logAnthropicUsage({ tenantId, model: 'claude-sonnet-4-6', channel, usage: response.usage })

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
