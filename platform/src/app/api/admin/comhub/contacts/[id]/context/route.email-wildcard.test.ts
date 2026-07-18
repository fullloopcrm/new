/**
 * GET /api/admin/comhub/contacts/[id]/context -- email LIKE-wildcard
 * cross-client/cross-team-member misattribution.
 *
 * Same misattribution class the file's own phone-match fix already covers
 * (route.phone-match.test.ts): the client/team_member auto-link lookups used
 * `.ilike('email', contact.email)` with NO escaping. `contact.email`
 * traces back to an inbound sender address (e.g. comhub-email's IMAP poll,
 * attacker-influenceable -- SMTP doesn't authenticate From), so a crafted
 * `%`/`_` in it would substring/wildcard-match an ARBITRARY unrelated
 * client/team_member in this tenant instead of failing to match, and the
 * mismatch gets PERSISTED onto comhub_contacts.client_id/team_member_id --
 * misattributing every future message on this contact (plus this endpoint's
 * booking history/spend/PII response) to the wrong person.
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

const UNRELATED_CLIENT = { id: 'unrelated-client-1', tenant_id: 'tenant-1', email: 'realclient@example.com' }

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

// Real SQL-LIKE-pattern-to-regex conversion (%, _, backslash-escape) --
// unlike route.phone-match.test.ts's scopedChain, this test needs actual
// ilike matching semantics to prove the wildcard-injection behavior, since
// the email auto-link (unlike phone) is resolved via a real DB ilike call,
// not an in-code exact-compare .find().
function likeToRegex(pattern: string): RegExp {
  let re = ''
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i]
    if (c === '\\' && i + 1 < pattern.length) {
      re += pattern[++i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    } else if (c === '%') {
      re += '.*'
    } else if (c === '_') {
      re += '.'
    } else {
      re += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }
  }
  return new RegExp(`^${re}$`, 'i')
}

// Filters `clients`/`team_members` on every `.eq()`/`.ilike()` applied.
function scopedChain(rows: Record<string, unknown>[]) {
  let filtered = rows
  const q: Record<string, unknown> = {
    eq: (col: string, val: unknown) => {
      filtered = filtered.filter((r) => r[col] === val)
      return q
    },
    ilike: (col: string, pattern: string) => {
      const re = likeToRegex(pattern)
      filtered = filtered.filter((r) => typeof r[col] === 'string' && re.test(r[col] as string))
      return q
    },
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

describe('GET /api/admin/comhub/contacts/[id]/context — email auto-link LIKE-wildcard escaping', () => {
  beforeEach(() => {
    contact = { ...CONTACT }
    clients = [{ ...UNRELATED_CLIENT }]
    contactUpdates = []
  })

  it('does NOT link to an unrelated client via a bare "%" contact email', async () => {
    contact.email = '%'
    const res = await GET(req(), { params: Promise.resolve({ id: 'contact-1' }) })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.client).toBeNull()
    expect(contactUpdates).toHaveLength(0)
  })

  it('does NOT link to an unrelated client via a "_"-wildcard contact email', async () => {
    contact.email = 'realclient_example.com' // "_" matches any single char, would hit the "@"
    const res = await GET(req(), { params: Promise.resolve({ id: 'contact-1' }) })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.client).toBeNull()
    expect(contactUpdates).toHaveLength(0)
  })

  it('CONTROL: still links when the contact email exactly matches the existing client (case-insensitive)', async () => {
    contact.email = 'RealClient@Example.com'
    const res = await GET(req(), { params: Promise.resolve({ id: 'contact-1' }) })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.client?.id).toBe(UNRELATED_CLIENT.id)
    expect(contactUpdates).toHaveLength(1)
    expect(contactUpdates[0].client_id).toBe(UNRELATED_CLIENT.id)
  })
})
