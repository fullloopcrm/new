// Tenant-owner side of the Level-1 platform messaging system.
// The owner reads messages from Full Loop (admin) and replies — IN-PLATFORM
// ONLY, no SMS/email. Same `tenant_owner_messages` thread the admin uses.
//   direction 'out' = from platform/admin → owner (incoming for the owner)
//   direction 'in'  = from owner → platform/admin (the owner's own replies)
import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { isCrossSiteRequest } from '@/lib/csrf-guard'
import { translateToEnEs } from '@/lib/connect-translate'
import { alertOwner } from '@/lib/telegram'

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await getTenantForRequest()
    const db = tenantDb(tenantId)

    const { data, error } = await db
      .from('tenant_owner_messages')
      .select('id, direction, channel, body, body_en, body_es, sender, sender_role, created_at')
      .order('created_at', { ascending: true })
      .limit(500)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Owner-side dashboard is English throughout -- display_body falls back
    // to the raw body for older, pre-translation rows.
    const displayMessages = (data || []).map((m) => ({ ...m, display_body: m.body_en || m.body }))

    // Mark admin→owner messages as read now that the owner has loaded the thread.
    // Skipped on a forged cross-site GET (SameSite=Lax still sends cookies on
    // top-level navigation) — see csrf-guard.ts.
    if (!isCrossSiteRequest(request.headers)) {
      await db
        .from('tenant_owner_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('direction', 'out')
        .is('read_at', null)
    }

    return NextResponse.json({ messages: displayMessages })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: 'unexpected error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, tenant } = await getTenantForRequest()
    const db = tenantDb(tenantId)

    let payload: { body?: string }
    try {
      payload = await request.json()
    } catch {
      return NextResponse.json({ error: 'invalid json' }, { status: 400 })
    }
    const body = payload.body?.trim()
    if (!body) return NextResponse.json({ error: 'body required' }, { status: 400 })

    const { en, es } = await translateToEnEs(body, tenant?.anthropic_api_key)

    const { data: inserted, error } = await db
      .from('tenant_owner_messages')
      .insert({
        direction: 'in', // in = from owner → platform/admin
        channel: 'platform',
        body,
        body_en: en,
        body_es: es,
        sender: 'owner',
        sender_role: 'owner',
      })
      .select('id, direction, channel, body, body_en, body_es, sender, sender_role, created_at')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Surface the reply to the platform admin as an unread notification
    // (in-app record) and a Telegram ping (the only external channel Jeff
    // wants for this — no email, it'd be too noisy across every tenant).
    // TenantChatAlerts (admin/tenant-chat-alerts.tsx) also picks this up via
    // polling for the sound + toast while an admin is actively in /admin.
    await db.from('notifications').insert({
      type: 'owner_message',
      title: `Owner reply — ${tenant?.name ?? 'tenant'}`,
      message: body.slice(0, 200),
      channel: 'system',
      recipient_type: 'admin',
    })
    await alertOwner(`Loop Connect — ${tenant?.name ?? 'tenant'}`, body.slice(0, 300)).catch(() => {})

    return NextResponse.json({ ok: true, message: inserted })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: 'unexpected error' }, { status: 500 })
  }
}
