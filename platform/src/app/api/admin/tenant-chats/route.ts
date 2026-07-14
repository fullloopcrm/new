// Master tenant-owner chat — platform admin <-> each tenant's OWNER (not clients).
// Lives in Jefe's family: Jeff (or Jefe) talking to owners, threaded per tenant.
// GET           -> thread list (every tenant + last message + unread)
// GET ?tenant_id -> one thread's messages (marks inbound read)
// POST          -> send a message to the owner via the tenant's own channel
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { requireAdmin } from '@/lib/require-admin'
import { isCrossSiteRequest } from '@/lib/csrf-guard'

interface MsgRow {
  id: string
  tenant_id: string
  direction: 'in' | 'out'
  channel: string | null
  body: string
  sender: string | null
  read_at: string | null
  created_at: string
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const tenantId = request.nextUrl.searchParams.get('tenant_id')

  // Single thread.
  if (tenantId) {
    const db = tenantDb(tenantId)
    const { data, error } = await db
      .from('tenant_owner_messages')
      .select('id, tenant_id, direction, channel, body, sender, read_at, created_at')
      .order('created_at', { ascending: true })
      .limit(500)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    // Mark inbound as read. Skipped on a forged cross-site GET (SameSite=Lax
    // still sends cookies on top-level navigation) — see csrf-guard.ts.
    if (!isCrossSiteRequest(request.headers)) {
      await db
        .from('tenant_owner_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('direction', 'in')
        .is('read_at', null)
    }
    return NextResponse.json({ messages: data || [] })
  }

  // Thread list: every active tenant + their last message + unread count.
  const [tenantsRes, msgsRes] = await Promise.all([
    supabaseAdmin.from('tenants').select('id, name, slug, owner_name, owner_email, owner_phone').neq('status', 'deleted').order('name'),
    supabaseAdmin
      .from('tenant_owner_messages')
      .select('tenant_id, direction, body, read_at, created_at')
      .order('created_at', { ascending: false })
      .limit(1000),
  ])
  if (tenantsRes.error) return NextResponse.json({ error: tenantsRes.error.message }, { status: 500 })

  const msgs = (msgsRes.data || []) as Array<Pick<MsgRow, 'tenant_id' | 'direction' | 'body' | 'read_at' | 'created_at'>>
  const lastByTenant = new Map<string, { body: string; created_at: string; direction: 'in' | 'out' }>()
  const unreadByTenant = new Map<string, number>()
  for (const m of msgs) {
    if (!lastByTenant.has(m.tenant_id)) lastByTenant.set(m.tenant_id, { body: m.body, created_at: m.created_at, direction: m.direction })
    if (m.direction === 'in' && !m.read_at) unreadByTenant.set(m.tenant_id, (unreadByTenant.get(m.tenant_id) || 0) + 1)
  }

  const threads = (tenantsRes.data || []).map((t) => {
    const last = lastByTenant.get(t.id)
    return {
      tenant_id: t.id,
      tenant_name: t.name,
      slug: t.slug,
      owner_name: t.owner_name,
      has_contact: Boolean(t.owner_email || t.owner_phone),
      last_message: last?.body?.slice(0, 120) || null,
      last_at: last?.created_at || null,
      unread: unreadByTenant.get(t.id) || 0,
      // Triage: the owner sent the last message and it's unanswered.
      needs_reply: last?.direction === 'in',
    }
  })
  // Needs-reply first, then most-recent activity, then the rest alphabetically.
  threads.sort((a, b) => {
    if (a.needs_reply !== b.needs_reply) return a.needs_reply ? -1 : 1
    if (a.last_at && b.last_at) return b.last_at.localeCompare(a.last_at)
    if (a.last_at) return -1
    if (b.last_at) return 1
    return a.tenant_name.localeCompare(b.tenant_name)
  })

  const totalUnread = [...unreadByTenant.values()].reduce((s, n) => s + n, 0)
  return NextResponse.json({ threads, total_unread: totalUnread })
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  let payload: { tenant_id?: string; body?: string }
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  const { tenant_id, body } = payload
  if (!tenant_id || !body?.trim()) {
    return NextResponse.json({ error: 'tenant_id and body required' }, { status: 400 })
  }

  const { data: tenant } = await supabaseAdmin.from('tenants').select('name').eq('id', tenant_id).limit(1).single()
  if (!tenant) return NextResponse.json({ error: 'tenant not found' }, { status: 404 })

  // Level 1 is IN-PLATFORM ONLY — no SMS/email. Sending = storing a row the
  // owner reads in their dashboard. channel 'platform', sender_role keeps it
  // bot-ready (a future Jefe turn would post with sender_role 'jefe').
  const { data: inserted, error } = await tenantDb(tenant_id)
    .from('tenant_owner_messages')
    .insert({
      direction: 'out', // out = from platform/admin → owner
      channel: 'platform',
      body,
      sender: 'jeff',
      sender_role: 'admin',
      read_at: new Date().toISOString(), // admin's own message is "read" on the admin side
    })
    .select('id, direction, channel, body, sender, sender_role, created_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, message: inserted })
}
