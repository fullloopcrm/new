import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeDb } from '../../../test-mock-db'

const h = vi.hoisted(() => ({ requirePermission: vi.fn() }))
vi.mock('@/lib/require-permission', () => ({ requirePermission: h.requirePermission }))

let fake: ReturnType<typeof createFakeDb>
vi.mock('@/lib/tenant-db', () => ({ tenantDb: () => fake }))

import { PATCH, DELETE } from './route'

const TENANT_CONTEXT = { tenantId: 'tenant-A', userId: 'user-1', tenant: { name: 'Acme' }, role: 'owner' }
const PARAMS = { params: Promise.resolve({ id: 'board-1', columnId: 'col-1' }) }

beforeEach(() => {
  h.requirePermission.mockReset()
  h.requirePermission.mockResolvedValue({ tenant: TENANT_CONTEXT, error: null })
  fake = createFakeDb()
})

describe('PATCH /api/boards/[id]/columns/[columnId]', () => {
  it('renames the column and updates status options', async () => {
    fake.push('board_columns', { data: { id: 'col-1', name: 'Stage', options: [{ label: 'A', color: '#000' }] }, error: null })

    const res = await PATCH(new Request('http://x', { method: 'PATCH', body: JSON.stringify({ name: 'Stage', options: [{ label: 'A', color: '#000' }] }) }), PARAMS)
    expect(res.status).toBe(200)
  })

  it('404s (not 500) on a column id from a different board', async () => {
    fake.push('board_columns', { data: null, error: { code: 'PGRST116', message: 'x' } })
    const res = await PATCH(new Request('http://x', { method: 'PATCH', body: JSON.stringify({ name: 'x' }) }), PARAMS)
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/boards/[id]/columns/[columnId]', () => {
  it('deletes the column', async () => {
    fake.push('board_columns', { error: null })
    const res = await DELETE(new Request('http://x'), PARAMS)
    expect(res.status).toBe(200)
  })
})
