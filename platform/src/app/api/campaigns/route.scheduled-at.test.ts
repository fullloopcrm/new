import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/campaigns' validate() allowlist never included scheduled_at,
 * even though the create form's "Schedule (optional)" datetime-local input
 * (campaigns/page.tsx) sends it on every submit — silently dropped pre-insert,
 * so a campaign "scheduled" for later was indistinguishable from one created
 * with no schedule at all (scheduled_at always landed null). PATCH
 * /api/campaigns/[id] already accepted this same field via pick(); only the
 * create route was missing it. This proves the fix.
 */

const TENANT = 'tenant-A'

type Row = Record<string, unknown>
const store: Record<string, Row[]> = { campaigns: [] }
let nextId = 1

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let insertedRow: Row | null = null
    const c: Record<string, unknown> = {
      select: () => c,
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      order: () => c,
      insert: (row: Row) => {
        insertedRow = { id: `camp-${nextId++}`, created_at: new Date().toISOString(), ...row }
        store[table] = [...(store[table] || []), insertedRow]
        return c
      },
      single: async () => {
        if (insertedRow) return { data: insertedRow, error: null }
        const found = (store[table] || []).find((r) => Object.entries(eqs).every(([k, v]) => r[k] === v))
        return { data: found ?? null, error: found ? null : { message: 'not found' } }
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))
vi.mock('@/lib/audit', () => ({ audit: async () => {} }))

import { POST } from './route'

function req(body: Record<string, unknown>): Request {
  return new Request('http://x/api/campaigns', { method: 'POST', body: JSON.stringify(body) })
}

beforeEach(() => {
  store.campaigns = []
  nextId = 1
})

describe('POST /api/campaigns — scheduled_at is no longer silently dropped', () => {
  it('persists scheduled_at when the create form sends it', async () => {
    const res = await POST(req({ name: 'Spring Sale', type: 'email', body: 'Hello', scheduled_at: '2026-08-01T14:30' }))
    expect(res.status).toBe(201)
    const { campaign } = await res.json()
    expect(campaign.scheduled_at).not.toBeNull()
    expect(new Date(campaign.scheduled_at).getTime()).toBe(new Date('2026-08-01T14:30').getTime())
  })

  it('still creates as status "draft" (unscheduled) when scheduled_at is omitted — no regression', async () => {
    const res = await POST(req({ name: 'Immediate blast', type: 'sms', body: 'Hi' }))
    expect(res.status).toBe(201)
    const { campaign } = await res.json()
    expect(campaign.status).toBe('draft')
    expect(campaign.scheduled_at).toBeNull()
  })

  it('rejects a malformed scheduled_at instead of silently dropping it', async () => {
    const res = await POST(req({ name: 'Bad date', type: 'email', body: 'Hi', scheduled_at: 'not-a-date' }))
    expect(res.status).toBe(400)
  })
})
