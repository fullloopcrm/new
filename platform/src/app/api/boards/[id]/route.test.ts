import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeDb } from '../test-mock-db'

const h = vi.hoisted(() => ({ requirePermission: vi.fn() }))
vi.mock('@/lib/require-permission', () => ({ requirePermission: h.requirePermission }))

let fake: ReturnType<typeof createFakeDb>
vi.mock('@/lib/tenant-db', () => ({ tenantDb: () => fake }))

import { GET, PATCH, DELETE } from './route'

const TENANT_CONTEXT = { tenantId: 'tenant-A', userId: 'user-1', tenant: { name: 'Acme' }, role: 'owner' }
const PARAMS = { params: Promise.resolve({ id: 'board-1' }) }

beforeEach(() => {
  h.requirePermission.mockReset()
  h.requirePermission.mockResolvedValue({ tenant: TENANT_CONTEXT, error: null })
  fake = createFakeDb()
})

describe('GET /api/boards/[id]', () => {
  it('returns the board with its groups, columns, and items (each item annotated with its manual-note count)', async () => {
    fake.push('boards', { data: { id: 'board-1', name: 'Tasks' }, error: null })
    fake.push('board_groups', { data: [{ id: 'g1' }], error: null })
    fake.push('board_columns', { data: [{ id: 'c1' }], error: null })
    fake.push('board_items', { data: [{ id: 'i1' }, { id: 'i2' }], error: null })
    fake.push('board_item_notes', { data: [{ item_id: 'i1', kind: 'note' }, { item_id: 'i1', kind: 'note' }], error: null })

    const res = await GET(new Request('http://x'), PARAMS)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({
      board: { id: 'board-1', name: 'Tasks' },
      groups: [{ id: 'g1' }],
      columns: [{ id: 'c1' }],
      items: [{ id: 'i1', note_count: 2 }, { id: 'i2', note_count: 0 }],
    })
  })

  it('404s when the board does not exist', async () => {
    fake.push('boards', { data: null, error: null })

    const res = await GET(new Request('http://x'), PARAMS)
    expect(res.status).toBe(404)
  })
})

describe('PATCH /api/boards/[id]', () => {
  it('renames the board', async () => {
    fake.push('boards', { data: { id: 'board-1', name: 'New Name' }, error: null })

    const res = await PATCH(new Request('http://x', { method: 'PATCH', body: JSON.stringify({ name: 'New Name' }) }), PARAMS)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.board.name).toBe('New Name')
  })

  it('400s when no valid fields are supplied', async () => {
    const res = await PATCH(new Request('http://x', { method: 'PATCH', body: JSON.stringify({}) }), PARAMS)
    expect(res.status).toBe(400)
  })

  it('404s (not a raw 500) when the id does not match any board', async () => {
    fake.push('boards', { data: null, error: { code: 'PGRST116', message: 'Cannot coerce the result to a single JSON object' } })

    const res = await PATCH(new Request('http://x', { method: 'PATCH', body: JSON.stringify({ name: 'x' }) }), PARAMS)
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toBe('Not found')
  })
})

describe('DELETE /api/boards/[id]', () => {
  it('deletes the board', async () => {
    fake.push('boards', { error: null })

    const res = await DELETE(new Request('http://x'), PARAMS)
    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(true)
  })
})
