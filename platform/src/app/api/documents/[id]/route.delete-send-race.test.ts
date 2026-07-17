import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * DELETE /api/documents/[id] read `documents.status` once, then — after the
 * isEditableStatus() check passed — removed storage objects and issued an
 * UNCONDITIONAL delete on the `documents` row (no WHERE on the prior
 * status). A concurrent send() (which claims the draft -> sent transition
 * atomically: `eq('status','draft')` in its own UPDATE) racing this delete
 * could win first — notifying real signers with a live signing link — and
 * this request's delete would still execute anyway: wiping the document row
 * and its original PDF out of storage, leaving signers with a dead link and
 * no record the document was ever sent. Fixed by making the delete itself
 * the atomic claim (`eq('status','draft')`) and reordering storage cleanup
 * to happen only *after* the claim succeeds, using the paths the delete
 * itself returns.
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

const doc: Record<string, unknown> = {
  id: 'doc-1',
  tenant_id: 'tenant-1',
  status: 'draft',
  original_path: 'tenants/tenant-1/docs/doc-1/original.pdf',
  signed_path: null,
}

// Simulates a concurrent send() completing in the gap between this route's
// initial status read and its delete: the read still returns the stale
// pre-race 'draft' snapshot (passing the cheap isEditableStatus check), but
// by the time the delete statement executes the document has already
// flipped to 'sent'.
let raceWithConcurrentSend = false
const removedPaths: string[][] = []

vi.mock('@/lib/supabase', () => {
  const from = (table: string) => {
    if (table !== 'documents') throw new Error(`unexpected table ${table}`)
    return {
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => {
              const snapshot = { status: doc.status }
              if (raceWithConcurrentSend) doc.status = 'sent'
              return { data: snapshot }
            },
          }),
        }),
      }),
      delete: () => {
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
              const result = { original_path: doc.original_path, signed_path: doc.signed_path }
              doc.deleted = true
              return { data: result, error: null }
            },
          }),
        }
        return chain
      },
    }
  }
  const storage = {
    from: () => ({
      remove: async (paths: string[]) => {
        removedPaths.push(paths)
        return { data: null, error: null }
      },
    }),
  }
  return { supabaseAdmin: { from, storage } }
})

import { DELETE } from './route'

function req() {
  return new Request('http://localhost/api/documents/doc-1', { method: 'DELETE' })
}
const params = { params: Promise.resolve({ id: 'doc-1' }) }

describe('DELETE /api/documents/[id] — race with a concurrent send()', () => {
  beforeEach(() => {
    doc.status = 'draft'
    doc.deleted = false
    raceWithConcurrentSend = false
    removedPaths.length = 0
  })

  it('deletes normally, including storage cleanup, when the document is still draft', async () => {
    const res = await DELETE(req(), params)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(doc.deleted).toBe(true)
    expect(removedPaths).toEqual([[doc.original_path]])
  })

  it('refuses to delete a document a concurrent send() flipped to sent mid-request, and never touches storage', async () => {
    raceWithConcurrentSend = true

    const res = await DELETE(req(), params)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/only drafts can be deleted/i)
    expect(doc.status).toBe('sent')
    expect(doc.deleted).toBe(false)
    expect(removedPaths).toEqual([])
  })
})
