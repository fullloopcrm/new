import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * team-portal/connect POST — channel_id FK-injection.
 *
 * BUG: a caller-supplied `channel_id` was used verbatim as the insert target
 * for a new `connect_messages` row, with `tenant_id: auth.tid` (the CALLER's
 * own tenant) stamped explicitly — but the supplied `channel_id` itself was
 * never verified to belong to that tenant. The admin inbox
 * (`GET /api/connect/messages`) reads `connect_messages` filtered by
 * `channel_id` ALONE, with no `tenant_id` filter — so a team member on
 * tenant A could inject a message under a channel_id belonging to tenant B,
 * and it would surface directly in tenant B's real support inbox as if a
 * genuine team member had sent it. Same FK-injection class as the sibling
 * portal/connect (client) bug, just on the team-portal side.
 *
 * FIX: a supplied channel_id is now verified to belong to the caller's own
 * tenant before use; an unowned id is ignored and the route falls back to
 * the tenant's general channel, same as the omitted-id path.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentAuth: { id: string; tid: string; role: string } | null
vi.mock('../auth/token', () => ({
  verifyToken: (_token: string) => currentAuth,
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const TENANT_A = 'tenant-A'
const TENANT_B = 'tenant-B'
const MEMBER_A = 'member-a'
const GENERAL_A = 'chan-general-a'
const VICTIM_CHANNEL = 'chan-victim-b'
const fake = supabaseAdmin as unknown as FakeSupabase

function req(body: unknown): Request {
  return new Request('http://x/api/team-portal/connect', {
    method: 'POST',
    headers: { authorization: 'Bearer whatever' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  fake._store.clear()
  currentAuth = { id: MEMBER_A, tid: TENANT_A, role: 'cleaner' }
  fake._seed('connect_channels', [
    { id: GENERAL_A, tenant_id: TENANT_A, type: 'general', name: 'General' },
    { id: VICTIM_CHANNEL, tenant_id: TENANT_B, type: 'general', name: 'General' },
  ])
  fake._seed('team_members', [{ id: MEMBER_A, name: 'Team Member A', tenant_id: TENANT_A }])
})

describe('POST /api/team-portal/connect — channel_id ownership verified before insert', () => {
  it('rejects a foreign channel_id: the message is NOT attached to the victim tenant channel', async () => {
    const res = await POST(req({ body: 'spoofed message', channel_id: VICTIM_CHANNEL }) as never)
    expect(res.status).toBe(201)

    const injected = fake._all('connect_messages').filter((m) => m.channel_id === VICTIM_CHANNEL)
    expect(injected).toHaveLength(0)
  })

  it('falls back to the tenant own general channel when a foreign channel_id is supplied', async () => {
    const res = await POST(req({ body: 'spoofed message', channel_id: VICTIM_CHANNEL }) as never)
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body.message.channel_id).toBe(GENERAL_A)
    expect(body.message.tenant_id).toBe(TENANT_A)
  })

  it('positive control: the caller own tenant channel_id still works normally', async () => {
    const res = await POST(req({ body: 'hello', channel_id: GENERAL_A }) as never)
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body.message.channel_id).toBe(GENERAL_A)
  })
})
