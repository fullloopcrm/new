import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — cross-channel injection on POST /api/team-portal/connect.
 *
 * The field-staff portal's send-message route trusted a caller-supplied
 * `channel_id` verbatim (`let targetChannelId = channel_id`) with no check
 * that it belonged to the authenticated team member's own tenant/channel.
 * A malicious or compromised team-portal token holder could pass ANY
 * channel_id — a client's private support channel, or a channel from a
 * different tenant entirely — and have their message inserted there,
 * breaking channel isolation. Fixed by verifying the channel is
 * tenant_id=own AND type='general' before trusting it; otherwise fall back
 * to the normal find-or-create-own-general-channel path. Same bug class
 * already fixed on the client portal's sibling route (portal/connect).
 */

process.env.TEAM_PORTAL_SECRET = 'test-team-portal-secret'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

import { NextRequest } from 'next/server'
import { createToken } from '../auth/token'
import { POST } from './route'

const TENANT_A = 'tid-a'
const TENANT_B = 'tid-b'
const MEMBER_A1 = 'member-a1'

function seed() {
  return {
    team_members: [{ id: MEMBER_A1, name: 'Alice' }],
    connect_channels: [
      { id: 'chan-a-general', tenant_id: TENANT_A, type: 'general', name: 'General' },
      { id: 'chan-a-client', tenant_id: TENANT_A, type: 'client', client_id: 'client-a1', name: 'Victor' },
      { id: 'chan-b-general', tenant_id: TENANT_B, type: 'general', name: 'Other tenant general' },
    ],
    connect_messages: [] as Record<string, unknown>[],
    connect_read_cursors: [] as Record<string, unknown>[],
  }
}

let h: Harness

beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('POST /api/team-portal/connect — channel_id ownership', () => {
  it('WRONG-TENANT PROBE: a foreign channel_id from another tenant is not used', async () => {
    const token = createToken(MEMBER_A1, TENANT_A)
    const res = await POST(
      new NextRequest('http://x', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
        body: JSON.stringify({ body: 'cross-tenant probe', channel_id: 'chan-b-general' }),
      })
    )
    expect(res.status).toBe(201)
    const inserted = h.seed.connect_messages as Record<string, unknown>[]
    expect(inserted).toHaveLength(1)
    expect(inserted[0].channel_id).toBe('chan-a-general')
    expect(inserted[0].tenant_id).toBe(TENANT_A)
  })

  it("WRONG-TYPE PROBE: a same-tenant client channel_id is not used by a team sender", async () => {
    const token = createToken(MEMBER_A1, TENANT_A)
    const res = await POST(
      new NextRequest('http://x', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
        body: JSON.stringify({ body: 'hijacked into client channel', channel_id: 'chan-a-client' }),
      })
    )
    expect(res.status).toBe(201)
    const inserted = h.seed.connect_messages as Record<string, unknown>[]
    expect(inserted).toHaveLength(1)
    expect(inserted[0].channel_id).toBe('chan-a-general')
    expect(inserted[0].channel_id).not.toBe('chan-a-client')
  })

  it("positive control: the caller's own general channel_id is honored", async () => {
    const token = createToken(MEMBER_A1, TENANT_A)
    const res = await POST(
      new NextRequest('http://x', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
        body: JSON.stringify({ body: 'hello', channel_id: 'chan-a-general' }),
      })
    )
    expect(res.status).toBe(201)
    const inserted = h.seed.connect_messages as Record<string, unknown>[]
    expect(inserted).toHaveLength(1)
    expect(inserted[0].channel_id).toBe('chan-a-general')
  })

  it('positive control: omitting channel_id resolves the own general channel by lookup', async () => {
    const token = createToken(MEMBER_A1, TENANT_A)
    const res = await POST(
      new NextRequest('http://x', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
        body: JSON.stringify({ body: 'no channel id supplied' }),
      })
    )
    expect(res.status).toBe(201)
    const inserted = h.seed.connect_messages as Record<string, unknown>[]
    expect(inserted).toHaveLength(1)
    expect(inserted[0].channel_id).toBe('chan-a-general')
  })
})
