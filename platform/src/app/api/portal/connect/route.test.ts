import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * POST /api/portal/connect — channel_id ownership.
 *
 * The client portal's send-message route trusted a caller-supplied
 * `channel_id` verbatim (`let targetChannelId = channel_id`) with no check
 * that it belonged to the authenticated client's own channel. A malicious or
 * compromised portal token holder could pass ANY channel_id -- another
 * client's 1:1 support channel, or a channel from a different tenant -- and
 * have their message inserted there, breaking channel isolation. Fixed by
 * verifying the channel is tenant_id=own AND type='client' AND client_id=own
 * before trusting it; otherwise fall back to the normal find-or-create-own-
 * channel path.
 */

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  verifyPortalToken: vi.fn(),
})) as unknown as FakeStoreHandle & {
  verifyPortalToken: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('../auth/token', () => ({ verifyPortalToken: (...a: unknown[]) => h.verifyPortalToken(...a) }))

import { POST } from './route'

const TENANT_A = 'tenant-A'
const TENANT_B = 'tenant-B'
const CLIENT_A1 = 'client-a1'
const CLIENT_A2 = 'client-a2'

const postReq = (body: unknown) =>
  new NextRequest('http://x', { method: 'POST', headers: { authorization: 'Bearer tok' }, body: JSON.stringify(body) })

beforeEach(() => {
  h.seq = 0
  h.verifyPortalToken.mockReset()
  h.verifyPortalToken.mockReturnValue({ id: CLIENT_A1, tid: TENANT_A })
  h.store = {
    clients: [
      { id: CLIENT_A1, name: 'Alice' },
      { id: CLIENT_A2, name: 'Victor' },
    ],
    connect_channels: [
      { id: 'chan-a1', tenant_id: TENANT_A, type: 'client', client_id: CLIENT_A1, name: 'Alice' },
      { id: 'chan-a2', tenant_id: TENANT_A, type: 'client', client_id: CLIENT_A2, name: 'Victor' },
      { id: 'chan-b1', tenant_id: TENANT_B, type: 'client', client_id: 'client-b1', name: 'Other tenant client' },
    ],
    connect_messages: [],
    connect_read_cursors: [],
  }
})

describe('POST /api/portal/connect — channel_id ownership', () => {
  it("rejects another client's channel_id in the same tenant, falling back to the caller's own channel", async () => {
    const res = await POST(postReq({ body: 'hijacked message', channel_id: 'chan-a2' }))
    expect(res.status).toBe(201)

    expect(h.store.connect_messages).toHaveLength(1)
    expect(h.store.connect_messages[0].channel_id).toBe('chan-a1')
    expect(h.store.connect_messages[0].channel_id).not.toBe('chan-a2')
  })

  it('rejects a foreign channel_id from another tenant, falling back to the own channel', async () => {
    const res = await POST(postReq({ body: 'cross-tenant probe', channel_id: 'chan-b1' }))
    expect(res.status).toBe(201)

    expect(h.store.connect_messages).toHaveLength(1)
    expect(h.store.connect_messages[0].channel_id).toBe('chan-a1')
    expect(h.store.connect_messages[0].tenant_id).toBe(TENANT_A)
  })

  it("honors the caller's own channel_id", async () => {
    h.verifyPortalToken.mockReturnValue({ id: CLIENT_A2, tid: TENANT_A })
    const res = await POST(postReq({ body: 'hello', channel_id: 'chan-a2' }))
    expect(res.status).toBe(201)

    expect(h.store.connect_messages[0].channel_id).toBe('chan-a2')
  })

  it('resolves the own channel by lookup when channel_id is omitted', async () => {
    const res = await POST(postReq({ body: 'no channel id supplied' }))
    expect(res.status).toBe(201)

    expect(h.store.connect_messages[0].channel_id).toBe('chan-a1')
  })
})
