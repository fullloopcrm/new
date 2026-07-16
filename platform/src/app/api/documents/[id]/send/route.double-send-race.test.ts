import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * POST /api/documents/[id]/send used to check `isEditableStatus(doc.status)`
 * against a plain SELECT snapshot, then — after downloading + hashing the
 * PDF — flip `documents.status` to 'sent' with an UNCONDITIONAL update (no
 * WHERE on the prior status). Two near-simultaneous calls (double-click on
 * "Send", a client retry) both read 'draft' before either write landed, both
 * fell through the check, and both notified every signer: a duplicate
 * signature-request email/SMS per signer, and a duplicate 'sent' timeline
 * event. Fixed by claiming the draft -> sent transition atomically
 * (`eq('status','draft')` in the WHERE clause) — only the request that wins
 * the claim gets to notify signers; the loser gets a clean 409.
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

const { sendEmail, sendSMS } = vi.hoisted(() => ({
  sendEmail: vi.fn(async () => ({ ok: true })),
  sendSMS: vi.fn(async () => ({ ok: true })),
}))
vi.mock('@/lib/email', () => ({ sendEmail }))
vi.mock('@/lib/sms', () => ({ sendSMS }))
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: (v: string) => v }))

const doc: Record<string, unknown> = {
  id: 'doc-1',
  tenant_id: 'tenant-1',
  status: 'draft',
  title: 'NDA',
  message: null,
  sign_order: 'parallel',
  original_path: 'tenants/tenant-1/docs/doc-1/original.pdf',
}
const signers = [
  { id: 'signer-1', document_id: 'doc-1', order_index: 0, status: 'pending', email: 'a@example.com', phone: null, name: 'Alice', public_token: 'tok-a' },
]

let sentEventCount = 0

vi.mock('@/lib/supabase', () => {
  const from = (table: string) => {
    if (table === 'documents') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: async () => ({ data: { ...doc } }),
            }),
          }),
        }),
        update: (payload: Record<string, unknown>) => {
          const eqs: Record<string, unknown> = {}
          const chain = {
            eq: (col: string, val: unknown) => {
              eqs[col] = val
              return chain
            },
            select: () => ({
              maybeSingle: async () => {
                const matches = doc.id === eqs.id
                  && doc.tenant_id === eqs.tenant_id
                  && (eqs.status === undefined || doc.status === eqs.status)
                if (!matches) return { data: null, error: null }
                Object.assign(doc, payload)
                return { data: { id: doc.id }, error: null }
              },
            }),
          }
          return chain
        },
      }
    }
    if (table === 'document_signers') {
      return {
        select: () => ({
          eq: () => ({
            order: async () => ({ data: signers.map((s) => ({ ...s })) }),
          }),
        }),
        update: () => ({
          eq: async () => ({ data: null, error: null }),
        }),
      }
    }
    if (table === 'document_fields') {
      return {
        select: () => ({
          eq: () => ({ count: 1, head: true }),
        }),
      }
    }
    if (table === 'document_activity') {
      return {
        insert: async (row: Record<string, unknown>) => {
          if (row.event_type === 'sent') sentEventCount++
          return { data: null, error: null }
        },
      }
    }
    if (table === 'tenants') {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { name: 'Acme', domain: null, telnyx_api_key: null, telnyx_phone: null, resend_api_key: 'encrypted-key', email_from: 'docs@acme.com' } }),
          }),
        }),
      }
    }
    throw new Error(`unexpected table ${table}`)
  }
  const storage = {
    from: () => ({
      download: async () => ({ data: { arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }, error: null }),
    }),
  }
  return { supabaseAdmin: { from, storage } }
})

import { POST } from './route'

function req() {
  return new Request('http://localhost/api/documents/doc-1/send', { method: 'POST' })
}
const params = { params: Promise.resolve({ id: 'doc-1' }) }

describe('POST /api/documents/[id]/send — double-send race', () => {
  beforeEach(() => {
    doc.status = 'draft'
    signers[0].status = 'pending'
    sentEventCount = 0
    sendEmail.mockClear()
    sendSMS.mockClear()
  })

  it('sends and flips document status to sent', async () => {
    const res = await POST(req(), params)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(doc.status).toBe('sent')
    expect(sendEmail).toHaveBeenCalledTimes(1)
  })

  it('rejects a second, fully-sequential send once the document is already sent', async () => {
    // Not a race — the first call completes entirely (status is 'sent' in the
    // store) before the second call even starts, so the pre-existing
    // isEditableStatus() snapshot check catches it before the atomic claim
    // is ever reached. Confirms the claim doesn't regress this ordinary path.
    const res1 = await POST(req(), params)
    expect(res1.status).toBe(200)
    const res2 = await POST(req(), params)
    const json2 = await res2.json()
    expect(res2.status).toBe(400)
    expect(json2.error).toMatch(/already sent/i)
    expect(sendEmail).toHaveBeenCalledTimes(1)
  })

  it('does not double-notify signers when two sends race for the same document', async () => {
    const [r1, r2] = await Promise.all([POST(req(), params), POST(req(), params)])
    const statuses = [r1.status, r2.status].sort()
    expect(statuses).toEqual([200, 409])
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(sentEventCount).toBe(1)
  })
})
