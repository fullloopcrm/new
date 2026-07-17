import { describe, it, expect, vi } from 'vitest'

/**
 * GET /api/admin/tenants — vendor-secret / OAuth-token redaction probe.
 *
 * BUG (fixed here): `select('*, tenant_members(id))` on `tenants`, returned to
 * the browser verbatim as the `tenants` ARRAY — the LIST sibling of the
 * already-fixed admin/tenants/[id] DETAIL route, and arguably worse: one call
 * dumps every tenant's stripe_api_key/telnyx_api_key/resend_api_key/
 * imap_pass/anthropic_api_key/indexnow_key/telegram_bot_token/
 * telegram_webhook_secret + google_tokens (live Google OAuth token pair) at
 * once, instead of one tenant at a time.
 *
 * Grepped all 4 real consumers of this route (admin/tenants, admin/settings,
 * admin/team, admin/finance pages) — none reference any vendor-secret or
 * google_tokens field name, so (unlike admin/businesses/[id]'s edit form)
 * there's no raw-value UX to preserve here. Full redaction, zero booleans
 * needed.
 */

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

const seedTenants = [
  {
    id: 'tid-a', name: 'Acme', status: 'active', created_at: '2026-01-02T00:00:00Z',
    ...SECRETS,
    google_tokens: { access_token: 'a', refresh_token: SECRET_GOOGLE_REFRESH_TOKEN, expires_at: 123 },
  },
  {
    id: 'tid-b', name: 'Beta', status: 'setup', created_at: '2026-01-01T00:00:00Z',
    ...SECRETS,
    google_tokens: null,
  },
]

function makeChain() {
  const chain = {
    order() {
      return chain
    },
    then(resolve: (v: unknown) => void) {
      resolve({ data: seedTenants, error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from() {
      return { select: () => makeChain() }
    },
  },
}))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))

import { GET } from './route'

describe('GET /api/admin/tenants — vendor-secret redaction probe', () => {
  it('never returns any ENCRYPTED_TENANT_FIELDS value for any tenant in the list', async () => {
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.tenants).toHaveLength(2)
    for (const tenant of body.tenants) {
      for (const key of Object.keys(SECRETS)) {
        expect(tenant[key]).toBeUndefined()
      }
    }
    expect(JSON.stringify(body.tenants)).not.toContain('SECRET-')
  })

  it('never returns google_tokens (the raw OAuth access/refresh token pair)', async () => {
    const res = await GET()
    const body = await res.json()
    for (const tenant of body.tenants) {
      expect(tenant.google_tokens).toBeUndefined()
    }
    expect(JSON.stringify(body.tenants)).not.toContain(SECRET_GOOGLE_REFRESH_TOKEN)
  })

  it('CONTROL: non-secret fields every consumer page renders still come through', async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.tenants[0].id).toBe('tid-a')
    expect(body.tenants[0].name).toBe('Acme')
    expect(body.tenants[0].status).toBe('active')
    expect(body.tenants[1].id).toBe('tid-b')
    expect(body.tenants[1].name).toBe('Beta')
  })
})
