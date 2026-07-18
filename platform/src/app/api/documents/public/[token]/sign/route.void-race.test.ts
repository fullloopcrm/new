import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/documents/public/[token]/sign reads the parent document's
 * status once, several awaited round-trips before the atomic signer claim
 * (field-value writes, the required-fields completeness check). A void()
 * landing in that gap — an admin voiding mid-flight while a signer's request
 * is already in progress — used to still get silently signed over: the
 * precondition check earlier in the function only guards the read at that
 * point in time. Fixed by re-verifying the document's status immediately
 * after the atomic claim and rolling the signature back if it went terminal
 * underneath the request, mirroring the sequential-order rollback already in
 * this same function.
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

// Simulates a concurrent void() completing in the gap between sign()'s
// initial precondition read (still sees 'sent', passes) and its post-claim
// re-check: the flip happens right after the initial read resolves.
let raceWithConcurrentVoid = false

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
      let reads = 0
      return {
        select: (_cols: string) => ({
          eq: () => ({
            single: async () => {
              reads += 1
              const snapshot = { ...doc }
              // First read is sign()'s precondition check. The race fires its
              // side effect right after, so this read still sees 'sent'.
              if (reads === 1 && raceWithConcurrentVoid) doc.status = 'voided'
              return { data: snapshot }
            },
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

describe('POST /api/documents/public/[token]/sign — void() race after the precondition check', () => {
  beforeEach(() => {
    signerA.status = 'sent'
    signerB.status = 'pending'
    doc.status = 'sent'
    raceWithConcurrentVoid = false
  })

  it('rolls back a signature claimed just as a concurrent void() lands, instead of leaving it signed', async () => {
    raceWithConcurrentVoid = true

    const res = await POST(signReq(), params)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/voided/i)
    expect(signerA.status).toBe('sent')
    expect(signerA.signature_png).toBeNull()
  })

  it('still signs normally with no concurrent void (no regression)', async () => {
    const res = await POST(signReq(), params)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(signerA.status).toBe('signed')
  })
})
