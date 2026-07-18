/**
 * POST /api/client/verify-code — retry-on-conflict for clients.pin.
 *
 * idx_clients_tenant_pin_unique (2026_07_17_clients_pin_unique.sql) uniquely
 * constrains (tenant_id, pin). Nothing checked for a collision before this
 * insert, so a fresh random PIN colliding with an existing client's failed
 * the auto-create-on-first-login path with a generic 500 -- even though the
 * caller had JUST proved ownership of the email by supplying the code sent
 * to it. This verifies the route regenerates and retries instead, same
 * pattern POST /api/invoices uses for invoice_number/public_token
 * collisions, and gives up cleanly (no infinite retry) once
 * MAX_CLIENT_PIN_ATTEMPTS is exhausted.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const h = vi.hoisted(() => ({
  insertAttempts: 0,
  collisionsRemaining: 0,
  pinCalls: 0,
}))

function conflictError() {
  return { code: '23505', message: 'duplicate key value violates unique constraint "idx_clients_tenant_pin_unique"' }
}

const CODE = { tenant_id: 'tenant-1', identifier: 'newperson@example.com', code: 'FRESH1', expires_at: '2099-01-01T00:00:00Z' }

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'verification_codes') {
        return {
          select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: CODE, error: null }) }) }) }) }),
          delete: () => ({ eq: () => ({ eq: async () => ({ data: null, error: null }) }) }),
        }
      }
      if (table === 'clients') {
        return {
          select: () => ({
            eq: () => ({
              // phone lookup path (allClients) — none for this email-only flow.
              then: (res: (v: unknown) => unknown) => Promise.resolve({ data: [] }).then(res),
              ilike: () => ({ order: () => ({ limit: async () => ({ data: [] }) }) }),
            }),
          }),
          insert: (row: Record<string, unknown>) => {
            h.insertAttempts++
            return {
              select: () => ({
                single: async () => {
                  if (h.collisionsRemaining > 0) {
                    h.collisionsRemaining--
                    return { data: null, error: conflictError() }
                  }
                  return { data: { id: 'new-client-1', do_not_service: false, ...row }, error: null }
                },
              }),
            }
          },
        }
      }
      throw new Error(`unexpected table ${table}`)
    },
  },
}))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({ id: 'tenant-1' })),
}))
vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: vi.fn(async () => ({ allowed: true, remaining: 10 })),
}))
vi.mock('@/lib/client-auth', () => ({
  createClientSession: vi.fn(() => 'signed-session-token'),
  clientSessionCookieOptions: vi.fn(() => ({
    name: 'client_session',
    httpOnly: true,
    secure: true,
    sameSite: 'lax' as const,
    maxAge: 3600,
    path: '/',
  })),
  randomClientPin: vi.fn(() => {
    h.pinCalls++
    return `pin-${h.pinCalls}`
  }),
  MAX_CLIENT_PIN_ATTEMPTS: 5,
}))

import { POST } from './route'

function postJson(body: unknown) {
  return POST(
    new NextRequest('http://x/api/client/verify-code', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    })
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  h.insertAttempts = 0
  h.collisionsRemaining = 0
  h.pinCalls = 0
})

describe('POST /api/client/verify-code — clients.pin conflict handling (auto-create on first login)', () => {
  it('regenerates and retries when a fresh PIN collides, and the login still succeeds', async () => {
    h.collisionsRemaining = 2 // first 2 attempts collide, 3rd succeeds

    const res = await postJson({ email: 'newperson@example.com', code: 'FRESH1' })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.client.id).toBe('new-client-1')
    expect(h.insertAttempts).toBe(3)
    expect(h.pinCalls).toBe(3)
  })

  it('gives up after MAX_CLIENT_PIN_ATTEMPTS instead of retrying forever, and surfaces an error', async () => {
    h.collisionsRemaining = 999 // every attempt collides

    const res = await postJson({ email: 'newperson@example.com', code: 'FRESH1' })

    expect(res.status).toBe(500)
    expect(h.insertAttempts).toBe(5)
  })
})
