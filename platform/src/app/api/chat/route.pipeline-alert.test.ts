import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/chat — pipeline-entry alerting on lead-creation failure.
 *
 * lss-04 live-audit gap (2026-07-31, docs/readiness/ledger.json): every
 * OTHER caller of createLeadAndEnterPipeline (webhooks/telnyx, api/lead,
 * api/contact, api/ingest/lead — see their own route.pipeline-alert.test.ts
 * / route.lead-creation.test.ts files) wraps a real pipeline-entry failure
 * in trackError() so it actually alerts someone. This ONE call site
 * (src/app/api/chat/route.ts, the web-chat new-visitor lead path added in
 * commit 734d360dd) only had `console.error` — a line nobody actively
 * tails in Vercel's function logs — a silent-failure gap of the exact same
 * shape as bsr-01/ai-03. There was zero unit-test coverage of this catch
 * block's alerting behavior before this file; route.lead-creation.test.ts
 * only covers the happy path.
 *
 * This file mocks createLeadAndEnterPipeline itself (not the DB layer) so
 * it proves exactly one thing — this call site's catch block behavior —
 * without re-testing lead-intake.ts's internals, which is a SEPARATE test
 * module from route.lead-creation.test.ts specifically so that mock
 * doesn't leak into (and break) that file's happy-path assertions, which
 * need the real harness-backed createLeadAndEnterPipeline to actually run.
 */

const TENANT_ID = 'tid-a'

interface TrackErrorContext {
  source?: string
  severity?: string
  tenantId?: string
}

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
const trackErrorMock = vi.hoisted(() => vi.fn(async (_error: unknown, _context: TrackErrorContext) => {}))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/tenant-header-sig', () => ({
  verifyTenantHeaderSig: (_id: string, sig: string | null | undefined) => sig === 'goodsig',
}))
vi.mock('@/lib/selena-legacy', () => ({ EMPTY_CHECKLIST: {} }))
vi.mock('@/lib/selena/agent', () => ({ askSelena: vi.fn(async () => ({ text: 'yinez', bookingCreated: false })) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/sms-messages', () => ({ insertConversationMessage: vi.fn(async () => ({ data: null, error: null })) }))
vi.mock('@/lib/error-tracking', () => ({ trackError: trackErrorMock }))
vi.mock('@/lib/lead-intake', () => ({
  createLeadAndEnterPipeline: vi.fn(async () => {
    throw new Error('simulated DB failure')
  }),
}))

import { POST } from './route'

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({ sms_conversations: [], clients: [], portal_leads: [], deals: [], deal_activities: [], client_contacts: [] })
  holder.from = h.from
  trackErrorMock.mockClear()
})

function chat(body: Record<string, unknown>) {
  return POST(new NextRequest('http://t/api/chat', {
    method: 'POST',
    headers: { 'x-tenant-id': TENANT_ID, 'x-tenant-sig': 'goodsig' },
    body: JSON.stringify(body),
  }))
}

describe('chat POST — pipeline-entry alerting on lead-creation failure', () => {
  it('calls trackError with severity high when createLeadAndEnterPipeline throws, and the chat session still succeeds', async () => {
    const res = await chat({ message: 'hi, do you service Astoria?', phone: '9175551234' })

    expect(res.status).toBe(200) // best-effort enrichment — must never block the visitor's session
    expect(trackErrorMock).toHaveBeenCalledTimes(1)
    const [, context] = trackErrorMock.mock.calls[0]
    expect(context.source).toBe('api/chat:web-chat-lead')
    expect(context.severity).toBe('high')
    expect(context.tenantId).toBe(TENANT_ID)

    // No client/lead/deal rows — the failure happened before any insert.
    expect(h.capture.inserts.find((i) => i.table === 'clients')).toBeUndefined()
  })

  it('a returning-client lookup (phone matches an existing client) never calls createLeadAndEnterPipeline, so no alert fires', async () => {
    h.seed.clients = [{ id: 'existing-client', tenant_id: TENANT_ID, name: 'Returning Ren', phone: '9175551234' }]

    const res = await chat({ message: 'checking my appointment', phone: '9175551234' })

    expect(res.status).toBe(200)
    expect(trackErrorMock).not.toHaveBeenCalled()
  })
})
