import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * GET /api/admin/analytics/live-feed — campaigns.view gate (broad-hunt:
 * session-auth only, no requirePermission check, despite streaming raw
 * per-visitor tracking rows — page, referrer, device, time-on-page — for
 * every site the tenant tracks). Per rbac.ts 'staff' lacks campaigns.view;
 * 'manager'/'admin'/'owner' all have it and must keep working.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  role: 'staff' as string,
})) as unknown as FakeStoreHandle & { tenantId: string; role: string }

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: h.tenantId, tenant: {}, role: h.role }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { GET } from './route'

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.role = 'staff'
  h.store = {
    lead_clicks: [
      { id: 'lc-1', tenant_id: 'tenant-A', created_at: '2026-01-01T00:00:00Z', domain: 'x.com', page: '/', action: 'visit', referrer: '', device: 'desktop', final_time: 10, time_on_page: 10, final_scroll: 50, scroll_depth: 50, user_agent: 'Mozilla/5.0' },
    ],
  }
})

describe('GET /api/admin/analytics/live-feed — campaigns.view permission', () => {
  it('rejects a staff member (no campaigns.view) with 403 and leaks no visitor data', async () => {
    const res = await GET()
    expect(res.status).toBe(403)
    const body = await res.text()
    expect(body).not.toContain('x.com')
  })

  it('allows a manager (has campaigns.view) to load the live feed', async () => {
    h.role = 'manager'
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.count).toBe(1)
  })
})
