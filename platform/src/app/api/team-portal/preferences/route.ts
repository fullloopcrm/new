import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { verifyToken } from '../auth/token'
import { requireActiveTeamMember } from '@/lib/team-portal-auth'
import { corsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = corsPreflight

export const GET = withMobileCors(async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  // Instant revocation: preferences aren't tied to a specific
  // PortalPermission (every active member edits their own notification
  // prefs regardless of role), so re-verify the member is still active
  // rather than gating on RBAC.
  const { error: statusError } = await requireActiveTeamMember(auth)
  if (statusError) return statusError

  // tenantDb's select() takes a non-literal `columns` param, which widens
  // supabase-js's column-string type inference — cast to the shape actually selected.
  const { data: member } = (await tenantDb(auth.tid)
    .from('team_members')
    .select('notes')
    .eq('id', auth.id)
    .single()) as { data: { notes: string | null } | null }

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
})

export const PUT = withMobileCors(async function PUT(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { error: statusError } = await requireActiveTeamMember(auth)
  if (statusError) return statusError

  const { notification_preferences, sms_consent } = await request.json()

  // Get current notes
  const { data: member } = (await tenantDb(auth.tid)
    .from('team_members')
    .select('notes')
    .eq('id', auth.id)
    .single()) as { data: { notes: string | null } | null }

  let notesObj: Record<string, unknown> = {}
  if (member?.notes) {
    try { notesObj = JSON.parse(member.notes) } catch { notesObj = { text: member.notes } }
  }

  if (notification_preferences) notesObj.notification_preferences = notification_preferences
  if (sms_consent !== undefined) notesObj.sms_consent = sms_consent

  await tenantDb(auth.tid)
    .from('team_members')
    .update({ notes: JSON.stringify(notesObj) })
    .eq('id', auth.id)

  return NextResponse.json({ success: true })
})
