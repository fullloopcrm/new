import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/nycmaid/notify'
import { sendSMS as sendTelnyxSMS } from '@/lib/sms'

// nycmaid's well-known UUID — fallback when a conversation row pre-dates the
// tenant_id column. Phase 3.2 sweep: every tenant-scoped query in this file
// resolves tid from convo.tenant_id and falls back to this constant.
export const NYCMAID_TENANT_ID = '00000000-0000-0000-0000-000000000001'

// Every DB read/write in this file is tid-scoped, but SMS previously went
// out through @/lib/nycmaid/sms — hardcoded to nycmaid's own Telnyx account
// regardless of which tenant's conversation Yinez was handling. This fetches
// the real tenant's own creds; no-ops if that tenant hasn't configured
// Telnyx. Fixed 2026-07-24.
export async function sendSMS(tid: string, to: string, body: string): Promise<{ success: boolean; error?: unknown }> {
  const { data: tenant } = await supabaseAdmin.from('tenants').select('telnyx_api_key, telnyx_phone').eq('id', tid).single()
  if (!tenant?.telnyx_api_key || !tenant?.telnyx_phone) return { success: false, error: 'Telnyx not configured for tenant' }
  try {
    await sendTelnyxSMS({ to, body, telnyxApiKey: tenant.telnyx_api_key, telnyxPhone: tenant.telnyx_phone })
    return { success: true }
  } catch (error) {
    return { success: false, error }
  }
}

// ─── Error Monitoring ───────────────────────────────────────────────────────

export async function yinezError(context: string, err: unknown, conversationId?: string) {
  let message: string
  if (err instanceof Error) {
    message = err.message
  } else if (err && typeof err === 'object') {
    // Supabase errors: { message, code, details, hint }
    const e = err as Record<string, unknown>
    const parts = [e.message, e.code, e.details, e.hint].filter(Boolean)
    message = parts.length > 0 ? parts.join(' | ') : JSON.stringify(err)
  } else {
    message = String(err)
  }
  const stack = err instanceof Error ? err.stack?.split('\n').slice(0, 3).join('\n') : ''
  console.error(`[Yinez] ${context}:`, err)
  await notify({
    type: 'yinez_error',
    title: `Yinez Error — ${context}`,
    message: `${message}${conversationId ? `\nConversation: ${conversationId}` : ''}${stack ? `\n${stack}` : ''}`,
  }).catch(() => {})
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BookingChecklist {
  service_type: 'regular' | 'deep' | 'move_in_out' | 'airbnb' | 'emergency' | null
  bedrooms: number | null
  bathrooms: number | null
  rate: 49 | 59 | 65 | 69 | 75 | 79 | 89 | 99 | 100 | null
  day: string | null
  date: string | null
  time: string | null
  name: string | null
  phone: string | null
  address: string | null
  email: string | null
  notes: string | null
  rating: number | null
  status: 'greeting' | 'collecting' | 'recap' | 'confirmed' | 'rating' | 'closed'
  /**
   * Formalizes what voice-agent/customer-tools.ts was already bolting onto
   * this object ad-hoc (untyped, since the stored column is jsonb). Read at
   * create_booking time to tag bookings.source as yinez_sms vs yinez_voice.
   */
  channel?: 'sms' | 'voice'
}

export type Intent =
  | 'booking' | 'rebook' | 'emergency'
  | 'payment_confirm' | 'payment_question' | 'dispute'
  | 'account_help' | 'schedule_change' | 'cleaner_request'
  | 'feedback_positive' | 'feedback_negative'
  | 'casual' | 'question' | 'referral'
  | 'human_request' | 'not_interested'
  | 'greeting'

export interface YinezResult {
  text: string
  clientCreated?: boolean
  bookingCreated?: boolean
  checklist: BookingChecklist
  intent?: Intent
  isCleaner?: boolean
  debug?: string
}

export type NextStep = { field: string | null; instruction: string }

export const EMPTY_CHECKLIST: BookingChecklist = {
  service_type: null, bedrooms: null, bathrooms: null, rate: null,
  day: null, date: null, time: null, name: null, phone: null,
  address: null, email: null, notes: null, rating: null, status: 'greeting',
}

// ─── Anthropic Client ───────────────────────────────────────────────────────
// No module-level client — resolved per request from the conversation's tenant
// (its own key if set, platform key otherwise) in askSelena below.

// ════════════════════════════════════════════════════════════════════════════
// CLEANER DETECTION — Check if this phone belongs to staff, not a client
// ════════════════════════════════════════════════════════════════════════════

export async function isCleanerPhone(phone: string, tenantId: string): Promise<{ isCleaner: boolean; name?: string }> {
  const cleanPhone = phone.replace(/\D/g, '').slice(-10)
  if (!cleanPhone || cleanPhone.length < 7) return { isCleaner: false }

  // tenantId REQUIRED — always tenant-scope so this can never match another
  // tenant's team across the shared team_members table.
  const q = supabaseAdmin
    .from('team_members')
    .select('name')
    .eq('status', 'active')
    .eq('tenant_id', tenantId)
    .ilike('phone', `%${cleanPhone}%`)
    .limit(1)

  const { data } = await q

  if (data && data.length > 0) return { isCleaner: true, name: data[0].name }
  return { isCleaner: false }
}

// ════════════════════════════════════════════════════════════════════════════
// INTENT ROUTER — Classifies what the client wants BEFORE any flow
// ════════════════════════════════════════════════════════════════════════════

