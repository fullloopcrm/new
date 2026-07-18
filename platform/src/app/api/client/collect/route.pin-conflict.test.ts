/**
 * POST /api/client/collect — retry-on-conflict for clients.pin.
 *
 * idx_clients_tenant_pin_unique (2026_07_17_clients_pin_unique.sql) uniquely
 * constrains (tenant_id, pin). Nothing checked for a collision before this
 * insert, so a fresh random PIN colliding with an existing client's (real,
 * birthday-paradox odds that grow with a tenant's client count) threw the
 * raw 23505 up to the outer catch, which returned a generic 500 and lost a
 * real lead's first submission outright. This verifies the route instead
 * regenerates and retries, same pattern POST /api/invoices uses for
 * invoice_number/public_token collisions, and gives up cleanly (no infinite
 * retry) once MAX_CLIENT_PIN_ATTEMPTS is exhausted.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => ({
  insertAttempts: 0,
  collisionsRemaining: 0,
  pinCalls: 0,
}))

function conflictError() {
  return { code: '23505', message: 'duplicate key value violates unique constraint "idx_clients_tenant_pin_unique"' }
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'clients') {
        return {
          select: () => ({ eq: async () => ({ data: [], error: null }) }),
          insert: (row: Record<string, unknown>) => {
            h.insertAttempts++
            return {
              select: () => ({
                single: async () => {
                  if (h.collisionsRemaining > 0) {
                    h.collisionsRemaining--
                    return { data: null, error: conflictError() }
                  }
                  return { data: { id: 'new-client-1', ...row }, error: null }
                },
              }),
            }
          },
        }
      }
      if (table === 'referrers') return { select: () => ({ eq: () => ({ eq: () => ({ ilike: () => ({ limit: async () => ({ data: [] }) }) }) }) }) }
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
vi.mock('@/lib/client-auth', () => ({
  randomClientPin: vi.fn(() => {
    h.pinCalls++
    return `pin-${h.pinCalls}`
  }),
  MAX_CLIENT_PIN_ATTEMPTS: 5,
}))

import { POST } from './route'

function postWith(body: Record<string, unknown>) {
  return POST(new Request('http://x/api/client/collect', { method: 'POST', body: JSON.stringify(body) }))
}

beforeEach(() => {
  vi.clearAllMocks()
  h.insertAttempts = 0
  h.collisionsRemaining = 0
  h.pinCalls = 0
})

describe('POST /api/client/collect — clients.pin conflict handling', () => {
  it('regenerates and retries when a fresh PIN collides, and still succeeds', async () => {
    h.collisionsRemaining = 2 // first 2 attempts collide, 3rd succeeds

    const res = await postWith({ name: 'New Lead', phone: '2125550000' })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.client_id).toBe('new-client-1')
    expect(h.insertAttempts).toBe(3)
    expect(h.pinCalls).toBe(3)
  })

  it('gives up after MAX_CLIENT_PIN_ATTEMPTS instead of retrying forever, and surfaces an error', async () => {
    h.collisionsRemaining = 999 // every attempt collides

    const res = await postWith({ name: 'Unlucky Lead', phone: '2125550001' })

    expect(res.status).toBe(500)
    expect(h.insertAttempts).toBe(5)
  })
})
