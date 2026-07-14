import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * WITNESS — cross-channel injection on POST /api/team-portal/connect.
 *
 * The field-staff portal's send-message route trusted a caller-supplied
 * `channel_id` verbatim (`let targetChannelId = channel_id`) with no check
 * that it belonged to the authenticated team member's own tenant/channel.
 * A valid token for one tenant could pass another tenant's channel_id — or
 * a same-tenant client's private channel_id — and have the message inserted
 * there. Fixed by verifying the channel is tenant_id=own AND type='general'
 * before trusting it; otherwise falling back to the normal
 * find-or-create-own-general-channel path.
 */

process.env.TEAM_PORTAL_SECRET = 'test-team-portal-secret'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake, __fake: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { createToken } from '../auth/token'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_A = 'tenant-a'
const TENANT_B = 'tenant-b'
const MEMBER_A1 = 'member-a1'

function seed() {
  fake._store.clear()
  fake._seed('team_members', [{ id: MEMBER_A1, tenant_id: TENANT_A, name: 'Alice' }])
  fake._seed('connect_channels', [
    { id: 'chan-a-general', tenant_id: TENANT_A, type: 'general', name: 'General' },
    { id: 'chan-a-client', tenant_id: TENANT_A, type: 'client', client_id: 'client-a1', name: 'Victor' },
    { id: 'chan-b-general', tenant_id: TENANT_B, type: 'general', name: 'Other tenant general' },
  ])
  fake._seed('connect_messages', [])
  fake._seed('connect_read_cursors', [])
}

function postReq(payload: unknown, token: string) {
  return new Request('http://x/api/team-portal/connect', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
}

beforeEach(() => {
  seed()
})

describe('POST /api/team-portal/connect — channel_id ownership', () => {
  it('WRONG-TENANT PROBE: a foreign channel_id from another tenant is not honored', async () => {
    const token = createToken(MEMBER_A1, TENANT_A)
    const res = await POST(postReq({ body: 'cross-tenant probe', channel_id: 'chan-b-general' }, token) as never)
    expect(res.status).toBe(201)
    const inserted = fake._store.get('connect_messages') || []
    expect(inserted).toHaveLength(1)
    expect(inserted[0].channel_id).toBe('chan-a-general')
    expect(inserted[0].tenant_id).toBe(TENANT_A)
  })

  it('WRONG-TYPE PROBE: a same-tenant client channel_id is not honored by a team sender', async () => {
    const token = createToken(MEMBER_A1, TENANT_A)
    const res = await POST(postReq({ body: 'hijacked into client channel', channel_id: 'chan-a-client' }, token) as never)
    expect(res.status).toBe(201)
    const inserted = fake._store.get('connect_messages') || []
    expect(inserted).toHaveLength(1)
    expect(inserted[0].channel_id).toBe('chan-a-general')
    expect(inserted[0].channel_id).not.toBe('chan-a-client')
  })

  it("positive control: the caller's own general channel_id is honored", async () => {
    const token = createToken(MEMBER_A1, TENANT_A)
    const res = await POST(postReq({ body: 'hello', channel_id: 'chan-a-general' }, token) as never)
    expect(res.status).toBe(201)
    const inserted = fake._store.get('connect_messages') || []
    expect(inserted).toHaveLength(1)
    expect(inserted[0].channel_id).toBe('chan-a-general')
  })

  it('positive control: omitting channel_id resolves the own general channel by lookup', async () => {
    const token = createToken(MEMBER_A1, TENANT_A)
    const res = await POST(postReq({ body: 'no channel id supplied' }, token) as never)
    expect(res.status).toBe(201)
    const inserted = fake._store.get('connect_messages') || []
    expect(inserted).toHaveLength(1)
    expect(inserted[0].channel_id).toBe('chan-a-general')
  })
})
