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

describe('POST /api/boards/[id]/items', () => {
  it('400s when group_id is missing', async () => {
    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 'Task' }) }), PARAMS)
    expect(res.status).toBe(400)
  })

  it('404s when the group does not belong to this board', async () => {
    fake.push('board_groups', { data: null, error: null })
    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ group_id: 'g1', name: 'Task' }) }), PARAMS)
    expect(res.status).toBe(404)
  })

  it('creates the item AND an "Item created" activity note — the auto-logged trail the Updates feed depends on', async () => {
    fake.push('board_groups', { data: { id: 'g1' }, error: null })
    fake.push('board_items', { count: 0 })
    fake.push('board_items', { data: { id: 'i1', name: 'Task' }, error: null })

    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ group_id: 'g1', name: 'Task' }) }), PARAMS)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.item.id).toBe('i1')
    expect(fake.inserted.get('board_item_notes')).toEqual([
      expect.objectContaining({ item_id: 'i1', kind: 'activity', body: 'Item created' }),
    ])
  })

  it('auto-assigns the creator (resolved by clerk_user_id) instead of leaving Unassigned', async () => {
    fake.push('board_groups', { data: { id: 'g1' }, error: null })
    fake.push('board_items', { count: 0 })
    fake.push('tenant_members', { data: null, error: null }) // lookup by id — Clerk login, not a member id
    fake.push('tenant_members', { data: { id: 'member-9' }, error: null }) // lookup by clerk_user_id
    fake.push('board_items', { data: { id: 'i1', name: 'Task' }, error: null })

    await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ group_id: 'g1', name: 'Task' }) }), PARAMS)

    expect(fake.inserted.get('board_items')).toEqual([
      expect.objectContaining({ assigned_to: 'member-9' }),
    ])
  })

  it('does not auto-assign a creator whose role is excluded from the assignee roster', async () => {
    h.requirePermission.mockResolvedValue({ tenant: { ...TENANT_CONTEXT, role: 'staff' }, error: null })
    fake.push('board_groups', { data: { id: 'g1' }, error: null })
    fake.push('board_items', { count: 0 })
    fake.push('board_items', { data: { id: 'i1', name: 'Task' }, error: null })

    await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ group_id: 'g1', name: 'Task' }) }), PARAMS)

    expect(fake.inserted.get('board_items')).toEqual([
      expect.objectContaining({ assigned_to: null }),
    ])
  })

  it('does not auto-assign under admin-PIN impersonation (userId "admin" is not a real member)', async () => {
    h.requirePermission.mockResolvedValue({ tenant: { ...TENANT_CONTEXT, userId: 'admin' }, error: null })
    fake.push('board_groups', { data: { id: 'g1' }, error: null })
    fake.push('board_items', { count: 0 })
    fake.push('board_items', { data: { id: 'i1', name: 'Task' }, error: null })

    await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ group_id: 'g1', name: 'Task' }) }), PARAMS)

    expect(fake.inserted.get('board_items')).toEqual([
      expect.objectContaining({ assigned_to: null }),
    ])
  })

  it('an explicit assigned_to in the request body overrides auto-assign', async () => {
    fake.push('board_groups', { data: { id: 'g1' }, error: null })
    fake.push('board_items', { count: 0 })
    fake.push('board_items', { data: { id: 'i1', name: 'Task' }, error: null })

    await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ group_id: 'g1', name: 'Task', assigned_to: 'member-explicit' }) }), PARAMS)

    expect(fake.inserted.get('board_items')).toEqual([
      expect.objectContaining({ assigned_to: 'member-explicit' }),
    ])
  })
})
