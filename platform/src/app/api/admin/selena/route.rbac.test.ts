import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET/POST /api/admin/selena — permission gate.
 *
 * BUG (fixed here): both handlers only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check — same class as
 * the sibling gap just fixed on GET/POST /api/sms. GET returns client
 * conversation content + phone numbers; POST resets a stuck conversation AND
 * sends a real recovery SMS via the tenant's Telnyx credentials to the
 * client's phone. This route is live for the legacy per-tenant dashboard
 * clones (wash-and-fold-nyc/hoboken, nyc-mobile-salon — see their
 * AdminSidebar.tsx), where any authenticated tenant member could already
 * reset any conversation and trigger a client SMS with zero role check.
 *
 * FIX: requirePermission('clients.view') on GET, requirePermission
 * ('clients.edit') on POST — same split as GET/POST /api/sms.
 */

const A = 'tid-adminselena-rbac-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const tenantHolder = vi.hoisted(() => ({
  role: 'owner' as string,
  tenant: {} as Record<string, unknown>,
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

vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/sms-messages', () => ({ insertConversationMessage: vi.fn(async () => ({ data: null, error: null })) }))
vi.mock('@/lib/selena-legacy', () => ({
  EMPTY_CHECKLIST: {},
  getClientProfile: vi.fn(async () => '{}'),
}))

import { GET, POST } from './route'

function seed() {
  return {
    sms_conversations: [
      { id: 'cv-a', tenant_id: A, phone: '2125551111', client_id: 'cl-a', booking_checklist: { status: 'active' } },
    ] as Record<string, unknown>[],
    sms_conversation_messages: [] as Record<string, unknown>[],
    notifications: [] as Record<string, unknown>[],
    tenants: [{ id: A, telnyx_api_key: 'key', telnyx_phone: '+15550001111', sms_number: null }] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  tenantHolder.role = 'owner'
  tenantHolder.tenant = { id: A, name: 'Tenant A' }
})

function get() {
  return GET(new NextRequest('http://t/api/admin/selena'))
}

function post() {
  return POST(new NextRequest('http://t/api/admin/selena', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ conversationId: 'cv-a' }),
  }))
}

describe('GET /api/admin/selena — permission probe', () => {
  it('owner (has clients.view) can view stats', async () => {
    const res = await get()
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: staff can view by default (has clients.view), but a revoking override blocks it", async () => {
    tenantHolder.role = 'staff'
    let res = await get()
    expect(res.status).toBe(200)

    tenantHolder.tenant = {
      id: A, name: 'Tenant A',
      selena_config: { role_permissions: { staff: { 'clients.view': false } } },
    }
    res = await get()
    expect(res.status).toBe(403)
  })
})

describe('POST /api/admin/selena — permission probe', () => {
  it('owner (has clients.edit) can reset a conversation', async () => {
    const res = await post()
    expect(res.status).toBe(200)
  })

  it('manager (has clients.edit) can reset a conversation', async () => {
    tenantHolder.role = 'manager'
    const res = await post()
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: staff (lacks clients.edit per default rbac.ts) is forbidden — conversation is not reset", async () => {
    tenantHolder.role = 'staff'
    const res = await post()
    expect(res.status).toBe(403)
    const updated = h.capture.updates.find((u) => u.table === 'sms_conversations')
    expect(updated).toBeUndefined()
  })

  it("PERMISSION PROBE: a tenant that grants clients.edit to staff via override allows POST for staff", async () => {
    tenantHolder.role = 'staff'
    tenantHolder.tenant = {
      id: A, name: 'Tenant A',
      selena_config: { role_permissions: { staff: { 'clients.edit': true } } },
    }
    const res = await post()
    expect(res.status).toBe(200)
  })
})
