/**
 * POST /api/admin/requests/[id]/agreement — zero duplicate-submission
 * protection.
 *
 * The route had NO guard at all against being called twice for the same
 * lead: a double-click on "Send agreement for signature" (the button's own
 * `disabled={sendingAgreement}` only protects against a second click while
 * the FIRST request's response hasn't reached the browser yet — a fast
 * retry, a second tab, or two admins working the same lead sail right
 * through), a page-refresh resubmit, or a genuine race all built a fresh
 * PDF, created a NEW documents/signers/fields row set, and emailed the
 * client ANOTHER live "sign your agreement" link — same archetype as the
 * already-fixed campaigns/documents/quotes/invoices send routes, just never
 * swept on the lead-to-tenant sales pipeline.
 *
 * FIX: new partner_requests.agreement_document_id column (migration,
 * file-only). Fast-fail up front if already set (common re-click case,
 * avoids redoing PDF/storage work); atomic claim
 * (`UPDATE ... WHERE agreement_document_id IS NULL`) right before the email
 * fires closes the true concurrent race — the loser never emails the client.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const LEAD_ID = 'lead-1'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
}))

const sendEmailMock = vi.hoisted(() => vi.fn(async () => ({ ok: true })))
/** Injected right after the route's own initial lead SELECT resolves. */
const afterInitialRead = vi.hoisted(() => ({ fn: null as (() => void) | null }))

vi.mock('@/lib/supabase', () => {
  const raw = makeSupabaseFake(h, { detachReads: true })
  const fake = {
    from(table: string) {
      const chain = raw.from(table) as Record<string, unknown>
      if (table === 'partner_requests') {
        const origSingle = chain.single as () => Promise<unknown>
        chain.single = () =>
          origSingle().then((res) => {
            afterInitialRead.fn?.()
            afterInitialRead.fn = null
            return res
          })
      }
      return chain
    },
    storage: {
      from: () => ({ upload: vi.fn(async () => ({ error: null })) }),
    },
  }
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))
vi.mock('@/lib/email', () => ({ sendEmail: sendEmailMock }))
vi.mock('@/lib/agreement-pdf', () => ({
  buildAgreementPdf: vi.fn(async () => ({
    bytes: new Uint8Array([1, 2, 3]),
    pageCount: 3,
    clientSignature: { page: 3, xPct: 0.1, yPct: 0.1, wPct: 0.2, hPct: 0.05 },
    clientDate: { page: 3, xPct: 0.1, yPct: 0.2, wPct: 0.2, hPct: 0.05 },
    loopSignature: { page: 3, xPct: 0.6, yPct: 0.1, wPct: 0.2, hPct: 0.05 },
    loopDate: { page: 3, xPct: 0.6, yPct: 0.2, wPct: 0.2, hPct: 0.05 },
  })),
}))

import { POST } from './route'

const params = () => ({ params: Promise.resolve({ id: LEAD_ID }) })
const post = () => POST(new Request('http://x', { method: 'POST' }), params())

beforeEach(() => {
  h.seq = 0
  sendEmailMock.mockClear()
  afterInitialRead.fn = null
  h.store = {
    partner_requests: [
      {
        id: LEAD_ID,
        business_name: 'Acme Cleaning',
        contact_name: 'Jane Doe',
        email: 'jane@acme.test',
        phone: '2125550001',
        proposal_admins: 1,
        proposal_team_members: 0,
        proposal_monthly: 199,
        territory_id: null,
        agreement_document_id: null,
      },
    ],
    documents: [],
    document_signers: [],
    document_fields: [],
  }
})

describe('POST /api/admin/requests/[id]/agreement — duplicate-submission protection', () => {
  it('fast-fails immediately when an agreement was already sent (re-click after success)', async () => {
    h.store.partner_requests[0] = { ...h.store.partner_requests[0], agreement_document_id: 'doc-existing' }

    const res = await post()
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/already been sent/i)
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('a genuine concurrent request loses the race and never emails the client twice', async () => {
    // Simulate the second, slower request's initial read landing after the
    // first request has already fully claimed + emailed.
    afterInitialRead.fn = () => {
      h.store.partner_requests[0] = { ...h.store.partner_requests[0], agreement_document_id: 'doc-from-first-request' }
    }

    const res = await post()
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/already been sent/i)
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('a normal single request still builds the agreement and emails the client (no regression)', async () => {
    const res = await post()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(h.store.documents).toHaveLength(1)
    expect(h.store.partner_requests[0].agreement_document_id).toBe(h.store.documents[0].id)
  })
})
