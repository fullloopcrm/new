/**
 * PATCH & DELETE /api/documents/[id]/signers/[signerId] — TOCTOU race with
 * a concurrent send(), the sibling gap to ../route.status-race.test.ts.
 * send() flipping draft->sent between the requireDraft() check and this
 * write used to let a signer's contact info get edited, or the signer
 * removed outright, on an already-sent document -- a removed signer's
 * public link 404s after they were already invited, and the document could
 * complete without the consent it was sent out to collect.
 *
 * FIX: verifyStillDraft() re-checks `documents.status` immediately after
 * the write; if send() won the race, restore the pre-write signer row
 * (edit) or re-insert it (delete) and return 409.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
}))

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
  }
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({ requirePermission: (...a: unknown[]) => h.requirePermission(...a) }))

import { PATCH, DELETE } from './route'

const TENANT_ID = 'tenant-A'
const DOC_ID = 'doc-1'
const SIGNER_ID = 'sig-1'

const params = { params: Promise.resolve({ id: DOC_ID, signerId: SIGNER_ID }) }
const patchReq = (body: unknown) => new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) })

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_ID }, error: null }))
  afterInitialRead.fn = null
  h.store = {
    documents: [{ id: DOC_ID, tenant_id: TENANT_ID, status: 'draft' }],
    document_signers: [{ id: SIGNER_ID, tenant_id: TENANT_ID, document_id: DOC_ID, name: 'Original Name', email: 'orig@example.com', phone: null, role: null, order_index: 1 }],
  }
})

describe('PATCH /api/documents/[id]/signers/[signerId] — concurrent-send race', () => {
  it('restores the pre-edit signer when send() lands between the gate and the write', async () => {
    afterInitialRead.fn = () => {
      h.store.documents[0] = { ...h.store.documents[0], status: 'sent' }
    }

    const res = await PATCH(patchReq({ email: 'changed@example.com' }), params)
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/concurrently/i)
    expect(h.store.document_signers[0].email).toBe('orig@example.com')
  })

  it('still edits a signer when nothing raced (no regression)', async () => {
    const res = await PATCH(patchReq({ email: 'changed@example.com' }), params)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.signer.email).toBe('changed@example.com')
    expect(h.store.document_signers[0].email).toBe('changed@example.com')
  })
})

describe('DELETE /api/documents/[id]/signers/[signerId] — concurrent-send race', () => {
  it('restores a deleted signer when send() lands between the gate and the write', async () => {
    afterInitialRead.fn = () => {
      h.store.documents[0] = { ...h.store.documents[0], status: 'sent' }
    }

    const res = await DELETE(new Request('http://x', { method: 'DELETE' }), params)
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/concurrently/i)
    expect(h.store.document_signers).toHaveLength(1)
    expect(h.store.document_signers[0].id).toBe(SIGNER_ID)
  })

  it('still deletes a signer when nothing raced (no regression)', async () => {
    const res = await DELETE(new Request('http://x', { method: 'DELETE' }), params)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(h.store.document_signers).toHaveLength(0)
  })
})
