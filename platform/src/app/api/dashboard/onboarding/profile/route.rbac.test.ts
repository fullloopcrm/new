import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET/PUT/POST /api/dashboard/onboarding/profile — permission gate.
 *
 * BUG (fixed here): all three handlers only called getTenantForRequest()
 * (any authenticated tenant role), with no permission check. This wizard
 * writes legal identity (EIN, legal_name), licensing/insurance, and brand
 * data — the dashboard-shell.tsx nav gates this whole feature area behind
 * settings.edit (owner/admin only per rbac.ts). A manager or staff account
 * could read or overwrite this data via direct API call despite the page
 * being hidden from their nav.
 *
 * FIX: requirePermission('settings.edit') on GET, PUT, and POST.
 */

const A = 'tid-a'

const roleHolder = vi.hoisted(() => ({ role: 'owner' as string }))
vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: A,
      tenant: { id: A },
      role: roleHolder.role,
    })),
  }
})

vi.mock('@/lib/supabase', () => {
  const chain = () => {
    const q: Record<string, unknown> = {}
    const self = () => q
    q.select = vi.fn(self)
    q.eq = vi.fn(self)
    q.update = vi.fn(self)
    q.insert = vi.fn(self)
    q.single = vi.fn(async () => ({ data: { selena_config: {}, compliance: {} }, error: null }))
    q.maybeSingle = vi.fn(async () => ({ data: null, error: null }))
    q.then = (resolve: (v: { data: unknown; error: null }) => void) => resolve({ data: {}, error: null })
    return q
  }
  return { supabaseAdmin: { from: vi.fn(() => chain()) } }
})

import { GET, PUT, POST } from './route'

beforeEach(() => {
  roleHolder.role = 'owner'
})

function put(body: Record<string, unknown>) {
  return PUT(new Request('http://t/api/dashboard/onboarding/profile', { method: 'PUT', body: JSON.stringify(body) }))
}
function post(body: Record<string, unknown>) {
  return POST(new Request('http://t/api/dashboard/onboarding/profile', { method: 'POST', body: JSON.stringify(body) }))
}

describe('GET /api/dashboard/onboarding/profile — permission probe', () => {
  it('owner (has settings.edit) can load the prefill', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'manager' (no settings.edit) is forbidden, no EIN/legal data returned", async () => {
    roleHolder.role = 'manager'
    const res = await GET()
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.prefill).toBeUndefined()
  })

  it("PERMISSION PROBE: 'staff' (no settings.edit) is forbidden", async () => {
    roleHolder.role = 'staff'
    const res = await GET()
    expect(res.status).toBe(403)
  })
})

describe('PUT /api/dashboard/onboarding/profile — permission probe', () => {
  it('admin can save a draft', async () => {
    roleHolder.role = 'admin'
    const res = await put({ draft: { businessName: 'Acme' } })
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'staff' is forbidden, draft not saved", async () => {
    roleHolder.role = 'staff'
    const res = await put({ draft: { businessName: 'Hijacked' } })
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.saved).toBeUndefined()
  })
})

describe('POST /api/dashboard/onboarding/profile — permission probe', () => {
  it('owner can submit the profile', async () => {
    const res = await post({ data: { businessName: 'Acme', ein: '12-3456789' } })
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'staff' is forbidden, EIN/legal identity not written", async () => {
    roleHolder.role = 'staff'
    const res = await post({ data: { businessName: 'Hijacked', ein: '00-0000000' } })
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.submitted).toBeUndefined()
  })

  it("PERMISSION PROBE: 'manager' is forbidden", async () => {
    roleHolder.role = 'manager'
    const res = await post({ data: { businessName: 'Hijacked' } })
    expect(res.status).toBe(403)
  })
})
