import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({ requirePermission: vi.fn() }))
vi.mock('@/lib/require-permission', () => ({ requirePermission: h.requirePermission }))

const dbHoisted = vi.hoisted(() => ({
  result: { data: null as unknown, error: null as unknown },
  lastTable: '' as string,
  lastRoleFilter: null as string[] | null,
}))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      dbHoisted.lastTable = table
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              in: (_col: string, roles: string[]) => {
                dbHoisted.lastRoleFilter = roles
                return { order: () => Promise.resolve(dbHoisted.result) }
              },
            }),
          }),
        }),
      }
    },
  },
}))

import { GET } from './route'

describe('GET /api/boards/team-mentions', () => {
  beforeEach(() => {
    h.requirePermission.mockReset()
    dbHoisted.result = { data: null, error: null }
    dbHoisted.lastTable = ''
    dbHoisted.lastRoleFilter = null
  })

  it('is gated on boards.view, not sales.view', async () => {
    h.requirePermission.mockResolvedValue({ tenant: null, error: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }) })

    const res = await GET()

    expect(res.status).toBe(403)
    expect(h.requirePermission).toHaveBeenCalledWith('boards.view')
  })

  it('queries dashboard users (tenant_members), not the cleaner roster (team_members)', async () => {
    h.requirePermission.mockResolvedValue({ tenant: { tenantId: 'tenant-A' }, error: null })
    dbHoisted.result = { data: [{ id: 'user-1', name: 'Jane' }], error: null }

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual([{ id: 'user-1', name: 'Jane' }])
    expect(dbHoisted.lastTable).toBe('tenant_members')
  })

  it('restricts assignees to exactly owner/admin/virtual_assistant -- no manager, no staff, no cleaners', async () => {
    h.requirePermission.mockResolvedValue({ tenant: { tenantId: 'tenant-A' }, error: null })
    dbHoisted.result = { data: [], error: null }

    await GET()

    expect(dbHoisted.lastRoleFilter).toEqual(['owner', 'admin', 'virtual_assistant'])
  })

  it('returns an empty array rather than null when the roster is empty', async () => {
    h.requirePermission.mockResolvedValue({ tenant: { tenantId: 'tenant-A' }, error: null })
    dbHoisted.result = { data: null, error: null }

    const res = await GET()
    const json = await res.json()

    expect(json).toEqual([])
  })
})
