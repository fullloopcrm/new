import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { teamApplicationApprovedEmail } from '@/lib/email-templates'
import { getSettings } from '@/lib/settings'
import { tenantSiteUrl } from '@/lib/tenant-site'
import { geocodeAddress } from '@/lib/geo'

export type ApprovedApplication = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  address: string | null
}

/**
 * Shared across ALL tenants (single- and bulk-approve): when an application is
 * approved, provision the applicant as a team member (with a portal PIN) and
 * email them their PIN + portal link — the branded "you're approved, here's
 * your portal access" email. Reuses the same PIN scheme as POST /api/team.
 *
 * Best-effort — callers must not let a failure here undo the status update.
 */
export async function provisionApprovedApplicant(tenantId: string, app: ApprovedApplication): Promise<void> {
  const { data: t } = await supabaseAdmin
    .from('tenants')
    .select('name, primary_color, logo_url, resend_api_key, phone, domain, slug')
    .eq('id', tenantId)
    .single()
  if (!t) return

  const cleanPhone = (app.phone || '').replace(/\D/g, '')

  // Dedup: reuse an existing team member for this tenant+phone instead of
  // creating a second record. Only mint a new PIN when creating fresh.
  let pin: string | null = null
  let memberExisted = false

  if (cleanPhone) {
    const { data: existing } = await supabaseAdmin
      .from('team_members')
      .select('id, pin')
      .eq('tenant_id', tenantId)
      .eq('phone', cleanPhone)
      .limit(1)
      .maybeSingle()
    if (existing) {
      memberExisted = true
      pin = existing.pin
    }
  }

  if (!memberExisted) {
    const crypto = await import('node:crypto')
    const settings = await getSettings(tenantId)
    const base: Record<string, unknown> = {
      tenant_id: tenantId,
      name: app.name || 'Team Member',
      email: app.email || null,
      phone: cleanPhone || null,
      address: app.address || null,
    }
    if (settings.default_pay_rate > 0) {
      base.pay_rate = settings.default_pay_rate
      base.hourly_rate = settings.default_pay_rate
    }
    if (settings.default_working_days?.length) {
      base.working_days = settings.default_working_days
    }

    // The DB enforces PIN uniqueness per tenant; retry on collision.
    let inserted = false
    let newMemberId: string | null = null
    for (let attempt = 0; attempt < 4 && !inserted; attempt++) {
      pin = String(1000 + crypto.randomInt(0, 9000))
      const { data: ins, error: insErr } = await supabaseAdmin
        .from('team_members')  // tenant-scope-ok: insert base carries tenant_id (built above)
        .insert({ ...base, pin })
        .select('id')
        .single()
      if (!insErr) { inserted = true; newMemberId = ins?.id ?? null; break }
      if (!/duplicate|unique/i.test(insErr.message)) throw new Error(insErr.message)
    }
    if (!inserted) throw new Error('Could not allocate a unique PIN after retries')

    // Geocode the home address so the new hire plots on the team coverage map.
    if (newMemberId && app.address) {
      geocodeAddress(app.address).then((coords) => {
        if (coords) {
          return supabaseAdmin
            .from('team_members')
            .update({ home_latitude: coords.lat, home_longitude: coords.lng })
            .eq('id', newMemberId)
            .eq('tenant_id', tenantId)
        }
      }).catch(() => {})
    }
  }

  // Email the applicant their PIN + portal link (only if we have both).
  if (app.email && pin) {
    const portalUrl = `${tenantSiteUrl({ domain: t.domain, slug: t.slug })}/team/login`
    const html = teamApplicationApprovedEmail({
      tenantName: t.name || 'the team',
      primaryColor: t.primary_color || undefined,
      logoUrl: t.logo_url || undefined,
      applicantName: app.name || '',
      pin,
      portalUrl,
      supportPhone: t.phone || undefined,
    })
    await sendEmail({
      to: app.email,
      subject: `Welcome to ${t.name || 'the team'}! Your PIN: ${pin}`,
      html,
      resendApiKey: t.resend_api_key || undefined,
    })
  }
}
