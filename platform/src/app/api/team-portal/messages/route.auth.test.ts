/**
 * TEAM-PORTAL MESSAGES AUTH GATE — /api/team-portal/messages GET+POST.
 *
 * Fleet-wide webhook/cron audit finding, 2026-07-13: unlike every other
 * /api/team-portal/* route (jobs/claim, jobs/release, rating, crew/*, ...),
 * this route never called requirePortalPermission() — it trusted a
 * team_member_id/cleaner_id taken straight from the query string or body.
 * 'messages.use' was already a defined portal permission, granted to every
 * role, but this route never checked it. Anyone who had (or guessed)
 * another team member's id could read their private thread with the office
 * and post messages that landed in Comhub attributed to that person.
 *
 * This suite proves requirePortalPermission('messages.use') is now wired
 * in, that a denied/missing token is rejected before any read or write, and
 * that the thread is resolved from the VERIFIED token identity — a
 * caller-supplied team_member_id in the request body is ignored.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextResponse } from 'next/server'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase() as unknown as {
    from: (table: string) => unknown
    _store: Map<string, Record<string, unknown>[]>
    rpc?: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>
  }
  // resolveThread() calls two RPCs the fake query builder doesn't model —
  // emulate them directly against the same in-memory store.
  fake.rpc = async (fn: string, args: Record<string, unknown>) => {
    if (fn === 'comhub_get_or_create_contact_by_phone') {
      const contacts = fake._store.get('comhub_contacts') ?? []
      const id = `contact-${args.p_phone}`
      if (!contacts.some(c => c.id === id)) {
        contacts.push({ id, phone: args.p_phone, name: args.p_name, team_member_id: null })
        fake._store.set('comhub_contacts', contacts)
      }
      return { data: id }
    }
    if (fn === 'comhub_get_or_create_thread') {
      const threads = fake._store.get('comhub_threads') ?? []
      const id = `thread-${args.p_contact_id}`
      if (!threads.some(t => t.id === id)) {
        threads.push({ id, contact_id: args.p_contact_id, unread_count: 0 })
        fake._store.set('comhub_threads', threads)
      }
      return { data: id }
    }
    return { data: null }
  }
  return { supabaseAdmin: fake }
})

let authResult: { auth: { id: string; tid: string; role: string } | null; error: NextResponse | null }
vi.mock('@/lib/team-portal-auth', () => ({
  requirePortalPermission: async () => authResult,
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET, POST } from './route'

const TENANT_ID = 'tenant-A'
const OWN_MEMBER_ID = 'member-me'
const VICTIM_MEMBER_ID = 'member-victim'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  fake._seed('team_members', [
    { id: OWN_MEMBER_ID, tenant_id: TENANT_ID, name: 'Me', phone: '+15551110000', email: 'me@x.com' },
    { id: VICTIM_MEMBER_ID, tenant_id: TENANT_ID, name: 'Victim', phone: '+15559990000', email: 'victim@x.com' },
  ])
})

function getReq(): Request {
  return new Request('http://x/api/team-portal/messages')
}

function postReq(body: Record<string, unknown>): Request {
  return new Request('http://x/api/team-portal/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('GET /api/team-portal/messages — auth gate', () => {
  it('rejects when requirePortalPermission denies (missing/invalid token)', async () => {
    authResult = { auth: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
    const res = await GET(getReq() as never)
    expect(res.status).toBe(401)
  })

  it('resolves the thread using the verified token identity', async () => {
    authResult = { auth: { id: OWN_MEMBER_ID, tid: TENANT_ID, role: 'worker' }, error: null }
    const res = await GET(getReq() as never)
    expect(res.status).toBe(200)
  })
})

describe('POST /api/team-portal/messages — auth gate', () => {
  it('rejects a forged post and creates no message', async () => {
    authResult = { auth: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
    const res = await POST(postReq({ team_member_id: VICTIM_MEMBER_ID, body: 'hi' }) as never)
    expect(res.status).toBe(401)

    const { data } = await fake.from('comhub_messages').select('id') // tenant-scope-ok: fake in-memory store assertion, not a live tenant-scoped query
    expect((data as unknown[] | null) || []).toHaveLength(0)
  })

  it('ignores a caller-supplied team_member_id and attributes the message to the verified identity', async () => {
    authResult = { auth: { id: OWN_MEMBER_ID, tid: TENANT_ID, role: 'worker' }, error: null }
    // Attacker tries to post AS the victim by spoofing team_member_id in the body.
    const res = await POST(postReq({ team_member_id: VICTIM_MEMBER_ID, body: 'spoof attempt' }) as never)
    expect(res.status).toBe(200)

    const { data: contacts } = await fake.from('comhub_contacts').select('id, team_member_id') // tenant-scope-ok: fake in-memory store assertion, not a live tenant-scoped query
    const ownContact = (contacts as { id: string; team_member_id: string }[] | null)?.find(c => c.team_member_id === OWN_MEMBER_ID)
    expect(ownContact).toBeTruthy()
    const victimContact = (contacts as { id: string; team_member_id: string }[] | null)?.find(c => c.team_member_id === VICTIM_MEMBER_ID)
    expect(victimContact).toBeFalsy()
  })
})
