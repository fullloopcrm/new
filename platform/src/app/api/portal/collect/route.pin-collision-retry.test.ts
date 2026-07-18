/**
 * POST /api/portal/collect -- retry-on-conflict for clients.pin.
 *
 * idx_clients_tenant_pin_unique (2026_07_17_clients_pin_unique.sql) uniquely
 * constrains (tenant_id, pin). This route's new-client insert minted a fresh
 * random PIN with no collision handling -- same bug class already fixed on
 * client/collect (route.pin-conflict.test.ts), just missed here since this
 * route is a separate "finish your booking" funnel entry point. A collision
 * threw the raw 23505 up to the outer catch, returning a generic 500 and
 * losing a real lead's submission outright. Verifies the route instead
 * regenerates and retries, and gives up cleanly once
 * MAX_CLIENT_PIN_ATTEMPTS is exhausted.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const h = vi.hoisted(() => ({ insertAttempts: 0, collisionsRemaining: 0, pinCalls: 0 }))

function conflictError() {
  return { code: '23505', message: 'duplicate key value violates unique constraint "idx_clients_tenant_pin_unique"' }
}

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({ id: 'tenant-1', name: 'Acme', slug: 'acme' })),
  tenantSiteUrl: vi.fn(() => 'https://acme.example.com'),
}))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true, remaining: 2 })) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/admin-contacts', () => ({ emailAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/email-templates', () => ({ adminNewClientEmail: vi.fn(() => ({ subject: 'x', html: 'x' })) }))
vi.mock('@/lib/error-tracking', () => ({ trackError: vi.fn(async () => {}) }))
vi.mock('@/lib/attribution', () => ({ attributeCollectForm: vi.fn(async () => {}) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
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
      select: () => genericChain({ data: [], error: null }),
      update: () => genericChain({ data: { id: 'x' }, error: null }),
      insert: (row: Record<string, unknown>) => {
        if (table !== 'clients') return genericChain({ data: { id: 'x' }, error: null })
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

function req(): NextRequest {
  return new NextRequest('https://acme.example.com/api/portal/collect', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9' },
    body: JSON.stringify({ name: 'New Lead', email: 'lead@example.com', phone: '2125550000' }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  h.insertAttempts = 0
  h.collisionsRemaining = 0
  h.pinCalls = 0
})

describe('POST /api/portal/collect — clients.pin conflict handling', () => {
  it('regenerates and retries when a fresh PIN collides, and still succeeds', async () => {
    h.collisionsRemaining = 2

    const res = await POST(req())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.client_id).toBe('new-client-1')
    expect(h.insertAttempts).toBe(3)
    expect(h.pinCalls).toBe(3)
  })

  it('gives up after MAX_CLIENT_PIN_ATTEMPTS instead of retrying forever, and surfaces an error', async () => {
    h.collisionsRemaining = 999

    const res = await POST(req())

    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(h.insertAttempts).toBe(5)
  })
})
