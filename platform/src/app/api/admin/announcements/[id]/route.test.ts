import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextResponse } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * PUT /api/admin/announcements/:id — mass-assignment regression.
 *
 * The route spread the raw request body straight into `.update(body)` with
 * no WHERE beyond `.eq('id', id)`. Since `platform_announcements` has no
 * tenant scoping (it's a platform-global table), the only guard was the
 * column set itself — a caller could set `id`, `created_at`, or any other
 * internal column via the body. Now allow-listed to the same field set the
 * POST (create) route accepts.
 */

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requireAdmin: vi.fn(),
})) as unknown as FakeStoreHandle & {
  requireAdmin: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-admin', () => ({ requireAdmin: (...a: unknown[]) => h.requireAdmin(...a) }))

import { PUT } from './route'

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })

beforeEach(() => {
  h.seq = 0
  h.requireAdmin.mockReset()
  h.requireAdmin.mockResolvedValue(null)
  h.store = {
    platform_announcements: [
      { id: 'ann-1', title: 'Old title', body: 'Old body', type: 'info', target: 'all', target_value: null, priority: 'normal', published: false },
    ],
  }
})

describe('PUT /api/admin/announcements/:id — permission gate', () => {
  it('returns the admin-gate error unchanged', async () => {
    h.requireAdmin.mockResolvedValueOnce(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))

    const res = await PUT(putReq({ title: 'New' }), params('ann-1'))

    expect(res.status).toBe(403)
    expect(h.store.platform_announcements[0].title).toBe('Old title')
  })
})

describe('PUT /api/admin/announcements/:id — allow-listed fields', () => {
  it('updates ordinary fields (title/body/published) on the target row', async () => {
    const res = await PUT(putReq({ title: 'New title', published: true }), params('ann-1'))

    expect(res.status).toBe(200)
    expect(h.store.platform_announcements[0].title).toBe('New title')
    expect(h.store.platform_announcements[0].published).toBe(true)
    expect(h.store.platform_announcements[0].body).toBe('Old body')
  })

  it('ignores an id in the body instead of overwriting the row identity', async () => {
    const res = await PUT(putReq({ title: 'New title', id: 'ann-2' }), params('ann-1'))

    expect(res.status).toBe(200)
    expect(h.store.platform_announcements[0].id).toBe('ann-1')
    expect(h.store.platform_announcements.find((a) => a.id === 'ann-2')).toBeUndefined()
  })

  it('ignores a created_at in the body instead of forging the row timestamp', async () => {
    const res = await PUT(putReq({ title: 'New title', created_at: '1999-01-01T00:00:00.000Z' }), params('ann-1'))

    expect(res.status).toBe(200)
    expect(h.store.platform_announcements[0].created_at).toBeUndefined()
  })

  it('ignores an unrecognized field in the body', async () => {
    const res = await PUT(putReq({ title: 'New title', made_up_field: 'evil' }), params('ann-1'))

    expect(res.status).toBe(200)
    expect(h.store.platform_announcements[0].made_up_field).toBeUndefined()
  })
})
