/**
 * GET /api/cleaners selected '*' from team_members and is gated only by
 * team.view — held down to 'staff', the lowest role, which has no team.edit
 * and cannot even set a pin (only team.edit's PUT /api/cleaners/[id] can).
 * That leaked every coworker's live team-portal login PIN, payroll
 * (pay_rate), HR notes, and tax_ssn_last4/tax_address to any staff-tier
 * dashboard user. Fixed by narrowing the select to an explicit column
 * allowlist that excludes those fields. FakeSupabase (used by the sibling
 * isolation test) intentionally ignores its select column-list argument, so
 * this asserts directly on what was passed to select().
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const selectMock = vi.fn()
const fromMock = vi.fn((..._args: unknown[]) => ({ select: selectMock }))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => fromMock(...args) },
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: 'tenant-A' }, error: null }),
}))

function chain(): Record<string, unknown> {
  const c: Record<string, unknown> = {
    eq: () => c,
    order: () => c,
    then: (resolve: (v: { data: unknown[]; error: null }) => unknown) => resolve({ data: [], error: null }),
  }
  return c
}

const FORBIDDEN_FIELDS = [
  'pin', 'pay_rate', 'notes',
  'tax_classification', 'tax_address', 'tax_city', 'tax_state', 'tax_zip',
  'tax_ssn_last4', 'tax_ssn_encrypted', 'tax_ein', 'tax_business_name',
]

describe('GET /api/cleaners — field-exposure allowlist', () => {
  beforeEach(() => {
    vi.resetModules()
    fromMock.mockClear()
    selectMock.mockReset().mockReturnValue(chain())
  })

  it('does not select pin, pay_rate, notes, or tax_* columns', async () => {
    const { GET } = await import('./route')
    await GET()

    expect(selectMock).toHaveBeenCalledTimes(1)
    const cols = String(selectMock.mock.calls[0][0])
    expect(cols).not.toBe('*')
    const selected = cols.split(',').map((s) => s.trim())
    for (const forbidden of FORBIDDEN_FIELDS) {
      expect(selected).not.toContain(forbidden)
    }
    // Still selects the fields the list UI actually renders.
    expect(selected).toEqual(expect.arrayContaining(['id', 'name', 'hourly_rate', 'status']))
  })
})
