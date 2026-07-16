/**
 * POST & PUT /api/documents/[id]/fields — TOCTOU race with a concurrent
 * send(), one layer deeper than the documents/[id] PATCH+DELETE fix
 * (2e9dc801): the pre-write check reads `documents.status`, but the write
 * itself lands on `document_fields`, which carries no status column of its
 * own — so the usual "re-assert in the WHERE" CAS can't close the race
 * atomically. send() flipping draft->sent in the gap between the
 * isEditableStatus check and this route's insert/replace used to let a
 * field get added to (or replaced on) an already-sent, hash-locked,
 * invitations-already-out document with no signer any the wiser.
 *
 * FIX: verifyStillDraft() re-checks `documents.status` immediately after the
 * write; if send() won the race, roll back (delete the inserted field, or
 * restore the pre-replace field set) and return 409.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
}))

/** Set by a test to inject a concurrent send() right after this route's own
 *  initial `documents.status` gate-read resolves -- the exact TOCTOU gap
 *  verifyStillDraft's post-write recheck is meant to catch. */
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

import { POST, PUT } from './route'

const TENANT_ID = 'tenant-A'
const DOC_ID = 'doc-1'
const SIGNER_ID = 'sig-1'

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })
const validField = { signer_id: SIGNER_ID, type: 'text', page: 1, x_pct: 10, y_pct: 10, w_pct: 20, h_pct: 5 }

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_ID }, error: null }))
  afterInitialRead.fn = null
  h.store = {
    documents: [{ id: DOC_ID, tenant_id: TENANT_ID, status: 'draft' }],
    document_signers: [{ id: SIGNER_ID, tenant_id: TENANT_ID, document_id: DOC_ID }],
    document_fields: [],
  }
})

describe('POST /api/documents/[id]/fields — concurrent-send race', () => {
  it('rolls back an added field when send() lands between the gate and the write', async () => {
    afterInitialRead.fn = () => {
      h.store.documents[0] = { ...h.store.documents[0], status: 'sent' }
    }

    const res = await POST(postReq(validField), params(DOC_ID))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/concurrently/i)
    expect(h.store.document_fields).toHaveLength(0)
  })

  it('still adds a field when nothing raced (no regression)', async () => {
    const res = await POST(postReq(validField), params(DOC_ID))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.field.signer_id).toBe(SIGNER_ID)
    expect(h.store.document_fields).toHaveLength(1)
  })
})

describe('PUT /api/documents/[id]/fields — concurrent-send race', () => {
  it('restores the pre-replace fields when send() lands mid-replace', async () => {
    h.store.document_fields = [{ id: 'f-old', tenant_id: TENANT_ID, document_id: DOC_ID, signer_id: SIGNER_ID, type: 'text', page: 1, x_pct: 1, y_pct: 1, w_pct: 1, h_pct: 1, required: true, label: null }]
    afterInitialRead.fn = () => {
      h.store.documents[0] = { ...h.store.documents[0], status: 'sent' }
    }

    const res = await PUT(putReq({ fields: [validField] }), params(DOC_ID))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/concurrently/i)
    expect(h.store.document_fields).toHaveLength(1)
    expect(h.store.document_fields[0].id).toBe('f-old')
  })

  it('still replaces fields when nothing raced (no regression)', async () => {
    h.store.document_fields = [{ id: 'f-old', tenant_id: TENANT_ID, document_id: DOC_ID, signer_id: SIGNER_ID, type: 'text', page: 1, x_pct: 1, y_pct: 1, w_pct: 1, h_pct: 1, required: true, label: null }]

    const res = await PUT(putReq({ fields: [validField] }), params(DOC_ID))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.count).toBe(1)
    expect(h.store.document_fields).toHaveLength(1)
    expect(h.store.document_fields[0].id).not.toBe('f-old')
  })
})
