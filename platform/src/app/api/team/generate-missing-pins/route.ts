import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { audit } from '@/lib/audit'
import { encryptSecretSafe } from '@/lib/secret-crypto'
import { generateUniqueTeamPin, notifyTeamMemberPin } from '@/lib/team-provisioning'
import { tenantSiteUrl } from '@/lib/tenant-site'

/**
 * POST /api/team/generate-missing-pins
 *
 * Global (all tenants): backfill a PIN for every active team member in the
 * current tenant who doesn't have one, and notify each over every channel
 * they have on file (email + sms, not one with a fallback to the other).
 * Per-member, best-effort — one failure doesn't block the rest.
 */
export async function POST() {
  const { tenant, error: authError } = await requirePermission('team.edit')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { data: missing, error: fetchErr } = await supabaseAdmin
      .from('team_members')
      .select('id, name, email, phone')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .or('pin.is.null,pin.eq.')

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    if (!missing || missing.length === 0) {
      return NextResponse.json({ generated: 0, emailed: 0, texted: 0, failures: [], message: 'Everyone already has a PIN' })
    }

    const portalUrl = `${tenantSiteUrl(tenant.tenant)}/team/login`
    const failures: Array<{ id: string; name: string | null; error: string }> = []
    let generated = 0
    let emailed = 0
    let texted = 0

    for (const member of missing) {
      try {
        const newPin = await generateUniqueTeamPin(tenantId, member.id)
        const { error: updateError } = await supabaseAdmin
          .from('team_members')
          .update({ pin: encryptSecretSafe(newPin) })
          .eq('id', member.id)
          .eq('tenant_id', tenantId)
        if (updateError) throw new Error(updateError.message)

        generated++

        if (member.email || member.phone) {
          const result = await notifyTeamMemberPin({
            tenantId,
            memberId: member.id,
            memberName: member.name,
            pin: newPin,
            portalUrl,
            wasReset: false,
          })
          if (result.emailed) emailed++
          if (result.texted) texted++
        }
      } catch (e) {
        failures.push({ id: member.id, name: member.name, error: e instanceof Error ? e.message : String(e) })
      }
    }

    await audit({ tenantId, action: 'team.updated', entityType: 'team_member', details: { field: 'pins_bulk_generated', count: generated } })

    return NextResponse.json({ generated, emailed, texted, failures })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unexpected error' }, { status: 500 })
  }
}
