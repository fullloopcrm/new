import { NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/nycmaid/email'
import { protectCronAPI } from '@/lib/nycmaid/auth'
import { validateUsPhone } from '@/lib/nycmaid/phone-validator'
import { emailWrapper } from '@/lib/nycmaid/email-templates'

// Daily scan: find cleaners with invalid phones, email each a signed link to
// /team/update-phone?token=... so they can self-correct. Dedupe via
// phone_fix_email_sent_at — re-email no more than every 7 days. Hard cap of
// 10 sends per run to prevent fan-out (157-SMS-blast precedent).

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const TOKEN_EXPIRY_MS = SEVEN_DAYS_MS
const CAP = 10

function signToken(cleanerId: string): string {
  const expiry = Date.now() + TOKEN_EXPIRY_MS
  const payload = `${cleanerId}.${expiry}`
  const sig = createHmac('sha256', process.env.ADMIN_PASSWORD || '').update(payload).digest('hex')
  return `${payload}.${sig}`
}

export async function GET(request: Request) {
  const authError = protectCronAPI(request)
  if (authError) return authError

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://www.thenycmaid.com'
  const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS).toISOString()

  const { data: cleaners } = await supabaseAdmin
    .from('cleaners')
    .select('id, name, email, phone')
    .eq('active', true)

  // Dedupe via notifications table — avoids needing a new column on cleaners.
  // Any cleaner with a phone_fix_email row in the last 7 days is skipped.
  const { data: recentNotifs } = await supabaseAdmin
    .from('notifications')
    .select('message')
    .eq('type', 'phone_fix_email')
    .gte('created_at', sevenDaysAgo)
  const recentlyEmailedIds = new Set(
    (recentNotifs || []).map(n => (n.message || '').match(/cleaner_id=([0-9a-f-]+)/i)?.[1]).filter(Boolean) as string[]
  )

  const candidates = (cleaners || []).filter(c => {
    if (!c.email) return false
    if (validateUsPhone(c.phone).valid) return false
    if (recentlyEmailedIds.has(c.id)) return false
    return true
  })

  const toEmail = candidates.slice(0, CAP)
  const skipped = Math.max(0, candidates.length - CAP)

  let sent = 0
  const errors: string[] = []
  for (const c of toEmail) {
    try {
      const token = signToken(c.id)
      const link = `${baseUrl}/team/update-phone?token=${token}`
      const html = emailWrapper(`
        <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #1a1a1a;">We can't text you — please confirm your number</h2>
        <p style="margin: 0 0 12px 0; font-size: 15px; color: #333; line-height: 1.6;">Hi ${c.name?.split(' ')[0] || 'there'},</p>
        <p style="margin: 0 0 16px 0; font-size: 15px; color: #333; line-height: 1.6;">The mobile number on your account isn't valid, so we can't send you job alerts or daily summaries. Click below to enter the correct number — takes 10 seconds.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 8px 0 24px 0;">
          <tr><td style="background-color: #1E2A4A; border-radius: 8px;">
            <a href="${link}" style="display: inline-block; padding: 14px 28px; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none;">Update my number</a>
          </td></tr>
        </table>
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #888;">Link expires in 7 days. If it expires, reply to this email and we'll send a fresh one.</p>
        <p style="margin: 0; font-size: 13px; color: #888;">— The NYC Maid</p>
      `)
      const result = await sendEmail(c.email!, 'Action needed — confirm your phone number', html, undefined, { skipOwnerBcc: true })
      if (result.success) {
        await supabaseAdmin.from('notifications').insert({
          type: 'phone_fix_email',
          title: 'Phone fix email sent',
          message: `cleaner_id=${c.id} email=${c.email}`,
        })
        sent++
      } else {
        errors.push(`${c.email}: send failed`)
      }
    } catch (e) {
      errors.push(`${c.email}: ${(e as Error).message}`)
    }
  }

  return NextResponse.json({ ok: true, eligible: candidates.length, sent, skipped_capped: skipped, errors })
}
