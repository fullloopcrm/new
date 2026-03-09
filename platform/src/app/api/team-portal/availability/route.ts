import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyToken } from '../auth/route'

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { data: member } = await supabaseAdmin
    .from('team_members')
    .select('notes')
    .eq('id', auth.id)
    .eq('tenant_id', auth.tid)
    .single()

  // Store availability in member notes as JSON for now
  let availability = { working_days: [1, 2, 3, 4, 5], blocked_dates: [] as string[] }
  if (member?.notes) {
    try {
      const parsed = JSON.parse(member.notes)
      if (parsed.availability) availability = parsed.availability
    } catch { /* not JSON, ignore */ }
  }

  return NextResponse.json({ availability })
}

export async function PUT(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { availability } = await request.json()

  // Get current notes
  const { data: member } = await supabaseAdmin
    .from('team_members')
    .select('notes')
    .eq('id', auth.id)
    .eq('tenant_id', auth.tid)
    .single()

  let notesObj: Record<string, unknown> = {}
  if (member?.notes) {
    try { notesObj = JSON.parse(member.notes) } catch { notesObj = { text: member.notes } }
  }
  notesObj.availability = availability

  await supabaseAdmin
    .from('team_members')
    .update({ notes: JSON.stringify(notesObj) })
    .eq('id', auth.id)
    .eq('tenant_id', auth.tid)

  return NextResponse.json({ availability })
}
