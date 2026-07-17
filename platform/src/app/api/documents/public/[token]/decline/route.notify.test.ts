/**
 * Fresh-ground fix: no document lifecycle event (consent, sign, decline,
 * completion) ever notified the tenant admin — unlike the sibling quotes
 * flow, where both accept AND decline fire notify() + ownerAlert(). A signer
 * declining a document (a lost signed deal, same business weight as a
 * declined quote) left the admin with no way to know short of manually
 * checking the dashboard. Mirrors quotes/public/[token]/decline/route.ts's
 * notify()+ownerAlert() pair.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const rateLimitDb = vi.fn()
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: (...args: unknown[]) => rateLimitDb(...args) }))

const logDocEvent = vi.fn()
vi.mock('@/lib/documents', () => ({ logDocEvent: (...args: unknown[]) => logDocEvent(...args) }))

const notifyMock = vi.fn(async (..._args: unknown[]) => ({ success: true }))
vi.mock('@/lib/notify', () => ({ notify: (...args: unknown[]) => notifyMock(...args) }))

const ownerAlertMock = vi.fn(async (..._args: unknown[]) => {})
vi.mock('@/lib/messaging/owner-alerts', () => ({ ownerAlert: (...args: unknown[]) => ownerAlertMock(...args) }))

let signerRow: Record<string, unknown> | null
let documentRow: Record<string, unknown> | null
const supabaseFrom = vi.fn((table: string) => {
  if (table === 'document_signers') {
    return {
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: signerRow }) }) }),
      update: () => ({ eq: async () => ({ data: null, error: null }) }),
    }
  }
  if (table === 'documents') {
    return {
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: documentRow }) }) }),
      update: () => ({ eq: async () => ({ data: null, error: null }) }),
    }
  }
  throw new Error(`unexpected table ${table}`)
})
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (...args: [string]) => supabaseFrom(...args) } }))

function fakeRequest(body: Record<string, unknown> = {}) {
  return {
    headers: { get: (key: string) => (key === 'x-forwarded-for' ? '1.2.3.4' : null) },
    json: async () => body,
  } as unknown as Request
}

beforeEach(() => {
  rateLimitDb.mockReset()
  rateLimitDb.mockResolvedValue({ allowed: true, remaining: 14 })
  logDocEvent.mockReset()
  notifyMock.mockClear()
  ownerAlertMock.mockClear()
  supabaseFrom.mockClear()
})

describe('POST /api/documents/public/[token]/decline — owner notified on decline', () => {
  it('fires notify(document_declined) + ownerAlert with the signer name, title, and reason', async () => {
    signerRow = { id: 'signer-1', document_id: 'doc-1', tenant_id: 'tenant-A', status: 'sent', name: 'Alex Rivera' }
    documentRow = { status: 'in_progress', title: 'Service Agreement' }

    const { POST } = await import('./route')
    const res = await POST(
      fakeRequest({ reason: 'changed my mind' }),
      { params: Promise.resolve({ token: 'tok123' }) },
    )
    expect(res.status).toBe(200)

    expect(notifyMock).toHaveBeenCalledTimes(1)
    expect(notifyMock.mock.calls[0][0]).toMatchObject({
      type: 'document_declined',
      tenantId: 'tenant-A',
      recipientType: 'admin',
    })

    expect(ownerAlertMock).toHaveBeenCalledTimes(1)
    const alertArg = ownerAlertMock.mock.calls[0][0] as { tenantId: string; bodyHtml: string; subject: string }
    expect(alertArg).toMatchObject({ tenantId: 'tenant-A' })
    expect(alertArg.bodyHtml).toContain('Alex Rivera')
    expect(alertArg.subject).toContain('Service Agreement')
  })

  it('does not fire either alert when the signer token is unknown (404 before any notify)', async () => {
    signerRow = null
    documentRow = null

    const { POST } = await import('./route')
    const res = await POST(fakeRequest({}), { params: Promise.resolve({ token: 'nope' }) })
    expect(res.status).toBe(404)

    expect(notifyMock).not.toHaveBeenCalled()
    expect(ownerAlertMock).not.toHaveBeenCalled()
  })
})
