import { describe, it, expect, vi } from 'vitest'

/**
 * GET /api/admin/businesses/[id] — google_tokens / telegram_webhook_secret
 * redaction probe.
 *
 * BUG (fixed here): `select('*')` on `tenants`, returned to the browser
 * verbatim as `business`. Unlike admin/tenants/[id] (a read-only view, fixed
 * to redact every ENCRYPTED_TENANT_FIELDS value), THIS route's edit form
 * (admin/businesses/[id]/page.tsx) legitimately prefills several vendor keys
 * (stripe_api_key, telnyx_api_key, resend_api_key, imap_pass,
 * anthropic_api_key, indexnow_key, telegram_bot_token) into editable inputs
 * so an admin can view/rotate an existing key without retyping it —
 * stripping those would blank the field and risk wiping the stored key on
 * next save, the exact trap /api/settings/route.ts's own
 * NEVER_RETURNED_FIELDS comment documents avoiding. But two fields have ZERO
 * such consumer (grepped admin/businesses/[id]/page.tsx and its wizard/
 * selena-persona siblings): `google_tokens` (a live Google OAuth
 * access/refresh-token pair — the one place it was read, line ~874, only
 * ever truthy-checked `.refresh_token` for a "connected" badge, replaced
 * below with an explicit boolean) and `telegram_webhook_secret` (no
 * consumer anywhere). Both were shipped to the browser for no reason.
 *
 * Deliberately does NOT assert telegram_bot_token/stripe_api_key/etc. are
 * redacted — they are legitimately returned raw here (see route.ts's own
 * comment); asserting their absence would encode a regression, not a fix.
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
    order() {
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

const SECRET_GOOGLE_REFRESH_TOKEN = 'SECRET-GOOGLE-REFRESH-TOKEN'
const SECRET_TELEGRAM_WEBHOOK_SECRET = 'v1:SECRET-TELEGRAM-WEBHOOK-SECRET'
const LIVE_TELEGRAM_BOT_TOKEN = 'v1:LIVE-TELEGRAM-BOT-TOKEN'

const seedData: Record<string, Record<string, unknown>[]> = {
  tenants: [{
    id: T, name: 'Acme', status: 'active', setup_progress: {},
    google_tokens: { access_token: 'a', refresh_token: SECRET_GOOGLE_REFRESH_TOKEN, expires_at: 123 },
    telegram_webhook_secret: SECRET_TELEGRAM_WEBHOOK_SECRET,
    telegram_bot_token: LIVE_TELEGRAM_BOT_TOKEN,
  }],
  tenant_members: [],
  tenant_invites: [],
  clients: [],
  bookings: [],
  team_members: [],
  service_types: [],
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

describe('GET /api/admin/businesses/[id] — google_tokens/telegram_webhook_secret redaction probe', () => {
  it('never returns google_tokens (the raw OAuth access/refresh token pair)', async () => {
    const res = await GET(new Request(`http://t/api/admin/businesses/${T}`), { params: Promise.resolve({ id: T }) })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.business.google_tokens).toBeUndefined()
    expect(JSON.stringify(body.business)).not.toContain(SECRET_GOOGLE_REFRESH_TOKEN)
  })

  it('never returns telegram_webhook_secret (zero read-back consumers)', async () => {
    const res = await GET(new Request(`http://t/api/admin/businesses/${T}`), { params: Promise.resolve({ id: T }) })
    const body = await res.json()
    expect(body.business.telegram_webhook_secret).toBeUndefined()
    expect(JSON.stringify(body.business)).not.toContain('SECRET-TELEGRAM-WEBHOOK-SECRET')
  })

  it('CONTROL: replaces google_tokens with the boolean the page actually reads', async () => {
    const res = await GET(new Request(`http://t/api/admin/businesses/${T}`), { params: Promise.resolve({ id: T }) })
    const body = await res.json()
    expect(body.business.google_oauth_connected).toBe(true)
  })

  it('CONTROL: telegram_bot_token is still returned raw — this route\'s edit form legitimately prefills it', async () => {
    const res = await GET(new Request(`http://t/api/admin/businesses/${T}`), { params: Promise.resolve({ id: T }) })
    const body = await res.json()
    expect(body.business.telegram_bot_token).toBe(LIVE_TELEGRAM_BOT_TOKEN)
  })
})
