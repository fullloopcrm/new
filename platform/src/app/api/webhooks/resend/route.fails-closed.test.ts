import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createHmac } from 'node:crypto'

/**
 * /api/webhooks/resend has verifySvix wired up (fail-closed unless
 * RESEND_WEBHOOK_VERIFY='off'), but the only existing test
 * (route.inbound-tenant-scope-guard.test.ts) mocks verifySvix to always
 * return valid — it never proves the route rejects a forged/missing/stale
 * signature in situ. This closes that gap using the real crypto, same
 * pattern as clerk/route.fails-closed.test.ts (both ride verifySvix).
 */

const supabaseFrom = vi.fn((..._args: unknown[]) => ({
  insert: () => Promise.resolve({ data: null, error: null }),
  select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
  update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
}))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => supabaseFrom(...args) },
}))

function signSvix(secretBase64: string, id: string, timestamp: string, body: string): string {
  const secret = Buffer.from(secretBase64, 'base64')
  const sig = createHmac('sha256', secret).update(`${id}.${timestamp}.${body}`).digest('base64')
  return `v1,${sig}`
}

function req(opts: { body: string; id?: string | null; timestamp?: string | null; signature?: string | null }): Request {
  return {
    text: async () => opts.body,
    headers: {
      get: (name: string) => {
        const key = name.toLowerCase()
        if (key === 'svix-id') return opts.id ?? 'msg_01'
        if (key === 'svix-timestamp') return opts.timestamp ?? Math.floor(Date.now() / 1000).toString()
        if (key === 'svix-signature') return opts.signature ?? null
        return null
      },
    },
  } as unknown as Request
}

describe('resend webhook — fails closed on missing/invalid signature', () => {
  const secretRaw = Buffer.from('resend-unit-test-secret-bytes').toString('base64')
  const secret = `whsec_${secretRaw}`
  const body = JSON.stringify({ type: 'email.received', data: { email_id: 'em_1', to: 'inbox@example.com', from: 'attacker@evil.com' } })

  beforeEach(() => {
    vi.resetModules()
    supabaseFrom.mockClear()
    process.env.RESEND_WEBHOOK_SECRET = secret
    delete process.env.RESEND_WEBHOOK_VERIFY
    delete process.env.INBOUND_EMAILS_TENANT_SCOPE_ENABLED
  })

  it('rejects a missing svix-signature header (fail-closed)', async () => {
    const { POST } = await import('./route')
    const res = await POST(req({ body, signature: null }))

    expect(res.status).toBe(401)
    expect(supabaseFrom).not.toHaveBeenCalled()
  })

  it('rejects a forged signature — never inserts the inbound email', async () => {
    const { POST } = await import('./route')
    const res = await POST(req({ body, signature: 'v1,not-a-real-signature' }))

    expect(res.status).toBe(401)
    expect(supabaseFrom).not.toHaveBeenCalled()
  })

  it('rejects a stale timestamp even with an otherwise-valid signature', async () => {
    const staleTs = (Math.floor(Date.now() / 1000) - 10 * 60).toString()
    const sig = signSvix(secretRaw, 'msg_01', staleTs, body)

    const { POST } = await import('./route')
    const res = await POST(req({ body, id: 'msg_01', timestamp: staleTs, signature: sig }))

    expect(res.status).toBe(401)
    expect(supabaseFrom).not.toHaveBeenCalled()
  })

  it('accepts a genuinely valid signature and processes the event', async () => {
    const ts = Math.floor(Date.now() / 1000).toString()
    const sig = signSvix(secretRaw, 'msg_01', ts, body)

    const { POST } = await import('./route')
    const res = await POST(req({ body, id: 'msg_01', timestamp: ts, signature: sig }))

    expect(res.status).toBe(200)
    expect(supabaseFrom).toHaveBeenCalledWith('inbound_emails')
  })

  it('RESEND_WEBHOOK_VERIFY=off bypasses verification (explicit local-dev escape hatch)', async () => {
    process.env.RESEND_WEBHOOK_VERIFY = 'off'
    const { POST } = await import('./route')
    const res = await POST(req({ body, signature: null }))

    expect(res.status).toBe(200)
  })
})
