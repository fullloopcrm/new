import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — GET /api/admin/comhub/contacts/[id]/context (tenantDb).
 *
 * The contact (and its enriched client/bookings) is read through tenantDb
 * (`.eq('tenant_id', ctx)`), so a contact owned by another tenant 404s and none
 * of its linked client PII / booking history is returned. Probe seeds a contact
 * per tenant and asserts the foreign one is invisible.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))
vi.mock('@/lib/tenant', () => ({ getCurrentTenantId: vi.fn(async () => A) }))

import { GET } from './route'

function seed() {
  return {
    // client_id pre-linked so the phone/email ilike fallback lookups are skipped.
    comhub_contacts: [
      { id: 'ct-a', tenant_id: A, name: 'A', phone: '5551110000', email: 'a@x.com', client_id: 'cli-a', team_member_id: null },
      { id: 'ct-b', tenant_id: B, name: 'B', phone: '5559990000', email: 'b@x.com', client_id: 'cli-b', team_member_id: null },
    ],
    clients: [
      { id: 'cli-a', tenant_id: A, name: 'A client', email: 'a@x.com', phone: '5551110000', status: 'active' },
      { id: 'cli-b', tenant_id: B, name: 'B client', email: 'b@x.com', phone: '5559990000', status: 'active' },
    ],
    bookings: [] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

const params = (id: string) => ({ params: Promise.resolve({ id }) })

describe('admin/comhub/contacts/[id]/context GET — tenant isolation', () => {
  it("positive control: the caller's own contact returns its linked client", async () => {
    const res = await GET(new NextRequest('http://t/x'), params('ct-a'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.contact.id).toBe('ct-a')
    expect(body.client.id).toBe('cli-a')
  })

  it("wrong-tenant probe: a foreign contact 404s — no client PII leaks", async () => {
    const res = await GET(new NextRequest('http://t/x'), params('ct-b'))
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('contact not found')
  })
})
