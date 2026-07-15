import { NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * requirePermission gate probe — dashboard/import/analyze/route.ts POST.
 * Called getTenantForRequest() directly with zero permission check, unlike
 * its own import-flow siblings (dashboard/import/stage, dashboard/import/
 * batch/[id], clients/import) which all require clients.create — any
 * authenticated tenant member could trigger a real Anthropic API call
 * against the tenant's stored key, fully unbounded (same cost-abuse-via-
 * missing-RBAC-gate class as admin/translate). Proves POST now requires
 * clients.create and short-circuits when denied.
 */

vi.mock('@/lib/anthropic-client', () => ({
  resolveAnthropic: async () => ({
    messages: {
      create: async () => ({ content: [{ type: 'text', text: '{"mapping":{},"transforms":{},"confidence":"low","notes":""}' }] }),
    },
  }),
}))

const TENANT_ID = 'tenant-A'
let permissionError: unknown = null
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => (
    permissionError
      ? { tenant: null, error: permissionError }
      : { tenant: { tenantId: TENANT_ID, tenant: { id: TENANT_ID }, role: 'staff', userId: 'u1' }, error: null }
  ),
}))

import { POST as analyzePOST } from './route'

function postReq(body: Record<string, unknown>): Request {
  return new Request('http://x/api/dashboard/import/analyze', { method: 'POST', body: JSON.stringify(body) })
}

function deny() {
  permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
}

beforeEach(() => {
  permissionError = null
})

describe('POST /api/dashboard/import/analyze — clients.create permission gate', () => {
  it('allowed with clients.create, forbidden without', async () => {
    const ok = await analyzePOST(postReq({ kind: 'clients', columns: ['Name'], samples: [['Jane Doe']] }))
    expect(ok.status).not.toBe(403)

    deny()
    const denied = await analyzePOST(postReq({ kind: 'clients', columns: ['Name'], samples: [['Jane Doe']] }))
    expect(denied.status).toBe(403)
  })
})
