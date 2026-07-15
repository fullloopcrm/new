// @vitest-environment node
//
// multipart/form-data parsing requires Node's native undici File/FormData;
// jsdom's own File/FormData implementations aren't interoperable with it.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'
import { NextResponse } from 'next/server'

/**
 * POST /api/cleaners/upload — public (unauthenticated, IP-rate-limited)
 * self-upload path for a cleaner's own photo, or an admin-authenticated path.
 *
 * The public branch used to allow an anonymous caller to omit team_member_id
 * entirely and still get a file accepted into the tenant's storage bucket —
 * an open, unauthenticated write with no attached entity and no legitimate
 * product purpose. Fixed to require an owned, active team_member_id on the
 * public path before any upload proceeds.
 */

const TENANT_A = 'tid-a'
const TENANT_B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
const requirePermissionMock = vi.hoisted(() => vi.fn())
const uploadMock = vi.hoisted(() => vi.fn(async () => ({ error: null })))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (t: string) => holder.from!(t),
    storage: {
      from: () => ({
        upload: uploadMock,
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.example.com/${path}` } }),
      }),
    },
  },
}))
vi.mock('@/lib/require-permission', () => ({ requirePermission: requirePermissionMock }))
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: TENANT_A }),
}))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true, remaining: 5 })) }))

import { POST } from './route'

function seed() {
  return {
    team_members: [
      { id: 'tm-a', tenant_id: TENANT_A, status: 'active' },
      { id: 'tm-b', tenant_id: TENANT_B, status: 'active' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  vi.clearAllMocks()
  h = createTenantDbHarness(seed())
  holder.from = h.from
  // Default: not an admin caller (public path).
  requirePermissionMock.mockResolvedValue({
    tenant: null,
    error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
  })
})

function postUpload(fields: Record<string, string>) {
  const form = new FormData()
  form.set('file', new File([new Uint8Array([1, 2, 3])], 'photo.jpg', { type: 'image/jpeg' }))
  for (const [k, v] of Object.entries(fields)) form.set(k, v)

  return POST(
    new Request('http://acme-a.example.com/api/cleaners/upload', {
      method: 'POST',
      body: form,
    }) as unknown as import('next/server').NextRequest,
  )
}

describe('POST /api/cleaners/upload — public path requires an owned team_member_id', () => {
  it('rejects an anonymous upload with no team_member_id/cleaner_id at all', async () => {
    const res = await postUpload({})
    expect(res.status).toBe(401)
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it("wrong-tenant probe: rejects a team_member_id belonging to a different tenant", async () => {
    const res = await postUpload({ team_member_id: 'tm-b' })
    expect(res.status).toBe(401)
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it('positive control: accepts an active team_member_id owned by the resolved tenant', async () => {
    const res = await postUpload({ team_member_id: 'tm-a' })
    expect(res.status).toBe(200)
    expect(uploadMock).toHaveBeenCalledTimes(1)
  })
})
