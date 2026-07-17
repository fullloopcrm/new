import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * Regression: comhub_active_calls.customer_call_id has a table-wide UNIQUE
 * constraint (not compound with tenant_id -- see migrations/2026_05_19_comhub.sql).
 * The 'started' lifecycle branch upserted onConflict: 'customer_call_id' with
 * no tenant check first. telnyx_call_id in the POST body is the softphone's
 * client-side call.id -- unauthenticated proof of nothing beyond "an admin
 * of some tenant sent this string". An admin of Tenant B who submits a
 * telnyx_call_id colliding with Tenant A's live call row overwrote that
 * row's tenant_id/thread_id/contact_id/customer_phone, hijacking Tenant A's
 * in-progress call thread. Fix: reject with 409 when the colliding row
 * belongs to a different tenant, instead of upserting over it.
 */

vi.mock('@/lib/require-admin', () => ({
  requireAdmin: vi.fn(async () => null),
}))

vi.mock('@/lib/tenant', () => ({
  getCurrentTenantId: vi.fn(async () => 'tenant-b'),
}))

vi.mock('@/lib/admin-member', () => ({
  getActiveAdminMemberId: vi.fn(async () => 'admin-b-1'),
}))

const { upsertSpy, rpcSpy, existingRowRef } = vi.hoisted(() => ({
  upsertSpy: vi.fn(async () => ({ error: null })),
  rpcSpy: vi.fn(async (fn: string) => {
    if (fn === 'comhub_get_or_create_contact_by_phone') return { data: 'contact-1' }
    if (fn === 'comhub_get_or_create_thread') return { data: 'thread-1' }
    return { data: null }
  }),
  existingRowRef: { current: null as { tenant_id: string } | null },
}))

vi.mock('@/lib/supabase', () => {
  const from = (table: string) => {
    if (table === 'comhub_active_calls') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: existingRowRef.current }),
          }),
        }),
        upsert: upsertSpy,
      }
    }
    if (table === 'comhub_softphone_calls' || table === 'comhub_messages') {
      return { insert: async () => ({ error: null }) }
    }
    if (table === 'comhub_threads') {
      return { update: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }) }
    }
    throw new Error(`unexpected table ${table}`)
  }
  return { supabaseAdmin: { from, rpc: rpcSpy } }
})

import { POST } from './route'

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/admin/comhub/voice/log-softphone-call', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST admin/comhub/voice/log-softphone-call', () => {
  beforeEach(() => {
    existingRowRef.current = null
    upsertSpy.mockClear()
  })

  it('rejects a customer_call_id collision that belongs to another tenant', async () => {
    existingRowRef.current = { tenant_id: 'tenant-a' }

    const res = await POST(
      makeRequest({
        customer_phone: '+15551234567',
        telnyx_call_id: 'collided-call-id',
        status: 'started',
      }),
    )

    expect(res.status).toBe(409)
    expect(upsertSpy).not.toHaveBeenCalled()
  })

  it('allows the upsert when no colliding row exists', async () => {
    existingRowRef.current = null

    const res = await POST(
      makeRequest({
        customer_phone: '+15551234567',
        telnyx_call_id: 'fresh-call-id',
        status: 'started',
      }),
    )

    expect(res.status).toBe(200)
    expect(upsertSpy).toHaveBeenCalled()
  })

  it('allows the same tenant to re-upsert its own in-progress call (e.g. reconnect)', async () => {
    existingRowRef.current = { tenant_id: 'tenant-b' }

    const res = await POST(
      makeRequest({
        customer_phone: '+15551234567',
        telnyx_call_id: 'my-own-call-id',
        status: 'started',
      }),
    )

    expect(res.status).toBe(200)
    expect(upsertSpy).toHaveBeenCalled()
  })
})
