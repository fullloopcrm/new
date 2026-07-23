import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DEFAULT_CHART } from '@/lib/ledger'

/**
 * W4 (a) — cross-tenant refund/credit MONEY-LEAK lock at the PERSISTENCE boundary.
 *
 * Leader order (a): "refund on tenant A never writes to tenant B ledger;
 * tenant-scoped reversal amounts correct." This is a THIRD, deliberately
 * different angle from the two refund tests already in the tree:
 *
 *   • route.cross-tenant-refund.isolation.test.ts  — mocks postRefundToLedger,
 *       proves the webhook ROUTES to the DB-resolved owner. (tenant routing)
 *   • post-adjustments.refund.happy-path.test.ts    — mocks the @/lib/ledger
 *       primitives, proves the double-entry MATH. (reversal shape)
 *
 * Neither exercises the REAL ledger primitives against a shared store. This test
 * mocks ONLY `supabaseAdmin` and runs the genuine
 * ensureChartAccounts / getAccountIdByCode / journalEntryExists / postJournalEntry
 * code paths, so it can prove the property the order names literally:
 *
 *   1. Every DB read AND the write RPC that a tenant-A refund performs carries
 *      tenant_id = 'tenant-A'. NOTHING is ever filtered by, or written under,
 *      'tenant-B' — a refund physically cannot touch another tenant's rows.
 *   2. The account ids the reversal debits/credits belong to tenant-A's chart
 *      (never tenant-B's), and the reversal amount equals the refund amount
 *      exactly (full AND partial), balanced DR 4000 / CR 1050.
 *   3. A pre-existing tenant-B ledger row is byte-for-byte unchanged after a
 *      tenant-A refund posts.
 *   4. Idempotency is tenant-SCOPED: a tenant-B entry sharing the same Stripe
 *      refund id does NOT suppress tenant-A's legitimate refund (that would be a
 *      cross-tenant leak in the other direction — tenant A's books left short) —
 *      yet a genuine re-delivery to tenant-A IS suppressed.
 *
 * REAL: post-adjustments + the whole @/lib/ledger primitive stack.
 * MOCKED: only supabaseAdmin (a recording, tenant-filtering fake store).
 */

const TENANT_A = 'tenant-A'
const TENANT_B = 'tenant-B'

type Row = Record<string, unknown>
interface Touch { op: string; table: string; tenant: unknown; name?: string }

// Shared, mutable store + a running log of every tenant-scoped DB touch.
const store: { chart_of_accounts: Row[]; journal_entries: Row[] } = {
  chart_of_accounts: [],
  journal_entries: [],
}
const touches: Touch[] = []

function matches(row: Row, eqs: Row): boolean {
  return Object.entries(eqs).every(([k, v]) => row[k] === v)
}

vi.mock('@/lib/supabase', () => {
  function from(table: string) {
    const eqs: Row = {}
    let mode: 'read' | 'insert' | 'upsert' = 'read'
    let payload: { rows?: Row[] } = {}
    const rowsFor = () => (store[table as keyof typeof store] || []).filter((r) => matches(r, eqs))
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: (col: string, val: unknown) => { eqs[col] = val; return builder },
      order: () => builder,
      limit: () => builder,
      insert: (rows: Row[]) => { mode = 'insert'; payload = { rows: Array.isArray(rows) ? rows : [rows] }; return builder },
      upsert: (rows: Row[]) => { mode = 'upsert'; payload = { rows: Array.isArray(rows) ? rows : [rows] }; return builder },
      maybeSingle: async () => {
        // The `tenants` table itself is scoped by its own primary key `id`
        // (there is no separate `tenant_id` column on it) — tenantEntryDate's
        // timezone lookup filters `.eq('id', tenantId)`, which IS tenant-scoped,
        // just under a different column name than every other table here.
        const tenant = table === 'tenants' ? eqs.id : eqs.tenant_id
        touches.push({ op: 'maybeSingle', table, tenant })
        return { data: table === 'tenants' ? { timezone: null } : (rowsFor()[0] ?? null), error: null }
      },
      // Awaiting the builder directly (array read / insert / upsert resolution).
      then: (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) => {
        let result: unknown
        if (mode === 'insert' || mode === 'upsert') {
          touches.push({ op: mode, table, tenant: payload.rows?.[0]?.tenant_id })
          result = { data: null, error: null }
        } else {
          touches.push({ op: 'select', table, tenant: eqs.tenant_id })
          result = { data: rowsFor(), error: null }
        }
        return Promise.resolve(result).then(onF, onR)
      },
    }
    return builder
  }
  const rpc = async (name: string, args: Row) => {
    touches.push({ op: 'rpc', name, table: 'journal_entries', tenant: args.p_tenant_id })
    if (name === 'post_journal_entry') {
      const id = `entry-${store.journal_entries.length + 1}`
      store.journal_entries.push({
        id,
        tenant_id: args.p_tenant_id,
        source: args.p_source,
        source_id: args.p_source_id,
        memo: args.p_memo,
        lines: args.p_lines,
      })
      return { data: id, error: null }
    }
    return { data: null, error: null }
  }
  return { supabaseAdmin: { from, rpc } }
})

import { postRefundToLedger } from '@/lib/finance/post-adjustments'

function seedCharts() {
  for (const t of [TENANT_A, TENANT_B]) {
    for (const a of DEFAULT_CHART) {
      store.chart_of_accounts.push({ tenant_id: t, code: a.code, id: `${t}:${a.code}` })
    }
  }
}

function snapshot(tenant: string): string {
  return JSON.stringify(store.journal_entries.filter((r) => r.tenant_id === tenant))
}

beforeEach(() => {
  store.chart_of_accounts.length = 0
  store.journal_entries.length = 0
  touches.length = 0
  seedCharts()
})

describe('postRefundToLedger — refund on tenant A cannot read or write tenant B ledger', () => {
  it('routes every DB touch through tenant-A only; the reversal debits/credits tenant-A accounts and never tenant-B', async () => {
    // A pre-existing, unrelated tenant-B ledger row that MUST survive untouched.
    store.journal_entries.push({
      id: 'b-existing', tenant_id: TENANT_B, source: 'refund', source_id: 're_B_prior',
      memo: 'B prior refund', lines: [{ coa_id: `${TENANT_B}:4000`, debit_cents: 111 }, { coa_id: `${TENANT_B}:1050`, credit_cents: 111 }],
    })
    const beforeB = snapshot(TENANT_B)

    const res = await postRefundToLedger({ tenantId: TENANT_A, sourceId: 're_A', amountCents: 5000, memo: 'Refund · booking abcd1234' })
    expect(res.posted).toBe(true)

    // (1) Every tenant-scoped DB touch — reads AND the write RPC — was tenant-A.
    expect(touches.length).toBeGreaterThan(0)
    expect(touches.every((t) => t.tenant === TENANT_A)).toBe(true)
    expect(touches.some((t) => t.tenant === TENANT_B)).toBe(false)
    // The write itself went through the RPC scoped to tenant-A.
    expect(touches.some((t) => t.op === 'rpc' && t.tenant === TENANT_A)).toBe(true)

    // (2) The posted reversal: DR tenant-A:4000 / CR tenant-A:1050, balanced, 5000.
    const posted = store.journal_entries.find((r) => r.tenant_id === TENANT_A) as Row
    const lines = posted.lines as Array<{ coa_id: string; debit_cents?: number; credit_cents?: number }>
    const debit = lines.find((l) => (l.debit_cents ?? 0) > 0)!
    const credit = lines.find((l) => (l.credit_cents ?? 0) > 0)!
    expect(debit.coa_id).toBe(`${TENANT_A}:4000`)
    expect(credit.coa_id).toBe(`${TENANT_A}:1050`)
    // Not one account id in the entry belongs to tenant-B's chart.
    expect(lines.every((l) => l.coa_id.startsWith(`${TENANT_A}:`))).toBe(true)
    expect(debit.debit_cents).toBe(5000)
    expect(credit.credit_cents).toBe(5000)

    // (3) Tenant-B's ledger is byte-for-byte unchanged.
    expect(snapshot(TENANT_B)).toBe(beforeB)
    expect(store.journal_entries.filter((r) => r.tenant_id === TENANT_B)).toHaveLength(1)
  })

  it('reverses the EXACT refund amount, not the original sale — partial refund posts a partial reversal', async () => {
    // A $120.00 sale partially refunded $25.00 → reversal must be 2500, never 12000.
    const res = await postRefundToLedger({ tenantId: TENANT_A, sourceId: 're_partial', amountCents: 2500 })
    expect(res.posted).toBe(true)

    const posted = store.journal_entries.find((r) => r.source_id === 're_partial') as Row
    const lines = posted.lines as Array<{ debit_cents?: number; credit_cents?: number }>
    const debits = lines.reduce((a, l) => a + (l.debit_cents ?? 0), 0)
    const credits = lines.reduce((a, l) => a + (l.credit_cents ?? 0), 0)
    expect(debits).toBe(2500)
    expect(credits).toBe(2500)
  })

  it('idempotency is tenant-scoped: a tenant-B row sharing the refund id does NOT suppress tenant-A, but a real tenant-A re-delivery does', async () => {
    // Tenant-B already refunded under the SAME Stripe refund id.
    store.journal_entries.push({
      id: 'b-shared', tenant_id: TENANT_B, source: 'refund', source_id: 're_shared',
      memo: 'B refund', lines: [{ coa_id: `${TENANT_B}:4000`, debit_cents: 900 }, { coa_id: `${TENANT_B}:1050`, credit_cents: 900 }],
    })
    const beforeB = snapshot(TENANT_B)

    // Tenant-A's legitimate refund with the same id must STILL post (not falsely deduped).
    const first = await postRefundToLedger({ tenantId: TENANT_A, sourceId: 're_shared', amountCents: 4000 })
    expect(first.posted).toBe(true)
    expect(store.journal_entries.filter((r) => r.tenant_id === TENANT_A && r.source_id === 're_shared')).toHaveLength(1)

    // A genuine re-delivery to tenant-A IS suppressed — no double reversal.
    const second = await postRefundToLedger({ tenantId: TENANT_A, sourceId: 're_shared', amountCents: 4000 })
    expect(second.posted).toBe(false)
    expect(second.reason).toBe('already_posted')
    expect(store.journal_entries.filter((r) => r.tenant_id === TENANT_A && r.source_id === 're_shared')).toHaveLength(1)

    // Tenant-B's row untouched throughout.
    expect(snapshot(TENANT_B)).toBe(beforeB)
  })
})
