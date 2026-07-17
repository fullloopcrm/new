import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyPortalToken } from '../auth/token'

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = await verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  // Backed by clients.special_instructions — the column team/page.tsx and
  // team-portal/jobs actually read as the client's standing "notes for the
  // cleaner" (door codes, parking, etc). clients.notes is a DIFFERENT column:
  // the operator-only field admin edits via the dashboard client form. This
  // route used to read/write .notes, which meant (a) whatever the client typed
  // here never reached the cleaner — nothing selects clients.notes for a job —
  // and (b) the client could read and silently overwrite the admin's private
  // notes, since GET returned that column's live contents pre-filled into this
  // exact textarea.
  const { data } = await supabaseAdmin
    .from('clients')
    .select('special_instructions')
    .eq('id', auth.id)
    .eq('tenant_id', auth.tid)
    .single()

  return NextResponse.json({ notes: data?.special_instructions || '' })
}

export async function PUT(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = await verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { notes } = await request.json().catch(() => ({}))
  if (typeof notes !== 'string' || notes.length > 500) {
    return NextResponse.json({ error: 'Notes must be 500 chars or less' }, { status: 400 })
  }

  await supabaseAdmin
    .from('clients')
    .update({ special_instructions: notes })
    .eq('id', auth.id)
    .eq('tenant_id', auth.tid)

  return NextResponse.json({ success: true })
}
