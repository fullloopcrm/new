import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/routes/[id]/optimize previously called getTenantForRequest()
 * with no requirePermission check at all -- any authenticated tenant member
 * (incl. 'staff') could re-order and overwrite any route's stops. Gated on
 * schedules.edit, matching the sibling PATCH /api/routes/[id].
 */

const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))
const { fromSpy } = vi.hoisted(() => ({ fromSpy: vi.fn() }))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: fromSpy } }))
vi.mock('@/lib/require-permission', async () => {
  const { hasPermission } = await import('@/lib/rbac')
  return {
    requirePermission: async (permission: string) => {
      if (!hasPermission(currentRole.value, permission as never)) {
        return {
          tenant: null,
          error: new Response(JSON.stringify({ error: 'Forbidden: insufficient permissions' }), { status: 403 }),
        }
      }
      return { tenant: { tenantId: 'tenant-1', role: currentRole.value, tenant: {} }, error: null }
    },
  }
})

import { POST } from './route'

function req() {
  return new Request('http://t.test/api/routes/route-1/optimize', { method: 'POST' })
}
function params() {
  return { params: Promise.resolve({ id: 'route-1' }) }
}

describe('POST /api/routes/[id]/optimize — permission gate', () => {
  beforeEach(() => {
    fromSpy.mockClear()
    currentRole.value = 'staff'
  })

  it('403s a staff member (no schedules.edit) before touching the database', async () => {
    const res = await POST(req(), params())
    expect(res.status).toBe(403)
    expect(fromSpy).not.toHaveBeenCalled()
  })

  it('passes a manager (has schedules.edit) through the gate to the DB lookup', async () => {
    currentRole.value = 'manager'
    fromSpy.mockReturnValue({
      select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) }),
    })
    const res = await POST(req(), params())
    // Route not found (mocked as null) — 404, but the key assertion is the
    // gate let it reach the DB at all instead of short-circuiting at 403.
    expect(res.status).toBe(404)
    expect(fromSpy).toHaveBeenCalled()
  })
})
