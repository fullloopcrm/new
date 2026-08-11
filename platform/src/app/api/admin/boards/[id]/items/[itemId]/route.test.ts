import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeDb } from '../../../../../boards/test-mock-db'

const h = vi.hoisted(() => ({ requireAdmin: vi.fn() }))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: h.requireAdmin }))

let fake: ReturnType<typeof createFakeDb>
vi.mock('@/lib/supabase', () => ({ get supabaseAdmin() { return fake } }))

import { PATCH, DELETE } from './route'

const PARAMS = { params: Promise.resolve({ id: 'board-1', itemId: 'item-1' }) }

beforeEach(() => {
  h.requireAdmin.mockReset()
  h.requireAdmin.mockResolvedValue(null)
  fake = createFakeDb()
})

describe('PATCH /api/admin/boards/[id]/items/[itemId]', () => {
  it('returns a clean 404 (not the raw PGRST116 500) on a cross-board item id — same fix as the tenant route', async () => {
    fake.push('board_items', { data: null, error: { code: 'PGRST116', message: 'Cannot coerce the result to a single JSON object' } })

    const res = await PATCH(new Request('http://x', { method: 'PATCH', body: JSON.stringify({ name: 'x' }) }), PARAMS)
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toBe('Item not found')
  })

  it('auto-logs "Status changed to Done" when a status column flips, attributed to Full Loop Admin', async () => {
    fake.push('board_items', { data: { values: {} }, error: null }) // existing-values merge
    fake.push('board_items', { data: { id: 'item-1', values: { 'status-col': 'Done' } }, error: null }) // update
    fake.push('board_columns', { data: [{ id: 'status-col', name: 'Status', type: 'status' }], error: null })

    const res = await PATCH(
      new Request('http://x', { method: 'PATCH', body: JSON.stringify({ values: { 'status-col': 'Done' } }) }),
      PARAMS,
    )

    expect(res.status).toBe(200)
    expect(fake.inserted.get('board_item_notes')).toEqual([
      expect.objectContaining({ tenant_id: null, kind: 'activity', body: 'Status changed to Done', author_name: 'Full Loop Admin' }),
    ])
  })
})

describe('DELETE /api/admin/boards/[id]/items/[itemId]', () => {
  it('deletes the item', async () => {
    fake.push('board_items', { error: null })
    const res = await DELETE(new Request('http://x'), PARAMS)
    expect(res.status).toBe(200)
  })
})
