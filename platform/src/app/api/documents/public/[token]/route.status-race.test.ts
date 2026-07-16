/**
 * GET /api/documents/public/[token] — view-tracking TOCTOU (sibling of the
 * void/decline/sign status-cascade fixes elsewhere in this lane).
 *
 * The route reads signer.status and doc.status once, then used to
 * unconditionally write status='viewed' on both document_signers and
 * documents with no re-check in the write's own WHERE. A concurrent
 * decline/sign-completion (document_signers) or void/finalize (documents)
 * landing between those reads and this route's own writes used to get
 * silently reverted back to 'viewed' by a signer just reloading the page.
 *
 * FIX: only flip 'sent' -> 'viewed' with `.eq('status', 'sent')` re-asserted
 * in the write's own WHERE. view_count/last_viewed_at/first_viewed_at stay
 * unconditional — they're informational, not a status cascade.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))

const createSignedUrl = vi.hoisted(() => vi.fn(async () => ({ data: { signedUrl: 'https://x/signed.pdf' }, error: null })))

/** Set by a test to inject a concurrent write right after the route's own
 *  `doc` SELECT resolves -- the exact TOCTOU gap this fix closes. */
const afterDocRead = vi.hoisted(() => ({ fn: null as (() => void) | null }))

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
            afterDocRead.fn?.()
            afterDocRead.fn = null
          }
          return res
        })
      return chain
    },
    storage: { from: () => ({ createSignedUrl }) },
  }
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/documents', async () => {
  const actual = await vi.importActual<typeof import('@/lib/documents')>('@/lib/documents')
  return { ...actual, logDocEvent: vi.fn(async () => {}) }
})

import { GET } from './route'

const TENANT_ID = 'tenant-A'
const DOC_ID = 'doc-1'
const SIGNER_ID = 'sig-1'
const TOKEN = 'tok-signer-1'

const params = { params: Promise.resolve({ token: TOKEN }) }
const viewReq = () => new Request(`http://acme.example.com/api/documents/public/${TOKEN}`)

beforeEach(() => {
  h.seq = 0
  afterDocRead.fn = null
  createSignedUrl.mockClear()
  h.store = {
    document_signers: [
      { id: SIGNER_ID, document_id: DOC_ID, tenant_id: TENANT_ID, public_token: TOKEN, status: 'sent', order_index: 1, view_count: 0, first_viewed_at: null },
    ],
    documents: [
      // 'tenants.status' is a flattened literal key -- the fake has no real
      // join support, so it matches the route's `.eq('tenants.status', 'active')`
      // join-filter against this key directly rather than a nested object.
      { id: DOC_ID, tenant_id: TENANT_ID, status: 'sent', original_path: 'orig.pdf', sign_order: 'parallel', 'tenants.status': 'active', tenants: { name: 'Acme', domain: 'acme.example.com', phone: null, email: null, logo_url: null, primary_color: null, status: 'active' } },
    ],
    tenants: [{ id: TENANT_ID, name: 'Acme', domain: 'acme.example.com', phone: null, email: null, logo_url: null, primary_color: null, status: 'active' }],
    document_fields: [],
  }
})

describe('GET /api/documents/public/[token] — concurrent status-change race', () => {
  it('does not revert a document that was voided concurrently back to viewed', async () => {
    afterDocRead.fn = () => {
      h.store.documents[0] = { ...h.store.documents[0], status: 'voided' }
    }

    const res = await GET(viewReq(), params)
    expect(res.status).toBe(200)
    expect(h.store.documents[0].status).toBe('voided')
  })

  it('does not revert a signer who completed signing concurrently back to viewed', async () => {
    afterDocRead.fn = () => {
      h.store.document_signers[0] = { ...h.store.document_signers[0], status: 'signed' }
    }

    const res = await GET(viewReq(), params)
    expect(res.status).toBe(200)
    expect(h.store.document_signers[0].status).toBe('signed')
  })

  it('still flips sent -> viewed on both rows when nothing raced (no regression)', async () => {
    const res = await GET(viewReq(), params)
    expect(res.status).toBe(200)
    expect(h.store.documents[0].status).toBe('viewed')
    expect(h.store.document_signers[0].status).toBe('viewed')
  })

  it('still records view_count/last_viewed_at/first_viewed_at even when the status race is lost', async () => {
    afterDocRead.fn = () => {
      h.store.document_signers[0] = { ...h.store.document_signers[0], status: 'signed' }
    }

    await GET(viewReq(), params)
    expect(h.store.document_signers[0].view_count).toBe(1)
    expect(h.store.document_signers[0].first_viewed_at).toBeTruthy()
  })
})
