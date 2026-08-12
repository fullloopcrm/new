import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({ requirePermission: vi.fn() }))
vi.mock('@/lib/require-permission', () => ({ requirePermission: h.requirePermission }))

const dbHoisted = vi.hoisted(() => ({ result: { data: null as unknown, error: null as unknown } }))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => Promise.resolve(dbHoisted.result),
          }),
        }),
      }),
    }),
  },
}))

import { GET } from './route'

describe('GET /api/boards/team-mentions', () => {
  beforeEach(() => {
    h.requirePermission.mockReset()
    dbHoisted.result = { data: null, error: null }
  })

  it('is gated on boards.view, not sales.view', async () => {
    h.requirePermission.mockResolvedValue({ tenant: null, error: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }) })

    const res = await GET()

    expect(res.status).toBe(403)
    expect(h.requirePermission).toHaveBeenCalledWith('boards.view')
  })

  it('returns the active team roster for the caller\'s tenant', async () => {
    h.requirePermission.mockResolvedValue({ tenant: { tenantId: 'tenant-A' }, error: null })
    dbHoisted.result = { data: [{ id: 'tm-1', name: 'Jane' }], error: null }

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual([{ id: 'tm-1', name: 'Jane' }])
  })

  it('returns an empty array rather than null when the roster is empty', async () => {
    h.requirePermission.mockResolvedValue({ tenant: { tenantId: 'tenant-A' }, error: null })
    dbHoisted.result = { data: null, error: null }

    const res = await GET()
    const json = await res.json()

    expect(json).toEqual([])
  })
})
