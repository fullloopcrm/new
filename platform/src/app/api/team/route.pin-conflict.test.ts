/**
 * POST /api/team — retry-on-conflict for team_members.pin.
 *
 * idx_team_members_tenant_pin_unique (014_security_hardening.sql) uniquely
 * constrains (tenant_id, pin) among active members. The 4-digit PIN here
 * (1000-9999, only 9000 possible values -- a much smaller space than
 * clients.pin's 900000) had no retry on collision: a stale comment claimed
 * "a collision returns a 500 and the caller retries", but no caller ever
 * implemented that, so a real add-team-member request just failed outright.
 * provisionApprovedApplicant() (src/lib/team-provisioning.ts) — the OTHER
 * team_members-creating write path, same table, same PIN scheme — already
 * regenerates and retries; this verifies POST /api/team now does too, and
 * gives up cleanly (no infinite retry) after 4 attempts.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => ({
  insertAttempts: 0,
  collisionsRemaining: 0,
}))

function conflictError() {
  return { message: 'duplicate key value violates unique constraint "idx_team_members_tenant_pin_unique"' }
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table !== 'team_members') throw new Error(`unexpected table ${table}`)
      return {
        insert: (row: Record<string, unknown>) => ({
          select: () => ({
            single: async () => {
              h.insertAttempts++
              if (h.collisionsRemaining > 0) {
                h.collisionsRemaining--
                return { data: null, error: conflictError() }
              }
              return { data: { id: 'new-tm-1', ...row }, error: null }
            },
          }),
        }),
      }
    },
  },
}))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: 'tenant-A', role: 'admin' }, error: null })),
}))
vi.mock('@/lib/settings', () => ({
  getSettings: vi.fn(async () => ({ default_pay_rate: 0, default_working_days: [] })),
}))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => undefined) }))

import { POST } from './route'

function req(body: unknown) {
  return new Request('http://x/api/team', { method: 'POST', body: JSON.stringify(body) })
}

beforeEach(() => {
  vi.clearAllMocks()
  h.insertAttempts = 0
  h.collisionsRemaining = 0
})

describe('POST /api/team — team_members.pin conflict handling', () => {
  it('regenerates and retries when a fresh PIN collides, and still succeeds', async () => {
    h.collisionsRemaining = 2 // first 2 attempts collide, 3rd succeeds

    const res = await POST(req({ name: 'New Hire', role: 'staff' }))
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.member.id).toBe('new-tm-1')
    expect(h.insertAttempts).toBe(3)
  })

  it('gives up after 4 attempts instead of retrying forever, and surfaces an error', async () => {
    h.collisionsRemaining = 999 // every attempt collides

    const res = await POST(req({ name: 'Unlucky Hire', role: 'staff' }))

    expect(res.status).toBe(500)
    expect(h.insertAttempts).toBe(4)
  })
})
