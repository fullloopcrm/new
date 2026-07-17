import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * cron/backup previously logged its nightly summary by inserting into
 * `notifications` with tenant_id: tenants[0].id — an arbitrary tenant that
 * has nothing to do with the run, picked only because it happened to sort
 * first. The inserted message can contain OTHER tenants' slugs and error
 * text (`errors.join(', ')`), and had no recipient_type set, so
 * sidebar-counts' unread badge (which has no recipient_type filter, unlike
 * the notification-bell endpoint) would count it against that unrelated
 * tenant forever — nothing in the mark-read path ever touches it.
 *
 * Fixed to use alertOwner() (Telegram), the same platform-wide-alert
 * convention every sibling cron job already uses, instead of writing into
 * any tenant's own notifications table.
 */
process.env.CRON_SECRET = 'test-secret'

let uploadCalls: string[] = []

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({})
  return {
    supabaseAdmin: {
      ...fake,
      storage: {
        from: () => ({
          upload: async (path: string) => {
            uploadCalls.push(path)
            // Fail only tenant-B's upload, to prove tenant-B's own error
            // text ends up leaking into tenant-A's notifications row pre-fix.
            if (path.includes('bbb-co')) return { error: { message: 'boom: disk quota' } }
            return { error: null }
          },
        }),
      },
    },
    __fake: fake,
  }
})

vi.mock('@/lib/telegram', () => ({ alertOwner: vi.fn(async () => ({ ok: true, status: 200, body: '' })) }))

import { supabaseAdmin } from '@/lib/supabase'
import { alertOwner } from '@/lib/telegram'
import { GET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const req = () => new Request('http://x', { headers: { authorization: 'Bearer test-secret' } })

describe('GET /api/cron/backup — platform summary must not leak into a tenant notifications row', () => {
  beforeEach(() => {
    fake._store.clear()
    uploadCalls = []
    vi.mocked(alertOwner).mockClear()
    // Seeded in this order so tenants[0] (the old code's target) is
    // tenant-A — an innocent tenant uninvolved in tenant-B's failure.
    fake._seed('tenants', [
      { id: 'tenant-A', name: 'AAA Co', slug: 'aaa-co', status: 'active' },
      { id: 'tenant-B', name: 'BBB Co', slug: 'bbb-co', status: 'active' },
    ])
  })

  it('does not write the backup summary into any tenant notifications row', async () => {
    const res = await GET(req())
    const body = await res.json()

    expect(body.backed_up).toBe(1)
    expect(body.errors).toBe(1)

    const notifications = fake._all('notifications')
    expect(notifications).toHaveLength(0)
  })

  it('alerts the platform owner directly (not a tenant) with the failing tenant detail', async () => {
    await GET(req())

    expect(alertOwner).toHaveBeenCalledTimes(1)
    const [subject, detail] = vi.mocked(alertOwner).mock.calls[0]
    expect(subject).toContain('1 tenant')
    expect(detail).toContain('bbb-co')
    expect(detail).toContain('boom: disk quota')
  })
})
