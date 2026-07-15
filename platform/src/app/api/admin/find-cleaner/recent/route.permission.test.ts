import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * GET /api/admin/find-cleaner/recent — team.edit gate (broad-hunt companion
 * to the already-fixed /api/admin/find-cleaner/send). This route only
 * called getTenantForRequest() for base tenant auth, no requirePermission
 * check, despite returning past SMS-broadcast recipient phone numbers and
 * reply text — the same data class as ../send, now gated the same way
 * (team.edit; staff/manager only have team.view).
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
    cleaner_broadcasts: [{ id: 'b1', tenant_id: 'tenant-A', sent_at: '2026-01-01' }],
    cleaner_broadcast_recipients: [{ id: 'r1', tenant_id: 'tenant-A', broadcast_id: 'b1', cleaner_id: 'tm-1', phone: '+15551110001', status: 'sent' }],
  }
})

describe('GET /api/admin/find-cleaner/recent — team.edit permission', () => {
  it('rejects a staff member (no team.edit) with 403', async () => {
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('rejects a manager (team.view only) with 403', async () => {
    h.role = 'manager'
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('allows an admin (has team.edit) to view broadcast history', async () => {
    h.role = 'admin'
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.broadcasts).toHaveLength(1)
  })
})
