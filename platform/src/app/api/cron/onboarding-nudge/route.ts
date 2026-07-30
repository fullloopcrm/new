/**
 * Stalled-onboarding nudge — a tenant that went live 3+ days ago and has
 * never logged in (last_active_at null or before activated_at) gets one
 * reminder email pointing back at their onboarding link. Send-once via
 * onboarding_nudge_sent_at so this never re-fires daily for the same tenant.
 *
 * Plain platform email (not Jefe's notifyTenantOwner) on purpose:
 * notifyTenantOwner only sends over a channel the TENANT has configured
 * (their own Telnyx/Resend key) — a tenant that hasn't logged in yet almost
 * certainly hasn't set those up, so it would silently no-op for exactly the
 * tenants this cron exists to reach.
 */
import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail, tenantSender } from '@/lib/email'
import { onboardingLinkUrl } from '@/lib/onboarding-link'

const NUDGE_AFTER_DAYS = 3

export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  const cutoff = new Date(Date.now() - NUDGE_AFTER_DAYS * 86400000).toISOString()

  const { data: candidates, error } = await supabaseAdmin
    .from('tenants')
    .select('id, name, slug, owner_email, email, activated_at, last_active_at, onboarding_link_version')
    .eq('status', 'active')
    .lte('activated_at', cutoff)
    .is('onboarding_nudge_sent_at', null)
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let sent = 0
  let skipped = 0
  const errors: string[] = []

  for (const tenant of candidates || []) {
    const neverLoggedInSinceActivation =
      !tenant.last_active_at || new Date(tenant.last_active_at) < new Date(tenant.activated_at as string)
    if (!neverLoggedInSinceActivation) { skipped++; continue }

    const to = tenant.owner_email || tenant.email
    if (!to) { skipped++; continue }

    try {
      const url = onboardingLinkUrl(tenant.id, tenant.onboarding_link_version || 1)
      await sendEmail({
        to,
        from: tenantSender(tenant),
        subject: `Finish setting up ${tenant.name} on Full Loop`,
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 500px;">
            <p style="color: #555;">Your Full Loop account for <strong>${tenant.name}</strong> is ready, but you haven't finished setup yet.</p>
            <a href="${url}" style="display: inline-block; background: #0d9488; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 12px 0;">Finish setup</a>
            <p style="color: #999; font-size: 12px;">Takes a few minutes — you can save and come back anytime.</p>
          </div>
        `,
      })
      await supabaseAdmin.from('tenants').update({ onboarding_nudge_sent_at: new Date().toISOString() }).eq('id', tenant.id)
      sent++
    } catch (e) {
      errors.push(`${tenant.id}: ${e instanceof Error ? e.message : 'unknown error'}`)
    }
  }

  return NextResponse.json({ candidates: candidates?.length || 0, sent, skipped, errors })
}
