import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createHmac } from 'node:crypto'

/**
 * /api/webhooks/clerk had verifySvix wired up (fail-closed unless
 * CLERK_WEBHOOK_VERIFY='off') but no test proving it actually rejects
 * forged/missing/stale signatures before touching tenant_members. This
 * mirrors the route-level fail-closed tests already in place for
 * stripe-platform (route.fails-closed.test.ts) and telnyx-voice
 * (route.signature-verification.test.ts).
 */

const supabaseFrom = vi.fn((..._args: unknown[]) => ({
  select: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
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

describe('clerk webhook — fails closed on missing/invalid signature', () => {
  const secretRaw = Buffer.from('clerk-unit-test-secret-bytes').toString('base64')
  const secret = `whsec_${secretRaw}`
  const body = JSON.stringify({ type: 'user.deleted', data: { id: 'user_attacker_controlled' } })

  beforeEach(() => {
    vi.resetModules()
    supabaseFrom.mockClear()
    process.env.CLERK_WEBHOOK_SECRET = secret
    delete process.env.CLERK_WEBHOOK_VERIFY
  })

  it('rejects a missing svix-signature header (fail-closed)', async () => {
    const { POST } = await import('./route')
    const res = await POST(req({ body, signature: null }))

    expect(res.status).toBe(401)
    expect(supabaseFrom).not.toHaveBeenCalled()
  })

  it('rejects a forged signature — never reaches tenant_members', async () => {
    const { POST } = await import('./route')
    const res = await POST(req({ body, signature: 'v1,not-a-real-signature' }))

    expect(res.status).toBe(401)
    expect(supabaseFrom).not.toHaveBeenCalled()
  })

  it('rejects a signature computed over a different body (tampered payload)', async () => {
    const ts = Math.floor(Date.now() / 1000).toString()
    const signedForOtherBody = signSvix(secretRaw, 'msg_01', ts, JSON.stringify({ type: 'user.created', data: { id: 'u1' } }))

    const { POST } = await import('./route')
    const res = await POST(req({ body, id: 'msg_01', timestamp: ts, signature: signedForOtherBody }))

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
    expect(supabaseFrom).toHaveBeenCalledWith('tenant_members')
  })

  it('CLERK_WEBHOOK_VERIFY=off bypasses verification (explicit local-dev escape hatch)', async () => {
    process.env.CLERK_WEBHOOK_VERIFY = 'off'
    const { POST } = await import('./route')
    const res = await POST(req({ body, signature: null }))

    expect(res.status).toBe(200)
  })
})
