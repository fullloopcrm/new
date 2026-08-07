// Yinez tool dispatcher.
// Client-facing tools (14) → call into yinez/core.ts handleTool.
// Owner-facing tools (8) → inline supabase queries.

import { randomInt } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { audit } from '@/lib/audit'
import { handleTool as coreHandleTool, EMPTY_CHECKLIST, type YinezResult as CoreResult } from '@/lib/selena/core'
import { isOwnerOfTenant, type YinezResult } from '@/lib/selena/agent'
import { sendSMS as sendTelnyxSMS } from '@/lib/sms'
import { smsAdmins } from '@/lib/admin-contacts'
import { sendEmail } from '@/lib/nycmaid/email'
import { notify } from '@/lib/nycmaid/notify'
import { getCurrentTenantId } from '@/lib/tenant'
import { getSettings } from '@/lib/settings'
import { hasPermission, type Role, type RolePermissionOverrides } from '@/lib/rbac'
import { SHARED_TOOL_PERMISSIONS } from '@/lib/selena/tool-permissions'
import { sanitizePostgrestValue } from '@/lib/postgrest-safe'
import { normalizeLineItems, computeTotals, generatePublicToken, generateQuoteNumber, logQuoteEvent } from '@/lib/quote'
import { generateInvoicePublicToken, generateInvoiceNumber, logInvoiceEvent } from '@/lib/invoice'
import { getDefaultEntityId, isEntityOwnedByTenant } from '@/lib/entity'
import { convertSaleToJob } from '@/lib/jobs'
import { isTerminalStatus as isDocTerminalStatus, logDocEvent } from '@/lib/documents'

const ymd = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })

// Every DB read/write in this file is tid-scoped, but SMS previously went
// out through @/lib/nycmaid/sms — hardcoded to nycmaid's own Telnyx account
// regardless of which tenant's conversation Yinez was handling. This fetches
// the real tenant's own creds; returns false (no-op) if that tenant hasn't
// configured Telnyx. Fixed 2026-07-24.
async function sendSMS(tid: string, to: string, body: string): Promise<{ success: boolean; error?: unknown }> {
  const { data: tenant } = await supabaseAdmin.from('tenants').select('telnyx_api_key, telnyx_phone').eq('id', tid).single()
  if (!tenant?.telnyx_api_key || !tenant?.telnyx_phone) return { success: false, error: 'Telnyx not configured for tenant' }
  try {
    await sendTelnyxSMS({ to, body, telnyxApiKey: tenant.telnyx_api_key, telnyxPhone: tenant.telnyx_phone })
    return { success: true }
  } catch (error) {
    return { success: false, error }
  }
}

// Hours between start_time and end_time. Bookings table has no estimated_hours column —
// duration is derived from the start/end timestamps that the booking flow always writes.
function bookingHours(b: { start_time?: string | null; end_time?: string | null }): number {
  if (!b.start_time || !b.end_time) return 0
  const ms = new Date(b.end_time).getTime() - new Date(b.start_time).getTime()
  if (!Number.isFinite(ms) || ms <= 0) return 0
  return ms / 3_600_000
}

function startOfPeriod(period: string): { from: string; to: string } {
  const now = new Date()
  const today = ymd(now)
  if (period === 'today') return { from: today, to: today }
  if (period === 'week') {
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((day + 6) % 7))
    return { from: ymd(monday), to: today }
  }
  if (period === 'month') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from: ymd(first), to: today }
  }
  if (period === 'ytd') {
    const jan1 = new Date(now.getFullYear(), 0, 1)
    return { from: ymd(jan1), to: today }
  }
  return { from: today, to: today }
}

// create_booking is deliberately NOT here — self-book-only enforcement
// (nycmaid cc92e0e6 parity). A client never gets a booking created for them
// by the AI on a client channel; she always directs them to the tenant's own
// self-book form instead. Only the owner (Telegram, isOwnerOfTenant-gated)
// can call create_booking, via create_manual_booking, which already lives in
// the owner-only tool set below.
const CLIENT_TOOLS = new Set([
  'lookup_bookings', 'reschedule_booking',
  'cancel_booking', 'confirm_payment', 'check_payment', 'send_pin', 'resend_confirmation',
  'update_account', 'request_callback', 'report_issue', 'remember',
])

// Per-client safe — looks up the CURRENT client's own memory only.
const SELF_TOOLS = new Set(['recall'])

// Tools whose handler lives locally in tools.ts but are safe on client channels —
// bypass the owner-only gate AND skip the core bridge. score_cleaners is the
// canonical availability source: it runs the full smart-schedule (per-cleaner
// availability, conflicts, day-off reasons) and returns ground truth, not a
// hallucinable summary. Yinez must use it for every slot quote on every channel.
const CLIENT_LOCAL_TOOLS = new Set(['score_cleaners'])

// Best-effort real target id for the audit row's entity_id column (a real
// UUID column — arbitrary strings fail the insert). Checked in priority
// order across the id-ish args every tool handler actually uses.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ENTITY_ID_KEYS = [
  'booking_id', 'client_id', 'cleaner_id', 'payout_id', 'schedule_id',
  'deal_id', 'application_id', 'notification_id', 'exclude_booking_id',
  'job_id', 'crew_id', 'equipment_id', 'item_id', 'vendor_id', 'quote_id',
  'invoice_id', 'document_id', 'team_member_id', 'referral_id', 'referrer_id',
  'commission_id', 'sales_partner_id', 'campaign_id', 'review_id',
  'lead_click_id', 'user_id', 'account_id', 'expense_id', 'photo_id',
  'session_id', 'payment_id',
]
function extractEntityId(input: Record<string, unknown>): string | undefined {
  for (const key of ENTITY_ID_KEYS) {
    const val = input[key]
    if (typeof val === 'string' && UUID_RE.test(val)) return val
  }
  return undefined
}

// Ambiguous-target guard. Investigated: neither core.ts's detectIntent (always
// resolves to some intent, never "unclear") nor agent.ts/tools.ts had any
// confidence-threshold or clarification-request mechanism — a tool call whose
// target id is missing/empty just silently proceeded (typically hitting
// "not found" downstream, or in a couple of handlers, writing null/undefined
// into a mutation). Claude's tool schema `required` array is a hint to the
// model, not an enforced contract — it can still emit a tool_use with a
// required field blank or omitted rather than asking. This refuses BEFORE
// dispatch and tells the model to ask instead of guessing/inventing an id.
//
// Scoped deliberately to id-shaped target fields (the ENTITY_ID_KEYS above,
// reusing the same list) rather than every field a schema marks required —
// some non-id required fields have a real default in the handler (e.g.
// report_issue's "severity" defaults to 'medium' if omitted; agent.ts's
// schema over-declares it required) and would false-positive as "missing"
// under a blanket check. An id has no such default: there is never a
// reasonable target to fall back to, so requiring it is always safe.
//
// Hand-verified against agent.ts's TOOLS schema (grep `required: [.*_id`)
// rather than importing TOOLS at runtime — several existing tests fully
// mock '@/lib/selena/agent' down to just { isOwnerOfTenant }, and importing
// TOOLS here would break every one of them on a module they don't even
// exercise. A static list is also immune to that class of test breakage.
const TOOL_REQUIRED_ID_FIELDS: Record<string, string[]> = {
  reschedule_booking: ['booking_id'],
  cancel_booking: ['booking_id'],
  assign_cleaner_to_booking: ['booking_id', 'cleaner_id'],
  update_booking: ['booking_id'],
  approve_refund: ['booking_id'],
  mark_payout_paid: ['payout_id'],
  block_client: ['client_id'],
  update_cleaner: ['cleaner_id'],
  deactivate_cleaner: ['cleaner_id'],
  pause_recurring: ['schedule_id'],
  resume_recurring: ['schedule_id'],
  cancel_recurring: ['schedule_id'],
  create_deal: ['client_id'],
  update_deal: ['deal_id'],
  mark_notification_read: ['notification_id'],
  approve_cleaner_application: ['application_id'],
  reject_cleaner_application: ['application_id'],
  process_stripe_refund: ['booking_id'],
  block_cleaner_dates: ['cleaner_id'],
  get_smart_suggestion: ['booking_id'],
  update_catalog_item: ['item_id'],
  delete_catalog_item: ['item_id'],
  update_job: ['job_id'],
  update_crew: ['crew_id'],
  delete_crew: ['crew_id'],
  update_equipment: ['equipment_id'],
  delete_equipment: ['equipment_id'],
  update_inventory_item: ['item_id'],
  delete_inventory_item: ['item_id'],
  update_vendor: ['vendor_id'],
  delete_vendor: ['vendor_id'],
  update_quote: ['quote_id'],
  delete_quote: ['quote_id'],
  send_quote: ['quote_id'],
  create_job_from_quote: ['quote_id'],
  update_invoice: ['invoice_id'],
  void_invoice: ['invoice_id'],
  send_invoice: ['invoice_id'],
  record_invoice_payment: ['invoice_id'],
  void_document: ['document_id'],
  get_employee_hr_profile: ['team_member_id'],
  update_employee_hr_profile: ['team_member_id'],
  add_employee_hr_note: ['team_member_id'],
  record_payroll_payment: ['team_member_id'],
  override_lead_conversion: ['lead_click_id'],
  verify_lead_conversion: ['lead_click_id'],
  update_referral: ['referral_id'],
  set_referrer_stripe_ineligible: ['referrer_id'],
  mark_referral_commission_paid: ['commission_id'],
  update_sales_partner: ['sales_partner_id'],
  mark_sales_partner_commission_paid: ['commission_id'],
  send_campaign: ['campaign_id'],
  reply_to_google_review: ['review_id'],
  update_review: ['review_id'],
  update_dashboard_user: ['user_id'],
  delete_dashboard_user: ['user_id'],
  reset_dashboard_user_pin: ['user_id'],
  list_job_checklist: ['job_id'],
  add_job_checklist_item: ['job_id'],
  update_job_checklist_item: ['job_id', 'item_id'],
  delete_job_checklist_item: ['job_id', 'item_id'],
  list_job_expenses: ['job_id'],
  add_job_expense: ['job_id'],
  delete_job_expense: ['job_id', 'expense_id'],
  list_job_photos: ['job_id'],
  update_job_photo: ['job_id', 'photo_id'],
  list_job_photo_comments: ['job_id', 'photo_id'],
  add_job_photo_comment: ['job_id', 'photo_id'],
  create_job_session: ['job_id'],
  update_job_session: ['job_id', 'session_id'],
  delete_job_session: ['job_id', 'session_id'],
  get_job_budget_variance: ['job_id'],
  update_job_payment: ['job_id', 'payment_id'],
}
function isMissing(val: unknown): boolean {
  if (val === undefined || val === null) return true
  if (typeof val === 'string' && val.trim() === '') return true
  if (typeof val === 'number' && Number.isNaN(val)) return true
  return false
}
function firstMissingRequiredIdField(name: string, input: Record<string, unknown>): string | undefined {
  const required = TOOL_REQUIRED_ID_FIELDS[name] || []
  return required.find((field) => isMissing(input[field]))
}

// Every tool call — client and owner alike — goes through this one function
// (SMS, web chat, and Telegram all call runTool for every tool the model
// invokes), so it's the single choke point for audit logging: wrap the real
// dispatcher (dispatchTool, unchanged logic) and write one audit_logs row
// per call, success or failure, before returning/rethrowing.
export async function runTool(
  name: string,
  input: Record<string, unknown>,
  conversationId: string,
  phone: string | null,
  result: YinezResult,
  tenantId?: string,
  // Optional dashboard-user context (2026-07-28, #3 prep). Undefined for
  // every existing caller (SMS/email/Telegram/admin-chat) — behavior for
  // them is byte-identical, still gated by isOwnerOfTenant below. When a
  // future dashboard caller passes role, tools mapped in
  // SHARED_TOOL_PERMISSIONS are additionally checked against it — this is
  // NOT yet called from anywhere; it exists so wiring the dashboard in
  // later doesn't require touching this gate again.
  role?: Role,
  roleOverrides?: RolePermissionOverrides,
): Promise<string> {
  const tid = tenantId || (await getCurrentTenantId())

  if (role) {
    const required = SHARED_TOOL_PERMISSIONS[name]
    if (required && !hasPermission(role, required, roleOverrides)) {
      return JSON.stringify({ error: 'permission_denied', message: `You don't have permission to do that (requires ${required}).` })
    }
  }

  let out: string
  let threw: unknown
  try {
    out = await dispatchTool(name, input, conversationId, phone, result, tid, role)
  } catch (err) {
    threw = err
    out = JSON.stringify({ error: 'tool_threw', message: err instanceof Error ? err.message : String(err) })
  }

  let blocked = false
  let toolError: string | undefined
  try {
    const parsed = JSON.parse(out)
    if (parsed && typeof parsed === 'object' && 'error' in parsed) {
      toolError = String((parsed as { error: unknown }).error)
      blocked = toolError === 'owner_only_tool'
    }
  } catch {
    // Non-JSON tool output (plain text) — treat as success, nothing to parse.
  }

  // Best-effort attribution without an extra DB round trip per call: tools
  // reachable on a client channel (CLIENT_TOOLS/SELF_TOOLS/CLIENT_LOCAL_TOOLS)
  // are attributed to the client; a blocked call means the owner-only gate
  // rejected a non-owner caller, so it's neither — flag it distinctly rather
  // than falsely crediting the owner with an attempt they didn't make.
  // Everything else only executes after dispatchTool's own isOwnerOfTenant
  // gate passes, so it's owner-initiated.
  const onBehalfOf = blocked
    ? 'blocked_non_owner'
    : (CLIENT_TOOLS.has(name) || SELF_TOOLS.has(name) || CLIENT_LOCAL_TOOLS.has(name)) ? 'client' : 'owner'

  audit({
    tenantId: tid,
    action: blocked ? 'yinez.tool_blocked' : 'yinez.tool_call',
    entityType: name,
    entityId: extractEntityId(input),
    details: {
      actor: 'agent',
      on_behalf_of: onBehalfOf,
      conversation_id: conversationId,
      phone: phone || undefined,
      success: !toolError,
      error: toolError,
    },
  }).catch((e) => console.error('[Yinez] audit log failed for tool', name, e))

  if (threw) throw threw
  return out
}

async function dispatchTool(
  name: string,
  input: Record<string, unknown>,
  conversationId: string,
  phone: string | null,
  result: YinezResult,
  tid: string,
  role?: Role,
): Promise<string> {

  // Owner-only gate. Anything not in CLIENT_TOOLS or SELF_TOOLS is an admin
  // tool (cross-client lookups, broadcasts, ops dashboards, refunds, etc).
  // If the caller isn't the owner, refuse before the side-effect runs.
  // Returning an error string (not throwing) lets the model see "not allowed"
  // and recover with a normal client-facing reply instead of dumping ops data.
  if (!role && !CLIENT_TOOLS.has(name) && !SELF_TOOLS.has(name) && !CLIENT_LOCAL_TOOLS.has(name) && !(await isOwnerOfTenant(phone, tid))) {
    console.warn('[Yinez:owner_tool_blocked]', { name, phone, conversationId })
    return JSON.stringify({
      error: 'owner_only_tool',
      message: `Tool ${name} is owner-only. You're talking to a client right now — answer their question without this tool.`,
    })
  }

  // Ambiguous-target guard — refuse rather than let the model act on a
  // missing/guessed id. See firstMissingRequiredIdField's comment above.
  const missingIdField = firstMissingRequiredIdField(name, input)
  if (missingIdField) {
    console.warn('[Yinez:missing_required_id]', { name, missingIdField, conversationId })
    return JSON.stringify({
      error: 'missing_required_field',
      field: missingIdField,
      message: `Cannot call ${name} — "${missingIdField}" is required but wasn't provided. Ask for it (or look it up first) instead of guessing or inventing a value.`,
    })
  }

  if (CLIENT_TOOLS.has(name)) {
    // Bridge to core's handleTool. Stub a core-shaped result; copy bookingCreated back.
    const stub: CoreResult = { text: '', checklist: { ...EMPTY_CHECKLIST } }
    const out = await coreHandleTool(name, input, conversationId, stub, tid)
    if (stub.bookingCreated) result.bookingCreated = true
    return out
  }

  switch (name) {
    case 'recall':
      return await handleRecall(phone, tid)
    case 'get_today_summary':
      return await handleTodaySummary(tid)
    case 'get_revenue':
      return await handleGetRevenue(String(input.period || 'today'), tid)
    case 'lookup_client':
      return await handleLookupClient(String(input.query || ''), tid, input.client_id as string | undefined)
    case 'list_bookings':
      return await handleListBookings(input as { date?: string; from_date?: string; to_date?: string; cleaner_id?: string }, tid)
    case 'lookup_cleaner':
      return await handleLookupCleaner(String(input.name || ''), tid)
    case 'get_outstanding_payments':
      return await handleOutstandingPayments(tid)
    case 'get_at_risk_clients':
      return await handleAtRiskClients(tid)
    case 'get_client_stats':
      return await handleGetClientStats(tid)
    case 'search_messages':
      return await handleSearchMessages(String(input.query || ''), tid)
    case 'assign_cleaner_to_booking':
      return await handleAssignCleaner(input as { booking_id: string; cleaner_id: string }, tid)
    case 'send_message_to_client':
      return await handleSendToClient(input as { client_id: string; message: string; channel?: 'sms' | 'email' }, tid)
    case 'send_message_to_cleaner':
      return await handleSendToCleaner(input as { cleaner_id: string; message: string }, tid)
    case 'send_broadcast':
      return await handleBroadcast(input as { audience: 'all_clients' | 'recurring_clients' | 'all_cleaners'; message: string }, tid)
    case 'create_manual_booking':
      return await handleCreateManualBooking(input as { client_id: string; date: string; time: string; service_type: string; hourly_rate: number; estimated_hours: number; cleaner_id?: string }, tid)
    case 'update_booking':
      return await handleUpdateBooking(input as { booking_id: string; fields: Record<string, unknown> }, tid)
    case 'approve_refund':
      return await handleApproveRefund(input as { booking_id: string; amount_dollars: number; reason: string }, tid)
    case 'mark_payment_received':
      return await handleMarkPaymentReceived(input as { booking_id: string; amount_dollars: number; method: string }, tid)
    case 'mark_payout_paid':
      return await handleMarkPayoutPaid(input as { payout_id: string }, tid)
    case 'block_client':
      return await handleBlockClient(input as { client_id: string; reason: string }, tid)
    case 'create_client':
      return await handleCreateClient(input as { name: string; phone: string; email?: string }, conversationId, tid)
    case 'create_cleaner':
      return await handleCreateCleaner(input as { name: string; phone: string; email?: string; zone?: string }, tid)
    case 'update_cleaner':
      return await handleUpdateCleaner(input as { cleaner_id: string; fields: Record<string, unknown> }, tid)
    case 'deactivate_cleaner':
      return await handleDeactivateCleaner(input as { cleaner_id: string; reason?: string }, tid)
    case 'list_cleaners':
      return await handleListCleaners(input as { status?: string }, tid)
    case 'list_recurring':
      return await handleListRecurring(input as { client_id?: string; status?: string }, tid)
    case 'pause_recurring':
      return await handlePauseRecurring(input as { schedule_id: string; until_date?: string }, tid)
    case 'resume_recurring':
      return await handleResumeRecurring(input as { schedule_id: string }, tid)
    case 'cancel_recurring':
      return await handleCancelRecurring(input as { schedule_id: string; reason?: string }, tid)
    case 'list_deals':
      return await handleListDeals(input as { stage?: string }, tid)
    case 'create_deal':
      return await handleCreateDeal(input as { client_id: string; value_dollars?: number; follow_up_at?: string; note?: string }, tid)
    case 'update_deal':
      return await handleUpdateDeal(input as { deal_id: string; fields: Record<string, unknown> }, tid)
    case 'list_notifications':
      return await handleListNotifications(input as { type?: string; limit?: number }, tid)
    case 'mark_notification_read':
      return await handleMarkNotificationRead(input as { notification_id: string }, tid)
    case 'list_cleaner_applications':
      return await handleListCleanerApplications(input as { status?: string }, tid)
    case 'approve_cleaner_application':
      return await handleApproveCleanerApplication(input as { application_id: string }, tid)
    case 'reject_cleaner_application':
      return await handleRejectCleanerApplication(input as { application_id: string; reason?: string }, tid)
    case 'get_setting':
      return await handleGetSetting(input as { key: string }, tid)
    case 'update_setting':
      return await handleUpdateSetting(input as { key: string; value: unknown }, tid)
    case 'list_service_types':
      return await handleListServiceTypes(tid)
    case 'create_catalog_item':
      return await handleCreateCatalogItem(input as { name: string; description?: string; notes?: string; item_type?: string; per_unit?: string; unit_label?: string; price_cents?: number; price_is_starting?: boolean; min_charge_cents?: number; cost_cents?: number; taxable?: boolean; category?: string; sort_order?: number; active?: boolean }, tid)
    case 'update_catalog_item':
      return await handleUpdateCatalogItem(input as { item_id: string; fields: Record<string, unknown> }, tid)
    case 'delete_catalog_item':
      return await handleDeleteCatalogItem(input as { item_id: string }, tid)
    case 'list_jobs':
      return await handleListJobs(tid)
    case 'update_job':
      return await handleUpdateJob(input as { job_id: string; fields: Record<string, unknown> }, tid)
    case 'list_job_checklist':
      return await handleListJobChecklist(input as { job_id: string }, tid)
    case 'add_job_checklist_item':
      return await handleAddJobChecklistItem(input as { job_id: string; label: string }, tid)
    case 'update_job_checklist_item':
      return await handleUpdateJobChecklistItem(input as { job_id: string; item_id: string; done?: boolean; label?: string }, tid)
    case 'delete_job_checklist_item':
      return await handleDeleteJobChecklistItem(input as { job_id: string; item_id: string }, tid)
    case 'list_job_expenses':
      return await handleListJobExpenses(input as { job_id: string }, tid)
    case 'add_job_expense':
      return await handleAddJobExpense(input as Parameters<typeof handleAddJobExpense>[0], tid)
    case 'delete_job_expense':
      return await handleDeleteJobExpense(input as { job_id: string; expense_id: string }, tid)
    case 'list_job_photos':
      return await handleListJobPhotos(input as { job_id: string }, tid)
    case 'update_job_photo':
      return await handleUpdateJobPhoto(input as { job_id: string; photo_id: string; tags?: string[]; pair_id?: string | null; caption?: string }, tid)
    case 'list_job_photo_comments':
      return await handleListJobPhotoComments(input as { job_id: string; photo_id: string }, tid)
    case 'add_job_photo_comment':
      return await handleAddJobPhotoComment(input as { job_id: string; photo_id: string; body: string; author?: string }, tid)
    case 'create_job_session':
      return await handleCreateJobSession(input as Parameters<typeof handleCreateJobSession>[0], tid)
    case 'update_job_session':
      return await handleUpdateJobSession(input as Parameters<typeof handleUpdateJobSession>[0], tid)
    case 'delete_job_session':
      return await handleDeleteJobSession(input as { job_id: string; session_id: string }, tid)
    case 'get_job_budget_variance':
      return await handleGetJobBudgetVariance(input as { job_id: string }, tid)
    case 'update_job_payment':
      return await handleUpdateJobPayment(input as { job_id: string; payment_id: string; status: string }, tid)
    case 'list_crews':
      return await handleListCrews(tid)
    case 'create_crew':
      return await handleCreateCrew(input as { name: string; color?: string; member_ids?: string[] }, tid)
    case 'update_crew':
      return await handleUpdateCrew(input as { crew_id: string; fields?: Record<string, unknown>; member_ids?: string[] }, tid)
    case 'delete_crew':
      return await handleDeleteCrew(input as { crew_id: string }, tid)
    case 'list_equipment':
      return await handleListEquipment(tid)
    case 'create_equipment':
      return await handleCreateEquipment(input as { name: string; asset_tag?: string; acquisition_cost_cents?: number; acquisition_date?: string; useful_life_months?: number; salvage_value_cents?: number; status?: string; notes?: string }, tid)
    case 'update_equipment':
      return await handleUpdateEquipment(input as { equipment_id: string; fields: Record<string, unknown> }, tid)
    case 'delete_equipment':
      return await handleDeleteEquipment(input as { equipment_id: string }, tid)
    case 'list_inventory':
      return await handleListInventory(tid)
    case 'create_inventory_item':
      return await handleCreateInventoryItem(input as { name: string; sku?: string; category?: string; unit_label?: string; quantity_on_hand?: number; unit_cost_cents?: number; reorder_threshold?: number; notes?: string }, tid)
    case 'update_inventory_item':
      return await handleUpdateInventoryItem(input as { item_id: string; fields: Record<string, unknown> }, tid)
    case 'delete_inventory_item':
      return await handleDeleteInventoryItem(input as { item_id: string }, tid)
    case 'list_vendors':
      return await handleListVendors(tid)
    case 'create_vendor':
      return await handleCreateVendor(input as { name: string; phone?: string; email?: string; category?: string; address?: string; notes?: string }, tid)
    case 'update_vendor':
      return await handleUpdateVendor(input as { vendor_id: string; fields: Record<string, unknown> }, tid)
    case 'delete_vendor':
      return await handleDeleteVendor(input as { vendor_id: string }, tid)
    case 'list_quotes':
      return await handleListQuotes(input as { status?: string; client_id?: string; deal_id?: string; limit?: number }, tid)
    case 'create_quote':
      return await handleCreateQuote(input as Parameters<typeof handleCreateQuote>[0], tid)
    case 'update_quote':
      return await handleUpdateQuote(input as { quote_id: string; fields: Record<string, unknown> }, tid)
    case 'delete_quote':
      return await handleDeleteQuote(input as { quote_id: string }, tid)
    case 'send_quote':
      return await handleSendQuote(input as { quote_id: string }, tid)
    case 'create_job_from_quote':
      return await handleCreateJobFromQuote(input as { quote_id: string }, tid)
    case 'list_invoices':
      return await handleListInvoices(input as { status?: string; client_id?: string; limit?: number }, tid)
    case 'create_invoice':
      return await handleCreateInvoice(input as Parameters<typeof handleCreateInvoice>[0], tid)
    case 'update_invoice':
      return await handleUpdateInvoice(input as { invoice_id: string; fields: Record<string, unknown> }, tid)
    case 'void_invoice':
      return await handleVoidInvoice(input as { invoice_id: string; reason?: string }, tid)
    case 'send_invoice':
      return await handleSendInvoice(input as { invoice_id: string }, tid)
    case 'record_invoice_payment':
      return await handleRecordInvoicePayment(input as { invoice_id: string; amount_dollars: number; method?: string; reference_id?: string; sender_name?: string }, tid)
    case 'list_documents':
      return await handleListDocuments(input as { status?: string; limit?: number }, tid)
    case 'void_document':
      return await handleVoidDocument(input as { document_id: string; reason?: string }, tid)
    case 'get_ar_aging':
      return await handleGetArAging(input as { entity_id?: string }, tid)
    case 'get_balance_sheet':
      return await handleGetBalanceSheet(input as { as_of?: string; entity_id?: string }, tid)
    case 'get_trial_balance':
      return await handleGetTrialBalance(input as { from?: string; to?: string; entity_id?: string }, tid)
    case 'get_pnl':
      return await handleGetPnl(input as { from?: string; to?: string; entity_id?: string }, tid)
    case 'get_cash_flow_forecast':
      return await handleGetCashFlowForecast(input as { weeks?: number; entity_id?: string }, tid)
    case 'get_chart_of_accounts':
      return await handleGetChartOfAccounts(tid)
    case 'create_account':
      return await handleCreateAccount(input as { code: string; name: string; type: string; subtype?: string; parent_id?: string; is_bank_account?: boolean }, tid)
    case 'list_expenses':
      return await handleListExpenses(input as { entity_id?: string; limit?: number }, tid)
    case 'create_expense':
      return await handleCreateExpense(input as { category: string; amount_dollars: number; description?: string; receipt_url?: string; date?: string; entity_id?: string }, tid)
    case 'list_recurring_expenses':
      return await handleListRecurringExpenses(tid)
    case 'create_recurring_expense':
      return await handleCreateRecurringExpense(input as { label: string; category?: string; amount_cents: number; frequency: string; start_date?: string; end_date?: string; notes?: string }, tid)
    case 'get_payroll_summary':
      return await handleGetPayrollSummary(tid)
    case 'record_payroll_payment':
      return await handleRecordPayrollPayment(input as { team_member_id: string; amount_dollars: number; method?: string; period_start?: string; period_end?: string }, tid)
    case 'list_employees':
      return await handleListEmployees(tid)
    case 'get_employee_hr_profile':
      return await handleGetEmployeeHrProfile(input as { team_member_id: string }, tid)
    case 'update_employee_hr_profile':
      return await handleUpdateEmployeeHrProfile(input as { team_member_id: string; fields: Record<string, unknown> }, tid)
    case 'add_employee_hr_note':
      return await handleAddEmployeeHrNote(input as { team_member_id: string; body: string; kind?: string; author_name?: string }, tid)
    case 'block_referrer_domain':
      return await handleBlockReferrerDomain(input as { domain: string }, tid)
    case 'unblock_referrer_domain':
      return await handleUnblockReferrerDomain(input as { domain: string }, tid)
    case 'override_lead_conversion':
      return await handleOverrideLeadConversion(input as { lead_click_id: string; type: 'conversion' | 'sale' }, tid)
    case 'verify_lead_conversion':
      return await handleVerifyLeadConversion(input as { lead_click_id: string; field: 'true_conversion' | 'true_close'; value: boolean }, tid)
    case 'list_lead_domains':
      return await handleListLeadDomains(tid)
    case 'list_referrals':
      return await handleListReferrals(tid)
    case 'create_referral':
      return await handleCreateReferral(input as { name: string; email?: string; phone?: string; code?: string; commission_rate?: number }, tid)
    case 'update_referral':
      return await handleUpdateReferral(input as { referral_id: string; fields: Record<string, unknown> }, tid)
    case 'set_referrer_stripe_ineligible':
      return await handleSetReferrerStripeIneligible(input as { referrer_id: string; stripe_ineligible: boolean }, tid)
    case 'list_referral_commissions':
      return await handleListReferralCommissions(input as { status?: string; referrer_id?: string }, tid)
    case 'create_referral_commission':
      return await handleCreateReferralCommission(input as { booking_id: string }, tid)
    case 'mark_referral_commission_paid':
      return await handleMarkReferralCommissionPaid(input as { commission_id: string; paid_via?: string }, tid)
    case 'create_sales_partner':
      return await handleCreateSalesPartner(input as { name: string; email: string; phone?: string; tier?: string }, tid)
    case 'list_sales_partners':
      return await handleListSalesPartners(tid)
    case 'update_sales_partner':
      return await handleUpdateSalesPartner(input as { sales_partner_id: string; active?: boolean; tier?: string; commission_rate?: number; stripe_ineligible?: boolean }, tid)
    case 'list_sales_partner_commissions':
      return await handleListSalesPartnerCommissions(input as { status?: string; sales_partner_id?: string }, tid)
    case 'mark_sales_partner_commission_paid':
      return await handleMarkSalesPartnerCommissionPaid(input as { commission_id: string; paid_via?: string }, tid)
    case 'list_campaigns':
      return await handleListCampaigns(tid)
    case 'create_campaign':
      return await handleCreateCampaign(input as { name: string; type: string; subject?: string; body?: string; recipient_filter?: string }, tid)
    case 'send_campaign':
      return await handleSendCampaign(input as { campaign_id: string; client_ids?: string[] }, tid)
    case 'list_google_posts':
      return await handleListGooglePosts(tid)
    case 'create_google_post':
      return await handleCreateGooglePost(input as { summary?: string; generate_ai?: boolean; topic?: string; call_to_action_type?: string; call_to_action_url?: string; photo_url?: string }, tid)
    case 'list_google_reviews':
      return await handleListGoogleReviews(tid)
    case 'reply_to_google_review':
      return await handleReplyToGoogleReview(input as { review_id: string; reply?: string; generate_ai?: boolean }, tid)
    case 'post_to_social':
      return await handlePostToSocial(input as { platform: 'facebook' | 'instagram'; message?: string; photo_url?: string; caption?: string; image_url?: string }, tid)
    case 'list_reviews':
      return await handleListReviews(tid)
    case 'request_review':
      return await handleRequestReview(input as { client_id: string; booking_id?: string }, tid)
    case 'update_review':
      return await handleUpdateReview(input as { review_id: string; fields: Record<string, unknown> }, tid)
    case 'list_settings_services':
      return await handleListSettingsServices(tid)
    case 'create_settings_service':
      return await handleCreateSettingsService(input as { name: string; description?: string; default_duration_hours?: number; default_hourly_rate?: number; pricing_model?: string; price_cents?: number; per_unit?: string; min_charge_cents?: number }, tid)
    case 'get_role_permissions':
      return await handleGetRolePermissions(tid)
    case 'update_role_permissions':
      return await handleUpdateRolePermissions(input as { overrides: Record<string, Record<string, boolean>> }, tid)
    case 'get_business_profile':
      return await handleGetBusinessProfile(tid)
    case 'update_business_profile':
      return await handleUpdateBusinessProfile(input as { fields: Record<string, unknown> }, tid)
    case 'get_service_area':
      return await handleGetServiceArea(tid)
    case 'update_service_area':
      return await handleUpdateServiceArea(input as { service_area: unknown }, tid)
    case 'list_dashboard_users':
      return await handleListDashboardUsers(tid)
    case 'create_dashboard_user':
      return await handleCreateDashboardUser(input as { name: string; role?: string; email?: string; phone?: string }, tid)
    case 'update_dashboard_user':
      return await handleUpdateDashboardUser(input as { user_id: string; fields: Record<string, unknown> }, tid)
    case 'delete_dashboard_user':
      return await handleDeleteDashboardUser(input as { user_id: string }, tid)
    case 'reset_dashboard_user_pin':
      return await handleResetDashboardUserPin(input as { user_id: string; pin?: string }, tid)
    case 'process_stripe_refund':
      return await handleProcessStripeRefund(input as { booking_id: string; amount_dollars: number; reason?: string }, tid)
    case 'trigger_cron':
      return await handleTriggerCron(input as { name: string })
    case 'block_cleaner_dates':
      return await handleBlockCleanerDates(input as { cleaner_id: string; from_date: string; to_date: string; reason?: string }, tid)
    case 'list_skills':
      return await handleListSkills(input as { include_inactive?: boolean }, tid)
    case 'create_skill':
      return await handleCreateSkill(input as { name: string; when_to_use: string; body: string }, tid)
    case 'update_skill':
      return await handleUpdateSkill(input as { name: string; fields: Record<string, unknown> }, tid)
    case 'deactivate_skill':
      return await handleSetSkillActive({ name: (input as { name: string }).name, active: false }, tid)
    case 'activate_skill':
      return await handleSetSkillActive({ name: (input as { name: string }).name, active: true }, tid)
    case 'record_skill_use':
      return await handleRecordSkillUse(input as { name: string }, tid)
    case 'get_briefing':
      return await handleGetBriefing(input as { since_hours?: number }, tid)
    case 'score_cleaners':
      return await handleScoreCleaners(input as { date: string; time: string; duration_hours: number; client_address?: string; client_id?: string; exclude_booking_id?: string; hourly_rate?: number }, tid)
    case 'get_smart_suggestion':
      return await handleGetSmartSuggestion(input as { booking_id: string }, tid)
    case 'suggest_times':
      return await handleSuggestTimes(input as { date: string; duration_hours: number; client_address?: string; client_id?: string; hourly_rate?: number; team_size?: number; requested_time?: string; exclude_booking_id?: string }, tid)
    case 'seo_status':
      return await handleSeoStatus(tid)
    default:
      return JSON.stringify({ error: `unknown tool: ${name}` })
  }
}

// ── FK tenant-ownership guard (P3-5) ──
// Owner tools take a referenced client_id / cleaner_id / deal_id and write it
// verbatim into a tenant-scoped row (or pass it to a scorer). The row's own
// tenant_id is always the caller's, but the FOREIGN KEY is not checked — so an
// owner (or, for score_cleaners which bypasses the owner gate, any client) could
// point a booking/deal/block/assignment at ANOTHER tenant's client or cleaner id.
// Verify each referenced id resolves INSIDE the caller's tenant before the
// side-effect runs; reject with a stable not-found error otherwise (do not
// disclose that the id exists in some other tenant).
async function idInTenant(table: 'clients' | 'team_members' | 'deals' | 'bookings' | 'quotes' | 'invoices' | 'documents', id: string, tid: string): Promise<boolean> {
  if (!id) return false
  const { data } = await supabaseAdmin.from(table).select('id').eq('id', id).eq('tenant_id', tid).maybeSingle()
  return !!data
}

// ── Smart scheduling visibility ──
// Yinez runs the same scoring algorithm the admin UI shows in the cleaner dropdown — full
// list of cleaners with availability, conflicts, day-off reasons, score + rationale.
// Same data Jeff sees when assigning. So she can answer "why this cleaner" and "who else?".

async function handleScoreCleaners(input: { date: string; time: string; duration_hours: number; client_address?: string; client_id?: string; exclude_booking_id?: string; hourly_rate?: number }, tid: string): Promise<string> {
  if (!input.date || !input.time || !input.duration_hours) {
    return JSON.stringify({ error: 'date, time (HH:MM), and duration_hours are required' })
  }
  // score_cleaners is client-callable (bypasses the owner gate), so a foreign
  // client_id here would leak another tenant's address/zone match into scoring.
  if (input.client_id && !(await idInTenant('clients', input.client_id, tid))) {
    return JSON.stringify({ error: 'client not found' })
  }
  const { scoreTeamForBooking } = await import('@/lib/smart-schedule')
  const [h, m] = input.time.replace(/[^\d:]/g, '').split(':').map(Number)
  const startTime = `${String(h || 0).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`
  const scores = await scoreTeamForBooking({
    tenantId: tid,
    date: input.date,
    startTime,
    durationHours: input.duration_hours,
    clientAddress: input.client_address || '',
    clientId: input.client_id,
    excludeBookingId: input.exclude_booking_id,
    hourlyRate: input.hourly_rate,
  })
  // Return the FULL list (matching what Jeff sees in the admin dropdown), not just the
  // top picks — so Yinez can explain availability + conflicts + day-off reasons.
  // UNLIKE the admin dropdown, this tool is reachable by ordinary CLIENTS
  // (score_cleaners is a CLIENT_LOCAL_TOOL — it bypasses the owner-only gate
  // above by design). scoreTeamForBooking's raw `conflict` string can
  // embed ANOTHER client's name (e.g. "Conflict: 2:00 PM (Sarah J)") and its
  // `day_jobs` array is that other client's full day schedule (name +
  // address + time) — the same cross-client PII the public
  // /api/client/smart-schedule GET route explicitly strips out for this
  // exact reason. Mirror that sanitization here: never forward day_jobs, and
  // scrub the trailing "(name)" off conflict before it reaches the client.
  return JSON.stringify({
    slot: { date: input.date, time: startTime, duration_hours: input.duration_hours },
    cleaners: scores.map((s) => ({
      name: s.name,
      score: s.score,
      available: s.available,
      reason: s.reason,
      conflict: s.conflict ? s.conflict.replace(/\s*\([^)]*\)\s*$/, '') : null,
      zone_match: s.zone_match,
      has_car: s.has_car,
      home_by: s.home_by,
    })),
  })
}

async function handleGetSmartSuggestion(input: { booking_id: string }, tid: string): Promise<string> {
  if (!input.booking_id) return JSON.stringify({ error: 'booking_id required' })
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, start_time, end_time, hourly_rate, status, team_member_id, suggested_team_member_id, suggested_reason, client_id, clients(name, address), team_members!bookings_team_member_id_fkey(name)')
    .eq('id', input.booking_id)
    .eq('tenant_id', tid)
    .maybeSingle()
  if (!booking) return JSON.stringify({ error: 'booking not found' })

  const startTime = booking.start_time?.split('T')[1]?.slice(0, 5) || '09:00'
  const startMs = new Date(booking.start_time).getTime()
  const endMs = new Date(booking.end_time).getTime()
  const duration = endMs > startMs ? (endMs - startMs) / 3_600_000 : 2

  const { scoreTeamForBooking } = await import('@/lib/smart-schedule')
  const scores = await scoreTeamForBooking({
    tenantId: tid,
    date: booking.start_time.split('T')[0],
    startTime,
    durationHours: duration,
    clientAddress: (booking.clients as unknown as { address?: string })?.address || '',
    clientId: booking.client_id,
    excludeBookingId: booking.id,
    hourlyRate: Number(booking.hourly_rate) || undefined,
  })

  return JSON.stringify({
    booking_id: booking.id,
    client: (booking.clients as unknown as { name?: string })?.name || null,
    status: booking.status,
    assigned_cleaner: (booking.team_members as unknown as { name?: string })?.name || null,
    saved_suggestion_reason: booking.suggested_reason || null,
    cleaners: scores.map((s) => ({
      name: s.name,
      score: s.score,
      available: s.available,
      reason: s.reason,
      conflict: s.conflict || null,
      zone_match: s.zone_match,
    })),
  })
}

// ── suggest_times — OWNER-ONLY alternate-time finder (ported from nyc maid) ──
// When nobody fits the requested time, scan the day and return the best ALTERNATE
// start times, each paired with the cleaner who fits it, smart-cluster ranked.
async function handleSuggestTimes(
  input: { date: string; duration_hours: number; client_address?: string; client_id?: string; hourly_rate?: number; team_size?: number; requested_time?: string; exclude_booking_id?: string },
  tid: string,
): Promise<string> {
  if (!input.date || !input.duration_hours) {
    return JSON.stringify({ error: 'date and duration_hours are required' })
  }
  const { suggestBookingSlots } = await import('@/lib/smart-schedule')
  const reqRaw = input.requested_time?.replace(/[^\d:]/g, '')
  let requestedTime: string | undefined
  if (reqRaw) {
    const [h, m] = reqRaw.split(':').map(Number)
    requestedTime = `${String(h || 0).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`
  }
  const suggestions = await suggestBookingSlots({
    tenantId: tid,
    date: input.date,
    durationHours: input.duration_hours,
    clientAddress: input.client_address || '',
    clientId: input.client_id,
    hourlyRate: input.hourly_rate,
    teamSize: input.team_size,
    requestedTime,
    excludeBookingId: input.exclude_booking_id,
  })
  return JSON.stringify({
    date: input.date,
    requested_time: requestedTime || null,
    suggestions: suggestions.map((s) => ({
      time: s.label,
      time_24h: s.time24,
      cleaner: s.cleanerName,
      reason: s.reason,
      score: s.score,
      ...(s.teamShort != null ? { team_short: s.teamShort } : {}),
    })),
    note: suggestions.length === 0 ? 'No alternate times work that day with current staffing.' : null,
  })
}

// ── Briefing — owner snapshot of what's happening / what Yinez has learned ──
// Returns a structured digest Yinez can read aloud to Jeff on Telegram. Anything Jeff
// would want at a glance: new skills, fresh lessons, escalations, low-scored convos.

async function handleGetBriefing(input: { since_hours?: number }, tid: string): Promise<string> {
  // No "smart" summary layer — fan out to the same raw tools an owner would
  // call manually and concatenate their outputs verbatim. Anything Yinez
  // quotes from the briefing comes from a real tool result, not a derived
  // total she might mangle. (Hallucinated callback IDs in the Apr 28-May 1
  // Telegram session were the trigger for this rewrite.)
  const hours = Math.max(1, Math.min(168, input.since_hours || 24))
  const since = new Date(Date.now() - hours * 3_600_000).toISOString()

  const [today, outstanding, atRisk, notifications, newSkills, newLessons, lowScoredConvos] = await Promise.all([
    handleTodaySummary(tid),
    handleOutstandingPayments(tid),
    handleAtRiskClients(tid),
    handleListNotifications({ limit: 15 }, tid),
    supabaseAdmin
      .from('yinez_skills')
      .select('name, when_to_use, hit_count, created_at')
      .eq('tenant_id', tid)
      .gte('created_at', since)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(20)
      .then((r) => r.data || []),
    supabaseAdmin
      .from('yinez_memory')
      .select('type, content, created_at')
      .eq('tenant_id', tid)
      .is('client_id', null)
      .in('type', ['lesson', 'rule', 'instruction'])
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(20)
      .then((r) => r.data || []),
    supabaseAdmin
      .from('sms_conversations')
      .select('id, phone, name, quality_score, summary, updated_at')
      .eq('tenant_id', tid)
      .lt('quality_score', 60)
      .gte('updated_at', since)
      .order('quality_score', { ascending: true })
      .limit(10)
      .then((r) => r.data || []),
  ])

  // Stitch raw JSON sub-results. Each block is whatever the underlying
  // handler returned — no derived sums, no rephrasing.
  const safeParse = (s: string) => { try { return JSON.parse(s) } catch { return s } }
  return JSON.stringify({
    window_hours: hours,
    note: 'Raw concat of underlying tool outputs. Quote numbers/names verbatim. Do NOT invent IDs or totals.',
    today_summary: safeParse(today),
    outstanding_payments: safeParse(outstanding),
    at_risk_clients: safeParse(atRisk),
    recent_notifications: safeParse(notifications),
    new_skills_in_window: newSkills,
    new_lessons_in_window: newLessons,
    low_scored_conversations_in_window: lowScoredConvos,
  })
}

// ── skills — Jeff-authored procedures Yinez follows on-demand ──

async function handleListSkills(input: { include_inactive?: boolean }, tid: string): Promise<string> {
  let q = supabaseAdmin
    .from('yinez_skills')
    .select('id, name, when_to_use, body, active, hit_count, updated_at')
    .eq('tenant_id', tid)
    .order('updated_at', { ascending: false })
  if (!input.include_inactive) q = q.eq('active', true)
  const { data, error } = await q
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ count: (data || []).length, skills: data || [] })
}

async function handleCreateSkill(input: { name: string; when_to_use: string; body: string }, tid: string): Promise<string> {
  if (!input.name || !input.when_to_use || !input.body) {
    return JSON.stringify({ error: 'name, when_to_use, and body are all required' })
  }
  const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  const { data, error } = await supabaseAdmin
    .from('yinez_skills')
    .insert({ tenant_id: tid, name: slug, when_to_use: input.when_to_use, body: input.body, active: true })
    .select('id, name')
    .single()
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ ok: true, skill_id: data.id, name: data.name })
}

async function handleUpdateSkill(input: { name: string; fields: Record<string, unknown> }, tid: string): Promise<string> {
  const allowed = ['when_to_use', 'body', 'active']
  const update: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input.fields || {})) {
    if (allowed.includes(k)) update[k] = v
  }
  if (Object.keys(update).length === 0) return JSON.stringify({ error: 'no allowed fields to update' })
  const { error } = await supabaseAdmin.from('yinez_skills').update(update).eq('tenant_id', tid).eq('name', input.name)
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ ok: true, name: input.name, updated_fields: Object.keys(update) })
}

async function handleSetSkillActive(input: { name: string; active: boolean }, tid: string): Promise<string> {
  const { error } = await supabaseAdmin.from('yinez_skills').update({ active: input.active }).eq('tenant_id', tid).eq('name', input.name)
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ ok: true, name: input.name, active: input.active })
}

async function handleRecordSkillUse(input: { name: string }, tid: string): Promise<string> {
  if (!input.name) return JSON.stringify({ error: 'name required' })
  const { data: row } = await supabaseAdmin
    .from('yinez_skills')
    .select('id, hit_count')
    .eq('tenant_id', tid)
    .eq('name', input.name)
    .maybeSingle()
  if (!row) return JSON.stringify({ error: `no skill named ${input.name}` })
  await supabaseAdmin
    .from('yinez_skills')
    .update({ hit_count: (row.hit_count || 0) + 1 })
    .eq('tenant_id', tid)
    .eq('id', row.id)
  return JSON.stringify({ ok: true, name: input.name, hit_count: (row.hit_count || 0) + 1 })
}

// ── recall — read yinez_memory for current client OR (when called by Jeff/no client match)
// surface every global lesson + active skill so he can audit what Yinez knows.

async function handleRecall(phone: string | null, tid: string): Promise<string> {
  const last10 = (phone || '').replace(/\D/g, '').slice(-10)

  // Look up the per-client side first, if a client matches.
  let clientMemories: Array<{ type: string; content: string; source: string | null; created_at: string }> = []
  if (last10) {
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('tenant_id', tid)
      .ilike('phone', `%${last10}%`)
      .maybeSingle()
    if (client) {
      const { data } = await supabaseAdmin
        .from('yinez_memory')
        .select('type, content, source, created_at')
        .eq('tenant_id', tid)
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
        .limit(20)
      clientMemories = data || []
    }
  }

  // Always return globals + skills too — useful when Jeff calls recall on Telegram and
  // also when a client conversation needs a quick refresher on the canonical rules.
  const [globals, skills] = await Promise.all([
    supabaseAdmin
      .from('yinez_memory')
      .select('type, content, created_at')
      .eq('tenant_id', tid)
      .is('client_id', null)
      .in('type', ['lesson', 'rule', 'instruction'])
      .order('created_at', { ascending: false })
      .limit(50),
    supabaseAdmin
      .from('yinez_skills')
      .select('name, when_to_use, body, active, hit_count')
      .eq('tenant_id', tid)
      .eq('active', true)
      .order('hit_count', { ascending: false })
      .limit(50),
  ])

  return JSON.stringify({
    client_memories: clientMemories,
    global_lessons: globals.data || [],
    active_skills: skills.data || [],
  })
}

// ── owner ops ──

async function handleTodaySummary(tid: string): Promise<string> {
  const today = ymd(new Date())

  const [bookingsToday, payouts, outstanding, cleanersOnDuty] = await Promise.all([
    supabaseAdmin
      .from('bookings')
      .select('id, status, hourly_rate, clients(name), team_members!bookings_team_member_id_fkey(name), start_time, end_time')
      .eq('tenant_id', tid)
      .gte('start_time', today + 'T00:00:00')
      .lt('start_time', today + 'T23:59:59')
      .order('start_time', { ascending: true }),
    supabaseAdmin
      .from('team_member_payouts')
      .select('amount_cents, status, team_member_id, team_members(name)')
      .eq('tenant_id', tid)
      .eq('status', 'pending'),
    supabaseAdmin
      .from('bookings')
      .select('id, payment_status, hourly_rate, start_time, end_time, clients(name)')
      .eq('tenant_id', tid)
      .eq('status', 'completed')
      .neq('payment_status', 'paid')
      .limit(50),
    supabaseAdmin
      .from('bookings')
      .select('team_member_id, team_members!bookings_team_member_id_fkey(name)')
      .eq('tenant_id', tid)
      .gte('start_time', today + 'T00:00:00')
      .lt('start_time', today + 'T23:59:59')
      .not('team_member_id', 'is', null),
  ])

  const bookings = bookingsToday.data || []
  const payoutsList = payouts.data || []
  const outstandingList = outstanding.data || []
  const onDuty = Array.from(
    new Set(
      (cleanersOnDuty.data || [])
        .map((b) => (b.team_members as unknown as { name?: string })?.name)
        .filter(Boolean) as string[],
    ),
  )

  const totalPayoutsOwed = payoutsList.reduce((s, p) => s + (Number(p.amount_cents) || 0), 0)
  const totalOutstanding = outstandingList.reduce(
    (s, b) => s + (Number(b.hourly_rate) || 0) * bookingHours(b),
    0,
  )

  return JSON.stringify({
    date: today,
    bookings_today: bookings.map((b) => ({
      id: b.id,
      client: (b.clients as unknown as { name?: string })?.name || null,
      cleaner: (b.team_members as unknown as { name?: string })?.name || null,
      time: b.start_time,
      status: b.status,
      est: `$${(Number(b.hourly_rate) || 0) * bookingHours(b)}`,
    })),
    cleaners_on_duty: onDuty,
    payouts_pending_count: payoutsList.length,
    payouts_pending_total: `$${(totalPayoutsOwed / 100).toFixed(0)}`,
    outstanding_payments_count: outstandingList.length,
    outstanding_payments_estimated_total: `$${totalOutstanding.toFixed(0)}`,
  })
}

async function handleGetRevenue(period: string, tid: string): Promise<string> {
  const { from, to } = startOfPeriod(period)

  const { data: payments, error } = await supabaseAdmin
    .from('payments')
    .select('amount, tip, created_at')
    .eq('tenant_id', tid)
    .gte('created_at', from + 'T00:00:00')
    .lte('created_at', to + 'T23:59:59')
  if (error) return JSON.stringify({ error: error.message })

  const yoyFrom = (() => {
    const d = new Date(from)
    d.setFullYear(d.getFullYear() - 1)
    return ymd(d)
  })()
  const yoyTo = (() => {
    const d = new Date(to)
    d.setFullYear(d.getFullYear() - 1)
    return ymd(d)
  })()
  const { data: yoy } = await supabaseAdmin
    .from('payments')
    .select('amount, tip')
    .eq('tenant_id', tid)
    .gte('created_at', yoyFrom + 'T00:00:00')
    .lte('created_at', yoyTo + 'T23:59:59')

  const total = (payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const tips = (payments || []).reduce((s, p) => s + (Number(p.tip) || 0), 0)
  const yoyTotal = (yoy || []).reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const delta = yoyTotal === 0 ? null : ((total - yoyTotal) / yoyTotal) * 100

  return JSON.stringify({
    period,
    from,
    to,
    total: `$${(total / 100).toFixed(0)}`,
    tips: `$${(tips / 100).toFixed(0)}`,
    payment_count: (payments || []).length,
    yoy_total: `$${(yoyTotal / 100).toFixed(0)}`,
    yoy_delta_pct: delta === null ? null : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`,
  })
}

async function handleLookupClient(query: string, tid: string, exactClientId?: string): Promise<string> {
  const digits = query.replace(/\D/g, '')
  let q = supabaseAdmin
    .from('clients')
    .select('id, name, phone, email, address, status, notes, created_at, do_not_service, preferred_team_member_id')
    .eq('tenant_id', tid)
    .limit(5)
  // #3 fold: exact-id path for the dashboard's get_client_details (clicking
  // into a specific client after a fuzzy search) — a different access
  // pattern from the name/phone/email/address fuzzy match below, additive.
  if (exactClientId) {
    q = q.eq('id', exactClientId)
  } else if (digits.length >= 7) {
    q = q.ilike('phone', `%${digits.slice(-10)}%`)
  } else {
    // #3 fold: broadened from name-only to name/email/address so this can
    // fully replace the dashboard assistant's old search_clients (which
    // matched all four fields) without losing search capability.
    const safe = sanitizePostgrestValue(query)
    q = q.or(`name.ilike.%${safe}%,email.ilike.%${safe}%,address.ilike.%${safe}%`)
  }
  const { data: clients, error } = await q
  if (error) return JSON.stringify({ error: error.message })
  if (!clients || clients.length === 0) return JSON.stringify({ error: 'no client matched' })

  const enriched = await Promise.all(
    clients.map(async (c) => {
      const [bookings, payments, preferred] = await Promise.all([
        supabaseAdmin
          .from('bookings')
          .select('id, status, start_time, end_time, hourly_rate')
          .eq('tenant_id', tid)
          .eq('client_id', c.id)
          .order('start_time', { ascending: false })
          .limit(20),
        supabaseAdmin
          .from('payments')
          .select('amount, tip')
          .eq('tenant_id', tid)
          .eq('client_id', c.id),
        c.preferred_team_member_id
          ? supabaseAdmin
              .from('team_members')
              .select('name')
              .eq('tenant_id', tid)
              .eq('id', c.preferred_team_member_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ])
      const bs = bookings.data || []
      const ps = payments.data || []
      const ltv = ps.reduce((s, p) => s + (Number(p.amount) || 0) + (Number(p.tip) || 0), 0)
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        address: c.address,
        status: c.status,
        do_not_service: c.do_not_service,
        notes: c.notes,
        booking_count: bs.length,
        last_booking: bs[0]?.start_time || null,
        last_status: bs[0]?.status || null,
        ltv: `$${(ltv / 100).toFixed(0)}`,
        preferred_cleaner: (preferred as { data?: { name?: string } | null })?.data?.name || null,
      }
    }),
  )

  return JSON.stringify({ matches: enriched })
}

async function handleListBookings(input: { date?: string; from_date?: string; to_date?: string; cleaner_id?: string; client_id?: string; status?: string; limit?: number }, tid: string): Promise<string> {
  const from = input.from_date || input.date
  const to = input.to_date || input.date
  // Date range is optional when a narrower filter (client_id) is given — the
  // dashboard assistant's "show me this client's bookings" has no natural
  // date range to supply. #3 fold: this used to hard-require a date, which
  // was fine for the SMS/Telegram callers (always asking about a day/week)
  // but too narrow for the dashboard's ad-hoc client lookups.
  if ((!from || !to) && !input.client_id) return JSON.stringify({ error: 'provide date or from_date+to_date, or client_id' })

  let q = supabaseAdmin
    .from('bookings')
    .select('id, status, payment_status, start_time, end_time, hourly_rate, price, team_size, max_hours, clients(name), team_members!bookings_team_member_id_fkey(name, id)')
    .eq('tenant_id', tid)
    .order('start_time', { ascending: true })
    .limit(input.limit || 100)
  if (from && to) q = q.gte('start_time', from + 'T00:00:00').lte('start_time', to + 'T23:59:59')
  if (input.cleaner_id) q = q.eq('team_member_id', input.cleaner_id)
  if (input.client_id) q = q.eq('client_id', input.client_id)
  if (input.status) q = q.eq('status', input.status)
  const { data, error } = await q
  if (error) return JSON.stringify({ error: error.message })

  // For team bookings (team_size > 1), pull the full team so Yinez can see
  // who's on each multi-cleaner job — not only the lead.
  const teamBookingIds = (data || []).filter(b => (b.team_size || 1) > 1).map(b => b.id)
  let teamMap: Record<string, { name: string; is_lead: boolean }[]> = {}
  if (teamBookingIds.length > 0) {
    const { data: teamRows } = await supabaseAdmin
      .from('booking_team_members')
      .select('booking_id, is_lead, position, team_members(name)')
      .eq('tenant_id', tid)
      .in('booking_id', teamBookingIds)
      .order('position', { ascending: true })
    teamMap = (teamRows || []).reduce((acc, r) => {
      const c = r.team_members as unknown as { name?: string } | { name?: string }[] | null
      const cleaner = Array.isArray(c) ? c[0] : c
      if (!cleaner?.name) return acc
      if (!acc[r.booking_id]) acc[r.booking_id] = []
      acc[r.booking_id].push({ name: cleaner.name, is_lead: r.is_lead })
      return acc
    }, {} as Record<string, { name: string; is_lead: boolean }[]>)
  }
  const enriched = (data || []).map(b => ({ ...b, team: teamMap[b.id] || null }))
  return JSON.stringify({ count: enriched.length, bookings: enriched })
}

async function handleLookupCleaner(name: string, tid: string): Promise<string> {
  const { data: cleaners, error } = await supabaseAdmin
    .from('team_members')
    .select('id, name, phone, status')
    .eq('tenant_id', tid)
    .ilike('name', `%${name}%`)
    .limit(3)
  if (error) return JSON.stringify({ error: error.message })
  if (!cleaners || cleaners.length === 0) return JSON.stringify({ error: 'no cleaner matched' })

  const enriched = await Promise.all(
    cleaners.map(async (c) => {
      const [jobs, payouts, ratings] = await Promise.all([
        supabaseAdmin
          .from('bookings')
          .select('id, start_time, end_time, status, clients(name), hourly_rate')
          .eq('tenant_id', tid)
          .eq('team_member_id', c.id)
          .order('start_time', { ascending: false })
          .limit(5),
        supabaseAdmin
          .from('team_member_payouts')
          .select('amount_cents, status')
          .eq('tenant_id', tid)
          .eq('team_member_id', c.id)
          .eq('status', 'pending'),
        supabaseAdmin
          .from('ratings')
          .select('cleaner_rating, service_rating, feedback, created_at')
          .eq('tenant_id', tid)
          .eq('team_member_id', c.id)
          .order('created_at', { ascending: false })
          .limit(10),
      ])
      const owed = (payouts.data || []).reduce((s, p) => s + (Number(p.amount_cents) || 0), 0)
      const ratingAvg =
        (ratings.data || []).length > 0
          ? (
              (ratings.data || []).reduce((s, r) => s + (Number(r.cleaner_rating) || 0), 0) /
              (ratings.data || []).length
            ).toFixed(2)
          : null
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        status: c.status,
        last_5_jobs: (jobs.data || []).map((j) => ({
          date: j.start_time,
          status: j.status,
          client: (j.clients as unknown as { name?: string })?.name || null,
        })),
        unpaid_payout_total: `$${(owed / 100).toFixed(0)}`,
        rating_avg: ratingAvg,
        recent_ratings_count: (ratings.data || []).length,
      }
    }),
  )

  return JSON.stringify({ matches: enriched })
}

async function handleOutstandingPayments(tid: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('id, start_time, end_time, hourly_rate, payment_status, clients(name, phone)')
    .eq('tenant_id', tid)
    .eq('status', 'completed')
    .neq('payment_status', 'paid')
    .order('end_time', { ascending: true })
    .limit(50)
  if (error) return JSON.stringify({ error: error.message })

  const today = new Date()
  const aged = (data || []).map((b) => {
    const end = b.end_time ? new Date(b.end_time) : null
    const ageDays = end ? Math.floor((today.getTime() - end.getTime()) / 86_400_000) : null
    return {
      booking_id: b.id,
      client: (b.clients as unknown as { name?: string })?.name || null,
      phone: (b.clients as unknown as { phone?: string })?.phone || null,
      ended: b.end_time,
      age_days: ageDays,
      payment_status: b.payment_status,
      estimated_owed: `$${(Number(b.hourly_rate) || 0) * bookingHours(b)}`,
    }
  })

  return JSON.stringify({ count: aged.length, items: aged })
}

async function handleAtRiskClients(tid: string): Promise<string> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 45)
  const cutoffISO = cutoff.toISOString()

  const { data: clients, error } = await supabaseAdmin
    .from('clients')
    .select('id, name, phone, email, status, do_not_service')
    .eq('tenant_id', tid)
    .neq('do_not_service', true)
    .limit(500)
  if (error) return JSON.stringify({ error: error.message })

  const results: Array<{ id: string; name: string; phone?: string; last_booking?: string | null; days_since?: number }> = []
  for (const c of clients || []) {
    const { data: lastBooking } = await supabaseAdmin
      .from('bookings')
      .select('start_time, status')
      .eq('tenant_id', tid)
      .eq('client_id', c.id)
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!lastBooking?.start_time) continue
    const last = new Date(lastBooking.start_time)
    if (last.toISOString() > cutoffISO) continue
    const days = Math.floor((Date.now() - last.getTime()) / 86_400_000)
    results.push({
      id: c.id,
      name: c.name,
      phone: c.phone || undefined,
      last_booking: lastBooking.start_time,
      days_since: days,
    })
  }
  results.sort((a, b) => (b.days_since || 0) - (a.days_since || 0))
  return JSON.stringify({ count: results.length, clients: results.slice(0, 50) })
}

// Mirrors GET /api/clients/stats — total/active/new-this-month/inactive
// counts, revenue, avg LTV, referral count, source breakdown. Added
// 2026-08-07: the model had no direct "how many clients do we have" tool and
// was guessing from get_at_risk_clients's count instead.
async function handleGetClientStats(tid: string): Promise<string> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const [{ count: totalClients }, { count: activeClients }, { count: newThisMonth }, { data: revenueData }, { data: sourceData }] = await Promise.all([
    supabaseAdmin.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', tid),
    supabaseAdmin.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', tid).eq('status', 'active'),
    supabaseAdmin.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', tid).gte('created_at', monthStart),
    supabaseAdmin.from('bookings').select('price, client_id').eq('tenant_id', tid).eq('payment_status', 'paid'),
    supabaseAdmin.from('clients').select('source').eq('tenant_id', tid),
  ])
  const totalRevenue = (revenueData || []).reduce((sum, b) => sum + (b.price || 0), 0)
  const uniqueClients = new Set((revenueData || []).map(b => b.client_id)).size
  const avgLtv = uniqueClients > 0 ? Math.round(totalRevenue / uniqueClients) : 0
  const sourceCounts: Record<string, number> = {}
  for (const c of sourceData || []) { const src = c.source || 'unknown'; sourceCounts[src] = (sourceCounts[src] || 0) + 1 }
  return JSON.stringify({
    total: totalClients || 0, active: activeClients || 0, new_this_month: newThisMonth || 0,
    inactive: (totalClients || 0) - (activeClients || 0), referrals: sourceCounts['referral'] || 0,
    total_revenue_cents: totalRevenue, avg_ltv_cents: avgLtv, sources: sourceCounts,
  })
}

async function handleSearchMessages(query: string, tid: string): Promise<string> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)
  const { data, error } = await supabaseAdmin
    .from('sms_conversation_messages')
    .select('conversation_id, direction, message, created_at')
    .eq('tenant_id', tid)
    .ilike('message', `%${query}%`)
    .gte('created_at', cutoff.toISOString())
    .order('created_at', { ascending: false })
    .limit(30)
  if (error) return JSON.stringify({ error: error.message })

  const ids = Array.from(new Set((data || []).map((m) => m.conversation_id)))
  const { data: convos } = await supabaseAdmin
    .from('sms_conversations')
    .select('id, phone, client_id, clients(name)')
    .eq('tenant_id', tid)
    .in('id', ids.length > 0 ? ids : ['00000000-0000-0000-0000-000000000000'])
  const convoMap = new Map(
    (convos || []).map((c) => [
      c.id,
      { phone: c.phone, client: (c.clients as unknown as { name?: string })?.name || null },
    ]),
  )

  return JSON.stringify({
    count: (data || []).length,
    matches: (data || []).map((m) => ({
      when: m.created_at,
      direction: m.direction,
      who: convoMap.get(m.conversation_id) || null,
      message: m.message?.slice(0, 240) || '',
    })),
  })
}

// ──────────────────────────────────────────────────────────────────────────
// CONTROL TOOLS — destructive, owner-only intent
// ──────────────────────────────────────────────────────────────────────────

async function handleAssignCleaner(input: { booking_id: string; cleaner_id: string }, tid: string): Promise<string> {
  // The booking write is tenant-scoped, but cleaner_id is written verbatim —
  // reject a cleaner id that belongs to another tenant before the update.
  if (!(await idInTenant('team_members', input.cleaner_id, tid))) {
    return JSON.stringify({ error: 'cleaner not found' })
  }
  // booking_id must also resolve inside the caller's tenant. Without this check,
  // a foreign-tenant booking_id just makes the .eq('tenant_id', tid) filter below
  // match zero rows — Supabase returns no error, so the handler would falsely
  // report ok:true while writing nothing.
  if (!(await idInTenant('bookings', input.booking_id, tid))) {
    return JSON.stringify({ error: 'booking not found' })
  }
  const { error } = await supabaseAdmin
    .from('bookings')
    .update({ team_member_id: input.cleaner_id, status: 'scheduled' })
    .eq('id', input.booking_id)
    .eq('tenant_id', tid)
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ ok: true, booking_id: input.booking_id, cleaner_id: input.cleaner_id })
}

async function handleSendToClient(input: { client_id: string; message: string; channel?: 'sms' | 'email' }, tid: string): Promise<string> {
  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('id, name, phone, email')
    .eq('id', input.client_id)
    .eq('tenant_id', tid)
    .maybeSingle()
  if (!client) return JSON.stringify({ error: 'client not found' })

  const channel = input.channel || 'sms'
  if (channel === 'sms') {
    if (!client.phone) return JSON.stringify({ error: 'no client phone' })
    const r = await sendSMS(tid, client.phone, input.message)
    return JSON.stringify({ ok: true, channel: 'sms', sent_to: client.name, result: r })
  }
  if (channel === 'email') {
    if (!client.email) return JSON.stringify({ error: 'no client email' })
    await sendEmail(client.email, 'Message from The NYC Maid', `<p>${input.message.replace(/\n/g, '<br>')}</p>`)
    return JSON.stringify({ ok: true, channel: 'email', sent_to: client.name })
  }
  return JSON.stringify({ error: 'unknown channel' })
}

async function handleSendToCleaner(input: { cleaner_id: string; message: string }, tid: string): Promise<string> {
  const { data: cleaner } = await supabaseAdmin
    .from('team_members')
    .select('id, name, phone')
    .eq('id', input.cleaner_id)
    .eq('tenant_id', tid)
    .maybeSingle()
  if (!cleaner?.phone) return JSON.stringify({ error: 'cleaner not found or no phone' })
  const r = await sendSMS(tid, cleaner.phone, input.message)
  return JSON.stringify({ ok: true, sent_to: cleaner.name, result: r })
}

async function handleBroadcast(input: { audience: 'all_clients' | 'recurring_clients' | 'all_cleaners'; message: string }, tid: string): Promise<string> {
  let phones: string[] = []
  if (input.audience === 'all_clients') {
    const { data } = await supabaseAdmin.from('clients').select('phone, sms_consent, do_not_service').eq('tenant_id', tid)
    phones = (data || []).filter((c) => c.phone && c.sms_consent && !c.do_not_service).map((c) => c.phone as string)
  } else if (input.audience === 'recurring_clients') {
    const { data } = await supabaseAdmin
      .from('clients')
      .select('phone, sms_consent, do_not_service, status')
      .eq('tenant_id', tid)
      .eq('status', 'active')
    phones = (data || []).filter((c) => c.phone && c.sms_consent && !c.do_not_service).map((c) => c.phone as string)
  } else if (input.audience === 'all_cleaners') {
    const { data } = await supabaseAdmin.from('team_members').select('phone, sms_consent').eq('tenant_id', tid).eq('sms_consent', true)
    phones = (data || []).filter((c) => c.phone).map((c) => c.phone as string)
  } else {
    return JSON.stringify({ error: 'unknown audience' })
  }

  let sent = 0, failed = 0
  for (const phone of phones) {
    const r = await sendSMS(tid, phone, input.message)
    if (r.success) sent++
    else failed++
  }
  await smsAdmins(tid, `Broadcast complete — ${sent} sent, ${failed} failed.`).catch(() => {})
  return JSON.stringify({ ok: true, audience: input.audience, recipients: phones.length, sent, failed })
}

async function handleCreateManualBooking(input: { client_id: string; date: string; time: string; service_type: string; hourly_rate: number; estimated_hours: number; cleaner_id?: string }, tid: string): Promise<string> {
  // Both FKs are written into the booking row — validate each belongs to the
  // caller's tenant before inserting a cross-tenant reference.
  if (!(await idInTenant('clients', input.client_id, tid))) {
    return JSON.stringify({ error: 'client not found' })
  }
  if (input.cleaner_id && !(await idInTenant('team_members', input.cleaner_id, tid))) {
    return JSON.stringify({ error: 'cleaner not found' })
  }
  const startISO = `${input.date}T${parseTimeToISO(input.time)}`
  const startMs = new Date(startISO).getTime()
  const endISO = new Date(startMs + Math.round((input.estimated_hours || 2) * 3_600_000)).toISOString()
  const priceCents = Math.round((input.hourly_rate || 0) * (input.estimated_hours || 0) * 100)
  // Per Jeff: every new booking starts pending. Cleaner Yinez wants to assign goes into
  // suggested_cleaner_id so Jeff can review and approve before it goes live.
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .insert({
      tenant_id: tid,
      client_id: input.client_id,
      team_member_id: null,
      suggested_team_member_id: input.cleaner_id || null,
      service_type: input.service_type,
      hourly_rate: input.hourly_rate,
      price: priceCents,
      start_time: startISO,
      end_time: endISO,
      status: 'pending',
      payment_status: 'unpaid',
      source: 'admin',
    })
    .select('id, start_time')
    .single()
  if (error || !data) return JSON.stringify({ error: error?.message || 'insert failed' })
  await notify({ type: 'new_booking', title: 'Manual booking created', message: `${input.service_type} ${input.date} ${input.time} ($${input.hourly_rate}/hr × ${input.estimated_hours}hrs)`, booking_id: data.id }).catch(() => {})
  return JSON.stringify({ ok: true, booking_id: data.id, start_time: data.start_time })
}

function parseTimeToISO(t: string): string {
  // Accepts "9am", "12pm", "14:00", "2:30pm" → "HH:mm:ss"
  const m = t.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/)
  if (!m) return '12:00:00'
  let h = parseInt(m[1])
  const mm = m[2] ? parseInt(m[2]) : 0
  const period = m[3]
  if (period === 'pm' && h < 12) h += 12
  if (period === 'am' && h === 12) h = 0
  return `${h.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}:00`
}

async function handleUpdateBooking(input: { booking_id: string; fields: Record<string, unknown> }, tid: string): Promise<string> {
  // Whitelist mutable fields. `price` (cents, the actual invoiced total) added
  // #3 fold — distinct real column from `hourly_rate` (numeric per-hour rate);
  // this handler previously had no way to correct a booking's total price at
  // all, on any channel, which the dashboard's old update_bookings could do.
  const allowed = ['status', 'payment_status', 'cleaner_id', 'hourly_rate', 'price', 'start_time', 'end_time', 'notes', 'service_type']
  const update: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input.fields || {})) {
    if (allowed.includes(k)) update[k] = v
  }
  if (Object.keys(update).length === 0) return JSON.stringify({ error: 'no allowed fields to update' })

  // cleaner_id is a caller (model-supplied) FK — the sibling assign_cleaner_to_booking
  // tool already verifies it belongs to this tenant before writing it; this tool
  // let the same field through unchecked via the allow-list. list_bookings embeds
  // team_members(name, id) off this exact column, so an unverified foreign id would
  // read back another tenant's cleaner name on the next list_bookings call —
  // same class as the P25 finding in deploy-prep/cross-tenant-leak-register.md.
  // The tool-facing field is still named cleaner_id (Claude's tool schema uses that
  // name); the actual bookings column is team_member_id, so translate on the way out.
  if (update.cleaner_id) {
    const { data: cleaner } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .eq('id', update.cleaner_id as string)
      .eq('tenant_id', tid)
      .maybeSingle()
    if (!cleaner) return JSON.stringify({ error: 'cleaner not found' })
    update.team_member_id = update.cleaner_id
    delete update.cleaner_id
  }

  const { error } = await supabaseAdmin.from('bookings').update(update).eq('id', input.booking_id).eq('tenant_id', tid)
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ ok: true, booking_id: input.booking_id, updated_fields: Object.keys(update) })
}

async function handleApproveRefund(input: { booking_id: string; amount_dollars: number; reason: string }, tid: string): Promise<string> {
  // Don't actually issue Stripe refund here — that's a separate step. Just record approval.
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, client_id, payment_status, notes')
    .eq('id', input.booking_id)
    .eq('tenant_id', tid)
    .maybeSingle()
  if (!booking) return JSON.stringify({ error: 'booking not found' })

  // Idempotency guard (same pattern as process_stripe_refund's DB-state
  // pre-check): a retried/duplicate approve_refund call must not re-notify
  // admins by SMS a second time for the same approval.
  if (booking.payment_status === 'refund_pending' || booking.payment_status === 'refunded') {
    return JSON.stringify({ ok: true, status: booking.payment_status, note: 'already approved — not re-notifying admins', amount: input.amount_dollars })
  }

  const note = `[REFUND APPROVED ${new Date().toISOString().slice(0, 10)} $${input.amount_dollars} — ${input.reason}]`
  await supabaseAdmin
    .from('bookings')
    .update({ notes: booking.notes ? `${booking.notes}\n${note}` : note, payment_status: 'refund_pending' })
    .eq('id', input.booking_id)
    .eq('tenant_id', tid)

  await notify({ type: 'refund_approved', title: `Refund approved — $${input.amount_dollars}`, message: `Booking ${input.booking_id}: ${input.reason}`, booking_id: input.booking_id, tenantId: tid }).catch(() => {})
  await smsAdmins(tid, `✓ Refund approved: $${input.amount_dollars} for booking ${input.booking_id}. Reason: ${input.reason}. Process in Stripe.`).catch(() => {})
  return JSON.stringify({ ok: true, status: 'refund_approved_pending_processing', amount: input.amount_dollars })
}

async function handleMarkPaymentReceived(input: { booking_id: string; amount_dollars: number; method: string }, tid: string): Promise<string> {
  const cents = Math.round(input.amount_dollars * 100)
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, client_id, payment_status')
    .eq('id', input.booking_id)
    .eq('tenant_id', tid)
    .maybeSingle()
  if (!booking) return JSON.stringify({ error: 'booking not found' })

  // Idempotency guard, same pattern as approve_refund/mark_payout_paid: a
  // retried/duplicate call must not insert a second payments row for a
  // booking already marked paid.
  if (booking.payment_status === 'paid') {
    return JSON.stringify({ ok: true, booking_id: input.booking_id, note: 'already marked paid — not re-recording payment', amount: input.amount_dollars, method: input.method })
  }

  await supabaseAdmin.from('payments').insert({
    tenant_id: tid,
    booking_id: input.booking_id,
    client_id: booking.client_id,
    amount: cents,
    method: input.method,
    status: 'received',
  })
  await supabaseAdmin.from('bookings').update({ payment_status: 'paid', payment_received_at: new Date().toISOString() }).eq('id', input.booking_id).eq('tenant_id', tid)

  return JSON.stringify({ ok: true, booking_id: input.booking_id, amount: input.amount_dollars, method: input.method })
}

async function handleMarkPayoutPaid(input: { payout_id: string }, tid: string): Promise<string> {
  // Idempotency guard, same pattern as process_stripe_refund: pre-check
  // current state so a duplicate/retried call doesn't silently overwrite
  // paid_at with a second timestamp for a payout already marked paid.
  const { data: existing } = await supabaseAdmin
    .from('team_member_payouts')
    .select('status, paid_at')
    .eq('id', input.payout_id)
    .eq('tenant_id', tid)
    .maybeSingle()
  if (existing?.status === 'paid') {
    return JSON.stringify({ ok: true, payout_id: input.payout_id, note: 'already marked paid — not re-writing paid_at', paid_at: existing.paid_at })
  }

  const { error } = await supabaseAdmin
    .from('team_member_payouts')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', input.payout_id)
    .eq('tenant_id', tid)
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ ok: true, payout_id: input.payout_id })
}

async function handleBlockClient(input: { client_id: string; reason: string }, tid: string): Promise<string> {
  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('notes, do_not_service')
    .eq('id', input.client_id)
    .eq('tenant_id', tid)
    .maybeSingle()
  // Idempotency guard, same pattern as process_stripe_refund: a client
  // already blocked shouldn't accumulate a duplicate DNS note per retry.
  if (client?.do_not_service) {
    return JSON.stringify({ ok: true, client_id: input.client_id, status: 'do_not_service', note: 'already blocked — not appending a duplicate note' })
  }
  const note = `[DNS ${new Date().toISOString().slice(0, 10)} — ${input.reason}]`
  await supabaseAdmin
    .from('clients')
    .update({ do_not_service: true, notes: client?.notes ? `${client.notes}\n${note}` : note, sms_consent: false })
    .eq('id', input.client_id)
    .eq('tenant_id', tid)
  return JSON.stringify({ ok: true, client_id: input.client_id, status: 'do_not_service' })
}

// ──────────────────────────────────────────────────────────────────────────
// EXTENDED CONTROL TOOLS — cleaners, recurring, deals, settings, etc.
// ──────────────────────────────────────────────────────────────────────────

async function handleCreateCleaner(input: { name: string; phone: string; email?: string; zone?: string }, tid: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('team_members')
    .insert({ tenant_id: tid, name: input.name, phone: input.phone, email: input.email || null, service_zones: input.zone ? [input.zone] : null, status: 'active', sms_consent: true })
    .select('id, name')
    .single()
  if (error || !data) return JSON.stringify({ error: error?.message || 'insert failed' })
  return JSON.stringify({ ok: true, cleaner_id: data.id, name: data.name })
}

async function handleUpdateCleaner(input: { cleaner_id: string; fields: Record<string, unknown> }, tid: string): Promise<string> {
  const allowed = ['name', 'phone', 'email', 'zone', 'status', 'sms_consent', 'hourly_rate', 'has_car', 'labor_only']
  const update: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input.fields || {})) if (allowed.includes(k)) update[k] = v
  if (Object.keys(update).length === 0) return JSON.stringify({ error: 'no allowed fields' })
  // Tool-facing field is singular "zone" (matches Claude's tool schema); the real
  // team_members column is the array service_zones — translate on the way out.
  if (update.zone !== undefined) {
    update.service_zones = update.zone ? [update.zone] : null
    delete update.zone
  }
  const { error } = await supabaseAdmin.from('team_members').update(update).eq('id', input.cleaner_id).eq('tenant_id', tid)
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ ok: true, cleaner_id: input.cleaner_id, updated_fields: Object.keys(update) })
}

async function handleDeactivateCleaner(input: { cleaner_id: string; reason?: string }, tid: string): Promise<string> {
  // Idempotency guard, same pattern as process_stripe_refund: pre-check
  // current state so a duplicate/retried call is a clear no-op, not a
  // silent re-write.
  const { data: existing } = await supabaseAdmin
    .from('team_members')
    .select('status')
    .eq('id', input.cleaner_id)
    .eq('tenant_id', tid)
    .maybeSingle()
  if (existing?.status === 'inactive') {
    return JSON.stringify({ ok: true, cleaner_id: input.cleaner_id, status: 'inactive', note: 'already inactive — no-op' })
  }

  const { error } = await supabaseAdmin.from('team_members').update({ status: 'inactive' }).eq('id', input.cleaner_id).eq('tenant_id', tid)
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ ok: true, cleaner_id: input.cleaner_id, status: 'inactive', reason: input.reason })
}

async function handleListCleaners(input: { status?: string }, tid: string): Promise<string> {
  let q = supabaseAdmin.from('team_members').select('id, name, phone, status, service_zones, hourly_rate').eq('tenant_id', tid)
  const status = input.status || 'active'
  if (status !== 'all') q = q.eq('status', status)
  const { data, error } = await q.order('name', { ascending: true }).limit(100)
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ count: (data || []).length, cleaners: data || [] })
}

async function handleListRecurring(input: { client_id?: string; status?: string }, tid: string): Promise<string> {
  let q = supabaseAdmin.from('recurring_schedules').select('*, clients(name)').eq('tenant_id', tid)
  if (input.client_id) q = q.eq('client_id', input.client_id)
  if (input.status) q = q.eq('status', input.status)
  const { data, error } = await q.order('created_at', { ascending: false }).limit(50)
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ count: (data || []).length, schedules: data || [] })
}

// Kill switch check shared by every Yinez recurring-write tool. Settings ->
// Calendar -> "Pause automated recurring writes" -- refuses before any
// mutation runs, so flipping it off is instant (no deploy) and existing
// schedules/bookings are never touched by this refusal.
async function refuseIfRecurringWritesPaused(tid: string): Promise<string | null> {
  const { recurring_writes_paused } = await getSettings(tid)
  if (!recurring_writes_paused) return null
  return JSON.stringify({
    error: 'recurring_writes_paused',
    message: 'Automated recurring-schedule changes are paused for this tenant right now. Tell the client you\'ll follow up, or have an admin make this change directly in the dashboard.',
  })
}

async function handlePauseRecurring(input: { schedule_id: string; until_date?: string }, tid: string): Promise<string> {
  const blocked = await refuseIfRecurringWritesPaused(tid)
  if (blocked) return blocked
  const { error } = await supabaseAdmin
    .from('recurring_schedules')
    .update({ status: 'paused', paused_until: input.until_date || null })
    .eq('id', input.schedule_id)
    .eq('tenant_id', tid)
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ ok: true, schedule_id: input.schedule_id, paused_until: input.until_date })
}

async function handleResumeRecurring(input: { schedule_id: string }, tid: string): Promise<string> {
  const blocked = await refuseIfRecurringWritesPaused(tid)
  if (blocked) return blocked
  const { error } = await supabaseAdmin
    .from('recurring_schedules')
    .update({ status: 'active', paused_until: null })
    .eq('id', input.schedule_id)
    .eq('tenant_id', tid)
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ ok: true, schedule_id: input.schedule_id, status: 'active' })
}

async function handleCancelRecurring(input: { schedule_id: string; reason?: string }, tid: string): Promise<string> {
  const blocked = await refuseIfRecurringWritesPaused(tid)
  if (blocked) return blocked
  const { error } = await supabaseAdmin
    .from('recurring_schedules')
    .update({ status: 'cancelled' })
    .eq('id', input.schedule_id)
    .eq('tenant_id', tid)
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ ok: true, schedule_id: input.schedule_id, status: 'cancelled', reason: input.reason })
}

async function handleListDeals(input: { stage?: string }, tid: string): Promise<string> {
  let q = supabaseAdmin.from('deals').select('*, clients(name, phone)').eq('tenant_id', tid)
  const stage = input.stage || 'active'
  if (stage !== 'all') q = q.eq('stage', stage)
  const { data, error } = await q.order('follow_up_at', { ascending: true }).limit(50)
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ count: (data || []).length, deals: data || [] })
}

async function handleCreateDeal(input: { client_id: string; value_dollars?: number; follow_up_at?: string; note?: string }, tid: string): Promise<string> {
  // client_id is written into the deal row verbatim — reject a foreign client.
  if (!(await idInTenant('clients', input.client_id, tid))) {
    return JSON.stringify({ error: 'client not found' })
  }
  const { data, error } = await supabaseAdmin
    .from('deals')
    .insert({
      tenant_id: tid,
      client_id: input.client_id,
      value: input.value_dollars ? Math.round(input.value_dollars * 100) : null,
      stage: 'active',
      follow_up_at: input.follow_up_at || null,
      follow_up_note: input.note || null,
    })
    .select('id')
    .single()
  if (error || !data) return JSON.stringify({ error: error?.message || 'insert failed' })
  return JSON.stringify({ ok: true, deal_id: data.id })
}

async function handleUpdateDeal(input: { deal_id: string; fields: Record<string, unknown> }, tid: string): Promise<string> {
  const allowed = ['stage', 'value_dollars', 'follow_up_at', 'follow_up_note', 'notes']
  const update: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input.fields || {})) {
    if (k === 'value_dollars' && typeof v === 'number') {
      update.value = Math.round(v * 100)
    } else if (allowed.includes(k)) {
      update[k] = v
    }
  }
  if (Object.keys(update).length === 0) return JSON.stringify({ error: 'no allowed fields' })
  const { error } = await supabaseAdmin.from('deals').update(update).eq('id', input.deal_id).eq('tenant_id', tid)
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ ok: true, deal_id: input.deal_id, updated_fields: Object.keys(update) })
}

async function handleListNotifications(input: { type?: string; limit?: number }, tid: string): Promise<string> {
  let q = supabaseAdmin.from('notifications').select('id, type, title, message, booking_id, created_at, read').eq('tenant_id', tid).order('created_at', { ascending: false }).limit(Math.min(input.limit || 20, 100))
  if (input.type) q = q.eq('type', input.type)
  const { data, error } = await q
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ count: (data || []).length, notifications: data || [] })
}

async function handleMarkNotificationRead(input: { notification_id: string }, tid: string): Promise<string> {
  const { error } = await supabaseAdmin.from('notifications').update({ read: true }).eq('id', input.notification_id).eq('tenant_id', tid)
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ ok: true, notification_id: input.notification_id })
}

// cleaner_applications was the nycmaid-standalone table name; FullLoop's real,
// dashboard-wired applications table is team_applications (see
// /api/team-applications) — cleaner_applications holds stale pre-migration rows
// nobody writes to anymore (memory: fullloop_cleaner_applications_backfill_pending).
async function handleListCleanerApplications(input: { status?: string }, tid: string): Promise<string> {
  let q = supabaseAdmin.from('team_applications').select('*').eq('tenant_id', tid)
  const status = input.status || 'pending'
  if (status !== 'all') q = q.eq('status', status)
  const { data, error } = await q.order('created_at', { ascending: false }).limit(50)
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ count: (data || []).length, applications: data || [] })
}

async function handleApproveCleanerApplication(input: { application_id: string }, tid: string): Promise<string> {
  // Mirror PUT /api/team-applications exactly: flip status, then provision the
  // applicant as a team member (PIN + portal + branded email) via the same
  // shared helper the dashboard's single- and bulk-approve both use.
  const { data: app, error: updErr } = await supabaseAdmin
    .from('team_applications')
    .update({ status: 'approved' })
    .eq('id', input.application_id)
    .eq('tenant_id', tid)
    .select('id, name, email, phone, address')
    .single()
  if (updErr || !app) return JSON.stringify({ error: updErr?.message || 'application not found' })

  const { provisionApprovedApplicant } = await import('@/lib/team-provisioning')
  try {
    await provisionApprovedApplicant(tid, app)
  } catch (err) {
    return JSON.stringify({ ok: true, application_id: input.application_id, warning: `approved but provisioning failed: ${err instanceof Error ? err.message : String(err)}` })
  }
  return JSON.stringify({ ok: true, application_id: input.application_id })
}

async function handleRejectCleanerApplication(input: { application_id: string; reason?: string }, tid: string): Promise<string> {
  const { error } = await supabaseAdmin
    .from('team_applications')
    .update({ status: 'rejected' })
    .eq('id', input.application_id)
    .eq('tenant_id', tid)
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ ok: true, application_id: input.application_id })
}

async function handleGetSetting(input: { key: string }, tid: string): Promise<string> {
  const { data, error } = await supabaseAdmin.from('settings').select('*').eq('tenant_id', tid).eq('key', input.key).maybeSingle()
  if (error) return JSON.stringify({ error: error.message })
  if (!data) return JSON.stringify({ error: 'setting not found', key: input.key })
  return JSON.stringify({ key: data.key, value: data.value, updated_at: data.updated_at })
}

async function handleUpdateSetting(input: { key: string; value: unknown }, tid: string): Promise<string> {
  const { error } = await supabaseAdmin.from('settings').upsert({ tenant_id: tid, key: input.key, value: input.value, updated_at: new Date().toISOString() })
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ ok: true, key: input.key })
}

async function handleListServiceTypes(tid: string): Promise<string> {
  const { data, error } = await supabaseAdmin.from('service_types').select('*').eq('tenant_id', tid).order('name', { ascending: true })
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ count: (data || []).length, service_types: data || [] })
}

// ── Catalog — service_types is the one item list backing both the booking
// flow's service dropdown AND the quote/invoice catalog. Mirrors POST/PATCH/
// DELETE /api/catalog (src/app/api/catalog/route.ts) exactly — same table,
// same allowed fields, same ITEM_TYPES/PER_UNITS enums.
const CATALOG_ITEM_TYPES = ['service', 'project', 'product', 'equipment']
const CATALOG_PER_UNITS = ['hour', 'job', 'unit', 'sqft', 'linear_ft', 'visit', 'day', 'custom']

async function handleCreateCatalogItem(input: {
  name: string; description?: string; notes?: string; item_type?: string; per_unit?: string; unit_label?: string
  price_cents?: number; price_is_starting?: boolean; min_charge_cents?: number; cost_cents?: number; taxable?: boolean
  category?: string; sort_order?: number; active?: boolean
}, tid: string): Promise<string> {
  if (!input.name?.trim()) return JSON.stringify({ error: 'name is required' })
  const item_type = CATALOG_ITEM_TYPES.includes(input.item_type || '') ? input.item_type : 'service'
  const per_unit = CATALOG_PER_UNITS.includes(input.per_unit || '') ? input.per_unit : 'job'
  const { data, error } = await supabaseAdmin
    .from('service_types')
    .insert({
      tenant_id: tid,
      name: input.name.trim(),
      description: input.description || null,
      notes: input.notes || null,
      item_type,
      per_unit,
      unit_label: per_unit === 'custom' ? (input.unit_label || null) : null,
      price_cents: input.price_cents ?? 0,
      price_is_starting: input.price_is_starting === true,
      min_charge_cents: input.min_charge_cents ?? null,
      cost_cents: input.cost_cents ?? null,
      taxable: input.taxable !== false,
      category: input.category || null,
      sort_order: input.sort_order ?? 0,
      active: input.active !== false,
    })
    .select('id, name, item_type, per_unit, price_cents')
    .single()
  if (error || !data) return JSON.stringify({ error: error?.message || 'insert failed' })
  return JSON.stringify({ ok: true, item_id: data.id, name: data.name })
}

async function handleUpdateCatalogItem(input: { item_id: string; fields: Record<string, unknown> }, tid: string): Promise<string> {
  const allowed = ['name', 'description', 'notes', 'active', 'sort_order', 'price_cents', 'price_is_starting', 'min_charge_cents', 'cost_cents', 'taxable', 'category', 'item_type', 'per_unit', 'unit_label']
  const update: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input.fields || {})) {
    if (k === 'item_type' && !CATALOG_ITEM_TYPES.includes(v as string)) continue
    if (k === 'per_unit' && !CATALOG_PER_UNITS.includes(v as string)) continue
    if (allowed.includes(k)) update[k] = v
  }
  if (Object.keys(update).length === 0) return JSON.stringify({ error: 'no allowed fields to update' })
  const { error } = await supabaseAdmin.from('service_types').update(update).eq('id', input.item_id).eq('tenant_id', tid)
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ ok: true, item_id: input.item_id, updated_fields: Object.keys(update) })
}

async function handleDeleteCatalogItem(input: { item_id: string }, tid: string): Promise<string> {
  const { data, error } = await supabaseAdmin.from('service_types').delete().eq('id', input.item_id).eq('tenant_id', tid).select('id')
  if (error) return JSON.stringify({ error: error.message })
  if (!data || data.length === 0) return JSON.stringify({ error: 'not found' })
  return JSON.stringify({ ok: true, item_id: input.item_id })
}

// ── Jobs (field-service projects vertical) — mirrors GET/PATCH /api/jobs,
// /api/jobs/[id] (src/app/api/jobs/route.ts, jobs/[id]/route.ts). Jobs are
// created only via quotes/[id]/convert-to-job (see create_job_from_quote in
// the quotes section below) — there is no direct job-create endpoint.
async function handleListJobs(tid: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('jobs')
    .select('id, title, status, total_cents, created_at, ends_on, client_id, clients(name)')
    .eq('tenant_id', tid)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({
    count: (data || []).length,
    jobs: (data || []).map((j) => ({ id: j.id, title: j.title, status: j.status, total: `$${((j.total_cents || 0) / 100).toFixed(0)}`, client: (j.clients as unknown as { name?: string })?.name || null, created_at: j.created_at, ends_on: j.ends_on })),
  })
}

const JOB_VALID_STATUS = ['unscheduled', 'scheduled', 'in_progress', 'completed', 'cancelled']

async function handleUpdateJob(input: { job_id: string; fields: Record<string, unknown> }, tid: string): Promise<string> {
  const allowed = ['status', 'title', 'notes', 'starts_on', 'ends_on']
  const update: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input.fields || {})) {
    if (k === 'status' && !JOB_VALID_STATUS.includes(v as string)) continue
    if (allowed.includes(k)) update[k] = v
  }
  if (Object.keys(update).length === 0) return JSON.stringify({ error: 'no allowed fields to update' })
  if (update.status === 'in_progress') update.started_at = new Date().toISOString()
  if (update.status === 'completed') update.completed_at = new Date().toISOString()
  const { data, error } = await supabaseAdmin.from('jobs').update(update).eq('id', input.job_id).eq('tenant_id', tid).select('id').maybeSingle()
  if (error) return JSON.stringify({ error: error.message })
  if (!data) return JSON.stringify({ error: 'job not found' })
  return JSON.stringify({ ok: true, job_id: input.job_id, updated_fields: Object.keys(update) })
}

// ── Job sub-resources — checklist, expenses, photos (metadata only — a chat
// tool cannot upload a file or return a PDF binary, so photo capture and the
// job-report PDF export are NOT exposed here), sessions, budget-variance,
// payments. Mirrors src/app/api/jobs/[id]/{checklist,expenses,photos,
// sessions,budget-variance,payments}/*.
async function handleListJobChecklist(input: { job_id: string }, tid: string): Promise<string> {
  const { data, error } = await supabaseAdmin.from('job_checklist_items').select('*').eq('job_id', input.job_id).eq('tenant_id', tid).order('sort_order')
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ count: (data || []).length, items: data || [] })
}

async function handleAddJobChecklistItem(input: { job_id: string; label: string }, tid: string): Promise<string> {
  const { data: job } = await supabaseAdmin.from('jobs').select('id').eq('id', input.job_id).eq('tenant_id', tid).single()
  if (!job) return JSON.stringify({ error: 'job not found' })
  const text = input.label?.trim()
  if (!text) return JSON.stringify({ error: 'label is required' })
  const { count } = await supabaseAdmin.from('job_checklist_items').select('id', { count: 'exact', head: true }).eq('job_id', input.job_id).eq('tenant_id', tid)
  const { data: item, error } = await supabaseAdmin.from('job_checklist_items').insert({ tenant_id: tid, job_id: input.job_id, label: text, sort_order: count ?? 0 }).select('*').single()
  if (error || !item) return JSON.stringify({ error: error?.message || 'insert failed' })
  return JSON.stringify({ ok: true, item })
}

async function handleUpdateJobChecklistItem(input: { job_id: string; item_id: string; done?: boolean; label?: string }, tid: string): Promise<string> {
  const patch: Record<string, unknown> = {}
  if (input.done !== undefined) { patch.done = input.done; patch.done_at = input.done ? new Date().toISOString() : null }
  if (input.label !== undefined) patch.label = input.label.trim()
  if (Object.keys(patch).length === 0) return JSON.stringify({ error: 'nothing to update' })
  const { data: item, error } = await supabaseAdmin.from('job_checklist_items').update(patch).eq('id', input.item_id).eq('job_id', input.job_id).eq('tenant_id', tid).select('*').maybeSingle()
  if (error) return JSON.stringify({ error: error.message })
  if (!item) return JSON.stringify({ error: 'checklist item not found' })
  return JSON.stringify({ ok: true, item })
}

async function handleDeleteJobChecklistItem(input: { job_id: string; item_id: string }, tid: string): Promise<string> {
  const { error } = await supabaseAdmin.from('job_checklist_items').delete().eq('id', input.item_id).eq('job_id', input.job_id).eq('tenant_id', tid)
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ ok: true, item_id: input.item_id })
}

async function handleListJobExpenses(input: { job_id: string }, tid: string): Promise<string> {
  const { data, error } = await supabaseAdmin.from('expenses').select('*, vendors(id, name), service_types(id, name), categories(id, name)').eq('tenant_id', tid).eq('job_id', input.job_id).order('date', { ascending: false })
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ count: (data || []).length, expenses: data || [] })
}

async function recomputeJobBudgetLineActual(tid: string, budgetLineItemId: string): Promise<void> {
  const { data: rows } = await supabaseAdmin.from('expenses').select('amount').eq('tenant_id', tid).eq('budget_line_item_id', budgetLineItemId)
  const total = (rows || []).reduce((sum, r) => sum + (r.amount || 0), 0)
  await supabaseAdmin.from('budget_line_items').update({ actual_cents: total }).eq('id', budgetLineItemId).eq('tenant_id', tid)
}

async function handleAddJobExpense(input: { job_id: string; category: string; amount_dollars: number; vendor_name?: string; vendor_id?: string; service_type_id?: string; budget_line_item_id?: string; description?: string; receipt_url?: string; date?: string }, tid: string): Promise<string> {
  const { data: job } = await supabaseAdmin.from('jobs').select('id').eq('id', input.job_id).eq('tenant_id', tid).single()
  if (!job) return JSON.stringify({ error: 'job not found' })
  if (!input.category?.trim()) return JSON.stringify({ error: 'category is required' })
  if (!input.amount_dollars || input.amount_dollars < 0) return JSON.stringify({ error: 'amount_dollars must be >= 0' })

  const entityId = await getDefaultEntityId(tid)
  let categoryId: string | null = null
  if (input.service_type_id) {
    const { data: catalogItem } = await supabaseAdmin.from('service_types').select('category_id').eq('tenant_id', tid).eq('id', input.service_type_id).maybeSingle()
    categoryId = catalogItem?.category_id || null
  }
  const { data, error } = await supabaseAdmin
    .from('expenses')
    .insert({ tenant_id: tid, job_id: input.job_id, entity_id: entityId, category: input.category, amount: Math.round(input.amount_dollars * 100), vendor_name: input.vendor_name || null, vendor_id: input.vendor_id || null, service_type_id: input.service_type_id || null, budget_line_item_id: input.budget_line_item_id || null, category_id: categoryId, description: input.description || null, receipt_url: input.receipt_url || null, date: input.date || new Date().toISOString().slice(0, 10) })
    .select()
    .single()
  if (error || !data) return JSON.stringify({ error: error?.message || 'insert failed' })
  if (data.budget_line_item_id) await recomputeJobBudgetLineActual(tid, data.budget_line_item_id)
  await audit({ tenantId: tid, action: 'expense.created', entityType: 'expense', entityId: data.id, details: { actor: 'agent', job_id: input.job_id, category: data.category, amount: data.amount } })
  const { logJobEvent } = await import('@/lib/jobs')
  await logJobEvent({ tenant_id: tid, job_id: input.job_id, event_type: 'expense_added', detail: { expense_id: data.id, category: data.category, amount_cents: data.amount, vendor_name: data.vendor_name } })
  return JSON.stringify({ ok: true, expense: data })
}

async function handleDeleteJobExpense(input: { job_id: string; expense_id: string }, tid: string): Promise<string> {
  const { data: existing } = await supabaseAdmin.from('expenses').select('id, category, amount, budget_line_item_id').eq('tenant_id', tid).eq('job_id', input.job_id).eq('id', input.expense_id).maybeSingle()
  if (!existing) return JSON.stringify({ error: 'expense not found' })
  const { error } = await supabaseAdmin.from('expenses').delete().eq('tenant_id', tid).eq('id', input.expense_id)
  if (error) return JSON.stringify({ error: error.message })
  if (existing.budget_line_item_id) await recomputeJobBudgetLineActual(tid, existing.budget_line_item_id)
  await audit({ tenantId: tid, action: 'expense.deleted', entityType: 'expense', entityId: input.expense_id, details: { actor: 'agent', job_id: input.job_id } })
  const { logJobEvent } = await import('@/lib/jobs')
  await logJobEvent({ tenant_id: tid, job_id: input.job_id, event_type: 'expense_removed', detail: { expense_id: input.expense_id, category: existing.category, amount_cents: existing.amount } })
  return JSON.stringify({ ok: true, expense_id: input.expense_id })
}

async function handleListJobPhotos(input: { job_id: string }, tid: string): Promise<string> {
  const { data, error } = await supabaseAdmin.from('job_photos').select('*').eq('job_id', input.job_id).eq('tenant_id', tid).order('taken_at', { ascending: false })
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ count: (data || []).length, photos: data || [] })
}

async function handleUpdateJobPhoto(input: { job_id: string; photo_id: string; tags?: string[]; pair_id?: string | null; caption?: string }, tid: string): Promise<string> {
  const patch: Record<string, unknown> = {}
  if (Array.isArray(input.tags)) patch.tags = input.tags.map(t => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 20)
  if (input.pair_id !== undefined) patch.pair_id = input.pair_id
  if (input.caption !== undefined) patch.caption = input.caption.trim() || null
  if (Object.keys(patch).length === 0) return JSON.stringify({ error: 'nothing to update' })
  const { data: photo, error } = await supabaseAdmin.from('job_photos').update(patch).eq('id', input.photo_id).eq('job_id', input.job_id).eq('tenant_id', tid).select('*').maybeSingle()
  if (error) return JSON.stringify({ error: error.message })
  if (!photo) return JSON.stringify({ error: 'photo not found' })
  if (input.pair_id) await supabaseAdmin.from('job_photos').update({ pair_id: input.photo_id }).eq('id', input.pair_id).eq('tenant_id', tid)
  return JSON.stringify({ ok: true, photo })
}

async function assertJobPhotoInTenant(tid: string, jobId: string, photoId: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from('job_photos').select('id').eq('id', photoId).eq('job_id', jobId).eq('tenant_id', tid).maybeSingle()
  return !!data
}

async function handleListJobPhotoComments(input: { job_id: string; photo_id: string }, tid: string): Promise<string> {
  if (!(await assertJobPhotoInTenant(tid, input.job_id, input.photo_id))) return JSON.stringify({ error: 'photo not found' })
  const { data, error } = await supabaseAdmin.from('crm_notes').select('*').eq('subject_type', 'job_photo').eq('subject_id', input.photo_id).order('created_at', { ascending: true })
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ count: (data || []).length, comments: data || [] })
}

async function handleAddJobPhotoComment(input: { job_id: string; photo_id: string; body: string; author?: string }, tid: string): Promise<string> {
  if (!(await assertJobPhotoInTenant(tid, input.job_id, input.photo_id))) return JSON.stringify({ error: 'photo not found' })
  const text = input.body?.trim()
  if (!text) return JSON.stringify({ error: 'body is required' })
  const { data: comment, error } = await supabaseAdmin.from('crm_notes').insert({ subject_type: 'job_photo', subject_id: input.photo_id, body: text, author: input.author?.trim() || 'agent' }).select('*').single()
  if (error || !comment) return JSON.stringify({ error: error?.message || 'insert failed' })
  return JSON.stringify({ ok: true, comment })
}

async function resolveSessionAssignees(tid: string, input: { crew_id?: string | null; assignee_ids?: string[] | null; team_member_id?: string | null }): Promise<{ assigneeList: string[]; crewId: string | null; leadId: string | null }> {
  const assignees = new Set<string>()
  let crewId: string | null = null
  if (input.crew_id) {
    const { data: crew } = await supabaseAdmin.from('crews').select('id, crew_members(team_member_id)').eq('id', input.crew_id).eq('tenant_id', tid).maybeSingle()
    if (crew) { crewId = crew.id; for (const m of (crew.crew_members || []) as { team_member_id: string }[]) assignees.add(m.team_member_id) }
  }
  const explicit = [...(Array.isArray(input.assignee_ids) ? input.assignee_ids : []), ...(input.team_member_id ? [input.team_member_id] : [])]
  if (explicit.length) {
    const { data: valid } = await supabaseAdmin.from('team_members').select('id').eq('tenant_id', tid).in('id', explicit)
    for (const m of valid || []) assignees.add(m.id)
  }
  const assigneeList = [...assignees]
  const leadId = input.team_member_id && assignees.has(input.team_member_id) ? input.team_member_id : (assigneeList[0] ?? null)
  return { assigneeList, crewId, leadId }
}

async function handleCreateJobSession(input: { job_id: string; start_time: string; end_time?: string; duration_hours?: number; team_member_id?: string; assignee_ids?: string[]; crew_id?: string; service_type?: string; notes?: string; price_cents?: number }, tid: string): Promise<string> {
  if (!input.start_time) return JSON.stringify({ error: 'start_time is required' })
  const { data: job } = await supabaseAdmin.from('jobs').select('id, client_id, title').eq('id', input.job_id).eq('tenant_id', tid).single()
  if (!job) return JSON.stringify({ error: 'job not found' })

  const start = new Date(input.start_time)
  const durMs = input.duration_hours && input.duration_hours > 0 ? input.duration_hours * 3_600_000 : null
  const end = input.end_time ? new Date(input.end_time) : new Date(start.getTime() + (durMs ?? 2 * 3_600_000))
  const { assigneeList, crewId, leadId } = await resolveSessionAssignees(tid, input)

  const { data: booking, error } = await supabaseAdmin
    .from('bookings')
    .insert({ tenant_id: tid, client_id: job.client_id, job_id: input.job_id, team_member_id: leadId, crew_id: crewId, service_type: (input.service_type?.trim()) || job.title || 'Job session', start_time: start.toISOString(), end_time: end.toISOString(), status: 'confirmed', notes: input.notes || 'Job session', source: 'admin', ...(input.price_cents != null ? { price: Math.max(0, Math.round(input.price_cents)) } : {}) })
    .select('id, start_time, end_time, status, team_member_id, crew_id, service_type')
    .single()
  if (error || !booking) return JSON.stringify({ error: error?.message || 'insert failed' })
  if (assigneeList.length) await supabaseAdmin.from('booking_assignees').insert(assigneeList.map((mid) => ({ booking_id: booking.id, team_member_id: mid })))
  const { logJobEvent } = await import('@/lib/jobs')
  await logJobEvent({ tenant_id: tid, job_id: input.job_id, event_type: 'scheduled', detail: { booking_id: booking.id, start_time: input.start_time, assignees: assigneeList.length, crew_id: crewId } })
  return JSON.stringify({ ok: true, session: booking, assignees: assigneeList })
}

const JOB_SESSION_STATUS = ['confirmed', 'in_progress', 'completed', 'cancelled', 'pending']

async function handleUpdateJobSession(input: { job_id: string; session_id: string; start_time?: string; end_time?: string; duration_hours?: number; team_member_id?: string; assignee_ids?: string[]; crew_id?: string; service_type?: string; notes?: string; status?: string }, tid: string): Promise<string> {
  const { data: current } = await supabaseAdmin.from('bookings').select('id, job_id, tenant_id, start_time, end_time, status').eq('id', input.session_id).eq('tenant_id', tid).maybeSingle()
  if (!current || current.job_id !== input.job_id) return JSON.stringify({ error: 'session not found' })

  const patch: Record<string, unknown> = {}
  let didReschedule = false, didReassign = false, didComplete = false
  if (input.start_time !== undefined || input.end_time !== undefined || input.duration_hours !== undefined) {
    const prevStart = current.start_time ? new Date(current.start_time) : null
    const prevEnd = current.end_time ? new Date(current.end_time) : null
    const prevDurMs = prevStart && prevEnd ? prevEnd.getTime() - prevStart.getTime() : 2 * 3_600_000
    const start = input.start_time ? new Date(input.start_time) : prevStart
    if (!start || Number.isNaN(start.getTime())) return JSON.stringify({ error: 'invalid start_time' })
    const durMs = input.duration_hours && input.duration_hours > 0 ? input.duration_hours * 3_600_000 : null
    const end = input.end_time ? new Date(input.end_time) : new Date(start.getTime() + (durMs ?? prevDurMs))
    patch.start_time = start.toISOString(); patch.end_time = end.toISOString(); didReschedule = true
  }
  let assigneeList: string[] = []
  if (input.assignee_ids !== undefined || input.crew_id !== undefined || input.team_member_id !== undefined) {
    const resolved = await resolveSessionAssignees(tid, input)
    assigneeList = resolved.assigneeList
    patch.crew_id = resolved.crewId; patch.team_member_id = resolved.leadId; didReassign = true
  }
  if (typeof input.service_type === 'string' && input.service_type.trim()) patch.service_type = input.service_type.trim()
  if (input.notes !== undefined) patch.notes = input.notes
  if (input.status !== undefined) {
    if (!JOB_SESSION_STATUS.includes(input.status)) return JSON.stringify({ error: `invalid status: ${input.status}` })
    patch.status = input.status
    didComplete = input.status === 'completed' && current.status !== 'completed'
  }
  if (Object.keys(patch).length === 0) return JSON.stringify({ error: 'nothing to update' })

  const { error: uErr } = await supabaseAdmin.from('bookings').update(patch).eq('id', input.session_id).eq('tenant_id', tid)
  if (uErr) return JSON.stringify({ error: uErr.message })
  if (didReassign) {
    await supabaseAdmin.from('booking_assignees').delete().eq('booking_id', input.session_id)
    if (assigneeList.length) await supabaseAdmin.from('booking_assignees').insert(assigneeList.map((mid) => ({ booking_id: input.session_id, team_member_id: mid })))
  }
  const { logJobEvent, releasePaymentsForEvent, shapeSession } = await import('@/lib/jobs')
  if (didReschedule) await logJobEvent({ tenant_id: tid, job_id: input.job_id, event_type: 'session_rescheduled', detail: { booking_id: input.session_id, start_time: patch.start_time } })
  if (didReassign) await logJobEvent({ tenant_id: tid, job_id: input.job_id, event_type: 'session_reassigned', detail: { booking_id: input.session_id, assignees: assigneeList.length, crew_id: patch.crew_id ?? null } })
  if (didComplete) { await logJobEvent({ tenant_id: tid, job_id: input.job_id, event_type: 'session_completed', detail: { booking_id: input.session_id } }); await releasePaymentsForEvent(tid, input.job_id, 'session_completed') }

  const { data: shaped } = await supabaseAdmin.from('bookings').select('id, start_time, end_time, status, notes, service_type, team_member_id, crew_id, booking_assignees(team_member_id, team_members(name)), crew:crews(name, color)').eq('id', input.session_id).single()
  return JSON.stringify({ ok: true, session: shaped ? shapeSession(shaped as never) : null })
}

async function handleDeleteJobSession(input: { job_id: string; session_id: string }, tid: string): Promise<string> {
  const { data: current } = await supabaseAdmin.from('bookings').select('id, job_id').eq('id', input.session_id).eq('tenant_id', tid).maybeSingle()
  if (!current || current.job_id !== input.job_id) return JSON.stringify({ error: 'session not found' })
  const { error } = await supabaseAdmin.from('bookings').delete().eq('id', input.session_id).eq('tenant_id', tid)
  if (error) return JSON.stringify({ error: error.message })
  const { logJobEvent } = await import('@/lib/jobs')
  await logJobEvent({ tenant_id: tid, job_id: input.job_id, event_type: 'session_removed', detail: { booking_id: input.session_id } })
  return JSON.stringify({ ok: true, session_id: input.session_id })
}

async function handleGetJobBudgetVariance(input: { job_id: string }, tid: string): Promise<string> {
  const { data: job, error: jobErr } = await supabaseAdmin.from('jobs').select('id, quote_id, total_cents').eq('tenant_id', tid).eq('id', input.job_id).single()
  if (jobErr || !job) return JSON.stringify({ error: 'job not found' })
  if (!job.quote_id) return JSON.stringify({ job_id: job.id, quote_id: null, contract_total_cents: job.total_cents, budget: null, variance: null })
  const { data: budget } = await supabaseAdmin.from('quote_budgets').select('id, target_margin_bps, notes').eq('tenant_id', tid).eq('quote_id', job.quote_id).maybeSingle()
  let lineItems: { budgeted_cents: number; actual_cents: number }[] = []
  if (budget) {
    const { data } = await supabaseAdmin.from('budget_line_items').select('id, category_id, label, kind, budgeted_cents, actual_cents, sort_order').eq('quote_budget_id', budget.id).order('sort_order', { ascending: true })
    lineItems = data || []
  }
  const { computeBudgetVariance } = await import('@/lib/budget-template')
  const variance = budget ? computeBudgetVariance(lineItems, job.total_cents) : null
  return JSON.stringify({ job_id: job.id, quote_id: job.quote_id, contract_total_cents: job.total_cents, budget: budget ? { ...budget, line_items: lineItems } : null, variance })
}

async function handleUpdateJobPayment(input: { job_id: string; payment_id: string; status: string }, tid: string): Promise<string> {
  const JOB_PAYMENT_STATUSES = ['pending', 'invoiced', 'paid', 'void']
  if (!input.payment_id || !JOB_PAYMENT_STATUSES.includes(input.status)) return JSON.stringify({ error: 'payment_id and a valid status are required' })
  const patch: Record<string, unknown> = { status: input.status }
  if (input.status === 'paid') patch.paid_at = new Date().toISOString()
  const { data: payment, error } = await supabaseAdmin.from('job_payments').update(patch).eq('job_id', input.job_id).eq('id', input.payment_id).eq('tenant_id', tid).select('id, label, amount_cents, status, paid_at').maybeSingle()
  if (error) return JSON.stringify({ error: error.message })
  if (!payment) return JSON.stringify({ error: 'payment not found' })
  const { logJobEvent } = await import('@/lib/jobs')
  await logJobEvent({ tenant_id: tid, job_id: input.job_id, event_type: input.status === 'paid' ? 'payment_paid' : 'payment_invoiced', detail: { payment_id: input.payment_id, label: payment.label, amount_cents: payment.amount_cents } })
  return JSON.stringify({ ok: true, payment })
}

// ── Crews — mirrors GET/POST/PATCH/DELETE /api/crews. crew_members has no
// tenant_id column (join table), so its writes are scoped only by crew_id —
// always re-verify the crew belongs to tid first, same as the route does.
async function handleListCrews(tid: string): Promise<string> {
  const { data, error } = await supabaseAdmin.from('crews').select('id, name, color, active, crew_members(team_member_id, team_members(id, name))').eq('tenant_id', tid).order('name', { ascending: true })
  if (error) return JSON.stringify({ error: error.message })
  type MemberRow = { team_member_id: string; team_members: { name: string | null } | { name: string | null }[] | null }
  const shaped = (data || []).map((c) => ({
    id: c.id, name: c.name, color: c.color, active: c.active,
    members: ((c.crew_members || []) as MemberRow[]).map((m) => {
      const tm = Array.isArray(m.team_members) ? m.team_members[0] : m.team_members
      return { id: m.team_member_id, name: tm?.name || '—' }
    }),
  }))
  return JSON.stringify({ count: shaped.length, crews: shaped })
}

async function setCrewMembers(tid: string, crewId: string, memberIds: string[]): Promise<void> {
  const { data: owned } = await supabaseAdmin.from('crews').select('id').eq('id', crewId).eq('tenant_id', tid).maybeSingle()
  if (!owned) return
  await supabaseAdmin.from('crew_members').delete().eq('crew_id', crewId)
  if (memberIds.length === 0) return
  const { data: valid } = await supabaseAdmin.from('team_members').select('id').eq('tenant_id', tid).in('id', memberIds)
  const rows = (valid || []).map((m) => ({ crew_id: crewId, team_member_id: m.id }))
  if (rows.length) await supabaseAdmin.from('crew_members').insert(rows)
}

async function handleCreateCrew(input: { name: string; color?: string; member_ids?: string[] }, tid: string): Promise<string> {
  if (!input.name?.trim()) return JSON.stringify({ error: 'name is required' })
  const { data, error } = await supabaseAdmin.from('crews').insert({ tenant_id: tid, name: input.name.trim(), color: input.color || null }).select('id').single()
  if (error || !data) return JSON.stringify({ error: error?.message || 'insert failed' })
  if (Array.isArray(input.member_ids)) await setCrewMembers(tid, data.id, input.member_ids)
  return JSON.stringify({ ok: true, crew_id: data.id })
}

async function handleUpdateCrew(input: { crew_id: string; fields?: Record<string, unknown>; member_ids?: string[] }, tid: string): Promise<string> {
  const { data: owned } = await supabaseAdmin.from('crews').select('id').eq('id', input.crew_id).eq('tenant_id', tid).maybeSingle()
  if (!owned) return JSON.stringify({ error: 'crew not found' })
  const allowed = ['name', 'color', 'active']
  const update: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input.fields || {})) if (allowed.includes(k)) update[k] = v
  if (Object.keys(update).length > 0) await supabaseAdmin.from('crews').update(update).eq('id', input.crew_id)
  if (Array.isArray(input.member_ids)) await setCrewMembers(tid, input.crew_id, input.member_ids)
  return JSON.stringify({ ok: true, crew_id: input.crew_id })
}

async function handleDeleteCrew(input: { crew_id: string }, tid: string): Promise<string> {
  const { data, error } = await supabaseAdmin.from('crews').delete().eq('id', input.crew_id).eq('tenant_id', tid).select('id')
  if (error) return JSON.stringify({ error: error.message })
  if (!data || data.length === 0) return JSON.stringify({ error: 'crew not found' })
  return JSON.stringify({ ok: true, crew_id: input.crew_id })
}

// ── Equipment — mirrors GET/POST/PATCH/DELETE /api/equipment. Acquisition
// ledger posting (postEquipmentAcquisition) is dashboard-UI-triggered finance
// automation, deliberately NOT re-fired here — a chat-created/edited
// equipment row still needs the finance team's normal capitalization flow to
// notice it (same posture as create_manual_booking not auto-charging cards).
const EQUIPMENT_COLUMNS = 'id, service_type_id, category_id, name, asset_tag, acquisition_cost_cents, acquisition_date, useful_life_months, salvage_value_cents, depreciation_method, accumulated_depreciation_cents, status, notes, active, created_at'

async function handleListEquipment(tid: string): Promise<string> {
  const { data, error } = await supabaseAdmin.from('equipment').select(EQUIPMENT_COLUMNS).eq('tenant_id', tid).order('name', { ascending: true })
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ count: (data || []).length, equipment: data || [] })
}

async function handleCreateEquipment(input: { name: string; asset_tag?: string; acquisition_cost_cents?: number; acquisition_date?: string; useful_life_months?: number; salvage_value_cents?: number; status?: string; notes?: string }, tid: string): Promise<string> {
  if (!input.name?.trim()) return JSON.stringify({ error: 'name is required' })
  const { data, error } = await supabaseAdmin
    .from('equipment')
    .insert({
      tenant_id: tid, name: input.name.trim(), asset_tag: input.asset_tag || null,
      acquisition_cost_cents: input.acquisition_cost_cents || 0, acquisition_date: input.acquisition_date || null,
      useful_life_months: input.useful_life_months ?? null, salvage_value_cents: input.salvage_value_cents || 0,
      status: input.status || 'available', notes: input.notes || null,
    })
    .select(EQUIPMENT_COLUMNS)
    .single()
  if (error || !data) return JSON.stringify({ error: error?.message || 'insert failed' })
  return JSON.stringify({ ok: true, equipment_id: data.id, name: data.name })
}

async function handleUpdateEquipment(input: { equipment_id: string; fields: Record<string, unknown> }, tid: string): Promise<string> {
  const allowed = ['name', 'service_type_id', 'category_id', 'asset_tag', 'acquisition_cost_cents', 'acquisition_date', 'useful_life_months', 'salvage_value_cents', 'status', 'notes', 'active']
  const update: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input.fields || {})) if (allowed.includes(k)) update[k] = v
  if (Object.keys(update).length === 0) return JSON.stringify({ error: 'no allowed fields to update' })
  const { data, error } = await supabaseAdmin.from('equipment').update(update).eq('id', input.equipment_id).eq('tenant_id', tid).select('id').maybeSingle()
  if (error) return JSON.stringify({ error: error.message })
  if (!data) return JSON.stringify({ error: 'equipment not found' })
  return JSON.stringify({ ok: true, equipment_id: input.equipment_id, updated_fields: Object.keys(update) })
}

async function handleDeleteEquipment(input: { equipment_id: string }, tid: string): Promise<string> {
  const { data, error } = await supabaseAdmin.from('equipment').delete().eq('id', input.equipment_id).eq('tenant_id', tid).select('id')
  if (error) return JSON.stringify({ error: error.message })
  if (!data || data.length === 0) return JSON.stringify({ error: 'equipment not found' })
  return JSON.stringify({ ok: true, equipment_id: input.equipment_id })
}

// ── Inventory — mirrors GET/POST/PATCH/DELETE /api/inventory.
const INVENTORY_COLUMNS = 'id, name, sku, category, category_id, unit_label, quantity_on_hand, unit_cost_cents, reorder_threshold, notes, active, created_at'

async function handleListInventory(tid: string): Promise<string> {
  const { data, error } = await supabaseAdmin.from('inventory_items').select(INVENTORY_COLUMNS).eq('tenant_id', tid).order('name', { ascending: true })
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ count: (data || []).length, items: data || [] })
}

async function handleCreateInventoryItem(input: { name: string; sku?: string; category?: string; unit_label?: string; quantity_on_hand?: number; unit_cost_cents?: number; reorder_threshold?: number; notes?: string }, tid: string): Promise<string> {
  if (!input.name?.trim()) return JSON.stringify({ error: 'name is required' })
  const { data, error } = await supabaseAdmin
    .from('inventory_items')
    .insert({
      tenant_id: tid, name: input.name.trim(), sku: input.sku || null, category: input.category || null,
      unit_label: input.unit_label || 'unit', quantity_on_hand: input.quantity_on_hand || 0,
      unit_cost_cents: input.unit_cost_cents || 0, reorder_threshold: input.reorder_threshold ?? null, notes: input.notes || null,
    })
    .select(INVENTORY_COLUMNS)
    .single()
  if (error || !data) return JSON.stringify({ error: error?.message || 'insert failed' })
  return JSON.stringify({ ok: true, item_id: data.id, name: data.name })
}

async function handleUpdateInventoryItem(input: { item_id: string; fields: Record<string, unknown> }, tid: string): Promise<string> {
  const allowed = ['name', 'sku', 'category', 'category_id', 'unit_label', 'quantity_on_hand', 'unit_cost_cents', 'reorder_threshold', 'notes', 'active']
  const update: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input.fields || {})) if (allowed.includes(k)) update[k] = v
  if (Object.keys(update).length === 0) return JSON.stringify({ error: 'no allowed fields to update' })
  const { data, error } = await supabaseAdmin.from('inventory_items').update(update).eq('id', input.item_id).eq('tenant_id', tid).select('id').maybeSingle()
  if (error) return JSON.stringify({ error: error.message })
  if (!data) return JSON.stringify({ error: 'inventory item not found' })
  return JSON.stringify({ ok: true, item_id: input.item_id, updated_fields: Object.keys(update) })
}

async function handleDeleteInventoryItem(input: { item_id: string }, tid: string): Promise<string> {
  const { data, error } = await supabaseAdmin.from('inventory_items').delete().eq('id', input.item_id).eq('tenant_id', tid).select('id')
  if (error) return JSON.stringify({ error: error.message })
  if (!data || data.length === 0) return JSON.stringify({ error: 'inventory item not found' })
  return JSON.stringify({ ok: true, item_id: input.item_id })
}

// ── Vendors — mirrors GET/POST/PATCH/DELETE /api/vendors.
const VENDOR_COLUMNS = 'id, name, phone, email, category, address, notes, active, created_at'

async function handleListVendors(tid: string): Promise<string> {
  const { data, error } = await supabaseAdmin.from('vendors').select(VENDOR_COLUMNS).eq('tenant_id', tid).order('name', { ascending: true })
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ count: (data || []).length, vendors: data || [] })
}

async function handleCreateVendor(input: { name: string; phone?: string; email?: string; category?: string; address?: string; notes?: string }, tid: string): Promise<string> {
  if (!input.name?.trim()) return JSON.stringify({ error: 'name is required' })
  const { data, error } = await supabaseAdmin
    .from('vendors')
    .insert({ tenant_id: tid, name: input.name.trim(), phone: input.phone || null, email: input.email || null, category: input.category || null, address: input.address || null, notes: input.notes || null })
    .select(VENDOR_COLUMNS)
    .single()
  if (error || !data) return JSON.stringify({ error: error?.message || 'insert failed' })
  return JSON.stringify({ ok: true, vendor_id: data.id, name: data.name })
}

async function handleUpdateVendor(input: { vendor_id: string; fields: Record<string, unknown> }, tid: string): Promise<string> {
  const allowed = ['name', 'phone', 'email', 'category', 'address', 'notes', 'active']
  const update: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input.fields || {})) if (allowed.includes(k)) update[k] = v
  if (Object.keys(update).length === 0) return JSON.stringify({ error: 'no allowed fields to update' })
  const { data, error } = await supabaseAdmin.from('vendors').update(update).eq('id', input.vendor_id).eq('tenant_id', tid).select('id').maybeSingle()
  if (error) return JSON.stringify({ error: error.message })
  if (!data) return JSON.stringify({ error: 'vendor not found' })
  return JSON.stringify({ ok: true, vendor_id: input.vendor_id, updated_fields: Object.keys(update) })
}

async function handleDeleteVendor(input: { vendor_id: string }, tid: string): Promise<string> {
  const { data, error } = await supabaseAdmin.from('vendors').delete().eq('id', input.vendor_id).eq('tenant_id', tid).select('id')
  if (error) return JSON.stringify({ error: error.message })
  if (!data || data.length === 0) return JSON.stringify({ error: 'vendor not found' })
  return JSON.stringify({ ok: true, vendor_id: input.vendor_id })
}

// ── Quotes — mirrors GET/POST /api/quotes, PATCH/DELETE /api/quotes/[id].
// Reuses the SAME line-item normalization / totals math / number generation
// the dashboard quote builder uses (lib/quote.ts) rather than recomputing —
// two independent dollar-math implementations drifting apart is exactly how
// a quote total silently stops matching what the client sees.
type QuoteLineItemInput = { id?: string; name?: string; description?: string; quantity?: number; unit_price_cents?: number; optional?: boolean; selected?: boolean }

async function handleListQuotes(input: { status?: string; client_id?: string; deal_id?: string; limit?: number }, tid: string): Promise<string> {
  let q = supabaseAdmin.from('quotes').select('id, quote_number, status, title, client_id, clients(name), total_cents, valid_until, created_at').eq('tenant_id', tid).order('created_at', { ascending: false }).limit(Math.min(input.limit || 100, 500))
  if (input.status) q = q.eq('status', input.status)
  if (input.client_id) q = q.eq('client_id', input.client_id)
  if (input.deal_id) q = q.eq('deal_id', input.deal_id)
  const { data, error } = await q
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ count: (data || []).length, quotes: (data || []).map(r => ({ ...r, client_name: (r.clients as unknown as { name?: string })?.name || null, total: `$${((r.total_cents || 0) / 100).toFixed(0)}` })) })
}

async function handleCreateQuote(input: {
  client_id?: string; deal_id?: string; title?: string; description?: string
  contact_name?: string; contact_email?: string; contact_phone?: string; service_address?: string
  line_items?: QuoteLineItemInput[]; tax_rate_bps?: number; discount_cents?: number
  terms?: string; notes?: string; valid_until?: string
}, tid: string): Promise<string> {
  if (input.client_id && !(await idInTenant('clients', input.client_id, tid))) return JSON.stringify({ error: 'client not found' })
  if (input.deal_id && !(await idInTenant('deals', input.deal_id, tid))) return JSON.stringify({ error: 'deal not found' })
  const lineItems = normalizeLineItems((input.line_items || []) as never[])
  const tax_rate_bps = Number(input.tax_rate_bps) || 0
  const discount_cents = Number(input.discount_cents) || 0
  const totals = computeTotals(lineItems, tax_rate_bps, discount_cents)

  let data: { id: string; quote_number: string; total_cents: number; deal_id: string | null } | null = null
  let lastError: { message: string; code?: string } | null = null
  for (let attempt = 0; attempt < 5; attempt++) {
    const quote_number = await generateQuoteNumber(tid)
    const result = await supabaseAdmin
      .from('quotes')
      .insert({
        tenant_id: tid, client_id: input.client_id || null, deal_id: input.deal_id || null, quote_number, status: 'draft',
        title: input.title || null, description: input.description || null,
        contact_name: input.contact_name || null, contact_email: input.contact_email || null, contact_phone: input.contact_phone || null,
        service_address: input.service_address || null, line_items: lineItems,
        subtotal_cents: totals.subtotal_cents, tax_rate_bps, tax_cents: totals.tax_cents, discount_cents: totals.discount_cents, total_cents: totals.total_cents,
        terms: input.terms || null, notes: input.notes || null, valid_until: input.valid_until || null,
        deposit_type: 'none', deposit_value: 0, deposit_cents: 0,
        public_token: generatePublicToken(),
      })
      .select('id, quote_number, total_cents, deal_id')
      .single()
    if (!result.error) { data = result.data; break }
    lastError = result.error
    if (result.error.code !== '23505' || attempt === 4) return JSON.stringify({ error: result.error.message })
  }
  if (!data) return JSON.stringify({ error: lastError?.message || 'insert failed' })

  await logQuoteEvent({ quote_id: data.id, tenant_id: tid, event_type: 'created', detail: { quote_number: data.quote_number, total_cents: data.total_cents } })
  if (data.deal_id) {
    await supabaseAdmin.from('deal_activities').insert({ tenant_id: tid, deal_id: data.deal_id, type: 'note', description: `Proposal ${data.quote_number} created — $${(data.total_cents / 100).toFixed(0)}`, metadata: { quote_id: data.id, quote_number: data.quote_number, total_cents: data.total_cents } })
    await supabaseAdmin.from('deals').update({ value_cents: data.total_cents, last_activity_at: new Date().toISOString() }).eq('id', data.deal_id).eq('tenant_id', tid)
  }
  return JSON.stringify({ ok: true, quote_id: data.id, quote_number: data.quote_number, total: `$${(data.total_cents / 100).toFixed(0)}` })
}

const QUOTE_LOCKED_STATUSES = ['accepted', 'converted']

async function handleUpdateQuote(input: { quote_id: string; fields: Record<string, unknown> }, tid: string): Promise<string> {
  const { data: existing } = await supabaseAdmin.from('quotes').select('status, line_items, tax_rate_bps, discount_cents, total_cents').eq('id', input.quote_id).eq('tenant_id', tid).maybeSingle()
  if (!existing) return JSON.stringify({ error: 'quote not found' })
  if (QUOTE_LOCKED_STATUSES.includes(existing.status)) return JSON.stringify({ error: `cannot edit ${existing.status} quotes` })

  const fields = input.fields || {}
  const allowed = ['title', 'description', 'contact_name', 'contact_email', 'contact_phone', 'service_address', 'terms', 'notes', 'valid_until', 'client_id']
  const update: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(fields)) if (allowed.includes(k)) update[k] = v
  if (update.client_id && !(await idInTenant('clients', update.client_id as string, tid))) return JSON.stringify({ error: 'client not found' })

  if ('line_items' in fields || 'tax_rate_bps' in fields || 'discount_cents' in fields) {
    const lineItems = normalizeLineItems(('line_items' in fields ? fields.line_items : existing.line_items) as never[])
    const tax_rate_bps = 'tax_rate_bps' in fields ? Number(fields.tax_rate_bps) : Number(existing.tax_rate_bps) || 0
    const discount_cents = 'discount_cents' in fields ? Number(fields.discount_cents) : Number(existing.discount_cents) || 0
    const totals = computeTotals(lineItems, tax_rate_bps, discount_cents)
    Object.assign(update, { line_items: lineItems, tax_rate_bps, subtotal_cents: totals.subtotal_cents, tax_cents: totals.tax_cents, discount_cents: totals.discount_cents, total_cents: totals.total_cents })
  }
  if (Object.keys(update).length === 0) return JSON.stringify({ error: 'no allowed fields to update' })

  const { error } = await supabaseAdmin.from('quotes').update(update).eq('id', input.quote_id).eq('tenant_id', tid)
  if (error) return JSON.stringify({ error: error.message })
  await logQuoteEvent({ quote_id: input.quote_id, tenant_id: tid, event_type: 'edited', detail: { fields: Object.keys(update) } })
  return JSON.stringify({ ok: true, quote_id: input.quote_id, updated_fields: Object.keys(update) })
}

async function handleDeleteQuote(input: { quote_id: string }, tid: string): Promise<string> {
  const { data: existing } = await supabaseAdmin.from('quotes').select('status').eq('id', input.quote_id).eq('tenant_id', tid).maybeSingle()
  if (!existing) return JSON.stringify({ error: 'quote not found' })
  if (QUOTE_LOCKED_STATUSES.includes(existing.status)) return JSON.stringify({ error: `cannot delete ${existing.status} quotes` })
  const { error } = await supabaseAdmin.from('quotes').delete().eq('id', input.quote_id).eq('tenant_id', tid)
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ ok: true, quote_id: input.quote_id })
}

// Marks the quote sent + returns its public link. Deliberately does NOT
// re-implement the dashboard route's branded email/SMS composition (~150
// lines of shell/brand-template logic) — the model already has
// send_message_to_client for actually delivering the link.
async function handleSendQuote(input: { quote_id: string }, tid: string): Promise<string> {
  const { data: quote } = await supabaseAdmin.from('quotes').select('id, status, public_token, quote_number, client_id').eq('id', input.quote_id).eq('tenant_id', tid).maybeSingle()
  if (!quote) return JSON.stringify({ error: 'quote not found' })
  if (['accepted', 'declined', 'converted'].includes(quote.status)) return JSON.stringify({ error: `cannot re-send ${quote.status} quote` })
  const { data: tenantRow } = await supabaseAdmin.from('tenants').select('slug, domain').eq('id', tid).single()
  const base = tenantRow?.domain ? `https://${tenantRow.domain}` : `https://${tenantRow?.slug}.fullloopcrm.com`
  await supabaseAdmin.from('quotes').update({ status: 'sent' }).eq('id', input.quote_id).eq('tenant_id', tid)
  await logQuoteEvent({ quote_id: input.quote_id, tenant_id: tid, event_type: 'sent', detail: {} })
  return JSON.stringify({ ok: true, quote_id: input.quote_id, quote_number: quote.quote_number, client_id: quote.client_id, public_url: `${base}/quote/${quote.public_token}`, note: 'Status set to sent. Use send_message_to_client to actually deliver this link to the client.' })
}

async function handleCreateJobFromQuote(input: { quote_id: string }, tid: string): Promise<string> {
  try {
    const result = await convertSaleToJob(tid, { type: 'quote', quoteId: input.quote_id }, {})
    return JSON.stringify({ ok: true, ...result })
  } catch (err) {
    return JSON.stringify({ error: err instanceof Error ? err.message : 'conversion failed' })
  }
}

// ── Invoices — mirrors GET/POST /api/invoices, PATCH/DELETE(void) /api/
// invoices/[id], POST /api/invoices/[id]/record-payment.
async function handleListInvoices(input: { status?: string; client_id?: string; limit?: number }, tid: string): Promise<string> {
  let q = supabaseAdmin.from('invoices').select('id, invoice_number, status, title, client_id, clients(name), total_cents, amount_paid_cents, due_date, created_at').eq('tenant_id', tid).order('created_at', { ascending: false }).limit(Math.min(input.limit || 100, 500))
  if (input.status) q = q.eq('status', input.status)
  if (input.client_id) q = q.eq('client_id', input.client_id)
  const { data, error } = await q
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ count: (data || []).length, invoices: (data || []).map(r => ({ ...r, client_name: (r.clients as unknown as { name?: string })?.name || null, total: `$${((r.total_cents || 0) / 100).toFixed(0)}`, paid: `$${((r.amount_paid_cents || 0) / 100).toFixed(0)}` })) })
}

async function handleCreateInvoice(input: {
  client_id?: string; booking_id?: string; quote_id?: string; entity_id?: string
  title?: string; description?: string; contact_name?: string; contact_email?: string; contact_phone?: string; service_address?: string
  line_items?: QuoteLineItemInput[]; tax_rate_bps?: number; discount_cents?: number; terms?: string; notes?: string; due_date?: string; due_days?: number
}, tid: string): Promise<string> {
  if (input.client_id && !(await idInTenant('clients', input.client_id, tid))) return JSON.stringify({ error: 'client not found' })
  if (input.booking_id && !(await idInTenant('bookings', input.booking_id, tid))) return JSON.stringify({ error: 'booking not found' })
  if (input.quote_id && !(await idInTenant('quotes', input.quote_id, tid))) return JSON.stringify({ error: 'quote not found' })
  if (input.entity_id && !(await isEntityOwnedByTenant(tid, input.entity_id))) return JSON.stringify({ error: 'invalid entity_id' })
  const entityId = input.entity_id || (await getDefaultEntityId(tid))

  const lineItems = normalizeLineItems((input.line_items || []) as never[])
  const tax_rate_bps = Number(input.tax_rate_bps) || 0
  const discount_cents = Number(input.discount_cents) || 0
  const totals = computeTotals(lineItems, tax_rate_bps, discount_cents)
  const due_date = input.due_date || (input.due_days ? new Date(Date.now() + input.due_days * 86400000).toISOString().slice(0, 10) : null)

  let data: { id: string; invoice_number: string; total_cents: number } | null = null
  let lastError: { message: string; code?: string } | null = null
  for (let attempt = 0; attempt < 5; attempt++) {
    const invoice_number = await generateInvoiceNumber(tid)
    const result = await supabaseAdmin
      .from('invoices')
      .insert({
        tenant_id: tid, entity_id: entityId, client_id: input.client_id || null, booking_id: input.booking_id || null, quote_id: input.quote_id || null,
        invoice_number, status: 'draft', title: input.title || null, description: input.description || null,
        contact_name: input.contact_name || null, contact_email: input.contact_email || null, contact_phone: input.contact_phone || null, service_address: input.service_address || null,
        line_items: lineItems, subtotal_cents: totals.subtotal_cents, tax_rate_bps, tax_cents: totals.tax_cents, discount_cents: totals.discount_cents, total_cents: totals.total_cents,
        terms: input.terms || null, notes: input.notes || null, due_date, public_token: generateInvoicePublicToken(),
      })
      .select('id, invoice_number, total_cents')
      .single()
    if (!result.error) { data = result.data; break }
    lastError = result.error
    if (result.error.code !== '23505' || attempt === 4) return JSON.stringify({ error: result.error.message })
  }
  if (!data) return JSON.stringify({ error: lastError?.message || 'insert failed' })
  await logInvoiceEvent({ invoice_id: data.id, tenant_id: tid, event_type: 'created', detail: { invoice_number: data.invoice_number, total_cents: data.total_cents, from: input.booking_id ? 'booking' : input.quote_id ? 'quote' : 'standalone' } })
  return JSON.stringify({ ok: true, invoice_id: data.id, invoice_number: data.invoice_number, total: `$${(data.total_cents / 100).toFixed(0)}` })
}

const INVOICE_LOCKED_STATUSES = ['paid', 'partial', 'void', 'refunded']

async function handleUpdateInvoice(input: { invoice_id: string; fields: Record<string, unknown> }, tid: string): Promise<string> {
  const { data: existing } = await supabaseAdmin.from('invoices').select('status').eq('id', input.invoice_id).eq('tenant_id', tid).maybeSingle()
  if (!existing) return JSON.stringify({ error: 'invoice not found' })
  if (INVOICE_LOCKED_STATUSES.includes(existing.status)) return JSON.stringify({ error: `cannot edit ${existing.status} invoice` })
  const allowed = ['title', 'description', 'contact_name', 'contact_email', 'contact_phone', 'service_address', 'terms', 'notes', 'due_date', 'client_id']
  const update: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input.fields || {})) if (allowed.includes(k)) update[k] = v
  if (update.client_id && !(await idInTenant('clients', update.client_id as string, tid))) return JSON.stringify({ error: 'client not found' })
  if (Object.keys(update).length === 0) return JSON.stringify({ error: 'no allowed fields to update' })
  const { error } = await supabaseAdmin.from('invoices').update(update).eq('id', input.invoice_id).eq('tenant_id', tid)
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ ok: true, invoice_id: input.invoice_id, updated_fields: Object.keys(update) })
}

// Void, not hard-delete — mirrors DELETE /api/invoices/[id]'s soft path
// (the hard-delete path there is scoped to zero-payment drafts only, a
// narrower carve-out not worth duplicating here).
async function handleVoidInvoice(input: { invoice_id: string; reason?: string }, tid: string): Promise<string> {
  const { data: existing } = await supabaseAdmin.from('invoices').select('status, amount_paid_cents').eq('id', input.invoice_id).eq('tenant_id', tid).maybeSingle()
  if (!existing) return JSON.stringify({ error: 'invoice not found' })
  if (['void', 'refunded'].includes(existing.status)) return JSON.stringify({ error: `already ${existing.status}` })
  if ((existing.amount_paid_cents || 0) > 0) return JSON.stringify({ error: 'cannot void invoice with payments — refund first' })
  const { error } = await supabaseAdmin.from('invoices').update({ status: 'void', voided_at: new Date().toISOString(), void_reason: input.reason || null }).eq('id', input.invoice_id).eq('tenant_id', tid)
  if (error) return JSON.stringify({ error: error.message })
  await logInvoiceEvent({ invoice_id: input.invoice_id, tenant_id: tid, event_type: 'voided', detail: { reason: input.reason || null } })
  return JSON.stringify({ ok: true, invoice_id: input.invoice_id, status: 'void' })
}

async function handleSendInvoice(input: { invoice_id: string }, tid: string): Promise<string> {
  const { data: invoice } = await supabaseAdmin.from('invoices').select('id, status, public_token, invoice_number, client_id').eq('id', input.invoice_id).eq('tenant_id', tid).maybeSingle()
  if (!invoice) return JSON.stringify({ error: 'invoice not found' })
  if (INVOICE_LOCKED_STATUSES.includes(invoice.status)) return JSON.stringify({ error: `cannot send ${invoice.status} invoice` })
  const { data: tenantRow } = await supabaseAdmin.from('tenants').select('slug, domain').eq('id', tid).single()
  const base = tenantRow?.domain ? `https://${tenantRow.domain}` : `https://${tenantRow?.slug}.fullloopcrm.com`
  if (invoice.status === 'draft') await supabaseAdmin.from('invoices').update({ status: 'sent' }).eq('id', input.invoice_id).eq('tenant_id', tid)
  await logInvoiceEvent({ invoice_id: input.invoice_id, tenant_id: tid, event_type: 'sent', detail: {} })
  return JSON.stringify({ ok: true, invoice_id: input.invoice_id, invoice_number: invoice.invoice_number, client_id: invoice.client_id, public_url: `${base}/invoice/${invoice.public_token}`, note: 'Use send_message_to_client to actually deliver this link to the client.' })
}

const INVOICE_PAYMENT_METHODS = new Set(['zelle', 'venmo', 'cash', 'check', 'stripe', 'card', 'bank_transfer', 'other'])

async function handleRecordInvoicePayment(input: { invoice_id: string; amount_dollars: number; method?: string; reference_id?: string; sender_name?: string }, tid: string): Promise<string> {
  const amountCents = Math.round((input.amount_dollars || 0) * 100)
  if (!amountCents || amountCents <= 0) return JSON.stringify({ error: 'amount_dollars must be > 0' })
  const method = (input.method || 'other').toLowerCase()
  if (!INVOICE_PAYMENT_METHODS.has(method)) return JSON.stringify({ error: `invalid method: ${method}` })
  const { data: invoice } = await supabaseAdmin.from('invoices').select('id, client_id, booking_id, status').eq('id', input.invoice_id).eq('tenant_id', tid).maybeSingle()
  if (!invoice) return JSON.stringify({ error: 'invoice not found' })
  if (['void', 'refunded'].includes(invoice.status)) return JSON.stringify({ error: `cannot record payment on ${invoice.status} invoice` })

  const { data: payment, error: pErr } = await supabaseAdmin
    .from('payments')
    .insert({ tenant_id: tid, invoice_id: input.invoice_id, booking_id: invoice.booking_id, client_id: invoice.client_id, amount_cents: amountCents, tip_cents: 0, method, status: 'succeeded', reference_id: input.reference_id || null, sender_name: input.sender_name || null, payment_sender_name: input.sender_name || null, received_at: new Date().toISOString() })
    .select('id')
    .single()
  if (pErr) return JSON.stringify({ error: pErr.message })

  try {
    const { backfillUnpostedRevenue } = await import('@/lib/finance/post-revenue')
    await backfillUnpostedRevenue(tid)
  } catch (e) {
    console.error('[record_invoice_payment] revenue capture failed:', e)
  }

  const { data: updated } = await supabaseAdmin.from('invoices').select('status, amount_paid_cents, total_cents').eq('id', input.invoice_id).single()
  const isFullyPaid = updated?.status === 'paid'
  await logInvoiceEvent({ invoice_id: input.invoice_id, tenant_id: tid, event_type: isFullyPaid ? 'paid' : 'partial_payment', detail: { payment_id: payment.id, amount_cents: amountCents, method, reference_id: input.reference_id || null } })
  return JSON.stringify({ ok: true, payment_id: payment.id, invoice_status: updated?.status, amount_paid_cents: updated?.amount_paid_cents, balance_cents: (updated?.total_cents || 0) - (updated?.amount_paid_cents || 0) })
}

// ── Documents (e-signature) — list + void only. create_document and send-
// for-signature both require an actual PDF binary + placed signature fields
// (25MB file upload, SHA-256 integrity hash) that a chat tool has no way to
// produce — the model cannot author a PDF, so those two stay dashboard-UI-only.
async function handleListDocuments(input: { status?: string; limit?: number }, tid: string): Promise<string> {
  let q = supabaseAdmin.from('documents').select('id, title, status, sign_order, page_count, created_at, document_signers(id, name, email, role, status, order_index)').eq('tenant_id', tid).order('created_at', { ascending: false }).limit(Math.min(input.limit || 100, 500))
  if (input.status) q = q.eq('status', input.status)
  const { data, error } = await q
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ count: (data || []).length, documents: data || [] })
}

async function handleVoidDocument(input: { document_id: string; reason?: string }, tid: string): Promise<string> {
  const { data: doc } = await supabaseAdmin.from('documents').select('status').eq('id', input.document_id).eq('tenant_id', tid).maybeSingle()
  if (!doc) return JSON.stringify({ error: 'document not found' })
  if (isDocTerminalStatus(doc.status)) return JSON.stringify({ error: `already ${doc.status}` })
  const { error } = await supabaseAdmin.from('documents').update({ status: 'voided', voided_at: new Date().toISOString(), void_reason: input.reason || null }).eq('id', input.document_id).eq('tenant_id', tid)
  if (error) return JSON.stringify({ error: error.message })
  await logDocEvent({ document_id: input.document_id, tenant_id: tid, event_type: 'voided', detail: { reason: input.reason || null } })
  return JSON.stringify({ ok: true, document_id: input.document_id, status: 'voided' })
}

// ── Finance ledger — reports delegate to the SAME lib functions the
// dashboard's finance pages call (lib/finance/*), never recomputed here.
// Two independent implementations of double-entry math drifting apart is
// exactly how a bot ends up quoting a P&L number that doesn't match the books.
async function handleGetArAging(input: { entity_id?: string }, tid: string): Promise<string> {
  const { getArAging } = await import('@/lib/finance/ar-aging')
  return JSON.stringify(await getArAging(tid, input.entity_id || null))
}

async function handleGetBalanceSheet(input: { as_of?: string; entity_id?: string }, tid: string): Promise<string> {
  const { ledgerBalanceSheet } = await import('@/lib/finance/ledger-reports')
  const asOf = input.as_of || new Date().toISOString().slice(0, 10)
  return JSON.stringify(await ledgerBalanceSheet(tid, asOf, input.entity_id || null))
}

async function handleGetTrialBalance(input: { from?: string; to?: string; entity_id?: string }, tid: string): Promise<string> {
  const { ledgerTrialBalance } = await import('@/lib/finance/ledger-reports')
  const from = input.from || `${new Date().getUTCFullYear()}-01-01`
  const to = input.to || new Date().toISOString().slice(0, 10)
  return JSON.stringify(await ledgerTrialBalance(tid, from, to, input.entity_id || null))
}

async function handleGetPnl(input: { from?: string; to?: string; entity_id?: string }, tid: string): Promise<string> {
  const { ledgerProfitAndLoss } = await import('@/lib/finance/ledger-reports')
  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10)
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10)
  return JSON.stringify(await ledgerProfitAndLoss(tid, input.from || monthStart, input.to || monthEnd, input.entity_id || null))
}

function cashFlowWeekKey(d: Date): string {
  const monday = new Date(d)
  monday.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return monday.toISOString().slice(0, 10)
}
function cashFlowAdvance(d: Date, frequency: string): Date {
  const r = new Date(d)
  switch (frequency) {
    case 'daily': r.setUTCDate(r.getUTCDate() + 1); break
    case 'weekly': r.setUTCDate(r.getUTCDate() + 7); break
    case 'biweekly': r.setUTCDate(r.getUTCDate() + 14); break
    case 'monthly': r.setUTCMonth(r.getUTCMonth() + 1); break
    case 'quarterly': r.setUTCMonth(r.getUTCMonth() + 3); break
    case 'yearly': r.setUTCFullYear(r.getUTCFullYear() + 1); break
    default: r.setUTCDate(r.getUTCDate() + 30)
  }
  return r
}

// Ports GET /api/finance/cash-flow's forecast (no shared lib export exists
// for it — logic lives inline in the route) rather than HTTP-calling our own
// API from within a server tool.
async function handleGetCashFlowForecast(input: { weeks?: number; entity_id?: string }, tid: string): Promise<string> {
  const weeks = Math.min(12, Math.max(1, input.weeks || 4))
  const now = new Date()
  const endDate = new Date(now.getTime() + weeks * 7 * 86400000)
  const nowIso = now.toISOString().slice(0, 10)
  const endIso = endDate.toISOString().slice(0, 10)

  const { nowNaiveET } = await import('@/lib/recurring')
  let bookingsQ = supabaseAdmin.from('bookings').select('id, price, start_time, payment_status').eq('tenant_id', tid).gte('start_time', `${nowNaiveET()}Z`).lte('start_time', `${endIso}T23:59:59Z`).not('status', 'in', '(cancelled,no_show)')
  let invoicesQ = supabaseAdmin.from('invoices').select('id, total_cents, amount_paid_cents, due_date').eq('tenant_id', tid).not('status', 'in', '(paid,void,refunded,draft)').gte('due_date', nowIso).lte('due_date', endIso)
  let recurringQ = supabaseAdmin.from('recurring_expenses').select('id, label, amount_cents, frequency, next_due_date, start_date, active').eq('tenant_id', tid).eq('active', true)
  if (input.entity_id) { invoicesQ = invoicesQ.eq('entity_id', input.entity_id); recurringQ = recurringQ.eq('entity_id', input.entity_id) }

  const [{ data: upcomingBookings }, { data: openInvoices }, { data: recurring }] = await Promise.all([bookingsQ, invoicesQ, recurringQ])

  const buckets = new Map<string, { week_start: string; inflows_cents: number; outflows_cents: number; net_cents: number }>()
  for (let i = 0; i < weeks; i++) {
    const key = cashFlowWeekKey(new Date(now.getTime() + i * 7 * 86400000))
    buckets.set(key, { week_start: key, inflows_cents: 0, outflows_cents: 0, net_cents: 0 })
  }
  for (const b of upcomingBookings || []) {
    if (b.payment_status === 'paid') continue
    const price = Math.round(Number(b.price || 0))
    if (!price) continue
    const bucket = buckets.get(cashFlowWeekKey(new Date(b.start_time as string)))
    if (bucket) bucket.inflows_cents += price
  }
  for (const inv of openInvoices || []) {
    const balance = (inv.total_cents || 0) - (inv.amount_paid_cents || 0)
    if (balance <= 0 || !inv.due_date) continue
    const bucket = buckets.get(cashFlowWeekKey(new Date(inv.due_date as string)))
    if (bucket) bucket.inflows_cents += balance
  }
  for (const r of recurring || []) {
    const amount = Number(r.amount_cents) || 0
    if (!amount) continue
    const startDate = r.next_due_date ? new Date(r.next_due_date as string) : r.start_date ? new Date(r.start_date as string) : now
    let cursor = new Date(startDate)
    if (cursor < now) while (cursor < now) cursor = cashFlowAdvance(cursor, r.frequency as string)
    while (cursor <= endDate) {
      const bucket = buckets.get(cashFlowWeekKey(cursor))
      if (bucket) bucket.outflows_cents += amount
      cursor = cashFlowAdvance(cursor, r.frequency as string)
    }
  }
  const weeklyRows = Array.from(buckets.values()).map(b => ({ ...b, net_cents: b.inflows_cents - b.outflows_cents })).sort((a, b) => a.week_start.localeCompare(b.week_start))
  return JSON.stringify({ weeks: weeklyRows, totals: { inflows_cents: weeklyRows.reduce((a, w) => a + w.inflows_cents, 0), outflows_cents: weeklyRows.reduce((a, w) => a + w.outflows_cents, 0), net_cents: weeklyRows.reduce((a, w) => a + w.net_cents, 0) } })
}

async function handleGetChartOfAccounts(tid: string): Promise<string> {
  const { data, error } = await supabaseAdmin.from('chart_of_accounts').select('*').eq('tenant_id', tid).order('code', { ascending: true })
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ count: (data || []).length, accounts: data || [] })
}

async function handleCreateAccount(input: { code: string; name: string; type: string; subtype?: string; parent_id?: string; is_bank_account?: boolean }, tid: string): Promise<string> {
  if (!input.code || !input.name || !input.type) return JSON.stringify({ error: 'code, name, type required' })
  if (input.parent_id) {
    const { data: owned } = await supabaseAdmin.from('chart_of_accounts').select('id').eq('id', input.parent_id).eq('tenant_id', tid).maybeSingle()
    if (!owned) return JSON.stringify({ error: 'invalid parent_id' })
  }
  const { data, error } = await supabaseAdmin.from('chart_of_accounts').insert({ tenant_id: tid, code: input.code, name: input.name, type: input.type, subtype: input.subtype || null, parent_id: input.parent_id || null, is_bank_account: !!input.is_bank_account }).select('id, code, name').single()
  if (error || !data) return JSON.stringify({ error: error?.message || 'insert failed' })
  return JSON.stringify({ ok: true, account_id: data.id, code: data.code, name: data.name })
}

async function handleListExpenses(input: { entity_id?: string; limit?: number }, tid: string): Promise<string> {
  let q = supabaseAdmin.from('expenses').select('*').eq('tenant_id', tid).order('date', { ascending: false }).limit(Math.min(input.limit || 100, 500))
  if (input.entity_id) q = q.eq('entity_id', input.entity_id)
  const { data, error } = await q
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ count: (data || []).length, expenses: data || [] })
}

async function handleCreateExpense(input: { category: string; amount_dollars: number; description?: string; receipt_url?: string; date?: string; entity_id?: string }, tid: string): Promise<string> {
  if (!input.category?.trim()) return JSON.stringify({ error: 'category is required' })
  if (!input.amount_dollars || input.amount_dollars < 0) return JSON.stringify({ error: 'amount_dollars must be >= 0' })
  if (input.entity_id && !(await isEntityOwnedByTenant(tid, input.entity_id))) return JSON.stringify({ error: 'invalid entity_id' })
  const entityId = input.entity_id || (await getDefaultEntityId(tid))
  const { data, error } = await supabaseAdmin
    .from('expenses')
    .insert({ tenant_id: tid, entity_id: entityId, category: input.category.trim(), amount: Math.round(input.amount_dollars * 100), description: input.description || null, receipt_url: input.receipt_url || null, date: input.date || new Date().toISOString().split('T')[0] })
    .select('id')
    .single()
  if (error || !data) return JSON.stringify({ error: error?.message || 'insert failed' })
  await audit({ tenantId: tid, action: 'expense.created', entityType: 'expense', entityId: data.id, details: { actor: 'agent', category: input.category, amount: Math.round(input.amount_dollars * 100) } })
  return JSON.stringify({ ok: true, expense_id: data.id })
}

async function handleListRecurringExpenses(tid: string): Promise<string> {
  const { data, error } = await supabaseAdmin.from('recurring_expenses').select('*').eq('tenant_id', tid).eq('active', true).order('next_due_date', { ascending: true, nullsFirst: false })
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ count: (data || []).length, recurring_expenses: data || [] })
}

async function handleCreateRecurringExpense(input: { label: string; category?: string; amount_cents: number; frequency: string; start_date?: string; end_date?: string; notes?: string }, tid: string): Promise<string> {
  if (!input.label || !input.amount_cents || !input.frequency) return JSON.stringify({ error: 'label, amount_cents, frequency required' })
  const { data, error } = await supabaseAdmin
    .from('recurring_expenses')
    .insert({ tenant_id: tid, label: input.label, category: input.category || null, amount_cents: input.amount_cents, frequency: input.frequency, start_date: input.start_date || new Date().toISOString().slice(0, 10), end_date: input.end_date || null, next_due_date: input.start_date || new Date().toISOString().slice(0, 10), notes: input.notes || null, active: true })
    .select('id')
    .single()
  if (error || !data) return JSON.stringify({ error: error?.message || 'insert failed' })
  return JSON.stringify({ ok: true, recurring_expense_id: data.id })
}

async function handleGetPayrollSummary(tid: string): Promise<string> {
  const { data: team } = await supabaseAdmin.from('team_members').select('id, name, pay_rate, status').eq('tenant_id', tid).eq('status', 'active')
  const { data: bookings } = await supabaseAdmin.from('bookings').select('team_member_id, check_in_time, check_out_time, pay_rate').eq('tenant_id', tid).eq('status', 'completed').not('team_member_paid', 'is', true)
  const payroll = (team || []).map((member) => {
    const memberBookings = (bookings || []).filter((b) => b.team_member_id === member.id)
    let pendingHours = 0, pendingPay = 0
    for (const b of memberBookings) {
      if (b.check_in_time && b.check_out_time) {
        const hours = (new Date(b.check_out_time).getTime() - new Date(b.check_in_time).getTime()) / 3600000
        pendingHours += hours
        pendingPay += hours * (b.pay_rate || member.pay_rate || 0)
      }
    }
    return { id: member.id, name: member.name, pending_hours: Math.round(pendingHours * 100) / 100, pending_pay: Math.round(pendingPay * 100) / 100, jobs: memberBookings.length }
  })
  return JSON.stringify({ payroll })
}

// Records a payroll payment that already happened outside the system
// (Zelle/check/etc) — mirrors POST /api/finance/payroll exactly, including
// its double-submit guard and the ledger post. This does NOT move money —
// there is no Stripe/ACH transfer in this path, same posture as
// mark_payment_received/record_invoice_payment.
async function handleRecordPayrollPayment(input: { team_member_id: string; amount_dollars: number; method?: string; period_start?: string; period_end?: string }, tid: string): Promise<string> {
  const { data: member } = await supabaseAdmin.from('team_members').select('id, pay_rate').eq('id', input.team_member_id).eq('tenant_id', tid).single()
  if (!member) return JSON.stringify({ error: 'team member not found' })

  const { getPendingPayCentsForMember } = await import('@/lib/finance/payroll-pending')
  const pendingCentsBeforePayment = await getPendingPayCentsForMember(tid, input.team_member_id, member.pay_rate)
  const amountCents = Math.round((input.amount_dollars || 0) * 100)
  const coversFullAmountOwed = amountCents >= pendingCentsBeforePayment - 1

  if (input.period_start && input.period_end) {
    const { data: dupe } = await supabaseAdmin.from('payroll_payments').select().eq('tenant_id', tid).eq('team_member_id', input.team_member_id).eq('period_start', input.period_start).eq('period_end', input.period_end).maybeSingle()
    if (dupe) return JSON.stringify({ ok: true, payment: dupe, duplicate: true })
  }

  const { data, error } = await supabaseAdmin.from('payroll_payments').insert({ tenant_id: tid, team_member_id: input.team_member_id, amount: amountCents, method: input.method || null, period_start: input.period_start || null, period_end: input.period_end || null }).select().single()
  if (error) return JSON.stringify({ error: error.message })

  if (data?.id) {
    const { postPayrollToLedger } = await import('@/lib/finance/post-labor')
    await postPayrollToLedger({ tenantId: tid, payrollPaymentId: data.id }).catch(err => console.error('[record_payroll_payment] ledger post failed:', err))
  }
  if (coversFullAmountOwed) {
    await supabaseAdmin.from('bookings').update({ status: 'paid' }).eq('tenant_id', tid).eq('team_member_id', input.team_member_id).eq('status', 'completed')
  }
  return JSON.stringify({ ok: true, payment_id: data.id, bookings_marked_paid: coversFullAmountOwed })
}

// ── HR — mirrors GET /api/dashboard/hr (roster), GET/PATCH /api/dashboard/
// hr/[id] (profile), POST /api/dashboard/hr/[id]/notes. Document upload has
// the same "chat can't produce a file" limitation as the e-signature
// documents section above — not exposed here.
async function handleListEmployees(tid: string): Promise<string> {
  const { listEmployees } = await import('@/lib/hr')
  const employees = await listEmployees(tid)
  return JSON.stringify({ count: employees.length, employees })
}

const HR_EMPLOYMENT_TYPES = ['contractor_1099', 'employee_w2']
const HR_STATUSES = ['active', 'on_leave', 'terminated']
const HR_COMP_TYPES = ['per_job', 'hourly', 'salary']
const HR_PAY_PERIODS = ['per_job', 'weekly', 'biweekly', 'semimonthly', 'monthly']

async function handleGetEmployeeHrProfile(input: { team_member_id: string }, tid: string): Promise<string> {
  const { data: member, error: memberErr } = await supabaseAdmin.from('team_members').select('id, name, email, phone, role, active, address, photo_url, stripe_account_id, stripe_ready_at').eq('id', input.team_member_id).eq('tenant_id', tid).maybeSingle()
  if (memberErr) return JSON.stringify({ error: memberErr.message })
  if (!member) return JSON.stringify({ error: 'employee not found' })
  const [profileRes, notesRes] = await Promise.all([
    supabaseAdmin.from('hr_employee_profiles').select('*').eq('team_member_id', input.team_member_id).maybeSingle(),
    supabaseAdmin.from('hr_notes').select('*').eq('team_member_id', input.team_member_id).order('created_at', { ascending: false }).limit(50),
  ])
  return JSON.stringify({ member, profile: profileRes.data ?? null, notes: notesRes.data ?? [], stripe_connected: !!(member.stripe_account_id && member.stripe_ready_at) })
}

async function handleUpdateEmployeeHrProfile(input: { team_member_id: string; fields: Record<string, unknown> }, tid: string): Promise<string> {
  const { data: member } = await supabaseAdmin.from('team_members').select('id').eq('id', input.team_member_id).eq('tenant_id', tid).maybeSingle()
  if (!member) return JSON.stringify({ error: 'employee not found' })
  const fields = input.fields || {}
  if (fields.employment_type && !HR_EMPLOYMENT_TYPES.includes(fields.employment_type as string)) return JSON.stringify({ error: 'invalid employment_type' })
  if (fields.hr_status && !HR_STATUSES.includes(fields.hr_status as string)) return JSON.stringify({ error: 'invalid hr_status' })
  if (fields.comp_type && !HR_COMP_TYPES.includes(fields.comp_type as string)) return JSON.stringify({ error: 'invalid comp_type' })
  if (fields.pay_period && !HR_PAY_PERIODS.includes(fields.pay_period as string)) return JSON.stringify({ error: 'invalid pay_period' })
  if (fields.pay_rate_cents != null && (!Number.isInteger(fields.pay_rate_cents as number) || (fields.pay_rate_cents as number) < 0)) return JSON.stringify({ error: 'invalid pay_rate_cents' })
  const allowed = ['employment_type', 'hr_status', 'comp_type', 'pay_period', 'pay_rate_cents', 'hire_date', 'termination_date', 'title', 'department', 'emergency_contact_name', 'emergency_contact_phone', 'date_of_birth']
  const patch: Record<string, unknown> = {}
  for (const k of allowed) if (k in fields) patch[k] = fields[k]
  if (Object.keys(patch).length === 0) return JSON.stringify({ error: 'no allowed fields to update' })
  const { data, error } = await supabaseAdmin.from('hr_employee_profiles').upsert({ team_member_id: input.team_member_id, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'team_member_id' }).select('*').single()
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ ok: true, profile: data })
}

const HR_NOTE_KINDS = ['note', 'writeup', 'kudos', 'review']

async function handleAddEmployeeHrNote(input: { team_member_id: string; body: string; kind?: string; author_name?: string }, tid: string): Promise<string> {
  const { data: member } = await supabaseAdmin.from('team_members').select('id').eq('id', input.team_member_id).eq('tenant_id', tid).maybeSingle()
  if (!member) return JSON.stringify({ error: 'employee not found' })
  const text = input.body?.trim()
  if (!text) return JSON.stringify({ error: 'body required' })
  const kind = input.kind && HR_NOTE_KINDS.includes(input.kind) ? input.kind : 'note'
  const { data, error } = await supabaseAdmin.from('hr_notes').insert({ tenant_id: tid, team_member_id: input.team_member_id, author_id: null, author_name: input.author_name?.trim() || null, kind, body: text }).select('id').single()
  if (error || !data) return JSON.stringify({ error: error?.message || 'insert failed' })
  return JSON.stringify({ ok: true, note_id: data.id })
}

// ── Leads — mirrors POST/DELETE /api/leads/block, POST /api/leads/override,
// PATCH /api/leads/verify, GET /api/leads/domains. The visitor-scoring feed
// (/api/leads/feed) is a dashboard analytics view, not a discrete action —
// not exposed as a tool.
async function handleBlockReferrerDomain(input: { domain: string }, tid: string): Promise<string> {
  if (!input.domain?.trim()) return JSON.stringify({ error: 'domain is required' })
  const { error } = await supabaseAdmin.from('blocked_referrers').upsert({ tenant_id: tid, domain: input.domain.trim().toLowerCase() }, { onConflict: 'tenant_id,domain' })
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ ok: true, domain: input.domain.toLowerCase() })
}

async function handleUnblockReferrerDomain(input: { domain: string }, tid: string): Promise<string> {
  if (!input.domain?.trim()) return JSON.stringify({ error: 'domain is required' })
  const { error } = await supabaseAdmin.from('blocked_referrers').delete().eq('tenant_id', tid).eq('domain', input.domain.trim().toLowerCase())
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ ok: true, domain: input.domain.toLowerCase() })
}

async function handleOverrideLeadConversion(input: { lead_click_id: string; type: 'conversion' | 'sale' }, tid: string): Promise<string> {
  if (input.type !== 'conversion' && input.type !== 'sale') return JSON.stringify({ error: 'type must be conversion or sale' })
  const { data } = await supabaseAdmin.from('lead_clicks').select('manual_conversion, manual_sale').eq('id', input.lead_click_id).eq('tenant_id', tid).maybeSingle()
  if (!data) return JSON.stringify({ error: 'lead not found' })
  if (input.type === 'conversion') {
    await supabaseAdmin.from('lead_clicks').update({ manual_conversion: !data.manual_conversion }).eq('id', input.lead_click_id).eq('tenant_id', tid)
  } else {
    const newSale = !data.manual_sale
    const update: Record<string, boolean> = { manual_sale: newSale }
    if (newSale && !data.manual_conversion) update.manual_conversion = true
    await supabaseAdmin.from('lead_clicks').update(update).eq('id', input.lead_click_id).eq('tenant_id', tid)
  }
  return JSON.stringify({ ok: true, lead_click_id: input.lead_click_id, type: input.type })
}

async function handleVerifyLeadConversion(input: { lead_click_id: string; field: 'true_conversion' | 'true_close'; value: boolean }, tid: string): Promise<string> {
  if (input.field !== 'true_conversion' && input.field !== 'true_close') return JSON.stringify({ error: 'field must be true_conversion or true_close' })
  const { error } = await supabaseAdmin.from('lead_clicks').update({ [input.field]: !!input.value }).eq('id', input.lead_click_id).eq('tenant_id', tid)
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ ok: true, lead_click_id: input.lead_click_id, field: input.field, value: !!input.value })
}

// ── Referrals — mirrors GET/POST /api/referrals, PUT /api/referrals/[id],
// GET/POST/PUT /api/referral-commissions, PATCH /api/referrers/connect/[id]
// (stripe-ineligible flag). Marking a commission 'paid' can move REAL money
// via a Stripe Connect transfer — this ports the route's full safety rail
// set (CAS guard, Connect-required-unless-flagged-ineligible rule, Stripe
// idempotency key, revert-to-pending on transfer failure) rather than a
// simplified version.
async function handleListReferrals(tid: string): Promise<string> {
  const { data, error } = await supabaseAdmin.from('referrals').select('*').eq('tenant_id', tid).order('created_at', { ascending: false })
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ count: (data || []).length, referrals: data || [] })
}

async function handleCreateReferral(input: { name: string; email?: string; phone?: string; code?: string; commission_rate?: number }, tid: string): Promise<string> {
  if (!input.name?.trim()) return JSON.stringify({ error: 'name is required' })
  const referral_code = input.code || Math.random().toString(36).substring(2, 8).toUpperCase()
  const { data, error } = await supabaseAdmin.from('referrals').insert({ tenant_id: tid, name: input.name.trim(), email: input.email || null, phone: input.phone || null, referral_code, commission_rate: input.commission_rate ?? null }).select('id, referral_code').single()
  if (error || !data) return JSON.stringify({ error: error?.message || 'insert failed' })
  return JSON.stringify({ ok: true, referral_id: data.id, referral_code: data.referral_code })
}

async function handleUpdateReferral(input: { referral_id: string; fields: Record<string, unknown> }, tid: string): Promise<string> {
  const allowed = ['status', 'name', 'email', 'phone', 'commission_rate', 'reward_amount', 'total_earned']
  const update: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input.fields || {})) if (allowed.includes(k)) update[k] = v
  if (Object.keys(update).length === 0) return JSON.stringify({ error: 'no allowed fields to update' })
  const { data, error } = await supabaseAdmin.from('referrals').update(update).eq('id', input.referral_id).eq('tenant_id', tid).select('id').maybeSingle()
  if (error) return JSON.stringify({ error: error.message })
  if (!data) return JSON.stringify({ error: 'referral not found' })
  return JSON.stringify({ ok: true, referral_id: input.referral_id, updated_fields: Object.keys(update) })
}

async function handleSetReferrerStripeIneligible(input: { referrer_id: string; stripe_ineligible: boolean }, tid: string): Promise<string> {
  const { data, error } = await supabaseAdmin.from('referrers').update({ stripe_ineligible_at: input.stripe_ineligible ? new Date().toISOString() : null }).eq('id', input.referrer_id).eq('tenant_id', tid).select('id, name, stripe_ineligible_at').maybeSingle()
  if (error) return JSON.stringify({ error: error.message })
  if (!data) return JSON.stringify({ error: 'referrer not found' })
  return JSON.stringify({ ok: true, referrer: data })
}

async function handleListReferralCommissions(input: { status?: string; referrer_id?: string }, tid: string): Promise<string> {
  let q = supabaseAdmin.from('referral_commissions').select('*, referrers(name, email, referral_code), bookings(start_time, price)').eq('tenant_id', tid).order('created_at', { ascending: false })
  if (input.status) q = q.eq('status', input.status)
  if (input.referrer_id) q = q.eq('referrer_id', input.referrer_id)
  const { data, error } = await q
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ count: (data || []).length, commissions: data || [] })
}

async function handleCreateReferralCommission(input: { booking_id: string }, tid: string): Promise<string> {
  const { data: booking } = await supabaseAdmin.from('bookings').select('id, price, referrer_id, clients(name, email)').eq('id', input.booking_id).eq('tenant_id', tid).single()
  if (!booking) return JSON.stringify({ error: 'booking not found' })
  if (!booking.referrer_id) return JSON.stringify({ error: 'booking has no referrer' })
  const { data: existing } = await supabaseAdmin.from('referral_commissions').select('id').eq('booking_id', input.booking_id).eq('tenant_id', tid).maybeSingle()
  if (existing) return JSON.stringify({ error: 'commission already exists for this booking' })
  const { data: ref } = await supabaseAdmin.from('referrers').select('id, name, email, commission_rate').eq('id', booking.referrer_id).eq('tenant_id', tid).single()
  if (!ref) return JSON.stringify({ error: 'referrer not found' })
  const rate = Number(ref.commission_rate) || 0.10
  const gross = booking.price || 0
  const commission = Math.round(gross * rate)
  const client = booking.clients as unknown as { name?: string } | null
  const { data: row, error } = await supabaseAdmin.from('referral_commissions').insert({ tenant_id: tid, booking_id: input.booking_id, referrer_id: booking.referrer_id, client_name: client?.name || null, gross_amount_cents: gross, commission_rate: rate, commission_cents: commission, status: 'pending' }).select().single()
  if (error?.code === '23505') return JSON.stringify({ error: 'commission already exists for this booking' })
  if (error || !row) return JSON.stringify({ error: error?.message || 'insert failed' })
  const { postCommissionAccrual } = await import('@/lib/finance/post-adjustments')
  postCommissionAccrual({ tenantId: tid, commissionId: row.id }).catch(err => console.error('[create_referral_commission] accrual post failed:', err))
  await supabaseAdmin.rpc('increment_referrer_earned', { p_tenant_id: tid, p_referrer_id: ref.id, p_amount_cents: commission })
  return JSON.stringify({ ok: true, commission_id: row.id, commission_cents: commission })
}

async function handleMarkReferralCommissionPaid(input: { commission_id: string; paid_via?: string }, tid: string): Promise<string> {
  const { data: existing } = await supabaseAdmin.from('referral_commissions').select('id, referrer_id, commission_cents, status').eq('id', input.commission_id).eq('tenant_id', tid).maybeSingle()
  if (!existing) return JSON.stringify({ error: 'commission not found' })
  if (existing.status === 'paid') return JSON.stringify({ ok: true, note: 'already paid' })

  let referrerForTransfer: { id: string; name: string; commission_cents: number; stripe_connect_account_id: string } | null = null
  const { data: ref } = await supabaseAdmin.from('referrers').select('id, name, stripe_connect_account_id, stripe_ready_at, stripe_ineligible_at').eq('id', existing.referrer_id).eq('tenant_id', tid).maybeSingle()
  if (ref?.stripe_ready_at && ref.stripe_connect_account_id) {
    referrerForTransfer = { id: ref.id, name: ref.name, commission_cents: existing.commission_cents, stripe_connect_account_id: ref.stripe_connect_account_id }
  } else if (ref && !ref.stripe_ineligible_at) {
    return JSON.stringify({ error: 'This referrer has not connected Stripe and is not flagged Stripe-ineligible. Use set_referrer_stripe_ineligible first if they genuinely cannot onboard.' })
  }

  const updates: Record<string, unknown> = { status: 'paid', paid_at: new Date().toISOString(), paid_via: referrerForTransfer ? 'stripe_connect' : (input.paid_via || 'zelle') }
  const { data, error } = await supabaseAdmin.from('referral_commissions').update(updates).eq('id', input.commission_id).eq('tenant_id', tid).neq('status', 'paid').select().maybeSingle()
  if (error) return JSON.stringify({ error: error.message })
  if (!data) return JSON.stringify({ ok: true, note: 'already paid (concurrent claim)' })

  if (referrerForTransfer) {
    try {
      const { getStripe } = await import('@/lib/stripe')
      const { data: tenantRow } = await supabaseAdmin.from('tenants').select('stripe_api_key').eq('id', tid).maybeSingle()
      const stripe = getStripe((tenantRow as { stripe_api_key?: string | null } | null)?.stripe_api_key || undefined)
      await stripe.transfers.create({ amount: referrerForTransfer.commission_cents, currency: 'usd', destination: referrerForTransfer.stripe_connect_account_id, description: `Referral commission — ${referrerForTransfer.name}`, metadata: { commission_id: data.id, referrer_id: referrerForTransfer.id, tenant_id: tid } }, { idempotencyKey: `referrer-commission-payout:${data.id}` })
    } catch (transferErr) {
      await supabaseAdmin.from('referral_commissions').update({ status: 'pending', paid_at: null, paid_via: null }).eq('id', input.commission_id).eq('tenant_id', tid)
      return JSON.stringify({ error: transferErr instanceof Error ? transferErr.message : 'Stripe transfer failed' })
    }
  }

  await supabaseAdmin.rpc('increment_referrer_paid', { p_tenant_id: tid, p_referrer_id: data.referrer_id, p_amount_cents: data.commission_cents })
  const { postCommissionPayment } = await import('@/lib/finance/post-adjustments')
  postCommissionPayment({ tenantId: tid, commissionId: data.id }).catch(err => console.error('[mark_referral_commission_paid] payment post failed:', err))
  return JSON.stringify({ ok: true, commission_id: data.id, paid_via: referrerForTransfer ? 'stripe_connect' : updates.paid_via })
}

// ── Sales partners — mirrors GET /api/sales-partners, PUT /api/sales-
// partners (update), GET/PUT /api/sales-partner-commissions. Creating a new
// sales partner requires PIN provisioning + a welcome email (dashboard-UI-
// only, same class of limitation as document/HR-document uploads) — not
// exposed here.
// Onboards a new sales partner: creates the row (inactive), generates their
// Commission Sales Partner Agreement PDF server-side, uploads it, and emails
// them a sign link — mirrors POST /api/sales-partners exactly. Their PIN
// login only activates once that agreement is signed (unlike
// create_dashboard_user, which hands over a working PIN immediately).
async function handleCreateSalesPartner(input: { name: string; email: string; phone?: string; tier?: string }, tid: string): Promise<string> {
  if (!input.name?.trim() || !input.email?.trim()) return JSON.stringify({ error: 'name and email are required' })
  const tier = ['standard', 'tier2', 'tier3'].includes(input.tier || '') ? input.tier! : 'standard'
  const name = input.name.trim()
  const email = input.email.trim()

  const { data: tenantRow } = await supabaseAdmin.from('tenants').select('name, slug, domain, resend_api_key, email_from, timezone').eq('id', tid).single()
  if (!tenantRow) return JSON.stringify({ error: 'tenant not found' })

  const { generatePin, generateSalesPartnerReferralCode, hashPin } = await import('@/lib/sales-partner-auth')
  const { TIER_RATE } = await import('@/app/api/sales-partners/route')

  let referralCode = ''
  for (let i = 0; i < 5 && !referralCode; i++) {
    const candidate = generateSalesPartnerReferralCode(name)
    const { data: existing } = await supabaseAdmin.from('sales_partners').select('id').eq('tenant_id', tid).eq('referral_code', candidate).maybeSingle()
    if (!existing) referralCode = candidate
  }
  if (!referralCode) return JSON.stringify({ error: 'could not generate a unique referral code — try again' })

  const { pinHash, pinSalt } = hashPin(generatePin())
  const { data: partner, error: pErr } = await supabaseAdmin
    .from('sales_partners')
    .insert({ tenant_id: tid, name, email, phone: input.phone || null, referral_code: referralCode, pin_hash: pinHash, pin_salt: pinSalt, tier, commission_rate: TIER_RATE[tier], active: false })
    .select('id, name, email, referral_code, tier, commission_rate, active')
    .single()
  if (pErr || !partner) return JSON.stringify({ error: pErr?.message || 'could not create sales partner' })

  const { buildSalesPartnerAgreementPdf } = await import('@/lib/sales-partner-agreement-pdf')
  const { DOCUMENTS_BUCKET, documentOriginalPath, generateSignerToken, sha256Hex } = await import('@/lib/documents')
  const { getTenantTimezone } = await import('@/lib/tenant-time')
  const effectiveDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: getTenantTimezone(tenantRow) })
  const pdf = await buildSalesPartnerAgreementPdf({ tenantName: tenantRow.name, partnerName: name, partnerEmail: email, referralCode, tier, commissionRate: TIER_RATE[tier], effectiveDate })

  const { data: doc, error: dErr } = await supabaseAdmin.from('documents').insert({ tenant_id: tid, title: `Commission Sales Partner Agreement — ${name}`, message: 'Please review and sign your Commission Sales Partner Agreement.', sign_order: 'parallel', original_path: 'pending', page_count: pdf.pageCount }).select('id').single()
  if (dErr || !doc) {
    await supabaseAdmin.from('sales_partners').delete().eq('id', partner.id).eq('tenant_id', tid)
    return JSON.stringify({ error: dErr?.message || 'could not create agreement document' })
  }

  const path = documentOriginalPath(tid, doc.id)
  const { error: upErr } = await supabaseAdmin.storage.from(DOCUMENTS_BUCKET).upload(path, pdf.bytes, { contentType: 'application/pdf', upsert: true })
  if (upErr) {
    await supabaseAdmin.from('documents').delete().eq('id', doc.id).eq('tenant_id', tid)
    await supabaseAdmin.from('sales_partners').delete().eq('id', partner.id).eq('tenant_id', tid)
    return JSON.stringify({ error: `upload failed: ${upErr.message}` })
  }

  const now = new Date().toISOString()
  await supabaseAdmin.from('documents').update({ original_path: path, original_sha256: sha256Hex(Buffer.from(pdf.bytes)), status: 'sent', sent_at: now }).eq('id', doc.id).eq('tenant_id', tid)

  const token = generateSignerToken()
  const { data: signer, error: sErr } = await supabaseAdmin.from('document_signers').insert({ tenant_id: tid, document_id: doc.id, order_index: 1, name, email, role: 'partner', public_token: token, status: 'sent', sent_at: now }).select('id').single()
  if (sErr || !signer) return JSON.stringify({ error: sErr?.message || 'could not add signer' })

  const field = (type: 'signature' | 'date' | 'full_name', spot: typeof pdf.partnerSignature, required: boolean, label: string) => ({ tenant_id: tid, document_id: doc.id, signer_id: signer.id, type, page: spot.page, x_pct: spot.xPct, y_pct: spot.yPct, w_pct: spot.wPct, h_pct: spot.hPct, required, label })
  const { error: fErr } = await supabaseAdmin.from('document_fields').insert([field('full_name', pdf.partnerFullName, true, 'Full legal name'), field('signature', pdf.partnerSignature, true, 'Partner signature'), field('date', pdf.partnerDate, false, 'Date')])
  if (fErr) return JSON.stringify({ error: fErr.message })

  await supabaseAdmin.from('sales_partners').update({ agreement_document_id: doc.id }).eq('id', partner.id).eq('tenant_id', tid)

  const baseUrl = tenantRow.domain ? `https://${tenantRow.domain}` : (process.env.NEXT_PUBLIC_APP_URL || 'https://app.fullloopcrm.com')
  const signUrl = `${baseUrl}/sign/${token}`
  try {
    const { sendEmail, tenantSender } = await import('@/lib/email')
    const { escapeHtml } = await import('@/lib/escape-html')
    await sendEmail({
      to: email, subject: `${tenantRow.name}: your Commission Sales Partner agreement`, from: tenantSender(tenantRow), resendApiKey: tenantRow.resend_api_key,
      html: `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a;"><h1 style="font-size:20px;margin:0 0 12px;">Welcome, ${escapeHtml(name.split(' ')[0])} — one step to activate your Sales Partner account</h1><p style="color:#475569;font-size:14px;line-height:1.65;margin:0 0 14px;">Your referral code is <strong>${escapeHtml(referralCode)}</strong>. Review and sign your Commission Sales Partner Agreement to activate your portal login.</p><div style="margin:0 0 22px;"><a href="${signUrl}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:14px 30px;border-radius:8px;font-weight:600;font-size:15px;">Review &amp; sign →</a></div></div>`,
    })
  } catch (e) {
    return JSON.stringify({ ok: true, partner, sign_url: signUrl, warning: `partner created but email failed: ${e instanceof Error ? e.message : 'unknown'}` })
  }
  return JSON.stringify({ ok: true, partner, sign_url: signUrl })
}

async function handleListSalesPartners(tid: string): Promise<string> {
  const { data, error } = await supabaseAdmin.from('sales_partners').select('id, name, email, phone, tier, active, commission_rate, referral_code, total_earned, total_paid, stripe_ready_at, stripe_ineligible').eq('tenant_id', tid).order('name', { ascending: true })
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ count: (data || []).length, sales_partners: data || [] })
}

async function handleUpdateSalesPartner(input: { sales_partner_id: string; active?: boolean; tier?: string; commission_rate?: number; stripe_ineligible?: boolean }, tid: string): Promise<string> {
  const updates: Record<string, unknown> = {}
  if (typeof input.active === 'boolean') updates.active = input.active
  if (input.tier && ['standard', 'tier2', 'tier3'].includes(input.tier)) updates.tier = input.tier
  if (typeof input.commission_rate === 'number' && input.commission_rate >= 0 && input.commission_rate <= 1) updates.commission_rate = input.commission_rate
  if (typeof input.stripe_ineligible === 'boolean') updates.stripe_ineligible = input.stripe_ineligible
  if (Object.keys(updates).length === 0) return JSON.stringify({ error: 'no valid fields to update' })
  const { data, error } = await supabaseAdmin.from('sales_partners').update(updates).eq('id', input.sales_partner_id).eq('tenant_id', tid).select('id').maybeSingle()
  if (error) return JSON.stringify({ error: error.message })
  if (!data) return JSON.stringify({ error: 'sales partner not found' })
  return JSON.stringify({ ok: true, sales_partner_id: input.sales_partner_id, updated_fields: Object.keys(updates) })
}

async function handleListSalesPartnerCommissions(input: { status?: string; sales_partner_id?: string }, tid: string): Promise<string> {
  let q = supabaseAdmin.from('sales_partner_commissions').select('*').eq('tenant_id', tid).order('created_at', { ascending: false })
  if (input.status) q = q.eq('status', input.status)
  if (input.sales_partner_id) q = q.eq('sales_partner_id', input.sales_partner_id)
  const { data, error } = await q
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ count: (data || []).length, commissions: data || [] })
}

async function handleMarkSalesPartnerCommissionPaid(input: { commission_id: string; paid_via?: string }, tid: string): Promise<string> {
  const { data: commissionRow } = await supabaseAdmin.from('sales_partner_commissions').select('sales_partner_id, status').eq('id', input.commission_id).eq('tenant_id', tid).maybeSingle()
  if (!commissionRow) return JSON.stringify({ error: 'commission not found' })
  if (commissionRow.status === 'paid') return JSON.stringify({ ok: true, note: 'already paid' })

  const { data: partner } = await supabaseAdmin.from('sales_partners').select('stripe_ready_at, stripe_ineligible').eq('id', commissionRow.sales_partner_id as string).eq('tenant_id', tid).maybeSingle()
  let effectivePaidVia: string
  let viaStripe = false
  if (partner?.stripe_ready_at) {
    effectivePaidVia = 'stripe_connect'
    viaStripe = true
  } else if (partner?.stripe_ineligible) {
    effectivePaidVia = input.paid_via || 'zelle'
  } else {
    return JSON.stringify({ error: 'This partner has not connected Stripe Connect. Send a Connect invite, or use update_sales_partner with stripe_ineligible:true to pay them manually.' })
  }

  const { data, error } = await supabaseAdmin.from('sales_partner_commissions').update({ status: 'paid', paid_at: new Date().toISOString(), paid_via: effectivePaidVia }).eq('id', input.commission_id).eq('tenant_id', tid).neq('status', 'paid').select().maybeSingle()
  if (error) return JSON.stringify({ error: error.message })
  if (!data) return JSON.stringify({ ok: true, note: 'already paid (concurrent claim)' })

  if (viaStripe) {
    const { transferCommissionViaStripe } = await import('@/app/api/sales-partner-commissions/route')
    const transferResult = await transferCommissionViaStripe({ tenantId: tid, commission: data })
    if (!transferResult.ok) {
      await supabaseAdmin.from('sales_partner_commissions').update({ status: 'pending', paid_at: null, paid_via: null }).eq('id', input.commission_id).eq('tenant_id', tid)
      return JSON.stringify({ error: transferResult.error })
    }
    await supabaseAdmin.from('sales_partner_commissions').update({ stripe_transfer_id: transferResult.transferId }).eq('id', input.commission_id).eq('tenant_id', tid)
  }

  const { bumpSalesPartnerTotalOrFlag } = await import('@/lib/sales-partner-ledger')
  await bumpSalesPartnerTotalOrFlag(tid, data.sales_partner_id as string, 'total_paid', data.commission_cents as number, { relatedType: 'sales_partner_commission', relatedId: data.id as string })
  const { postSalesPartnerCommissionPayment } = await import('@/lib/finance/post-adjustments')
  postSalesPartnerCommissionPayment({ tenantId: tid, commissionId: data.id as string }).catch(err => console.error('[mark_sales_partner_commission_paid] payment post failed:', err))
  return JSON.stringify({ ok: true, commission_id: data.id, paid_via: effectivePaidVia })
}

// ── Campaigns — mirrors GET/POST /api/campaigns, POST/PUT /api/campaigns/
// send. send_campaign fans out real email/SMS to every matching client (or
// an explicit client_ids list) — confirm audience size with the user before
// calling, same posture as send_broadcast.
async function handleListCampaigns(tid: string): Promise<string> {
  const { data, error } = await supabaseAdmin.from('campaigns').select('*').eq('tenant_id', tid).order('created_at', { ascending: false })
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ count: (data || []).length, campaigns: data || [] })
}

async function handleCreateCampaign(input: { name: string; type: string; subject?: string; body?: string; recipient_filter?: string }, tid: string): Promise<string> {
  if (!input.name?.trim() || !input.type?.trim()) return JSON.stringify({ error: 'name and type are required' })
  const { data, error } = await supabaseAdmin.from('campaigns').insert({ tenant_id: tid, name: input.name.trim(), type: input.type, subject: input.subject || null, body: input.body || null, recipient_filter: input.recipient_filter || null, status: 'draft' }).select('id').single()
  if (error || !data) return JSON.stringify({ error: error?.message || 'insert failed' })
  await audit({ tenantId: tid, action: 'campaign.created', entityType: 'campaign', entityId: data.id, details: { actor: 'agent', name: input.name, type: input.type } })
  return JSON.stringify({ ok: true, campaign_id: data.id })
}

async function handleSendCampaign(input: { campaign_id: string; client_ids?: string[] }, tid: string): Promise<string> {
  const { data: campaign } = await supabaseAdmin.from('campaigns').select('*').eq('id', input.campaign_id).eq('tenant_id', tid).single()
  if (!campaign) return JSON.stringify({ error: 'campaign not found' })
  if (campaign.status !== 'draft') return JSON.stringify({ error: 'campaign has already been sent' })

  await supabaseAdmin.from('campaigns').update({ status: 'sending' }).eq('id', input.campaign_id)

  let query = supabaseAdmin.from('clients').select('id, name, email, phone, email_marketing_opt_out, sms_marketing_opt_out, sms_consent').eq('tenant_id', tid)
  if (input.client_ids && input.client_ids.length > 0) {
    query = query.in('id', input.client_ids)
  } else if ((campaign.recipient_filter || 'all') === 'active') {
    query = query.eq('status', 'active')
  }
  const { data: clients } = await query

  if (!clients || clients.length === 0) {
    await supabaseAdmin.from('campaigns').update({ status: 'sent', total_recipients: 0, sent_count: 0, failed_count: 0, sent_at: new Date().toISOString() }).eq('id', input.campaign_id)
    return JSON.stringify({ ok: true, total: 0, sent: 0, failed: 0 })
  }

  const sendEmailChannel = campaign.type === 'email' || campaign.type === 'both'
  const sendSmsChannel = campaign.type === 'sms' || campaign.type === 'both'
  const { data: tenantConfig } = await supabaseAdmin.from('tenants').select('resend_api_key, telnyx_api_key, telnyx_phone').eq('id', tid).single()
  const hasEmail = !!(tenantConfig?.resend_api_key || (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'placeholder'))
  const hasSMS = !!(tenantConfig?.telnyx_api_key && tenantConfig?.telnyx_phone)
  if (sendEmailChannel && !hasEmail) { await supabaseAdmin.from('campaigns').update({ status: 'draft' }).eq('id', input.campaign_id); return JSON.stringify({ error: 'Email not configured. Add a Resend API key in Settings before sending email campaigns.' }) }
  if (sendSmsChannel && !hasSMS) { await supabaseAdmin.from('campaigns').update({ status: 'draft' }).eq('id', input.campaign_id); return JSON.stringify({ error: 'SMS not configured. Add a Telnyx API key in Settings before sending SMS campaigns.' }) }

  type RecipientRow = { campaign_id: string; client_id: string; channel: 'email' | 'sms'; recipient: string; status: string; tenant_id: string }
  const recipientRows: RecipientRow[] = []
  for (const client of clients) {
    if (sendEmailChannel && client.email && !client.email_marketing_opt_out) recipientRows.push({ campaign_id: input.campaign_id, client_id: client.id, channel: 'email', recipient: client.email, status: 'pending', tenant_id: tid })
    if (sendSmsChannel && client.phone && !client.sms_marketing_opt_out && client.sms_consent !== false) recipientRows.push({ campaign_id: input.campaign_id, client_id: client.id, channel: 'sms', recipient: client.phone, status: 'pending', tenant_id: tid })
  }
  if (recipientRows.length > 0) await supabaseAdmin.from('campaign_recipients').insert(recipientRows)

  const { notify } = await import('@/lib/notify')
  let sentCount = 0, failedCount = 0
  for (const row of recipientRows) {
    try {
      await notify({ tenantId: tid, type: 'campaign_sent', title: row.channel === 'email' ? (campaign.subject || campaign.name) : campaign.name, message: campaign.body, channel: row.channel, recipientType: 'client', recipientId: row.client_id, metadata: { campaignId: input.campaign_id } })
      await supabaseAdmin.from('campaign_recipients').update({ status: 'sent' }).eq('campaign_id', input.campaign_id).eq('client_id', row.client_id).eq('channel', row.channel)
      sentCount++
    } catch (e) {
      console.error(`[send_campaign] failed for ${row.recipient}:`, e)
      await supabaseAdmin.from('campaign_recipients').update({ status: 'failed' }).eq('campaign_id', input.campaign_id).eq('client_id', row.client_id).eq('channel', row.channel)
      failedCount++
    }
    await new Promise((r) => setTimeout(r, row.channel === 'sms' ? 200 : 100))
  }

  await supabaseAdmin.from('campaigns').update({ status: 'sent', total_recipients: recipientRows.length, sent_count: sentCount, failed_count: failedCount, sent_at: new Date().toISOString() }).eq('id', input.campaign_id)
  return JSON.stringify({ ok: true, total: recipientRows.length, sent: sentCount, failed: failedCount })
}

// ── Google Business — mirrors GET/POST /api/google/posts, GET/POST /api/
// google/reviews. Posting publishes LIVE to the tenant's Google Business
// Profile with no draft step.
async function handleListGooglePosts(tid: string): Promise<string> {
  const { getGooglePosts } = await import('@/lib/google-posts')
  const posts = await getGooglePosts(tid)
  return JSON.stringify({ count: posts.length, posts })
}

async function handleCreateGooglePost(input: { summary?: string; generate_ai?: boolean; topic?: string; call_to_action_type?: string; call_to_action_url?: string; photo_url?: string }, tid: string): Promise<string> {
  const { createGooglePost, generateGooglePost } = await import('@/lib/google-posts')
  if (input.generate_ai) {
    const generated = await generateGooglePost(tid, input.topic)
    return JSON.stringify({ generated_post: generated, note: 'Not published yet — call create_google_post again with summary set to publish it.' })
  }
  if (!input.summary) return JSON.stringify({ error: 'summary is required (or set generate_ai:true to draft one first)' })
  const GOOGLE_CTA_TYPES = ['BOOK', 'ORDER', 'LEARN_MORE', 'SIGN_UP', 'CALL'] as const
  const ctaType = GOOGLE_CTA_TYPES.includes(input.call_to_action_type as typeof GOOGLE_CTA_TYPES[number]) ? (input.call_to_action_type as typeof GOOGLE_CTA_TYPES[number]) : undefined
  const result = await createGooglePost({ tenantId: tid, summary: input.summary, callToActionType: ctaType, callToActionUrl: input.call_to_action_url, photoUrl: input.photo_url })
  if (!result.success) return JSON.stringify({ error: result.error })
  return JSON.stringify({ ok: true, ...result })
}

async function handleListGoogleReviews(tid: string): Promise<string> {
  const { data: reviews } = await supabaseAdmin.from('google_reviews').select('*').eq('tenant_id', tid).order('review_created_at', { ascending: false }).limit(50)
  const { getGoogleBusiness } = await import('@/lib/google')
  const business = await getGoogleBusiness(tid)
  return JSON.stringify({ count: (reviews || []).length, reviews: reviews || [], connected: !!business?.location_name })
}

async function handleReplyToGoogleReview(input: { review_id: string; reply?: string; generate_ai?: boolean }, tid: string): Promise<string> {
  const { data: review } = await supabaseAdmin.from('google_reviews').select('*').eq('id', input.review_id).eq('tenant_id', tid).single()
  if (!review) return JSON.stringify({ error: 'review not found' })
  const { generateReviewReply, postReviewReply } = await import('@/lib/google-reviews')
  if (input.generate_ai) {
    const replyText = await generateReviewReply(tid, review.reviewer_name, review.rating, review.comment || '')
    return JSON.stringify({ generated_reply: replyText, note: 'Not posted yet — call reply_to_google_review again with reply set to that text (or your own) to publish it.' })
  }
  if (!input.reply?.trim()) return JSON.stringify({ error: 'reply is required (or set generate_ai:true to draft one first)' })
  await postReviewReply(tid, review.google_review_id || review.id, input.reply.trim())
  await supabaseAdmin.from('google_reviews').update({ reply_text: input.reply.trim(), replied_at: new Date().toISOString() }).eq('id', input.review_id).eq('tenant_id', tid)
  return JSON.stringify({ ok: true, review_id: input.review_id })
}

// ── Social (Facebook/Instagram) — mirrors POST /api/social/post. Publishes LIVE.
async function handlePostToSocial(input: { platform: 'facebook' | 'instagram'; message?: string; photo_url?: string; caption?: string; image_url?: string }, tid: string): Promise<string> {
  if (input.platform === 'facebook') {
    if (!input.message) return JSON.stringify({ error: 'message is required for Facebook posts' })
    const { postToFacebook } = await import('@/lib/social')
    return JSON.stringify(await postToFacebook(tid, input.message.slice(0, 5000), input.photo_url?.slice(0, 2000)))
  }
  if (input.platform === 'instagram') {
    if (!input.caption || !input.image_url) return JSON.stringify({ error: 'caption and image_url are required for Instagram posts' })
    const { postToInstagram } = await import('@/lib/social')
    return JSON.stringify(await postToInstagram(tid, input.caption.slice(0, 5000), input.image_url.slice(0, 2000)))
  }
  return JSON.stringify({ error: 'unsupported platform — use facebook or instagram' })
}

// ── Reviews (on-site testimonials) — mirrors GET/POST /api/reviews, PUT /api/
// reviews/[id], POST /api/reviews/request.
async function handleListReviews(tid: string): Promise<string> {
  const { data, error } = await supabaseAdmin.from('reviews').select('*, clients(name)').eq('tenant_id', tid).order('created_at', { ascending: false })
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ count: (data || []).length, reviews: data || [] })
}

async function handleRequestReview(input: { client_id: string; booking_id?: string }, tid: string): Promise<string> {
  const { data: client } = await supabaseAdmin.from('clients').select('name, email, phone').eq('id', input.client_id).eq('tenant_id', tid).single()
  if (!client) return JSON.stringify({ error: 'client not found' })
  let ownedBookingId: string | null = null
  if (input.booking_id) {
    const { data: booking } = await supabaseAdmin.from('bookings').select('id').eq('id', input.booking_id).eq('tenant_id', tid).eq('client_id', input.client_id).maybeSingle()
    if (!booking) return JSON.stringify({ error: 'booking not found' })
    ownedBookingId = booking.id
  }
  const { data: tenantRow } = await supabaseAdmin.from('tenants').select('name, google_place_id, resend_api_key, telnyx_api_key, telnyx_phone').eq('id', tid).single()
  const { data: review } = await supabaseAdmin.from('reviews').insert({ tenant_id: tid, client_id: input.client_id, booking_id: ownedBookingId, status: 'pending', requested_at: new Date().toISOString(), source: 'internal' }).select().single()

  const googleUrl = tenantRow?.google_place_id ? `https://search.google.com/local/writereview?placeid=${tenantRow.google_place_id}` : null
  const message = `Hi ${client.name}, thank you for choosing ${tenantRow?.name}! We'd love your feedback.${googleUrl ? ` Leave us a review: ${googleUrl}` : ''}`
  const { escapeHtml } = await import('@/lib/escape-html')
  if (client.email) {
    try {
      const { sendEmail } = await import('@/lib/email')
      await sendEmail({ to: client.email, subject: `How was your experience with ${tenantRow?.name}?`, html: `<p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`, resendApiKey: tenantRow?.resend_api_key })
    } catch (e) { console.error('[request_review] email failed:', e) }
  }
  if (client.phone && tenantRow?.telnyx_api_key && tenantRow?.telnyx_phone) {
    try {
      await sendTelnyxSMS({ to: client.phone, body: message, telnyxApiKey: tenantRow.telnyx_api_key, telnyxPhone: tenantRow.telnyx_phone })
    } catch (e) { console.error('[request_review] sms failed:', e) }
  }
  await audit({ tenantId: tid, action: 'review.requested', entityType: 'review', entityId: review?.id, details: { actor: 'agent', client_id: input.client_id, booking_id: ownedBookingId } })
  return JSON.stringify({ ok: true, review_id: review?.id, sent: true })
}

async function handleUpdateReview(input: { review_id: string; fields: Record<string, unknown> }, tid: string): Promise<string> {
  const allowed = ['status', 'rating', 'comment', 'google_review_url', 'requested_at', 'completed_at', 'text', 'response', 'source', 'service_type', 'neighborhood', 'team_member_name', 'images', 'video_url', 'verified', 'published_at']
  const update: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input.fields || {})) if (allowed.includes(k)) update[k] = v
  if (Object.keys(update).length === 0) return JSON.stringify({ error: 'no allowed fields to update' })
  const { data, error } = await supabaseAdmin.from('reviews').update(update).eq('id', input.review_id).eq('tenant_id', tid).select('id').maybeSingle()
  if (error) return JSON.stringify({ error: error.message })
  if (!data) return JSON.stringify({ error: 'review not found' })
  return JSON.stringify({ ok: true, review_id: input.review_id, updated_fields: Object.keys(update) })
}

// ── Settings — service type CRUD (settings/services, distinct from the
// catalog/service_types tools above which target the newer item-catalog
// shape — this one is the legacy booking-flow service editor, same table,
// narrower field set), the permission matrix, business profile, and service
// area. update_role_permissions is the highest-governance-risk tool in this
// whole registry — it can change what every OTHER role in the tenant is
// allowed to do. Mirrors PUT /api/settings/permissions's validation exactly,
// including refusing to ever touch 'owner' (always full access, no lockout).
async function handleListSettingsServices(tid: string): Promise<string> {
  const { data, error } = await supabaseAdmin.from('service_types').select('*').eq('tenant_id', tid).order('sort_order')
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ count: (data || []).length, services: data || [] })
}

async function handleCreateSettingsService(input: { name: string; description?: string; default_duration_hours?: number; default_hourly_rate?: number; pricing_model?: string; price_cents?: number; per_unit?: string; min_charge_cents?: number }, tid: string): Promise<string> {
  if (!input.name?.trim()) return JSON.stringify({ error: 'name is required' })
  const { data: existing } = await supabaseAdmin.from('service_types').select('sort_order').eq('tenant_id', tid).order('sort_order', { ascending: false }).limit(1)
  const sortOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0
  const { data, error } = await supabaseAdmin
    .from('service_types')
    .insert({ tenant_id: tid, name: input.name.trim(), description: input.description || null, default_duration_hours: input.default_duration_hours ?? null, default_hourly_rate: input.default_hourly_rate ?? null, pricing_model: input.pricing_model || null, price_cents: input.price_cents ?? null, per_unit: input.per_unit || null, min_charge_cents: input.min_charge_cents ?? null, sort_order: sortOrder })
    .select('id, name')
    .single()
  if (error || !data) return JSON.stringify({ error: error?.message || 'insert failed' })
  await audit({ tenantId: tid, action: 'service.created', entityType: 'service', entityId: data.id, details: { actor: 'agent', name: data.name } })
  return JSON.stringify({ ok: true, service_id: data.id, name: data.name })
}

async function handleGetRolePermissions(tid: string): Promise<string> {
  const { PERMISSION_CATALOG, CUSTOMIZABLE_ROLES, ROLES, getRolePermissions, resolvePermissions, isCustomizableRole } = await import('@/lib/rbac')
  const { data: tenantRow } = await supabaseAdmin.from('tenants').select('selena_config').eq('id', tid).single()
  const raw = (tenantRow?.selena_config as { role_permissions?: unknown } | null)?.role_permissions
  const overrides = (raw && typeof raw === 'object' ? raw : {}) as Parameters<typeof resolvePermissions>[1]
  const roles = ROLES.map((r) => ({ value: r.value, label: r.label, description: r.description, editable: isCustomizableRole(r.value), defaults: getRolePermissions(r.value), effective: resolvePermissions(r.value, overrides) }))
  return JSON.stringify({ catalog: PERMISSION_CATALOG, customizable_roles: CUSTOMIZABLE_ROLES, roles, overrides })
}

async function handleUpdateRolePermissions(input: { overrides: Record<string, Record<string, boolean>> }, tid: string): Promise<string> {
  const { getRolePermissions, isCustomizableRole, isValidPermission, clearSettingsCache } = await import('@/lib/rbac').then(async (rbac) => ({ ...rbac, clearSettingsCache: (await import('@/lib/settings')).clearSettingsCache }))
  const incoming = input.overrides || {}
  const cleaned: Record<string, Record<string, boolean>> = {}
  for (const [role, perms] of Object.entries(incoming)) {
    if (!isCustomizableRole(role)) return JSON.stringify({ error: `role "${role}" cannot be customized` })
    if (!perms || typeof perms !== 'object') continue
    const defaults = new Set(getRolePermissions(role as never))
    const roleDelta: Record<string, boolean> = {}
    for (const [perm, value] of Object.entries(perms)) {
      if (!isValidPermission(perm)) return JSON.stringify({ error: `unknown permission "${perm}"` })
      if (typeof value !== 'boolean') return JSON.stringify({ error: `permission "${perm}" must be true or false` })
      if (value !== defaults.has(perm as never)) roleDelta[perm] = value
    }
    if (Object.keys(roleDelta).length > 0) cleaned[role] = roleDelta
  }
  const { data: tenantRow } = await supabaseAdmin.from('tenants').select('selena_config').eq('id', tid).single()
  const currentConfig = (tenantRow?.selena_config as Record<string, unknown> | null) || {}
  const nextConfig = { ...currentConfig, role_permissions: cleaned }
  const { error } = await supabaseAdmin.from('tenants').update({ selena_config: nextConfig }).eq('id', tid)
  if (error) return JSON.stringify({ error: error.message })
  clearSettingsCache(tid)
  await audit({ tenantId: tid, action: 'permissions.updated', entityType: 'settings', entityId: tid, details: { actor: 'agent', roles: Object.keys(cleaned) } })
  return JSON.stringify({ ok: true, overrides: cleaned })
}

async function handleGetBusinessProfile(tid: string): Promise<string> {
  const { getTenantProfile, isTenantVisible } = await import('@/lib/tenant-profile')
  const profile = await getTenantProfile(tid)
  if (!profile) return JSON.stringify({ error: 'tenant not found' })
  return JSON.stringify({
    name: profile.name,
    fields: profile.fields.filter(isTenantVisible).map((f) => ({ key: f.key, label: f.label, section: f.section, value: f.value, filled: f.filled, readonly: !!f.readonly })),
  })
}

async function handleUpdateBusinessProfile(input: { fields: Record<string, unknown> }, tid: string): Promise<string> {
  const { PROFILE_FIELD_BY_KEY, isTenantVisible } = await import('@/lib/tenant-profile')
  const { applyProfileWrite } = await import('@/lib/tenant-profile-write')
  const filtered: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input.fields || {})) {
    const field = PROFILE_FIELD_BY_KEY[key]
    if (field && isTenantVisible(field) && !field.readonly) filtered[key] = value
  }
  if (Object.keys(filtered).length === 0) return JSON.stringify({ error: 'no writable fields matched — check field keys against get_business_profile' })
  const { saved, ignored } = await applyProfileWrite(tid, filtered)
  if (!saved) return JSON.stringify({ error: 'no writable fields', ignored })
  return JSON.stringify({ ok: true, saved_fields: Object.keys(filtered).filter(k => !ignored?.includes(k)), ignored })
}

async function handleGetServiceArea(tid: string): Promise<string> {
  const { getServiceArea } = await import('@/lib/service-area')
  const { data } = await supabaseAdmin.from('tenants').select('selena_config').eq('id', tid).single()
  return JSON.stringify({ service_area: getServiceArea(data?.selena_config) })
}

async function handleUpdateServiceArea(input: { service_area: unknown }, tid: string): Promise<string> {
  const { parseServiceArea, withServiceArea } = await import('@/lib/service-area')
  const area = parseServiceArea(input.service_area)
  const { data: current } = await supabaseAdmin.from('tenants').select('selena_config').eq('id', tid).single()
  const nextConfig = withServiceArea(current?.selena_config, area)
  const { error } = await supabaseAdmin.from('tenants').update({ selena_config: nextConfig }).eq('id', tid)
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ ok: true, service_area: area })
}

// ── Dashboard user accounts (tenant_members) — mirrors GET/POST/PUT/DELETE
// /api/admin/users, PUT/DELETE /api/admin/users/[id], POST/DELETE /api/admin/
// users/[id]/pin. Creating a member mints and hands over real login
// credentials (PIN, sent via email/SMS) — a real access-control action.
const DASHBOARD_USER_ROLES = ['owner', 'admin', 'manager', 'staff']

async function handleListDashboardUsers(tid: string): Promise<string> {
  const { data, error } = await supabaseAdmin.from('tenant_members').select('id, email, name, role, clerk_user_id, phone, created_at, pin_hash, pin_set_at, pin_last_login').eq('tenant_id', tid).order('created_at', { ascending: true })
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({
    count: (data || []).length,
    users: (data || []).map(m => ({ id: m.id, email: m.email, name: m.name, role: m.role, phone: m.phone, status: (m.clerk_user_id || m.pin_hash) ? 'active' : 'pending', has_pin: !!m.pin_hash, pin_set_at: m.pin_set_at, last_login: m.pin_last_login, created_at: m.created_at })),
  })
}

async function handleCreateDashboardUser(input: { name: string; role?: string; email?: string; phone?: string }, tid: string): Promise<string> {
  if (!input.name?.trim()) return JSON.stringify({ error: 'name is required' })
  const memberRole = DASHBOARD_USER_ROLES.includes(input.role || '') ? input.role! : 'staff'
  const { hashAdminPin, generateAdminPin } = await import('@/lib/admin-pin')
  const { ROLES } = await import('@/lib/rbac')

  let pin = generateAdminPin()
  for (let i = 0; i < 5; i++) {
    const { data: clash } = await supabaseAdmin.from('tenant_members').select('id').eq('tenant_id', tid).eq('pin_hash', hashAdminPin(pin)).maybeSingle()
    if (!clash) break
    pin = generateAdminPin()
  }
  const normalizedEmail = input.email ? input.email.trim().toLowerCase() : null
  const normalizedPhone = input.phone ? input.phone.trim() : null

  const { data, error } = await supabaseAdmin
    .from('tenant_members')
    .insert({ tenant_id: tid, name: input.name.trim(), role: memberRole, email: normalizedEmail, phone: normalizedPhone, pin_hash: hashAdminPin(pin), pin_set_at: new Date().toISOString() })
    .select('id')
    .single()
  if (error || !data) return JSON.stringify({ error: error?.message || 'insert failed' })

  const { data: tenantRow } = await supabaseAdmin.from('tenants').select('name, domain, primary_color, logo_url, resend_api_key, telnyx_api_key, telnyx_phone').eq('id', tid).single()
  const roleLabel = ROLES.find(r => r.value === memberRole)?.label || memberRole
  const portalUrl = tenantRow?.domain ? `https://${tenantRow.domain}/fullloop` : null
  const notified = { email: false, sms: false }

  if (normalizedEmail && portalUrl && tenantRow) {
    try {
      const { sendEmail, tenantSender } = await import('@/lib/email')
      const { operatorAccountCreatedEmail } = await import('@/lib/email-templates')
      await sendEmail({ to: normalizedEmail, subject: `Your ${tenantRow.name} login`, html: operatorAccountCreatedEmail({ tenantName: tenantRow.name, primaryColor: tenantRow.primary_color || undefined, logoUrl: tenantRow.logo_url || undefined, personName: input.name.trim(), pin, portalUrl, role: roleLabel }), from: tenantSender(tenantRow), resendApiKey: tenantRow.resend_api_key })
      notified.email = true
    } catch (e) { console.error('[create_dashboard_user] email failed:', e) }
  }
  if (normalizedPhone && portalUrl && tenantRow?.telnyx_api_key && tenantRow?.telnyx_phone) {
    try {
      await sendTelnyxSMS({ to: normalizedPhone, body: `${tenantRow.name}: You've been added as ${roleLabel}. Log in at ${portalUrl} with PIN ${pin}.`, telnyxApiKey: tenantRow.telnyx_api_key, telnyxPhone: tenantRow.telnyx_phone })
      notified.sms = true
    } catch (e) { console.error('[create_dashboard_user] sms failed:', e) }
  }
  return JSON.stringify({ ok: true, user_id: data.id, pin, notified })
}

async function handleUpdateDashboardUser(input: { user_id: string; fields: Record<string, unknown> }, tid: string): Promise<string> {
  const fields = input.fields || {}
  const update: Record<string, unknown> = {}
  if (fields.name) update.name = fields.name
  if (fields.email) update.email = String(fields.email).toLowerCase().trim()
  if (fields.phone !== undefined) update.phone = fields.phone
  if (fields.role) {
    if (!DASHBOARD_USER_ROLES.includes(fields.role as string)) return JSON.stringify({ error: `invalid role — must be one of ${DASHBOARD_USER_ROLES.join(', ')}` })
    update.role = fields.role
  }
  if (Object.keys(update).length === 0) return JSON.stringify({ error: 'no allowed fields to update' })
  const { data, error } = await supabaseAdmin.from('tenant_members').update(update).eq('id', input.user_id).eq('tenant_id', tid).select('id, email, name, role, phone').maybeSingle()
  if (error) return JSON.stringify({ error: error.message })
  if (!data) return JSON.stringify({ error: 'user not found' })
  return JSON.stringify({ ok: true, user: data })
}

async function handleDeleteDashboardUser(input: { user_id: string }, tid: string): Promise<string> {
  const { data: target } = await supabaseAdmin.from('tenant_members').select('id, role').eq('id', input.user_id).eq('tenant_id', tid).maybeSingle()
  if (!target) return JSON.stringify({ error: 'user not found' })
  if (target.role === 'owner') {
    const { count } = await supabaseAdmin.from('tenant_members').select('id', { count: 'exact', head: true }).eq('tenant_id', tid).eq('role', 'owner')
    if ((count ?? 0) <= 1) return JSON.stringify({ error: 'cannot remove the last owner' })
  }
  const { error } = await supabaseAdmin.from('tenant_members').delete().eq('id', input.user_id).eq('tenant_id', tid)
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ ok: true, user_id: input.user_id })
}

async function handleResetDashboardUserPin(input: { user_id: string; pin?: string }, tid: string): Promise<string> {
  const { data: member } = await supabaseAdmin.from('tenant_members').select('id').eq('id', input.user_id).eq('tenant_id', tid).maybeSingle()
  if (!member) return JSON.stringify({ error: 'user not found' })
  const { hashAdminPin, generateAdminPin, isValidAdminPin } = await import('@/lib/admin-pin')
  let pin: string
  if (input.pin) {
    if (!isValidAdminPin(String(input.pin))) return JSON.stringify({ error: 'PIN must be 4-8 digits' })
    pin = String(input.pin)
  } else {
    pin = generateAdminPin()
  }
  const pinHash = hashAdminPin(pin)
  const { data: clash } = await supabaseAdmin.from('tenant_members').select('id').eq('tenant_id', tid).eq('pin_hash', pinHash).neq('id', input.user_id).maybeSingle()
  if (clash) return JSON.stringify({ error: 'that PIN is already in use — try again' })
  const { error } = await supabaseAdmin.from('tenant_members').update({ pin_hash: pinHash, pin_set_at: new Date().toISOString() }).eq('id', input.user_id).eq('tenant_id', tid)
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ ok: true, user_id: input.user_id, pin })
}

async function handleListLeadDomains(tid: string): Promise<string> {
  const { data: domains } = await supabaseAdmin.from('domains').select('*').eq('tenant_id', tid).order('created_at', { ascending: false })
  const domainStats = await Promise.all((domains || []).map(async (domain) => {
    const { count: visits } = await supabaseAdmin.from('website_visits').select('id', { count: 'exact', head: true }).eq('domain_id', domain.id)
    const { count: ctas } = await supabaseAdmin.from('website_visits').select('id', { count: 'exact', head: true }).eq('domain_id', domain.id).not('cta_type', 'is', null)
    return { ...domain, visits: visits || 0, ctas: ctas || 0 }
  }))
  return JSON.stringify({ count: domainStats.length, domains: domainStats })
}

export async function handleProcessStripeRefund(input: { booking_id: string; amount_dollars: number; reason?: string }, tid: string): Promise<string> {
  // Pre-check: if a prior call already refunded this booking, don't fire a
  // second real Stripe refund just because the owner asks Selena again (or the
  // agent re-issues the same tool call) in the same conversation.
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('payment_status')
    .eq('id', input.booking_id)
    .eq('tenant_id', tid)
    .maybeSingle()
  if (booking?.payment_status === 'refunded') {
    return JSON.stringify({ error: 'this booking is already marked refunded — not issuing a second refund' })
  }

  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('id, stripe_payment_intent_id, amount')
    .eq('tenant_id', tid)
    .eq('booking_id', input.booking_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!payment?.stripe_payment_intent_id) return JSON.stringify({ error: 'no Stripe payment intent on file for this booking' })

  const amountCents = Math.round(input.amount_dollars * 100)
  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2025-08-27.basil' as never })
    // Keyed per booking+amount+day so an agent retry (timeout, duplicate tool
    // call) replays the same refund instead of issuing a second one, while a
    // genuinely distinct refund request on a later day still goes through.
    const dayBucket = new Date().toISOString().slice(0, 10)
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
      amount: amountCents,
      reason: 'requested_by_customer',
      metadata: { booking_id: input.booking_id, note: input.reason || '' },
    }, { idempotencyKey: `refund-${input.booking_id}-${amountCents}-${dayBucket}` })
    await supabaseAdmin.from('bookings').update({ payment_status: 'refunded' }).eq('id', input.booking_id).eq('tenant_id', tid)
    return JSON.stringify({ ok: true, refund_id: refund.id, amount: input.amount_dollars, status: refund.status })
  } catch (err) {
    return JSON.stringify({ error: err instanceof Error ? err.message : String(err) })
  }
}

// SIGNAL SEO health for THIS tenant — read-only. Lets the owner ask Selena
// "how's my SEO?" and get real numbers instead of a guess. Tenant-scoped by tid;
// returns nothing sensitive cross-tenant.
async function handleSeoStatus(tid: string): Promise<string> {
  const { data: props } = await supabaseAdmin
    .from('seo_properties')
    .select('property,domain')
    .eq('tenant_id', tid)

  if (!props || props.length === 0) {
    return JSON.stringify({
      ok: true,
      note: 'No Google Search Console property is linked to this business yet, so there is no SEO data to report.',
    })
  }

  const properties = props.map((p) => p.property as string)
  const domainOf = new Map(props.map((p) => [p.property as string, (p.domain as string) ?? p.property]))

  const [{ data: scores }, { data: issues }, { data: gaps }, { data: changes }] = await Promise.all([
    supabaseAdmin
      .from('seo_site_score')
      .select('property,grade,score,at_goal,on_page1,targets')
      .in('property', properties),
    supabaseAdmin.from('seo_issues').select('type').eq('tenant_id', tid).eq('status', 'open'),
    supabaseAdmin
      .from('seo_issues')
      .select('detail')
      .eq('tenant_id', tid)
      .eq('status', 'open')
      .eq('type', 'competitor_gap')
      .order('value', { ascending: false })
      .limit(3),
    supabaseAdmin.from('seo_changes').select('status').eq('tenant_id', tid),
  ])

  const openIssues: Record<string, number> = {}
  for (const i of issues ?? []) openIssues[i.type as string] = (openIssues[i.type as string] ?? 0) + 1

  const changeCounts: Record<string, number> = {}
  for (const c of changes ?? []) changeCounts[c.status as string] = (changeCounts[c.status as string] ?? 0) + 1

  const sites = (scores ?? []).map((s) => ({
    site: domainOf.get(s.property as string) ?? s.property,
    grade: s.grade,
    score: s.score,
    money_keywords_at_goal: `${s.at_goal}/${s.targets}`,
    on_page_one: s.on_page1,
  }))

  const competitor_gaps = (gaps ?? []).map((g) => {
    const d = (g.detail ?? {}) as { query?: string; our_position?: number; top_competitor_domain?: string }
    return { query: d.query, you_rank: d.our_position, beaten_by: d.top_competitor_domain }
  })

  return JSON.stringify({
    ok: true,
    sites,
    open_issues: openIssues,
    competitor_gaps,
    automated_fixes: changeCounts,
    legend: {
      deep_underperformer: 'ranks poorly, needs content',
      striking_distance: 'one push from page 1 (title/meta)',
      low_ctr: 'ranks ok but few clicks — title/meta rewrite',
      competitor_gap: 'a rival outranks you on a money keyword',
      not_indexed: "Google isn't showing this page at all — fix first",
    },
  })
}

// Idempotency guard for trigger_cron: unlike the other 4 tools, this one has
// no DB row to pre-check — the "state" is whatever the cron endpoint just did
// (often a bulk SMS/email blast to every client, e.g. reminders/outreach). A
// retried or duplicate tool call within the window must NOT re-fire the cron
// a second time. In-memory cooldown Map, same mechanism already proven in
// this codebase by audit.ts's sensitiveAuditCooldowns.
const cronTriggerCooldowns = new Map<string, number>()
const CRON_TRIGGER_COOLDOWN_MS = 60 * 1000

async function handleTriggerCron(input: { name: string }): Promise<string> {
  const allowed = ['reminders', 'rating-prompt', 'payment-reminder', 'confirmation-reminder', 'late-check-in', 'schedule-monitor', 'sales-follow-ups', 'outreach', 'generate-recurring', 'health-check', 'health-monitor']
  if (!allowed.includes(input.name)) return JSON.stringify({ error: `cron not allowed: ${input.name}` })

  const now = Date.now()
  const last = cronTriggerCooldowns.get(input.name) || 0
  if (now - last < CRON_TRIGGER_COOLDOWN_MS) {
    return JSON.stringify({ ok: false, error: 'cron_recently_triggered', note: `${input.name} was already fired in the last ${CRON_TRIGGER_COOLDOWN_MS / 1000}s — not firing again to avoid a duplicate bulk send`, retry_after_ms: CRON_TRIGGER_COOLDOWN_MS - (now - last) })
  }
  cronTriggerCooldowns.set(input.name, now)

  const url = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thenycmaid.com'}/api/cron/${input.name}`
  const secret = process.env.CRON_SECRET || ''
  try {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${secret}` } })
    const text = await r.text()
    return JSON.stringify({ ok: r.ok, status: r.status, response: text.slice(0, 400) })
  } catch (err) {
    return JSON.stringify({ error: err instanceof Error ? err.message : String(err) })
  }
}

// nycmaid-standalone wrote these to a separate cleaner_blocks table. FullLoop
// never got that table (neither cleaner_blocks nor a team_member_blocks
// equivalent exists) — the only thing the real scheduler (day-availability.ts
// worksScheduledDay, smart-schedule.ts) actually reads for one-off days off is
// team_members.unavailable_dates. Writing to a table nothing reads would make
// this tool a no-op that silently reports ok:true, so this appends the date
// range into that array instead — same mechanism the team-portal "day off"
// editor already writes to.
async function handleBlockCleanerDates(input: { cleaner_id: string; from_date: string; to_date: string; reason?: string }, tid: string): Promise<string> {
  const { data: member } = await supabaseAdmin
    .from('team_members')
    .select('id, unavailable_dates')
    .eq('id', input.cleaner_id)
    .eq('tenant_id', tid)
    .maybeSingle()
  if (!member) return JSON.stringify({ error: 'cleaner not found' })

  const from = new Date(input.from_date + 'T00:00:00')
  const to = new Date(input.to_date + 'T00:00:00')
  if (isNaN(from.getTime()) || isNaN(to.getTime()) || to < from) {
    return JSON.stringify({ error: 'invalid from_date/to_date range' })
  }
  const MAX_DAYS = 366
  const newDates: string[] = []
  for (let d = new Date(from); d <= to && newDates.length < MAX_DAYS; d.setDate(d.getDate() + 1)) {
    newDates.push(d.toLocaleDateString('en-CA'))
  }

  const existing: string[] = (member.unavailable_dates as string[] | null) || []
  const merged = Array.from(new Set([...existing, ...newDates])).sort()

  const { error } = await supabaseAdmin
    .from('team_members')
    .update({ unavailable_dates: merged })
    .eq('id', input.cleaner_id)
    .eq('tenant_id', tid)
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ ok: true, cleaner_id: input.cleaner_id, from_date: input.from_date, to_date: input.to_date, days_blocked: newDates.length, reason: input.reason || null })
}

async function handleCreateClient(input: { name: string; phone: string; email?: string }, conversationId: string, tid: string): Promise<string> {
  const digits = input.phone.replace(/\D/g, '')
  const last10 = digits.slice(-10)
  if (last10.length !== 10) return JSON.stringify({ error: 'invalid phone' })
  // Persist digits-only so future ILIKE substring lookups match.
  const phone = digits

  // Avoid dupes: check if a client with this phone already exists
  const { data: existing } = await supabaseAdmin
    .from('clients')
    .select('id, name')
    .eq('tenant_id', tid)
    .ilike('phone', `%${last10}%`)
    .maybeSingle()
  if (existing?.id) {
    await supabaseAdmin.from('sms_conversations').update({ client_id: existing.id }).eq('id', conversationId).eq('tenant_id', tid)
    return JSON.stringify({ ok: true, client_id: existing.id, name: existing.name, note: 'already existed; linked conversation' })
  }

  const pin = randomInt(100000, 1000000).toString()
  const { data: client, error } = await supabaseAdmin
    .from('clients')
    .insert({ tenant_id: tid, name: input.name, phone, email: input.email || null, status: 'potential', pin })
    .select('id')
    .single()
  if (error || !client) return JSON.stringify({ error: error?.message || 'insert failed' })

  // Link this conversation to the new client so the transcript appears in their feed
  await supabaseAdmin.from('sms_conversations').update({ client_id: client.id, name: input.name, phone }).eq('id', conversationId).eq('tenant_id', tid)

  return JSON.stringify({ ok: true, client_id: client.id, name: input.name, pin })
}
