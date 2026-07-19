import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * POST /api/sales-partners — onboarding + e-sign agreement flow.
 *
 * Creates the sales_partners row inactive, generates+stores the Commission
 * Sales Partner Agreement PDF through the existing in-house e-sign module
 * (documents/document_signers/document_fields), emails the signing link, and
 * links agreement_document_id back onto the partner. Activation happens
 * later, out of band, via activateSalesPartnerForDocument() on sign
 * completion (see sales-partner-agreement.test.ts).
 */

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

const roleHolder = vi.hoisted(() => ({ role: 'owner' as string, tenantId: 'tenant-A' as string }))
const uploadSpy = vi.hoisted(() => vi.fn(async () => ({ error: null })))
const sendEmailSpy = vi.hoisted(() => vi.fn(async (_args: { to: string }) => ({})))

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  const withStorage = {
    ...fake,
    storage: { from: () => ({ upload: uploadSpy }) },
  }
  return { supabaseAdmin: withStorage, supabase: withStorage }
})
vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: roleHolder.tenantId,
      tenant: { id: roleHolder.tenantId },
      role: roleHolder.role,
    })),
  }
})
vi.mock('@/lib/email', () => ({
  sendEmail: sendEmailSpy,
  tenantSender: () => 'Test Tenant <no-reply@fullloopcrm.com>',
}))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true })) }))

// Real requirePermission + rbac + PDF builder run against the mocks above.
import { POST } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.seq = 0
  roleHolder.role = 'owner'
  roleHolder.tenantId = 'tenant-A'
  uploadSpy.mockClear()
  sendEmailSpy.mockClear()
  h.store = {
    tenants: [
      { id: 'tenant-A', name: 'Acme Cleaning', slug: 'acme', domain: 'acme.com', resend_api_key: null, email_from: null },
    ],
    sales_partners: [],
    documents: [],
    document_signers: [],
    document_fields: [],
  }
})

describe('POST /api/sales-partners', () => {
  it('creates an inactive partner, stores + emails the agreement, and links agreement_document_id', async () => {
    const res = await POST(postReq({ name: 'Jane Doe', email: 'jane@example.com', phone: '5551234567', tier: 'standard' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(typeof body.signUrl).toBe('string')
    expect(body.signUrl).toContain('/sign/')

    const partner = h.store.sales_partners.find((p) => p.email === 'jane@example.com')
    expect(partner).toBeDefined()
    expect(partner!.active).toBe(false)
    expect(partner!.tenant_id).toBe('tenant-A')
    expect(partner!.tier).toBe('standard')
    expect(partner!.commission_rate).toBeCloseTo(0.10)
    expect(typeof partner!.referral_code).toBe('string')
    expect(partner!.agreement_document_id).toBeTruthy()

    const doc = h.store.documents.find((d) => d.id === partner!.agreement_document_id)
    expect(doc).toBeDefined()
    expect(doc!.tenant_id).toBe('tenant-A')
    expect(doc!.status).toBe('sent')
    expect(doc!.original_path).not.toBe('pending')

    const signer = h.store.document_signers.find((s) => s.document_id === doc!.id)
    expect(signer).toBeDefined()
    expect(signer!.email).toBe('jane@example.com')
    expect(signer!.role).toBe('partner')

    const fields = h.store.document_fields.filter((f) => f.document_id === doc!.id)
    expect(fields.length).toBe(3)
    expect(fields.some((f) => f.type === 'signature')).toBe(true)
    expect(fields.some((f) => f.type === 'full_name')).toBe(true)

    expect(uploadSpy).toHaveBeenCalledTimes(1)
    expect(sendEmailSpy).toHaveBeenCalledTimes(1)
    expect(sendEmailSpy.mock.calls[0]?.[0]?.to).toBe('jane@example.com')
  })

  it('rejects missing name/email with 400 and creates nothing', async () => {
    const res = await POST(postReq({ email: 'noname@example.com' }))
    expect(res.status).toBe(400)
    expect(h.store.sales_partners.length).toBe(0)
    expect(uploadSpy).not.toHaveBeenCalled()
  })

  it("PERMISSION PROBE: 'staff' role (no sales_partners.manage) is forbidden and nothing is created", async () => {
    roleHolder.role = 'staff'
    const res = await POST(postReq({ name: 'Jane Doe', email: 'jane@example.com' }))
    expect(res.status).toBe(403)
    expect(h.store.sales_partners.length).toBe(0)
    expect(uploadSpy).not.toHaveBeenCalled()
  })

  it('applies the correct commission_rate per tier', async () => {
    const res = await POST(postReq({ name: 'Tier Two', email: 'tier2@example.com', tier: 'tier2' }))
    expect(res.status).toBe(200)
    const partner = h.store.sales_partners.find((p) => p.email === 'tier2@example.com')
    expect(partner!.commission_rate).toBeCloseTo(0.12)
  })
})
