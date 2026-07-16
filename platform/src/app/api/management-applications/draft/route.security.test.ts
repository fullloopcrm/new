import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * management-applications draft — cross-applicant / cross-tenant probe.
 *
 * BUG (fixed here): the draft row was keyed by (tenant_id, ip_address,
 * position) alone. Any two applicants sharing a public IP (mobile-carrier
 * CGNAT, office/campus NAT, coffee-shop wifi, VPN exit node) collided on the
 * same row — GET returned the OTHER applicant's name/email/phone/references
 * plus their uploaded photo/video, and POST/DELETE could overwrite or wipe
 * their in-progress draft.
 *
 * FIX: key on an opaque client_id supplied by the caller (validated against
 * CLIENT_ID_RE) instead of the raw IP wherever one is given; IP remains the
 * fallback only when no client_id is supplied (JS-disabled edge case,
 * matching prior behavior — not a new gap since that was already the
 * pre-fix reality for every caller).
 */

const TENANT_A = 'tid-a'
const TENANT_B = 'tid-b'
const SAME_IP = '203.0.113.7' // shared CGNAT-style IP for both applicants

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const tenantHolder = vi.hoisted(() => ({ tenant: null as null | { id: string } }))
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => tenantHolder.tenant),
}))

import { NextRequest } from 'next/server'
import { GET, POST, DELETE } from './route'

function seed() {
  return {
    management_application_drafts: [
      {
        id: 'draft-1',
        tenant_id: TENANT_A,
        ip_address: 'client-applicant-one', // applicant 1's client_id
        position: 'operations-coordinator',
        form_data: { name: 'Applicant One', email: 'one@example.com' },
        photo_url: 'https://cdn/one.jpg',
        video_url: null,
        updated_at: new Date().toISOString(),
      },
      {
        id: 'draft-legacy',
        tenant_id: TENANT_A,
        ip_address: SAME_IP, // legacy IP-keyed row (pre-fix / JS-disabled path)
        position: 'operations-coordinator',
        form_data: { name: 'Legacy IP Applicant', email: 'legacy@example.com' },
        photo_url: null,
        video_url: null,
        updated_at: new Date().toISOString(),
      },
    ],
    rate_limit_events: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  tenantHolder.tenant = { id: TENANT_A }
})

function getReq(qs: string, headers: Record<string, string> = {}) {
  return new NextRequest(`http://t/api/management-applications/draft?${qs}`, { headers })
}

function postReq(body: Record<string, unknown>) {
  return new NextRequest('http://t/api/management-applications/draft', {
    method: 'POST',
    headers: { 'x-forwarded-for': SAME_IP },
    body: JSON.stringify(body),
  })
}

function deleteReq(qs: string) {
  return new NextRequest(`http://t/api/management-applications/draft?${qs}`, {
    method: 'DELETE',
  })
}

describe('draft GET — cross-applicant probe (same IP, different client_id)', () => {
  it("applicant 2 sharing applicant 1's IP does NOT see applicant 1's draft when using their own client_id", async () => {
    const res = await GET(getReq('position=operations-coordinator&client_id=client-applicant-two'))
    const body = await res.json()
    expect(body.draft).toBeNull()
  })

  it('applicant 1 sees their own draft via their own client_id', async () => {
    const res = await GET(getReq('position=operations-coordinator&client_id=client-applicant-one'))
    const body = await res.json()
    expect(body.draft?.form_data?.email).toBe('one@example.com')
  })

  it('WRONG-TENANT PROBE: same client_id under a different tenant sees nothing', async () => {
    tenantHolder.tenant = { id: TENANT_B }
    const res = await GET(getReq('position=operations-coordinator&client_id=client-applicant-one'))
    const body = await res.json()
    expect(body.draft).toBeNull()
  })

  it('legacy fallback: no client_id supplied keys by IP (pre-existing weaker behavior, unchanged)', async () => {
    const res = await GET(getReq('position=operations-coordinator', { 'x-forwarded-for': SAME_IP }))
    const body = await res.json()
    expect(body.draft?.form_data?.email).toBe('legacy@example.com')
  })
})

describe('draft POST/DELETE — client_id scoping', () => {
  it('POST with a client_id never overwrites another applicant\'s row sharing the same IP', async () => {
    const res = await POST(
      postReq({
        form_data: { name: 'Applicant Two', email: 'two@example.com' },
        position: 'operations-coordinator',
        client_id: 'client-applicant-two',
      })
    )
    expect(res.status).toBe(200)

    const rows = h.seed.management_application_drafts
    const one = rows.find((r) => r.ip_address === 'client-applicant-one')
    expect(one?.form_data?.email).toBe('one@example.com') // untouched

    const two = rows.find((r) => r.ip_address === 'client-applicant-two')
    expect(two?.form_data?.email).toBe('two@example.com')
  })

  it("DELETE with applicant 2's client_id does not delete applicant 1's draft", async () => {
    const res = await DELETE(deleteReq('position=operations-coordinator&client_id=client-applicant-two'))
    expect(res.status).toBe(200)
    const one = h.seed.management_application_drafts.find((r) => r.ip_address === 'client-applicant-one')
    expect(one).toBeDefined()
  })
})
