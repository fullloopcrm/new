/**
 * Broadcast guidelines update to all active team members of the calling tenant.
 * Uses per-team-member notifications via the existing notify() helper (SMS + push),
 * tenant-scoped. No notifyCleaner lib needed — we iterate ourselves.
 */
import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { notify } from '@/lib/notify'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'

interface TeamMemberRow {
  id: string
  name: string | null
  pin: string | null
  preferred_language: string | null
}

export async function POST() {
  try {
    // Mass-SMS broadcast to every active team member (no TEST_MODE cap, unlike
    // the sibling find-cleaner/send + message-applicants/send routes), and each
    // message includes the recipient's own login PIN — same blast-radius/cost
    // class as those two, gated on campaigns.send. This route previously only
    // checked for a valid tenant session via getTenantForRequest(), so any
    // authenticated role (incl. 'staff', which rbac.ts grants no campaigns.send)
    // could trigger a real, uncapped SMS blast to the whole team.
    const { tenant: reqCtx, error: authError } = await requirePermission('campaigns.send')
    if (authError) return authError
    const { tenantId, tenant } = reqCtx
    const db = tenantDb(tenantId)

    const { data: members } = await db
      .from('team_members')
      .select('id, name, pin, preferred_language')
      .eq('status', 'active')

    const rows = (members as TeamMemberRow[] | null) || []
    const businessName = tenant.name || 'the team'
    const portalUrl = tenant.domain ? `https://${tenant.domain}/team` : '/team'

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
