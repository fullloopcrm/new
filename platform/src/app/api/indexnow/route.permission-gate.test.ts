import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * POST /api/indexnow — settings.integrations gate on the admin-session branch.
 *
 * Previously called getTenantForRequest() directly with zero permission
 * check. Per rbac.ts, only 'owner' has settings.integrations by default --
 * any authenticated tenant member, including staff, could spend the
 * tenant's IndexNow key submitting up to 10,000 arbitrary URLs to a
 * third-party indexing API.
 */

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

const roleHolder = vi.hoisted(() => ({ role: 'owner' as string, tenantId: 'tenant-A' as string }))

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: roleHolder.tenantId,
      tenant: { id: roleHolder.tenantId },
      role: roleHolder.role,
    })),
  }
})
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => null),
}))

import { POST } from './route'

const fetchMock = vi.fn(async () => new Response(JSON.stringify({}), { status: 200 }))

beforeEach(() => {
  h.seq = 0
  roleHolder.role = 'owner'
  roleHolder.tenantId = 'tenant-A'
  h.store = {
    tenants: [
      { id: 'tenant-A', domain: 'https://example-a.com', selena_config: { indexnow_key: 'key-a' } },
    ],
  }
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockClear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.CRON_SECRET
})

function postReq(body: Record<string, unknown>, headers?: Record<string, string>): Request {
  return new Request('http://x/api/indexnow', {
    method: 'POST',
    body: JSON.stringify(body),
    headers,
  })
}

describe('POST /api/indexnow — settings.integrations permission gate', () => {
  it('owner (has settings.integrations) can submit URLs', async () => {
    const res = await POST(postReq({ urls: ['https://example-a.com/page'] }) as never)
    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("PERMISSION PROBE: 'staff' role (no settings.integrations by default) is forbidden", async () => {
    roleHolder.role = 'staff'
    const res = await POST(postReq({ urls: ['https://example-a.com/page'] }) as never)
    expect(res.status).toBe(403)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("PERMISSION PROBE: 'admin' role (no settings.integrations by default) is forbidden", async () => {
    roleHolder.role = 'admin'
    const res = await POST(postReq({ urls: ['https://example-a.com/page'] }) as never)
    expect(res.status).toBe(403)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('valid CRON_SECRET bearer bypasses the permission check entirely', async () => {
    process.env.CRON_SECRET = 'test-cron-secret'
    const res = await POST(
      postReq(
        { tenantId: 'tenant-A', urls: ['https://example-a.com/page'] },
        { authorization: 'Bearer test-cron-secret' }
      ) as never
    )
    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
