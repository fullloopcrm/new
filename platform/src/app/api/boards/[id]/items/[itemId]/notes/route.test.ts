import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeDb } from '../../../../test-mock-db'

const h = vi.hoisted(() => ({ requirePermission: vi.fn() }))
vi.mock('@/lib/require-permission', () => ({ requirePermission: h.requirePermission }))

let fake: ReturnType<typeof createFakeDb>
vi.mock('@/lib/tenant-db', () => ({ tenantDb: () => fake }))

import { GET, POST } from './route'

const TENANT_CONTEXT = { tenantId: 'tenant-A', userId: 'user-1', tenant: { owner_name: 'Acme Cleaning', name: 'Acme' }, role: 'owner' }
const PARAMS = { params: Promise.resolve({ id: 'board-1', itemId: 'item-1' }) }

beforeEach(() => {
  h.requirePermission.mockReset()
  h.requirePermission.mockResolvedValue({ tenant: TENANT_CONTEXT, error: null })
  fake = createFakeDb()
})

describe('GET /api/boards/[id]/items/[itemId]/notes', () => {
  it('lists notes oldest-first', async () => {
    fake.push('board_item_notes', { data: [{ id: 'n1', kind: 'activity' }, { id: 'n2', kind: 'note' }], error: null })

    const res = await GET(new Request('http://x'), PARAMS)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.notes).toHaveLength(2)
  })
})

describe('POST /api/boards/[id]/items/[itemId]/notes', () => {
  it('400s on an empty/whitespace-only body', async () => {
    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ body: '   ' }) }), PARAMS)
    expect(res.status).toBe(400)
  })

  it('404s when the item does not belong to this board', async () => {
    fake.push('board_items', { data: null, error: null })
    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ body: 'hello' }) }), PARAMS)
    expect(res.status).toBe(404)
  })

  it('posts a manual note (kind: note) attributed to the tenant, and trims whitespace', async () => {
    fake.push('board_items', { data: { id: 'item-1' }, error: null })
    fake.push('board_item_notes', { data: { id: 'n1', kind: 'note', body: 'hello' }, error: null })

    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ body: '  hello  ' }) }), PARAMS)

    expect(res.status).toBe(201)
    expect(fake.inserted.get('board_item_notes')?.[0]).toMatchObject({
      item_id: 'item-1',
      kind: 'note',
      author_type: 'team',
      author_name: 'Acme Cleaning',
      body: 'hello',
    })
  })

  it('strips script/event-handler HTML from the body before storing it', async () => {
    fake.push('board_items', { data: { id: 'item-1' }, error: null })
    fake.push('board_item_notes', { data: { id: 'n1' }, error: null })

    const dirty = '<p>hi</p><script>alert(1)</script><img src=x onerror=alert(1)>'
    await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ body: dirty }) }), PARAMS)

    expect(fake.inserted.get('board_item_notes')?.[0]).toMatchObject({ body: '<p>hi</p>' })
  })

  it('400s on an empty rich-text body (<p></p>) with no attachments, even though .trim() alone would miss it', async () => {
    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ body: '<p></p>' }) }), PARAMS)
    expect(res.status).toBe(400)
  })

  it('accepts an attachment-only update with an empty body', async () => {
    fake.push('board_items', { data: { id: 'item-1' }, error: null })
    fake.push('board_item_notes', { data: { id: 'n1' }, error: null })

    const attachments = [{ name: 'photo.jpg', url: 'https://x.supabase.co/photo.jpg', size: 1234, content_type: 'image/jpeg' }]
    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ body: '', attachments }) }), PARAMS)

    expect(res.status).toBe(201)
    expect(fake.inserted.get('board_item_notes')?.[0]).toMatchObject({ body: '', attachments })
  })

  it('drops attachments with a non-http(s) url and caps the list at 10', async () => {
    fake.push('board_items', { data: { id: 'item-1' }, error: null })
    fake.push('board_item_notes', { data: { id: 'n1' }, error: null })

    const good = Array.from({ length: 12 }, (_, i) => ({ name: `f${i}`, url: `https://x.com/f${i}`, size: 1, content_type: 'image/png' }))
    const attachments = [{ name: 'evil', url: 'javascript:alert(1)', size: 1, content_type: 'text/html' }, ...good]

    await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ body: 'hi', attachments }) }), PARAMS)

    const stored = fake.inserted.get('board_item_notes')?.[0]?.attachments as unknown[]
    expect(stored).toHaveLength(10)
    expect(stored.every((a) => (a as { url: string }).url.startsWith('https://'))).toBe(true)
  })
})
