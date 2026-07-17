/**
 * listEmployees fuses team_members + hr_employee_profiles in a single
 * PostgREST embedded select. team_members.active is a real column (added by a
 * one-time NYC Maid legacy-data import migration, verified live against
 * production) but nothing in the app writes it, so it silently drifts from
 * reality -- confirmed live, ~12% of rows disagree with `status`, including
 * terminated members still showing active=true. `status` is the field the
 * termination flow actually keeps current, so listEmployees derives its
 * `active` flag from `status` instead of trusting the stale column. The
 * shared fake-supabase.ts harness doesn't resolve embeds, so this test
 * hand-rolls a chain mock that returns the real embedded-row shape PostgREST
 * actually sends.
 */
import { describe, it, expect, vi } from 'vitest'

type Row = Record<string, unknown>

const TENANT_A = 'tenant-a'

const teamMembers: Row[] = [
  { id: 'tm-active', tenant_id: TENANT_A, name: 'Ann Active', email: null, phone: null, role: 'worker', status: 'active', stripe_account_id: null, stripe_ready_at: null, hr_employee_profiles: [] },
  { id: 'tm-inactive', tenant_id: TENANT_A, name: 'Ivan Inactive', email: null, phone: null, role: 'worker', status: 'inactive', stripe_account_id: null, stripe_ready_at: null, hr_employee_profiles: [] },
]

vi.mock('./supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table !== 'team_members') throw new Error(`unexpected table ${table}`)
      const filters: Array<(r: Row) => boolean> = []
      const chain = {
        select: () => chain,
        eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return chain },
        order: () => chain,
        then: (resolve: (v: { data: Row[]; error: null }) => unknown) =>
          resolve({ data: teamMembers.filter((r) => filters.every((f) => f(r))), error: null }),
      }
      return chain
    },
  },
}))

import { listEmployees } from './hr'

describe('listEmployees — derives active from status, not the stale team_members.active column', () => {
  it('resolves successfully', async () => {
    await expect(listEmployees(TENANT_A)).resolves.toBeDefined()
  })

  it('derives active from status=inactive rather than the stale/unmaintained active column', async () => {
    const employees = await listEmployees(TENANT_A)
    const active = employees.find((e) => e.team_member_id === 'tm-active')
    const inactive = employees.find((e) => e.team_member_id === 'tm-inactive')
    expect(active?.active).toBe(true)
    expect(inactive?.active).toBe(false)
  })
})
