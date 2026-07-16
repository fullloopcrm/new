import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * PATCH /api/admin/tenants — status-enum probe.
 *
 * BUG (fixed here): the handler wrote the caller-supplied `status` straight
 * to `tenants.status` with no validation against the known status set.
 * `tenantServesSite()` (the single gate every host-resolved entry point relies
 * on to keep a suspended/cancelled/deleted tenant dark) does a case-sensitive
 * EXACT match against NON_SERVING_STATUSES. A typo'd or wrong-case status —
 * "Suspended", "banned", trailing whitespace — would write successfully (no
 * DB error, 200 response) while never actually gating the tenant: it keeps
 * fully serving its site, dashboard, and all writes, with the admin believing
 * suspension succeeded.
 *
 * FIX: reject any status not in KNOWN_TENANT_STATUSES with 400 before writing.
 */

const T = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))

import { PATCH } from './route'

function seed() {
  return {
    tenants: [{ id: T, status: 'active' }] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function patch(body: unknown) {
  return PATCH(new Request('http://t/api/admin/tenants', { method: 'PATCH', body: JSON.stringify(body) }))
}

function statusOf(): unknown {
  return h.seed.tenants.find((t) => t.id === T)?.status
}

describe('PATCH /api/admin/tenants — status-enum probe', () => {
  it('accepts a known status and writes it', async () => {
    const res = await patch({ id: T, status: 'suspended' })
    expect(res.status).toBe(200)
    expect(statusOf()).toBe('suspended')
  })

  it('STATUS-ENUM PROBE: rejects a wrong-case status instead of silently writing a non-gating value', async () => {
    const res = await patch({ id: T, status: 'Suspended' })
    expect(res.status).toBe(400)
    expect(statusOf()).toBe('active')
  })

  it('STATUS-ENUM PROBE: rejects an unknown status string', async () => {
    const res = await patch({ id: T, status: 'banned' })
    expect(res.status).toBe(400)
    expect(statusOf()).toBe('active')
  })
})
