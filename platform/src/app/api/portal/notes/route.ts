import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { verifyPortalToken } from '../auth/token'

// Wire to clients.special_instructions (client-facing "notes for your team member"),
// NOT clients.notes -- that column is the internal staff/operator note field
// (dashboard client-drawer "Operator" tab) and must never be client-readable or -writable.
export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { data } = (await tenantDb(auth.tid)
    .from('clients')
    .select('special_instructions')
    .eq('id', auth.id)
    .single()) as { data: { special_instructions: string | null } | null }

  return NextResponse.json({ notes: data?.special_instructions || '' })
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
    .update({ special_instructions: notes })
    .eq('id', auth.id)

  return NextResponse.json({ success: true })
}
