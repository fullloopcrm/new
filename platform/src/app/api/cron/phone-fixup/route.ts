import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/nycmaid/email'
import { protectCronAPI } from '@/lib/nycmaid/auth'
import { validateUsPhone } from '@/lib/nycmaid/phone-validator'
import { emailWrapper } from '@/lib/nycmaid/email-templates'
import { createPhoneFixupToken } from '@/lib/nycmaid/phone-fixup-token'
import { getPrimaryTenantDomain } from '@/lib/domains'

// Daily scan: find cleaners with invalid phones, email each a signed link to
// /team/update-phone?token=... so they can self-correct.
//
// Multi-tenant: iterates active tenants. Tenants without `cleaners` table
// data (i.e. all fullloop tenants on `team_members` model) get empty queries
// and are no-ops here. CAP enforced per tenant.

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const TOKEN_EXPIRY_MS = SEVEN_DAYS_MS
const CAP = 10

function signToken(cleanerId: string): string {
  const expiry = Date.now() + TOKEN_EXPIRY_MS
  return createPhoneFixupToken(cleanerId, expiry)
}

export async function GET(request: Request) {
  const authError = protectCronAPI(request)
  if (authError) return authError

  const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS).toISOString()

  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, name, domain, website_url')
    .eq('status', 'active')
    .limit(1000)

  let totalEligible = 0
  let totalSent = 0
  let totalSkippedCapped = 0
  const errors: string[] = []

  for (const tenant of tenants || []) {
    const tenantId = tenant.id
    // website_url stays first (existing precedence, unchanged). Below that,
    // this previously read tenant.domain only and never consulted
    // tenant_domains, so a tenant with no website_url whose real custom
    // domain lives only in tenant_domains got the phone-fixup email link
    // built from the wrong host (or the nycmaid default).
    const primaryDomain = await getPrimaryTenantDomain(tenantId)
    const domain = primaryDomain || tenant.domain
    const baseUrl =
      tenant.website_url?.replace(/\/$/, '') ||
      (domain ? `https://${domain}` : null) ||
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
      'https://www.thenycmaid.com'

    const { data: cleaners } = await supabaseAdmin
      .from('cleaners')
      .select('id, name, email, phone')
      .eq('tenant_id', tenantId)
      .eq('active', true)

    if (!cleaners || cleaners.length === 0) continue

    const { data: recentNotifs } = await supabaseAdmin
      .from('notifications')
      .select('message')
      .eq('tenant_id', tenantId)
      .eq('type', 'phone_fix_email')
      .gte('created_at', sevenDaysAgo)
    const recentlyEmailedIds = new Set(
      (recentNotifs || []).map(n => (n.message || '').match(/cleaner_id=([0-9a-f-]+)/i)?.[1]).filter(Boolean) as string[]
    )

    const candidates = cleaners.filter(c => {
      if (!c.email) return false
      if (validateUsPhone(c.phone).valid) return false
      if (recentlyEmailedIds.has(c.id)) return false
      return true
    })

    totalEligible += candidates.length
    const toEmail = candidates.slice(0, CAP)
    totalSkippedCapped += Math.max(0, candidates.length - CAP)

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
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #888;">Link expires in 7 days.</p>
          <p style="margin: 0; font-size: 13px; color: #888;">— ${tenant.name}</p>
        `)
        const result = await sendEmail(c.email!, 'Action needed — confirm your phone number', html, undefined, { skipOwnerBcc: true })
        if (result.success) {
          await supabaseAdmin.from('notifications').insert({
            tenant_id: tenantId,
            type: 'phone_fix_email',
            title: 'Phone fix email sent',
            message: `cleaner_id=${c.id} email=${c.email}`,
          })
          totalSent++
        } else {
          errors.push(`${c.email}: send failed`)
        }
      } catch (e) {
        errors.push(`${c.email}: ${(e as Error).message}`)
      }
    }
  }

  return NextResponse.json({
    ok: true,
    eligible: totalEligible,
    sent: totalSent,
    skipped_capped: totalSkippedCapped,
    errors,
  })
}
