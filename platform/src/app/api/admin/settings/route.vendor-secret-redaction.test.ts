import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * GET /api/admin/settings?tenant_id=X — vendor-secret / OAuth-token
 * redaction probe.
 *
 * BUG (fixed here): `select('*')` on `tenants`, returned to the browser
 * verbatim as `tenant` with zero redaction — not even the partial guard
 * GET /api/settings applies. Same bug class as admin/tenants/[id] and
 * admin/businesses/[id] (already fixed). admin/settings/page.tsx actually
 * calls this route with `scope=platform`/`scope=tenant` query params this
 * handler doesn't implement (a pre-existing, separate mismatch — not fixed
 * here), so the `tenant_id`-only branch has no known raw-secret consumer:
 * redact the full ENCRYPTED_TENANT_FIELDS set plus google_tokens, same as
 * admin/tenants/[id].
 */

const T = 'tid-a'

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

const tenantRow: Record<string, unknown> = {
  id: T,
  name: 'Acme',
  status: 'active',
  ...SECRETS,
  google_tokens: { access_token: 'a', refresh_token: SECRET_GOOGLE_REFRESH_TOKEN, expires_at: 123 },
}

vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))
vi.mock('@/lib/settings', () => ({ clearSettingsCache: vi.fn() }))
vi.mock('@/lib/secret-crypto', () => ({
  ENCRYPTED_TENANT_FIELDS: [
    'stripe_api_key', 'telnyx_api_key', 'resend_api_key', 'imap_pass',
    'anthropic_api_key', 'indexnow_key', 'telegram_bot_token', 'telegram_webhook_secret',
  ],
  encryptTenantSecrets: (updates: Record<string, unknown>) => updates,
}))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from(table: string) {
      if (table !== 'tenants') throw new Error(`unexpected table ${table}`)
      return {
        select() {
          return {
            eq() {
              return {
                single: async () => ({ data: tenantRow, error: null }),
              }
            },
          }
        },
      }
    },
  },
}))

import { GET } from './route'

describe('GET /api/admin/settings?tenant_id=X — vendor-secret redaction probe', () => {
  it('never returns any ENCRYPTED_TENANT_FIELDS value', async () => {
    const res = await GET(new NextRequest(`http://t/api/admin/settings?tenant_id=${T}`))
    const body = await res.json()
    expect(res.status).toBe(200)
    for (const key of Object.keys(SECRETS)) {
      expect(body.tenant[key]).toBeUndefined()
    }
    expect(JSON.stringify(body.tenant)).not.toContain('SECRET-')
  })

  it('never returns google_tokens (the raw OAuth access/refresh token pair)', async () => {
    const res = await GET(new NextRequest(`http://t/api/admin/settings?tenant_id=${T}`))
    const body = await res.json()
    expect(body.tenant.google_tokens).toBeUndefined()
    expect(JSON.stringify(body.tenant)).not.toContain(SECRET_GOOGLE_REFRESH_TOKEN)
  })

  it('CONTROL: non-secret fields still come through', async () => {
    const res = await GET(new NextRequest(`http://t/api/admin/settings?tenant_id=${T}`))
    const body = await res.json()
    expect(body.tenant.id).toBe(T)
    expect(body.tenant.name).toBe('Acme')
    expect(body.tenant.status).toBe('active')
  })
})
