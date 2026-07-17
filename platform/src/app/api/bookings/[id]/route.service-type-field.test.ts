import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * BUG (fixed here): the edit modal's own service-type dropdown
 * (BookingsAdmin.tsx form.service_type) writes the free-text `service_type`
 * column -- `service_type_id` is a separate FK the admin UI never populates.
 * PUT /api/bookings/[id]'s pick() allowlist only recognized service_type_id,
 * so any admin correction to a booking's service type via the edit modal was
 * silently dropped on save, with no error and no indication anything went
 * wrong. Same missing-allowlist-entry bug class as the sibling batch-update
 * team_member_id field-name gap fixed earlier this session.
 *
 * FIX: `service_type` added to the pick() allowlist alongside service_type_id.
 */

const CTX_TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return { AuthError, getTenantForRequest: vi.fn() }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  })),
}))

vi.mock('@/lib/audit', () => ({ audit: async () => {} }))
vi.mock('@/lib/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => {} }))
vi.mock('@/lib/sms-templates', () => ({ smsJobAssignment: () => '' }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({ bookingConfirmation: () => '', reschedule: () => '' }) }))
vi.mock('@/lib/availability', () => ({ checkMemberDayOff: async () => ({ unavailable: false }) }))

import { PUT } from './route'

function seed() {
  return {
    bookings: [
      { id: 'bk-a', tenant_id: CTX_TENANT, status: 'scheduled', client_id: null, team_member_id: null, service_type_id: null, service_type: 'Standard Cleaning', start_time: '2026-08-01T10:00:00Z' },
    ],
    tenants: [{ id: CTX_TENANT, name: 'Alpha' }],
  }
}

function putReq(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}
function ctx(id: string) {
  return { params: Promise.resolve({ id }) }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('bookings/[id] PUT — service_type free-text field', () => {
  it('an admin changing the service type via the edit modal actually persists (was silently dropped)', async () => {
    const res = await PUT(putReq({ service_type: 'Deep Clean' }), ctx('bk-a'))
    expect(res.status).toBe(200)
    expect(h.seed.bookings.find((r) => r.id === 'bk-a')!.service_type).toBe('Deep Clean')
  })

  it('CONTROL: omitting service_type leaves the existing value untouched', async () => {
    const res = await PUT(putReq({ notes: 'unrelated edit' }), ctx('bk-a'))
    expect(res.status).toBe(200)
    expect(h.seed.bookings.find((r) => r.id === 'bk-a')!.service_type).toBe('Standard Cleaning')
  })
})
