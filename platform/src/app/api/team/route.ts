import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { validate } from '@/lib/validate'
import { audit } from '@/lib/audit'
import { getSettings } from '@/lib/settings'
import { sendEmail } from '@/lib/email'
import { teamMemberAddedEmail } from '@/lib/email-templates'
import { tenantSiteUrl } from '@/lib/tenant-site'

export async function GET() {
  try {
    const { tenant, error: authError } = await requirePermission('team.view')
    if (authError) return authError
    const { tenantId } = tenant

    const { data, error } = await supabaseAdmin
      .from('team_members')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // pin is a team-portal login credential, not roster data — strip it here
    // (no consumer of the list endpoint uses it; the [id] detail endpoint
    // still returns it for the intentional single-member admin card view).
    const team = (data || []).map(({ pin: _pin, ...rest }) => rest)

    return NextResponse.json({ team })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

export async function POST(request: Request) {
  const { tenant, error: authError } = await requirePermission('team.create')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const body = await request.json()

    const { data: fields, error: vError } = validate(body, {
      name: { type: 'string', required: true, max: 200 },
      email: { type: 'email' },
      phone: { type: 'phone' },
      role: { type: 'string', max: 100 },
      hourly_rate: { type: 'number', min: 0 },
      pay_rate: { type: 'number', min: 0 },
      working_days: { type: 'array' },
      avatar_url: { type: 'string', max: 1000 },
    })
    if (vError) return NextResponse.json({ error: vError }, { status: 400 })

    // team.create is held by non-owner roles (admin) too. Without this check,
    // an admin could mint a new 'owner' team member -- bypassing the "owner is
    // never customizable" invariant that rbac.ts relies on to prevent lockout.
    if (fields!.role === 'owner' && tenant.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only an owner can grant the owner role' },
        { status: 403 }
      )
    }

    // Apply tenant defaults when caller didn't provide values explicitly.
    const settings = await getSettings(tenantId)
    const fieldsWithDefaults = { ...fields! } as Record<string, unknown>
    if (fieldsWithDefaults.pay_rate == null && settings.default_pay_rate > 0) {
      fieldsWithDefaults.pay_rate = settings.default_pay_rate
    }
    if (fieldsWithDefaults.hourly_rate == null && settings.default_pay_rate > 0) {
      fieldsWithDefaults.hourly_rate = settings.default_pay_rate
    }
    if (!Array.isArray(fieldsWithDefaults.working_days) && settings.default_working_days?.length) {
      fieldsWithDefaults.working_days = settings.default_working_days
    }

    // Auto-generate 4-digit PIN (cryptographically random, only 9000 possible
    // values -- a much smaller space than clients.pin's 900000, so collision
    // odds climb fast with headcount). idx_team_members_tenant_pin_unique
    // (migration 014) enforces uniqueness per tenant, but this insert never
    // retried on a collision -- unlike provisionApprovedApplicant() in
    // src/lib/team-provisioning.ts (same table, same PIN scheme, the OTHER
    // team_members-creating write path), which already regenerates and
    // retries. A stale comment here claimed "a collision returns a 500 and
    // the caller retries", but no caller ever implemented that: a real add-
    // team-member request just failed outright. Same regenerate-and-retry
    // fix, same idiom already established in that sibling function.
    const crypto = await import('node:crypto')
    let data, error, pin = ''
    for (let attempt = 0; attempt < 4; attempt++) {
      pin = String(1000 + crypto.randomInt(0, 9000))
      ;({ data, error } = await supabaseAdmin
        .from('team_members')
        .insert({ ...fieldsWithDefaults, tenant_id: tenantId, pin })
        .select()
        .single())
      if (!error || !/duplicate|unique/i.test(error.message)) break
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await audit({ tenantId, action: 'team.created', entityType: 'team_member', entityId: data.id, details: { name: fields!.name } })

    // Invite email: tells the new hire their PIN + how to log into the team
    // portal. Best-effort per the same contract as provisionApprovedApplicant()
    // in team-provisioning.ts (the sibling team_members-creating path) — the
    // member is already created, so a comms failure (missing key, Resend
    // outage) must NOT throw and make the caller think creation failed.
    if (fields!.email) {
      try {
        const t = tenant.tenant
        const portalUrl = `${tenantSiteUrl({ domain: t.domain, slug: t.slug })}/team/login`
        const html = teamMemberAddedEmail({
          tenantName: t.name || 'the team',
          primaryColor: t.primary_color || undefined,
          logoUrl: t.logo_url || undefined,
          memberName: fields!.name as string,
          pin,
          portalUrl,
          supportPhone: t.phone || undefined,
        })
        await sendEmail({
          to: fields!.email as string,
          subject: `You've been added to ${t.name || 'the team'}! Your PIN: ${pin}`,
          html,
          resendApiKey: t.resend_api_key || undefined,
          from: t.email_from || undefined,
        })
      } catch (err) {
        console.error('[POST /api/team] invite email failed (member still created):', err)
      }
    }

    return NextResponse.json({ member: data }, { status: 201 })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
