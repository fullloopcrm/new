/**
 * Bank reconciliation clearing balances (O13 sweep, per LEADER order —
 * ledger-reports.ts / reconcile.ts / smart-schedule.ts, continuing the
 * post-labor.ts / notify.ts pass). clearingTargets() reports the live 1050
 * Undeposited Funds / 2450 Payouts in Transit balances so the bank-line
 * categorizer can suggest the clearing account instead of double-counting
 * income already recognized on payment. Zero direct tests before this file
 * despite backing /dashboard/finance/reconcile and the reconcile-candidates
 * API route.
 *
 * Run against the REAL reconcile.ts + ledger.ts (ensureChartAccounts /
 * getAccountIdByCode), with a minimal in-memory Supabase fake written for this
 * file specifically. Unlike the shared ledger-supabase-fake (whose .range() is
 * a no-op that always returns every matching row), this fake implements REAL
 * .range() slicing on journal_lines — accountNetCents pages in PAGE=1000-row
 * chunks and stops when `rows.length < PAGE`. A no-op-range fake would never
 * see a short final page and would spin forever the moment one tenant/account
 * crosses 1000 lines, so this suite deliberately seeds >PAGE rows to prove the
 * loop terminates and sums correctly across pages — the strongest find here.
 *
 * Pinned:
 *   - 1050 (asset, debit-normal): balance = Σdebit − Σcredit, no sign flip
 *   - 2450 (liability, credit-normal): balance sign-flipped so a healthy
 *     payouts-in-transit total reads positive
 *   - pagination past PAGE=1000 rows on one account sums correctly and
 *     terminates (regression: a no-op .range() fake would hang here)
 *   - an account never posted to (e.g. no journal_lines rows yet) reads 0,
 *     not a throw
 *   - tenant isolation: another tenant's lines never bleed into the balance,
 *     even when both tenants post to the same-coded account same day
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))

type Filters = { eqs: Record<string, unknown> }
type UpsertOpts = { onConflict?: string; ignoreDuplicates?: boolean }

function rowMatches(row: Record<string, unknown>, f: Filters): boolean {
  return Object.entries(f.eqs).every(([k, v]) => row[k] === v)
}

function makeReconcileFake(getStore: () => Record<string, Array<Record<string, unknown>>>) {
  return {
    from(table: string) {
      const f: Filters = { eqs: {} }
      let op: 'select' | 'upsert' = 'select'
      let payload: unknown = null
      let upsertOpts: UpsertOpts | null = null
      let range: [number, number] | null = null

      const resolve = () => {
        const store = getStore()
        if (op === 'upsert') {
          const rows = store[table] || (store[table] = [])
          const items = Array.isArray(payload) ? payload : [payload]
          const keys = (upsertOpts?.onConflict || '').split(',').map((s) => s.trim()).filter(Boolean)
          for (const p of items as Array<Record<string, unknown>>) {
            const dup = keys.length ? rows.find((r) => keys.every((k) => r[k] === p[k])) : undefined
            if (dup) {
              if (!upsertOpts?.ignoreDuplicates) Object.assign(dup, p)
              continue
            }
            h.seq += 1
            rows.push({ id: `${table}-${h.seq}`, ...p })
          }
          return { data: null, error: null }
        }
        let rows = (store[table] || []).filter((r) => rowMatches(r, f))
        if (range) rows = rows.slice(range[0], range[1] + 1)
        return { data: rows, error: null }
      }

      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: (col: string, val: unknown) => { f.eqs[col] = val; return chain },
        upsert: (p: unknown, opts?: UpsertOpts) => { op = 'upsert'; payload = p; upsertOpts = opts ?? null; return chain },
        range: (from: number, to: number) => { range = [from, to]; return chain },
        maybeSingle: () => {
          const rows = (getStore()[table] || []).filter((r) => rowMatches(r, f))
          return Promise.resolve({ data: rows[0] ?? null, error: null })
        },
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
          Promise.resolve(resolve()).then(res, rej),
      }
      return chain
    },
  }
}

vi.mock('../supabase', () => ({ supabaseAdmin: makeReconcileFake(() => h.store) }))

import { clearingTargets } from './reconcile'

const A = 'tenant-A'
const B = 'tenant-B'

function coaId(tenantId: string, code: string): string {
  const row = (h.store.chart_of_accounts || []).find((c) => c.tenant_id === tenantId && c.code === code)
  if (!row) throw new Error(`no seeded coa ${tenantId}/${code}`)
  return row.id as string
}

function seedLine(tenantId: string, coa: string, debit: number, credit: number) {
  ;(h.store.journal_lines ||= []).push({ tenant_id: tenantId, coa_id: coa, debit_cents: debit, credit_cents: credit })
}

beforeEach(() => {
  h.seq = 0
  h.store = { chart_of_accounts: [], journal_lines: [] }
})

describe('clearingTargets', () => {
  it('lazily seeds the chart and resolves 1050/2450 ids with zero balances when nothing posted', async () => {
    const r = await clearingTargets(A)
    expect(r.undepositedId).toBeTruthy()
    expect(r.payoutsInTransitId).toBeTruthy()
    expect(r.undepositedBalanceCents).toBe(0)
    // 2450 balance is sign-flipped (-(0)); assert numeric equality, not Object.is (avoids -0 !== 0)
    expect(r.payoutsInTransitBalanceCents === 0).toBe(true)
  })

  it('1050 balance is debit-positive with no sign flip', async () => {
    await clearingTargets(A)
    seedLine(A, coaId(A, '1050'), 10000, 0)
    seedLine(A, coaId(A, '1050'), 0, 4000)
    const r = await clearingTargets(A)
    expect(r.undepositedBalanceCents).toBe(6000)
  })

  it('2450 balance sign-flips so a healthy (credit-heavy) payouts-in-transit total reads positive', async () => {
    await clearingTargets(A)
    seedLine(A, coaId(A, '2450'), 0, 9000) // committed payout, not yet cleared from bank
    seedLine(A, coaId(A, '2450'), 1000, 0) // partial clear
    const r = await clearingTargets(A)
    expect(r.payoutsInTransitBalanceCents).toBe(8000)
  })

  it('paginates past PAGE=1000 rows on one account, summing correctly without hanging', async () => {
    await clearingTargets(A)
    const coa = coaId(A, '1050')
    for (let i = 0; i < 1500; i++) seedLine(A, coa, 100, 0)
    const r = await clearingTargets(A)
    expect(r.undepositedBalanceCents).toBe(150000)
  }, 10000)

  it('never mixes another tenant\'s lines into the balance, even on the same-coded account', async () => {
    await clearingTargets(A)
    await clearingTargets(B)
    seedLine(A, coaId(A, '1050'), 5000, 0)
    seedLine(B, coaId(B, '1050'), 99999, 0)
    const r = await clearingTargets(A)
    expect(r.undepositedBalanceCents).toBe(5000)
  })
})
