import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/admin/message-applicants/send previously called
 * getTenantForRequest() with zero permission check -- 'staff' and 'manager'
 * (neither has team.edit by default) could mass-SMS every un-hired job
 * applicant using the tenant's Telnyx number. Now gated on team.edit,
 * matching the analogous find-cleaner/send broadcast route's team-contact
 * class of action.
 */

const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenantId: 't-1', role: currentRole.value,
    tenant: { id: 't-1', telnyx_api_key: 'key', telnyx_phone: '+15550000000' },
  }),
  AuthError: class AuthError extends Error { status = 401 },
}))

vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn() }))

import { POST } from './route'

beforeEach(() => { currentRole.value = 'staff' })

const req = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

describe('POST /api/admin/message-applicants/send — permission gate', () => {
  it('403s staff (lacks team.edit)', async () => {
    const res = await POST(req({ applicant_ids: ['a1'], message: 'hi', confirmed: true }))
    expect(res.status).toBe(403)
  })

  it('403s manager (lacks team.edit)', async () => {
    currentRole.value = 'manager'
    const res = await POST(req({ applicant_ids: ['a1'], message: 'hi', confirmed: true }))
    expect(res.status).toBe(403)
  })

  it('allows admin (has team.edit) through the gate', async () => {
    currentRole.value = 'admin'
    const res = await POST(req({ applicant_ids: [], message: '', confirmed: false }))
    expect(res.status).toBe(400)
  })
})
