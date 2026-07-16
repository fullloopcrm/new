/**
 * GET /api/admin/comhub/contacts/[id]/context -- forged cross-site GET must
 * not trigger the auto-link WRITE.
 *
 * admin_token is SameSite=Lax (documented in admin-auth/route.ts: 'strict'
 * would break the cross-domain admin login redirect chain), so it is still
 * attached on a cross-site top-level GET navigation -- a forged link could
 * trick an already-logged-in admin into loading this URL and firing the
 * client_id/team_member_id auto-link write. Same guard convention already
 * applied to notifications, admin/tenant-chats, dashboard/messages, and
 * connect/messages (isCrossSiteRequest / Sec-Fetch-Site).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const CONTACT = {
  id: 'contact-1',
  tenant_id: 'tenant-1',
  name: 'Inbound Contact',
  phone: '2125551234',
  email: null as string | null,
  client_id: null as string | null,
  team_member_id: null as string | null,
}

const MATCHING_CLIENT = { id: 'client-1', tenant_id: 'tenant-1', phone: '12125551234' }

let contact: typeof CONTACT
let contactUpdates: Record<string, unknown>[] = []

vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))
vi.mock('@/lib/tenant', () => ({ getCurrentTenantId: vi.fn(async () => 'tenant-1') }))

function chain(result: { data: unknown; error?: unknown; count?: number }) {
  const q: Record<string, unknown> = {
    eq: () => q,
    ilike: () => q,
    limit: () => q,
    order: () => q,
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    select: () => q,
    then: (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve),
  }
  return q
}

function scopedChain(rows: Record<string, unknown>[]) {
  let filtered = rows
  const q: Record<string, unknown> = {
    eq: (col: string, val: unknown) => {
      filtered = filtered.filter((r) => r[col] === val)
      return q
    },
    ilike: () => q,
    limit: () => q,
    order: () => q,
    single: () => Promise.resolve({ data: filtered[0] ?? null, error: filtered[0] ? null : new Error('not found') }),
    maybeSingle: () => Promise.resolve({ data: filtered[0] ?? null, error: null }),
    select: () => q,
    then: (resolve: (v: unknown) => void) => Promise.resolve({ data: filtered, error: null }).then(resolve),
  }
  return q
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: () => {
        if (table === 'comhub_contacts') return chain({ data: contact, error: contact ? null : new Error('not found') })
        if (table === 'clients') return scopedChain([{ ...MATCHING_CLIENT }])
        if (table === 'team_members') return scopedChain([])
        if (table === 'bookings') return chain({ data: [], count: 0 })
        return chain({ data: null })
      },
      update: (patch: Record<string, unknown>) => {
        contactUpdates.push(patch)
        return { eq: () => Promise.resolve({ data: null, error: null }) }
      },
    }),
  },
}))

import { GET } from './route'

function req(secFetchSite?: string): NextRequest {
  const headers = secFetchSite ? { 'sec-fetch-site': secFetchSite } : undefined
  return new NextRequest('https://app.fullloop.example/api/admin/comhub/contacts/contact-1/context', { headers })
}

describe('GET /api/admin/comhub/contacts/[id]/context — cross-site GET write guard', () => {
  beforeEach(() => {
    contact = { ...CONTACT }
    contactUpdates = []
  })

  it('does NOT persist the auto-link write on a forged cross-site GET', async () => {
    const res = await GET(req('cross-site'), { params: Promise.resolve({ id: 'contact-1' }) })
    const json = await res.json()
    expect(res.status).toBe(200)
    // Response body still resolves the match for display...
    expect(json.client?.id).toBe(MATCHING_CLIENT.id)
    // ...but the write to comhub_contacts is skipped.
    expect(contactUpdates).toHaveLength(0)
  })

  it('CONTROL: persists the auto-link write on a genuine same-site GET', async () => {
    const res = await GET(req('same-origin'), { params: Promise.resolve({ id: 'contact-1' }) })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.client?.id).toBe(MATCHING_CLIENT.id)
    expect(contactUpdates).toHaveLength(1)
    expect(contactUpdates[0].client_id).toBe(MATCHING_CLIENT.id)
  })

  it('CONTROL: persists the write when Sec-Fetch-Site is absent (old browser / non-browser client, "can\'t tell")', async () => {
    const res = await GET(req(), { params: Promise.resolve({ id: 'contact-1' }) })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.client?.id).toBe(MATCHING_CLIENT.id)
    expect(contactUpdates).toHaveLength(1)
  })
})
