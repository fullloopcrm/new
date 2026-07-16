/**
 * POST /api/documents/[id]/void — TOCTOU race with a concurrent completion.
 *
 * The route reads `doc.status` once, gates on `isTerminalStatus` (must be
 * non-terminal to void), then used to unconditionally write status='voided'
 * with no re-check in the write's own WHERE clause. The public sign route's
 * finalizeDocument (atomic per-signer claim, then stamps the document
 * 'completed' + writes the signed PDF + emails all parties their copy) can
 * land between that read and this write — an admin's void click racing a
 * signer's final signature used to silently revert an already-completed,
 * already-emailed document back to 'voided'.
 *
 * FIX: re-assert the pre-read status in the write's own WHERE against the
 * CURRENT DB row. Zero rows matched -> 409 instead of silently overwriting
 * the concurrent completion.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
}))

/** Set by a test to inject a concurrent write right after the route's own
 *  `doc` SELECT resolves -- the exact TOCTOU gap this fix closes. */
const afterInitialRead = vi.hoisted(() => ({ fn: null as (() => void) | null }))

vi.mock('@/lib/supabase', () => {
  const raw = makeSupabaseFake(h, { detachReads: true })
  const fake = {
    from(table: string) {
      const chain = raw.from(table) as Record<string, unknown>
      if (table !== 'documents') return chain
      const origSingle = chain.single as () => Promise<unknown>
      chain.single = () =>
        origSingle().then((res) => {
          afterInitialRead.fn?.()
          afterInitialRead.fn = null
          return res
        })
      return chain
    },
  }
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({ requirePermission: (...a: unknown[]) => h.requirePermission(...a) }))
vi.mock('@/lib/documents', async () => {
  const actual = await vi.importActual<typeof import('@/lib/documents')>('@/lib/documents')
  return { ...actual, logDocEvent: vi.fn(async () => {}) }
})

import { POST } from './route'

const TENANT_ID = 'tenant-A'
const DOC_ID = 'doc-1'

const voidReq = (body: unknown = {}) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_ID }, error: null }))
  afterInitialRead.fn = null
})

describe('POST /api/documents/[id]/void — concurrent-completion race', () => {
  it('refuses to void a document that was completed concurrently, instead of clobbering it', async () => {
    h.store = {
      documents: [{ id: DOC_ID, tenant_id: TENANT_ID, status: 'sent' }],
    }
    // Concurrent write: the last signer completes signing right after this
    // route's own read — finalizeDocument stamps status='completed'.
    afterInitialRead.fn = () => {
      h.store.documents[0] = { ...h.store.documents[0], status: 'completed' }
    }

    const res = await POST(voidReq({ reason: 'client backed out' }), params(DOC_ID))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/concurrently/i)
    expect(h.store.documents[0].status).toBe('completed')
  })

  it('still voids a document whose status did not change concurrently (no regression)', async () => {
    h.store = {
      documents: [{ id: DOC_ID, tenant_id: TENANT_ID, status: 'sent' }],
    }

    const res = await POST(voidReq({ reason: 'no longer needed' }), params(DOC_ID))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(h.store.documents[0].status).toBe('voided')
    expect(h.store.documents[0].void_reason).toBe('no longer needed')
  })

  it('returns 400 (not the race guard) when the document was already terminal at read time', async () => {
    h.store = {
      documents: [{ id: DOC_ID, tenant_id: TENANT_ID, status: 'declined' }],
    }

    const res = await POST(voidReq({}), params(DOC_ID))

    expect(res.status).toBe(400)
  })
})
