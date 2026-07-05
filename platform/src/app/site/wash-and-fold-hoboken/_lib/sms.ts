import { supabaseAdmin } from '@/app/site/wash-and-fold-hoboken/_lib/supabase'

const TELNYX_API_KEY = process.env.TELNYX_API_KEY?.replace(/\s/g, '')
const TELNYX_FROM_NUMBER = (process.env.TELNYX_FROM_NUMBER || '+18883164019').replace(/\s/g, '')

interface SMSResult {
  success: boolean
  id?: string
  error?: unknown
}

export async function sendSMS(to: string, message: string, options?: { skipConsent?: boolean; recipientType?: 'client' | 'cleaner'; recipientId?: string; smsType?: string; bookingId?: string }): Promise<SMSResult> {
  if (!TELNYX_API_KEY) {
    console.error('TELNYX_API_KEY not set')
    return { success: false, error: 'TELNYX_API_KEY not configured' }
  }

  // Normalize phone to E.164
  const cleanPhone = normalizePhone(to)
  if (!cleanPhone) {
    return { success: false, error: 'Invalid phone number' }
  }

  // Check SMS consent unless explicitly skipped (admin messages skip consent)
  if (!options?.skipConsent && options?.recipientType && options?.recipientId) {
    const hasConsent = await checkSMSConsent(options.recipientType, options.recipientId)
    if (!hasConsent) {
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
          from: TELNYX_FROM_NUMBER,
          to: cleanPhone,
          text: message,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        // Don't retry validation errors
        if (res.status === 400 || res.status === 422) {
          console.error('SMS validation error:', data)
          return { success: false, error: data }
        }
        if (attempt < maxRetries - 1) {
          await new Promise(r => setTimeout(r, delays[attempt]))
          continue
        }
        console.error('SMS error after retries:', data)
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

      return { success: true, id: messageId }
    } catch (err) {
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, delays[attempt]))
        continue
      }
      console.error('SMS exception after retries:', err)
      return { success: false, error: err }
    }
  }
  return { success: false, error: 'Max retries exceeded' }
}

function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return '+1' + digits
  if (digits.length === 11 && digits[0] === '1') return '+' + digits
  if (digits.length > 11 && digits[0] === '1') return '+' + digits.slice(0, 11)
  if (phone.startsWith('+') && digits.length >= 10) return '+' + digits
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
