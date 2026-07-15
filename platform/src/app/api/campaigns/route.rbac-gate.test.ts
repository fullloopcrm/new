import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/campaigns and GET /api/campaigns/[id] previously had zero RBAC
 * gate (auth-only via getTenantForRequest) while their own POST/PUT/DELETE
 * siblings already required campaigns.create — same asymmetric-gating class
 * fixed elsewhere (google/posts, team, stripe-onboard, etc). A role that had
 * campaigns.view revoked via the tenant's own RBAC override could still list
 * every campaign (subject/body content included).
 */

const TENANT = 'tenant-A'

type Row = Record<string, unknown>
const store: Record<string, Row[]> = { campaigns: [] }

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    const c: Record<string, unknown> = {
      select: () => c,
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      order: () => c,
      single: async () => {
        const found = (store[table] || []).find((r) => Object.entries(eqs).every(([k, v]) => r[k] === v))
        return { data: found ?? null, error: found ? null : { message: 'not found' } }
      },
      then: (res: (v: { data: unknown; error: unknown }) => unknown) =>
        res({ data: (store[table] || []).filter((r) => Object.entries(eqs).every(([k, v]) => r[k] === v)), error: null }),
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

const h = vi.hoisted(() => ({ requirePermission: vi.fn() }))
vi.mock('@/lib/require-permission', () => ({ requirePermission: (...a: unknown[]) => h.requirePermission(...a) }))

import { GET as listCampaigns } from './route'
import { GET as getCampaign } from './[id]/route'

function forbidden() {
  return { tenant: null, error: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }) }
}

beforeEach(() => {
  store.campaigns = [{ id: 'camp-1', tenant_id: TENANT, name: 'Spring Sale' }]
  h.requirePermission.mockReset()
})

describe('GET /api/campaigns — RBAC gate', () => {
  it('is gated on campaigns.view, not just authentication', async () => {
    h.requirePermission.mockImplementation(async () => forbidden())
    const res = await listCampaigns()
    expect(res.status).toBe(403)
    expect(h.requirePermission).toHaveBeenCalledWith('campaigns.view')
  })

  it('returns campaigns once campaigns.view is granted', async () => {
    h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT }, error: null }))
    const res = await listCampaigns()
    expect(res.status).toBe(200)
  })
})

describe('GET /api/campaigns/[id] — RBAC gate', () => {
  it('is gated on campaigns.view, not just authentication', async () => {
    h.requirePermission.mockImplementation(async () => forbidden())
    const res = await getCampaign(new Request('http://t.test/api/campaigns/camp-1'), { params: Promise.resolve({ id: 'camp-1' }) })
    expect(res.status).toBe(403)
    expect(h.requirePermission).toHaveBeenCalledWith('campaigns.view')
  })
})
