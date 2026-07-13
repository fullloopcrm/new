import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * inbound_emails has no tenant_id column yet (see
 * deploy-prep/inbound-emails-tenant-scope-plan-p1-w2.md — prep for migration
 * 062). The route stamps tenant_id/resolved_domain ONLY when
 * INBOUND_EMAILS_TENANT_SCOPE_ENABLED='true', which must stay unset until
 * that migration lands — flipping it early would 500 every inbound email
 * (insert against a column that doesn't exist).
 *
 * This locks in both halves of that guard:
 *   - OFF (today, everywhere): the insert payload is untouched — no
 *     tenant_id/resolved_domain keys, and the tenant resolver is never
 *     called at all.
 *   - ON (only valid post-062): the recipient domain resolves through the
 *     SAME tenant_domains-first/tenants.domain-fallback resolver
 *     (getTenantByDomain) everything else in P1 uses, and gets stamped.
 */

const getTenantByDomain = vi.fn(async (domain: string) =>
  domain === 'a.example.com' ? { id: 'tenant_a' } : null,
)

vi.mock('@/lib/tenant-lookup', () => ({ getTenantByDomain }))
vi.mock('@/lib/webhook-verify', () => ({ verifySvix: vi.fn(() => ({ valid: true })) }))

let insertedRows: Record<string, unknown>[] = []
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => {
        if (table === 'inbound_emails') insertedRows.push(row)
        return Promise.resolve({ data: null, error: null })
      },
    }),
  },
}))

function req(body: object): Request {
  return { text: async () => JSON.stringify(body), headers: { get: () => 'sig_test' } } as unknown as Request
}

const emailReceivedPayload = {
  type: 'email.received',
  data: {
    email_id: 'em_1',
    from: 'sender@outside.com',
    to: 'inbox@a.example.com',
    subject: 'Hello',
    text: 'body',
  },
}

beforeEach(() => {
  insertedRows = []
  getTenantByDomain.mockClear()
  process.env.RESEND_WEBHOOK_VERIFY = 'off'
  vi.resetModules()
})

describe('resend webhook — inbound_emails tenant-scope guard defaults to a no-op', () => {
  it('flag unset: insert has no tenant_id/resolved_domain and the resolver is never called', async () => {
    delete process.env.INBOUND_EMAILS_TENANT_SCOPE_ENABLED
    const { POST } = await import('./route')

    const res = await POST(req(emailReceivedPayload))
    expect((await res.json()).ok).toBe(true)

    expect(insertedRows).toHaveLength(1)
    expect(insertedRows[0]).not.toHaveProperty('tenant_id')
    expect(insertedRows[0]).not.toHaveProperty('resolved_domain')
    expect(getTenantByDomain).not.toHaveBeenCalled()
  })

  it('flag=true (post-062 only): stamps tenant_id via the tenant_domains-first resolver', async () => {
    process.env.INBOUND_EMAILS_TENANT_SCOPE_ENABLED = 'true'
    const { POST } = await import('./route')

    const res = await POST(req(emailReceivedPayload))
    expect((await res.json()).ok).toBe(true)

    expect(getTenantByDomain).toHaveBeenCalledWith('a.example.com')
    expect(insertedRows).toHaveLength(1)
    expect(insertedRows[0].tenant_id).toBe('tenant_a')
    expect(insertedRows[0].resolved_domain).toBe('a.example.com')
  })

  it('flag=true but the recipient domain matches no tenant: tenant_id stays null (platform inbox)', async () => {
    process.env.INBOUND_EMAILS_TENANT_SCOPE_ENABLED = 'true'
    const { POST } = await import('./route')

    const res = await POST(req({
      ...emailReceivedPayload,
      data: { ...emailReceivedPayload.data, to: 'sales@fullloopcrm.com' },
    }))
    expect((await res.json()).ok).toBe(true)

    expect(insertedRows[0].tenant_id).toBeNull()
    expect(insertedRows[0].resolved_domain).toBe('fullloopcrm.com')
  })
})
