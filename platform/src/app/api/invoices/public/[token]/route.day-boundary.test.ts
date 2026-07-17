/**
 * GET /api/invoices/public/[token] -- the overdue check parsed `due_date` (a
 * DATE column, calendar day only, meant in the business's local ET terms) via
 * `new Date(due_date) < new Date()`. Date-only ISO strings parse as UTC
 * midnight, so an invoice went "overdue" as soon as UTC crossed midnight of
 * the due date -- which in ET is 8pm the EVENING BEFORE (EDT) / 7pm (EST).
 * A customer could see "Overdue" on an invoice up to ~28h before the due date
 * had even fully elapsed in ET, sometimes before the due date had even
 * started.
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
vi.mock('@/lib/invoice', () => ({ logInvoiceEvent: vi.fn(async () => {}) }))

import { GET } from './route'

const TOKEN = 'tok-inv-1'
const getReq = () => new Request(`http://acme.example.com/api/invoices/public/${TOKEN}`)
const params = { params: Promise.resolve({ token: TOKEN }) }

const realTZ = process.env.TZ

const baseInvoice = {
  id: 'inv-1',
  tenant_id: 'tenant-A',
  public_token: TOKEN,
  status: 'sent',
  invoice_number: 'INV-1',
  view_count: 0,
  first_viewed_at: null,
  'tenants.status': 'active',
  tenants: { name: 'Acme', slug: 'acme', domain: null, phone: null, email: null, logo_url: null, primary_color: null, status: 'active' },
}

beforeEach(() => {
  h.seq = 0
  h.store = { invoices: [{ ...baseInvoice }] }
})

afterEach(() => {
  if (realTZ === undefined) delete process.env.TZ
  else process.env.TZ = realTZ
  vi.useRealTimers()
})

describe('GET /api/invoices/public/[token] -- overdue check uses ET calendar day, not UTC-midnight parse', () => {
  it('an invoice due "2026-07-17" is NOT overdue at 9pm ET the evening before (still 2026-07-16 in ET)', async () => {
    h.store.invoices[0].due_date = '2026-07-17'
    // 9pm EDT July 16 = 01:00 UTC July 17 -- UTC has already crossed midnight
    // of the due date, but it's still July 16 evening in ET.
    process.env.TZ = 'UTC'
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-17T01:00:00.000Z'))

    const res = await GET(getReq(), params)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.invoice.status).not.toBe('overdue')
    expect(h.store.invoices[0].status).not.toBe('overdue')
  })

  it('an invoice due "2026-07-17" correctly goes overdue once ET has moved past it (regression control)', async () => {
    h.store.invoices[0].due_date = '2026-07-17'
    // 2026-07-19, well past the due date in ET.
    process.env.TZ = 'UTC'
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-19T14:00:00.000Z'))

    const res = await GET(getReq(), params)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.invoice.status).toBe('overdue')
    expect(h.store.invoices[0].status).toBe('overdue')
  })
})
