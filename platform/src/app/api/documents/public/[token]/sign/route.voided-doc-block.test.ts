import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/documents/public/[token]/sign never checked the parent
 * `documents.status` — only the individual signer's own status
 * (signed/declined) and sequential ordering via canSignerAct. The sibling
 * consent and decline routes both explicitly block on
 * ['voided','completed','expired','declined'] before acting; sign() had no
 * equivalent guard. Concretely: an admin voids a document (e.g. pricing
 * error, fraud, customer withdrawal) while a signer who already has the
 * emailed link hasn't signed yet (still 'sent'/'viewed') — that signer could
 * still POST to this route and successfully complete a legally-binding
 * signature (writing signature_png, flipping status to 'signed', and
 * potentially re-opening the document to 'in_progress') on a document the
 * business explicitly voided. Fixed by adding the same terminal-status guard
 * used in consent/decline, read from the same `doc` row already fetched
 * here.
 */

vi.mock('@/lib/documents', async () => {
  const actual = await vi.importActual<typeof import('@/lib/documents')>('@/lib/documents')
  return { ...actual, logDocEvent: vi.fn(async () => {}) }
})

const signerA: Record<string, unknown> = {
  id: 'signer-a',
  document_id: 'doc-1',
  public_token: 'tok-a',
  order_index: 0,
  status: 'sent',
  consent_accepted_at: '2026-01-01T00:00:00.000Z',
}
const signerB: Record<string, unknown> = {
  id: 'signer-b',
  document_id: 'doc-1',
  public_token: 'tok-b',
  order_index: 1,
  status: 'pending',
}
const doc: Record<string, unknown> = {
  id: 'doc-1',
  tenant_id: 'tenant-1',
  status: 'sent',
  sign_order: 'parallel',
  original_path: 'tenants/tenant-1/docs/doc-1/original.pdf',
  original_sha256: null,
  consent_text: 'I agree',
}

vi.mock('@/lib/supabase', () => {
  const from = (table: string) => {
    if (table === 'document_signers') {
      return {
        select: (_cols: string) => ({
          eq: (col: string, val: unknown) => {
            if (col === 'public_token') {
              return {
                maybeSingle: async () => ({
                  data: val === signerA.public_token ? { ...signerA } : null,
                }),
              }
            }
            if (col === 'document_id') {
              return {
                order: () => ({
                  then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
                    Promise.resolve({ data: [{ ...signerA }, { ...signerB }] }).then(resolve, reject),
                }),
              }
            }
            throw new Error(`unexpected eq col ${col}`)
          },
        }),
        update: (payload: Record<string, unknown>) => {
          const eqs: Record<string, unknown> = {}
          let statusIn: string[] | null = null
          const exec = () => {
            const idMatches = signerA.id === eqs.id
            const statusMatches = !statusIn || statusIn.includes(signerA.status as string)
            if (!idMatches || !statusMatches) return { data: null, error: null }
            Object.assign(signerA, payload)
            return { data: { id: signerA.id }, error: null }
          }
          const chain: Record<string, unknown> = {
            eq: (col: string, val: unknown) => {
              eqs[col] = val
              return chain
            },
            in: (col: string, vals: string[]) => {
              if (col === 'status') statusIn = vals
              return chain
            },
            select: () => ({ maybeSingle: async () => exec() }),
            then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
              Promise.resolve(exec()).then(resolve, reject),
          }
          return chain
        },
      }
    }
    if (table === 'documents') {
      return {
        select: (_cols: string) => ({
          eq: () => ({
            single: async () => ({ data: { ...doc } }),
            maybeSingle: async () => ({ data: { ...doc } }),
          }),
        }),
        update: (payload: Record<string, unknown>) => ({
          eq: (_col: string, _val: unknown) => {
            Object.assign(doc, payload)
            return Promise.resolve({ data: null, error: null })
          },
        }),
      }
    }
    if (table === 'document_fields') {
      return {
        select: (_cols: string) => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                is: () => Promise.resolve({ data: [] }),
              }),
            }),
          }),
        }),
      }
    }
    if (table === 'document_activity') {
      return { insert: async () => ({ data: null, error: null }) }
    }
    throw new Error(`unexpected table ${table}`)
  }
  return { supabaseAdmin: { from } }
})

import { POST } from './route'

function signReq() {
  return new Request('http://localhost/api/documents/public/tok-a/sign', {
    method: 'POST',
    body: JSON.stringify({
      signature_png: `data:image/png;base64,${'A'.repeat(120)}`,
      signature_name: 'Jane Signer',
      field_values: [],
    }),
  })
}
const params = { params: Promise.resolve({ token: 'tok-a' }) }

describe('POST /api/documents/public/[token]/sign — blocks terminal-status documents', () => {
  beforeEach(() => {
    signerA.status = 'sent'
    signerB.status = 'pending'
    doc.status = 'sent'
  })

  it.each(['voided', 'completed', 'expired', 'declined'])(
    'refuses to sign when the parent document is %s',
    async (status) => {
      doc.status = status

      const res = await POST(signReq(), params)
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error).toMatch(new RegExp(status, 'i'))
      expect(signerA.status).toBe('sent')
    },
  )

  it('still signs normally when the document is not in a terminal state (no regression)', async () => {
    const res = await POST(signReq(), params)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(signerA.status).toBe('signed')
  })
})
