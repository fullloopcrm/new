import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyPortalToken } from '../auth/route'

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('clients')
    .select('notes')
    .eq('id', auth.id)
    .eq('tenant_id', auth.tid)
    .single()

  return NextResponse.json({ notes: data?.notes || '' })
}

export async function PUT(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { notes } = await request.json()
  if (typeof notes !== 'string' || notes.length > 500) {
    return NextResponse.json({ error: 'Notes must be 500 chars or less' }, { status: 400 })
  }

  await supabaseAdmin
    .from('clients')
    .update({ notes })
    .eq('id', auth.id)
    .eq('tenant_id', auth.tid)

  return NextResponse.json({ success: true })
}
