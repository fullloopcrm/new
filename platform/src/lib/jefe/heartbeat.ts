// Jefe heartbeat — the push loop that makes Jefe Jeff's eyes and ears.
// Runs on a cron, evaluates platform health against thresholds, and messages
// the group UNPROMPTED when something newly breaks. Dedups against the last
// snapshot so steady-state problems don't spam — only NEW or escalated alerts
// fire. State lives in jefe_snapshots (no tenant_id; platform-level).
import { supabaseAdmin } from '@/lib/supabase'
import { sendTelegram } from '@/lib/telegram'
import { getPlatformHealth } from '@/lib/jefe/health'

interface Alert {
  fp: string // stable fingerprint for dedup
  label: string // human line for the message
}

interface SnapshotMeta {
  fully_unprovisioned: number
  success_rate: number
}

// Thresholds — tuned to surface real fires, not noise.
const COMMS_MIN_FAILS = 10 // ignore tiny samples
const COMMS_FLOOR = 50 // success_rate below this = alert
const ERROR_SPIKE_1H = 10
const STUCK_PAYMENTS = 5
const SECURITY_EVENTS_24H = 20

function evaluate(h: Awaited<ReturnType<typeof getPlatformHealth>>, prev: SnapshotMeta | null): Alert[] {
  const alerts: Alert[] = []

  if (h.comms.failed_24h >= COMMS_MIN_FAILS && h.comms.success_rate < COMMS_FLOOR) {
    alerts.push({ fp: 'comms:low', label: `Comms deliverability ${h.comms.success_rate}% — ${h.comms.failed_24h} failed in 24h` })
  }
  for (const c of h.crons.silent) {
    alerts.push({ fp: `cron:${c.name}`, label: `Cron silent: ${c.name} (${c.silent_hours ?? 'never'}h, expected every ${c.expected_hours}h)` })
  }
  if (h.errors.last_1h >= ERROR_SPIKE_1H) {
    alerts.push({ fp: 'errors:spike', label: `Error spike: ${h.errors.last_1h} errors in the last hour` })
  }
  if (h.payments.stuck_unpaid_24h >= STUCK_PAYMENTS) {
    alerts.push({ fp: 'payments:stuck', label: `${h.payments.stuck_unpaid_24h} completed jobs unpaid >24h` })
  }
  if (h.security.events_24h >= SECURITY_EVENTS_24H) {
    alerts.push({ fp: 'security:events', label: `${h.security.events_24h} security events in 24h` })
  }
  // Provisioning is mostly steady-state (alerting every run would spam). Only
  // fire when MORE tenants become non-operational than last snapshot.
  if (prev && h.provisioning.fully_unprovisioned > prev.fully_unprovisioned) {
    alerts.push({
      fp: 'provision:worse',
      label: `Non-operational tenants rose to ${h.provisioning.fully_unprovisioned} (was ${prev.fully_unprovisioned})`,
    })
  }

  return alerts
}

export interface HeartbeatResult {
  alerts_active: number
  alerts_new: number
  sent: boolean
  send_ok?: boolean
}

export async function runHeartbeat(now: Date = new Date()): Promise<HeartbeatResult> {
  const h = await getPlatformHealth(now)

  // Last snapshot for dedup + provisioning delta.
  const { data: lastRows } = await supabaseAdmin
    .from('jefe_snapshots')
    .select('active_alerts, meta')
    .order('created_at', { ascending: false })
    .limit(1)
  const last = lastRows?.[0] as { active_alerts: Alert[] | null; meta: SnapshotMeta | null } | undefined
  const prevMeta = last?.meta ?? null
  const prevFps = new Set((last?.active_alerts ?? []).map((a) => a.fp))

  const alerts = evaluate(h, prevMeta)
  const newAlerts = alerts.filter((a) => !prevFps.has(a.fp))

  const meta: SnapshotMeta = { fully_unprovisioned: h.provisioning.fully_unprovisioned, success_rate: h.comms.success_rate }
  await supabaseAdmin.from('jefe_snapshots').insert({ active_alerts: alerts, meta })

  if (newAlerts.length === 0) {
    return { alerts_active: alerts.length, alerts_new: 0, sent: false }
  }

  const lines = newAlerts.map((a) => `• ${a.label}`).join('\n')
  const message = `🔴 Jefe — new platform alert${newAlerts.length > 1 ? 's' : ''}:\n${lines}\n\nReply "status" for the full picture.`
  const chatId = (process.env.JEFE_OWNER_CHAT_ID || process.env.TELEGRAM_OWNER_CHAT_ID || '').trim()
  const token = (process.env.JEFE_BOT_TOKEN || '').trim()

  if (!chatId || !token) {
    return { alerts_active: alerts.length, alerts_new: newAlerts.length, sent: false }
  }

  const send = await sendTelegram(chatId, message, token)
  return { alerts_active: alerts.length, alerts_new: newAlerts.length, sent: true, send_ok: send.ok }
}
