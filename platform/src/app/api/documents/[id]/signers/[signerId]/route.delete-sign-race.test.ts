import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * DELETE /api/documents/[id]/signers/[signerId] gated on the *document's*
 * status via `requireDraft()` — a plain SELECT snapshot — then issued an
 * UNCONDITIONAL delete on `document_signers` with no WHERE on the signer's
 * own status. A concurrent sign() (which claims atomically:
 * `eq('id', signer.id).in('status', [...pending,sent,viewed]).update(...)`)
 * racing this delete could win first and flip the signer to 'signed', then
 * this request's unconditional delete would still execute — destroying the
 * just-recorded signature, IP, and timestamp with no recovery path. Fixed by
 * scoping the delete to `eq('status', 'pending')` on document_signers
 * itself: a single-table atomic claim that needs no cross-table read at all.
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

const doc: Record<string, unknown> = { id: 'doc-1', tenant_id: 'tenant-1', status: 'draft' }
const signer: Record<string, unknown> = {
  id: 'signer-1',
  document_id: 'doc-1',
  tenant_id: 'tenant-1',
  status: 'pending',
}

// Simulates a concurrent send()+sign() completing in the gap between this
// route's requireDraft() read and its delete: the read still returns the
// stale pre-race 'draft' snapshot (passing requireDraft's cheap check), but
// by the time the delete statement executes the signer has already been
// sent to and signed.
let raceWithConcurrentSign = false

vi.mock('@/lib/supabase', () => {
  const from = (table: string) => {
    if (table === 'documents') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: async () => {
                const snapshot = { ...doc }
                if (raceWithConcurrentSign) signer.status = 'signed'
                return { data: snapshot }
              },
            }),
          }),
        }),
      }
    }
    if (table === 'document_signers') {
      return {
        delete: () => {
          const eqs: Record<string, unknown> = {}
          const chain = {
            eq: (col: string, val: unknown) => {
              eqs[col] = val
              return chain
            },
            select: () => ({
              maybeSingle: async () => {
                const idMatches = signer.id === eqs.id
                const tenantMatches = signer.tenant_id === eqs.tenant_id
                const docMatches = signer.document_id === eqs.document_id
                const statusMatches = eqs.status === undefined || signer.status === eqs.status
                if (!idMatches || !tenantMatches || !docMatches || !statusMatches) {
                  return { data: null, error: null }
                }
                const deletedId = signer.id
                signer.deleted = true
                return { data: { id: deletedId }, error: null }
              },
            }),
          }
          return chain
        },
      }
    }
    throw new Error(`unexpected table ${table}`)
  }
  return { supabaseAdmin: { from } }
})

import { DELETE } from './route'

function req() {
  return new Request('http://localhost/api/documents/doc-1/signers/signer-1', { method: 'DELETE' })
}
const params = { params: Promise.resolve({ id: 'doc-1', signerId: 'signer-1' }) }

describe('DELETE /api/documents/[id]/signers/[signerId] — race with a concurrent sign()', () => {
  beforeEach(() => {
    doc.status = 'draft'
    signer.status = 'pending'
    signer.deleted = false
    raceWithConcurrentSign = false
  })

  it('deletes normally when the signer is still pending', async () => {
    const res = await DELETE(req(), params)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(signer.deleted).toBe(true)
  })

  it('refuses to delete a signer that a concurrent send()+sign() completed mid-request, even though the document-level precheck still saw draft', async () => {
    raceWithConcurrentSign = true

    const res = await DELETE(req(), params)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/already been notified, viewed, signed, or declined/i)
    expect(signer.status).toBe('signed')
    expect(signer.deleted).toBe(false)
  })
})
