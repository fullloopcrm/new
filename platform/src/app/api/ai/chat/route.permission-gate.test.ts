import { NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * requirePermission gate probe — ai/chat/route.ts POST.
 * Called getTenantForRequest() directly with zero permission check, even
 * though it's the copilot backing /dashboard/campaigns (nav-gated on
 * campaigns.view) — it hands the model tenant-wide client/booking/team
 * counts, the 5 most recent bookings (incl. final_price), and the tenant's
 * phone/email. Any authenticated tenant member — including staff, which has
 * no campaigns.view per rbac.ts — could pull that business data through the
 * chat prompt. Proves POST now requires campaigns.view and short-circuits
 * when denied.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

vi.mock('@/lib/anthropic-client', () => ({
  anthropicFromStoredKey: () => ({
    messages: {
      create: async () => ({ content: [{ type: 'text', text: 'ok' }] }),
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
            tenant: { id: TENANT_ID, name: 'Acme', industry: 'cleaning', anthropic_api_key: 'stored-key', phone: '555-0100', email: 'a@acme.com' },
            role: 'staff',
            userId: 'u1',
          },
          error: null,
        }
  ),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST as chatPOST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function deny() {
  permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
}

function postReq(body: Record<string, unknown>): Request {
  return new Request('http://x/api/ai/chat', { method: 'POST', body: JSON.stringify(body) })
}

beforeEach(() => {
  fake._store.clear()
  permissionError = null
})

describe('POST /api/ai/chat — campaigns.view permission gate', () => {
  it('allowed with campaigns.view, forbidden without', async () => {
    const ok = await chatPOST(postReq({ messages: [{ role: 'user', content: 'hi' }] }))
    expect(ok.status).not.toBe(403)

    deny()
    const denied = await chatPOST(postReq({ messages: [{ role: 'user', content: 'hi' }] }))
    expect(denied.status).toBe(403)
  })
})
