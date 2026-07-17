/**
 * Communications preferences — reads/normalizes a tenant's per-comm settings
 * out of `tenants.notification_preferences` (jsonb) against the canonical
 * registry (lib/comms-registry.ts).
 *
 * This is the gate every send path will consult in Phase 2 via
 * `isCommEnabled(tenantId, key, channel)`. Defining it now is inert — nothing
 * in the send paths calls it yet.
 *
 * Stored shape:
 *   {
 *     comms:  { <key>: { email?, sms?, in_app?, template?: {subject?, body?} } },
 *     timing: { reminder_days?, reminder_hours_before?, review_delay_hours?, ... }
 *   }
 *
 * Legacy: earlier code stored a flat { <key>: {email,sms,in_app} } map with no
 * `comms` wrapper. normalizePrefs() detects that and folds it in so no tenant's
 * existing choices are lost.
 */
import { supabaseAdmin } from './supabase'
import {
  COMMS,
  COMMS_BY_KEY,
  COMM_TIMING,
  type CommChannel,
  type CommTimingKey,
} from './comms-registry'
import { hasTenantSms } from './sms-credentials'

export interface CommChannelPrefs {
  email?: boolean
  sms?: boolean
  in_app?: boolean
  template?: { subject?: string; body?: string }
}

export type CommTiming = {
  reminder_days: number[]
  reminder_hours_before: number[]
  review_delay_hours: number
  daily_summary_hour: number
  payment_reminder_hours: number
}

export interface CommPreferences {
  comms: Record<string, CommChannelPrefs>
  timing: CommTiming
}

export interface CommCapabilities {
  /** Email can be sent (tenant Resend key or platform fallback). */
  email: boolean
  /** SMS can be sent (tenant Telnyx key + phone, or platform fallback). */
  sms: boolean
}

// ─── Defaults ───────────────────────────────────────────────────────────────

export function defaultCommTiming(): CommTiming {
  return {
    reminder_days: [...(COMM_TIMING.reminder_days.default as number[])],
    reminder_hours_before: [...(COMM_TIMING.reminder_hours_before.default as number[])],
    review_delay_hours: COMM_TIMING.review_delay_hours.default as number,
    daily_summary_hour: COMM_TIMING.daily_summary_hour.default as number,
    payment_reminder_hours: COMM_TIMING.payment_reminder_hours.default as number,
  }
}

export function defaultCommPrefs(): CommPreferences {
  const comms: Record<string, CommChannelPrefs> = {}
  for (const def of COMMS) {
    comms[def.key] = { ...def.defaults }
  }
  return { comms, timing: defaultCommTiming() }
}

// ─── Normalize (merge stored over defaults, migrate legacy) ──────────────────

function looksLegacyFlat(raw: Record<string, unknown>): boolean {
  if (raw.comms || raw.timing) return false
  // A flat legacy map is { some_key: { email/sms/in_app } , ... }
  return Object.values(raw).some(
    (v) =>
      v && typeof v === 'object' &&
      ('email' in (v as object) || 'sms' in (v as object) || 'in_app' in (v as object)),
  )
}

export function normalizePrefs(raw: unknown): CommPreferences {
  const base = defaultCommPrefs()
  if (!raw || typeof raw !== 'object') return base

  const obj = raw as Record<string, unknown>
  const storedComms: Record<string, unknown> = looksLegacyFlat(obj)
    ? obj
    : ((obj.comms as Record<string, unknown>) || {})
  const storedTiming = (obj.timing as Record<string, unknown>) || {}

  for (const [key, val] of Object.entries(storedComms)) {
    if (!val || typeof val !== 'object') continue
    if (!COMMS_BY_KEY[key]) continue // drop unknown keys
    base.comms[key] = { ...base.comms[key], ...(val as CommChannelPrefs) }
  }

  for (const tk of Object.keys(base.timing) as CommTimingKey[]) {
    const v = storedTiming[tk]
    if (Array.isArray(v)) {
      base.timing[tk] = v.filter((n) => typeof n === 'number') as never
    } else if (typeof v === 'number') {
      base.timing[tk] = v as never
    }
  }

  return base
}

// ─── Loaders ─────────────────────────────────────────────────────────────────

export async function getCommPrefs(tenantId: string): Promise<CommPreferences> {
  const { data } = await supabaseAdmin
    .from('tenants')
    .select('notification_preferences')
    .eq('id', tenantId)
    .single()
  return normalizePrefs(data?.notification_preferences)
}

/**
 * Is this comm enabled on this channel for this tenant?
 * Locked (transactional) comms are always enabled on their supported channels.
 * Phase-2 send paths call this before sending.
 */
export async function isCommEnabled(
  tenantId: string,
  key: string,
  channel: CommChannel,
): Promise<boolean> {
  const def = COMMS_BY_KEY[key]
  if (!def) return true // unknown key: fail-open, don't silently drop mail
  if (!def.channels.includes(channel)) return false
  if (def.locked) return true
  const prefs = await getCommPrefs(tenantId)
  return prefs.comms[key]?.[channel] ?? def.defaults[channel] ?? false
}

export async function getCommTiming(tenantId: string): Promise<CommTiming> {
  return (await getCommPrefs(tenantId)).timing
}

export async function getCommTemplate(
  tenantId: string,
  key: string,
): Promise<{ subject?: string; body?: string } | null> {
  const prefs = await getCommPrefs(tenantId)
  return prefs.comms[key]?.template || null
}

// ─── Capabilities (does the tenant have the keys to actually send?) ──────────

export function deriveCapabilities(tenant: {
  resend_api_key?: string | null
  telnyx_api_key?: string | null
  telnyx_phone?: string | null
  sms_number?: string | null
}): CommCapabilities {
  const platformEmail =
    !!process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'placeholder'
  return {
    email: !!tenant.resend_api_key || platformEmail,
    sms: hasTenantSms(tenant),
  }
}

// maybeSingle() (not single()), error checked explicitly — same masked-error
// pattern already fixed in tenant.ts/tenant-query.ts/the notifications route
// above. `error` used to be discarded (only `data` was destructured), so a
// genuine DB failure looked identical to "no api keys configured" and
// silently returned all-capabilities-off instead of surfacing loud.
export async function getCapabilities(tenantId: string): Promise<CommCapabilities> {
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('resend_api_key, telnyx_api_key, telnyx_phone, sms_number')
    .eq('id', tenantId)
    .maybeSingle()
  if (error) {
    console.error(`TENANT_CAPABILITIES_LOOKUP_ERROR tenant_id=${tenantId} error=${error.message}`)
    throw new Error(`TENANT_CAPABILITIES_LOOKUP_ERROR tenant_id=${tenantId} error=${error.message}`)
  }
  return deriveCapabilities(data || {})
}
