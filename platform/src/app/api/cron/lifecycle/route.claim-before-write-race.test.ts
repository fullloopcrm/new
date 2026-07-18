/**
 * GET /api/cron/lifecycle — both the inactivate and reactivate UPDATEs only
 * carried `.eq('tenant_id', ...).in('id', ...)`, trusting the candidate
 * SELECT's status snapshot from several async round-trips earlier (two
 * sequential `bookings` lookups per tenant) instead of re-checking status
 * inside the write itself. A concurrent status change on the same client —
 * an admin edit via PATCH /api/clients/[id], or /api/lead + /api/ingest/lead
 * re-activating a lead — landing in that gap got silently stomped back to
 * 'inactive'/'active' by this cron.
 *
 * Fix: both UPDATEs re-assert the originating status (`.eq('status', 'active')`
 * / `.eq('status', 'inactive')`) in their own WHERE and count only the rows
 * that actually claimed via `.select('id')`.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/error-tracking', () => ({ trackError: vi.fn(async () => {}) }))

import { GET } from './route'

function req(): Request {
  return new Request('http://localhost/api/cron/lifecycle', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

// Client created well past the 30-day threshold, no bookings anywhere in the
// store -- a genuine "no recent booking" inactivate candidate at SELECT time.
const NOW = new Date('2026-07-17T18:20:00.000Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  process.env.CRON_SECRET = 'test-cron-secret'
  h.seq = 0
  h.store = {
    tenants: [{ id: 'tenant-A', name: 'Test Tenant', status: 'active' }],
    clients: [
      { id: 'c1', tenant_id: 'tenant-A', status: 'active', created_at: '2026-01-01T00:00:00.000Z' },
    ],
    bookings: [],
  }
})

afterEach(() => {
  vi.useRealTimers()
})

describe('GET /api/cron/lifecycle — status-change race', () => {
  it('does NOT flip a client to inactive if its status changed between the candidate SELECT and the UPDATE', async () => {
    // `clients` is read for the candidates SELECT, then again for the flip
    // UPDATE itself. Land a concurrent admin edit (PATCH /api/clients/[id]
    // setting a custom status) on that second access -- the exact gap two
    // sequential `bookings` lookups leave open per tenant in production.
    let accessCount = 0
    const clientsArray = h.store.clients
    Object.defineProperty(h.store, 'clients', {
      configurable: true,
      get() {
        accessCount++
        if (accessCount === 2) {
          clientsArray.find((c) => c.id === 'c1')!.status = 'vip'
        }
        return clientsArray
      },
    })

    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.clients_updated).toBe(0)
    expect(clientsArray.find((c) => c.id === 'c1')!.status).toBe('vip')
  })

  it('does NOT flip a client back to active if its status changed between the candidate SELECT and the UPDATE', async () => {
    h.store.clients = [
      { id: 'c2', tenant_id: 'tenant-A', status: 'inactive', created_at: '2026-01-01T00:00:00.000Z' },
    ]
    h.store.bookings = [
      { id: 'bk1', tenant_id: 'tenant-A', client_id: 'c2', status: 'completed', start_time: '2026-07-16T12:00:00.000Z' },
    ]

    // `clients` is read for the inactivate-candidates SELECT (empty match),
    // the reactivate-candidates SELECT, then the reactivate UPDATE itself.
    // Land the concurrent edit right before that third access.
    let accessCount = 0
    const clientsArray = h.store.clients
    Object.defineProperty(h.store, 'clients', {
      configurable: true,
      get() {
        accessCount++
        if (accessCount === 3) {
          clientsArray.find((c) => c.id === 'c2')!.status = 'blocked'
        }
        return clientsArray
      },
    })

    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.clients_updated).toBe(0)
    expect(clientsArray.find((c) => c.id === 'c2')!.status).toBe('blocked')
  })

  it('still deactivates a genuinely stale client and reports the count', async () => {
    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.clients_updated).toBe(1)
    expect(h.store.clients.find((c) => c.id === 'c1')!.status).toBe('inactive')
  })

  it('still reactivates a genuinely re-booked client and reports the count', async () => {
    h.store.clients = [
      { id: 'c2', tenant_id: 'tenant-A', status: 'inactive', created_at: '2026-01-01T00:00:00.000Z' },
    ]
    h.store.bookings = [
      { id: 'bk1', tenant_id: 'tenant-A', client_id: 'c2', status: 'completed', start_time: '2026-07-16T12:00:00.000Z' },
    ]

    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.clients_updated).toBe(1)
    expect(h.store.clients.find((c) => c.id === 'c2')!.status).toBe('active')
  })
})
