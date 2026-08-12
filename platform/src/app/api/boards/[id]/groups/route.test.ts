import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeDb } from '../../test-mock-db'

const h = vi.hoisted(() => ({ requirePermission: vi.fn() }))
vi.mock('@/lib/require-permission', () => ({ requirePermission: h.requirePermission }))

let fake: ReturnType<typeof createFakeDb>
vi.mock('@/lib/tenant-db', () => ({ tenantDb: () => fake }))

import { POST } from './route'

const TENANT_CONTEXT = { tenantId: 'tenant-A', userId: 'user-1', tenant: { name: 'Acme' }, role: 'owner' }
const PARAMS = { params: Promise.resolve({ id: 'board-1' }) }

beforeEach(() => {
  h.requirePermission.mockReset()
  h.requirePermission.mockResolvedValue({ tenant: TENANT_CONTEXT, error: null })
  fake = createFakeDb()
})

describe('POST /api/boards/[id]/groups', () => {
  it('creates a group appended to the end (position = current count)', async () => {
    fake.push('boards', { data: { id: 'board-1' }, error: null })
    fake.push('board_groups', { count: 2 })
    fake.push('board_groups', { data: { id: 'g3', name: 'Done', position: 2 }, error: null })

    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 'Done' }) }), PARAMS)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.group.position).toBe(2)
  })

  it('404s when the board does not belong to this tenant', async () => {
    fake.push('boards', { data: null, error: null })

    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 'Done' }) }), PARAMS)
    expect(res.status).toBe(404)
  })

  it('defaults name and color when not supplied', async () => {
    fake.push('boards', { data: { id: 'board-1' }, error: null })
    fake.push('board_groups', { count: 0 })
    fake.push('board_groups', { data: { id: 'g1' }, error: null })

    await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({}) }), PARAMS)

    expect(fake.inserted.get('board_groups')?.[0]).toMatchObject({ name: 'New Group', color: '#579bfc' })
  })
})
