import { describe, it, expect, vi } from 'vitest'

/**
 * getClientProfile() used `.ilike('phone', '%<last-10-digits>%')` with NO
 * length floor -- a short/garbage phone (e.g. a single digit typed into the
 * public web-chat widget) could substring-match an ARBITRARY unrelated
 * client and leak their name/address/email/notes/booking history straight
 * into the AI's CLIENT PROFILE context. Same bug class already fixed in
 * platform/src/lib/selena-legacy.ts's getClientProfile.
 */

const UNRELATED_CLIENT = { id: 'unrelated-client-1', name: 'Unrelated Real Client', phone: '2125551234' }

const h = vi.hoisted(() => {
  function makeBuilder(table: string) {
    let ilikePattern: RegExp | null = null
    const rows = () => {
      if (table !== 'clients') return []
      const all = [{ ...UNRELATED_CLIENT }]
      return ilikePattern ? all.filter((c) => ilikePattern!.test(c.phone)) : all
    }
    const builder: Record<string, unknown> = {}
    Object.assign(builder, {
      select: () => builder,
      eq: () => builder,
      in: () => builder,
      not: () => builder,
      order: () => builder,
      ilike: (_col: string, pattern: string) => {
        const inner = pattern.replace(/^%|%$/g, '')
        ilikePattern = new RegExp(inner.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
        return builder
      },
      limit: () => builder,
      single: () => Promise.resolve({ data: rows()[0] || null, error: null }),
      then: (resolve: (v: unknown) => unknown) => resolve({ data: rows(), error: null, count: 0 }),
    })
    return builder
  }
  const supabaseAdmin = { from: (table: string) => makeBuilder(table) }
  return { supabaseAdmin }
})

vi.mock('@/app/site/wash-and-fold-hoboken/_lib/supabase', () => ({ supabaseAdmin: h.supabaseAdmin }))
vi.mock('@/app/site/wash-and-fold-hoboken/_lib/availability', () => ({
  checkAvailability: vi.fn(), getSmartSuggestions: vi.fn(), checkCleanerAvailability: vi.fn(),
}))
vi.mock('@/app/site/wash-and-fold-hoboken/_lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@anthropic-ai/sdk', () => ({ default: class {} }))

import { getClientProfile } from './selena'

describe('getClientProfile — phone match floor', () => {
  it('does NOT match an unrelated client via a malformed 1-digit phone', async () => {
    const result = JSON.parse(await getClientProfile('1'))
    expect(result.error).toBe('Client not found')
    expect(result.name).toBeUndefined()
  })

  it('CONTROL: still finds the client on an exact 10-digit match', async () => {
    const result = JSON.parse(await getClientProfile('2125551234'))
    expect(result.name).toBe(UNRELATED_CLIENT.name)
  })
})
