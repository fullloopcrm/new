import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Isolation proof for the bookings close-out conversion: TWO independent scoped reads on
 * the SAME table (bookings) flow through ONE reused tenantClient(tenantId). Both keep the
 * tenant scope + their divergent compound filters (.in()/.or() vs .eq()/.eq()/.gte()); the
 * clients/team_members embeds are preserved; and the graceful `|| []` per-bucket
 * degradation survives a null/errored read (a swallowed default-deny renders as an empty
 * bucket, surfaced via _errors). Tier hazard on the team_members embed is documented in the
 * proof module header (team_members absent from the tier list).
 */

const tenantClientMock = vi.fn()
vi.mock('../tenant-client', () => ({
  tenantClient: (...args: unknown[]) => tenantClientMock(...args),
}))

import { getCloseoutConverted } from './converted-bookings-closeout.example'

const TENANT = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'
const OTHER = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
// Fixed clock so the 7-day window is deterministic: 2026-07-12T00:00:00Z.
const NOW = Date.UTC(2026, 6, 12)

type QueryRecord = {
  table: string
  selects: string[]
  eqs: Array<[string, unknown]>
  ins: Array<[string, unknown]>
  ors: string[]
  gtes: Array<[string, unknown]>
  orders: Array<[string, unknown]>
  limits: number[]
}

/**
 * Recorder that returns a QUEUE of results per table (shifted per call) so the two reads
 * on `bookings` can be given different payloads. Missing/exhausted -> { data: [], error: null }.
 */
function makeRecordingDb(queueByTable: Record<string, unknown[]>) {
  const calls: QueryRecord[] = []
  const remaining: Record<string, unknown[]> = {}
  for (const k of Object.keys(queueByTable)) remaining[k] = [...queueByTable[k]]
  const db = {
    from(table: string) {
      const rec: QueryRecord = {
        table, selects: [], eqs: [], ins: [], ors: [], gtes: [], orders: [], limits: [],
      }
      calls.push(rec)
      const queue = remaining[table] ?? []
      const result = queue.length > 0 ? queue.shift()! : { data: [], error: null }
      const builder: Record<string, unknown> = {}
      builder.select = (cols: string) => { rec.selects.push(cols); return builder }
      builder.eq = (col: string, val: unknown) => { rec.eqs.push([col, val]); return builder }
      builder.in = (col: string, val: unknown) => { rec.ins.push([col, val]); return builder }
      builder.or = (expr: string) => { rec.ors.push(expr); return builder }
      builder.gte = (col: string, val: unknown) => { rec.gtes.push([col, val]); return builder }
      builder.order = (col: string, opts?: unknown) => { rec.orders.push([col, opts]); return builder }
      builder.limit = (n: number) => { rec.limits.push(n); return builder }
      builder.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) => {
        if (result instanceof Error) return reject(result)
        return resolve(result)
      }
      return builder
    },
  }
  return { db, calls }
}

beforeEach(() => {
  tenantClientMock.mockReset()
})

describe('getCloseoutConverted', () => {
  it('reuses ONE tenantClient across BOTH reads; both hit bookings; both tenant-scoped', async () => {
    const { db, calls } = makeRecordingDb({
      bookings: [
        { data: [{ id: 'b1', clients: { name: 'A' }, team_members: { name: 'W' } }], error: null },
        { data: [{ id: 'b2', clients: { name: 'B' } }], error: null },
      ],
    })
    tenantClientMock.mockReturnValue(db)

    const res = await getCloseoutConverted(TENANT, NOW)

    // One client minted, reused for both reads.
    expect(tenantClientMock).toHaveBeenCalledTimes(1)
    expect(tenantClientMock).toHaveBeenCalledWith(TENANT)
    const bookingReads = calls.filter((c) => c.table === 'bookings')
    expect(bookingReads).toHaveLength(2)
    for (const c of bookingReads) expect(c.eqs).toContainEqual(['tenant_id', TENANT])
    expect(res.needsCloseout).toHaveLength(1)
    expect(res.recentlyClosed).toHaveLength(1)
  })

  it('keeps the divergent compound filters verbatim (.in + .or on read 1; .eq/.eq/.gte on read 2)', async () => {
    const { db, calls } = makeRecordingDb({ bookings: [] })
    tenantClientMock.mockReturnValue(db)

    await getCloseoutConverted(TENANT, NOW)

    const [needs, recent] = calls.filter((c) => c.table === 'bookings')
    // Read 1: needsCloseout
    expect(needs.ins).toContainEqual(['status', ['completed', 'in_progress', 'paid']])
    expect(needs.ors).toContain('payment_status.neq.paid,team_paid.is.null,team_paid.eq.false')
    expect(needs.limits).toContain(50)
    expect(needs.selects[0]).toContain('team_members!bookings_team_member_id_fkey(name)')
    // Read 2: recentlyClosed — deterministic 7-day window off the injected clock.
    expect(recent.eqs).toContainEqual(['payment_status', 'paid'])
    expect(recent.eqs).toContainEqual(['team_paid', true])
    expect(recent.gtes).toContainEqual(['check_out_time', new Date(NOW - 7 * 24 * 60 * 60 * 1000).toISOString()])
    expect(recent.limits).toContain(20)
  })

  it('degrades gracefully: a default-denied read becomes an empty bucket, error surfaced (not crashed)', async () => {
    // Supabase RESOLVES with { data: null, error } on RLS denial — it does not reject. The
    // live route coalesces null -> [], so the misconfig is invisible at the UI. The proof
    // preserves that AND surfaces the error via _errors so a test can SEE the silent denial.
    const denial = { message: 'permission denied for table bookings' }
    const { db } = makeRecordingDb({
      bookings: [
        { data: null, error: denial }, // read 1 default-denies
        { data: [{ id: 'ok' }], error: null }, // read 2 succeeds
      ],
    })
    tenantClientMock.mockReturnValue(db)

    const res = await getCloseoutConverted(TENANT, NOW)

    // Bucket degraded to [], no crash, no null sub-object.
    expect(res.needsCloseout).toEqual([])
    expect(res.recentlyClosed).toEqual([{ id: 'ok' }])
    // The silent denial IS visible through _errors even though the UI bucket is empty.
    expect(res._errors.needsCloseout).toEqual(denial)
    expect(res._errors.recentlyClosed).toBeNull()
  })

  it('scopes to the caller tenant, never a second tenant', async () => {
    const { db, calls } = makeRecordingDb({ bookings: [] })
    tenantClientMock.mockReturnValue(db)

    await getCloseoutConverted(OTHER, NOW)

    expect(tenantClientMock).toHaveBeenCalledWith(OTHER)
    for (const c of calls.filter((x) => x.table === 'bookings')) {
      expect(c.eqs).toContainEqual(['tenant_id', OTHER])
      expect(c.eqs).not.toContainEqual(['tenant_id', TENANT])
    }
  })
})
