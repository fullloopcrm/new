import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET/POST /api/quote-templates — permission gate.
 *
 * BUG (fixed here): both handlers only called getTenantForRequest() with
 * zero permission check. rbac.ts grants 'sales.view' to every role including
 * staff, but 'sales.edit' only to owner/admin/manager — same split as
 * quotes/*. Before this fix a 'staff' session could create quote templates
 * directly via the API.
 *
 * FIX: requirePermission('sales.view') on GET, requirePermission('sales.edit')
 * on POST, matching quotes/route.ts exactly.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const roleHolder = vi.hoisted(() => ({ role: 'owner' as string }))
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
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: A,
      tenant: { id: A },
      role: roleHolder.role,
    })),
  }
})

import { GET, POST } from './route'

function seed() {
  return {
    quote_templates: [
      { id: 'tpl-1', tenant_id: A, active: true, sort_order: 0, name: 'Standard' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  roleHolder.role = 'owner'
})

describe('GET /api/quote-templates — permission probe', () => {
  it('owner (has sales.view) can list templates', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it("'staff' (has sales.view per rbac.ts) can list templates", async () => {
    roleHolder.role = 'staff'
    const res = await GET()
    expect(res.status).toBe(200)
  })
})

describe('POST /api/quote-templates — permission probe', () => {
  function req() {
    return new Request('http://t', { method: 'POST', body: JSON.stringify({ name: 'New template' }) })
  }

  it('owner (has sales.edit) can create a template', async () => {
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(h.capture.inserts.some((i) => i.table === 'quote_templates')).toBe(true)
  })

  it("PERMISSION PROBE: 'staff' (no sales.edit) is forbidden and nothing is created", async () => {
    roleHolder.role = 'staff'
    const res = await POST(req())
    expect(res.status).toBe(403)
    expect(h.capture.inserts.some((i) => i.table === 'quote_templates')).toBe(false)
  })
})
