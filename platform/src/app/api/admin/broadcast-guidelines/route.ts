/**
 * Broadcast guidelines update to all active team members of the calling tenant.
 * Uses per-team-member notifications via the existing notify() helper (SMS + push),
 * tenant-scoped. No notifyCleaner lib needed — we iterate ourselves.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { tenantSiteUrl } from '@/lib/tenant-site'

interface TeamMemberRow {
  id: string
  name: string | null
  pin: string | null
  preferred_language: string | null
}

export async function POST() {
  const { tenant: authTenant, error: authError } = await requirePermission('settings.edit')
  if (authError) return authError

  try {
    const { tenantId, tenant } = authTenant

    const { data: members } = await supabaseAdmin
      .from('team_members')
      .select('id, name, pin, preferred_language')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')

    const rows = (members as TeamMemberRow[] | null) || []
    const businessName = tenant.name || 'the team'
    // tenant_domains FIRST, tenants.domain FALLBACK via tenantSiteUrl() —
    // previously read tenant.domain only, so a tenant_domains-only tenant
    // got a bare "/team" relative path texted in an SMS, which never
    // resolves outside a browser tab already on the tenant's site.
    const siteUrl = await tenantSiteUrl({ id: tenant.id, domain: tenant.domain, slug: tenant.slug })
    const portalUrl = siteUrl ? `${siteUrl}/team` : '/team'

    let sent = 0
    for (const m of rows) {
      const isEs = m.preferred_language === 'es'
      const title = isEs ? 'Reglas del equipo actualizadas' : 'Team guidelines updated'
      const body = isEs
        ? `${businessName}: Se han publicado nuevas reglas del equipo. Revísalas en tu portal: ${portalUrl}${m.pin ? ` PIN: ${m.pin}` : ''}`
        : `${businessName}: New team guidelines posted. Review in your portal: ${portalUrl}${m.pin ? ` PIN: ${m.pin}` : ''}`

      const r = await notify({
        tenantId,
        type: 'team_confirm_request',
        title,
        message: body,
        channel: 'sms',
        recipientType: 'team_member',
        recipientId: m.id,
      })
      if (r.success) sent++
    }

    return NextResponse.json({ success: true, total: rows.length, sent })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('broadcast-guidelines error:', err)
    return NextResponse.json({ error: 'Broadcast failed' }, { status: 500 })
  }
}
