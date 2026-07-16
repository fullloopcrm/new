import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * PUT /api/admin/tenants/[id] — status-enum probe.
 *
 * Same class of bug as route.ts's PATCH handler (see its
 * route.status-enum-probe.test.ts): `status` was one of an arbitrary set of
 * free-text fields written straight through with no validation.
 * `tenantServesSite()` does a case-sensitive EXACT match against
 * NON_SERVING_STATUSES, so a wrong-case or unknown status value here would
 * write successfully while never gating the tenant off its site/dashboard.
 */

const T = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))
vi.mock('@/lib/security', () => ({ logSecurityEvent: vi.fn(async () => {}) }))

import { PUT } from './route'

function seed() {
  return {
    tenants: [{ id: T, status: 'active', plan: 'free' }] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function put(body: unknown) {
  return PUT(
    new Request(`http://t/api/admin/tenants/${T}`, { method: 'PUT', body: JSON.stringify(body) }),
    { params: Promise.resolve({ id: T }) },
  )
}

function statusOf(): unknown {
  return h.seed.tenants.find((t) => t.id === T)?.status
}

describe('PUT /api/admin/tenants/[id] — status-enum probe', () => {
  it('accepts a known status and writes it', async () => {
    const res = await put({ status: 'cancelled' })
    expect(res.status).toBe(200)
    expect(statusOf()).toBe('cancelled')
  })

  it('unrelated field updates (no status in body) are unaffected', async () => {
    const res = await put({ plan: 'pro' })
    expect(res.status).toBe(200)
    expect(statusOf()).toBe('active')
  })

  it('STATUS-ENUM PROBE: rejects a wrong-case status instead of silently writing a non-gating value', async () => {
    const res = await put({ status: 'Suspended' })
    expect(res.status).toBe(400)
    expect(statusOf()).toBe('active')
  })

  it('STATUS-ENUM PROBE: rejects an unknown status string', async () => {
    const res = await put({ status: 'banned' })
    expect(res.status).toBe(400)
    expect(statusOf()).toBe('active')
  })
})
