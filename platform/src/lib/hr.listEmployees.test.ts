/**
 * listEmployees fuses team_members + hr_employee_profiles in a single
 * PostgREST embedded select. That select named a column, `active`, that
 * doesn't exist on team_members (the table only has `status` -- see
 * schema.sql) -- a real PostgREST would error the whole query (including
 * the embed) over one bad column name, 500-ing the People hub roster. The
 * shared fake-supabase.ts harness doesn't validate column names or resolve
 * embeds, so it couldn't catch this; this test hand-rolls a chain mock that
 * returns the real embedded-row shape PostgREST actually sends.
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

describe('listEmployees — team_members has no `active` column, only `status`', () => {
  it('resolves without a PostgREST column error (regression: select() named a nonexistent column)', async () => {
    await expect(listEmployees(TENANT_A)).resolves.toBeDefined()
  })

  it('derives active from status=inactive rather than a nonexistent active column', async () => {
    const employees = await listEmployees(TENANT_A)
    const active = employees.find((e) => e.team_member_id === 'tm-active')
    const inactive = employees.find((e) => e.team_member_id === 'tm-inactive')
    expect(active?.active).toBe(true)
    expect(inactive?.active).toBe(false)
  })
})
