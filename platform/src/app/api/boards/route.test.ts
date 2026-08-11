import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeDb } from './test-mock-db'

const h = vi.hoisted(() => ({ requirePermission: vi.fn() }))
vi.mock('@/lib/require-permission', () => ({ requirePermission: h.requirePermission }))

let fake: ReturnType<typeof createFakeDb>
vi.mock('@/lib/tenant-db', () => ({ tenantDb: () => fake }))

import { GET, POST } from './route'

const TENANT_CONTEXT = { tenantId: 'tenant-A', userId: 'user-1', tenant: { name: 'Acme' }, role: 'owner' }

describe('GET /api/boards', () => {
  beforeEach(() => {
    h.requirePermission.mockReset()
    fake = createFakeDb()
  })

  it('rejects the caller when the permission check fails', async () => {
    h.requirePermission.mockResolvedValue({ tenant: null, error: new Response(JSON.stringify({ error: 'Forbidden: insufficient permissions' }), { status: 403 }) })

    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('lists boards ordered by position', async () => {
    h.requirePermission.mockResolvedValue({ tenant: TENANT_CONTEXT, error: null })
    fake.push('boards', { data: [{ id: 'b1', name: 'Tasks' }], error: null })

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.boards).toEqual([{ id: 'b1', name: 'Tasks' }])
  })

  it('returns an empty array rather than null when there are no boards yet', async () => {
    h.requirePermission.mockResolvedValue({ tenant: TENANT_CONTEXT, error: null })
    fake.push('boards', { data: null, error: null })

    const res = await GET()
    const json = await res.json()

    expect(json.boards).toEqual([])
  })
})

describe('POST /api/boards', () => {
  beforeEach(() => {
    h.requirePermission.mockReset()
    fake = createFakeDb()
  })

  it('creates a board AND a default group — a groupless board has nowhere to put items', async () => {
    h.requirePermission.mockResolvedValue({ tenant: TENANT_CONTEXT, error: null })
    fake.push('boards', { count: 2 }) // existing-count query
    fake.push('boards', { data: { id: 'b1', name: 'Tasks', position: 2 }, error: null }) // insert result
    fake.push('board_groups', { data: {}, error: null })

    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 'Tasks' }) }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.board).toEqual({ id: 'b1', name: 'Tasks', position: 2 })
    expect(fake.inserted.get('board_groups')).toEqual([
      expect.objectContaining({ name: 'New Group', board_id: 'b1' }),
    ])
  })

  it('creates the final standard column set — Assignee, Stage (Started/Working/Complete), Notes', async () => {
    h.requirePermission.mockResolvedValue({ tenant: TENANT_CONTEXT, error: null })
    fake.push('boards', { count: 0 })
    fake.push('boards', { data: { id: 'b1', name: 'Tasks' }, error: null })
    fake.push('board_groups', { data: {}, error: null })
    fake.push('board_columns', { data: {}, error: null })

    await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 'Tasks' }) }))

    const cols = fake.inserted.get('board_columns') as Array<{ name: string; type: string; options: unknown[] }>
    expect(cols.map((c) => [c.name, c.type])).toEqual([
      ['Assignee', 'person'],
      ['Stage', 'status'],
      ['Notes', 'text'],
    ])
    expect(cols[1].options).toEqual([
      { label: 'Started', color: '#c4c4c4' },
      { label: 'Working', color: '#fdab3d' },
      { label: 'Complete', color: '#00c875' },
    ])
  })

  it('defaults to "New Board" when no name is supplied', async () => {
    h.requirePermission.mockResolvedValue({ tenant: TENANT_CONTEXT, error: null })
    fake.push('boards', { count: 0 })
    fake.push('boards', { data: { id: 'b1' }, error: null })
    fake.push('board_groups', { data: {}, error: null })

    await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({}) }))

    expect(fake.inserted.get('boards')?.[0]).toMatchObject({ name: 'New Board' })
  })
})
