import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — POST /api/projects stored `title`/`service_type` raw with no
 * type check or length cap before the `projects` insert (and the derived
 * span-booking insert's `service_type`) — same class as the invoices/
 * void-reason, accounting_periods.notes, and social/post gaps (capString,
 * src/lib/validate.ts).
 *
 * FIXED: capString(title, 500), capString(service_type, 200), applied
 * before either insert.
 */

const A = 'tid-a'

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
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: A, tenant: { id: A }, role: 'owner' })),
  }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { tenantId: A, tenant: { id: A }, role: 'owner', userId: 'u1' },
    error: null,
  })),
}))

import { POST } from './route'

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({})
  holder.from = h.from
})

function post(body: Record<string, unknown>) {
  return POST(new Request('http://t/api/projects', { method: 'POST', body: JSON.stringify(body) }))
}

const validDates = { start_date: '2026-01-01', end_date: '2026-01-31' }

describe('projects POST — free-text cap', () => {
  it('LOCK: an oversized title is truncated to 500 chars before insert', async () => {
    const oversized = 'x'.repeat(600)
    const res = await post({ title: oversized, ...validDates })
    expect(res.status).toBe(200)
    const projectInsert = h.capture.inserts.find((i) => i.table === 'projects')
    expect(projectInsert?.rows[0].title).toHaveLength(500)
    expect(projectInsert?.rows[0].title).toBe(oversized.slice(0, 500))
  })

  it('LOCK: an oversized service_type is truncated to 200 chars on both the project and span-booking insert', async () => {
    const oversized = 'y'.repeat(300)
    const res = await post({ title: 'Deck build', service_type: oversized, ...validDates })
    expect(res.status).toBe(200)
    const projectInsert = h.capture.inserts.find((i) => i.table === 'projects')
    const bookingInsert = h.capture.inserts.find((i) => i.table === 'bookings')
    expect(projectInsert?.rows[0].service_type).toHaveLength(200)
    expect(bookingInsert?.rows[0].service_type).toHaveLength(200)
  })

  it('SAFETY: a non-string title (object) is rejected as missing, not forwarded raw', async () => {
    const res = await post({ title: { evil: 'payload' }, ...validDates })
    expect(res.status).toBe(400)
    expect(h.capture.inserts.find((i) => i.table === 'projects')).toBeUndefined()
  })

  it('CONTROL: a normal-length title/service_type passes through untouched', async () => {
    const res = await post({ title: 'Deck build', service_type: 'carpentry', ...validDates })
    expect(res.status).toBe(200)
    const projectInsert = h.capture.inserts.find((i) => i.table === 'projects')
    expect(projectInsert?.rows[0].title).toBe('Deck build')
    expect(projectInsert?.rows[0].service_type).toBe('carpentry')
  })
})
