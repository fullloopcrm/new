import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { protectClientAPI } from '@/lib/client-auth'

export async function GET(request: Request) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('client_id')
  if (!clientId) return NextResponse.json({ error: 'Missing client_id' }, { status: 400 })

  const auth = await protectClientAPI(tenant.id, clientId)
  if (auth instanceof NextResponse) return auth

  const { data, error } = await supabaseAdmin
    .from('clients')
    .select('notes')
    .eq('id', clientId)
    .eq('tenant_id', tenant.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  return NextResponse.json({ notes: data.notes || '' })
}

export async function PUT(request: Request) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const { client_id, notes } = body as { client_id?: string; notes?: unknown }
  if (!client_id) return NextResponse.json({ error: 'Missing client_id' }, { status: 400 })

  const auth = await protectClientAPI(tenant.id, client_id)
  if (auth instanceof NextResponse) return auth

  if (typeof notes !== 'string' || notes.length > 500) {
    return NextResponse.json({ error: 'Notes must be a string of 500 characters or less' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('clients')
    .update({ notes })
    .eq('id', client_id)
    .eq('tenant_id', tenant.id)

  if (error) return NextResponse.json({ error: 'Failed to save notes' }, { status: 500 })
  return NextResponse.json({ success: true })
}
