// Yinez tool dispatcher.
// Client-facing tools (14) → call into yinez/core.ts handleTool.
// Owner-facing tools (8) → inline supabase queries.

import { randomInt } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { handleTool as coreHandleTool, EMPTY_CHECKLIST, type YinezResult as CoreResult } from '@/lib/selena/core'
import { isOwner, type YinezResult } from '@/lib/selena/agent'
import { sendSMS } from '@/lib/nycmaid/sms'
import { smsAdmins } from '@/lib/nycmaid/admin-contacts'
import { sendEmail } from '@/lib/nycmaid/email'
import { notify } from '@/lib/nycmaid/notify'
import { getCurrentTenantId } from '@/lib/tenant'

const ymd = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })

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

const CLIENT_TOOLS = new Set([
  'create_booking', 'lookup_bookings', 'reschedule_booking',
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

export async function runTool(
  name: string,
  input: Record<string, unknown>,
  conversationId: string,
  phone: string | null,
  result: YinezResult,
  tenantId?: string,
  phoneVerified: boolean = false,
): Promise<string> {
  // tenantId is REQUIRED for safe multi-tenant routing. Older callers may not
  // pass it yet (sweep in progress) — fall back to the default tenant rather
  // than throwing, so a missing param doesn't break a live SMS reply.
  const tid = tenantId || (await getCurrentTenantId())

  // Owner-only gate. Anything not in CLIENT_TOOLS or SELF_TOOLS is an admin
  // tool (cross-client lookups, broadcasts, ops dashboards, refunds, etc).
  // If the caller isn't the owner, refuse before the side-effect runs.
  // Returning an error string (not throwing) lets the model see "not allowed"
  // and recover with a normal client-facing reply instead of dumping ops data.
  // phoneVerified must be false for unauthenticated caller-supplied phone
  // (web widget) -- see isOwner() in agent.ts for why.
  if (!CLIENT_TOOLS.has(name) && !SELF_TOOLS.has(name) && !CLIENT_LOCAL_TOOLS.has(name) && !isOwner(phone, phoneVerified)) {
    console.warn('[Yinez:owner_tool_blocked]', { name, phone, conversationId })
    return JSON.stringify({
      error: 'owner_only_tool',
      message: `Tool ${name} is owner-only. You're talking to a client right now — answer their question without this tool.`,
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
      return await handleLookupClient(String(input.query || ''), tid)
    case 'list_bookings':
      return await handleListBookings(input as { date?: string; from_date?: string; to_date?: string; cleaner_id?: string }, tid)
    case 'lookup_cleaner':
      return await handleLookupCleaner(String(input.name || ''), tid)
    case 'get_outstanding_payments':
      return await handleOutstandingPayments(tid)
    case 'get_at_risk_clients':
      return await handleAtRiskClients(tid)
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

// ── Smart scheduling visibility ──
// Yinez runs the same scoring algorithm the admin UI shows in the cleaner dropdown — full
// list of cleaners with availability, conflicts, day-off reasons, score + rationale.
// Same data Jeff sees when assigning. So she can answer "why this cleaner" and "who else?".

async function handleScoreCleaners(input: { date: string; time: string; duration_hours: number; client_address?: string; client_id?: string; exclude_booking_id?: string; hourly_rate?: number }, tid: string): Promise<string> {
  if (!input.date || !input.time || !input.duration_hours) {
    return JSON.stringify({ error: 'date, time (HH:MM), and duration_hours are required' })
  }
  const { scoreCleanersForBooking } = await import('@/lib/nycmaid/smart-schedule')
  const [h, m] = input.time.replace(/[^\d:]/g, '').split(':').map(Number)
  const startTime = `${String(h || 0).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`
  const scores = await scoreCleanersForBooking({
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
  return JSON.stringify({
    slot: { date: input.date, time: startTime, duration_hours: input.duration_hours },
    cleaners: scores.map((s) => ({
      name: s.name,
      score: s.score,
      available: s.available,
      reason: s.reason,
      conflict: s.conflict || null,
      zone_match: s.zone_match,
      has_car: s.has_car,
      home_by: s.home_by,
      day_jobs: s.day_jobs,
    })),
  })
}

async function handleGetSmartSuggestion(input: { booking_id: string }, tid: string): Promise<string> {
  if (!input.booking_id) return JSON.stringify({ error: 'booking_id required' })
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, start_time, end_time, hourly_rate, status, cleaner_id, suggested_cleaner_id, suggested_reason, client_id, clients(name, address), cleaners(name)')
    .eq('id', input.booking_id)
    .eq('tenant_id', tid)
    .maybeSingle()
  if (!booking) return JSON.stringify({ error: 'booking not found' })

  const startTime = booking.start_time?.split('T')[1]?.slice(0, 5) || '09:00'
  const startMs = new Date(booking.start_time).getTime()
  const endMs = new Date(booking.end_time).getTime()
  const duration = endMs > startMs ? (endMs - startMs) / 3_600_000 : 2

  const { scoreCleanersForBooking } = await import('@/lib/nycmaid/smart-schedule')
  const scores = await scoreCleanersForBooking({
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
    assigned_cleaner: (booking.cleaners as unknown as { name?: string })?.name || null,
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
      .select('id, status, hourly_rate, clients(name), cleaners(name), start_time, end_time')
      .eq('tenant_id', tid)
      .gte('start_time', today + 'T00:00:00')
      .lt('start_time', today + 'T23:59:59')
      .order('start_time', { ascending: true }),
    supabaseAdmin
      .from('cleaner_payouts')
      .select('amount, status, cleaner_id, cleaners(name)')
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
      .select('cleaner_id, cleaners(name)')
      .eq('tenant_id', tid)
      .gte('start_time', today + 'T00:00:00')
      .lt('start_time', today + 'T23:59:59')
      .not('cleaner_id', 'is', null),
  ])

  const bookings = bookingsToday.data || []
  const payoutsList = payouts.data || []
  const outstandingList = outstanding.data || []
  const onDuty = Array.from(
    new Set(
      (cleanersOnDuty.data || [])
        .map((b) => (b.cleaners as unknown as { name?: string })?.name)
        .filter(Boolean) as string[],
    ),
  )

  const totalPayoutsOwed = payoutsList.reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const totalOutstanding = outstandingList.reduce(
    (s, b) => s + (Number(b.hourly_rate) || 0) * bookingHours(b),
    0,
  )

  return JSON.stringify({
    date: today,
    bookings_today: bookings.map((b) => ({
      id: b.id,
      client: (b.clients as unknown as { name?: string })?.name || null,
      cleaner: (b.cleaners as unknown as { name?: string })?.name || null,
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

async function handleLookupClient(query: string, tid: string): Promise<string> {
  const digits = query.replace(/\D/g, '')
  let q = supabaseAdmin
    .from('clients')
    .select('id, name, phone, email, address, status, notes, created_at, do_not_service, preferred_cleaner_id')
    .eq('tenant_id', tid)
    .limit(5)
  if (digits.length >= 7) {
    q = q.ilike('phone', `%${digits.slice(-10)}%`)
  } else {
    q = q.ilike('name', `%${query}%`)
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
        c.preferred_cleaner_id
          ? supabaseAdmin
              .from('cleaners')
              .select('name')
              .eq('tenant_id', tid)
              .eq('id', c.preferred_cleaner_id)
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

async function handleListBookings(input: { date?: string; from_date?: string; to_date?: string; cleaner_id?: string }, tid: string): Promise<string> {
  const from = input.from_date || input.date
  const to = input.to_date || input.date
  if (!from || !to) return JSON.stringify({ error: 'provide date or from_date+to_date' })

  let q = supabaseAdmin
    .from('bookings')
    .select('id, status, payment_status, start_time, end_time, hourly_rate, team_size, max_hours, clients(name), cleaners(name, id)')
    .eq('tenant_id', tid)
    .gte('start_time', from + 'T00:00:00')
    .lte('start_time', to + 'T23:59:59')
    .order('start_time', { ascending: true })
    .limit(100)
  if (input.cleaner_id) q = q.eq('cleaner_id', input.cleaner_id)
  const { data, error } = await q
  if (error) return JSON.stringify({ error: error.message })

  // For team bookings (team_size > 1), pull the full team so Yinez can see
  // who's on each multi-cleaner job — not only the lead.
  const teamBookingIds = (data || []).filter(b => (b.team_size || 1) > 1).map(b => b.id)
  let teamMap: Record<string, { name: string; is_lead: boolean }[]> = {}
  if (teamBookingIds.length > 0) {
    const { data: teamRows } = await supabaseAdmin
      .from('booking_cleaners')
      .select('booking_id, is_lead, position, cleaners(name)')
      .eq('tenant_id', tid)
      .in('booking_id', teamBookingIds)
      .order('position', { ascending: true })
    teamMap = (teamRows || []).reduce((acc, r) => {
      const c = r.cleaners as unknown as { name?: string } | { name?: string }[] | null
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
    .from('cleaners')
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
          .eq('cleaner_id', c.id)
          .order('start_time', { ascending: false })
          .limit(5),
        supabaseAdmin
          .from('cleaner_payouts')
          .select('amount, status')
          .eq('tenant_id', tid)
          .eq('cleaner_id', c.id)
          .eq('status', 'pending'),
        supabaseAdmin
          .from('ratings')
          .select('cleaner_rating, service_rating, feedback, created_at')
          .eq('tenant_id', tid)
          .eq('cleaner_id', c.id)
          .order('created_at', { ascending: false })
          .limit(10),
      ])
      const owed = (payouts.data || []).reduce((s, p) => s + (Number(p.amount) || 0), 0)
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
  const { error } = await supabaseAdmin
    .from('bookings')
    .update({ cleaner_id: input.cleaner_id, status: 'scheduled' })
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
    const r = await sendSMS(client.phone, input.message, { skipConsent: true, smsType: 'admin_message', recipientType: 'client', recipientId: client.id })
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
    .from('cleaners')
    .select('id, name, phone')
    .eq('id', input.cleaner_id)
    .eq('tenant_id', tid)
    .maybeSingle()
  if (!cleaner?.phone) return JSON.stringify({ error: 'cleaner not found or no phone' })
  const r = await sendSMS(cleaner.phone, input.message, { skipConsent: true, smsType: 'admin_to_cleaner', recipientType: 'cleaner', recipientId: cleaner.id })
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
    const { data } = await supabaseAdmin.from('cleaners').select('phone, sms_consent').eq('tenant_id', tid).eq('sms_consent', true)
    phones = (data || []).filter((c) => c.phone).map((c) => c.phone as string)
  } else {
    return JSON.stringify({ error: 'unknown audience' })
  }

  let sent = 0, failed = 0
  for (const phone of phones) {
    try {
      await sendSMS(phone, input.message, { skipConsent: false, smsType: 'broadcast' })
      sent++
    } catch {
      failed++
    }
  }
  await smsAdmins(`Broadcast complete — ${sent} sent, ${failed} failed.`).catch(() => {})
  return JSON.stringify({ ok: true, audience: input.audience, recipients: phones.length, sent, failed })
}

async function handleCreateManualBooking(input: { client_id: string; date: string; time: string; service_type: string; hourly_rate: number; estimated_hours: number; cleaner_id?: string }, tid: string): Promise<string> {
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
      cleaner_id: null,
      suggested_cleaner_id: input.cleaner_id || null,
      service_type: input.service_type,
      hourly_rate: input.hourly_rate,
      price: priceCents,
      start_time: startISO,
      end_time: endISO,
      status: 'pending',
      payment_status: 'unpaid',
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
  // Whitelist mutable fields
  const allowed = ['status', 'payment_status', 'cleaner_id', 'hourly_rate', 'start_time', 'end_time', 'notes', 'service_type']
  const update: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input.fields || {})) {
    if (allowed.includes(k)) update[k] = v
  }
  if (Object.keys(update).length === 0) return JSON.stringify({ error: 'no allowed fields to update' })
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

  const note = `[REFUND APPROVED ${new Date().toISOString().slice(0, 10)} $${input.amount_dollars} — ${input.reason}]`
  await supabaseAdmin
    .from('bookings')
    .update({ notes: booking.notes ? `${booking.notes}\n${note}` : note, payment_status: 'refund_pending' })
    .eq('id', input.booking_id)
    .eq('tenant_id', tid)

  await notify({ type: 'refund_approved', title: `Refund approved — $${input.amount_dollars}`, message: `Booking ${input.booking_id}: ${input.reason}`, booking_id: input.booking_id }).catch(() => {})
  await smsAdmins(`✓ Refund approved: $${input.amount_dollars} for booking ${input.booking_id}. Reason: ${input.reason}. Process in Stripe.`).catch(() => {})
  return JSON.stringify({ ok: true, status: 'refund_approved_pending_processing', amount: input.amount_dollars })
}

async function handleMarkPaymentReceived(input: { booking_id: string; amount_dollars: number; method: string }, tid: string): Promise<string> {
  const cents = Math.round(input.amount_dollars * 100)
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, client_id')
    .eq('id', input.booking_id)
    .eq('tenant_id', tid)
    .maybeSingle()
  if (!booking) return JSON.stringify({ error: 'booking not found' })

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
  const { error } = await supabaseAdmin
    .from('cleaner_payouts')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', input.payout_id)
    .eq('tenant_id', tid)
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ ok: true, payout_id: input.payout_id })
}

async function handleBlockClient(input: { client_id: string; reason: string }, tid: string): Promise<string> {
  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('notes')
    .eq('id', input.client_id)
    .eq('tenant_id', tid)
    .maybeSingle()
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
    .from('cleaners')
    .insert({ tenant_id: tid, name: input.name, phone: input.phone, email: input.email || null, zone: input.zone || null, status: 'active', sms_consent: true })
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
  const { error } = await supabaseAdmin.from('cleaners').update(update).eq('id', input.cleaner_id).eq('tenant_id', tid)
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ ok: true, cleaner_id: input.cleaner_id, updated_fields: Object.keys(update) })
}

async function handleDeactivateCleaner(input: { cleaner_id: string; reason?: string }, tid: string): Promise<string> {
  const { error } = await supabaseAdmin.from('cleaners').update({ status: 'inactive' }).eq('id', input.cleaner_id).eq('tenant_id', tid)
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ ok: true, cleaner_id: input.cleaner_id, status: 'inactive', reason: input.reason })
}

async function handleListCleaners(input: { status?: string }, tid: string): Promise<string> {
  let q = supabaseAdmin.from('cleaners').select('id, name, phone, status, zone, hourly_rate').eq('tenant_id', tid)
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

async function handlePauseRecurring(input: { schedule_id: string; until_date?: string }, tid: string): Promise<string> {
  const { error } = await supabaseAdmin
    .from('recurring_schedules')
    .update({ status: 'paused', paused_until: input.until_date || null })
    .eq('id', input.schedule_id)
    .eq('tenant_id', tid)
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ ok: true, schedule_id: input.schedule_id, paused_until: input.until_date })
}

async function handleResumeRecurring(input: { schedule_id: string }, tid: string): Promise<string> {
  const { error } = await supabaseAdmin
    .from('recurring_schedules')
    .update({ status: 'active', paused_until: null })
    .eq('id', input.schedule_id)
    .eq('tenant_id', tid)
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ ok: true, schedule_id: input.schedule_id, status: 'active' })
}

async function handleCancelRecurring(input: { schedule_id: string; reason?: string }, tid: string): Promise<string> {
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

export async function handleUpdateDeal(input: { deal_id: string; fields: Record<string, unknown> }, tid: string): Promise<string> {
  const allowed = ['stage', 'value_dollars', 'follow_up_at', 'follow_up_note', 'notes']
  const update: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input.fields || {})) {
    if (k === 'value_dollars' && typeof v === 'number') {
      // deals' dollar-value column is value_cents, not value -- writing
      // "value" always errored (no such column), so every AI-driven
      // deal-value update via this tool has failed since the tool's
      // beginning; the human pipeline routes (deals/route.ts) have always
      // used value_cents correctly.
      update.value_cents = Math.round(v * 100)
    } else if (allowed.includes(k)) {
      update[k] = v
    }
  }
  if (Object.keys(update).length === 0) return JSON.stringify({ error: 'no allowed fields' })

  // Moving to 'sold' through this tool used to be a raw column flip with
  // none of POST /api/deals/[id]/stage's close-to-Sold side effects: no
  // probability=100, no closed_at (which sales-won-tab.tsx's default
  // this-month filter reads, falling back to a stale last_activity_at when
  // null), no stage_change activity log, and -- the same fulfillment-routing
  // gap items (87)/(92) fixed on the Stripe webhook and the manual Kanban
  // close -- no recurring_schedules series / Booking / Job created at all.
  // A deal Selena closed to Sold looked sold in the pipeline but nothing
  // ever got scheduled. Mirror the human close path's side effects here too.
  let fromStage: string | undefined
  const closingToSold = update.stage === 'sold'
  if (typeof update.stage === 'string') {
    const { data: existing } = await supabaseAdmin
      .from('deals').select('stage').eq('id', input.deal_id).eq('tenant_id', tid).maybeSingle()
    fromStage = existing?.stage
    if (closingToSold && fromStage && fromStage !== 'sold') {
      update.probability = 100
      update.closed_at = new Date().toISOString()
    }
  }

  const { error } = await supabaseAdmin.from('deals').update(update).eq('id', input.deal_id).eq('tenant_id', tid)
  if (error) return JSON.stringify({ error: error.message })

  if (typeof update.stage === 'string' && fromStage && fromStage !== update.stage) {
    await supabaseAdmin.from('deal_activities').insert({
      tenant_id: tid, deal_id: input.deal_id, type: 'stage_change',
      description: `Moved from ${fromStage} to ${update.stage}`,
      metadata: { from: fromStage, to: update.stage },
    })
  }

  if (closingToSold && fromStage && fromStage !== 'sold') {
    try {
      const { data: q } = await supabaseAdmin
        .from('quotes')
        .select('id, recurring_type, fulfillment_type')
        .eq('tenant_id', tid)
        .eq('deal_id', input.deal_id)
        .is('converted_job_id', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (q) {
        if (q.recurring_type) {
          const { createRecurringSeriesFromQuote } = await import('@/lib/sale-to-recurring')
          await createRecurringSeriesFromQuote(tid, q.id)
        } else if (q.fulfillment_type === 'booking') {
          const { createBookingFromQuote } = await import('@/lib/sale-to-booking')
          await createBookingFromQuote(tid, q.id)
        } else {
          const { convertSaleToJob } = await import('@/lib/jobs')
          await convertSaleToJob(tid, { type: 'quote', quoteId: q.id }, {})
        }
      }
    } catch (e) {
      console.warn('fulfillment creation on AI-bot sold failed', e)
    }
  }

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

async function handleListCleanerApplications(input: { status?: string }, tid: string): Promise<string> {
  let q = supabaseAdmin.from('cleaner_applications').select('*').eq('tenant_id', tid)
  const status = input.status || 'pending'
  if (status !== 'all') q = q.eq('status', status)
  const { data, error } = await q.order('created_at', { ascending: false }).limit(50)
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ count: (data || []).length, applications: data || [] })
}

async function handleApproveCleanerApplication(input: { application_id: string }, tid: string): Promise<string> {
  const { data: app } = await supabaseAdmin.from('cleaner_applications').select('*').eq('id', input.application_id).eq('tenant_id', tid).maybeSingle()
  if (!app) return JSON.stringify({ error: 'application not found' })
  // Create cleaner record from application
  const { data: cleaner, error: cErr } = await supabaseAdmin
    .from('cleaners')
    .insert({ tenant_id: tid, name: app.name, phone: app.phone, email: app.email || null, zone: app.zone || null, status: 'active', sms_consent: true })
    .select('id')
    .single()
  if (cErr || !cleaner) return JSON.stringify({ error: cErr?.message || 'cleaner insert failed' })
  await supabaseAdmin.from('cleaner_applications').update({ status: 'approved', approved_at: new Date().toISOString(), cleaner_id: cleaner.id }).eq('id', input.application_id).eq('tenant_id', tid)
  return JSON.stringify({ ok: true, application_id: input.application_id, cleaner_id: cleaner.id })
}

async function handleRejectCleanerApplication(input: { application_id: string; reason?: string }, tid: string): Promise<string> {
  const { error } = await supabaseAdmin
    .from('cleaner_applications')
    .update({ status: 'rejected', rejected_reason: input.reason || null, rejected_at: new Date().toISOString() })
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
    // Idempotency key: a retried tool call (LLM/tool-call retry on timeout)
    // for the same payment+amount hits the same Stripe refund instead of
    // creating a second real refund.
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
      amount: amountCents,
      reason: 'requested_by_customer',
      metadata: { booking_id: input.booking_id, note: input.reason || '' },
    }, {
      idempotencyKey: `selena-refund:${payment.id}:${amountCents}`,
    })
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

async function handleTriggerCron(input: { name: string }): Promise<string> {
  const allowed = ['reminders', 'rating-prompt', 'payment-reminder', 'confirmation-reminder', 'late-check-in', 'schedule-monitor', 'sales-follow-ups', 'outreach', 'generate-recurring', 'health-check', 'health-monitor']
  if (!allowed.includes(input.name)) return JSON.stringify({ error: `cron not allowed: ${input.name}` })
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

async function handleBlockCleanerDates(input: { cleaner_id: string; from_date: string; to_date: string; reason?: string }, tid: string): Promise<string> {
  const { error } = await supabaseAdmin.from('cleaner_blocks').insert({
    tenant_id: tid,
    cleaner_id: input.cleaner_id,
    from_date: input.from_date,
    to_date: input.to_date,
    reason: input.reason || null,
  })
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ ok: true, cleaner_id: input.cleaner_id, from_date: input.from_date, to_date: input.to_date })
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
