import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Regression coverage for a real bug found via live E2E simulation
 * (2026-08-10): PATCHing an item through a board id it doesn't belong to
 * made .single() match zero rows, which threw a raw Postgres error
 * ("Cannot coerce the result to a single JSON object", PGRST116) straight
 * to a 500 instead of a clean 404. Also covers the auto-logged activity
 * note on a column value change — the "communication when tasks are
 * completed" behavior the board's Updates feed depends on.
 */

type Row = Record<string, unknown>
type DbResult = { data: Row | null; error: { code: string; message: string } | null }

const h = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  itemsResponses: [] as Array<{ data: unknown; error: unknown }>,
  groupResponses: [] as Array<{ data: unknown; error: unknown }>,
  insertedNotes: [] as Row[],
}))

vi.mock('@/lib/require-permission', () => ({ requirePermission: h.requirePermission }))

function chain(result: DbResult) {
  const c = {
    select: () => c,
    eq: () => c,
    update: () => c,
    delete: () => c,
    order: () => c,
    single: () => Promise.resolve(result),
  }
  return c
}

vi.mock('@/lib/tenant-db', () => ({
  tenantDb: () => ({
    from: (table: string) => {
      if (table === 'board_items') {
        const result = h.itemsResponses.shift()
        return chain((result as DbResult) || { data: null, error: null })
      }
      if (table === 'board_groups') {
        const result = h.groupResponses.shift()
        return chain((result as DbResult) || { data: { id: 'g1' }, error: null })
      }
      if (table === 'board_columns') {
        return { select: () => ({ eq: () => Promise.resolve({ data: [{ id: 'status-col', name: 'Status', type: 'status' }], error: null }) }) }
      }
      if (table === 'board_item_notes') {
        return { insert: (rows: Row[]) => { h.insertedNotes.push(...rows); return Promise.resolve({ data: rows, error: null }) } }
      }
      throw new Error(`unexpected table in test: ${table}`)
    },
  }),
}))

import { PATCH, DELETE } from './route'

const TENANT_CONTEXT = {
  tenantId: 'tenant-A',
  userId: 'user-1',
  tenant: { owner_name: 'Acme Cleaning', name: 'Acme' },
  role: 'owner',
}

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/boards/board-1/items/item-1', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

const PARAMS = { params: Promise.resolve({ id: 'board-1', itemId: 'item-1' }) }

describe('PATCH /api/boards/[id]/items/[itemId]', () => {
  beforeEach(() => {
    h.requirePermission.mockReset()
    h.itemsResponses.length = 0
    h.groupResponses.length = 0
    h.insertedNotes.length = 0
    h.requirePermission.mockResolvedValue({ tenant: TENANT_CONTEXT, error: null })
  })

  it('returns a clean 404 (not a raw 500) when the item does not belong to this board id', async () => {
    h.itemsResponses.push({ data: null, error: { code: 'PGRST116', message: 'Cannot coerce the result to a single JSON object' } })

    const res = await PATCH(makeRequest({ name: 'renamed' }), PARAMS)
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toBe('Item not found')
  })

  it('auto-logs an activity note when a column value changes, so completion is visible without a manual note', async () => {
    h.itemsResponses.push({ data: { values: {} }, error: null }) // existing-values merge fetch
    h.itemsResponses.push({ data: { id: 'item-1', values: { 'status-col': 'Done' } }, error: null }) // the update itself

    const res = await PATCH(makeRequest({ values: { 'status-col': 'Done' } }), PARAMS)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.item.values['status-col']).toBe('Done')
    expect(h.insertedNotes).toHaveLength(1)
    expect(h.insertedNotes[0]).toMatchObject({
      item_id: 'item-1',
      kind: 'activity',
      body: 'Status changed to Done',
      author_name: 'Acme Cleaning',
    })
  })

  it('does not insert an activity note when no values are touched', async () => {
    h.itemsResponses.push({ data: { id: 'item-1', name: 'renamed' }, error: null })

    const res = await PATCH(makeRequest({ name: 'renamed' }), PARAMS)

    expect(res.status).toBe(200)
    expect(h.insertedNotes).toHaveLength(0)
  })

  it('404s when moving an item into a group_id that does not belong to this board', async () => {
    h.groupResponses.push({ data: null, error: null })

    const res = await PATCH(makeRequest({ group_id: 'other-boards-group' }), PARAMS)
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Group not found')
  })
})

describe('DELETE /api/boards/[id]/items/[itemId]', () => {
  beforeEach(() => {
    h.requirePermission.mockReset()
    h.itemsResponses.length = 0
    h.requirePermission.mockResolvedValue({ tenant: TENANT_CONTEXT, error: null })
  })

  it('deletes the item', async () => {
    h.itemsResponses.push({ data: null, error: null })
    const res = await DELETE(new Request('http://x'), PARAMS)
    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(true)
  })
})
