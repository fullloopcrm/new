import { describe, it, expect, beforeEach, vi } from 'vitest'

// Lightweight chain mock (same shape as tenant-lookup.test.ts's builder) —
// a per-test `resolve` decides what { data, error } each from().select()...
// chain resolves to. None of these queries end in .single()/.maybeSingle()
// (see the fix below), so the chain itself must be thenable.
type Eqs = Record<string, unknown>
let resolve: (table: string, eqs: Eqs) => { data: unknown; error: unknown }

function builder(table: string) {
  const eqs: Eqs = {}
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    contains: (col: string, vals: unknown[]) => {
      eqs[col] = vals
      return chain
    },
    order: () => chain,
    limit: () => chain,
    then: (onFulfilled: (r: { data: unknown; error: unknown }) => unknown, onRejected?: (e: unknown) => unknown) =>
      Promise.resolve(resolve(table, eqs)).then(onFulfilled, onRejected),
  }
  return chain
}

vi.mock('./supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

import { extractZip, getTenantDomains, getDomainsForNeighborhood, getNeighborhoodFromZip } from './domains'

beforeEach(() => {
  resolve = () => ({ data: [], error: null })
})

// extractZip is the one pure function in domains.ts (the rest hit supabaseAdmin).
// It feeds tenant_domains zip -> neighborhood routing, so its parsing behavior is
// load-bearing for lead attribution. These lock in the ACTUAL behavior so a
// refactor of the regexes can't silently change what a given address resolves to.
describe('extractZip', () => {
  it('extracts a 5-digit zip at the end of an address', () => {
    expect(extractZip('123 Main St, Brooklyn, NY 11201')).toBe('11201')
  })

  it('returns the 5-digit base when the address ends in ZIP+4', () => {
    expect(extractZip('123 Main St, Brooklyn, NY 11201-1234')).toBe('11201')
  })

  it('tolerates trailing whitespace after the zip', () => {
    expect(extractZip('123 Main St, Brooklyn, NY 11201   ')).toBe('11201')
  })

  it('prefers the trailing zip over an earlier 5-digit house number', () => {
    // House number 12345 appears first, but the real zip 10001 is at the end.
    expect(extractZip('12345 Broadway, New York, NY 10001')).toBe('10001')
  })

  it('falls back to a 5-digit run anywhere when none is at the end', () => {
    expect(extractZip('11201 Somewhere Rd, Apt 4B')).toBe('11201')
  })

  it('returns null when there is no zip', () => {
    expect(extractZip('123 Main St, Brooklyn, NY')).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(extractZip('')).toBeNull()
  })

  it('does not treat a 4-digit number as a zip', () => {
    expect(extractZip('Suite 1200, Some Building')).toBeNull()
  })

  it('does not extract 5 digits out of a longer contiguous digit run (e.g. a phone number)', () => {
    // \b(\d{5})\b cannot match inside "5551234567" — no word boundary between digits.
    expect(extractZip('Call us at 5551234567')).toBeNull()
  })

  it('KNOWN LIMITATION: a bare 5-digit house number with no real zip is read as the zip', () => {
    // Documents current fallback behavior — the second regex has no way to tell a
    // standalone house number from a zip. Asserting it so a future fix is a
    // deliberate, visible change, not an accident.
    expect(extractZip('12345 Broadway')).toBe('12345')
  })
})

// getTenantDomains/getDomainsForNeighborhood/getNeighborhoodFromZip previously
// discarded the Supabase `error` and returned an empty array / null in its
// place — identical to the genuine "tenant has no domains" / "no zip match"
// shape. attribution.ts's attributeByAddress feeds getTenantDomains() straight
// into its fallback domain pool (allDomains.filter(...)), so a transient DB
// error silently reproduced the exact "attribution never fires" failure this
// file's own migration-era bugs (ce7fbef3/e15ff591) already caused once —
// just triggered by a DB blip instead of a missing column. These lock in
// that a real error now surfaces (callers already try/catch + log it) instead
// of masquerading as "nothing found".
describe('getTenantDomains', () => {
  it('throws on a genuine DB error instead of silently returning an empty array', async () => {
    resolve = () => ({ data: null, error: { message: 'connection reset' } })
    await expect(getTenantDomains('t-1')).rejects.toThrow('TENANT_DOMAINS_LOOKUP_ERROR')
  })

  it('still returns an empty array when the tenant genuinely has no domain rows', async () => {
    resolve = () => ({ data: [], error: null })
    await expect(getTenantDomains('t-1')).resolves.toEqual([])
  })
})

describe('getDomainsForNeighborhood', () => {
  it('throws on a genuine DB error instead of silently returning an empty array', async () => {
    resolve = () => ({ data: null, error: { message: 'timeout' } })
    await expect(getDomainsForNeighborhood('t-1', 'Park Slope')).rejects.toThrow(
      'TENANT_DOMAINS_NEIGHBORHOOD_LOOKUP_ERROR'
    )
  })

  it('still returns an empty array when no domain is tagged for that neighborhood', async () => {
    resolve = () => ({ data: [], error: null })
    await expect(getDomainsForNeighborhood('t-1', 'Park Slope')).resolves.toEqual([])
  })
})

describe('getNeighborhoodFromZip', () => {
  it('throws on a genuine DB error instead of silently returning null', async () => {
    resolve = () => ({ data: null, error: { message: 'timeout' } })
    await expect(getNeighborhoodFromZip('t-1', '11201')).rejects.toThrow('TENANT_DOMAINS_ZIP_LOOKUP_ERROR')
  })

  it('still returns null when no row matches the zip (not an error)', async () => {
    resolve = () => ({ data: [], error: null })
    await expect(getNeighborhoodFromZip('t-1', '11201')).resolves.toBeNull()
  })

  it('returns the neighborhood when a row matches the zip', async () => {
    resolve = () => ({ data: [{ neighborhood: 'Park Slope' }], error: null })
    await expect(getNeighborhoodFromZip('t-1', '11201')).resolves.toBe('Park Slope')
  })
})
