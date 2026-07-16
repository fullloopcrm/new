/**
 * POST /api/documents/[id]/signers — TOCTOU race with a concurrent send(),
 * the sibling gap to ./fields/route.status-race.test.ts. send() flipping
 * draft->sent between the isEditableStatus check and this insert used to
 * let a signer get added to an already-sent document who never receives an
 * invite -- finalizeDocument's every(s.status==='signed') check can then
 * never pass, stranding the document in 'in_progress' forever.
 *
 * FIX: verifyStillDraft() re-checks `documents.status` immediately after the
 * insert; if send() won the race, delete the inserted signer and return 409.
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

import { POST } from './route'

const TENANT_ID = 'tenant-A'
const DOC_ID = 'doc-1'

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_ID }, error: null }))
  afterInitialRead.fn = null
  h.store = {
    documents: [{ id: DOC_ID, tenant_id: TENANT_ID, status: 'draft' }],
    document_signers: [],
  }
})

describe('POST /api/documents/[id]/signers — concurrent-send race', () => {
  it('rolls back an added signer when send() lands between the gate and the write', async () => {
    afterInitialRead.fn = () => {
      h.store.documents[0] = { ...h.store.documents[0], status: 'sent' }
    }

    const res = await POST(postReq({ name: 'Late Signer' }), params(DOC_ID))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/concurrently/i)
    expect(h.store.document_signers).toHaveLength(0)
  })

  it('still adds a signer when nothing raced (no regression)', async () => {
    const res = await POST(postReq({ name: 'On-time Signer' }), params(DOC_ID))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.signer.name).toBe('On-time Signer')
    expect(h.store.document_signers).toHaveLength(1)
  })
})
