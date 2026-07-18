import { describe, it, expect, vi } from 'vitest'

/**
 * POST/PUT /api/campaigns/send (the top-level, recipient-tracked send route
 * — distinct from campaigns/[id]/send) required only `campaigns.create`
 * instead of the stricter `campaigns.send` its sibling [id]/send uses. Out
 * of the box both permissions are held by the same roles (owner/admin), but
 * the tenant-facing Permissions UI exposes "Create campaigns" and "Send
 * campaigns" as independently toggleable — a tenant who grants
 * campaigns.create to a role (e.g. "let managers draft campaigns") without
 * granting campaigns.send would, via this route, unintentionally let that
 * role actually fire real emails/SMS to the whole client base. Already
 * fixed identically upstream on campaigns/[id]/send and on the p1-w3
 * branch's copy of this same file (commit df2688c8) — reconciles cleanly at
 * merge time since both land on the same permission string.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) }),
    }),
  },
}))

vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))

const { currentRole, currentOverrides } = vi.hoisted(() => ({
  currentRole: { value: 'staff' },
  currentOverrides: { value: null as null | Record<string, Record<string, boolean>> },
}))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenantId: TENANT_A,
    role: currentRole.value,
    tenant: { selena_config: currentOverrides.value ? { role_permissions: currentOverrides.value } : null },
  }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { POST, PUT } from './route'

function req(body: unknown): Request {
  return new Request('https://x/api/campaigns/send', { method: 'POST', body: JSON.stringify(body) })
}

describe('POST /api/campaigns/send — permission gate', () => {
  it('403s a manager granted campaigns.create-only via tenant override (no campaigns.send)', async () => {
    currentRole.value = 'manager'
    currentOverrides.value = { manager: { 'campaigns.create': true } }
    const res = await POST(req({ campaign_id: 'camp-1' }))
    expect(res.status).toBe(403)
  })

  it('403s staff (no campaigns.* by default)', async () => {
    currentRole.value = 'staff'
    currentOverrides.value = null
    const res = await POST(req({ campaign_id: 'camp-1' }))
    expect(res.status).toBe(403)
  })

  it('allows admin (has campaigns.send by default)', async () => {
    currentRole.value = 'admin'
    currentOverrides.value = null
    const res = await POST(req({ campaign_id: 'camp-1' }))
    expect(res.status).not.toBe(403)
  })
})

describe('PUT /api/campaigns/send — permission gate', () => {
  it('403s a manager granted campaigns.create-only via tenant override (no campaigns.send)', async () => {
    currentRole.value = 'manager'
    currentOverrides.value = { manager: { 'campaigns.create': true } }
    const res = await PUT(req({ campaign_id: 'camp-1' }))
    expect(res.status).toBe(403)
  })
})
