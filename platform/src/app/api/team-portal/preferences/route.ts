import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyToken } from '../auth/token'
import { casUpdateTeamMemberNotes } from '@/lib/team-member-notes'

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

  // notes is a shared JSON blob also written by team-portal/availability and
  // the admin dashboard's schedule/time-off editor -- CAS-guarded (see
  // lib/team-member-notes.ts) so a race with either of those doesn't
  // silently clobber this write (or get clobbered by them).
  await casUpdateTeamMemberNotes(auth.id, auth.tid, (current) => {
    const next = { ...current }
    if (notification_preferences) next.notification_preferences = notification_preferences
    if (sms_consent !== undefined) next.sms_consent = sms_consent
    return next
  })

  return NextResponse.json({ success: true })
}
