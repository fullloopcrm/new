import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/documents/public/[token]/sign accepted `field_values` straight
 * from the request body with no cap on array length or per-value string
 * length, and had no rate limit at all — the token is unguessable (192-bit),
 * but a holder of one valid link could still turn a single request into
 * thousands of document_fields UPDATE round-trips, or bloat a field's stored
 * value, on the most expensive route in the documents surface (it runs a
 * full PDF finalize on the last signer's request). Verifies both the cap and
 * the new per-token rate limit.
 */

vi.mock('@/lib/documents', async () => {
  const actual = await vi.importActual<typeof import('@/lib/documents')>('@/lib/documents')
  return { ...actual, logDocEvent: vi.fn(async () => {}) }
})

const signer: Record<string, unknown> = {
  id: 'signer-a',
  document_id: 'doc-1',
  public_token: 'tok-a',
  order_index: 0,
  status: 'sent',
  consent_accepted_at: '2026-01-01T00:00:00.000Z',
}
// A second, still-pending signer so allDone stays false and the (unmocked)
// PDF finalize path never runs — this test is only about the field_values cap.
const otherSigner: Record<string, unknown> = {
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

const fieldUpdateCalls: Array<{ id: unknown; value: unknown }> = []
let rateLimitAllowed = true

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async () => ({ allowed: rateLimitAllowed, remaining: rateLimitAllowed ? 1 : 0 }),
}))

vi.mock('@/lib/supabase', () => {
  const from = (table: string) => {
    if (table === 'document_signers') {
      return {
        select: (_cols: string) => ({
          eq: (col: string, val: unknown) => {
            if (col === 'public_token') {
              return { maybeSingle: async () => ({ data: val === signer.public_token ? { ...signer } : null }) }
            }
            if (col === 'document_id') {
              return {
                order: () => ({
                  then: (resolve: (v: unknown) => void) =>
                    Promise.resolve({ data: [{ ...signer }, { ...otherSigner }] }).then(resolve),
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
            const idMatches = signer.id === eqs.id
            const statusMatches = !statusIn || statusIn.includes(signer.status as string)
            if (!idMatches || !statusMatches) return { data: null, error: null }
            Object.assign(signer, payload)
            return { data: { id: signer.id }, error: null }
          }
          const chain: Record<string, unknown> = {
            eq: (col: string, val: unknown) => { eqs[col] = val; return chain },
            in: (col: string, vals: string[]) => { if (col === 'status') statusIn = vals; return chain },
            select: () => ({ maybeSingle: async () => exec() }),
            then: (resolve: (v: unknown) => void) => Promise.resolve(exec()).then(resolve),
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
          eq: (_col: string, _val: unknown) => { Object.assign(doc, payload); return Promise.resolve({ data: null, error: null }) },
        }),
      }
    }
    if (table === 'document_fields') {
      return {
        select: (_cols: string) => ({
          eq: () => ({ eq: () => ({ eq: () => ({ is: () => Promise.resolve({ data: [] }) }) }) }),
        }),
        update: (payload: { value?: unknown }) => ({
          eq: (col: string, val: unknown) => {
            if (col === 'id') fieldUpdateCalls.push({ id: val, value: payload.value })
            return { eq: () => Promise.resolve({ data: null, error: null }) }
          },
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

function signReq(fieldValues: Array<{ field_id: string; value: string }>) {
  return new Request('http://localhost/api/documents/public/tok-a/sign', {
    method: 'POST',
    body: JSON.stringify({
      signature_png: `data:image/png;base64,${'A'.repeat(120)}`,
      signature_name: 'Jane Signer',
      field_values: fieldValues,
    }),
  })
}
const params = { params: Promise.resolve({ token: 'tok-a' }) }

describe('POST /api/documents/public/[token]/sign — field_values cap + rate limit', () => {
  beforeEach(() => {
    signer.status = 'sent'
    doc.status = 'sent'
    fieldUpdateCalls.length = 0
    rateLimitAllowed = true
  })

  it('caps an oversized field_values array at 200 entries before writing', async () => {
    const oversized = Array.from({ length: 5000 }, (_, i) => ({ field_id: `f-${i}`, value: 'x' }))
    const res = await POST(signReq(oversized), params)
    expect(res.status).toBe(200)
    expect(fieldUpdateCalls.length).toBeLessThanOrEqual(200)
  })

  it('caps an oversized field value at 2000 chars before writing', async () => {
    const res = await POST(signReq([{ field_id: 'f-1', value: 'A'.repeat(50000) }]), params)
    expect(res.status).toBe(200)
    expect((fieldUpdateCalls[0].value as string).length).toBeLessThanOrEqual(2000)
  })

  it('returns 429 when the per-token rate limit denies', async () => {
    rateLimitAllowed = false
    const res = await POST(signReq([]), params)
    expect(res.status).toBe(429)
  })
})
