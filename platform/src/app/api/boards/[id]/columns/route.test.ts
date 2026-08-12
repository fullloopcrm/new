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

describe('POST /api/boards/[id]/columns', () => {
  it('400s on an invalid column type — never lets an unknown type reach the DB', async () => {
    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 'X', type: 'automation' }) }), PARAMS)
    expect(res.status).toBe(400)
  })

  it('400s when name is missing', async () => {
    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ type: 'text' }) }), PARAMS)
    expect(res.status).toBe(400)
  })

  it('seeds default status options when a status column is created without options', async () => {
    fake.push('boards', { data: { id: 'board-1' }, error: null })
    fake.push('board_columns', { count: 0 })
    fake.push('board_columns', { data: { id: 'c1' }, error: null })

    await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 'Status', type: 'status' }) }), PARAMS)

    const inserted = fake.inserted.get('board_columns')?.[0] as { options: unknown[] }
    expect(inserted.options.length).toBeGreaterThan(0)
  })

  it('non-status columns get empty options regardless of what is passed', async () => {
    fake.push('boards', { data: { id: 'board-1' }, error: null })
    fake.push('board_columns', { count: 0 })
    fake.push('board_columns', { data: { id: 'c1' }, error: null })

    await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 'Notes', type: 'text', options: [{ label: 'x', color: '#000' }] }) }), PARAMS)

    expect(fake.inserted.get('board_columns')?.[0]).toMatchObject({ options: [] })
  })

  it('404s when the board is not found', async () => {
    fake.push('boards', { data: null, error: null })
    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 'X', type: 'text' }) }), PARAMS)
    expect(res.status).toBe(404)
  })
})
