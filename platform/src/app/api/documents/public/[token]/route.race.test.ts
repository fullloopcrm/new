import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/documents/public/[token] (the signer view payload) opportunistically
 * bumps signer + document status ('sent'->'viewed') as a side effect of a page
 * view. It used to write those transitions unconditionally after reading
 * status — a concurrent sign()/decline()/void() (all of which claim
 * atomically) landing in the gap got silently clobbered back to 'viewed' by
 * this GET. Fixed with a compare-and-swap on the status actually read,
 * mirroring the fix already applied to the sibling sign/decline routes and
 * the quotes/invoices public view routes.
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
  view_count: 0,
  first_viewed_at: null,
}
const doc: Record<string, unknown> = {
  id: 'doc-1',
  tenant_id: 'tenant-1',
  status: 'sent',
  sign_order: 'parallel',
  original_path: 'tenants/tenant-1/docs/doc-1/original.pdf',
  tenants: { status: 'active' },
}

// Simulates a concurrent sign() completing (signer -> 'signed', doc -> stays
// 'sent' until all sign, but exercise the signer-status race here) in the gap
// between this GET's read and its view-bump write.
let raceWithConcurrentSign = false

vi.mock('@/lib/supabase', () => {
  const from = (table: string) => {
    if (table === 'document_signers') {
      let reads = 0
      return {
        select: (_cols: string) => ({
          eq: (col: string) => ({
            maybeSingle: async () => {
              if (col === 'public_token') {
                reads += 1
                const snapshot = { ...signer }
                if (reads === 1 && raceWithConcurrentSign) signer.status = 'signed'
                return { data: snapshot }
              }
              throw new Error(`unexpected eq col ${col}`)
            },
          }),
          order: () => Promise.resolve({ data: [{ ...signer }] }),
        }),
        update: (payload: Record<string, unknown>) => {
          const eqs: Record<string, unknown> = {}
          const chain = {
            eq: (col: string, val: unknown) => {
              eqs[col] = val
              return chain
            },
            then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) => {
              if ('status' in eqs && eqs.status !== signer.status) {
                return Promise.resolve({ data: null, error: null }).then(resolve, reject)
              }
              Object.assign(signer, payload)
              return Promise.resolve({ data: null, error: null }).then(resolve, reject)
            },
          }
          return chain
        },
      }
    }
    if (table === 'documents') {
      return {
        select: (_cols: string) => ({
          eq: () => ({
            eq: () => ({
              single: async () => ({ data: { ...doc } }),
            }),
          }),
        }),
        update: (payload: Record<string, unknown>) => ({
          eq: (_col: string, _val: unknown) => ({
            eq: (_col2: string, _val2: unknown) => {
              Object.assign(doc, payload)
              return Promise.resolve({ data: null, error: null })
            },
          }),
        }),
        storage: undefined,
      }
    }
    if (table === 'document_fields') {
      return {
        select: (_cols: string) => ({
          eq: () => ({
            order: () => ({
              order: () => Promise.resolve({ data: [] }),
            }),
          }),
        }),
      }
    }
    throw new Error(`unexpected table ${table}`)
  }
  return {
    supabaseAdmin: {
      from,
      storage: { from: () => ({ createSignedUrl: async () => ({ data: { signedUrl: 'https://x/y' } }) }) },
    },
  }
})

import { GET } from './route'

function req() {
  return new Request('http://localhost/api/documents/public/tok-a')
}
const params = { params: Promise.resolve({ token: 'tok-a' }) }

describe('GET /api/documents/public/[token] — signer status race with a concurrent sign()', () => {
  beforeEach(() => {
    signer.status = 'sent'
    signer.view_count = 0
    signer.first_viewed_at = null
    doc.status = 'sent'
    raceWithConcurrentSign = false
  })

  it('does not clobber a signer status that turned "signed" underneath the request', async () => {
    raceWithConcurrentSign = true

    await GET(req(), params)

    expect(signer.status).toBe('signed')
  })

  it('still bumps sent -> viewed with no concurrent change (no regression)', async () => {
    await GET(req(), params)

    expect(signer.status).toBe('viewed')
  })
})
