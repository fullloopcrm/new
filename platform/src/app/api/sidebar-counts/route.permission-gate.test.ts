import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/sidebar-counts returned the raw pending-leads count to any
 * authenticated tenant member, including 'staff' (which lacks leads.view by
 * default). The dashboard sidebar already nav-hides the Sales/leads item for
 * that role (see dashboard-shell.tsx's `perm: 'leads.view'` on the Sales
 * fold), but the API itself did not check the permission, so staff could read
 * the lead count by calling the endpoint directly. Now redacted to 0 for
 * roles without leads.view — matching the canViewFinance/canViewTeam
 * redaction pattern already used in GET /api/dashboard.
 */

const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenantId: 't-1',
    userId: 'u-1',
    role: currentRole.value,
    tenant: { id: 't-1', selena_config: null },
  }),
  AuthError: class AuthError extends Error { status = 401 },
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: () => {
        const chain = {
          eq: () => chain,
          in: () => chain,
          then: (resolve: (v: unknown) => unknown) =>
            resolve(table === 'website_visits' ? { count: 42 } : { count: 0, data: [] }),
        }
        return chain
      },
    }),
  },
}))

import { GET } from './route'

beforeEach(() => { currentRole.value = 'staff' })

describe('GET /api/sidebar-counts — permission gate', () => {
  it('redacts leads count for staff (lacks leads.view)', async () => {
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.leads).toBe(0)
  })

  it('returns the real leads count for manager (has leads.view)', async () => {
    currentRole.value = 'manager'
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.leads).toBe(42)
  })
})
