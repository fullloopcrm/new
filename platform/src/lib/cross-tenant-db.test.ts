/**
 * CROSS-TENANT SELF-ATTACK — foreign-id DB isolation (booking/client/crew/deal).
 *
 * The load-bearing dashboard endpoints (bookings, clients, crews, deals, team)
 * resolve a tenantId via getTenantForRequest() and then filter every query with
 * `.eq('tenant_id', tenantId)` — either manually (as the routes do today) or via
 * the tenantDb() wrapper (the safe-by-default layer). This suite proves that,
 * given tenant A's context, passing tenant B's row id CANNOT read, update, or
 * delete B's data.
 *
 * The store (fake-supabase) is deliberately god-access with NO implicit tenant
 * scoping — same as the real service_role client. The LEAK CONTROL test at the
 * bottom queries WITHOUT a tenant filter and asserts B's row DOES come back;
 * that proves the fake would leak, so the passing filtered tests above are real
 * evidence, not a store that hides B's rows for free.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from './tenant-db'
import { getAccountIdByCode, journalEntryExists } from './ledger'
import { postPayoutToLedger } from './finance/post-labor'

const A_ID = '11111111-1111-1111-1111-111111111111'
const B_ID = '22222222-2222-2222-2222-222222222222'

const ids = {
  booking: { a: 'bk-a', b: 'bk-b' },
  client: { a: 'cl-a', b: 'cl-b' },
  crew: { a: 'cr-a', b: 'cr-b' },
  deal: { a: 'dl-a', b: 'dl-b' },
  team: { a: 'tm-a', b: 'tm-b' },
  payout: { a: 'po-a', b: 'po-b' },
  journalEntry: { a: 'je-a', b: 'je-b' },
  journalLine: { a: 'jl-a', b: 'jl-b' },
  coa: { a: 'coa-a', b: 'coa-b' },
}

// Shared (source, source_id) minted independently by BOTH tenants — proves the
// dedup check (journalEntryExists) keys on tenant_id, not on (source,source_id)
// alone. A code/source_id that exists ONLY under B proves A cannot resolve it.
const SHARED_SOURCE_ID = 'payout-42'
const B_ONLY_SOURCE_ID = 'payout-b-secret'
const SHARED_COA_CODE = '5000' // Contractor Pay — every tenant's chart has it
const B_ONLY_COA_CODE = '9999' // exists only in tenant B's chart

// The mocked module exposes the singleton fake via __fake.
const fake = (supabaseAdmin as unknown as FakeSupabase)

function reseed() {
  fake._store.clear()
  fake._seed('bookings', [
    { id: ids.booking.a, tenant_id: A_ID, client_id: ids.client.a, status: 'scheduled', start_time: '2026-07-01' },
    { id: ids.booking.b, tenant_id: B_ID, client_id: ids.client.b, status: 'scheduled', start_time: '2026-07-02' },
  ])
  fake._seed('clients', [
    { id: ids.client.a, tenant_id: A_ID, name: 'A Client', do_not_service: false },
    { id: ids.client.b, tenant_id: B_ID, name: 'B Client', do_not_service: false },
  ])
  fake._seed('crews', [
    { id: ids.crew.a, tenant_id: A_ID, name: 'A Crew' },
    { id: ids.crew.b, tenant_id: B_ID, name: 'B Crew' },
  ])
  fake._seed('deals', [
    { id: ids.deal.a, tenant_id: A_ID, title: 'A Deal', status: 'active' },
    { id: ids.deal.b, tenant_id: B_ID, title: 'B Deal', status: 'active' },
  ])
  fake._seed('team_members', [
    { id: ids.team.a, tenant_id: A_ID, name: 'A Worker', status: 'active' },
    { id: ids.team.b, tenant_id: B_ID, name: 'B Worker', status: 'active' },
  ])
  // --- Money spine: payouts + double-entry ledger ---------------------------
  fake._seed('team_member_payouts', [
    { id: ids.payout.a, tenant_id: A_ID, booking_id: ids.booking.a, team_member_id: ids.team.a, amount_cents: 5000, status: 'paid', created_at: '2026-07-01' },
    { id: ids.payout.b, tenant_id: B_ID, booking_id: ids.booking.b, team_member_id: ids.team.b, amount_cents: 7000, status: 'paid', created_at: '2026-07-02' },
  ])
  fake._seed('chart_of_accounts', [
    { id: ids.coa.a, tenant_id: A_ID, code: SHARED_COA_CODE, name: 'Contractor Pay', type: 'expense' },
    { id: ids.coa.b, tenant_id: B_ID, code: SHARED_COA_CODE, name: 'Contractor Pay', type: 'expense' },
    { id: 'coa-b-only', tenant_id: B_ID, code: B_ONLY_COA_CODE, name: 'B Secret Account', type: 'expense' },
  ])
  fake._seed('journal_entries', [
    { id: ids.journalEntry.a, tenant_id: A_ID, source: 'payout', source_id: SHARED_SOURCE_ID, entry_date: '2026-07-01', entity_id: null, memo: 'A payout' },
    { id: ids.journalEntry.b, tenant_id: B_ID, source: 'payout', source_id: SHARED_SOURCE_ID, entry_date: '2026-07-02', entity_id: null, memo: 'B payout' },
    { id: 'je-b-only', tenant_id: B_ID, source: 'payout', source_id: B_ONLY_SOURCE_ID, entry_date: '2026-07-03', entity_id: null, memo: 'B secret payout' },
  ])
  fake._seed('journal_lines', [
    { id: ids.journalLine.a, tenant_id: A_ID, journal_entry_id: ids.journalEntry.a, coa_id: ids.coa.a, debit_cents: 5000, credit_cents: 0 },
    { id: ids.journalLine.b, tenant_id: B_ID, journal_entry_id: ids.journalEntry.b, coa_id: ids.coa.b, debit_cents: 7000, credit_cents: 0 },
  ])
}

beforeEach(reseed)

const TABLES: { table: string; a: string; b: string }[] = [
  { table: 'bookings', a: ids.booking.a, b: ids.booking.b },
  { table: 'clients', a: ids.client.a, b: ids.client.b },
  { table: 'crews', a: ids.crew.a, b: ids.crew.b },
  { table: 'deals', a: ids.deal.a, b: ids.deal.b },
  { table: 'team_members', a: ids.team.a, b: ids.team.b },
]

describe('CROSS-TENANT ATTACK · tenantDb READ by foreign id', () => {
  it.each(TABLES)('tenant A sees its OWN $table row (positive control)', async ({ table, a }) => {
    const db = tenantDb(A_ID)
    const { data } = await db.from(table).select('*').eq('id', a)
    expect(Array.isArray(data) ? data.length : 0).toBe(1)
  })

  it.each(TABLES)("tenant A CANNOT read tenant B's $table row by foreign id", async ({ table, b }) => {
    const db = tenantDb(A_ID)
    const { data } = await db.from(table).select('*').eq('id', b)
    expect(data).toEqual([])
  })

  it.each(TABLES)("tenant A listing $table never includes B's rows", async ({ table, b }) => {
    const db = tenantDb(A_ID)
    const { data } = await db.from(table).select('*')
    const rows = (data as unknown as Row[]) || []
    expect(rows.every((r) => r.tenant_id === A_ID)).toBe(true)
    expect(rows.some((r) => r.id === b)).toBe(false)
  })
})

describe('CROSS-TENANT ATTACK · tenantDb WRITE by foreign id', () => {
  it.each(TABLES)("tenant A UPDATE targeting B's $table id changes 0 rows and leaves B intact", async ({ table, b }) => {
    const db = tenantDb(A_ID)
    const { data } = await db.from(table).update({ name: 'HACKED', title: 'HACKED', status: 'HACKED' }).eq('id', b)
    expect(data).toEqual([]) // nothing matched under tenant A
    const bRow = fake._all(table).find((r) => r.id === b)!
    expect(bRow.name ?? bRow.title).not.toBe('HACKED')
    expect(bRow.tenant_id).toBe(B_ID)
  })

  it.each(TABLES)("tenant A DELETE targeting B's $table id removes nothing", async ({ table, b }) => {
    const db = tenantDb(A_ID)
    const { data } = await db.from(table).delete().eq('id', b)
    expect(data).toEqual([])
    expect(fake._all(table).some((r) => r.id === b)).toBe(true) // B row survives
  })
})

describe('CROSS-TENANT ATTACK · tenantDb INSERT tenant stamping', () => {
  it('stamps tenant A on inserts that omit tenant_id', async () => {
    await tenantDb(A_ID).from('clients').insert({ id: 'cl-new', name: 'New' })
    const row = fake._all('clients').find((r) => r.id === 'cl-new')!
    expect(row.tenant_id).toBe(A_ID)
  })

  it("OVERRIDES an attacker-supplied tenant_id:B — cannot plant a row into tenant B", async () => {
    await tenantDb(A_ID).from('clients').insert({ id: 'cl-evil', name: 'Evil', tenant_id: B_ID })
    const row = fake._all('clients').find((r) => r.id === 'cl-evil')!
    expect(row.tenant_id).toBe(A_ID)
    expect(row.tenant_id).not.toBe(B_ID)
  })
})

describe('CROSS-TENANT ATTACK · real dashboard-route query shape', () => {
  // Mirrors src/app/api/bookings/route.ts GET: supabaseAdmin.from('bookings')
  //   .select('*',{count:'exact'}).eq('tenant_id', tenantId)...  plus an
  //   attacker-supplied ?client_id / id belonging to tenant B.
  it("A's booking query with B's booking id returns nothing", async () => {
    const { data, count } = await supabaseAdmin
      .from('bookings')
      .select('*', { count: 'exact' })
      .eq('tenant_id', A_ID)
      .eq('id', ids.booking.b)
    expect(data).toEqual([])
    expect(count).toBe(0)
  })

  it("A's booking query filtered by B's client_id returns nothing", async () => {
    const { data } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('tenant_id', A_ID)
      .eq('client_id', ids.client.b)
    expect(data).toEqual([])
  })
})

// --- Payouts + ledger: the money spine ---------------------------------------
// Payouts (team_member_payouts) and the double-entry ledger (journal_entries,
// journal_lines, chart_of_accounts) are the highest-blast-radius tenant-scoped
// tables: a cross-tenant leak here is one tenant reading/altering another's
// money. Same attack model as the rows above — given tenant A's context, B's
// row ids must be inert for read, update, and delete.
const MONEY_TABLES: { table: string; a: string; b: string }[] = [
  { table: 'team_member_payouts', a: ids.payout.a, b: ids.payout.b },
  { table: 'journal_entries', a: ids.journalEntry.a, b: ids.journalEntry.b },
  { table: 'journal_lines', a: ids.journalLine.a, b: ids.journalLine.b },
  { table: 'chart_of_accounts', a: ids.coa.a, b: ids.coa.b },
]

describe('CROSS-TENANT ATTACK · payouts + ledger foreign-id DB isolation', () => {
  it.each(MONEY_TABLES)('tenant A sees its OWN $table row (positive control)', async ({ table, a }) => {
    const { data } = await tenantDb(A_ID).from(table).select('*').eq('id', a)
    expect(Array.isArray(data) ? data.length : 0).toBe(1)
  })

  it.each(MONEY_TABLES)("tenant A CANNOT read tenant B's $table row by foreign id", async ({ table, b }) => {
    const { data } = await tenantDb(A_ID).from(table).select('*').eq('id', b)
    expect(data).toEqual([])
  })

  it.each(MONEY_TABLES)("tenant A listing $table never includes B's rows", async ({ table, b }) => {
    const { data } = await tenantDb(A_ID).from(table).select('*')
    const rows = (data as unknown as Row[]) || []
    expect(rows.every((r) => r.tenant_id === A_ID)).toBe(true)
    expect(rows.some((r) => r.id === b)).toBe(false)
  })

  it.each(MONEY_TABLES)("tenant A UPDATE targeting B's $table id changes 0 rows and leaves B intact", async ({ table, b }) => {
    const { data } = await tenantDb(A_ID)
      .from(table)
      .update({ status: 'HACKED', amount_cents: 1, name: 'HACKED', memo: 'HACKED' })
      .eq('id', b)
    expect(data).toEqual([]) // nothing matched under tenant A
    const bRow = fake._all(table).find((r) => r.id === b)!
    expect(bRow.tenant_id).toBe(B_ID)
    expect(bRow.status ?? bRow.name ?? bRow.memo).not.toBe('HACKED')
  })

  it.each(MONEY_TABLES)("tenant A DELETE targeting B's $table id removes nothing", async ({ table, b }) => {
    const { data } = await tenantDb(A_ID).from(table).delete().eq('id', b)
    expect(data).toEqual([])
    expect(fake._all(table).some((r) => r.id === b)).toBe(true) // B row survives
  })
})

describe('CROSS-TENANT ATTACK · payout + ledger real code paths', () => {
  it("getAccountIdByCode(A, '5000') resolves A's account, never B's", async () => {
    // Both tenants have code 5000. The tenant filter is the only thing that
    // keeps A from resolving B's account id for the same code.
    expect(await getAccountIdByCode(A_ID, SHARED_COA_CODE)).toBe(ids.coa.a)
    expect(await getAccountIdByCode(B_ID, SHARED_COA_CODE)).toBe(ids.coa.b)
  })

  it('getAccountIdByCode(A, …) returns null for a code that exists only under B', async () => {
    expect(await getAccountIdByCode(A_ID, B_ONLY_COA_CODE)).toBeNull()
  })

  it('journalEntryExists is tenant-scoped: A sees its own entry (positive control)', async () => {
    expect(await journalEntryExists(A_ID, 'payout', SHARED_SOURCE_ID)).toBe(true)
    expect(await journalEntryExists(B_ID, 'payout', SHARED_SOURCE_ID)).toBe(true)
  })

  it("journalEntryExists reads a B-only (source,source_id) as ABSENT for A — dedup can't leak or cross-block", async () => {
    // If this leaked, an A posting could be wrongly deduped against B's ledger
    // (silent under-posting), or B's books could gate A's. Must be false.
    expect(await journalEntryExists(A_ID, 'payout', B_ONLY_SOURCE_ID)).toBe(false)
  })

  it("postPayoutToLedger(A, B's payout id) returns not_found — A cannot post B's payout into A's books", async () => {
    const res = await postPayoutToLedger({ tenantId: A_ID, payoutId: ids.payout.b })
    expect(res).toEqual({ posted: false, reason: 'not_found' })
  })

  it("real payroll/summary read shape: A's payout query with B's team_member_id returns nothing", async () => {
    // Mirrors finance/payroll-prep + summary: .eq('tenant_id', A).eq(team_member_id …)
    const { data } = await supabaseAdmin
      .from('team_member_payouts')
      .select('*')
      .eq('tenant_id', A_ID)
      .eq('team_member_id', ids.team.b)
    expect(data).toEqual([])
  })
})

describe('LEAK CONTROL · proves the fake store would leak without a tenant filter', () => {
  it("the SAME query WITHOUT .eq('tenant_id') DOES return tenant B's row", async () => {
    const { data } = await supabaseAdmin.from('bookings').select('*').eq('id', ids.booking.b)
    const rows = (data as Row[]) || []
    expect(rows.length).toBe(1)
    expect(rows[0].tenant_id).toBe(B_ID)
  })

  it("chart_of_accounts by code WITHOUT a tenant filter returns BOTH tenants' 5000 rows (would leak)", async () => {
    // Proves getAccountIdByCode's green tests are real: strip the tenant filter
    // and code 5000 resolves ambiguously across A and B.
    const { data } = await supabaseAdmin.from('chart_of_accounts').select('*').eq('code', SHARED_COA_CODE)
    const rows = (data as Row[]) || []
    expect(rows.length).toBe(2)
    expect(new Set(rows.map((r) => r.tenant_id))).toEqual(new Set([A_ID, B_ID]))
  })

  it("journal_entries B-only source_id WITHOUT a tenant filter DOES return B's entry (would leak)", async () => {
    const { data } = await supabaseAdmin
      .from('journal_entries')
      .select('*')
      .eq('source', 'payout')
      .eq('source_id', B_ONLY_SOURCE_ID)
    const rows = (data as Row[]) || []
    expect(rows.length).toBe(1)
    expect(rows[0].tenant_id).toBe(B_ID)
  })
})
