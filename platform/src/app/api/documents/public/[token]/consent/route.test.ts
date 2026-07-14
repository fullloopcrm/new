/**
 * POST /api/documents/public/[token]/consent — TOCTOU (sibling of the
 * quotes accept/decline routes' same class fixed elsewhere this session).
 * Plain check-then-branch on signer.consent_accepted_at, then an
 * unconditional UPDATE with no compare-and-swap. Two concurrent consent
 * submissions (double-tapped Accept button) both pass the check and both
 * write + both log a consent_accepted event -- duplicating the ESIGN Act
 * audit trail on a legally significant document.
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
const consentReq = () =>
  new Request(`http://acme.example.com/api/documents/public/${TOKEN}/consent`, {
    method: 'POST',
    headers: { 'x-forwarded-for': '203.0.113.9', 'user-agent': 'vitest' },
  })
const params = { params: Promise.resolve({ token: TOKEN }) }

beforeEach(() => {
  vi.mocked(logDocEvent).mockClear()
  h.seq = 0
  h.store = {
    document_signers: [{ id: 'sig-1', document_id: 'doc-1', tenant_id: 'tenant-A', public_token: TOKEN, consent_accepted_at: null }],
    documents: [{ id: 'doc-1', tenant_id: 'tenant-A', status: 'sent' }],
  }
})

describe('POST /api/documents/public/[token]/consent', () => {
  it('accepts consent on the first call', async () => {
    const res = await POST(consentReq(), params)
    expect(res.status).toBe(200)
    expect(h.store.document_signers[0].consent_accepted_at).toBeTruthy()
    expect(logDocEvent).toHaveBeenCalledTimes(1)
  })

  it('replaying an already-accepted consent is idempotent — no duplicate audit event', async () => {
    await POST(consentReq(), params)
    const res2 = await POST(consentReq(), params)

    expect(res2.status).toBe(200)
    await expect(res2.json()).resolves.toMatchObject({ ok: true, already_accepted: true })
    expect(logDocEvent).toHaveBeenCalledTimes(1)
  })

  it('a double-tapped consent (2 concurrent requests) only claims once', async () => {
    const [res1, res2] = await Promise.all([POST(consentReq(), params), POST(consentReq(), params)])
    const bodies = await Promise.all([res1.json(), res2.json()])

    const winners = bodies.filter((b) => !b.already_accepted)
    const losers = bodies.filter((b) => b.already_accepted)
    expect(winners).toHaveLength(1)
    expect(losers).toHaveLength(1)
    expect(logDocEvent).toHaveBeenCalledTimes(1)
  })
})
