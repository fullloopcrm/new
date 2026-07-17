import { describe, it, expect, vi } from 'vitest'

/**
 * GET /api/admin/tenants/[id] — vendor-secret / OAuth-token redaction probe.
 *
 * BUG (fixed here): `select('*')` on `tenants`, returned to the browser
 * verbatim as `tenant`. That row carries every live vendor credential the
 * tenant owns — `stripe_api_key` (a Stripe secret key), `telnyx_api_key`
 * (SMS), `resend_api_key` (email), `imap_pass`, `anthropic_api_key`,
 * `indexnow_key`, `telegram_bot_token`/`telegram_webhook_secret` — plus
 * `google_tokens`, a live Google OAuth access/refresh-token pair (long-lived
 * account access to the tenant's real Google Business Profile). Same
 * "credential-shaped value shipped to the browser via select('*')" shape as
 * the already-fixed clients.pin/team_members.pin/bookings.team_member_token
 * findings, but on `tenants` and with third-party API keys instead of
 * internal PINs/tokens — this route's blast radius includes real billing
 * (Stripe) and messaging (Telnyx/Resend) accounts.
 *
 * This route's only consumer, admin/tenants/[id]/page.tsx, is a READ-ONLY
 * summary view: it never prefills a raw secret into an editable input
 * (unlike admin/businesses/[id]/page.tsx's edit form, which legitimately
 * needs several of these raw — see that route's own redaction, scoped
 * narrower on purpose). It only ever truthy-checked resend_api_key/
 * telnyx_api_key for a connected badge, so every ENCRYPTED_TENANT_FIELDS
 * value plus google_tokens can be redacted here with zero UX regression,
 * replacing the two checked fields with explicit has_resend_api_key/
 * has_telnyx_api_key booleans.
 */

const T = 'tid-a'

function makeChain(rows: Record<string, unknown>[], countHead: boolean) {
  const filters: Array<{ col: string; val: unknown }> = []
  let wantSingle = false
  const chain = {
    eq(col: string, val: unknown) {
      filters.push({ col, val })
      return chain
    },
    in(col: string, vals: unknown[]) {
      filters.push({ col, val: vals })
      return chain
    },
    single() {
      wantSingle = true
      return chain
    },
    then(resolve: (v: unknown) => void) {
      const hit = rows.filter((r) =>
        filters.every((f) => (Array.isArray(f.val) ? f.val.includes(r[f.col]) : r[f.col] === f.val)),
      )
      if (countHead) {
        resolve({ data: null, error: null, count: hit.length })
        return
      }
      resolve(wantSingle ? { data: hit[0] ?? null, error: null } : { data: hit, error: null })
    },
  }
  return chain
}

const SECRETS = {
  stripe_api_key: 'v1:SECRET-STRIPE-KEY',
  telnyx_api_key: 'v1:SECRET-TELNYX-KEY',
  resend_api_key: 'v1:SECRET-RESEND-KEY',
  imap_pass: 'v1:SECRET-IMAP-PASS',
  anthropic_api_key: 'v1:SECRET-ANTHROPIC-KEY',
  indexnow_key: 'v1:SECRET-INDEXNOW-KEY',
  telegram_bot_token: 'v1:SECRET-TELEGRAM-BOT-TOKEN',
  telegram_webhook_secret: 'v1:SECRET-TELEGRAM-WEBHOOK-SECRET',
}
const SECRET_GOOGLE_REFRESH_TOKEN = 'SECRET-GOOGLE-REFRESH-TOKEN'

const seedData: Record<string, Record<string, unknown>[]> = {
  tenants: [{
    id: T, name: 'Acme', status: 'active', telnyx_phone: '+15551234567', stripe_account_id: 'acct_123',
    ...SECRETS,
    google_tokens: { access_token: 'a', refresh_token: SECRET_GOOGLE_REFRESH_TOKEN, expires_at: 123 },
  }],
  tenant_members: [],
  clients: [],
  bookings: [],
  team_members: [],
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from(table: string) {
      return {
        select(_cols: string, opts?: { count?: string; head?: boolean }) {
          return makeChain(seedData[table] || [], !!opts?.head)
        },
      }
    },
  },
}))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))

import { GET } from './route'

describe('GET /api/admin/tenants/[id] — vendor-secret redaction probe', () => {
  it('never returns any ENCRYPTED_TENANT_FIELDS value', async () => {
    const res = await GET(new Request(`http://t/api/admin/tenants/${T}`), { params: Promise.resolve({ id: T }) })
    const body = await res.json()
    expect(res.status).toBe(200)
    for (const key of Object.keys(SECRETS)) {
      expect(body.tenant[key]).toBeUndefined()
    }
    expect(JSON.stringify(body.tenant)).not.toContain('SECRET-')
  })

  it('never returns google_tokens (the raw OAuth access/refresh token pair)', async () => {
    const res = await GET(new Request(`http://t/api/admin/tenants/${T}`), { params: Promise.resolve({ id: T }) })
    const body = await res.json()
    expect(body.tenant.google_tokens).toBeUndefined()
    expect(JSON.stringify(body.tenant)).not.toContain(SECRET_GOOGLE_REFRESH_TOKEN)
  })

  it('CONTROL: replaces the redacted secrets with derived booleans the page actually reads', async () => {
    const res = await GET(new Request(`http://t/api/admin/tenants/${T}`), { params: Promise.resolve({ id: T }) })
    const body = await res.json()
    expect(body.tenant.has_resend_api_key).toBe(true)
    expect(body.tenant.has_telnyx_api_key).toBe(true)
  })

  it('CONTROL: non-secret fields the page renders directly still come through', async () => {
    const res = await GET(new Request(`http://t/api/admin/tenants/${T}`), { params: Promise.resolve({ id: T }) })
    const body = await res.json()
    expect(body.tenant.id).toBe(T)
    expect(body.tenant.name).toBe('Acme')
    expect(body.tenant.telnyx_phone).toBe('+15551234567')
    expect(body.tenant.stripe_account_id).toBe('acct_123')
  })
})
