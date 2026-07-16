import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET /api/admin/find-cleaner/recent — permission gate.
 *
 * BUG (fixed here): this handler only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check, even though the
 * sibling POST /api/admin/find-cleaner/send (the action that CREATES this
 * exact data — broadcast + recipient phone/reply_text rows) is gated behind
 * campaigns.send. By default rbac.ts grants no campaigns.* permission to
 * 'staff' at all, so any staff-tier member could already read the full
 * broadcast history (recipient phone numbers + SMS reply text) with zero
 * role check, no override needed.
 *
 * FIX: requirePermission('campaigns.view') on GET — the read-tier used
 * across every other GET/mutate pair in this codebase.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const tenantHolder = vi.hoisted(() => ({
  role: 'owner' as string,
  tenant: { id: 'tid-a' } as Record<string, unknown>,
}))
vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: A,
      tenant: tenantHolder.tenant,
      role: tenantHolder.role,
    })),
  }
})

import { GET } from './route'

function seed() {
  return {
    cleaner_broadcasts: [
      { id: 'bc-a1', tenant_id: A, sent_at: '2026-07-10T00:00:00Z' },
    ],
    cleaner_broadcast_recipients: [
      { id: 'rec-a1', tenant_id: A, broadcast_id: 'bc-a1', cleaner_id: 'cl-a', phone: '+15559990001', sent_at: null, replied_at: null, reply_text: 'YES', status: 'sent' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  tenantHolder.role = 'owner'
  tenantHolder.tenant = { id: A }
})

describe('GET /api/admin/find-cleaner/recent — permission probe', () => {
  it('owner (has campaigns.view) can read the broadcast history', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it("manager (has campaigns.view per default rbac.ts) can read the broadcast history", async () => {
    tenantHolder.role = 'manager'
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'staff' (no campaigns.* per default rbac.ts, no override needed) is forbidden from reading the broadcast history (incl. recipient phone/reply PII)", async () => {
    tenantHolder.role = 'staff'
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it("PERMISSION PROBE: a tenant that revokes 'campaigns.view' from manager via a role_permissions override blocks GET for manager", async () => {
    tenantHolder.role = 'manager'
    tenantHolder.tenant = {
      id: A,
      selena_config: { role_permissions: { manager: { 'campaigns.view': false } } },
    }
    const res = await GET()
    expect(res.status).toBe(403)
  })
})
