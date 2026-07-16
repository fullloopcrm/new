import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * /api/admin/seo/backlinks — FL-admin review queue for backlinks.ts's
 * citation/editorial proposals (seo_backlink_opportunities, status='proposed').
 * GET lists proposed rows joined with tenant name; POST approve/reject updates
 * status + reviewed_at. Neither verb submits anything externally.
 */

const authHolder = vi.hoisted(() => ({ authorized: true }))
vi.mock('@/lib/require-admin', () => ({
  requireAdmin: vi.fn(async () =>
    authHolder.authorized ? null : new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
  ),
}))

type BacklinkRow = {
  id: string
  tenant_id: string
  property: string
  kind: string
  source_key: string
  source_name: string
  source_url: string | null
  category: string | null
  status: string
  listing: Record<string, unknown>
  rationale: string | null
  safety: Record<string, unknown>
  proposed_at: string
  reviewed_at?: string | null
}

let backlinkRows: BacklinkRow[]
let tenantRows: Array<{ id: string; name: string }>
let updateCalls: Array<{ id: string; patch: Record<string, unknown> }>

const TABLE = 'seo_backlink_opportunities'

function builder(table: string) {
  const eq: Record<string, unknown> = {}
  let inCol: string | undefined
  let inVals: unknown[] | undefined
  let op: 'select' | 'update' = 'select'
  let patch: Record<string, unknown> = {}

  const chain = {
    select: () => { op = 'select'; return chain },
    update: (p: Record<string, unknown>) => { op = 'update'; patch = p; return chain },
    eq: (col: string, val: unknown) => { eq[col] = val; return chain },
    in: (col: string, vals: unknown[]) => { inCol = col; inVals = vals; return chain },
    order: () => chain,
    limit: () => chain,
    then: (resolve: (v: { data: unknown; error: unknown }) => void) => {
      if (table === TABLE && op === 'update') {
        const row = backlinkRows.find((r) => r.id === eq.id && r.status === (eq.status ?? r.status))
        if (row) {
          updateCalls.push({ id: row.id, patch })
          Object.assign(row, patch)
        }
        resolve({ data: null, error: null })
        return
      }
      if (table === TABLE) {
        const rows = backlinkRows.filter((r) => (eq.status ? r.status === eq.status : true))
        resolve({ data: rows, error: null })
        return
      }
      if (table === 'tenants') {
        const ids = inCol === 'id' ? (inVals as string[]) : []
        resolve({ data: tenantRows.filter((t) => ids.includes(t.id)), error: null })
        return
      }
      resolve({ data: [], error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => builder(t) } }))

import { GET, POST } from './route'

function req(body: unknown) {
  return new Request('http://localhost/api/admin/seo/backlinks', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('GET /api/admin/seo/backlinks', () => {
  beforeEach(() => {
    authHolder.authorized = true
    updateCalls = []
    tenantRows = [{ id: 't1', name: 'Sunnyside Cleaning' }]
    backlinkRows = [
      {
        id: 'op1', tenant_id: 't1', property: 'sc-domain:sunnyside.com', kind: 'citation',
        source_key: 'angi', source_name: 'Angi', source_url: 'https://www.angi.com', category: 'cleaning',
        status: 'proposed', listing: { description: 'x' }, rationale: 'r', safety: { pass: true },
        proposed_at: '2026-07-16T00:00:00Z',
      },
      {
        id: 'op2', tenant_id: 't1', property: 'sc-domain:sunnyside.com', kind: 'citation',
        source_key: 'bbb', source_name: 'BBB', source_url: null, category: 'cleaning',
        status: 'approved', listing: {}, rationale: null, safety: {},
        proposed_at: '2026-07-15T00:00:00Z',
      },
    ]
  })

  it('rejects unauthenticated callers', async () => {
    authHolder.authorized = false
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns only status=proposed rows, joined with tenant name', async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.opportunities).toHaveLength(1)
    expect(body.opportunities[0]).toMatchObject({ id: 'op1', tenant_name: 'Sunnyside Cleaning' })
  })
})

describe('POST /api/admin/seo/backlinks', () => {
  beforeEach(() => {
    authHolder.authorized = true
    updateCalls = []
    tenantRows = []
    backlinkRows = [
      {
        id: 'op1', tenant_id: 't1', property: 'sc-domain:sunnyside.com', kind: 'citation',
        source_key: 'angi', source_name: 'Angi', source_url: null, category: 'cleaning',
        status: 'proposed', listing: {}, rationale: null, safety: {}, proposed_at: '2026-07-16T00:00:00Z',
      },
    ]
  })

  it('rejects unauthenticated callers', async () => {
    authHolder.authorized = false
    const res = await POST(req({ id: 'op1', action: 'approve' }))
    expect(res.status).toBe(401)
  })

  it('requires id', async () => {
    const res = await POST(req({ action: 'approve' }))
    expect(res.status).toBe(400)
  })

  it('rejects an invalid action', async () => {
    const res = await POST(req({ id: 'op1', action: 'delete' }))
    expect(res.status).toBe(400)
  })

  it('approve sets status=approved and reviewed_at', async () => {
    const res = await POST(req({ id: 'op1', action: 'approve' }))
    expect(res.status).toBe(200)
    expect(backlinkRows[0].status).toBe('approved')
    expect(backlinkRows[0].reviewed_at).toBeTruthy()
  })

  it('reject sets status=rejected', async () => {
    const res = await POST(req({ id: 'op1', action: 'reject' }))
    expect(res.status).toBe(200)
    expect(backlinkRows[0].status).toBe('rejected')
  })

  it('is a no-op against a row already past proposed (status guard)', async () => {
    backlinkRows[0].status = 'approved'
    await POST(req({ id: 'op1', action: 'reject' }))
    expect(backlinkRows[0].status).toBe('approved')
    expect(updateCalls).toHaveLength(0)
  })
})
