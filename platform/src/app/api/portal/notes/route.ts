import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { verifyPortalToken } from '../auth/token'

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { data } = await tenantDb(auth.tid)
    .from('clients')
    .select('notes')
    .eq('id', auth.id)
    .single()

  return NextResponse.json({ notes: data?.notes || '' })
}

export async function PUT(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { notes } = await request.json().catch(() => ({}))
  if (typeof notes !== 'string' || notes.length > 500) {
    return NextResponse.json({ error: 'Notes must be 500 chars or less' }, { status: 400 })
  }

  await tenantDb(auth.tid)
    .from('clients')
    .update({ notes })
    .eq('id', auth.id)

  return NextResponse.json({ success: true })
}
