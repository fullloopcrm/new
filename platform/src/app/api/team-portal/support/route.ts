// Field-staff side of the Level-1 platform messaging system (see
// src/app/api/dashboard/messages/route.ts for the owner side, and
// src/app/api/admin/tenant-chats/route.ts for the admin side). Same
// `tenant_owner_messages` thread as the tenant's owner — this CRM has no
// existing precedent for hiding team activity from the business owner, so a
// team member's support messages land in the same per-tenant thread the
// owner already sees, tagged sender_role:'team' so admin can tell who wrote
// what. IN-PLATFORM ONLY, matching the rest of this system — no SMS/email.
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { verifyToken } from '../auth/token'

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  try {
    const db = tenantDb(auth.tid)
    const { data, error } = await db
      .from('tenant_owner_messages') // tenant-scope-ok: tenantDb() scopes the select
      .select('id, direction, channel, body, sender, sender_role, created_at')
      .order('created_at', { ascending: true })
      .limit(500)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ messages: data || [] })
  } catch {
    return NextResponse.json({ messages: [] })
  }
}

export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  let payload: { body?: string }
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  const body = payload.body?.trim()
  if (!body) return NextResponse.json({ error: 'body required' }, { status: 400 })

  try {
    const db = tenantDb(auth.tid)

    const { data: member } = await db
      .from('team_members') // tenant-scope-ok: tenantDb() scopes the select
      .select('name')
      .eq('id', auth.id)
      .single()

    const { data: inserted, error } = await db
      .from('tenant_owner_messages') // tenant-scope-ok: tenantDb() stamps tenant_id on insert
      .insert({
        direction: 'in', // in = from tenant side → platform/admin
        channel: 'platform',
        body,
        sender: member?.name || 'Team member',
        sender_role: 'team',
      })
      .select('id, direction, channel, body, sender, sender_role, created_at')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Same admin-facing notification the owner's POST creates — surfaces in
    // admin's existing unread/needs-reply feed, no separate plumbing needed.
    const { data: tenant } = await supabaseAdmin.from('tenants').select('name').eq('id', auth.tid).single()
    await db.from('notifications').insert({
      type: 'owner_message',
      title: `Team message — ${tenant?.name ?? 'tenant'}`,
      message: `${member?.name || 'Team member'}: ${body.slice(0, 180)}`,
      channel: 'system',
      recipient_type: 'admin',
    })

    return NextResponse.json({ ok: true, message: inserted })
  } catch {
    return NextResponse.json({ error: 'unexpected error' }, { status: 500 })
  }
}
