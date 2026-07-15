import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * admin/comhub/threads/[id] PATCH — cross-tenant assignee_id FK injection.
 *
 * `assignee_id` is a caller-supplied FK into `tenant_members`
 * (migrations/2026_05_19_comhub.sql: `assignee_id UUID REFERENCES
 * tenant_members(id)`) with no cross-tenant FK check of its own — the row
 * update itself is tenant-scoped (`.eq('tenant_id', tenantId)`), but nothing
 * verified the FK it wrote pointed at a `tenant_members` row this tenant
 * owns. Same dangling-FK class as P7/P15/P19/P21/P23 in
 * deploy-prep/cross-tenant-leak-register.md — no live read currently embeds
 * `tenant_members` off `assignee_id`, so this is defense-in-depth against a
 * future report/embed silently inheriting the gap, per that register's
 * standing policy.
 *
 * FIX: a caller-supplied assignee_id is now verified tenant-owned before the
 * update runs; a miss 400s and the row is left untouched. `null` (unassign)
 * is always allowed.
 */

const TENANT_A = 'tid-a'
const TENANT_B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))
vi.mock('@/lib/tenant', () => ({ getCurrentTenantId: vi.fn(async () => TENANT_A) }))

import { PATCH } from './route'

function seed() {
  return {
    comhub_threads: [
      { id: 'th-a', tenant_id: TENANT_A, status: 'open', assignee_id: null },
    ],
    tenant_members: [
      { id: 'mem-a', tenant_id: TENANT_A, name: 'A Admin', email: 'a@tenant-a.example' },
      { id: 'mem-b', tenant_id: TENANT_B, name: 'B Admin', email: 'b@tenant-b.example' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

const params = { params: Promise.resolve({ id: 'th-a' }) }

function req(body: Record<string, unknown>) {
  return new NextRequest('http://t/api/admin/comhub/threads/th-a', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

describe('admin/comhub/threads/[id] PATCH — assignee_id FK-ownership guard', () => {
  it('rejects a foreign-tenant assignee_id and leaves the row untouched', async () => {
    const res = await PATCH(req({ assignee_id: 'mem-b' }), params)
    expect(res.status).toBe(400)
    const thread = (h.seed.comhub_threads as Array<{ id: string; assignee_id: string | null }>).find(t => t.id === 'th-a')
    expect(thread?.assignee_id).toBeNull()
  })

  it('accepts an own-tenant assignee_id', async () => {
    const res = await PATCH(req({ assignee_id: 'mem-a' }), params)
    expect(res.status).toBe(200)
    const thread = (h.seed.comhub_threads as Array<{ id: string; assignee_id: string | null }>).find(t => t.id === 'th-a')
    expect(thread?.assignee_id).toBe('mem-a')
  })

  it('allows clearing the assignment with assignee_id: null', async () => {
    await PATCH(req({ assignee_id: 'mem-a' }), params)
    const res = await PATCH(req({ assignee_id: null }), params)
    expect(res.status).toBe(200)
    const thread = (h.seed.comhub_threads as Array<{ id: string; assignee_id: string | null }>).find(t => t.id === 'th-a')
    expect(thread?.assignee_id).toBeNull()
  })

  it('CONTROL: field-only updates with no assignee_id still pass', async () => {
    const res = await PATCH(req({ status: 'closed' }), params)
    expect(res.status).toBe(200)
    const thread = (h.seed.comhub_threads as Array<{ id: string; status: string }>).find(t => t.id === 'th-a')
    expect(thread?.status).toBe('closed')
  })
})
