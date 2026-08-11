import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { corsPreflight, withMobileCors } from '@/lib/mobile-cors'

// GET/PUT /api/mobile/comhub/preferences — Com Hub Settings > Notifications
// (src/components/comhub-notification-prefs.tsx in the mobile app), which
// was calling a route that didn't exist anywhere in this backend.
//
// Shape matches the mobile app's fixture exactly (checked
// fl-mobile-appstore-audit-2026-08-11/src/lib/mock-data.ts's
// `comhubPreferences` + the component itself):
//   { notification_preferences: { <event_type>: { push, email, sms } } }
// with event types new_message / missed_call / voicemail.
//
// IMPORTANT — this is TENANT-LEVEL, not per-user. There is no concept of an
// individual dashboard/admin member's own push-notification preferences
// anywhere in this backend today (unlike team-portal, whose preferences are
// scoped to one team_members row). getTenantForRequest() resolves a
// tenant_members row for auth, but every admin/owner on a tenant reads and
// writes the SAME comhub_notification_preferences value here — one admin
// toggling "SMS off for missed calls" turns it off for every other admin on
// the same tenant too. A prior audit flagged this exact question ("confirm
// whether tenant-level is sufficient or per-user push toggles are actually
// needed") for the general comms-prefs system; it applies here too and was
// not re-litigated — this route just makes today's tenant-level reality
// honestly match what's actually stored, instead of pretending it's
// per-user. If per-user is actually required, this needs a real per-member
// preferences table/column plus a way to key mobile-app push tokens to a
// specific member, neither of which exist yet.
//
// Persisted in tenants.comhub_notification_preferences — a column of its
// own, NOT folded into tenants.notification_preferences (see the migration
// comment in migrations/2026_08_11_comhub_notification_preferences.sql for
// why: that column gets fully overwritten by settings/notifications' PUT
// handler on every unrelated Communications-tab save, and its comms-registry
// keys/channels don't match Com Hub's event types or its push channel
// anyway).

const DEFAULT_CHANNELS = { push: true, email: false, sms: false }

interface ChannelPrefs {
  push: boolean
  email: boolean
  sms: boolean
}

function normalize(raw: unknown): Record<string, ChannelPrefs> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, ChannelPrefs> = {}
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!val || typeof val !== 'object') continue
    const v = val as Record<string, unknown>
    out[key] = {
      push: typeof v.push === 'boolean' ? v.push : DEFAULT_CHANNELS.push,
      email: typeof v.email === 'boolean' ? v.email : DEFAULT_CHANNELS.email,
      sms: typeof v.sms === 'boolean' ? v.sms : DEFAULT_CHANNELS.sms,
    }
  }
  return out
}

export const OPTIONS = corsPreflight

export const GET = withMobileCors(async function GET() {
  let tenantId: string
  try {
    const ctx = await getTenantForRequest()
    tenantId = ctx.tenantId
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 401
    return NextResponse.json({ error: 'Unauthorized' }, { status })
  }

  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('comhub_notification_preferences')
    .eq('id', tenantId)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const stored = normalize(data?.comhub_notification_preferences)
  const notification_preferences = {
    new_message: stored.new_message || { ...DEFAULT_CHANNELS },
    missed_call: stored.missed_call || { ...DEFAULT_CHANNELS },
    voicemail: stored.voicemail || { ...DEFAULT_CHANNELS },
    ...stored,
  }

  return NextResponse.json({ notification_preferences })
})

export const PUT = withMobileCors(async function PUT(request: NextRequest) {
  let tenantId: string
  try {
    const ctx = await getTenantForRequest()
    tenantId = ctx.tenantId
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 401
    return NextResponse.json({ error: 'Unauthorized' }, { status })
  }

  const body = await request.json().catch(() => ({}))
  const notification_preferences = normalize(body?.notification_preferences)

  const { error } = await supabaseAdmin
    .from('tenants')
    .update({ comhub_notification_preferences: notification_preferences })
    .eq('id', tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
})
