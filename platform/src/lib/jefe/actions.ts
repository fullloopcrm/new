// Jefe — action layer. Lets the platform GM DO things on Jeff's behalf, not just
// report. Every outbound/destructive action is CONFIRM-GATED: the function
// returns a preview when `confirm` is false and only executes when `confirm` is
// true. Read-only lookups run immediately.
//
// Platform-level ONLY: Jefe contacts a tenant's OWNER (never their clients), and
// never runs a tenant's day-to-day ops. Respects no_client_sms / no_mass_sms.
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'
import { sendEmail } from '@/lib/email'

const has = (v: string | null | undefined): boolean => typeof v === 'string' && v.trim().length > 0

const PROD_BASE = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://homeservicesbusinesscrm.com').replace(/\/$/, '')

// Crons Jefe is allowed to re-fire (mirrors vercel.json). Guards against hitting
// arbitrary routes via a crafted name.
const RERUNNABLE_CRONS = new Set([
  'generate-recurring', 'reminders', 'daily-summary', 'confirmations', 'lifecycle',
  'follow-up', 'health-check', 'system-check', 'late-check-in', 'schedule-monitor',
  'payment-reminder', 'email-monitor', 'sales-follow-ups', 'post-job-followup',
  'no-show-check', 'health-monitor', 'comms-monitor', 'rating-prompt',
  'confirmation-reminder', 'anthropic-health',
])

interface TenantRow {
  id: string
  name: string
  slug: string | null
  status: string | null
  telnyx_api_key: string | null
  telnyx_phone: string | null
  sms_number: string | null
  resend_api_key: string | null
  resend_domain: string | null
  email_from: string | null
  stripe_api_key: string | null
  agent_name: string | null
  telegram_bot_token: string | null
  owner_name: string | null
  owner_email: string | null
  owner_phone: string | null
}

const TENANT_COLS =
  'id, name, slug, status, telnyx_api_key, telnyx_phone, sms_number, resend_api_key, resend_domain, email_from, stripe_api_key, agent_name, telegram_bot_token, owner_name, owner_email, owner_phone'

async function findTenant(identifier: string): Promise<TenantRow | null> {
  const id = (identifier || '').trim()
  if (!id) return null
  // Exact slug first, then a name contains-match.
  const bySlug = await supabaseAdmin.from('tenants').select(TENANT_COLS).eq('slug', id).limit(1)
  if (bySlug.data && bySlug.data.length > 0) return bySlug.data[0] as TenantRow
  const byName = await supabaseAdmin.from('tenants').select(TENANT_COLS).ilike('name', `%${id}%`).limit(2)
  if (byName.data && byName.data.length === 1) return byName.data[0] as TenantRow
  // Ambiguous or none.
  return null
}

// ---- 1. provision_checklist (READ-ONLY) ----
export async function provisionChecklist(identifier: string) {
  const t = await findTenant(identifier)
  if (!t) return { ok: false, error: `No single tenant matched "${identifier}". Use the exact slug or name.` }
  const checks: Array<{ key: string; field: string; present: boolean }> = [
    { key: 'SMS (Telnyx)', field: 'telnyx_api_key', present: has(t.telnyx_api_key) },
    { key: 'SMS number', field: 'telnyx_phone/sms_number', present: has(t.telnyx_phone) || has(t.sms_number) },
    { key: 'Email (Resend)', field: 'resend_api_key', present: has(t.resend_api_key) },
    { key: 'Payments (Stripe)', field: 'stripe_api_key', present: has(t.stripe_api_key) },
    { key: 'Agent name', field: 'agent_name', present: has(t.agent_name) },
    { key: 'Telegram bot', field: 'telegram_bot_token', present: has(t.telegram_bot_token) },
  ]
  return {
    ok: true,
    tenant: t.name,
    slug: t.slug,
    missing: checks.filter((c) => !c.present).map((c) => `${c.key} (${c.field})`),
    present: checks.filter((c) => c.present).map((c) => c.key),
    owner_contact: { name: t.owner_name, email: t.owner_email, phone: t.owner_phone },
  }
}

// ---- 2. notify_tenant_owner (CONFIRM-GATED outbound) ----
// Picks the tenant's OWN channel (their telnyx/resend). If unprovisioned, returns
// the owner's contact so Jeff can reach them manually — never silently no-ops.
export async function notifyTenantOwner(identifier: string, message: string, confirm: boolean) {
  const t = await findTenant(identifier)
  if (!t) return { ok: false, error: `No single tenant matched "${identifier}". Use the exact slug or name.` }
  if (!has(message)) return { ok: false, error: 'message is empty' }

  const fromNumber = t.telnyx_phone || t.sms_number || ''
  const canSms = has(t.telnyx_api_key) && has(fromNumber) && has(t.owner_phone)
  const canEmail = has(t.resend_api_key) && has(t.owner_email)
  const channel: 'sms' | 'email' | 'none' = canSms ? 'sms' : canEmail ? 'email' : 'none'

  if (channel === 'none') {
    return {
      ok: false,
      channel: 'none',
      reason: 'Tenant has no working SMS or email channel.',
      manual_contact: { name: t.owner_name, email: t.owner_email, phone: t.owner_phone },
      tenant: t.name,
    }
  }

  const to = channel === 'sms' ? (t.owner_phone as string) : (t.owner_email as string)

  if (!confirm) {
    return { ok: true, preview: true, tenant: t.name, channel, to, draft: message }
  }

  try {
    if (channel === 'sms') {
      await sendSMS({ to, body: message, telnyxApiKey: t.telnyx_api_key as string, telnyxPhone: fromNumber })
    } else {
      const from = has(t.email_from) ? (t.email_from as string) : undefined
      const html = `<div style="font-family:sans-serif;font-size:15px;white-space:pre-wrap;">${message.replace(/</g, '&lt;')}</div>`
      await sendEmail({ to, subject: `A note from Full Loop`, html, from, resendApiKey: t.resend_api_key })
    }
    return { ok: true, sent: true, tenant: t.name, channel, to }
  } catch (err) {
    return { ok: false, error: (err instanceof Error ? err.message : String(err)).slice(0, 300), tenant: t.name, channel }
  }
}

// ---- 3. rerun_cron (CONFIRM-GATED) ----
export async function rerunCron(name: string, confirm: boolean) {
  const n = (name || '').trim()
  if (!RERUNNABLE_CRONS.has(n)) {
    return { ok: false, error: `"${n}" is not a re-runnable cron. Known: ${[...RERUNNABLE_CRONS].join(', ')}` }
  }
  if (!confirm) return { ok: true, preview: true, action: `fire cron /api/cron/${n}` }
  const secret = process.env.CRON_SECRET
  if (!secret) return { ok: false, error: 'CRON_SECRET not configured' }
  try {
    const res = await fetch(`${PROD_BASE}/api/cron/${n}`, { headers: { Authorization: `Bearer ${secret}` } })
    const bodyText = (await res.text()).slice(0, 300)
    return { ok: res.ok, status: res.status, cron: n, response: bodyText }
  } catch (err) {
    return { ok: false, error: (err instanceof Error ? err.message : String(err)).slice(0, 300), cron: n }
  }
}

// ---- 4. ack_issue ----
// Records an acknowledgement so a surfaced issue stops nagging. health.ts can
// later exclude acked notification ids; for now this persists the ack.
export async function ackIssue(issueId: string, kind?: string) {
  const id = (issueId || '').trim()
  if (!id) return { ok: false, error: 'issue id is required' }
  const { error } = await supabaseAdmin.from('jefe_acks').insert({ issue_id: id, kind: kind || null, acknowledged_by: 'jefe' })
  if (error) return { ok: false, error: error.message }
  return { ok: true, acked: id }
}

// ---- 5. create_task / list_tasks ----
export async function createTask(title: string, detail?: string, tenantIdentifier?: string) {
  if (!has(title)) return { ok: false, error: 'title is required' }
  let tenant_id: string | null = null
  let tenant_name: string | null = null
  if (has(tenantIdentifier)) {
    const t = await findTenant(tenantIdentifier as string)
    if (t) {
      tenant_id = t.id
      tenant_name = t.name
    }
  }
  const { data, error } = await supabaseAdmin
    .from('jefe_tasks')
    .insert({ title, detail: detail || null, tenant_id })
    .select('id')
    .limit(1)
  if (error) return { ok: false, error: error.message }
  return { ok: true, created: true, id: data?.[0]?.id, title, tenant: tenant_name }
}

export async function listTasks() {
  const { data, error } = await supabaseAdmin
    .from('jefe_tasks')
    .select('id, title, detail, tenant_id, created_at')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) return { ok: false, error: error.message }
  return { ok: true, open_tasks: data || [] }
}

// ---- 6. retry_failed_notifications (PREVIEW-ONLY for now) ----
// Auto-resend is deliberately NOT enabled yet: blind re-sending of failed
// notifications risks the no_mass_sms rule (fan-out, no idempotency floor).
// This returns the failed set so Jeff can decide; execution is a follow-up once
// per-send caps + idempotency are designed.
export async function retryFailedNotifications(identifier?: string, sinceHours = 24) {
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString()
  let query = supabaseAdmin
    .from('notifications')
    .select('tenant_id, channel, type')
    .eq('status', 'failed')
    .gte('created_at', since)
    .limit(2000)
  let tenantName: string | null = null
  if (has(identifier)) {
    const t = await findTenant(identifier as string)
    if (!t) return { ok: false, error: `No single tenant matched "${identifier}".` }
    tenantName = t.name
    query = query.eq('tenant_id', t.id)
  }
  const { data, error } = await query
  if (error) return { ok: false, error: error.message }
  const rows = data || []
  const byChannel: Record<string, number> = {}
  for (const r of rows) byChannel[(r as { channel: string | null }).channel || 'unknown'] = (byChannel[(r as { channel: string | null }).channel || 'unknown'] || 0) + 1
  return {
    ok: true,
    execution_enabled: false,
    note: 'Preview only — auto-resend is disabled pending safety caps (no_mass_sms). This shows what would be retried.',
    scope: tenantName || 'all tenants',
    since_hours: sinceHours,
    failed_count: rows.length,
    by_channel: byChannel,
  }
}

// ---- Jefe's own conversation history (multi-turn confirm-then-act) ----
export async function loadJefeHistory(limit = 10): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  const { data } = await supabaseAdmin
    .from('jefe_messages')
    .select('role, content')
    .order('created_at', { ascending: false })
    .limit(limit)
  const rows = (data || []) as Array<{ role: 'user' | 'assistant'; content: string }>
  return rows.reverse()
}

export async function saveJefeTurn(role: 'user' | 'assistant', content: string): Promise<void> {
  if (!has(content)) return
  await supabaseAdmin.from('jefe_messages').insert({ role, content: content.slice(0, 8000) })
}
