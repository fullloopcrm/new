import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/documents/[id]/void reads `doc.status` once, gates on
 * isTerminalStatus (must be non-terminal to void), then used to
 * unconditionally UPDATE status='voided' with no re-check in the write's own
 * WHERE clause. The public sign route's finalizeDocument (atomic per-signer
 * claim, then stamps the document 'completed' + writes the signed PDF +
 * emails all parties their copy) can land in the gap between that read and
 * this write — an admin's void click racing a signer's final signature used
 * to silently revert an already-completed, already-emailed document back to
 * 'voided'. Fixed by re-asserting the pre-read status (and tenant_id, to
 * match every sibling mutation in this feature) in the write's own WHERE,
 * 409 on zero rows matched instead of a silent overwrite.
 */

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: 'tenant-1' }, error: null })),
}))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: 'tenant-1' }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))
vi.mock('@/lib/documents', async () => {
  const actual = await vi.importActual<typeof import('@/lib/documents')>('@/lib/documents')
  return { ...actual, logDocEvent: vi.fn(async () => {}) }
})

const doc: Record<string, unknown> = {
  id: 'doc-1',
  tenant_id: 'tenant-1',
  status: 'sent',
}

// Simulates a concurrent finalizeDocument() completing in the gap between
// this route's initial status read and its update: the read still returns
// the stale pre-race 'sent' snapshot (passing isTerminalStatus), but by the
// time the update statement executes the document has already flipped to
// 'completed'.
let raceWithConcurrentCompletion = false

vi.mock('@/lib/supabase', () => {
  const from = (table: string) => {
    if (table !== 'documents') throw new Error(`unexpected table ${table}`)
    return {
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: async () => {
              const snapshot = { status: doc.status }
              if (raceWithConcurrentCompletion) doc.status = 'completed'
              return { data: snapshot }
            },
          }),
        }),
      }),
      update: (_payload: Record<string, unknown>) => {
        const eqs: Record<string, unknown> = {}
        const chain = {
          eq: (col: string, val: unknown) => {
            eqs[col] = val
            return chain
          },
          select: () => ({
            maybeSingle: async () => {
              const idMatches = doc.id === eqs.id
              const tenantMatches = doc.tenant_id === eqs.tenant_id
              const statusMatches = eqs.status === undefined || doc.status === eqs.status
              if (!idMatches || !tenantMatches || !statusMatches) return { data: null, error: null }
              doc.status = _payload.status
              doc.void_reason = _payload.void_reason
              return { data: { id: doc.id }, error: null }
            },
          }),
        }
        return chain
      },
    }
  }
  return { supabaseAdmin: { from } }
})

import { POST } from './route'

const voidReq = (body: unknown = {}) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  raceWithConcurrentCompletion = false
  doc.status = 'sent'
  delete doc.void_reason
})

describe('POST /api/documents/[id]/void — concurrent-completion race', () => {
  it('refuses to void a document that was completed concurrently, instead of clobbering it', async () => {
    raceWithConcurrentCompletion = true

    const res = await POST(voidReq({ reason: 'client backed out' }), params('doc-1'))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/concurrently/i)
    expect(doc.status).toBe('completed')
  })

  it('still voids a document whose status did not change concurrently (no regression)', async () => {
    const res = await POST(voidReq({ reason: 'no longer needed' }), params('doc-1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(doc.status).toBe('voided')
    expect(doc.void_reason).toBe('no longer needed')
  })

  it('returns 400 (not the race guard) when the document was already terminal at read time', async () => {
    doc.status = 'declined'

    const res = await POST(voidReq({}), params('doc-1'))

    expect(res.status).toBe(400)
  })
})
