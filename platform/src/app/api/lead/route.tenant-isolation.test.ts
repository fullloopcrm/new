import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * /api/lead — public lead capture (converted to tenantDb, P1/W2 c).
 *
 * Tenant is resolved once from the request Host header (getTenantFromHeaders)
 * and every subsequent clients/portal_leads/deals/deal_activities/
 * team_applications operation now goes through tenantDb(tenant.id) instead of
 * bare supabaseAdmin + hand-written .eq('tenant_id', …) filters.
 *
 * Wrong-tenant probe: two different tenants each have a client with the SAME
 * phone number (a real-world collision — the same person submitted a form on
 * two different tenant sites, or two customers share a forwarded number). A
 * lead submitted on tenant A's site must dedupe/update ONLY tenant A's client
 * row — tenant B's identically-phoned row must never be read or written.
 */

const TENANT_A = { id: 'tid-a', name: 'Acme A', slug: 'acme-a', domain: null, primary_color: null, logo_url: null, resend_api_key: null, email: null, email_from: null, phone: null, address: null }
const PHONE = '2125551234'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => TENANT_A,
  tenantSiteUrl: () => 'https://acme-a.example.com',
}))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true, remaining: 5 })) }))
vi.mock('@/lib/admin-contacts', () => ({ emailAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/comms-prefs', () => ({ isCommEnabled: vi.fn(async () => false) }))
vi.mock('@/lib/error-tracking', () => ({ trackError: vi.fn(async () => {}) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => {}) }))

import { POST } from './route'

function seed() {
  return {
    clients: [
      { id: 'c-a', tenant_id: 'tid-a', name: 'Old A', phone: PHONE, email: null, notes: null, active: false, status: 'lead' },
      { id: 'c-b', tenant_id: 'tid-b', name: 'Old B', phone: PHONE, email: null, notes: null, active: false, status: 'lead' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function post(body: unknown) {
  return POST(
    new Request('http://acme-a.example.com/api/lead', {
      method: 'POST',
      body: JSON.stringify(body),
    }) as unknown as import('next/server').NextRequest,
  )
}

describe('POST /api/lead — tenant isolation (tenantDb)', () => {
  it("positive control: dedupes and updates tenant A's own client by phone", async () => {
    const res = await post({ name: 'New Name', phone: '212-555-1234', email: 'new@example.com' })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.client_id).toBe('c-a')
    expect(h.seed.clients.find((c) => c.id === 'c-a')!.name).toBe('New Name')
  })

  it("wrong-tenant probe: a phone collision with tenant B's client never reads or writes tenant B's row", async () => {
    await post({ name: 'New Name', phone: '212-555-1234', email: 'new@example.com' })

    // Tenant B's identically-phoned client is untouched.
    const tenantBClient = h.seed.clients.find((c) => c.id === 'c-b')!
    expect(tenantBClient.name).toBe('Old B')
    expect(tenantBClient.active).toBe(false)
    expect(h.capture.updates.every((u) => u.table !== 'clients' || u.matched.every((m) => m.id !== 'c-b'))).toBe(true)

    // Every row this request inserted is stamped for tenant A, never tenant B.
    for (const ins of h.capture.inserts) {
      for (const row of ins.rows) {
        expect(row.tenant_id).toBe('tid-a')
      }
    }
  })
})
