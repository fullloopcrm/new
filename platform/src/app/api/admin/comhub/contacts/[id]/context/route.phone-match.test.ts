/**
 * GET /api/admin/comhub/contacts/[id]/context -- fuzzy phone-substring
 * cross-client/cross-team-member misattribution.
 *
 * The client/team_member auto-link lookups used
 * `.ilike('phone', '%<last-10-digits>%')` with NO length floor at all -- a
 * short/malformed inbound contact phone would substring-match an ARBITRARY
 * unrelated client/team_member in this tenant, and the mismatch gets
 * PERSISTED onto comhub_contacts.client_id/team_member_id, misattributing
 * every future message on this contact (plus this endpoint's booking
 * history/spend/PII response) to the wrong person. Same bug class already
 * fixed elsewhere (ingest/lead, client/collect, /api/contact, etc.).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const CONTACT = {
  id: 'contact-1',
  tenant_id: 'tenant-1',
  name: 'Inbound Contact',
  phone: null as string | null,
  email: null as string | null,
  client_id: null as string | null,
  team_member_id: null as string | null,
}

const UNRELATED_CLIENT = { id: 'unrelated-client-1', tenant_id: 'tenant-1', phone: '12125551234' }

let contact: typeof CONTACT
let clients: (typeof UNRELATED_CLIENT)[]
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

// Filters `clients`/`team_members` on every `.eq()` applied.
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
        if (table === 'clients') return scopedChain(clients)
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

function req(): NextRequest {
  return new NextRequest('https://app.fullloop.example/api/admin/comhub/contacts/contact-1/context')
}

describe('GET /api/admin/comhub/contacts/[id]/context — phone auto-link match', () => {
  beforeEach(() => {
    contact = { ...CONTACT }
    clients = [{ ...UNRELATED_CLIENT }]
    contactUpdates = []
  })

  it('does NOT link to an unrelated client via a single-digit contact phone', async () => {
    contact.phone = '1'
    const res = await GET(req(), { params: Promise.resolve({ id: 'contact-1' }) })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.client).toBeNull()
    expect(contactUpdates).toHaveLength(0)
  })

  it('does NOT link to an unrelated client via a malformed 7-digit phone substring', async () => {
    contact.phone = '5551234'
    const res = await GET(req(), { params: Promise.resolve({ id: 'contact-1' }) })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.client).toBeNull()
    expect(contactUpdates).toHaveLength(0)
  })

  it('CONTROL: still links when the contact phone exactly matches the existing client (10-digit national number)', async () => {
    contact.phone = '2125551234'
    const res = await GET(req(), { params: Promise.resolve({ id: 'contact-1' }) })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.client?.id).toBe(UNRELATED_CLIENT.id)
    expect(contactUpdates).toHaveLength(1)
    expect(contactUpdates[0].client_id).toBe(UNRELATED_CLIENT.id)
  })
})
