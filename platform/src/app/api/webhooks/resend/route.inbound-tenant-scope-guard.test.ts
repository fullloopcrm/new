import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * inbound_emails used to insert with NO tenant_id — an unscoped, globally
 * visible row (any admin inbox reading the table would see every tenant's
 * inbound mail). The route now resolves the tenant that owns the recipient
 * address via resolveTenantIdForInboundEmail() (src/lib/inbound-email-tenant.ts)
 * before inserting, and fails CLOSED: if no tenant resolves, the message is
 * dropped rather than written as an unscoped row.
 *
 * This locks in both halves of that guard:
 *   - Recipient resolves to a tenant: the row is stamped with that tenant_id.
 *   - Recipient resolves to no tenant: DROPPED — no insert at all, never a
 *     platform-wide unscoped fallback row.
 */

const resolveTenantIdForInboundEmail = vi.fn(async (toAddress: string | null) =>
  toAddress === 'inbox@a.example.com' ? 'tenant_a' : null,
)

vi.mock('@/lib/inbound-email-tenant', () => ({ resolveTenantIdForInboundEmail }))
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
  resolveTenantIdForInboundEmail.mockClear()
  process.env.RESEND_WEBHOOK_VERIFY = 'off'
  vi.resetModules()
})

describe('resend webhook — inbound_emails tenant-scope guard', () => {
  it('recipient resolves to a tenant: insert is stamped with that tenant_id', async () => {
    const { POST } = await import('./route')

    const res = await POST(req(emailReceivedPayload))
    expect((await res.json()).ok).toBe(true)

    expect(resolveTenantIdForInboundEmail).toHaveBeenCalledWith('inbox@a.example.com')
    expect(insertedRows).toHaveLength(1)
    expect(insertedRows[0].tenant_id).toBe('tenant_a')
    expect(insertedRows[0].to_address).toBe('inbox@a.example.com')
  })

  it('recipient resolves to no tenant: message is dropped, no unscoped row is ever inserted', async () => {
    const { POST } = await import('./route')

    const res = await POST(req({
      ...emailReceivedPayload,
      data: { ...emailReceivedPayload.data, to: 'sales@fullloopcrm.com' },
    }))
    const body = await res.json()

    expect(body.ok).toBe(true)
    expect(body.dropped).toBe('no_tenant')
    expect(insertedRows).toHaveLength(0)
  })
})
