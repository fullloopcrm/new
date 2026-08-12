import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeDb } from '../../boards/test-mock-db'

const h = vi.hoisted(() => ({ requireAdmin: vi.fn() }))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: h.requireAdmin }))

let fake: ReturnType<typeof createFakeDb>
vi.mock('@/lib/supabase', () => ({ get supabaseAdmin() { return fake } }))

import { GET, POST } from './route'

beforeEach(() => {
  h.requireAdmin.mockReset()
  h.requireAdmin.mockResolvedValue(null) // null = authorized, per requireAdmin's contract
  fake = createFakeDb()
})

describe('GET /api/admin/boards', () => {
  it('rejects when unauthenticated', async () => {
    h.requireAdmin.mockResolvedValue(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }))
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('lists platform-level boards (tenant_id IS NULL)', async () => {
    fake.push('boards', { data: [{ id: 'b1', tenant_id: null, name: 'Internal Ops' }], error: null })
    const res = await GET()
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.boards).toEqual([{ id: 'b1', tenant_id: null, name: 'Internal Ops' }])
  })
})

describe('POST /api/admin/boards', () => {
  it('creates a platform board (tenant_id: null) with a default group', async () => {
    fake.push('boards', { count: 0 })
    fake.push('boards', { data: { id: 'b1', name: 'Internal Ops', tenant_id: null }, error: null })
    fake.push('board_groups', { data: {}, error: null })

    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 'Internal Ops' }) }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.board.tenant_id).toBeNull()
    expect(fake.inserted.get('boards')?.[0]).toMatchObject({ tenant_id: null, name: 'Internal Ops' })
    expect(fake.inserted.get('board_groups')?.[0]).toMatchObject({ tenant_id: null, board_id: 'b1' })
  })
})
