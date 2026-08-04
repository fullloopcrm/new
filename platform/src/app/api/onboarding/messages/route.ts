import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { resolveOnboardingTenantId } from '@/lib/onboarding-auth'
import { translateToEnEs } from '@/lib/connect-translate'

/**
 * Chat for a business still on the onboarding link/wizard, talking to Full
 * Loop directly — NOT the tenant's own customer-facing ComHub (that's for
 * their customers, once they have any). Reuses the same tenant_owner_messages
 * thread the activated dashboard's Loop Connect "Full Loop Support"
 * conversation uses (see /api/dashboard/messages), so admin sees one
 * continuous thread per tenant in /admin/tenant-chats whether the message
 * came in before or after activation. Auth via the same signed onboarding
 * token (or session) /api/tenant-profile uses — resolveOnboardingTenantId is
 * what ties a message to the real tenant instead of an anonymous contact.
 */

async function resolveTenant(token: string | null): Promise<{ tenantId: string; tenantName: string; anthropicKey: string | null } | null> {
  const tenantId = await resolveOnboardingTenantId(token)
  if (!tenantId) return null
  const { data } = await supabaseAdmin.from('tenants').select('name, anthropic_api_key').eq('id', tenantId).single()
  return { tenantId, tenantName: (data?.name as string) || 'Business', anthropicKey: (data?.anthropic_api_key as string) || null }
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const resolved = await resolveTenant(token)
  if (!resolved) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = tenantDb(resolved.tenantId)

  const { data, error } = await db
    .from('tenant_owner_messages')
    .select('id, direction, body, body_en, sender_role, created_at')
    .order('created_at', { ascending: true })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const messages = (data || []).map((m) => ({
    id: m.id as string,
    author: m.direction === 'in' ? ('customer' as const) : ('admin' as const),
    body: (m.body_en as string) || (m.body as string) || '',
    sentAt: m.created_at as string,
  }))

  return NextResponse.json({ messages })
}

export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => null) as { token?: string; body?: string } | null
  const body = payload?.body?.trim()
  if (!body) return NextResponse.json({ error: 'body required' }, { status: 400 })

  const resolved = await resolveTenant(payload?.token || null)
  if (!resolved) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = tenantDb(resolved.tenantId)

  const { en, es } = await translateToEnEs(body, resolved.anthropicKey)

  const { data: inserted, error } = await db
    .from('tenant_owner_messages')
    .insert({
      direction: 'in',
      channel: 'platform',
      body,
      body_en: en,
      body_es: es,
      sender: 'onboarding_link',
      sender_role: 'owner',
    })
    .select('id, created_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin.from('notifications').insert({
    tenant_id: resolved.tenantId,
    type: 'owner_message',
    title: `Onboarding message — ${resolved.tenantName}`,
    message: body.slice(0, 200),
    channel: 'system',
    recipient_type: 'admin',
  })

  return NextResponse.json({
    ok: true,
    message: { id: inserted.id, author: 'customer', body, sentAt: inserted.created_at },
  })
}
