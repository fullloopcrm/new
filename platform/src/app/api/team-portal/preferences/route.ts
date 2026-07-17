import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyToken } from '../auth/token'

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = await verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { data: member } = await supabaseAdmin
    .from('team_members')
    .select('notification_preferences, sms_consent')
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

  // These are real columns (migrations/013_full_parity.sql), the same ones
  // notifyTeamMember() (src/lib/notify-team-member.ts) reads to decide
  // whether to actually send — NOT the `notes` field. Merge onto the
  // defaults so an unset column still returns the full default shape.
  if (member?.notification_preferences) {
    defaults.notification_preferences = {
      ...defaults.notification_preferences,
      ...member.notification_preferences,
    }
  }
  if (member?.sms_consent !== undefined && member?.sms_consent !== null) {
    defaults.sms_consent = member.sms_consent
  }

  return NextResponse.json(defaults)
}

export async function PUT(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = await verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { notification_preferences, sms_consent } = await request.json()

  // Get the current real column (not `notes` — see GET's comment) so a
  // partial PUT merges onto whatever's already saved instead of clobbering it.
  const { data: member } = await supabaseAdmin
    .from('team_members')
    .select('notification_preferences')
    .eq('id', auth.id)
    .eq('tenant_id', auth.tid)
    .single()

  const updates: Record<string, unknown> = {}
  if (notification_preferences) {
    updates.notification_preferences = {
      ...(member?.notification_preferences || {}),
      ...notification_preferences,
    }
  }
  if (sms_consent !== undefined) updates.sms_consent = sms_consent

  if (Object.keys(updates).length > 0) {
    await supabaseAdmin
      .from('team_members')
      .update(updates)
      .eq('id', auth.id)
      .eq('tenant_id', auth.tid)
  }

  return NextResponse.json({ success: true })
}
