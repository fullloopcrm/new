import { describe, it, expect, vi } from 'vitest'

/**
 * comhub-email's per-tenant IMAP loop resolves each tenant's outbound
 * from-address from tenants.email_from. If nycmaid's tenant row is ever
 * migrated onto that profile path (imap + resend_api_key set) before
 * email_from is populated, the generic sender fallback in lib/email.ts
 * ('Full Loop CRM <hello@fullloopcrm.com>') would leak as the visible
 * From on nycmaid's Yinez auto-replies. nycmaid must always resolve to
 * hi@thenycmaid.com regardless of profile completeness (P1 parity: LANE=EMAIL).
 */

const h = vi.hoisted(() => ({
  tenantRows: [] as Record<string, unknown>[],
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        not: () => ({
          not: () => ({
            not: () => Promise.resolve({ data: h.tenantRows, error: null }),
          }),
        }),
      }),
    }),
  },
}))

vi.mock('@/lib/secret-crypto', () => ({
  decryptSecret: (v: string) => v,
}))

vi.mock('imapflow', () => ({ ImapFlow: class {} }))
vi.mock('mailparser', () => ({ simpleParser: async () => ({}) }))
vi.mock('@/lib/selena/agent', () => ({ askSelena: async () => ({ text: '' }) }))
vi.mock('@/lib/messaging/shell', () => ({ emailShell: () => '' }))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: async () => ({ success: true }) }))
vi.mock('@/lib/email', () => ({ sendEmail: async () => ({ id: 'x' }) }))

const NYCMAID_TENANT_ID = '00000000-0000-0000-0000-000000000001'

describe('comhub-email collectAccounts — nycmaid from-address safety net', () => {
  it('defaults nycmaid to hi@thenycmaid.com when its profile row has no email_from', async () => {
    h.tenantRows = [{
      id: NYCMAID_TENANT_ID,
      name: 'The NYC Maid',
      imap_host: 'mail.thenycmaid.com',
      imap_user: 'hi@thenycmaid.com',
      imap_pass: 'enc:secret',
      imap_port: 993,
      resend_api_key: 're_live_xxx',
      email_from: null,
    }]

    const { collectAccounts } = await import('./route')
    const accounts = await collectAccounts()

    const nycmaid = accounts.find(a => a.tenantId === NYCMAID_TENANT_ID)
    expect(nycmaid).toBeDefined()
    expect(nycmaid!.emailFrom).toBe('The NYC Maid <hi@thenycmaid.com>')
  })

  it('does not fabricate an emailFrom for a non-nycmaid tenant missing email_from (preserves fall-through to the generic default)', async () => {
    h.tenantRows = [{
      id: 'some-other-tenant-uuid',
      name: 'Some Other Tenant',
      imap_host: 'mail.example.com',
      imap_user: 'hi@example.com',
      imap_pass: 'enc:secret',
      imap_port: 993,
      resend_api_key: 're_live_yyy',
      email_from: null,
    }]

    const { collectAccounts } = await import('./route')
    const accounts = await collectAccounts()

    const other = accounts.find(a => a.tenantId === 'some-other-tenant-uuid')
    expect(other).toBeDefined()
    expect(other!.emailFrom).toBeNull()
  })

  it('still honors an explicit email_from when nycmaid has one set', async () => {
    h.tenantRows = [{
      id: NYCMAID_TENANT_ID,
      name: 'The NYC Maid',
      imap_host: 'mail.thenycmaid.com',
      imap_user: 'hi@thenycmaid.com',
      imap_pass: 'enc:secret',
      imap_port: 993,
      resend_api_key: 're_live_xxx',
      email_from: 'The NYC Maid <custom@thenycmaid.com>',
    }]

    const { collectAccounts } = await import('./route')
    const accounts = await collectAccounts()

    const nycmaid = accounts.find(a => a.tenantId === NYCMAID_TENANT_ID)
    expect(nycmaid!.emailFrom).toBe('The NYC Maid <custom@thenycmaid.com>')
  })
})
