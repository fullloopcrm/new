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

  // Default preferences
  const defaults = {
    notification_preferences: {
      job_assignment: { push: true, email: true, sms: true },
      job_reminder: { push: true, email: true, sms: true },
      daily_summary: { push: true, email: true, sms: true },
      job_cancelled: { push: true, email: true, sms: true },
      job_rescheduled: { push: true, email: true, sms: true },
      broadcast: { push: true, email: true, sms: true },
      quiet_start: '22:00',
      quiet_end: '07:00',
    },
    sms_consent: true,
  }

  if (member?.notes) {
    try {
      const parsed = JSON.parse(member.notes)
      if (parsed.notification_preferences) {
        defaults.notification_preferences = {
          ...defaults.notification_preferences,
          ...parsed.notification_preferences,
        }
      }
      if (parsed.sms_consent !== undefined) {
        defaults.sms_consent = parsed.sms_consent
      }
    } catch { /* not JSON */ }
  }

  return NextResponse.json(defaults)
}

export async function PUT(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { notification_preferences, sms_consent } = await request.json()

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

  if (notification_preferences) notesObj.notification_preferences = notification_preferences
  if (sms_consent !== undefined) notesObj.sms_consent = sms_consent

  await supabaseAdmin
    .from('team_members')
    .update({ notes: JSON.stringify(notesObj) })
    .eq('id', auth.id)
    .eq('tenant_id', auth.tid)

  return NextResponse.json({ success: true })
}
