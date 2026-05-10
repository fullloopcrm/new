import { supabaseAdmin } from '@/lib/supabase'

const TELNYX_API_KEY = process.env.TELNYX_API_KEY?.replace(/\s/g, '')
const TELNYX_FROM_NUMBER = (process.env.TELNYX_FROM_NUMBER || '+18883164019').replace(/\s/g, '')

async function logSMSFailure(to: string, smsType: string | undefined, error: unknown) {
  try {
    const errMsg = typeof error === 'string' ? error : (error as any)?.message || JSON.stringify(error)
    const truncated = (errMsg || 'unknown error').slice(0, 400)
    await supabaseAdmin.from('notifications').insert({
      type: 'comms_fail',
      title: 'SMS send failed',
      message: `sms to ${to} | type=${smsType || 'unspecified'} | error=${truncated}`,
    })
  } catch {
    // never throw from the logger
  }
}

interface SMSResult {
  success: boolean
  id?: string
  error?: unknown
}

// Global circuit breaker — block any code path from flooding clients.
// Tracks successful outbound SMS timestamps in memory. If more than
// CIRCUIT_MAX sends happen in CIRCUIT_WINDOW_MS, pause new sends and
// alert admin once. Manual override via skipCircuit if Jeff is doing
// something legit (broadcast). The 157-SMS blast on 4/29 is the kind
// of thing this catches.
const CIRCUIT_WINDOW_MS = 60 * 1000
const CIRCUIT_MAX = 25
const sentTimestamps: number[] = []
let circuitAlertedAt = 0
function checkCircuit(): boolean {
  const now = Date.now()
  while (sentTimestamps.length && sentTimestamps[0] < now - CIRCUIT_WINDOW_MS) sentTimestamps.shift()
  return sentTimestamps.length >= CIRCUIT_MAX
}
async function tripCircuit(reason: string) {
  const now = Date.now()
  if (now - circuitAlertedAt < 60 * 60 * 1000) return // dedupe alerts to once/hour
  circuitAlertedAt = now
  try {
    const { smsAdmins } = await import('@/lib/nycmaid/admin-contacts')
    const { supabaseAdmin } = await import('@/lib/supabase')
    await supabaseAdmin.from('notifications').insert({
      type: 'sms_circuit_breaker',
      title: 'SMS circuit breaker tripped',
      message: `Blocked outbound SMS — ${sentTimestamps.length} sends in last ${CIRCUIT_WINDOW_MS / 1000}s. ${reason}`,
    })
    // Use a separate admin channel that bypasses the breaker by skipping
    // the wrapper entirely. smsAdmins isn't a client send.
    await smsAdmins(`⚠️ SMS circuit breaker — ${sentTimestamps.length} client sends in 60s. Outbound paused. Check admin dashboard.`).catch(() => {})
  } catch {}
}

export async function sendSMS(to: string, message: string, options?: { skipConsent?: boolean; recipientType?: 'client' | 'cleaner'; recipientId?: string; smsType?: string; bookingId?: string; skipCircuit?: boolean; from?: string }): Promise<SMSResult> {
  if (!TELNYX_API_KEY) {
    console.error('TELNYX_API_KEY not set')
    await logSMSFailure(to, options?.smsType, 'TELNYX_API_KEY not configured')
    return { success: false, error: 'TELNYX_API_KEY not configured' }
  }

  // Circuit breaker — refuse to send if we just sent CIRCUIT_MAX in the
  // last minute. Caller can override with skipCircuit (admin alerts use it).
  if (!options?.skipCircuit && checkCircuit()) {
    await tripCircuit(`type=${options?.smsType || 'unknown'} to=${to.slice(-4)}`)
    await logSMSFailure(to, options?.smsType, 'Circuit breaker — too many SMS in last 60s')
    return { success: false, error: 'Circuit breaker open' }
  }

  // Normalize phone to E.164
  const cleanPhone = normalizePhone(to)
  if (!cleanPhone) {
    await logSMSFailure(to, options?.smsType, 'Invalid phone number')
    return { success: false, error: 'Invalid phone number' }
  }

  // Check SMS consent unless explicitly skipped (admin messages skip consent)
  if (!options?.skipConsent && options?.recipientType && options?.recipientId) {
    const hasConsent = await checkSMSConsent(options.recipientType, options.recipientId)
    if (!hasConsent) {
      // Consent absence is expected behavior, not a failure worth alerting on.
      return { success: false, error: 'No SMS consent' }
    }
  }

  const maxRetries = 3
  const delays = [1000, 2000, 4000]

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch('https://api.telnyx.com/v2/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TELNYX_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: options?.from?.trim() || TELNYX_FROM_NUMBER,
          to: cleanPhone,
          text: message,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        // Don't retry validation errors
        if (res.status === 400 || res.status === 422) {
          console.error('SMS validation error:', data)
          await logSMSFailure(cleanPhone, options?.smsType, data)

          // Auto-opt-out on STOP-block (Telnyx 40300). The carrier won't
          // deliver again until the recipient texts START, so flip
          // sms_consent off on the matching client/cleaner so future
          // sends short-circuit at the consent check instead of producing
          // a new failure notification each time.
          const errs = (data as { errors?: { code?: string }[] }).errors || []
          const isStopBlock = errs.some(e => String(e.code) === '40300')
          if (isStopBlock) {
            try {
              if (options?.recipientType && options?.recipientId) {
                await supabaseAdmin
                  .from(options.recipientType === 'client' ? 'clients' : 'cleaners')
                  .update({ sms_consent: false })
                  .eq('id', options.recipientId)
              } else {
                // No recipient ID supplied — flip every client/cleaner row
                // with this phone (best-effort).
                const last10 = cleanPhone.replace(/\D/g, '').slice(-10)
                await supabaseAdmin.from('clients').update({ sms_consent: false }).ilike('phone', `%${last10}%`)
                await supabaseAdmin.from('cleaners').update({ sms_consent: false }).ilike('phone', `%${last10}%`)
              }
            } catch (e) {
              console.error('Auto-opt-out on STOP failed:', e)
            }
          }

          return { success: false, error: data }
        }
        if (attempt < maxRetries - 1) {
          await new Promise(r => setTimeout(r, delays[attempt]))
          continue
        }
        console.error('SMS error after retries:', data)
        await logSMSFailure(cleanPhone, options?.smsType, data)
        return { success: false, error: data }
      }

      const messageId = data.data?.id

      // Log SMS
      if (options?.smsType) {
        try {
          await supabaseAdmin.from('sms_logs').insert({
            booking_id: options.bookingId || null,
            sms_type: options.smsType,
            recipient: cleanPhone,
            telnyx_message_id: messageId || null,
            status: 'sent',
          })
        } catch (logErr) {
          console.error('SMS log error:', logErr)
        }
      }

      // Track successful sends for the circuit breaker.
      sentTimestamps.push(Date.now())
      return { success: true, id: messageId }
    } catch (err) {
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, delays[attempt]))
        continue
      }
      console.error('SMS exception after retries:', err)
      await logSMSFailure(cleanPhone, options?.smsType, err)
      return { success: false, error: err }
    }
  }
  await logSMSFailure(cleanPhone, options?.smsType, 'Max retries exceeded')
  return { success: false, error: 'Max retries exceeded' }
}

function normalizePhone(phone: string): string | null {
  // Strip Unicode bidirectional control chars (LRM/RLM/LRE/RLE/PDF/LRO/RLO/LRI/RLI/FSI/PDI)
  // and zero-width chars that come from copy-paste from contacts/iOS
  const cleaned = phone.replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '')
  const digits = cleaned.replace(/\D/g, '')
  if (digits.length === 10) return '+1' + digits
  if (digits.length === 11 && digits[0] === '1') return '+' + digits
  if (digits.length > 11 && digits[0] === '1') return '+' + digits.slice(0, 11)
  if (cleaned.startsWith('+') && digits.length >= 10) return '+' + digits
  return null
}

async function checkSMSConsent(type: 'client' | 'cleaner', id: string): Promise<boolean> {
  const table = type === 'client' ? 'clients' : 'cleaners'
  const { data } = await supabaseAdmin
    .from(table)
    .select('sms_consent')
    .eq('id', id)
    .single()
  // Default to true if column doesn't exist yet or is null (opt-out model)
  return data?.sms_consent !== false
}
