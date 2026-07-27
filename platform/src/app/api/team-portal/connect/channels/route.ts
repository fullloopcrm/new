import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { verifyToken } from '../../auth/token'

// Channels visible to a field-staff member: the shared General channel plus
// their own private DM with the office. Both are auto-created on first view
// so the team portal never has to show an empty state for either.
export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  try {
    const db = tenantDb(auth.tid)

    let { data: general } = await db
      .from('connect_channels') // tenant-scope-ok: tenantDb() scopes the select
      .select('id, name, type')
      .eq('type', 'general')
      .single()

    if (!general) {
      const { data: created } = await db
        .from('connect_channels') // tenant-scope-ok: tenantDb() stamps tenant_id on insert
        .insert({ type: 'general', name: 'General' })
        .select('id, name, type')
        .single()
      general = created
    }

    let { data: dm } = await db
      .from('connect_channels') // tenant-scope-ok: tenantDb() scopes the select
      .select('id, name, type')
      .eq('type', 'dm')
      .eq('team_member_id', auth.id)
      .single()

    if (!dm) {
      const { data: member } = await db
        .from('team_members')
        .select('name')
        .eq('id', auth.id)
        .single()

      const { data: created } = await db
        .from('connect_channels') // tenant-scope-ok: tenantDb() stamps tenant_id on insert
        .insert({ type: 'dm', team_member_id: auth.id, name: member?.name || 'Office' })
        .select('id, name, type')
        .single()
      dm = created
    }

    const channels = [dm, general].filter(Boolean)
    return NextResponse.json({ channels })
  } catch {
    return NextResponse.json({ channels: [] })
  }
}
