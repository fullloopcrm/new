/**
 * autoReplyReviews (lib/google-reviews.ts) — check-then-act race.
 *
 * The old flow selected reviews with `reply IS NULL`, generated an AI reply
 * (real Anthropic call) and PUT it to Google's reply endpoint, and only THEN
 * wrote `reply` locally -- a classic check-then-act race, same bug class as
 * this session's other claim-before-send fixes. Two overlapping invocations
 * (a retried cron delivery, a manual re-trigger while a prior run is still
 * mid-flight) can both read the same unreplied review and both burn an AI
 * call + both PUT to Google -- which is a last-write-wins overwrite slot,
 * not an append, so the loser's PUT can land last and desync the local
 * `reply` column from what's actually live on Google.
 *
 * Fix: claim via a dedicated `reply_claimed_at` column (compare-and-swap,
 * WHERE reply_claimed_at IS NULL) BEFORE generating/posting. Reverted to
 * NULL on any failure so the review is retried on the next pass instead of
 * being silently stuck forever -- unlike this session's usual one-shot
 * *_sent_at markers, losing the retry here isn't an acceptable tradeoff.
 * See 2026_07_17_google_reviews_reply_claim.sql.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createFakeSupabase, type FakeSupabase } from '@/test/fake-supabase'

const h = vi.hoisted(() => ({ fake: null as FakeSupabase | null }))

vi.mock('@/lib/supabase', () => ({
  get supabaseAdmin() {
    return h.fake!
  },
}))

vi.mock('@/lib/google', () => ({
  getValidAccessToken: vi.fn(async (_tenantId: string) => 'fake-access-token'),
  getGoogleBusiness: vi.fn(async (_tenantId: string) => ({
    account_name: 'accounts/1',
    location_name: 'accounts/1/locations/1',
  })),
}))

const createMessage = vi.fn(async (_args: unknown) => ({ content: [{ type: 'text', text: 'Thanks so much for the kind words!' }] }))
vi.mock('@/lib/anthropic-client', () => ({
  anthropicFromStoredKey: vi.fn(() => ({ messages: { create: createMessage } })),
}))

const fetchMock = vi.fn(async (_url: string, _opts: unknown) => new Response(JSON.stringify({}), { status: 200 }))
vi.stubGlobal('fetch', fetchMock)

import { autoReplyReviews } from './google-reviews'

beforeEach(() => {
  createMessage.mockClear()
  fetchMock.mockClear()
  h.fake = createFakeSupabase({
    tenant_settings: [{ tenant_id: 'tenant-A', google_auto_reply: true }],
    google_reviews: [{
      id: 'review-1', tenant_id: 'tenant-A', google_review_id: 'g-review-1',
      reviewer_name: 'Jane Doe', rating: 5, comment: 'Loved it!',
      reply: null, reply_claimed_at: null, review_created_at: '2026-07-10T00:00:00.000Z',
    }],
  })
})

describe('concurrent autoReplyReviews invocations racing the same review', () => {
  it('generates and posts exactly one reply', async () => {
    const [first, second] = await Promise.all([
      autoReplyReviews('tenant-A'),
      autoReplyReviews('tenant-A'),
    ])

    expect(first + second).toBe(1)
    expect(createMessage).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(h.fake!._all('google_reviews')[0].reply).toBe('Thanks so much for the kind words!')
  })

  it('claims reply_claimed_at BEFORE calling the Anthropic API, not after', async () => {
    let claimedAtGenerateTime: unknown = 'not-yet-checked'
    createMessage.mockImplementationOnce(async () => {
      claimedAtGenerateTime = h.fake!._all('google_reviews')[0].reply_claimed_at
      return { content: [{ type: 'text', text: 'Thanks!' }] }
    })

    await autoReplyReviews('tenant-A')

    expect(claimedAtGenerateTime).not.toBeNull()
    expect(claimedAtGenerateTime).not.toBe('not-yet-checked')
  })

  it('releases the claim on Google post failure so the review is retried next pass', async () => {
    fetchMock.mockResolvedValueOnce(new Response('nope', { status: 500 }))

    const replied = await autoReplyReviews('tenant-A')
    expect(replied).toBe(0)
    expect(h.fake!._all('google_reviews')[0].reply_claimed_at).toBeNull()
    expect(h.fake!._all('google_reviews')[0].reply).toBeNull()

    // Next pass picks it back up.
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }))
    const repliedAgain = await autoReplyReviews('tenant-A')
    expect(repliedAgain).toBe(1)
    expect(h.fake!._all('google_reviews')[0].reply).toBe('Thanks so much for the kind words!')
  })

  it('releases the claim when reply generation returns empty text', async () => {
    createMessage.mockResolvedValueOnce({ content: [{ type: 'text', text: '' }] })

    const replied = await autoReplyReviews('tenant-A')
    expect(replied).toBe(0)
    expect(h.fake!._all('google_reviews')[0].reply_claimed_at).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
