import { NextRequest, NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'
import { notify } from '@/lib/notify'
import { translateToEnEs } from '@/lib/connect-translate'

// Team Announcements — replaces the old single-blob "Guidelines" field
// (tenants.guidelines_en/es). The team-facing read pointed at a nonexistent
// tenants.settings column, and the admin Broadcast button called a route
// that didn't exist -- an admin's saved guidelines never actually reached a
// cleaner. This is a running feed instead: admin keeps posting entries,
// cleaners see the full history, not one overwritable blob.
export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()
    const db = tenantDb(tenantId)

    const { data, error } = await db
      .from('team_announcements')
      .select('id, title_en, title_es, body_en, body_es, created_at')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ announcements: data || [] })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}

export async function POST(request: NextRequest) {
  const { tenant: reqCtx, error: authError } = await requirePermission('settings.edit')
  if (authError) return authError
  const { tenantId, tenant } = reqCtx

  try {
    const db = tenantDb(tenantId)
    const { title, body, notifyTeam } = await request.json()
    if (!body?.trim()) return NextResponse.json({ error: 'body required' }, { status: 400 })

    const bodyTranslated = await translateToEnEs(body.trim(), tenant.anthropic_api_key)
    const titleTranslated = title?.trim() ? await translateToEnEs(title.trim(), tenant.anthropic_api_key) : null

    const { data, error } = await db
      .from('team_announcements')
      .insert({
        title_en: titleTranslated?.en || null,
        title_es: titleTranslated?.es || null,
        body_en: bodyTranslated.en,
        body_es: bodyTranslated.es,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    let notified = 0
    if (notifyTeam) {
      const { data: members } = await db
        .from('team_members')
        .select('id, name, preferred_language')
        .eq('status', 'active')

      const businessName = tenant.name || 'the team'
      const portalUrl = tenant.domain ? `https://${tenant.domain}/team` : '/team'

      for (const m of members || []) {
        const isEs = m.preferred_language === 'es'
        const smsTitle = isEs ? 'Nuevo anuncio del equipo' : 'New team announcement'
        const smsBody = isEs
          ? `${businessName}: ${data.title_es || 'Nuevo anuncio'}. Revisa en tu portal: ${portalUrl}`
          : `${businessName}: ${data.title_en || 'New announcement'}. Review in your portal: ${portalUrl}`

        const r = await notify({
          tenantId,
          type: 'team_confirm_request',
          title: smsTitle,
          message: smsBody,
          channel: 'sms',
          recipientType: 'team_member',
          recipientId: m.id,
        })
        if (r.success) notified++
      }
    }

    return NextResponse.json({ announcement: data, notified }, { status: 201 })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
