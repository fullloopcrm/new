import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

const CTX_TENANT = 'tid-a'
const CLIENT_ID = 'client-1'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (t: string) => holder.from!(t) },
}))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner', userId: 'u1' },
    error: null,
  })),
}))
const auditMock = vi.hoisted(() => vi.fn(async () => ({ success: true })))
vi.mock('@/lib/audit', () => ({ audit: auditMock }))

import { POST } from './route'

function seed() {
  return {
    clients: [{ id: CLIENT_ID, tenant_id: CTX_TENANT }],
    client_contacts: [
      { id: 'ct-a', tenant_id: CTX_TENANT, client_id: CLIENT_ID, name: 'Alice A', phone_e164: '+15550000001', email: 'alice@a.test', is_primary: true, receives_sms: false, receives_email: false },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  auditMock.mockClear()
})

function ctx(id: string) {
  return { params: Promise.resolve({ id }) }
}

function req(body: Record<string, unknown>) {
  return new Request('http://t/api/clients/client-1/contacts', { method: 'POST', body: JSON.stringify(body) })
}

describe('POST /api/clients/[id]/contacts — duplicate guardrail', () => {
  it('merges into the existing contact instead of creating a duplicate when phone matches', async () => {
    const res = await POST(req({ name: 'Alice Updated', phone: '5550000001', role: 'spouse' }), ctx(CLIENT_ID))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.merged).toBe(true)
    expect(body.id).toBe('ct-a')
    expect(h.seed.client_contacts).toHaveLength(1) // no new row created
    expect(h.seed.client_contacts[0].name).toBe('Alice Updated')
    expect(h.seed.client_contacts[0].role).toBe('spouse')
    expect(auditMock).toHaveBeenCalledWith(expect.objectContaining({
      action: 'client_contact.duplicate_merged',
      details: expect.objectContaining({ matchedOn: 'phone' }),
    }))
  })

  it('merges into the existing contact instead of creating a duplicate when email matches', async () => {
    const res = await POST(req({ name: 'Alice Again', email: 'alice@a.test' }), ctx(CLIENT_ID))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.merged).toBe(true)
    expect(h.seed.client_contacts).toHaveLength(1)
  })

  it('creates a genuinely new contact when neither phone nor email matches', async () => {
    const res = await POST(req({ name: 'Different Person', phone: '5559999999', email: 'diff@b.test' }), ctx(CLIENT_ID))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.merged).toBeUndefined()
    expect(h.seed.client_contacts).toHaveLength(2)
  })
})
