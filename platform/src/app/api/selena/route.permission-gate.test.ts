import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * GET+POST /api/selena (SMS booking-assistant console -- conversation
 * transcripts w/ customer name/phone/address/email, plus a reset action that
 * expires a conversation and sends a recovery SMS) called getTenantForRequest()
 * with zero permission check, even though the dashboard nav only shows the
 * Selena page to roles with settings.view (dashboard-shell.tsx). staff does
 * NOT have settings.view by default, so any staff member could hit the API
 * directly, bypassing the client-side-only gate. Now gated on settings.view,
 * matching the nav.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: currentRole.value, tenant: {} }),
  AuthError: class AuthError extends Error { status = 401 },
}))

vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn() }))
vi.mock('@/lib/selena-legacy', () => ({ EMPTY_CHECKLIST: {}, getClientProfile: vi.fn() }))

vi.mock('@/lib/supabase', () => {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    gte: () => chain,
    or: () => chain,
    order: () => chain,
    limit: () => chain,
    single: () => Promise.resolve({ data: null, error: null }),
    update: () => chain,
    insert: () => chain,
    then: (onF: (v: unknown) => unknown) => Promise.resolve(onF({ data: [], error: null })),
  }
  return { supabaseAdmin: { from: () => chain } }
})

import { GET, POST } from './route'

function getReq(): NextRequest {
  return new NextRequest('http://localhost/api/selena')
}

function postReq(): NextRequest {
  return new NextRequest('http://localhost/api/selena', {
    method: 'POST',
    body: JSON.stringify({ conversationId: 'convo-1' }),
  })
}

beforeEach(() => {
  currentRole.value = 'staff'
})

describe('GET /api/selena — permission gate', () => {
  it('403s staff, who lacks settings.view by default, no data leaked', async () => {
    const res = await GET(getReq())
    expect(res.status).toBe(403)
  })

  it('allows manager (has settings.view by default)', async () => {
    currentRole.value = 'manager'
    const res = await GET(getReq())
    expect(res.status).toBe(200)
  })
})

describe('POST /api/selena — permission gate', () => {
  it('403s staff resetting a conversation', async () => {
    const res = await POST(postReq())
    expect(res.status).toBe(403)
  })

  it('allows manager (has settings.view by default) to reach the handler', async () => {
    currentRole.value = 'manager'
    const res = await POST(postReq())
    // Conversation not found in the stubbed DB -- proves the permission gate
    // passed and execution reached the DB lookup, not a 403.
    expect(res.status).toBe(404)
  })
})
