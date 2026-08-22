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
  // Only present for PA/FL applicants, who disclose at application time
  // (no statewide ban-the-box restriction there) instead of post-offer —
  // see 20260821223000_team_applications_criminal_history_response.sql.
  criminal_history_response?: string | null
}

/**
 * Shared across ALL tenants (single- and bulk-approve): when an application is
 * approved, provision the applicant as a team member (with a portal PIN) and
 * deliver their PIN + portal link over every channel they have on file —
 * branded email AND SMS, not email with a silent single point of failure.
 * Reuses the same PIN scheme as POST /api/team.
 *
 * Returns which channels actually delivered so callers can surface a failure
 * to the admin instead of assuming success — a Resend outage or a tenant
 * missing SMS config must be visible, not swallowed into a console.error
 * only the platform operator can see.
 *
 * Best-effort — callers must not let a delivery failure here undo the status update.
 */
export async function provisionApprovedApplicant(
  tenantId: string,
  app: ApprovedApplication,
): Promise<{ emailed: boolean; texted: boolean }> {
  const { data: t } = await supabaseAdmin
    .from('tenants')
    .select('name, primary_color, logo_url, resend_api_key, email_from, phone, domain, slug')
    .eq('id', tenantId)
    .single()
  if (!t) return { emailed: false, texted: false }

  const cleanPhone = (app.phone || '').replace(/\D/g, '')

  // Dedup: reuse an existing team member for this tenant+phone instead of
  // creating a second record. Only mint a new PIN when creating fresh.
  let pin: string | null = null
  let memberExisted = false
  let memberId: string | null = null

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
      memberId = existing.id
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
    // PA/FL applicants already disclosed at application time -- carry that
    // straight onto the member row so the portal doesn't ask a second time
    // (see team/layout.tsx's disclosed_at gate), and hold a "yes" answer
    // out of the portal the same way the post-offer path does (see
    // api/team-portal/disclosure/route.ts) rather than letting the earlier
    // disclosure timing grant a pass the post-offer flow wouldn't.
    if (app.criminal_history_response) {
      base.criminal_history_response = app.criminal_history_response
      base.criminal_history_disclosed_at = new Date().toISOString()
      if (app.criminal_history_response.startsWith('yes')) {
        base.status = 'pending_review'
      }
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
    for (let attempt = 0; attempt < 4 && !inserted; attempt++) {
      pin = generateTeamPin()
      const { data: ins, error: insErr } = await supabaseAdmin
        .from('team_members')  // tenant-scope-ok: insert base carries tenant_id (built above)
        .insert({ ...base, pin: encryptSecretSafe(pin) })
        .select('id')
        .single()
      if (!insErr) { inserted = true; memberId = ins?.id ?? null; break }
      if (!/duplicate|unique/i.test(insErr.message)) throw new Error(insErr.message)
    }
    if (!inserted) throw new Error('Could not allocate a unique PIN after retries')

    // Geocode the home address so the new hire plots on the team coverage map.
    if (memberId && app.address) {
      const newMemberId = memberId
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

  if (!pin) return { emailed: false, texted: false }

  const portalUrl = `${tenantSiteUrl({ domain: t.domain, slug: t.slug })}/team/login`

  // Deliver the PIN + portal link over EVERY channel the applicant has on
  // file, not email alone — a single Resend hiccup used to mean the new hire
  // got nothing at all, with no indication to the admin that it happened.
  // Email keeps the branded "welcome" template; SMS reuses the same
  // notify()/portal_pin_reset primitive already proven out by the PIN-reset
  // flow (api/team/[id] regenerate_pin) and no-ops safely (success:false, no
  // throw) when the tenant has no SMS provider configured.
  // Unlike the SMS leg below, this doesn't go through notify() (it needs the
  // custom branded teamApplicationApprovedEmail template, not notify()'s
  // generic renderer) -- so it never got a notifications row of its own.
  // That meant there was no way to check after the fact whether a welcome
  // email actually sent; write the same audit row shape notify() writes for
  // 'sms' so both channels are equally checkable.
  let emailed = false
  if (app.email) {
    try {
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
      emailed = true
      await supabaseAdmin.from('notifications').insert({
        tenant_id: tenantId,
        type: 'portal_pin_reset',
        title: `Your portal PIN: ${pin}`,
        message: `Welcome to ${t.name || 'the team'}! Your team portal PIN is ${pin}. Log in at ${portalUrl}.`,
        channel: 'email',
        recipient_type: 'team_member',
        recipient_id: memberId,
        status: 'sent',
        metadata: { recipientName: app.name || '', pin, portalUrl, wasReset: false, recipientEmail: app.email },
        retry_count: 0,
      })
    } catch (err) {
      console.error('[provisionApprovedApplicant] welcome email failed (member still provisioned):', err)
      try {
        await supabaseAdmin.from('notifications').insert({
          tenant_id: tenantId,
          type: 'portal_pin_reset',
          title: `Your portal PIN: ${pin}`,
          message: `Welcome to ${t.name || 'the team'}! Your team portal PIN is ${pin}. Log in at ${portalUrl}.`,
          channel: 'email',
          recipient_type: 'team_member',
          recipient_id: memberId,
          status: 'failed',
          metadata: { recipientName: app.name || '', pin, portalUrl, wasReset: false, recipientEmail: app.email, error: err instanceof Error ? err.message : String(err) },
          retry_count: 0,
        })
      } catch {
        // Best-effort audit row -- the caught email failure above is already logged.
      }
    }
  }

  let texted = false
  if (memberId && app.phone) {
    const smsResult = await notify({
      tenantId,
      type: 'portal_pin_reset',
      title: `Your portal PIN: ${pin}`,
      message: `Welcome to ${t.name || 'the team'}! Your team portal PIN is ${pin}. Log in at ${portalUrl}.`,
      channel: 'sms',
      recipientType: 'team_member',
      recipientId: memberId,
      metadata: { recipientName: app.name || '', pin, portalUrl, wasReset: false },
    })
    texted = smsResult.success
  }

  return { emailed, texted }
}
