import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET/POST /api/sms — permission gate.
 *
 * BUG (fixed here): both handlers only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check, even though POST
 * sends a real outbound SMS via the tenant's Telnyx credentials (cost, and an
 * uncapped free-text message sent to a client on the business's behalf). Its
 * sibling send path, sms/send/route.ts, already gates behind
 * requirePermission('campaigns.send'). By default rbac.ts gives 'staff'
 * clients.view but NOT clients.edit — the dashboard/sms page's nav entry is
 * visible to every role (gated only on clients.view), so any staff-tier
 * member could already text an arbitrary client with zero role check.
 *
 * FIX: requirePermission('clients.view') on GET, requirePermission('clients.edit')
 * on POST — matching the clients/[id]/contacts route's own view/edit split.
 */

const A = 'tid-sms-rbac-a'

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

import { GET, POST } from './route'

function seed() {
  return {
    sms_conversations: [
      { id: 'cv-a', tenant_id: A },
    ] as Record<string, unknown>[],
    sms_conversation_messages: [] as Record<string, unknown>[],
    clients: [
      { id: 'cl-a', tenant_id: A, phone: '2125551111' },
    ] as Record<string, unknown>[],
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
  return GET(new NextRequest('http://t/api/sms'))
}

function post() {
  return POST(new NextRequest('http://t/api/sms', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ client_id: 'cl-a', message: 'hi there' }),
  }))
}

describe('GET /api/sms — permission probe', () => {
  it('owner (has clients.view) can list conversations', async () => {
    const res = await get()
    expect(res.status).toBe(200)
  })

  it('staff (has clients.view by default) can list conversations', async () => {
    tenantHolder.role = 'staff'
    const res = await get()
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: a tenant that revokes clients.view from staff via override blocks GET", async () => {
    tenantHolder.role = 'staff'
    tenantHolder.tenant = {
      id: A, name: 'Tenant A',
      selena_config: { role_permissions: { staff: { 'clients.view': false } } },
    }
    const res = await get()
    expect(res.status).toBe(403)
  })
})

describe('POST /api/sms — permission probe', () => {
  it('owner (has clients.edit) can send', async () => {
    const res = await post()
    expect(res.status).toBe(201)
  })

  it('manager (has clients.edit) can send', async () => {
    tenantHolder.role = 'manager'
    const res = await post()
    expect(res.status).toBe(201)
  })

  it("PERMISSION PROBE: staff (lacks clients.edit per default rbac.ts) is forbidden — no message is created", async () => {
    tenantHolder.role = 'staff'
    const res = await post()
    expect(res.status).toBe(403)
    const created = h.capture.inserts.find((i) => i.table === 'sms_conversations')
    expect(created).toBeUndefined()
  })

  it("PERMISSION PROBE: a tenant that revokes clients.edit from manager via override blocks POST", async () => {
    tenantHolder.role = 'manager'
    tenantHolder.tenant = {
      id: A, name: 'Tenant A',
      selena_config: { role_permissions: { manager: { 'clients.edit': false } } },
    }
    const res = await post()
    expect(res.status).toBe(403)
  })

  it("PERMISSION PROBE: a tenant that grants clients.edit to staff via override allows POST for staff", async () => {
    tenantHolder.role = 'staff'
    tenantHolder.tenant = {
      id: A, name: 'Tenant A',
      selena_config: { role_permissions: { staff: { 'clients.edit': true } } },
    }
    const res = await post()
    expect(res.status).toBe(201)
  })
})
