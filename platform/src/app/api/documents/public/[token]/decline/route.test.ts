/**
 * POST /api/documents/public/[token]/decline — TOCTOU (sibling of the
 * quotes accept/decline routes' same class fixed elsewhere this session).
 * Plain check-then-branch on signer.status, then an unconditional UPDATE
 * with no compare-and-swap. Two concurrent declines both pass the checks
 * and both write + both log a declined event -- duplicating the audit
 * trail on a legally significant document.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))

vi.mock('@/lib/supabase', () => {
  const fake = makeSupabaseFake(h, { detachReads: true })
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/documents', () => ({ logDocEvent: vi.fn(async () => {}) }))

import { POST } from './route'
import { logDocEvent } from '@/lib/documents'

const TOKEN = 'tok-signer-1'
const declineReq = (body: unknown = {}) =>
  new Request(`http://acme.example.com/api/documents/public/${TOKEN}/decline`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9', 'user-agent': 'vitest' },
    body: JSON.stringify(body),
  })
const params = { params: Promise.resolve({ token: TOKEN }) }

beforeEach(() => {
  vi.mocked(logDocEvent).mockClear()
  h.seq = 0
  h.store = {
    document_signers: [{ id: 'sig-1', document_id: 'doc-1', tenant_id: 'tenant-A', public_token: TOKEN, status: 'sent' }],
    documents: [{ id: 'doc-1', tenant_id: 'tenant-A', status: 'sent' }],
  }
})

describe('POST /api/documents/public/[token]/decline', () => {
  it('declines on the first call', async () => {
    const res = await POST(declineReq({ reason: 'changed my mind' }), params)
    expect(res.status).toBe(200)
    expect(h.store.document_signers[0].status).toBe('declined')
    expect(h.store.documents[0].status).toBe('declined')
    expect(logDocEvent).toHaveBeenCalledTimes(1)
  })

  it('replaying an already-declined signer is idempotent — no duplicate audit event', async () => {
    await POST(declineReq(), params)
    const res2 = await POST(declineReq(), params)

    expect(res2.status).toBe(200)
    await expect(res2.json()).resolves.toMatchObject({ ok: true, already_declined: true })
    expect(logDocEvent).toHaveBeenCalledTimes(1)
  })

  it('a double-tapped Decline button (2 concurrent requests) only claims once', async () => {
    const [res1, res2] = await Promise.all([POST(declineReq(), params), POST(declineReq(), params)])
    const bodies = await Promise.all([res1.json(), res2.json()])

    const winners = bodies.filter((b) => !b.already_declined)
    const losers = bodies.filter((b) => b.already_declined)
    expect(winners).toHaveLength(1)
    expect(losers).toHaveLength(1)
    expect(logDocEvent).toHaveBeenCalledTimes(1)
  })

  it('rejects declining an already-signed signer', async () => {
    h.store.document_signers[0].status = 'signed'
    const res = await POST(declineReq(), params)
    expect(res.status).toBe(400)
  })
})
