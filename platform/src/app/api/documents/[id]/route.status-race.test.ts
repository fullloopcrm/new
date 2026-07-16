/**
 * PATCH & DELETE /api/documents/[id] — TOCTOU race with a concurrent send().
 *
 * Both routes read `existing.status` once, gate on `isEditableStatus` (draft
 * only), then used to unconditionally write with no re-check in the write's
 * own WHERE clause. POST /api/documents/[id]/send flips 'draft' -> 'sent'
 * (locking the doc's hash, notifying signers) — landing between that read
 * and this write, it used to get silently clobbered: an edit could still
 * apply to the now-sent doc, and a delete would remove the doc row (and,
 * worse, its storage objects) out from under the send that just went out.
 *
 * FIX: re-assert the pre-read status in the write's own WHERE against the
 * CURRENT DB row. Zero rows matched -> 409 instead of silently proceeding.
 * DELETE only removes storage objects after a confirmed guarded DB delete.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
}))

const storageRemove = vi.hoisted(() => vi.fn(async () => ({ data: null, error: null })))

/** Set by a test to inject a concurrent write right after the route's own
 *  `existing` SELECT resolves -- the exact TOCTOU gap this fix closes. */
const afterInitialRead = vi.hoisted(() => ({ fn: null as (() => void) | null }))

vi.mock('@/lib/supabase', () => {
  const raw = makeSupabaseFake(h, { detachReads: true })
  const fake = {
    from(table: string) {
      const chain = raw.from(table) as Record<string, unknown>
      if (table !== 'documents') return chain
      const origSingle = chain.single as () => Promise<unknown>
      let intercepted = false
      chain.single = () =>
        origSingle().then((res) => {
          if (!intercepted) {
            intercepted = true
            afterInitialRead.fn?.()
            afterInitialRead.fn = null
          }
          return res
        })
      return chain
    },
    storage: { from: () => ({ remove: storageRemove }) },
  }
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({ requirePermission: (...a: unknown[]) => h.requirePermission(...a) }))

import { PATCH, DELETE } from './route'

const TENANT_ID = 'tenant-A'
const DOC_ID = 'doc-1'

const patchReq = (body: unknown) => new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_ID }, error: null }))
  afterInitialRead.fn = null
  storageRemove.mockClear()
})

describe('PATCH /api/documents/[id] — concurrent-send race', () => {
  it('refuses to edit a document sent concurrently, instead of clobbering the sent doc', async () => {
    h.store = {
      documents: [{ id: DOC_ID, tenant_id: TENANT_ID, status: 'draft', title: 'Original', message: null, sign_order: 'parallel', expires_at: null, consent_text: null }],
    }
    afterInitialRead.fn = () => {
      h.store.documents[0] = { ...h.store.documents[0], status: 'sent' }
    }

    const res = await PATCH(patchReq({ title: 'Edited after send' }), params(DOC_ID))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/concurrently/i)
    expect(h.store.documents[0].title).toBe('Original')
    expect(h.store.documents[0].status).toBe('sent')
  })

  it('still edits a document whose status did not change concurrently (no regression)', async () => {
    h.store = {
      documents: [{ id: DOC_ID, tenant_id: TENANT_ID, status: 'draft', title: 'Original', message: null, sign_order: 'parallel', expires_at: null, consent_text: null }],
    }

    const res = await PATCH(patchReq({ title: 'Edited normally' }), params(DOC_ID))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.document.title).toBe('Edited normally')
  })
})

describe('DELETE /api/documents/[id] — concurrent-send race', () => {
  it('refuses to delete (and never touches storage for) a document sent concurrently', async () => {
    h.store = {
      documents: [{ id: DOC_ID, tenant_id: TENANT_ID, status: 'draft', original_path: 'orig.pdf', signed_path: null }],
    }
    afterInitialRead.fn = () => {
      h.store.documents[0] = { ...h.store.documents[0], status: 'sent' }
    }

    const res = await DELETE(new Request('http://x', { method: 'DELETE' }), params(DOC_ID))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/concurrently/i)
    expect(h.store.documents).toHaveLength(1)
    expect(h.store.documents[0].status).toBe('sent')
    expect(storageRemove).not.toHaveBeenCalled()
  })

  it('still deletes a draft document whose status did not change concurrently (no regression)', async () => {
    h.store = {
      documents: [{ id: DOC_ID, tenant_id: TENANT_ID, status: 'draft', original_path: 'orig.pdf', signed_path: null }],
    }

    const res = await DELETE(new Request('http://x', { method: 'DELETE' }), params(DOC_ID))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(h.store.documents).toHaveLength(0)
    expect(storageRemove).toHaveBeenCalledWith(['orig.pdf'])
  })
})
