/**
 * POST /api/documents/[id]/duplicate — storage copy failure used to be
 * silently swallowed: original_path still got pointed at newPath even
 * though nothing was actually downloaded/uploaded there. The route
 * returned 200 with a document object as if the duplicate fully
 * succeeded; the break only surfaced later as a confusing 500 from
 * POST /api/documents/[id]/send ("Unable to read original PDF").
 *
 * FIX: check both the download and upload results. On failure, roll
 * back the just-created draft row (no signers/fields exist yet at that
 * point, so deleting the row alone is a clean rollback) and return 500.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
}))

type StorageResult = { data: unknown; error: { message: string } | null }
const storageDownload = vi.hoisted(() => vi.fn<() => Promise<StorageResult>>())
const storageUpload = vi.hoisted(() =>
  vi.fn<() => Promise<StorageResult>>(async () => ({ data: {}, error: null }))
)

vi.mock('@/lib/supabase', () => {
  const raw = makeSupabaseFake(h, { detachReads: true })
  const fake = {
    from: (table: string) => raw.from(table),
    storage: { from: () => ({ download: storageDownload, upload: storageUpload }) },
  }
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({ requirePermission: (...a: unknown[]) => h.requirePermission(...a) }))
vi.mock('@/lib/documents', async () => {
  const actual = await vi.importActual<typeof import('@/lib/documents')>('@/lib/documents')
  return { ...actual, logDocEvent: vi.fn(async () => {}) }
})

import { POST } from './route'

const TENANT_ID = 'tenant-A'
const DOC_ID = 'doc-1'

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const req = () => new Request('http://x', { method: 'POST' })

const srcDoc = {
  id: DOC_ID,
  tenant_id: TENANT_ID,
  title: 'Original',
  message: null,
  sign_order: 'parallel',
  consent_text: null,
  page_count: 1,
  status: 'draft',
  original_path: 'tenants/tenant-A/docs/doc-1/original.pdf',
}

beforeEach(() => {
  h.seq = 0
  h.store = { documents: [{ ...srcDoc }], document_signers: [], document_fields: [] }
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_ID }, error: null }))
  storageDownload.mockReset()
  storageUpload.mockClear()
})

describe('POST /api/documents/[id]/duplicate — storage copy failure', () => {
  it('rolls back and 500s when the source PDF fails to download, instead of shipping a broken draft', async () => {
    storageDownload.mockResolvedValue({ data: null, error: { message: 'not found' } })

    const res = await POST(req(), params(DOC_ID))
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toMatch(/copy original pdf/i)
    // Only the original source doc remains -- the partial draft was rolled back.
    expect(h.store.documents).toHaveLength(1)
    expect(h.store.documents[0].id).toBe(DOC_ID)
    expect(storageUpload).not.toHaveBeenCalled()
  })

  it('rolls back and 500s when the upload of the copied PDF fails', async () => {
    storageDownload.mockResolvedValue({
      data: { arrayBuffer: async () => new ArrayBuffer(4) },
      error: null,
    })
    storageUpload.mockResolvedValueOnce({ data: null, error: { message: 'storage write failed' } })

    const res = await POST(req(), params(DOC_ID))
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toMatch(/store duplicated pdf/i)
    expect(h.store.documents).toHaveLength(1)
    expect(h.store.documents[0].id).toBe(DOC_ID)
  })

  it('still duplicates normally when the copy succeeds (no regression)', async () => {
    storageDownload.mockResolvedValue({
      data: { arrayBuffer: async () => new ArrayBuffer(4) },
      error: null,
    })

    const res = await POST(req(), params(DOC_ID))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.document.title).toBe('Original (copy)')
    expect(h.store.documents).toHaveLength(2)
    const newDoc = h.store.documents.find(d => d.id !== DOC_ID)
    expect(newDoc?.original_path).toContain(String(newDoc?.id))
  })
})
