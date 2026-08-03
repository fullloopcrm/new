import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { teamApplicationApprovedEmail } from '@/lib/email-templates'
import { getSettings } from '@/lib/settings'
import { tenantSiteUrl } from '@/lib/tenant-site'
import { geocodeAddress } from '@/lib/geo'
import { generateTeamPin } from '@/lib/team-pin'
import { encryptSecretSafe, decryptSecret } from '@/lib/secret-crypto'
import { notify } from '@/lib/notify'

const MAX_PIN_GENERATION_ATTEMPTS = 50

/**
 * A new PIN guaranteed not to match any other active team member's real PIN
 * in this tenant. `idx_team_members_tenant_pin_unique` only constrains the
 * raw `pin` column value -- once a PIN is stored via encryptSecretSafe(),
 * that's ciphertext, and AES-256-GCM's random IV means the same real PIN
 * encrypts to a different value every time. The DB constraint can't catch a
 * real-value collision on an encrypted column, so uniqueness has to be
 * checked here by decrypting every existing PIN and comparing.
 */
export async function generateUniqueTeamPin(tenantId: string, excludeId?: string): Promise<string> {
  const { data: rows } = await supabaseAdmin
    .from('team_members')
    .select('id, pin')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .not('pin', 'is', null)

  const used = new Set<string>()
  for (const row of rows || []) {
    if (excludeId && row.id === excludeId) continue
    if (!row.pin) continue
    try {
      used.add(decryptSecret(row.pin))
    } catch {
      // Corrupted/unreadable envelope -- can't collide with a value we can't
      // read, so skip it rather than failing generation over it.
    }
  }

  for (let attempt = 0; attempt < MAX_PIN_GENERATION_ATTEMPTS; attempt++) {
    const candidate = generateTeamPin()
    if (!used.has(candidate)) return candidate
  }
  throw new Error(`Could not generate a unique PIN after ${MAX_PIN_GENERATION_ATTEMPTS} attempts`)
}

/**
 * Delivers a PIN over every channel the member actually has on file -- email
 * AND sms when both exist, not one with a fallback to the other. Each
 * notify() call independently no-ops (success:false, no throw) when that
 * channel's contact info or provider config is missing, so calling both
 * unconditionally is safe.
 */
export async function notifyTeamMemberPin(params: {
  tenantId: string
  memberId: string
  memberName: string
  pin: string
  portalUrl?: string
  wasReset: boolean
}): Promise<{ emailed: boolean; texted: boolean }> {
  const { tenantId, memberId, memberName, pin, portalUrl, wasReset } = params
  const title = wasReset ? `Your PIN was reset: ${pin}` : `Your portal PIN: ${pin}`
  const message = `Your ${wasReset ? 'new ' : ''}portal PIN is ${pin}.${portalUrl ? ` Log in at ${portalUrl}.` : ''}`

  const [emailResult, smsResult] = await Promise.all([
    notify({
      tenantId,
      type: 'portal_pin_reset',
      title,
      message,
      channel: 'email',
      recipientType: 'team_member',
      recipientId: memberId,
      metadata: { recipientName: memberName, pin, portalUrl, wasReset },
    }),
    notify({
      tenantId,
      type: 'portal_pin_reset',
      title,
      message,
      channel: 'sms',
      recipientType: 'team_member',
      recipientId: memberId,
      metadata: { recipientName: memberName, pin, portalUrl, wasReset },
    }),
  ])

  return { emailed: emailResult.success, texted: smsResult.success }
}

export type ApprovedApplication = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  address: string | null
  photo_url?: string | null
  unit?: string | null
  preferred_language?: string | null
  service_zones?: string[] | null
  has_car?: boolean | null
  labor_only?: boolean | null
  max_travel_minutes?: number | null
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
    .select('name, primary_color, logo_url, resend_api_key, email_from, phone, domain, slug')
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
      pin = existing.pin ? decryptSecret(existing.pin) : null
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
      // team_members has no separate unit column -- fold it into the single
      // address field the same way the admin dashboard displays it.
      address: app.unit && app.address ? `${app.address}, ${app.unit}` : (app.address || null),
      avatar_url: app.photo_url || null,
      preferred_language: app.preferred_language || null,
      service_zones: app.service_zones?.length ? app.service_zones : null,
      has_car: app.has_car ?? null,
      labor_only: app.labor_only ?? null,
      max_travel_minutes: app.max_travel_minutes ?? null,
    }
    // pay_rate only -- hourly_rate is the CLIENT-facing billing rate (set
    // per-booking, e.g. $69-99/hr), a different number entirely from what a
    // cleaner is paid. This previously set both to the same default_pay_rate
    // value, silently mis-setting every new hire's hourly_rate to their wage.
    if (settings.default_pay_rate > 0) {
      base.pay_rate = settings.default_pay_rate
    }
    if (settings.default_working_days?.length) {
      base.working_days = settings.default_working_days
    }

    // The DB enforces PIN uniqueness per tenant; retry on collision.
    let inserted = false
    let newMemberId: string | null = null
    for (let attempt = 0; attempt < 4 && !inserted; attempt++) {
      pin = generateTeamPin()
      const { data: ins, error: insErr } = await supabaseAdmin
        .from('team_members')  // tenant-scope-ok: insert base carries tenant_id (built above)
        .insert({ ...base, pin: encryptSecretSafe(pin) })
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
  // Best-effort per the contract above: the team member is already created, so a
  // comms failure (missing key, Resend outage) must NOT throw out of provisioning
  // and make the caller think the hire failed. Log and move on.
  if (app.email && pin) {
    try {
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
        // Send from the tenant's own verified sender when they have one. With a
        // per-tenant Resend key, the default platform `from` domain isn't
        // verified in that account and Resend 403s — so this is required, not
        // cosmetic, for tenants running independent email.
        from: t.email_from || undefined,
      })
    } catch (err) {
      console.error('[provisionApprovedApplicant] welcome email failed (member still provisioned):', err)
    }
  }
}
