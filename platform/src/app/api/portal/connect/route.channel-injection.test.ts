import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * portal/connect POST — channel_id FK-injection.
 *
 * BUG: a caller-supplied `channel_id` was used verbatim as the insert target
 * for a new `connect_messages` row. `tenantDb(auth.tid)` stamps `tenant_id`
 * on the row to the CALLER's own tenant, but never verifies the supplied
 * `channel_id` actually belongs to that tenant (or that client). The admin
 * inbox (`GET /api/connect/messages`) reads `connect_messages` filtered by
 * `channel_id` ALONE, with no `tenant_id` filter — so a client on tenant A
 * could inject a message under a channel_id belonging to tenant B, and it
 * would surface directly in tenant B's real support inbox as if a genuine
 * client had sent it. Same FK-injection class as this session's other fixes,
 * just a WRITE-injection into another tenant's data instead of a read-exfil.
 *
 * FIX: a supplied channel_id is now verified to belong to the caller's own
 * client_id before use; an unowned id is ignored and the route falls back to
 * the caller's own (find-or-create) channel, same as the omitted-id path.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentAuth: { id: string; tid: string } | null
vi.mock('../auth/token', () => ({
  verifyPortalToken: (_token: string) => currentAuth,
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const TENANT_A = 'tenant-A'
const TENANT_B = 'tenant-B'
const CLIENT_A = 'client-a'
const CLIENT_B_VICTIM = 'client-b-victim'
const VICTIM_CHANNEL = 'chan-victim-b'
const OWN_CHANNEL = 'chan-own-a'
const fake = supabaseAdmin as unknown as FakeSupabase

function req(body: unknown): Request {
  return new Request('http://x/api/portal/connect', {
    method: 'POST',
    headers: { authorization: 'Bearer whatever' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  fake._store.clear()
  currentAuth = { id: CLIENT_A, tid: TENANT_A }
  fake._seed('connect_channels', [
    { id: OWN_CHANNEL, tenant_id: TENANT_A, type: 'client', client_id: CLIENT_A },
    { id: VICTIM_CHANNEL, tenant_id: TENANT_B, type: 'client', client_id: CLIENT_B_VICTIM },
  ])
  fake._seed('clients', [
    { id: CLIENT_A, name: 'Client A', tenant_id: TENANT_A },
    { id: CLIENT_B_VICTIM, name: 'Victim Client', tenant_id: TENANT_B },
  ])
})

describe('POST /api/portal/connect — channel_id ownership verified before insert', () => {
  it('rejects a foreign channel_id: the message is NOT attached to the victim tenant channel', async () => {
    const res = await POST(req({ body: 'spoofed message', channel_id: VICTIM_CHANNEL }) as never)
    expect(res.status).toBe(201)

    const injected = fake._all('connect_messages').filter((m) => m.channel_id === VICTIM_CHANNEL)
    expect(injected).toHaveLength(0)
  })

  it('falls back to the caller own channel when a foreign channel_id is supplied', async () => {
    const res = await POST(req({ body: 'spoofed message', channel_id: VICTIM_CHANNEL }) as never)
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body.message.channel_id).toBe(OWN_CHANNEL)
    expect(body.message.tenant_id).toBe(TENANT_A)
  })

  it('positive control: the caller own channel_id still works normally', async () => {
    const res = await POST(req({ body: 'hello', channel_id: OWN_CHANNEL }) as never)
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body.message.channel_id).toBe(OWN_CHANNEL)
  })
})
