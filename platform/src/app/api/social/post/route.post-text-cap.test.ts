import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * WITNESS — POST /api/social/post forwarded `message`/`caption` straight to
 * Meta's Graph API and, via lib/social.ts's `social_posts.content` insert,
 * into a DB text column with no type check or length cap — same class as
 * the invoices/void-reason and accounting_periods.notes gaps (capString,
 * src/lib/validate.ts). `photoUrl`/`imageUrl` were equally uncapped.
 *
 * FIXED: capString(..., 5000) on message/caption, capString(..., 2000) on
 * photoUrl/imageUrl, applied before either downstream call.
 */

const A = 'tid-a'

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: A, tenant: { id: A }, role: 'owner' })),
  }
})

const spies = vi.hoisted(() => ({
  postToFacebook: vi.fn(async (_tenantId: string, _message: string, _photoUrl?: string) => ({ success: true, postId: 'fb-1' })),
  postToInstagram: vi.fn(async (_tenantId: string, _caption: string, _imageUrl: string) => ({ success: true, postId: 'ig-1' })),
}))
vi.mock('@/lib/social', () => ({
  postToFacebook: spies.postToFacebook,
  postToInstagram: spies.postToInstagram,
}))

import { POST } from './route'

beforeEach(() => {
  spies.postToFacebook.mockClear()
  spies.postToInstagram.mockClear()
})

function post(body: Record<string, unknown>) {
  return POST(new Request('http://t/api/social/post', { method: 'POST', body: JSON.stringify(body) }))
}

describe('social/post POST — free-text/URL cap', () => {
  it('LOCK: an oversized Facebook message is truncated to 5000 chars before posting', async () => {
    const oversized = 'x'.repeat(6000)
    const res = await post({ platform: 'facebook', message: oversized })
    expect(res.status).toBe(200)
    const [, sentMessage] = spies.postToFacebook.mock.calls[0]
    expect(sentMessage).toHaveLength(5000)
    expect(sentMessage).toBe(oversized.slice(0, 5000))
  })

  it('LOCK: an oversized photoUrl is truncated to 2000 chars before posting', async () => {
    const oversizedUrl = 'http://x.example/' + 'y'.repeat(2000)
    const res = await post({ platform: 'facebook', message: 'hi', photoUrl: oversizedUrl })
    expect(res.status).toBe(200)
    const [, , sentPhotoUrl] = spies.postToFacebook.mock.calls[0]
    expect(sentPhotoUrl).toHaveLength(2000)
  })

  it('LOCK: an oversized Instagram caption is truncated to 5000 chars before posting', async () => {
    const oversized = 'z'.repeat(6000)
    const res = await post({ platform: 'instagram', caption: oversized, imageUrl: 'http://img' })
    expect(res.status).toBe(200)
    const [, sentCaption] = spies.postToInstagram.mock.calls[0]
    expect(sentCaption).toHaveLength(5000)
  })

  it("SAFETY: a non-string message (object) is rejected as if missing, not forwarded raw", async () => {
    const res = await post({ platform: 'facebook', message: { evil: 'payload' } })
    expect(res.status).toBe(400)
    expect(spies.postToFacebook).not.toHaveBeenCalled()
  })

  it('CONTROL: a normal-length message/caption passes through untouched', async () => {
    const res = await post({ platform: 'facebook', message: 'Hello world', photoUrl: 'http://img.example/a.jpg' })
    expect(res.status).toBe(200)
    expect(spies.postToFacebook).toHaveBeenCalledWith(A, 'Hello world', 'http://img.example/a.jpg')
  })
})
