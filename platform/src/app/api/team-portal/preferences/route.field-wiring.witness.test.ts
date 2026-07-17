import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * team-portal/preferences GET+PUT — wrong-column bug (fixed here).
 *
 * The crew member's own notification/SMS-consent settings page read and wrote
 * team_members.notes (JSON-encoded) instead of the real
 * team_members.notification_preferences / sms_consent columns
 * (migrations/013_full_parity.sql, 011_parity_with_nycmaid.sql) — the exact
 * columns notifyTeamMember() (src/lib/notify-team-member.ts) reads to decide
 * whether to actually push/email/text a team member.
 *
 * GET/PUT round-tripped against `notes` internally, so from the crew member's
 * side the settings page looked like it worked. But the real send path never
 * read `notes`, so:
 *   1. A team member revoking SMS consent, or disabling SMS for a specific
 *      notification type, kept getting real SMS anyway — a live consent-gate
 *      failure, same class this session already fixed repeatedly for clients,
 *      here on the team-member side.
 *   2. The admin dashboard's own separate "Notification Preferences" toggle
 *      (`/dashboard/team/[id]`, PUT /api/team/[id]) ALSO only ever writes
 *      notes.notification_prefs (a third, differently-shaped key) — also
 *      never read by notifyTeamMember. That toggle is flagged as NOTICED, not
 *      fixed here: reconciling its 4 flat booleans with the real 6-category
 *      x 3-channel shape is a UI redesign, not a field-wiring fix.
 *
 * FIX: both handlers now target notification_preferences/sms_consent, the
 * columns notifyTeamMember() actually reads, and leave `notes` untouched.
 */

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('../auth/token', () => ({
  verifyToken: (token: string) => {
    if (token === 'token-a') return { id: 'member-a', tid: 'tid-a', role: 'worker' }
    if (token === 'token-b-on-a') return { id: 'member-b', tid: 'tid-a', role: 'worker' }
    return null
  },
}))

import { GET, PUT } from './route'

const TENANT_A = 'tid-a'
const MEMBER_A = 'member-a'

function seed() {
  return {
    team_members: [
      {
        id: MEMBER_A,
        tenant_id: TENANT_A,
        notes: 'Some unrelated legacy text',
        notification_preferences: null,
        sms_consent: true,
      },
    ],
  }
}

function getReq(token: string): NextRequest {
  return new NextRequest('http://x/api/team-portal/preferences', {
    headers: { authorization: `Bearer ${token}` },
  })
}

function putReq(token: string, body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://x/api/team-portal/preferences', {
    method: 'PUT',
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('team-portal/preferences — reads/writes the real notification_preferences/sms_consent columns, not notes', () => {
  it('PUT revoking sms_consent writes the real sms_consent column', async () => {
    await PUT(putReq('token-a', { sms_consent: false }))
    const row = (h.seed.team_members as Array<{ id: string; sms_consent?: boolean }>).find((r) => r.id === MEMBER_A)
    expect(row?.sms_consent).toBe(false)
  })

  it('PUT never writes preferences into notes', async () => {
    await PUT(putReq('token-a', { sms_consent: false, notification_preferences: { job_assignment: { push: true, email: true, sms: false } } }))
    const row = (h.seed.team_members as Array<{ id: string; notes?: string }>).find((r) => r.id === MEMBER_A)
    expect(row?.notes).toBe('Some unrelated legacy text')
  })

  it('GET reflects a saved sms_consent=false from the real column (what notifyTeamMember actually reads)', async () => {
    await PUT(putReq('token-a', { sms_consent: false }))
    const res = await GET(getReq('token-a'))
    const body = await res.json()
    expect(body.sms_consent).toBe(false)
  })

  it('PUT merges a partial notification_preferences update onto the existing column instead of clobbering other types', async () => {
    await PUT(putReq('token-a', { notification_preferences: { job_assignment: { push: true, email: true, sms: false } } }))
    await PUT(putReq('token-a', { notification_preferences: { daily_summary: { push: false, email: true, sms: true } } }))
    const row = (h.seed.team_members as Array<{ id: string; notification_preferences?: Record<string, unknown> }>).find((r) => r.id === MEMBER_A)
    expect(row?.notification_preferences?.job_assignment).toEqual({ push: true, email: true, sms: false })
    expect(row?.notification_preferences?.daily_summary).toEqual({ push: false, email: true, sms: true })
  })
})

describe('team-portal/preferences — wrong-tenant / wrong-member probe', () => {
  it("member B's token cannot read or write member A's preferences", async () => {
    await PUT(putReq('token-a', { sms_consent: false }))

    const res = await GET(getReq('token-b-on-a'))
    const body = await res.json()
    // member-b has no seeded row, so this should return safe defaults, not member A's data
    expect(body.sms_consent).toBe(true)
  })

  it("an invalid token is rejected before any write reaches team_members", async () => {
    const res = await PUT(putReq('bogus-token', { sms_consent: false }))
    expect(res.status).toBe(401)
    const row = (h.seed.team_members as Array<{ id: string; sms_consent?: boolean }>).find((r) => r.id === MEMBER_A)
    expect(row?.sms_consent).toBe(true)
  })
})
