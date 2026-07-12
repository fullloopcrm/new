/**
 * Happy-path integration test: lead-capture → CRM → attribution (W4 gap #4).
 *
 * Exercises the real route handlers across the three surfaces that make up the
 * lead lifecycle, against ONE shared in-memory Supabase fake (the same pattern
 * as crews/route.test.ts), so tenant-scoping shows up as real row placement:
 *
 *   1. ATTRIBUTION IN  — POST /api/leads/visits records a tenant-scoped
 *      `website_visits` row carrying the referrer (the raw attribution signal).
 *   2. CRM             — POST /api/lead persists the lead tenant-scoped:
 *      `clients` + `portal_leads` + a sales `deals` row, all with the caller's
 *      tenant_id.
 *   3. ATTRIBUTION OUT — GET /api/leads/attribution reads the tenant's visits
 *      back and buckets the referrer into a named source.
 *
 * The two assertions the gap asks for: **the lead persists tenant-scoped** and
 * **attribution is recorded** (and read back, tenant-isolated). Peripheral
 * side-effect deps of /api/lead (email, notify, rate-limit, comms, error
 * tracking) are stubbed so the test isolates persistence, not delivery.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// ── shared mutable store, hoisted so vi.mock factories can reach it ──
const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
}))

type State = {
  table: string
  op: 'select' | 'insert' | 'update' | 'delete'
  eqs: Record<string, unknown>
  inFilter: { col: string; vals: unknown[] } | null
  gtes: Array<{ col: string; val: unknown }>
  notNull: string[]
  payload: unknown
}

function matches(r: Record<string, unknown>, s: State): boolean {
  if (!Object.entries(s.eqs).every(([k, v]) => r[k] === v)) return false
  if (s.inFilter && !s.inFilter.vals.includes(r[s.inFilter.col])) return false
  for (const g of s.gtes) if (!(String(r[g.col]) >= String(g.val))) return false
  for (const col of s.notNull) if (r[col] === null || r[col] === undefined) return false
  return true
}

function runQuery(state: State, terminal: 'single' | 'maybeSingle' | 'many') {
  const store = h.store
  const rows = store[state.table] || (store[state.table] = [])

  if (state.op === 'insert') {
    const payload = Array.isArray(state.payload) ? state.payload : [state.payload]
    const inserted = payload.map((p: Record<string, unknown>) => {
      // DB default: stamp created_at so time-window filters (attribution) match.
      const row: Record<string, unknown> = { created_at: new Date().toISOString(), ...p }
      if (row.id == null) {
        h.seq += 1
        row.id = `${state.table}-${h.seq}`
      }
      rows.push(row)
      return row
    })
    if (terminal === 'many') return { data: inserted, error: null }
    return { data: inserted[0] ?? null, error: null }
  }

  if (state.op === 'update') {
    for (const r of rows) if (matches(r, state)) Object.assign(r, state.payload as object)
    return { data: null, error: null }
  }

  if (state.op === 'delete') {
    store[state.table] = rows.filter((r) => !matches(r, state))
    return { data: null, error: null }
  }

  const found = rows.filter((r) => matches(r, state))
  if (terminal === 'single') return { data: found[0] ?? null, error: found[0] ? null : { message: 'no rows' } }
  if (terminal === 'maybeSingle') return { data: found[0] ?? null, error: null }
  return { data: found, error: null }
}

function makeClient() {
  return {
    from(table: string) {
      const state: State = { table, op: 'select', eqs: {}, inFilter: null, gtes: [], notNull: [], payload: null }
      const chain: Record<string, unknown> = {
        select: () => chain,
        insert: (payload: unknown) => { state.op = 'insert'; state.payload = payload; return chain },
        update: (payload: unknown) => { state.op = 'update'; state.payload = payload; return chain },
        delete: () => { state.op = 'delete'; return chain },
        eq: (col: string, val: unknown) => { state.eqs[col] = val; return chain },
        in: (col: string, vals: unknown[]) => { state.inFilter = { col, vals }; return chain },
        ilike: () => chain, // narrowing only; empty store means no dedupe hit
        gte: (col: string, val: unknown) => { state.gtes.push({ col, val }); return chain },
        not: (col: string, op: string, val: unknown) => {
          if (op === 'is' && val === null) state.notNull.push(col)
          return chain
        },
        order: () => chain,
        limit: () => chain,
        single: () => Promise.resolve(runQuery(state, 'single')),
        maybeSingle: () => Promise.resolve(runQuery(state, 'maybeSingle')),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
          Promise.resolve(runQuery(state, 'many')).then(res, rej),
      }
      return chain
    },
  }
}

// ── module mocks ──
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeClient(), supabase: makeClient() }))

// /api/lead resolves the tenant from the host header.
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({
    id: h.tenantId, name: 'Acme Co', slug: 'acme', email: null, logo_url: null, primary_color: null,
  }),
  tenantSiteUrl: () => 'https://acme.example.com',
}))

// /api/leads/attribution + /visits GET resolve the authenticated tenant.
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: h.tenantId }),
  AuthError: class AuthError extends Error { status = 401 },
}))

vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({ attribution_window_hours: 720 }),
}))

// side-effect deps of /api/lead — stub so the test isolates persistence.
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true }) }))
vi.mock('@/lib/admin-contacts', () => ({ emailAdmins: async () => {} }))
vi.mock('@/lib/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/error-tracking', () => ({ trackError: async () => {} }))
vi.mock('@/lib/email', () => ({ sendEmail: async () => {} }))
vi.mock('@/lib/comms-prefs', () => ({ isCommEnabled: async () => false }))
vi.mock('@/lib/email-templates', () => ({
  adminNewClientEmail: () => ({ subject: 's', html: '<p>h</p>' }),
}))
vi.mock('@/lib/messaging/shell', () => ({ emailShell: () => '<html></html>' }))

import { POST as leadPOST } from './route'
import { POST as visitsPOST, GET as attributionGET } from '../leads/visits/route'
import { GET as attributionSummaryGET } from '../leads/attribution/route'

const TENANT = 'tenant-A'
const OTHER = 'tenant-B'

const visitReq = (body: unknown) =>
  new Request('http://acme.example.com/api/leads/visits', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

const leadReq = (body: unknown) =>
  new NextRequest('http://acme.example.com/api/lead', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.7' },
    body: JSON.stringify(body),
  })

beforeEach(() => {
  h.tenantId = TENANT
  h.seq = 0
  h.store = { website_visits: [], clients: [], portal_leads: [], deals: [], deal_activities: [] }
})

describe('lead-capture → CRM → attribution (happy path)', () => {
  it('records a website visit tenant-scoped with its referrer (attribution in)', async () => {
    const res = await visitsPOST(
      visitReq({ tenant_id: TENANT, referrer: 'https://www.google.com/search?q=cleaners', page_url: '/' }),
    )
    expect(res.status).toBe(204)

    expect(h.store.website_visits).toHaveLength(1)
    const visit = h.store.website_visits[0]
    expect(visit.tenant_id).toBe(TENANT)
    expect(visit.referrer).toBe('https://www.google.com/search?q=cleaners')
  })

  it('captures a lead into the CRM tenant-scoped (clients + portal_leads + deal)', async () => {
    const res = await leadPOST(
      leadReq({ name: 'Jane Doe', phone: '555-123-4567', email: 'JANE@x.com', source: 'web' }),
    )
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ success: true })

    // lead persisted tenant-scoped in the CRM
    expect(h.store.clients).toHaveLength(1)
    expect(h.store.clients[0]).toMatchObject({ tenant_id: TENANT, name: 'Jane Doe', email: 'jane@x.com' })

    expect(h.store.portal_leads).toHaveLength(1)
    expect(h.store.portal_leads[0]).toMatchObject({ tenant_id: TENANT, name: 'Jane Doe', source: 'web' })

    // entered the sales pipeline, still tenant-scoped
    expect(h.store.deals).toHaveLength(1)
    expect(h.store.deals[0]).toMatchObject({ tenant_id: TENANT, stage: 'new', mode: 'sales' })
    expect(h.store.deals[0].client_id).toBe(h.store.clients[0].id)
  })

  it('surfaces the recorded referrer as an attribution source (attribution out)', async () => {
    await visitsPOST(visitReq({ tenant_id: TENANT, referrer: 'https://www.google.com/', page_url: '/' }))

    const res = await attributionSummaryGET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.total).toBe(1)
    expect(body.window_hours).toBe(720)
    expect(body.attribution).toContainEqual({ source: 'Google', count: 1 })
  })

  it("does not leak another tenant's visits into this tenant's attribution", async () => {
    await visitsPOST(visitReq({ tenant_id: TENANT, referrer: 'https://www.bing.com/', page_url: '/' }))
    await visitsPOST(visitReq({ tenant_id: OTHER, referrer: 'https://www.google.com/', page_url: '/' }))

    // read attribution as TENANT
    const res = await attributionSummaryGET()
    const body = await res.json()
    expect(body.total).toBe(1) // only TENANT's visit, not OTHER's
    expect(body.attribution).toContainEqual({ source: 'Bing', count: 1 })
    expect(body.attribution).not.toContainEqual({ source: 'Google', count: 1 })
  })

  it('end-to-end: visit → lead → attribution readback all land under one tenant', async () => {
    // 1. attribution in
    await visitsPOST(visitReq({ tenant_id: TENANT, referrer: 'https://l.facebook.com/', page_url: '/book' }))
    // 2. CRM capture
    const leadRes = await leadPOST(leadReq({ name: 'Carlos R', phone: '555-987-6543', source: 'facebook' }))
    expect(leadRes.status).toBe(200)
    // 3. attribution out
    const attrRes = await attributionSummaryGET()
    const attr = await attrRes.json()

    expect(h.store.clients.every((c) => c.tenant_id === TENANT)).toBe(true)
    expect(h.store.website_visits.every((v) => v.tenant_id === TENANT)).toBe(true)
    expect(attr.attribution).toContainEqual({ source: 'Facebook', count: 1 })
  })
})
