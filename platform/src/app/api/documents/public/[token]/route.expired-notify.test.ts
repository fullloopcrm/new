/**
 * Fresh-ground fix: documents.status='expired' was fully declared (the CHECK
 * constraint, isTerminalStatus()/isEditableStatus(), the 'expired'
 * document_activity event_type, and even the dashboard's STATUS_COLORS
 * badge) but nothing in the codebase ever wrote the transition — this
 * route's own expires_at check, mirroring quotes/public/[token]/route.ts's
 * valid_until check, is the fix. Continuing that surface: 'document_expired'
 * wasn't even a declared NotificationType yet, unlike its sibling terminal
 * outcomes document_declined/document_completed which both already fire
 * notify()+ownerAlert(). Proves both: an expiring document now fires the
 * transition + both alerts, and a document that's already terminal, or not
 * yet past expires_at, does not re-fire or false-fire.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const rateLimitDb = vi.fn()
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: (...args: unknown[]) => rateLimitDb(...args) }))

const logDocEvent = vi.fn()
const canSignerAct = vi.fn((..._args: unknown[]) => true)
vi.mock('@/lib/documents', () => ({
  canSignerAct: (...args: unknown[]) => canSignerAct(...args),
  DOCUMENTS_BUCKET: 'documents',
  logDocEvent: (...args: unknown[]) => logDocEvent(...args),
}))

const notifyMock = vi.fn(async (..._args: unknown[]) => ({ success: true }))
vi.mock('@/lib/notify', () => ({ notify: (...args: unknown[]) => notifyMock(...args) }))

const ownerAlertMock = vi.fn(async (..._args: unknown[]) => {})
vi.mock('@/lib/messaging/owner-alerts', () => ({ ownerAlert: (...args: unknown[]) => ownerAlertMock(...args) }))

let signerRow: Record<string, unknown> | null
let documentRow: Record<string, unknown> | null
let documentUpdateCalls: Record<string, unknown>[]

function chain(data: unknown): any {
  const obj: any = {
    eq: () => obj,
    order: () => obj,
    single: async () => ({ data }),
    maybeSingle: async () => ({ data }),
    then: (resolve: (v: { data: unknown }) => unknown) => Promise.resolve({ data }).then(resolve),
  }
  return obj
}

const supabaseFrom = vi.fn((table: string) => {
  if (table === 'document_signers') {
    return {
      select: (cols: string) => (cols === '*' ? chain(signerRow) : chain([])),
      update: () => ({ eq: async () => ({ data: null, error: null }) }),
    }
  }
  if (table === 'documents') {
    return {
      select: () => chain(documentRow),
      update: (payload: Record<string, unknown>) => {
        documentUpdateCalls.push(payload)
        return { eq: async () => ({ data: null, error: null }) }
      },
    }
  }
  if (table === 'document_fields') {
    return { select: () => chain([]) }
  }
  throw new Error(`unexpected table ${table}`)
})
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (...args: [string]) => supabaseFrom(...args),
    storage: {
      from: () => ({ createSignedUrl: async () => ({ data: { signedUrl: 'https://example.com/signed' } }) }),
    },
  },
}))

function fakeRequest() {
  return {
    headers: { get: () => null },
    url: 'https://example.com/api/documents/public/tok123',
  } as unknown as Request
}

beforeEach(() => {
  rateLimitDb.mockReset()
  rateLimitDb.mockResolvedValue({ allowed: true, remaining: 29 })
  logDocEvent.mockReset()
  notifyMock.mockClear()
  ownerAlertMock.mockClear()
  supabaseFrom.mockClear()
  documentUpdateCalls = []
})

describe('GET /api/documents/public/[token] — owner notified when a document expires', () => {
  it('fires notify(document_expired) + ownerAlert and transitions status when expires_at has passed on a "sent" document', async () => {
    signerRow = {
      id: 'signer-1', document_id: 'doc-1', tenant_id: 'tenant-A', status: 'sent',
      name: 'Alex Rivera', email: 'alex@example.com', role: 'Primary', order_index: 1,
      view_count: 0, first_viewed_at: null,
    }
    documentRow = {
      id: 'doc-1', tenant_id: 'tenant-A', title: 'Service Agreement', status: 'sent',
      sign_order: 'parallel', consent_text: 'I agree', page_count: 1, original_path: 'x.pdf',
      expires_at: '2020-01-01T00:00:00.000Z',
      tenants: { name: 'Acme', domain: null, phone: null, email: null, logo_url: null, primary_color: null, status: 'active' },
    }

    const { GET } = await import('./route')
    const res = await GET(fakeRequest(), { params: Promise.resolve({ token: 'tok123' }) })
    expect(res.status).toBe(200)

    expect(logDocEvent).toHaveBeenCalledWith(expect.objectContaining({ document_id: 'doc-1', event_type: 'expired' }))

    expect(notifyMock).toHaveBeenCalledTimes(1)
    expect(notifyMock.mock.calls[0][0]).toMatchObject({ type: 'document_expired', tenantId: 'tenant-A', recipientType: 'admin' })

    expect(ownerAlertMock).toHaveBeenCalledTimes(1)
    expect(ownerAlertMock.mock.calls[0][0]).toMatchObject({ tenantId: 'tenant-A' })

    expect(documentUpdateCalls[0]).toEqual({ status: 'expired' })
    // Status was mutated to 'expired' before the pre-existing sent->viewed
    // bump runs, so that unrelated update must not also fire.
    expect(documentUpdateCalls).not.toContainEqual({ status: 'viewed' })
  })

  it('does NOT fire when the document is already terminal (voided) — no re-fire on repeat visits', async () => {
    signerRow = {
      id: 'signer-2', document_id: 'doc-2', tenant_id: 'tenant-A', status: 'sent',
      name: 'Alex Rivera', email: null, role: null, order_index: 1, view_count: 3, first_viewed_at: '2020-01-01T00:00:00.000Z',
    }
    documentRow = {
      id: 'doc-2', tenant_id: 'tenant-A', title: 'Service Agreement', status: 'voided',
      sign_order: 'parallel', consent_text: 'I agree', page_count: 1, original_path: 'x.pdf',
      expires_at: '2020-01-01T00:00:00.000Z',
      tenants: { name: 'Acme', domain: null, phone: null, email: null, logo_url: null, primary_color: null, status: 'active' },
    }

    const { GET } = await import('./route')
    const res = await GET(fakeRequest(), { params: Promise.resolve({ token: 'tok123' }) })
    expect(res.status).toBe(200)

    expect(notifyMock).not.toHaveBeenCalled()
    expect(ownerAlertMock).not.toHaveBeenCalled()
    expect(documentUpdateCalls).not.toContainEqual({ status: 'expired' })
  })

  it('does NOT fire when expires_at is still in the future', async () => {
    signerRow = {
      id: 'signer-3', document_id: 'doc-3', tenant_id: 'tenant-A', status: 'viewed',
      name: 'Alex Rivera', email: null, role: null, order_index: 1, view_count: 2, first_viewed_at: '2026-01-01T00:00:00.000Z',
    }
    documentRow = {
      id: 'doc-3', tenant_id: 'tenant-A', title: 'Service Agreement', status: 'viewed',
      sign_order: 'parallel', consent_text: 'I agree', page_count: 1, original_path: 'x.pdf',
      expires_at: '2099-01-01T00:00:00.000Z',
      tenants: { name: 'Acme', domain: null, phone: null, email: null, logo_url: null, primary_color: null, status: 'active' },
    }

    const { GET } = await import('./route')
    const res = await GET(fakeRequest(), { params: Promise.resolve({ token: 'tok123' }) })
    expect(res.status).toBe(200)

    expect(notifyMock).not.toHaveBeenCalled()
    expect(ownerAlertMock).not.toHaveBeenCalled()
  })
})
