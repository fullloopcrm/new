import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'

/**
 * social_accounts.access_token holds a long-lived Facebook/Instagram Page
 * OAuth token (derived from a long-lived user token in the connect
 * callbacks — these don't expire). Every other vendor credential in this
 * codebase (Stripe/Telnyx/Resend/Anthropic keys, IMAP password, Telegram bot
 * token on `tenants`; Google refresh_token in google.ts) is encrypted at
 * rest via secret-crypto.ts. social_accounts was the one table that stored
 * this class of secret in plaintext. Verifies saveSocialAccount now encrypts
 * before writing and getSocialAccounts decrypts on read, with a real
 * mocked-DB round trip (not just calling encryptSecret/decryptSecret
 * directly) so the wiring itself is under test.
 */

const KEY = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff'
const ORIG_KEY = process.env.SECRET_ENCRYPTION_KEY

// Minimal in-memory table so upsert -> select round-trips through the same
// path saveSocialAccount/getSocialAccounts actually use.
let rows: Record<string, unknown>[] = []

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table !== 'social_accounts') throw new Error(`unexpected table ${table}`)
      return {
        upsert: async (row: Record<string, unknown>) => {
          rows = rows.filter((r) => !(r.tenant_id === row.tenant_id && r.platform === row.platform))
          rows.push({ id: `acct-${rows.length + 1}`, ...row })
          return { error: null }
        },
        select: () => ({
          eq: (_col: string, tenantId: string) => ({
            order: async () => ({ data: rows.filter((r) => r.tenant_id === tenantId) }),
          }),
        }),
        delete: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
      }
    },
  },
}))

beforeEach(() => {
  rows = []
  process.env.SECRET_ENCRYPTION_KEY = KEY
  vi.resetModules()
})

afterAll(() => {
  if (ORIG_KEY === undefined) delete process.env.SECRET_ENCRYPTION_KEY
  else process.env.SECRET_ENCRYPTION_KEY = ORIG_KEY
})

describe('social_accounts access_token — encrypted at rest', () => {
  it('stores the token encrypted in the DB row, not plaintext', async () => {
    const { saveSocialAccount } = await import('@/lib/social')
    const RAW_TOKEN = 'EAAG-super-secret-live-fb-page-token'

    await saveSocialAccount('tenant-a', 'facebook', {
      account_id: 'fb-123',
      account_name: 'My Page',
      access_token: RAW_TOKEN,
      page_id: 'page-123',
    })

    expect(rows).toHaveLength(1)
    expect(rows[0].access_token).not.toBe(RAW_TOKEN)
    expect(String(rows[0].access_token)).toMatch(/^v1:/)
  })

  it('getSocialAccounts decrypts the stored token back to the original plaintext', async () => {
    const { saveSocialAccount, getSocialAccounts } = await import('@/lib/social')
    const RAW_TOKEN = 'EAAG-another-secret-token'

    await saveSocialAccount('tenant-b', 'instagram', {
      account_id: 'ig-456',
      account_name: 'My IG',
      access_token: RAW_TOKEN,
    })

    const accounts = await getSocialAccounts('tenant-b')
    expect(accounts).toHaveLength(1)
    expect(accounts[0].access_token).toBe(RAW_TOKEN)
  })

  it('legacy plaintext rows (pre-migration) still decrypt (pass through) rather than breaking the list', async () => {
    const { getSocialAccounts } = await import('@/lib/social')
    rows.push({
      id: 'legacy-1',
      tenant_id: 'tenant-c',
      platform: 'facebook',
      account_id: 'fb-legacy',
      account_name: 'Legacy Page',
      access_token: 'plain-legacy-token-never-encrypted',
      page_id: 'page-legacy',
      connected_at: '2025-01-01',
    })

    const accounts = await getSocialAccounts('tenant-c')
    expect(accounts[0].access_token).toBe('plain-legacy-token-never-encrypted')
  })

  it('a tampered/corrupt encrypted row fails closed (empty token) instead of throwing or leaking', async () => {
    const { getSocialAccounts } = await import('@/lib/social')
    rows.push({
      id: 'corrupt-1',
      tenant_id: 'tenant-d',
      platform: 'facebook',
      account_id: 'fb-corrupt',
      account_name: 'Corrupt Page',
      access_token: 'v1:not:a:validenvelope',
      page_id: 'page-corrupt',
      connected_at: '2025-01-01',
    })

    const accounts = await getSocialAccounts('tenant-d')
    expect(accounts).toHaveLength(1)
    expect(accounts[0].access_token).toBe('')
  })
})
