import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * release-due-payments cron — tenantServesSite() status gate.
 *
 * Same financial-write gap class fixed across finance-post/lifecycle/
 * recurring-expenses this session: this cron's bulk UPDATE (`job_payments`
 * pending -> invoiced for any on_date payment past due) carried no tenant
 * status check at all — a suspended/cancelled/deleted tenant's job payments
 * kept auto-flipping to 'invoiced' (due to collect) indefinitely, a real
 * financial state change with no human review, not just a skipped message.
 */

const logJobEvent = vi.fn(async (_arg: unknown) => {})
vi.mock('@/lib/jobs', () => ({
  logJobEvent: (arg: unknown) => logJobEvent(arg),
}))

const SUSPENDED_TENANT_ID = 't-suspended'
const ACTIVE_TENANT_ID = 't-active'

let dueRows: Array<{ id: string; tenant_id: string; job_id: string; label: string; amount_cents: number }>
let tenantStatusMap: Record<string, string | null>
const updateCalls: Array<{ patch: Record<string, unknown>; ids: string[] }> = []

function jobPaymentsBuilder() {
  const obj: Record<string, unknown> = {
    select: () => obj,
    eq: () => obj,
    lte: () => obj,
    update: (patch: Record<string, unknown>) => ({
      in: (_col: string, ids: string[]) => {
        updateCalls.push({ patch, ids })
        return Promise.resolve({ data: null, error: null })
      },
    }),
    then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: dueRows, error: null }).then(resolve),
  }
  return obj
}

function tenantsBuilder() {
  const state: { ids: string[] } = { ids: [] }
  const obj: Record<string, unknown> = {
    select: () => obj,
    in: (_col: string, vals: string[]) => {
      state.ids = vals
      return obj
    },
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve({
        data: state.ids.map((id) => ({ id, status: tenantStatusMap[id] ?? null })),
        error: null,
      }).then(resolve),
  }
  return obj
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'job_payments') return jobPaymentsBuilder()
      if (table === 'tenants') return tenantsBuilder()
      throw new Error(`unexpected table ${table}`)
    },
  },
}))

process.env.CRON_SECRET = 'test-cron-secret'
const { GET } = await import('./route')

function req() {
  return new Request('http://t/api/cron/release-due-payments', {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  })
}

beforeEach(() => {
  logJobEvent.mockClear()
  updateCalls.length = 0
})

describe('release-due-payments cron — tenantServesSite() status gate', () => {
  it.each(['suspended', 'cancelled', 'deleted'])(
    'does not invoice a %s tenant\'s due payment, but still invoices an active tenant\'s',
    async (status) => {
      tenantStatusMap = { [SUSPENDED_TENANT_ID]: status, [ACTIVE_TENANT_ID]: 'active' }
      dueRows = [
        { id: 'p1', tenant_id: SUSPENDED_TENANT_ID, job_id: 'j1', label: 'Deposit', amount_cents: 10000 },
        { id: 'p2', tenant_id: ACTIVE_TENANT_ID, job_id: 'j2', label: 'Deposit', amount_cents: 20000 },
      ]

      const res = await GET(req())
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.released).toBe(1)
      expect(logJobEvent).toHaveBeenCalledTimes(1)
      expect(logJobEvent).toHaveBeenCalledWith(expect.objectContaining({ tenant_id: ACTIVE_TENANT_ID, job_id: 'j2' }))
      expect(updateCalls).toHaveLength(1)
      expect(updateCalls[0].ids).toEqual(['p2'])
      expect(updateCalls[0].patch).toEqual({ status: 'invoiced' })
    },
  )

  it.each(['active', 'setup', 'pending'])('still invoices a %s tenant\'s due payment', async (status) => {
    tenantStatusMap = { [ACTIVE_TENANT_ID]: status }
    dueRows = [{ id: 'p1', tenant_id: ACTIVE_TENANT_ID, job_id: 'j1', label: 'Deposit', amount_cents: 10000 }]

    const res = await GET(req())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.released).toBe(1)
    expect(logJobEvent).toHaveBeenCalledTimes(1)
    expect(updateCalls[0].ids).toEqual(['p1'])
  })

  it('skips the UPDATE call entirely when no candidate is a serving tenant', async () => {
    tenantStatusMap = { [SUSPENDED_TENANT_ID]: 'cancelled' }
    dueRows = [{ id: 'p1', tenant_id: SUSPENDED_TENANT_ID, job_id: 'j1', label: 'Deposit', amount_cents: 10000 }]

    const res = await GET(req())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.released).toBe(0)
    expect(logJobEvent).not.toHaveBeenCalled()
    expect(updateCalls).toHaveLength(0)
  })

  it('returns 0 released with no candidates and does not query tenants', async () => {
    dueRows = []
    tenantStatusMap = {}

    const res = await GET(req())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.released).toBe(0)
    expect(updateCalls).toHaveLength(0)
  })
})
