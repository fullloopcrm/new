import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * POST /api/admin/message-applicants/preview — team.edit gate (broad-hunt
 * companion to the already-fixed /api/admin/message-applicants/send). This
 * route only called getTenantForRequest() for base tenant auth, no
 * requirePermission check, despite returning applicant names/phone numbers
 * for a broadcast preview — now gated the same way as ../send (team.edit;
 * staff/manager only have team.view).
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

import { POST } from './route'

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.role = 'staff'
  h.store = {
    cleaner_applications: [
      { id: 'app-A1', tenant_id: 'tenant-A', name: 'Jeff Tucker', phone: '+15551110001', status: 'pending', created_at: '2026-01-01' },
    ],
  }
})

describe('POST /api/admin/message-applicants/preview — team.edit permission', () => {
  it('rejects a staff member (no team.edit) with 403', async () => {
    const res = await POST()
    expect(res.status).toBe(403)
  })

  it('rejects a manager (team.view only) with 403', async () => {
    h.role = 'manager'
    const res = await POST()
    expect(res.status).toBe(403)
  })

  it('allows an admin (has team.edit) to preview the broadcast', async () => {
    h.role = 'admin'
    const res = await POST()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.eligible).toHaveLength(1)
  })
})
