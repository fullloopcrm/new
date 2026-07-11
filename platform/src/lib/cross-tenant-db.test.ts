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

const A_ID = '11111111-1111-1111-1111-111111111111'
const B_ID = '22222222-2222-2222-2222-222222222222'

const ids = {
  booking: { a: 'bk-a', b: 'bk-b' },
  client: { a: 'cl-a', b: 'cl-b' },
  crew: { a: 'cr-a', b: 'cr-b' },
  deal: { a: 'dl-a', b: 'dl-b' },
  team: { a: 'tm-a', b: 'tm-b' },
}

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

describe('LEAK CONTROL · proves the fake store would leak without a tenant filter', () => {
  it("the SAME query WITHOUT .eq('tenant_id') DOES return tenant B's row", async () => {
    const { data } = await supabaseAdmin.from('bookings').select('*').eq('id', ids.booking.b)
    const rows = (data as Row[]) || []
    expect(rows.length).toBe(1)
    expect(rows[0].tenant_id).toBe(B_ID)
  })
})
