import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeDb } from '../../../../../../boards/test-mock-db'

const h = vi.hoisted(() => ({ requireAdmin: vi.fn() }))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: h.requireAdmin }))

let fake: ReturnType<typeof createFakeDb>
vi.mock('@/lib/supabase', () => ({ get supabaseAdmin() { return fake } }))

import { GET, POST } from './route'

const PARAMS = { params: Promise.resolve({ id: 'board-1', itemId: 'item-1' }) }

beforeEach(() => {
  h.requireAdmin.mockReset()
  h.requireAdmin.mockResolvedValue(null)
  fake = createFakeDb()
})

describe('GET /api/admin/boards/[id]/items/[itemId]/notes', () => {
  it('lists notes', async () => {
    fake.push('board_item_notes', { data: [{ id: 'n1' }], error: null })
    const res = await GET(new Request('http://x'), PARAMS)
    expect(res.status).toBe(200)
  })
})

describe('POST /api/admin/boards/[id]/items/[itemId]/notes', () => {
  it('400s on empty body', async () => {
    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ body: '' }) }), PARAMS)
    expect(res.status).toBe(400)
  })

  it('404s when the item is not found on this board', async () => {
    fake.push('board_items', { data: null, error: null })
    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ body: 'hi' }) }), PARAMS)
    expect(res.status).toBe(404)
  })

  it('posts a manual note attributed to Full Loop Admin (no per-admin identity system)', async () => {
    fake.push('board_items', { data: { id: 'item-1' }, error: null })
    fake.push('board_item_notes', { data: { id: 'n1' }, error: null })

    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ body: 'hello' }) }), PARAMS)

    expect(res.status).toBe(201)
    expect(fake.inserted.get('board_item_notes')?.[0]).toMatchObject({
      tenant_id: null,
      kind: 'note',
      author_type: 'admin',
      author_name: 'Full Loop Admin',
      body: 'hello',
    })
  })
})
