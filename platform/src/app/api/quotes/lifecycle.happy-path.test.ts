import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 quote-lifecycle HAPPY-PATH lock: create → send → accept → deal close.
 *
 * The sales-proposal flow spans three route handlers and the deal pipeline, and
 * had no positive end-to-end coverage. This drives ONE quote through its whole
 * life against a stateful in-memory DB so the state machine and the pipeline
 * side-effects are proven together, not per-endpoint in isolation:
 *
 *   CREATE  POST /api/quotes
 *     → persists a tenant-scoped `quotes` row, status 'draft', with the REAL
 *       money math (computeTotals) and a minted public_token; carries the
 *       proposal onto the deal timeline and syncs deal.value_cents.
 *   SEND    POST /api/quotes/[id]/send
 *     → draft → 'sent' (records sent_via/sent_at), emails the contact, and on
 *       first send announces the proposal to the deal's pipeline.
 *   ACCEPT  POST /api/quotes/public/[token]/accept
 *     → 'sent' → 'accepted' with captured signature; because this quote has NO
 *       deposit, the close rule fires: the OPEN deal advances to 'sold'
 *       (probability 100, closed_at stamped) and fulfillment (a Job) is spun up.
 *
 * The assertions read the persisted rows (not just HTTP 200), so a regression
 * that drops tenant_id, skips the draft→sent→accepted transition, miscomputes
 * the total, or fails to close the deal is caught.
 *
 * WHAT IS REAL vs MOCKED
 * ----------------------
 * REAL: all three route handlers, the quote state transitions, and the quote
 * money math (`computeTotals`/`normalizeLineItems`/`generatePublicToken` from
 * the actual `@/lib/quote`). MOCKED: the DB (a stateful supabase store that the
 * quote genuinely moves through), tenant resolution, the two DB-touching quote
 * helpers (`generateQuoteNumber`, `logQuoteEvent`), the email/SMS transports,
 * secret decryption, the message shells, owner alerts, the notify side-effect,
 * and the Job-creation helper (asserted-called, not executed).
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const OTHER_TENANT = 'cccccccc-9999-8888-7777-666666666666'
const DEAL = 'dddddddd-dddd-dddd-dddd-dddddddddddd'

const UNIT_PRICE = 20000 // $200.00
const EXPECTED_TOTAL = 20000 // qty 1 × $200, no tax, no discount

// ── Stateful in-memory DB the quote actually travels through ──────────────────
type Row = Record<string, any>
const store: Record<string, Row[]> = { quotes: [], deals: [], deal_activities: [], tenants: [] }
let idSeq = 0
const genId = (table: string) => `${table}-${++idSeq}`

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let kind: 'read' | 'insert' | 'update' = 'read'
    let payload: Row | Row[] = {}
    const match = (r: Row) => Object.entries(eqs).every(([k, v]) => r[k] === v)
    function doInsert(): Row[] {
      const rows = Array.isArray(payload) ? payload : [payload]
      const inserted = rows.map((r) => ({ id: r.id ?? genId(table), ...r }))
      store[table] = [...(store[table] || []), ...inserted]
      return inserted
    }
    function doUpdate() {
      store[table] = (store[table] || []).map((r) => (match(r) ? { ...r, ...(payload as Row) } : r))
    }
    const c: Record<string, unknown> = {
      select: () => c,
      insert: (p: Row | Row[]) => { kind = 'insert'; payload = p; return c },
      update: (p: Row) => { kind = 'update'; payload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      order: () => c,
      limit: () => c,
      single: async () => {
        if (kind === 'insert') { const [row] = doInsert(); return { data: row, error: null } }
        if (kind === 'update') {
          const before = (store[table] || []).find(match)
          if (!before) return { data: null, error: { message: 'not found' } }
          doUpdate()
          return { data: (store[table] || []).find((r) => r.id === before.id) ?? null, error: null }
        }
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: found ? null : { message: 'not found' } }
      },
      maybeSingle: async () => {
        if (kind === 'update') {
          const before = (store[table] || []).find(match)
          if (!before) return { data: null, error: null }
          doUpdate()
          return { data: (store[table] || []).find((r) => r.id === before.id) ?? null, error: null }
        }
        return { data: (store[table] || []).find(match) ?? null, error: null }
      },
      then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
        if (kind === 'insert') { doInsert(); return res({ data: null, error: null }) }
        if (kind === 'update') { doUpdate(); return res({ data: null, error: null }) }
        return res({ data: (store[table] || []).filter(match), error: null })
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) { super(message); this.status = status }
  },
}))

// Keep the REAL quote math; stub only the two helpers that touch the DB.
const logQuoteEvent = vi.fn(async (_o: unknown) => {})
vi.mock('@/lib/quote', async (orig) => {
  const actual = await orig<typeof import('@/lib/quote')>()
  return {
    ...actual,
    generateQuoteNumber: async () => 'Q-TEST-0001',
    logQuoteEvent: (o: unknown) => logQuoteEvent(o),
  }
})

// Transports + peripheral side-effects — recorded, never executed.
const sendEmail = vi.fn(async (_a: unknown) => ({}))
const sendSMS = vi.fn(async (_a: unknown) => ({}))
const ownerAlert = vi.fn(async (_a: unknown) => {})
const notify = vi.fn(async (_a: unknown) => ({ success: true }))
const convertSaleToJob = vi.fn(async (_t: string, _s: unknown, _o: unknown) => ({ id: 'job-1' }))

vi.mock('@/lib/email', () => ({ sendEmail: (a: unknown) => sendEmail(a) }))
vi.mock('@/lib/sms', () => ({ sendSMS: (a: unknown) => sendSMS(a) }))
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: (v: string) => `decrypted:${v}` }))
vi.mock('@/lib/messaging/shell', () => ({
  emailShell: () => '<p>quote</p>',
  smsFormat: (_b: unknown, body: string) => body,
}))
vi.mock('@/lib/messaging/owner-alerts', () => ({ ownerAlert: (a: unknown) => ownerAlert(a) }))
vi.mock('@/lib/notify', () => ({ notify: (a: unknown) => notify(a) }))
vi.mock('@/lib/jobs', () => ({ convertSaleToJob: (t: string, s: unknown, o: unknown) => convertSaleToJob(t, s, o) }))

import { POST as CREATE } from '@/app/api/quotes/route'
import { POST as SEND } from '@/app/api/quotes/[id]/send/route'
import { POST as ACCEPT } from '@/app/api/quotes/public/[token]/accept/route'

function jsonReq(url: string, body: Row, headers: Row = {}): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

describe('quote lifecycle — create → send → accept → deal close', () => {
  beforeEach(() => {
    store.quotes = []
    store.deals = [{ id: DEAL, tenant_id: TENANT, stage: 'quoted', value_cents: 0 }]
    store.deal_activities = []
    store.tenants = [{
      id: TENANT,
      name: 'Canary Cleaning',
      slug: 'canary',
      domain: null,
      phone: '+15551230000',
      email: 'ops@canary.test',
      address: null,
      logo_url: null,
      primary_color: null,
      telnyx_api_key: null,
      telnyx_phone: null,
      resend_api_key: 'enc_resend_key',
      email_from: 'quotes@canary.test',
      selena_config: null,
    }]
    idSeq = 0
    logQuoteEvent.mockClear()
    sendEmail.mockClear()
    sendSMS.mockClear()
    ownerAlert.mockClear()
    notify.mockClear()
    convertSaleToJob.mockClear()
  })

  it('carries one quote through its whole life and closes the deal', async () => {
    // ── CREATE ────────────────────────────────────────────────────────────────
    const createRes = await CREATE(jsonReq('http://t.test/api/quotes', {
      deal_id: DEAL,
      contact_name: 'Ada Client',
      contact_email: 'ada@client.test',
      contact_phone: '+15550001111',
      line_items: [{ name: 'Deep clean', quantity: 1, unit_price_cents: UNIT_PRICE }],
      tax_rate_bps: 0,
      discount_cents: 0,
      deposit_type: 'none',
    }))
    expect(createRes.status).toBe(200)
    const quote = (await createRes.json()).quote as Row

    // Persisted tenant-scoped, draft, with real totals and a minted token.
    expect(quote.tenant_id).toBe(TENANT)
    expect(quote.tenant_id).not.toBe(OTHER_TENANT)
    expect(quote.status).toBe('draft')
    expect(quote.total_cents).toBe(EXPECTED_TOTAL)
    expect(quote.deposit_cents).toBe(0)
    expect(quote.deal_id).toBe(DEAL)
    expect(typeof quote.public_token).toBe('string')
    expect(quote.public_token.length).toBeGreaterThan(10)
    expect(logQuoteEvent).toHaveBeenCalledWith(expect.objectContaining({ event_type: 'created' }))

    // Proposal landed on the deal timeline; deal value synced to the total.
    expect(store.deal_activities.some((a) => a.deal_id === DEAL && a.tenant_id === TENANT)).toBe(true)
    expect(store.deals.find((d) => d.id === DEAL)?.value_cents).toBe(EXPECTED_TOTAL)

    // ── SEND (draft → sent) ─────────────────────────────────────────────────────
    const sendRes = await SEND(
      jsonReq(`http://t.test/api/quotes/${quote.id}/send`, { via: 'email' }),
      { params: Promise.resolve({ id: quote.id }) },
    )
    expect(sendRes.status).toBe(200)
    const sendJson = await sendRes.json()
    expect(sendJson.ok).toBe(true)
    expect(sendJson.via).toBe('email')

    // Row transitioned and stamped; the email actually went to the contact.
    const afterSend = store.quotes.find((q) => q.id === quote.id)!
    expect(afterSend.status).toBe('sent')
    expect(afterSend.sent_via).toBe('email')
    expect(afterSend.sent_at).toBeTruthy()
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect((sendEmail.mock.calls[0][0] as { to: string }).to).toBe('ada@client.test')
    expect(logQuoteEvent).toHaveBeenCalledWith(expect.objectContaining({ event_type: 'sent' }))

    // ── ACCEPT (sent → accepted, no deposit → deal SOLD + Job) ─────────────────
    const acceptRes = await ACCEPT(
      jsonReq(
        `http://t.test/api/quotes/public/${quote.public_token}/accept`,
        {
          signature_png: 'data:image/png;base64,' + 'A'.repeat(200),
          signature_name: 'Ada Client',
        },
        { 'x-forwarded-for': '203.0.113.7' },
      ),
      { params: Promise.resolve({ token: quote.public_token }) },
    )
    expect(acceptRes.status).toBe(200)
    expect((await acceptRes.json()).ok).toBe(true)

    // Quote is accepted + signed.
    const afterAccept = store.quotes.find((q) => q.id === quote.id)!
    expect(afterAccept.status).toBe('accepted')
    expect(afterAccept.signature_name).toBe('Ada Client')
    expect(afterAccept.accepted_at).toBeTruthy()

    // No-deposit close rule fired: the open deal is SOLD, closed, tenant-scoped.
    const closedDeal = store.deals.find((d) => d.id === DEAL)!
    expect(closedDeal.stage).toBe('sold')
    expect(closedDeal.probability).toBe(100)
    expect(closedDeal.closed_at).toBeTruthy()
    expect(closedDeal.value_cents).toBe(EXPECTED_TOTAL)

    // Fulfillment spun up + owner notified, both scoped to the quote's tenant.
    expect(convertSaleToJob).toHaveBeenCalledTimes(1)
    expect(convertSaleToJob.mock.calls[0][0]).toBe(TENANT)
    expect(convertSaleToJob.mock.calls[0][1]).toEqual({ type: 'quote', quoteId: quote.id })
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ tenantId: TENANT, type: 'quote_accepted' }))
    expect(logQuoteEvent).toHaveBeenCalledWith(expect.objectContaining({ event_type: 'accepted' }))
  })

  it('accept is idempotent — replay on an accepted quote is a no-op, not a re-close', async () => {
    // Seed a quote already accepted.
    store.quotes = [{
      id: 'q-acc', tenant_id: TENANT, deal_id: DEAL, quote_number: 'Q-TEST-0001',
      status: 'accepted', total_cents: EXPECTED_TOTAL, deposit_cents: 0, public_token: 'tok-acc',
    }]

    const res = await ACCEPT(
      jsonReq('http://t.test/api/quotes/public/tok-acc/accept', {
        signature_png: 'data:image/png;base64,' + 'A'.repeat(200),
        signature_name: 'Ada Client',
      }),
      { params: Promise.resolve({ token: 'tok-acc' }) },
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, already_accepted: true })
    // A replay must not re-fire fulfillment.
    expect(convertSaleToJob).not.toHaveBeenCalled()
  })
})
