import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * team-portal/video-upload/route.ts fires its admin notification with
 * `type: 'check_in'` on both the signed-URL (JSON) and legacy (formdata)
 * upload flows — but `notify.ts`'s own `NotificationType` union has
 * declared a dedicated `'video_uploaded'` type since this codebase's
 * beginning, and 3 tenant `AdminSidebar.tsx` components (nyc-mobile-salon,
 * wash-and-fold-hoboken, wash-and-fold-nyc) plus the global
 * `/dashboard/notifications` page already carry real UI treatment for it
 * (🎥 "Video Uploaded" icon/title, violet color) — while `check_in` in
 * those same sidebars renders as "▶️ Job Started". Every video-upload
 * notification has therefore been landing in the admin feed mislabeled as
 * a job-start event instead of using the dedicated type built for it.
 * Proves the fix on the signed-URL (JSON) flow, the primary path per the
 * route's own comment ("JSON body = signed URL flow"). The legacy formdata
 * flow got the byte-identical one-line fix (same `type:` literal, same
 * `notify()` call shape) but isn't separately exercised here — constructing
 * a real multipart body with a binary file part hits an unrelated
 * undici/jsdom webidl incompatibility in this test environment, independent
 * of this route.
 */

vi.hoisted(() => {
  process.env.TEAM_PORTAL_SECRET = 'test-team-portal-secret'
})

const holder = vi.hoisted(() => ({
  notifyCalls: [] as Array<Record<string, unknown>>,
}))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return {
    supabaseAdmin: {
      ...fake,
      storage: {
        from: () => ({
          createSignedUploadUrl: async (path: string) => ({ data: { signedUrl: `https://x/${path}`, token: 'sig-token' }, error: null }),
          getPublicUrl: (path: string) => ({ data: { publicUrl: `https://public/${path}` } }),
          upload: async () => ({ error: null }),
        }),
      },
    },
  }
})
vi.mock('@/lib/notify', () => ({
  notify: vi.fn(async (args: Record<string, unknown>) => {
    holder.notifyCalls.push(args)
    return { success: true }
  }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { createToken } from '../auth/token'
import { POST } from './route'

const A_ID = 'tenant-A'
const A_BOOKING = 'bk-a'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  holder.notifyCalls.length = 0
  fake._seed('bookings', [
    { id: A_BOOKING, tenant_id: A_ID, team_member_id: 'tm-a', start_time: '2026-08-01T10:00:00.000Z', service_type: 'Deep Clean', clients: { name: 'A Client' }, team_members: { name: 'A Worker' }, walkthrough_video_url: null, final_video_url: null },
  ])
})

describe('team-portal/video-upload POST — notification type', () => {
  it('the signed-URL (JSON) flow fires notify() with type video_uploaded, not check_in', async () => {
    const token = createToken('tm-a', A_ID)
    const req = new Request('http://x', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ booking_id: A_BOOKING, type: 'final', url: 'https://public/uploaded.mp4' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    expect(holder.notifyCalls.length).toBe(1)
    expect(holder.notifyCalls[0].type).toBe('video_uploaded')
  })
})
