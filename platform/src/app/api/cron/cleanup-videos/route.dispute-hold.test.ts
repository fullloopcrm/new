/**
 * GET /api/cron/cleanup-videos — dispute-hold protection.
 *
 * The 30-day auto-delete's only escape hatch was a `[DISPUTE]` substring in
 * `bookings.notes`. That's the same free-text field PUT /api/bookings/[id]
 * lets any admin overwrite wholesale for any unrelated reason (fixing a
 * typo, adding a scheduling note) — silently erasing the marker and letting
 * the next cron pass permanently delete payment-dispute video evidence with
 * no way to recover it. Same fragile-marker-in-notes shape already fixed
 * this session for [THANKYOU_SENT] (post-job-followup/follow-up), except
 * there the failure mode was a duplicate send; here it's unrecoverable data
 * loss.
 *
 * Fix: a dedicated `video_dispute_hold` boolean column, set via its own
 * toggle — never touched by the notes textarea. The legacy notes marker is
 * still honored for backward compatibility with already-flagged bookings.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createFakeSupabase, type FakeSupabase } from '@/test/fake-supabase'

const h = vi.hoisted(() => ({
  fake: null as FakeSupabase | null,
  removedPaths: [] as string[],
}))

vi.mock('@/lib/supabase', () => ({
  get supabaseAdmin() {
    return {
      ...h.fake!,
      storage: {
        from: () => ({
          remove: async (paths: string[]) => {
            h.removedPaths.push(...paths)
            return { data: null, error: null }
          },
        }),
      },
    }
  },
}))

import { GET } from './route'

function req(): Request {
  return new Request('http://localhost/api/cron/cleanup-videos', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

const realTZ = process.env.TZ
const NOW = new Date('2026-07-17T12:00:00.000Z')
const OLD_UPLOAD = new Date(NOW.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString() // 45 days ago
const RECENT_UPLOAD = new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days ago

beforeEach(() => {
  process.env.TZ = 'UTC'
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  process.env.CRON_SECRET = 'test-cron-secret'
  h.removedPaths = []
  h.fake = createFakeSupabase({ bookings: [] })
})

afterEach(() => {
  if (realTZ === undefined) delete process.env.TZ
  else process.env.TZ = realTZ
  vi.useRealTimers()
})

describe('GET /api/cron/cleanup-videos — video_dispute_hold protection', () => {
  it('deletes an old video with no hold and no legacy marker (baseline)', async () => {
    h.fake!._seed('bookings', [{
      id: 'b1', tenant_id: 'tenant-A', notes: null, video_dispute_hold: false,
      walkthrough_video_url: 'https://x.supabase.co/storage/v1/object/public/uploads/tenant-A/b1/walk.mp4',
      walkthrough_video_url_uploaded_at: OLD_UPLOAD,
      final_video_url: null, final_video_url_uploaded_at: null,
    }])

    const res = await GET(req())
    const json = await res.json()

    expect(json.deleted).toBe(1)
    expect(h.removedPaths).toEqual(['tenant-A/b1/walk.mp4'])
    expect(h.fake!._all('bookings')[0].walkthrough_video_url).toBeNull()
  })

  it('does NOT delete when video_dispute_hold is true, even with no notes marker (regression)', async () => {
    h.fake!._seed('bookings', [{
      id: 'b2', tenant_id: 'tenant-A', notes: 'unrelated scheduling note', video_dispute_hold: true,
      walkthrough_video_url: 'https://x.supabase.co/storage/v1/object/public/uploads/tenant-A/b2/walk.mp4',
      walkthrough_video_url_uploaded_at: OLD_UPLOAD,
      final_video_url: null, final_video_url_uploaded_at: null,
    }])

    const res = await GET(req())
    const json = await res.json()

    expect(json.deleted).toBe(0)
    expect(h.removedPaths).toEqual([])
    expect(h.fake!._all('bookings')[0].walkthrough_video_url).not.toBeNull()
  })

  it('an unrelated notes edit after the dispute hold is placed does not lift the hold (the bug this fix closes)', async () => {
    // Simulates: admin places the hold via the toggle (video_dispute_hold: true),
    // then later edits notes for something unrelated via PUT /api/bookings/[id].
    // The old mechanism kept the flag INSIDE notes, so this edit would have
    // silently erased it. The column is untouched by that edit.
    h.fake!._seed('bookings', [{
      id: 'b3', tenant_id: 'tenant-A', notes: 'called client back, rescheduled walkthrough', video_dispute_hold: true,
      walkthrough_video_url: 'https://x.supabase.co/storage/v1/object/public/uploads/tenant-A/b3/walk.mp4',
      walkthrough_video_url_uploaded_at: OLD_UPLOAD,
      final_video_url: null, final_video_url_uploaded_at: null,
    }])

    const res = await GET(req())
    const json = await res.json()

    expect(json.deleted).toBe(0)
    expect(h.fake!._all('bookings')[0].walkthrough_video_url).not.toBeNull()
  })

  it('still honors the legacy [DISPUTE] notes marker for backward compatibility', async () => {
    h.fake!._seed('bookings', [{
      id: 'b4', tenant_id: 'tenant-A', notes: 'client says price was wrong [DISPUTE]', video_dispute_hold: false,
      walkthrough_video_url: 'https://x.supabase.co/storage/v1/object/public/uploads/tenant-A/b4/walk.mp4',
      walkthrough_video_url_uploaded_at: OLD_UPLOAD,
      final_video_url: null, final_video_url_uploaded_at: null,
    }])

    const res = await GET(req())
    const json = await res.json()

    expect(json.deleted).toBe(0)
    expect(h.fake!._all('bookings')[0].walkthrough_video_url).not.toBeNull()
  })

  it('leaves a recently-uploaded video alone regardless of hold state', async () => {
    h.fake!._seed('bookings', [{
      id: 'b5', tenant_id: 'tenant-A', notes: null, video_dispute_hold: false,
      walkthrough_video_url: 'https://x.supabase.co/storage/v1/object/public/uploads/tenant-A/b5/walk.mp4',
      walkthrough_video_url_uploaded_at: RECENT_UPLOAD,
      final_video_url: null, final_video_url_uploaded_at: null,
    }])

    const res = await GET(req())
    const json = await res.json()

    expect(json.deleted).toBe(0)
    expect(h.fake!._all('bookings')[0].walkthrough_video_url).not.toBeNull()
  })
})
