import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — cross-channel injection on POST /api/portal/connect.
 *
 * The client portal's send-message route trusted a caller-supplied
 * `channel_id` verbatim (`let targetChannelId = channel_id`) with no check
 * that it belonged to the authenticated client's own channel. A malicious or
 * compromised portal token holder could pass ANY channel_id — another
 * client's 1:1 support channel, or a channel from a different tenant — and
 * have their message inserted there, breaking channel isolation. Fixed by
 * verifying the channel is tenant_id=own AND type='client' AND
 * client_id=own before trusting it; otherwise fall back to the normal
 * find-or-create-own-channel path.
 */

process.env.PORTAL_SECRET = 'test-portal-secret'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

import { NextRequest } from 'next/server'
import { createToken } from '../auth/token'
import { POST } from './route'

const TENANT_A = 'tid-a'
const TENANT_B = 'tid-b'
const CLIENT_A1 = 'client-a1'
const CLIENT_A2 = 'client-a2'

function seed() {
  return {
    clients: [
      { id: CLIENT_A1, name: 'Alice' },
      { id: CLIENT_A2, name: 'Victor' },
    ],
    connect_channels: [
      { id: 'chan-a1', tenant_id: TENANT_A, type: 'client', client_id: CLIENT_A1, name: 'Alice' },
      { id: 'chan-a2', tenant_id: TENANT_A, type: 'client', client_id: CLIENT_A2, name: 'Victor' },
      { id: 'chan-b1', tenant_id: TENANT_B, type: 'client', client_id: 'client-b1', name: 'Other tenant client' },
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

describe('POST /api/portal/connect — channel_id ownership', () => {
  it("WRONG-CLIENT PROBE: another client's channel_id in the same tenant is not used", async () => {
    const token = createToken(CLIENT_A1, TENANT_A)
    const res = await POST(
      new NextRequest('http://x', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
        body: JSON.stringify({ body: 'hijacked message', channel_id: 'chan-a2' }),
      })
    )
    expect(res.status).toBe(201)
    const inserted = h.seed.connect_messages as Record<string, unknown>[]
    expect(inserted).toHaveLength(1)
    // Must land in the caller's OWN channel, never the foreign one.
    expect(inserted[0].channel_id).toBe('chan-a1')
    expect(inserted[0].channel_id).not.toBe('chan-a2')
  })

  it('WRONG-TENANT PROBE: a foreign channel_id from another tenant is not used', async () => {
    const token = createToken(CLIENT_A1, TENANT_A)
    const res = await POST(
      new NextRequest('http://x', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
        body: JSON.stringify({ body: 'cross-tenant probe', channel_id: 'chan-b1' }),
      })
    )
    expect(res.status).toBe(201)
    const inserted = h.seed.connect_messages as Record<string, unknown>[]
    expect(inserted).toHaveLength(1)
    expect(inserted[0].channel_id).toBe('chan-a1')
    expect(inserted[0].tenant_id).toBe(TENANT_A)
  })

  it("positive control: the caller's own channel_id is honored", async () => {
    const token = createToken(CLIENT_A2, TENANT_A)
    const res = await POST(
      new NextRequest('http://x', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
        body: JSON.stringify({ body: 'hello', channel_id: 'chan-a2' }),
      })
    )
    expect(res.status).toBe(201)
    const inserted = h.seed.connect_messages as Record<string, unknown>[]
    expect(inserted).toHaveLength(1)
    expect(inserted[0].channel_id).toBe('chan-a2')
  })

  it('positive control: omitting channel_id resolves the own channel by lookup', async () => {
    const token = createToken(CLIENT_A1, TENANT_A)
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
    expect(inserted[0].channel_id).toBe('chan-a1')
  })
})
