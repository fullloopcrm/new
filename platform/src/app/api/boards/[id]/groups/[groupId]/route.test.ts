import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeDb } from '../../../test-mock-db'

const h = vi.hoisted(() => ({ requirePermission: vi.fn() }))
vi.mock('@/lib/require-permission', () => ({ requirePermission: h.requirePermission }))

let fake: ReturnType<typeof createFakeDb>
vi.mock('@/lib/tenant-db', () => ({ tenantDb: () => fake }))

import { PATCH, DELETE } from './route'

const TENANT_CONTEXT = { tenantId: 'tenant-A', userId: 'user-1', tenant: { name: 'Acme' }, role: 'owner' }
const PARAMS = { params: Promise.resolve({ id: 'board-1', groupId: 'group-1' }) }

beforeEach(() => {
  h.requirePermission.mockReset()
  h.requirePermission.mockResolvedValue({ tenant: TENANT_CONTEXT, error: null })
  fake = createFakeDb()
})

describe('PATCH /api/boards/[id]/groups/[groupId]', () => {
  it('renames and recolors the group', async () => {
    fake.push('board_groups', { data: { id: 'group-1', name: 'Done', color: '#00c875' }, error: null })

    const res = await PATCH(new Request('http://x', { method: 'PATCH', body: JSON.stringify({ name: 'Done', color: '#00c875' }) }), PARAMS)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.group).toEqual({ id: 'group-1', name: 'Done', color: '#00c875' })
  })

  it('400s with no valid fields', async () => {
    const res = await PATCH(new Request('http://x', { method: 'PATCH', body: JSON.stringify({}) }), PARAMS)
    expect(res.status).toBe(400)
  })

  it('404s (not 500) when the group id does not belong to this board', async () => {
    fake.push('board_groups', { data: null, error: { code: 'PGRST116', message: 'x' } })

    const res = await PATCH(new Request('http://x', { method: 'PATCH', body: JSON.stringify({ name: 'x' }) }), PARAMS)
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Group not found')
  })
})

describe('DELETE /api/boards/[id]/groups/[groupId]', () => {
  it('deletes the group', async () => {
    fake.push('board_groups', { error: null })
    const res = await DELETE(new Request('http://x'), PARAMS)
    expect(res.status).toBe(200)
  })
})
