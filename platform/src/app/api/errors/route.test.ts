import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * /api/errors — client-side error ingest. Existed unwired (nothing called it)
 * until public/err.js + ClientErrorMonitor were added to send it real
 * browser errors. This locks in: rate limiting, the transient-noise filter,
 * tenant-sig verification (a caller can't self-attribute errors to a tenant
 * without a valid signed header), and that a real error reaches trackError.
 */

type TrackErrorCtx = { source: string; tenantId?: string; severity?: string; url?: string }

const { trackErrorMock, rateLimitMock } = vi.hoisted(() => ({
  trackErrorMock: vi.fn(async (_error: unknown, _ctx: TrackErrorCtx) => {}),
  rateLimitMock: vi.fn(async (_bucketKey: string, _max: number, _windowMs: number) => ({ allowed: true, remaining: 10 })),
}))
vi.mock('@/lib/error-tracking', () => ({ trackError: trackErrorMock }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: rateLimitMock }))

vi.mock('@/lib/tenant-header-sig', () => ({
  verifyTenantHeaderSig: (tenantId: string, sig: string | null | undefined) => sig === `valid-sig-for-${tenantId}`,
}))

import { POST } from './route'

function req(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://t/api/errors', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  trackErrorMock.mockClear()
  rateLimitMock.mockClear()
  rateLimitMock.mockResolvedValue({ allowed: true, remaining: 10 })
})

describe('POST /api/errors', () => {
  it('rejects a report with no message', async () => {
    const res = await POST(req({ stack: 'x' }))
    expect(res.status).toBe(400)
    expect(trackErrorMock).not.toHaveBeenCalled()
  })

  it('429s once the per-IP rate limit is exhausted', async () => {
    rateLimitMock.mockResolvedValueOnce({ allowed: false, remaining: 0 })
    const res = await POST(req({ message: 'boom' }))
    expect(res.status).toBe(429)
    expect(trackErrorMock).not.toHaveBeenCalled()
  })

  it('swallows a known-transient error without alerting', async () => {
    const res = await POST(req({ message: 'ChunkLoadError: failed to load chunk 4' }))
    expect(res.status).toBe(200)
    expect(trackErrorMock).not.toHaveBeenCalled()
  })

  it('logs a real error at high severity with no tenant when the sig is missing', async () => {
    const res = await POST(req({ message: 'TypeError: cannot read x of undefined', url: 'https://thenycmaid.com/book' }))
    expect(res.status).toBe(200)
    expect(trackErrorMock).toHaveBeenCalledTimes(1)
    const [, ctx] = trackErrorMock.mock.calls[0]
    expect(ctx).toMatchObject({ source: 'client', severity: 'high', tenantId: undefined, url: 'https://thenycmaid.com/book' })
  })

  it('attributes to the tenant only when x-tenant-sig verifies against x-tenant-id', async () => {
    const res = await POST(req(
      { message: 'TypeError: real bug', source: 'client/js-error' },
      { 'x-tenant-id': 'tenant-a', 'x-tenant-sig': 'valid-sig-for-tenant-a' },
    ))
    expect(res.status).toBe(200)
    const [, ctx] = trackErrorMock.mock.calls[0]
    expect(ctx).toMatchObject({ tenantId: 'tenant-a', source: 'client/js-error' })
  })

  it('does NOT trust a caller-supplied tenant id with a forged/wrong signature', async () => {
    const res = await POST(req(
      { message: 'TypeError: real bug' },
      { 'x-tenant-id': 'tenant-a', 'x-tenant-sig': 'wrong-sig' },
    ))
    expect(res.status).toBe(200)
    const [, ctx] = trackErrorMock.mock.calls[0]
    expect(ctx.tenantId).toBeUndefined()
  })
})
