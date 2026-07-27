// @vitest-environment node
//
// multipart/form-data parsing requires Node's native undici File/FormData;
// jsdom's own File/FormData implementations aren't interoperable with it.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * WITNESS-style coverage for photo uploads mirroring
 * ../route.isolation.test.ts: POST /api/team-portal/connect/upload shares
 * the same resolveTeamConnectChannel ownership check as the text-message
 * route (connect-team-channel.ts) -- a foreign tenant's channel, or a
 * same-tenant channel belonging to a *different* team member, must never be
 * writable (or have a file uploaded to its storage path) by this caller.
 */

process.env.TEAM_PORTAL_SECRET = 'test-team-portal-secret'

const uploadMock = vi.fn(async (_path: string, ..._rest: unknown[]) => ({ error: null }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  Object.assign(fake, {
    storage: {
      from: () => ({
        upload: uploadMock,
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.example.com/${path}` } }),
      }),
    },
  })
  return { supabaseAdmin: fake, __fake: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { createToken } from '../../auth/token'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase & { storage: unknown }

const TENANT_A = 'tenant-a'
const TENANT_B = 'tenant-b'
const MEMBER_A1 = 'member-a1'
const MEMBER_A2 = 'member-a2'

function seed() {
  fake._store.clear()
  fake._seed('team_members', [
    { id: MEMBER_A1, tenant_id: TENANT_A, name: 'Alice' },
    { id: MEMBER_A2, tenant_id: TENANT_A, name: 'Bob' },
  ])
  fake._seed('connect_channels', [
    { id: 'chan-a1-team', tenant_id: TENANT_A, type: 'team', team_member_id: MEMBER_A1, name: 'Alice' },
    { id: 'chan-a2-team', tenant_id: TENANT_A, type: 'team', team_member_id: MEMBER_A2, name: 'Bob' },
    { id: 'chan-a-client', tenant_id: TENANT_A, type: 'client', client_id: 'client-a1', name: 'Victor' },
    { id: 'chan-b-team', tenant_id: TENANT_B, type: 'team', team_member_id: 'member-b1', name: 'Other tenant' },
  ])
  fake._seed('connect_messages', [])
  fake._seed('connect_read_cursors', [])
  fake._seed('connect_channel_members', [])
  fake._seed('tenants', [{ id: TENANT_A, anthropic_api_key: null }])
}

function uploadReq(channelId: string | undefined, token: string) {
  const form = new FormData()
  form.set('file', new File([new Uint8Array([1, 2, 3])], 'photo.jpg', { type: 'image/jpeg' }))
  if (channelId) form.set('channel_id', channelId)
  return new Request('http://x/api/team-portal/connect/upload', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: form,
  })
}

beforeEach(() => {
  seed()
  uploadMock.mockClear()
})

describe('POST /api/team-portal/connect/upload — channel ownership', () => {
  it('WRONG-TENANT PROBE: a foreign channel_id from another tenant is rejected, no upload', async () => {
    const token = createToken(MEMBER_A1, TENANT_A)
    const res = await POST(uploadReq('chan-b-team', token) as never)
    expect(res.status).toBe(400)
    expect(uploadMock).not.toHaveBeenCalled()
    expect(fake._store.get('connect_messages') || []).toHaveLength(0)
  })

  it("WRONG-MEMBER PROBE: another team member's own channel is rejected, no upload", async () => {
    const token = createToken(MEMBER_A1, TENANT_A)
    const res = await POST(uploadReq('chan-a2-team', token) as never)
    expect(res.status).toBe(400)
    expect(uploadMock).not.toHaveBeenCalled()
    expect(fake._store.get('connect_messages') || []).toHaveLength(0)
  })

  it('WRONG-TYPE PROBE: a same-tenant client channel is rejected, no upload', async () => {
    const token = createToken(MEMBER_A1, TENANT_A)
    const res = await POST(uploadReq('chan-a-client', token) as never)
    expect(res.status).toBe(400)
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it("positive control: the caller's own team channel succeeds", async () => {
    const token = createToken(MEMBER_A1, TENANT_A)
    const res = await POST(uploadReq('chan-a1-team', token) as never)
    expect(res.status).toBe(201)
    expect(uploadMock).toHaveBeenCalledTimes(1)
    const inserted = fake._store.get('connect_messages') || []
    expect(inserted).toHaveLength(1)
    expect(inserted[0].channel_id).toBe('chan-a1-team')
    const attachments = inserted[0].attachments as string[]
    expect(attachments).toHaveLength(1)
    expect(attachments[0]).toMatch(/^https:\/\/storage\.example\.com\/connect\/tenant-a\/chan-a1-team\/.+\.jpg$/)
  })

  it('positive control: omitting channel_id resolves the own team channel by lookup', async () => {
    const token = createToken(MEMBER_A1, TENANT_A)
    const res = await POST(uploadReq(undefined, token) as never)
    expect(res.status).toBe(201)
    const inserted = fake._store.get('connect_messages') || []
    expect(inserted).toHaveLength(1)
    expect(inserted[0].channel_id).toBe('chan-a1-team')
  })
})
