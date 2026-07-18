/**
 * POST /api/deals/manual -- retry-on-conflict for clients.pin.
 *
 * idx_clients_tenant_pin_unique (2026_07_17_clients_pin_unique.sql) uniquely
 * constrains (tenant_id, pin). This route's find-or-create client insert
 * minted a fresh random PIN with no collision handling -- same bug class
 * already fixed on client/collect (route.pin-conflict.test.ts), just missed
 * here since this is the operator-side manual-entry path. A collision
 * surfaced as a generic "Failed to create client" 500 to the operator
 * instead of retrying. Verifies the route instead regenerates and retries,
 * and gives up cleanly once MAX_CLIENT_PIN_ATTEMPTS is exhausted.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => ({ insertAttempts: 0, collisionsRemaining: 0, pinCalls: 0 }))

function conflictError() {
  return { code: '23505', message: 'duplicate key value violates unique constraint "idx_clients_tenant_pin_unique"' }
}

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: 'tenant-1' }, error: null })),
}))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))
vi.mock('@/lib/messaging/owner-alerts', () => ({ ownerAlert: vi.fn(async () => {}) }))
vi.mock('@/lib/client-auth', () => ({
  randomClientPin: vi.fn(() => {
    h.pinCalls++
    return `pin-${h.pinCalls}`
  }),
  MAX_CLIENT_PIN_ATTEMPTS: 5,
}))

function genericChain(result: { data: unknown; error?: unknown }) {
  const q: Record<string, unknown> = {
    eq: () => q,
    ilike: () => q,
    in: () => q,
    order: () => q,
    limit: () => q,
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    select: () => q,
    then: (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve),
  }
  return q
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: () => genericChain({ data: null, error: null }),
      insert: (row: Record<string, unknown>) => {
        if (table !== 'clients') return genericChain({ data: { id: 'deal-1', ...row }, error: null })
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
    }),
  },
}))

import { POST } from './route'

function req(): Request {
  const body = { name: 'New Lead', phone: '2125550000', email: 'lead@example.com' }
  return { json: async () => body } as unknown as Request
}

beforeEach(() => {
  vi.clearAllMocks()
  h.insertAttempts = 0
  h.collisionsRemaining = 0
  h.pinCalls = 0
})

describe('POST /api/deals/manual — clients.pin conflict handling', () => {
  it('regenerates and retries when a fresh PIN collides, and still succeeds', async () => {
    h.collisionsRemaining = 2

    const res = await POST(req())

    expect(res.status).toBe(200)
    expect(h.insertAttempts).toBe(3)
    expect(h.pinCalls).toBe(3)
  })

  it('gives up after MAX_CLIENT_PIN_ATTEMPTS instead of retrying forever, and surfaces an error', async () => {
    h.collisionsRemaining = 999

    const res = await POST(req())
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toMatch(/Failed to create client/)
    expect(h.insertAttempts).toBe(5)
  })
})
