import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeDb } from '../../../boards/test-mock-db'

const h = vi.hoisted(() => ({ requireAdmin: vi.fn() }))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: h.requireAdmin }))

let fake: ReturnType<typeof createFakeDb>
vi.mock('@/lib/supabase', () => ({ get supabaseAdmin() { return fake } }))

import { GET, PATCH, DELETE } from './route'

const PARAMS = { params: Promise.resolve({ id: 'board-1' }) }

beforeEach(() => {
  h.requireAdmin.mockReset()
  h.requireAdmin.mockResolvedValue(null)
  fake = createFakeDb()
})

describe('GET /api/admin/boards/[id]', () => {
  it('404s when the board is not a platform-level board (or does not exist)', async () => {
    fake.push('boards', { data: null, error: null })
    const res = await GET(new Request('http://x'), PARAMS)
    expect(res.status).toBe(404)
  })

  it('returns board + groups + columns + items', async () => {
    fake.push('boards', { data: { id: 'board-1', tenant_id: null }, error: null })
    fake.push('board_groups', { data: [], error: null })
    fake.push('board_columns', { data: [], error: null })
    fake.push('board_items', { data: [], error: null })
    const res = await GET(new Request('http://x'), PARAMS)
    expect(res.status).toBe(200)
  })
})

describe('PATCH /api/admin/boards/[id]', () => {
  it('404s (not 500) on a mismatched id', async () => {
    fake.push('boards', { data: null, error: { code: 'PGRST116', message: 'x' } })
    const res = await PATCH(new Request('http://x', { method: 'PATCH', body: JSON.stringify({ name: 'x' }) }), PARAMS)
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Not found')
  })
})

describe('DELETE /api/admin/boards/[id]', () => {
  it('deletes the board', async () => {
    fake.push('boards', { error: null })
    const res = await DELETE(new Request('http://x'), PARAMS)
    expect(res.status).toBe(200)
  })
})
