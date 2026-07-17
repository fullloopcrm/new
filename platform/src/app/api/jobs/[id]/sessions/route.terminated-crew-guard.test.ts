import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/jobs/[id]/sessions — same terminated-crew guard as the sibling
 * PATCH /[sessionId] route (P12 project-archetype depth). Scheduling a NEW
 * session for a crew member the business already let go is the same bug as
 * reassigning an existing one -- both paths build the assignee set the same
 * way, so both needed the same fix.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

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
    getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: A, tenant: { id: A }, role: 'owner' })),
  }
})

vi.mock('@/lib/jobs', () => ({
  logJobEvent: vi.fn(async () => {}),
}))

import { POST } from './route'

function seed() {
  return {
    jobs: [{ id: 'job-a1', tenant_id: A, client_id: 'cli-a', title: 'A Job' }],
    team_members: [
      { id: 'tm-terminated', tenant_id: A, name: 'Let Go Larry' },
      { id: 'tm-active', tenant_id: A, name: 'Active Amy' },
    ],
    hr_employee_profiles: [
      { id: 'p1', tenant_id: A, team_member_id: 'tm-terminated', hr_status: 'terminated' },
      { id: 'p2', tenant_id: A, team_member_id: 'tm-active', hr_status: 'active' },
    ],
    bookings: [] as Record<string, unknown>[],
    booking_assignees: [] as Record<string, unknown>[],
    job_events: [] as Record<string, unknown>[],
  }
}

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}
function req(body: Record<string, unknown>) {
  return new Request('http://t', { method: 'POST', body: JSON.stringify(body) })
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('jobs/[id]/sessions POST — terminated-crew scheduling guard', () => {
  it('BLOCKED: scheduling a new session for a terminated crew member 400s, no booking created', async () => {
    const res = await POST(
      req({ start_time: '2026-08-01T09:00:00Z', team_member_id: 'tm-terminated' }),
      params('job-a1'),
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('tm-terminated')

    expect(h.capture.inserts.some((i) => i.table === 'bookings')).toBe(false)
  })

  it('CONTROL: scheduling an active crew member still works', async () => {
    const res = await POST(
      req({ start_time: '2026-08-01T09:00:00Z', team_member_id: 'tm-active' }),
      params('job-a1'),
    )
    expect(res.status).toBe(200)
    const inserted = h.capture.inserts.find((i) => i.table === 'bookings')
    expect(inserted!.rows[0].team_member_id).toBe('tm-active')
  })
})
