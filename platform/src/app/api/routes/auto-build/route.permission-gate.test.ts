import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/routes/auto-build previously called getTenantForRequest() with
 * no requirePermission check at all -- any authenticated tenant member (incl.
 * 'staff') could bulk-generate (and idempotently replace) every route for a
 * given day. Gated on schedules.edit, matching the sibling POST /api/routes.
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

function req(body: Record<string, unknown>) {
  return new Request('http://t.test/api/routes/auto-build', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/routes/auto-build — permission gate', () => {
  beforeEach(() => {
    fromSpy.mockClear()
    currentRole.value = 'staff'
  })

  it('403s a staff member (no schedules.edit) before touching the database', async () => {
    const res = await POST(req({ date: '2026-08-01' }))
    expect(res.status).toBe(403)
    expect(fromSpy).not.toHaveBeenCalled()
  })

  it('passes a manager (has schedules.edit) through the gate to the DB lookup', async () => {
    currentRole.value = 'manager'
    fromSpy.mockReturnValue({
      select: () => ({
        eq: () => ({ gte: () => ({ lte: () => ({ not: () => ({ order: async () => ({ data: [], error: null }) }) }) }) }),
      }),
    })
    const res = await POST(req({ date: '2026-08-01' }))
    expect(res.status).toBe(200)
    expect(fromSpy).toHaveBeenCalled()
  })
})
