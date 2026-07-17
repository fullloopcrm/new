/**
 * GET /api/quotes/public/[token] -- the expiration check parsed `valid_until`
 * (a DATE column, calendar day only, meant in the business's local ET terms)
 * via `new Date(valid_until) < new Date()`. Date-only ISO strings parse as
 * UTC midnight, so a quote went "expired" as soon as UTC crossed midnight of
 * valid_until -- which in ET is 8pm the EVENING BEFORE (EDT) / 7pm (EST). A
 * customer could see "Expired" on a quote up to ~28h before valid_until had
 * even fully elapsed in ET, sometimes before valid_until had even started --
 * blocking a real, still-valid quote acceptance.
 *
 * Forces `process.env.TZ = 'UTC'` (same technique as
 * deals/at-risk/route.naive-et.test.ts) to simulate Vercel's actual runtime --
 * this sandbox's own local TZ (America/New_York) would otherwise make the OLD
 * buggy code accidentally behave correctly by coincidence.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))

vi.mock('@/lib/supabase', () => {
  const fake = makeSupabaseFake(h, { detachReads: true })
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/quote', () => ({ logQuoteEvent: vi.fn(async () => {}) }))

import { GET } from './route'

const TOKEN = 'tok-quote-1'
const getReq = () => new Request(`http://acme.example.com/api/quotes/public/${TOKEN}`)
const params = { params: Promise.resolve({ token: TOKEN }) }

const realTZ = process.env.TZ

const baseQuote = {
  id: 'q1',
  tenant_id: 'tenant-A',
  public_token: TOKEN,
  status: 'sent',
  quote_number: 'Q-1',
  view_count: 0,
  first_viewed_at: null,
  'tenants.status': 'active',
  tenants: { name: 'Acme', slug: 'acme', domain: null, phone: null, email: null, address: null, logo_url: null, primary_color: null, status: 'active' },
}

beforeEach(() => {
  h.seq = 0
  h.store = { quotes: [{ ...baseQuote }] }
})

afterEach(() => {
  if (realTZ === undefined) delete process.env.TZ
  else process.env.TZ = realTZ
  vi.useRealTimers()
})

describe('GET /api/quotes/public/[token] -- expiration check uses ET calendar day, not UTC-midnight parse', () => {
  it('a quote valid_until "2026-07-17" is NOT expired at 9pm ET the evening before (still 2026-07-16 in ET)', async () => {
    h.store.quotes[0].valid_until = '2026-07-17'
    // 9pm EDT July 16 = 01:00 UTC July 17 -- UTC has already crossed midnight
    // of valid_until, but it's still July 16 evening in ET.
    process.env.TZ = 'UTC'
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-17T01:00:00.000Z'))

    const res = await GET(getReq(), params)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.quote.status).not.toBe('expired')
    expect(h.store.quotes[0].status).not.toBe('expired')
  })

  it('a quote valid_until "2026-07-17" correctly expires once ET has moved past it (regression control)', async () => {
    h.store.quotes[0].valid_until = '2026-07-17'
    // 2026-07-19, well past valid_until in ET.
    process.env.TZ = 'UTC'
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-19T14:00:00.000Z'))

    const res = await GET(getReq(), params)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.quote.status).toBe('expired')
    expect(h.store.quotes[0].status).toBe('expired')
  })
})
