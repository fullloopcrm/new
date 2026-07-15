import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * POST /api/admin/campaigns/preview — campaigns.view gate (broad-hunt:
 * session-auth only, no requirePermission check, despite returning the full
 * client PII list — name/email/phone — matching a marketing segment filter).
 * Per rbac.ts 'staff' lacks campaigns.view; 'manager'/'admin'/'owner' all
 * have it and must keep working.
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
  getTenantForRequest: async () => ({
    tenantId: h.tenantId,
    tenant: { name: 'Acme Cleaning', primary_color: '#000000' },
    role: h.role,
  }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { POST } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.role = 'staff'
  h.store = {
    clients: [
      { id: 'client-A1', tenant_id: 'tenant-A', name: 'Alice', email: 'alice@x.com', phone: '+15551110001', email_marketing_opt_out: false, sms_marketing_opt_out: false, status: 'active', do_not_service: false, created_at: '2026-01-01' },
    ],
  }
})

describe('POST /api/admin/campaigns/preview — campaigns.view permission', () => {
  it('rejects a staff member (no campaigns.view) with 403 and leaks no client PII', async () => {
    const res = await POST(postReq({ audience_filter: 'all', channel: 'email' }))
    expect(res.status).toBe(403)
    const body = await res.text()
    expect(body).not.toContain('alice@x.com')
  })

  it('allows a manager (has campaigns.view) to preview the audience', async () => {
    h.role = 'manager'
    const res = await POST(postReq({ audience_filter: 'all', channel: 'email' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.totalClients).toBe(1)
  })
})
