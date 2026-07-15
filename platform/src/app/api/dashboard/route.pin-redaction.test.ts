import { describe, it, expect, vi } from 'vitest'

/**
 * GET /api/dashboard previously leaked `team_members.pin` -- the sole
 * team-portal login credential -- via `team_members!bookings_team_member_id_fkey(*)`
 * wildcard joins on `todayJobs`/`allJobs`/`upcomingBookings`, and returned the
 * full `teamMembers` roster with zero permission check. Any authenticated
 * role, including the lowest-privilege `staff`, could harvest every
 * coworker's PIN from the dashboard homepage. Fix strips `pin` from every
 * joined team_members row unconditionally (no consumer reads it, mirrors the
 * GET /api/team list fix) and redacts the `teamMembers` roster for roles
 * without `team.view`, matching this route's existing finance.view
 * redaction pattern rather than gating the whole aggregator.
 */

let mockRole = 'staff'

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: vi.fn(async () => ({
    userId: 'user-1',
    tenantId: 'tenant-1',
    tenant: { id: 'tenant-1', selena_config: {} },
    role: mockRole,
  })),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

const bookingWithPin = {
  id: 'booking-1',
  price: 100,
  status: 'confirmed',
  clients: { id: 'client-1', name: 'Jane Client' },
  team_members: { id: 'tm-1', name: 'Cleaner One', pin: '1234' },
}

function chain(table: string): unknown {
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => void) => {
          if (table === 'bookings') {
            return resolve({ data: [bookingWithPin], count: 1, error: null })
          }
          if (table === 'team_members') {
            return resolve({ data: [{ id: 'tm-1', name: 'Cleaner One' }], count: 1, error: null })
          }
          return resolve({ data: [], count: 0, error: null })
        }
      }
      return () => new Proxy({}, handler)
    },
  }
  return new Proxy({}, handler)
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: vi.fn((table: string) => chain(table)) },
}))

describe('GET /api/dashboard — team_members.pin redaction', () => {
  it('strips pin from joined team_members and redacts teamMembers for a role without team.view', async () => {
    // 'staff' has team.view by default per rbac.ts, so simulate a role
    // that lacks it (e.g. via a per-tenant override revoking it).
    mockRole = 'nonexistent-role-with-no-perms'
    vi.resetModules()
    const { GET } = await import('./route')
    const res = await GET()
    const body = await res.json()

    expect(body.teamMembers).toBeNull()
    for (const job of [...body.todayJobs, ...body.allJobs, ...body.upcomingBookings]) {
      expect(job.team_members.pin).toBeUndefined()
      expect(job.team_members.name).toBe('Cleaner One')
    }
  })

  it('includes teamMembers for a role with team.view (admin), still without pin anywhere', async () => {
    mockRole = 'admin'
    vi.resetModules()
    const { GET } = await import('./route')
    const res = await GET()
    const body = await res.json()

    expect(body.teamMembers).not.toBeNull()
    expect(body.teamMembers[0].pin).toBeUndefined()
    for (const job of [...body.todayJobs, ...body.allJobs, ...body.upcomingBookings]) {
      expect(job.team_members.pin).toBeUndefined()
    }
  })
})
