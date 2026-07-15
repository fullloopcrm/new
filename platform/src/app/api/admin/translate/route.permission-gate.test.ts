import { NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * requirePermission gate probe — admin/translate/route.ts POST.
 * Called getTenantForRequest() directly with zero permission check — any
 * authenticated tenant member, regardless of the tenant's own RBAC
 * customization, could trigger a real Anthropic API call against the
 * tenant's stored key (or the shared platform ANTHROPIC_API_KEY fallback),
 * unbounded. Proves POST now requires bookings.view and short-circuits
 * when denied.
 */

vi.mock('@/lib/anthropic-client', () => ({
  anthropicFromStoredKey: () => ({
    messages: {
      create: async () => ({ content: [{ type: 'text', text: 'traducido' }] }),
    },
  }),
}))

const TENANT_ID = 'tenant-A'
let permissionError: unknown = null
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => (
    permissionError
      ? { tenant: null, error: permissionError }
      : {
          tenant: {
            tenantId: TENANT_ID,
            tenant: { id: TENANT_ID, anthropic_api_key: 'stored-key' },
            role: 'staff',
            userId: 'u1',
          },
          error: null,
        }
  ),
}))

import { POST as translatePOST } from './route'

function postReq(body: Record<string, unknown>): Request {
  return new Request('http://x/api/admin/translate', { method: 'POST', body: JSON.stringify(body) })
}

function deny() {
  permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
}

beforeEach(() => {
  permissionError = null
})

describe('POST /api/admin/translate — bookings.view permission gate', () => {
  it('allowed with bookings.view, forbidden without', async () => {
    const ok = await translatePOST(postReq({ text: 'lock the door' }))
    expect(ok.status).not.toBe(403)

    deny()
    const denied = await translatePOST(postReq({ text: 'lock the door' }))
    expect(denied.status).toBe(403)
  })
})
