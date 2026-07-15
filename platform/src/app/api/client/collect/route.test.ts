/**
 * POST /api/client/collect -- fuzzy phone-substring cross-client overwrite.
 *
 * The existing-client lookup previously used `.ilike('phone', '%<last-10-
 * digits>%')` with no minimum-length guard. A short/malformed phone (e.g.
 * "5" -> ilike.%5%) matched an ARBITRARY unrelated client in the same
 * tenant, and the route then WROTE the submitter's name/email/address/notes
 * onto that unrelated client's row -- same bug class already fixed in
 * client/check + verify-code's phone lookup, but this instance corrupts
 * data instead of just leaking a read.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const UNRELATED_CLIENT = {
  id: 'unrelated-client-1',
  tenant_id: 'tenant-1',
  name: 'Unrelated Existing Client',
  email: 'unrelated@example.com',
  phone: '12125559999',
  status: 'active',
}

let clients: (typeof UNRELATED_CLIENT)[] = []
let updateCalls: { id: string; patch: Record<string, unknown> }[] = []
let insertCalls: Record<string, unknown>[] = []

function clientsTable() {
  const state: { eqs: Record<string, unknown>; orIlike?: RegExp[] } = { eqs: {} }
  const builder = {
    select: () => builder,
    eq(col: string, val: unknown) {
      state.eqs[col] = val
      return builder
    },
    // Simulates PostgREST .or(`phone.ilike.%x%,...`) against a real ilike
    // substring match, so pre-fix (vulnerable) code exercises the same
    // substring-match bug it has in production, not just a missing-method error.
    or(filter: string) {
      state.orIlike = filter.split(',').map(clause => {
        const m = clause.match(/ilike\.%(.*)%$/)
        return new RegExp(m ? m[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '$^', 'i')
      })
      return builder
    },
    limit(n: number) {
      const lim = {
        then: (resolve: (r: { data: (typeof UNRELATED_CLIENT)[] | null; error: null }) => void) => {
          let rows = clients.filter(c => c.tenant_id === state.eqs.tenant_id)
          if (state.orIlike) {
            rows = rows.filter(c => state.orIlike!.some(re => re.test(c.phone || '')))
          }
          resolve({ data: rows.slice(0, n), error: null })
        },
      }
      return lim
    },
    update(patch: Record<string, unknown>) {
      const upd = {
        eq(col: string, val: unknown) {
          state.eqs[col] = val
          return upd
        },
        select: () => upd,
        single: async () => {
          const row = clients.find(c => c.id === state.eqs.id && c.tenant_id === state.eqs.tenant_id)
          if (!row) return { data: null, error: new Error('not found') }
          updateCalls.push({ id: row.id, patch })
          return { data: { ...row, ...patch }, error: null }
        },
      }
      return upd
    },
    insert(row: Record<string, unknown>) {
      insertCalls.push(row)
      const ins = {
        select: () => ins,
        single: async () => ({ data: { id: 'new-client-1', ...row }, error: null }),
      }
      return ins
    },
    then: (resolve: (r: { data: (typeof UNRELATED_CLIENT)[] | null; error: null }) => void) => {
      const rows = clients.filter(c => c.tenant_id === state.eqs.tenant_id)
      resolve({ data: rows, error: null })
    },
  }
  return builder
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'clients') return clientsTable()
      if (table === 'referrers') return { select: () => ({ eq: () => ({ eq: () => ({ ilike: () => ({ limit: async () => ({ data: [] }) }) }) }) }) }
      if (table === 'sms_conversations') return { update: () => ({ eq: () => ({ eq: async () => ({ data: null, error: null }) }) }) }
      throw new Error(`unexpected table ${table}`)
    },
  },
}))
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({ id: 'tenant-1', name: 'Test Tenant' })),
}))
vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: vi.fn(async () => ({ allowed: true, remaining: 10 })),
}))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/admin-contacts', () => ({ emailAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/email-templates', () => ({ adminNewClientEmail: vi.fn(() => ({ subject: 's', html: 'h' })) }))
vi.mock('@/lib/attribution', () => ({ attributeCollectForm: vi.fn(async () => {}) }))

import { POST } from './route'

function postWith(body: Record<string, unknown>) {
  return POST(new Request('http://x/api/client/collect', { method: 'POST', body: JSON.stringify(body) }))
}

beforeEach(() => {
  vi.clearAllMocks()
  clients = [{ ...UNRELATED_CLIENT }]
  updateCalls = []
  insertCalls = []
})

describe('POST /api/client/collect -- fuzzy phone-substring cross-client overwrite', () => {
  it('a short/malformed phone does not match and overwrite an unrelated existing client', async () => {
    const res = await postWith({ name: 'Attacker Submitted Name', phone: '5' })
    expect(res.status).toBe(200)
    // Must NOT have updated the unrelated client's record.
    expect(updateCalls.find(u => u.id === UNRELATED_CLIENT.id)).toBeUndefined()
    // Must have created a new client instead.
    expect(insertCalls.length).toBe(1)
    expect(insertCalls[0].name).toBe('Attacker Submitted Name')
  })

  it('positive control: exact 10-digit national-number match still updates the correct existing client', async () => {
    const res = await postWith({ name: 'Returning Client', phone: '2125559999' })
    expect(res.status).toBe(200)
    const upd = updateCalls.find(u => u.id === UNRELATED_CLIENT.id)
    expect(upd).toBeDefined()
    expect(upd?.patch.name).toBe('Returning Client')
    expect(insertCalls.length).toBe(0)
  })
})
