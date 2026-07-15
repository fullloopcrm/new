/**
 * GET/POST /api/client/check — phone endsWith cross-client PII disclosure regression.
 *
 * findClient()'s phone-match previously used `cDigits.endsWith(digits) ||
 * digits.endsWith(cDigits)`. That let a caller who only knew (or guessed) a
 * partial phone number resolve to an UNRELATED client whose full stored
 * number merely ended with it, disclosing that client's name/phone/email to
 * an anonymous, unauthenticated caller. Same bug class already fixed in the
 * sibling verify-code phone lookup (p1-w2 8fc5f304) via exact national-number
 * comparison (last-10-digits, normalizing a leading US "1") — this route had
 * the identical unfixed pattern.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const PHONE_VICTIM = {
  id: 'phone-victim-1',
  tenant_id: 'tenant-1',
  name: 'Phone Victim',
  email: 'phonevictim@example.com',
  // 11 digits, leading "9" (not a US country-code "1") — a genuinely
  // different national number that merely ENDS WITH the attacker-supplied
  // 10-digit number below.
  phone: '92125551234',
}
const ATTACKER_PHONE = '2125551234'

let clients: (typeof PHONE_VICTIM)[] = []

function clientsTable() {
  const state: { eqs: Record<string, unknown>; ilike?: { col: string; val: string } } = { eqs: {} }
  const builder = {
    select: () => builder,
    eq(col: string, val: unknown) {
      state.eqs[col] = val
      return builder
    },
    ilike(col: string, val: string) {
      state.ilike = { col, val }
      return builder
    },
    maybeSingle: async () => {
      if (!state.ilike) return { data: null, error: null }
      const rows = clients.filter((c) => c.tenant_id === state.eqs.tenant_id)
      const row = rows.find((c) => c.email.toLowerCase() === state.ilike!.val.toLowerCase()) || null
      return { data: row, error: null }
    },
    then: (resolve: (r: { data: (typeof PHONE_VICTIM)[] | null; error: null }) => void) => {
      const rows = clients.filter((c) => c.tenant_id === state.eqs.tenant_id)
      resolve({ data: rows, error: null })
    },
  }
  return builder
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'clients') return clientsTable()
      throw new Error(`unexpected table ${table}`)
    },
  },
}))
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({ id: 'tenant-1' })),
}))
vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: vi.fn(async () => ({ allowed: true, remaining: 10 })),
}))

import { GET } from './route'

function getWithInput(input: string) {
  return GET(new NextRequest(`http://x/api/client/check?input=${encodeURIComponent(input)}`))
}

beforeEach(() => {
  vi.clearAllMocks()
  clients = [{ ...PHONE_VICTIM }]
})

describe('GET /api/client/check -- phone endsWith cross-client disclosure', () => {
  it('a caller who supplies only a 10-digit suffix cannot resolve an unrelated client whose stored number merely ends with it', async () => {
    const res = await getWithInput(ATTACKER_PHONE)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.exists).toBe(false)
    expect(json.name).toBeNull()
    expect(json.phone).toBeNull()
    expect(json.email).toBeNull()
  })

  it('positive control: an 11-digit stored number with a leading US "1" still matches its 10-digit national number', async () => {
    const usFormatVictim = { ...PHONE_VICTIM, id: 'us-format-victim', phone: `1${ATTACKER_PHONE}`, email: 'usformat@example.com' }
    clients.push(usFormatVictim)

    const res = await getWithInput(ATTACKER_PHONE)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.exists).toBe(true)
    expect(json.email).toBe('usformat@example.com')
  })

  it('positive control: exact email match still resolves the real client', async () => {
    const res = await getWithInput('phonevictim@example.com')
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.exists).toBe(true)
    expect(json.name).toBe('Phone Victim')
  })
})
