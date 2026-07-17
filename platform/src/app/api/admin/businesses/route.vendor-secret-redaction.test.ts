import { describe, it, expect, vi } from 'vitest'

/**
 * GET /api/admin/businesses — vendor-secret / OAuth-token redaction probe.
 *
 * BUG (fixed here): `select('*, tenant_members(id), tenant_invites(id,
 * accepted))` on `tenants`, returned to the browser verbatim as the
 * `businesses` ARRAY — the LIST sibling of the already-fixed
 * admin/businesses/[id] DETAIL route (whose own edit form is a documented
 * exception that legitimately reads several of these raw to prefill inputs).
 * This list route has no such edit form and no consumer that reads a secret
 * field at all, so the [id] route's narrower exception doesn't apply here.
 *
 * Grepped all 8 real consumers (businesses, clients, calendar, bookings,
 * activity, social, ai, google-profile admin pages) — none reference any
 * vendor-secret or google_tokens field name.
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

const seedBusinesses = [
  {
    id: 'tid-a', name: 'Acme', industry: 'cleaning', created_at: '2026-01-02T00:00:00Z',
    ...SECRETS,
    google_tokens: { access_token: 'a', refresh_token: SECRET_GOOGLE_REFRESH_TOKEN, expires_at: 123 },
  },
  {
    id: 'tid-b', name: 'Beta', industry: 'plumbing', created_at: '2026-01-01T00:00:00Z',
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
      resolve({ data: seedBusinesses, error: null })
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

describe('GET /api/admin/businesses — vendor-secret redaction probe', () => {
  it('never returns any ENCRYPTED_TENANT_FIELDS value for any business in the list', async () => {
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.businesses).toHaveLength(2)
    for (const business of body.businesses) {
      for (const key of Object.keys(SECRETS)) {
        expect(business[key]).toBeUndefined()
      }
    }
    expect(JSON.stringify(body.businesses)).not.toContain('SECRET-')
  })

  it('never returns google_tokens (the raw OAuth access/refresh token pair)', async () => {
    const res = await GET()
    const body = await res.json()
    for (const business of body.businesses) {
      expect(business.google_tokens).toBeUndefined()
    }
    expect(JSON.stringify(body.businesses)).not.toContain(SECRET_GOOGLE_REFRESH_TOKEN)
  })

  it('CONTROL: non-secret fields every consumer page renders still come through', async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.businesses[0].id).toBe('tid-a')
    expect(body.businesses[0].name).toBe('Acme')
    expect(body.businesses[0].industry).toBe('cleaning')
    expect(body.businesses[1].id).toBe('tid-b')
    expect(body.businesses[1].name).toBe('Beta')
  })
})
