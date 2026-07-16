import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * cron/cleanup-videos runs across ALL tenants with the service role (bypasses
 * RLS) and deletes from the shared `uploads` bucket by a path it regexes out
 * of whatever's stored in bookings.walkthrough_video_url / final_video_url.
 * Those columns are written by team-portal/video-upload's JSON-confirm flow,
 * which (before its own fix) trusted a caller-supplied url verbatim — so a
 * poisoned url pointing at a DIFFERENT tenant's storage path would, 30 days
 * later, cause this cron to delete a file it never should have touched. This
 * is the delete-side defense-in-depth: even if a bad path somehow lands in a
 * booking row (this validation gap, a future one, or a direct DB edit), the
 * cron must refuse to delete anything outside that booking's own tenant_id
 * folder.
 */

process.env.CRON_SECRET = 'test-cron-secret'

const OLD_TS = '2000-01-01T00:00:00.000Z' // always > 30 days old

const bookings = [
  {
    id: 'bk-own',
    tenant_id: 'tid-a',
    walkthrough_video_url: 'https://public.example/object/public/uploads/tid-a/job-videos/bk-own/w.mp4',
    final_video_url: null,
    walkthrough_video_url_uploaded_at: OLD_TS,
    final_video_url_uploaded_at: null,
    notes: null,
  },
  {
    id: 'bk-poisoned',
    tenant_id: 'tid-a',
    walkthrough_video_url: null,
    // Poisoned: path points at a DIFFERENT tenant's folder.
    final_video_url: 'https://public.example/object/public/uploads/tid-VICTIM/job-videos/bk-victim/real.mp4',
    walkthrough_video_url_uploaded_at: null,
    final_video_url_uploaded_at: OLD_TS,
    notes: null,
  },
]

const removedPaths: string[] = []

function bookingsTable() {
  const builder = {
    select: () => builder,
    not: () => builder,
    then: (resolve: (v: unknown) => void) => resolve({ data: bookings.map((b) => ({ ...b })) }),
    update: (patch: Record<string, unknown>) => {
      const updateBuilder = {
        eq: (_col: string, id: string) => {
          const match = bookings.find((b) => b.id === id)
          if (match) Object.assign(match, patch)
          return Promise.resolve({ error: null })
        },
      }
      return updateBuilder
    },
  }
  return builder
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'bookings') return bookingsTable()
      throw new Error(`unexpected table: ${table}`)
    },
    storage: {
      from: (bucket: string) => ({
        remove: async (paths: string[]) => {
          if (bucket === 'uploads') removedPaths.push(...paths)
          return { error: null }
        },
      }),
    },
  },
}))

import { GET } from './route'

function req() {
  return new Request('http://t/api/cron/cleanup-videos', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

beforeEach(() => {
  removedPaths.length = 0
  bookings[0].walkthrough_video_url = 'https://public.example/object/public/uploads/tid-a/job-videos/bk-own/w.mp4'
  bookings[0].walkthrough_video_url_uploaded_at = OLD_TS
  bookings[1].final_video_url = 'https://public.example/object/public/uploads/tid-VICTIM/job-videos/bk-victim/real.mp4'
  bookings[1].final_video_url_uploaded_at = OLD_TS
})

describe('cron/cleanup-videos — tenant-scoped storage deletion', () => {
  it('positive control: deletes a stale video that lives under the booking\'s OWN tenant folder', async () => {
    await GET(req())
    expect(removedPaths).toContain('tid-a/job-videos/bk-own/w.mp4')
  })

  it('cross-tenant path probe: does NOT call storage.remove for a path outside the booking\'s own tenant folder', async () => {
    await GET(req())
    expect(removedPaths.some((p) => p.startsWith('tid-VICTIM/'))).toBe(false)
  })

  it('still clears the DB reference for a poisoned cross-tenant url even though the storage delete is refused', async () => {
    await GET(req())
    expect(bookings[1].final_video_url).toBeNull()
  })
})
