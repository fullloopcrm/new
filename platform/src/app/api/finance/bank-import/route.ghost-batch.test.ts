// @vitest-environment node
//
// multipart/form-data parsing requires Node's native undici File/FormData;
// jsdom's own File/FormData implementations aren't interoperable with it.
import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * WITNESS — ghost bank_import_batches row on a partial bulk-insert failure.
 *
 * POST /api/finance/bank-import inserts the bank_import_batches row (keyed
 * unique on (bank_account_id, sha256)) BEFORE inserting the parsed
 * bank_transactions rows. A bulk insert is all-or-nothing: if ANY accepted
 * row collides with idx_bank_txns_account_fp (bank_account_id, fingerprint)
 * -- a real concurrent-upload race, or any other transient failure on that
 * insert -- the whole insert throws, but the batch row above it already
 * committed. The route had no compensating rollback, so re-uploading the
 * exact same file afterward hits the existingBatch check's "already
 * imported" 409 forever, even though ZERO transactions were ever recorded
 * for it -- a permanently unrecoverable import.
 *
 * FIX: on a failed transactions insert, delete the just-created batch row
 * before rethrowing, freeing the sha256 slot for a real retry. Also surface
 * the batch insert's own 23505 (the existingBatch check's TOCTOU race) as
 * the same friendly 409 instead of a generic 500.
 */

type Row = Record<string, unknown>
const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Row[]>,
  // Rows that a concurrent transaction has already committed at the real DB
  // level but that this request's own (earlier) SELECT never saw -- models
  // the TOCTOU gap between the existingFps read and the bulk insert, since
  // this fake has no real concurrency to reproduce that gap directly.
  raceRows: {} as Record<string, Row[]>,
}))

function makeFake() {
  return {
    from(table: string) {
      const state: {
        op: 'select' | 'insert' | 'update' | 'delete'
        eqs: Record<string, unknown>
        ins: Array<{ col: string; vals: unknown[] }>
        payload: unknown
      } = { op: 'select', eqs: {}, ins: [], payload: null }
      const rows = () => h.store[table] || (h.store[table] = [])
      const matches = (r: Row) =>
        Object.entries(state.eqs).every(([k, v]) => r[k] === v) &&
        state.ins.every((i) => i.vals.includes(r[i.col]))

      const run = (terminal: 'single' | 'maybeSingle' | 'many') => {
        if (state.op === 'insert') {
          const payload = (Array.isArray(state.payload) ? state.payload : [state.payload]) as Row[]
          if (table === 'bank_import_batches') {
            const existing = [...rows(), ...(h.raceRows[table] || [])]
            for (const p of payload) {
              const dup = existing.find((r) => r.bank_account_id === p.bank_account_id && r.sha256 === p.sha256)
              if (dup) {
                return {
                  data: null,
                  error: { message: 'duplicate key value violates unique constraint "idx_bank_import_batches_sha"', code: '23505' },
                }
              }
            }
          }
          if (table === 'bank_transactions') {
            const existing = [...rows(), ...(h.raceRows[table] || [])]
            for (const p of payload) {
              const dup = existing.find((r) => r.bank_account_id === p.bank_account_id && r.fingerprint === p.fingerprint)
              if (dup) {
                return {
                  data: null,
                  error: { message: 'duplicate key value violates unique constraint "idx_bank_txns_account_fp"', code: '23505' },
                }
              }
            }
          }
          const inserted = payload.map((p) => {
            h.seq += 1
            const row: Row = { id: `${table}-${h.seq}`, ...p }
            rows().push(row)
            return row
          })
          if (terminal === 'many') return { data: inserted, error: null }
          return { data: inserted[0] ?? null, error: null }
        }
        if (state.op === 'delete') {
          h.store[table] = rows().filter((r) => !matches(r))
          return { data: null, error: null }
        }
        if (state.op === 'update') {
          for (const r of rows()) if (matches(r)) Object.assign(r, state.payload as object)
          return { data: null, error: null }
        }
        const found = rows().filter(matches)
        if (terminal === 'single') return { data: found[0] ?? null, error: found[0] ? null : { message: 'no rows' } }
        if (terminal === 'maybeSingle') return { data: found[0] ?? null, error: null }
        return { data: found, error: null }
      }

      const chain: Record<string, unknown> = {
        select: () => chain,
        insert: (p: unknown) => { state.op = 'insert'; state.payload = p; return chain },
        update: (p: unknown) => { state.op = 'update'; state.payload = p; return chain },
        delete: () => { state.op = 'delete'; return chain },
        eq: (c: string, v: unknown) => { state.eqs[c] = v; return chain },
        in: (c: string, v: unknown[]) => { state.ins.push({ col: c, vals: v }); return chain },
        single: () => Promise.resolve(run('single')),
        maybeSingle: () => Promise.resolve(run('maybeSingle')),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
          Promise.resolve(run('many')).then(res, rej),
      }
      return chain
    },
  }
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeFake() }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: 'tenant-1' }, error: null }),
}))

import { POST } from './route'
import { transactionFingerprint } from '@/lib/ledger'

const CSV = 'Date,Description,Amount\n2026-07-01,Coffee Shop,-5.00\n'

function uploadReq(filename = 'stmt.csv', content = CSV) {
  const form = new FormData()
  form.set('file', new File([content], filename, { type: 'text/csv' }))
  form.set('bank_account_id', 'acct-1')
  return POST(new Request('http://t/api/finance/bank-import', { method: 'POST', body: form }))
}

beforeEach(() => {
  h.seq = 0
  h.store = {
    bank_accounts: [{ id: 'acct-1', tenant_id: 'tenant-1' }],
    bank_import_batches: [],
    bank_transactions: [],
  }
  h.raceRows = {}
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('POST /api/finance/bank-import — ghost batch on partial failure', () => {
  it('does not permanently block re-importing a file whose transaction insert failed', async () => {
    // A concurrent upload has already committed a bank_transactions row with
    // the fingerprint this CSV's one txn will produce, on the SAME account --
    // but this request's own existingFps SELECT (which only reads h.store)
    // ran before that commit and never saw it, so its app-level dedupe
    // treats the txn as new and includes it in `accepted`. The real
    // idx_bank_txns_account_fp collision only surfaces at INSERT time.
    const fp = transactionFingerprint('2026-07-01', -500, 'Coffee Shop')
    h.raceRows.bank_transactions = [
      { id: 'preexisting', tenant_id: 'tenant-1', bank_account_id: 'acct-1', fingerprint: fp },
    ]

    const first = await uploadReq()
    expect(first.status).toBe(500)

    // The batch row must NOT survive the failed insert -- otherwise this
    // exact file can never be imported again.
    expect(h.store.bank_import_batches).toHaveLength(0)

    // The race resolves (the other transaction's row is now visible for
    // real) and the caller retries: must succeed, not 409 "already imported".
    h.raceRows.bank_transactions = []
    h.store.bank_transactions = [
      { id: 'preexisting', tenant_id: 'tenant-1', bank_account_id: 'acct-1', fingerprint: fp },
    ]
    const second = await uploadReq()
    expect(second.status).toBe(200)
    const body = await second.json()
    // The row is now genuinely present, so the app-level dedupe correctly
    // marks it a duplicate this time -- the point here is that the retry is
    // even possible at all (200, a fresh batch row), not the accepted count.
    expect(body.duplicates).toBe(1)
    expect(h.store.bank_import_batches).toHaveLength(1)
  })

  it('a normal single upload still records the batch + transaction (no regression)', async () => {
    const res = await uploadReq()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.accepted).toBe(1)
    expect(h.store.bank_transactions).toHaveLength(1)
    expect(h.store.bank_import_batches).toHaveLength(1)
  })

  it('a true concurrent re-upload of the identical file returns a friendly 409, not a 500', async () => {
    const [first, second] = await Promise.all([uploadReq(), uploadReq()])
    const statuses = [first.status, second.status].sort()
    expect(statuses).toEqual([200, 409])
    const loser = first.status === 409 ? first : second
    const loserBody = await loser.json()
    expect(loserBody.error).toBe('This exact file was already imported')
  })
})
