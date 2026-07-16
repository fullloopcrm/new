/**
 * PATCH /api/jobs/[id] — status transitions had neither a CAS re-check nor a
 * duplicate-completion guard, unlike the sibling session route
 * (sessions/[sessionId]/route.ts) that already gates its own `didComplete` on
 * `current.status !== 'completed'` and re-asserts `current.status` in the
 * UPDATE's own WHERE. This route blindly wrote `patch.status` unconditionally
 * and fired logJobEvent/releasePaymentsForEvent/ownerAlert on ANY PATCH that
 * merely included a `status` key — including a resend of the *same* status
 * (double-click, retry, two tabs). Each resend logged a duplicate job_events
 * row and, on 'completed', sent the owner a duplicate "job complete" alert.
 * It also had no protection against a concurrent status change landing
 * between the read and the write, silently clobbering it.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
}))

/** Set by a test to inject a concurrent write right after the route's own
 *  initial status SELECT resolves -- the exact TOCTOU gap this fix closes. */
const afterInitialRead = vi.hoisted(() => ({ fn: null as (() => void) | null }))

vi.mock('@/lib/supabase', () => {
  const raw = makeSupabaseFake(h, { detachReads: true })
  const fake = {
    from(table: string) {
      const chain = raw.from(table) as Record<string, unknown>
      if (table !== 'jobs') return chain
      const origSingle = chain.single as () => Promise<unknown>
      chain.single = () =>
        origSingle().then((res) => {
          afterInitialRead.fn?.()
          afterInitialRead.fn = null
          return res
        })
      return chain
    },
  }
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: 'tenant-A' }, error: null })),
}))
const logJobEventCalls: Record<string, unknown>[] = []
const releaseCalls: unknown[][] = []
const ownerAlertCalls: Record<string, unknown>[] = []
vi.mock('@/lib/jobs', () => ({
  logJobEvent: vi.fn(async (input: Record<string, unknown>) => { logJobEventCalls.push(input) }),
  releasePaymentsForEvent: vi.fn(async (...a: unknown[]) => { releaseCalls.push(a) }),
  shapeSession: (b: Record<string, unknown>) => ({ id: b.id, status: b.status }),
}))
vi.mock('@/lib/messaging/owner-alerts', () => ({
  ownerAlert: vi.fn(async (input: Record<string, unknown>) => { ownerAlertCalls.push(input) }),
}))

const patchReq = (body: unknown) => new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  h.seq = 0
  afterInitialRead.fn = null
  logJobEventCalls.length = 0
  releaseCalls.length = 0
  ownerAlertCalls.length = 0
  h.store = {
    jobs: [
      { id: 'job-A1', tenant_id: 'tenant-A', title: 'Deck build', status: 'scheduled', total_cents: 50000 },
    ],
    job_payments: [],
    job_events: [],
  }
})

describe('PATCH /api/jobs/[id] — status resend is idempotent, concurrent race is refused', () => {
  it('does not re-fire completion side effects when the same status is resent (double-click/retry)', async () => {
    const { PATCH } = await import('./route')

    const first = await PATCH(patchReq({ status: 'completed' }), params('job-A1'))
    expect(first.status).toBe(200)
    expect(ownerAlertCalls).toHaveLength(1)
    expect(logJobEventCalls).toHaveLength(1)

    const second = await PATCH(patchReq({ status: 'completed' }), params('job-A1'))
    expect(second.status).toBe(200)

    expect(ownerAlertCalls).toHaveLength(1)
    expect(logJobEventCalls).toHaveLength(1)
  })

  it('refuses to silently overwrite a job whose status changed concurrently', async () => {
    const { PATCH } = await import('./route')

    afterInitialRead.fn = () => {
      h.store.jobs[0] = { ...h.store.jobs[0], status: 'cancelled' }
    }

    const res = await PATCH(patchReq({ status: 'completed' }), params('job-A1'))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(h.store.jobs[0].status).toBe('cancelled')
    expect(json.error).toMatch(/concurrently/i)
    expect(ownerAlertCalls).toHaveLength(0)
    expect(logJobEventCalls).toHaveLength(0)
  })

  it('still edits a job whose status did not change concurrently (no regression)', async () => {
    const { PATCH } = await import('./route')

    const res = await PATCH(patchReq({ title: 'Deck build (edited)' }), params('job-A1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.job.title).toBe('Deck build (edited)')
  })
})
