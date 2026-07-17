import { describe, it, expect, vi } from 'vitest'

/**
 * PUT /api/settings — vendor-secret / OAuth-token redaction probe.
 *
 * BUG (fixed here): GET on this same route already strips
 * google_tokens/telegram_bot_token/telegram_webhook_secret via
 * NEVER_RETURNED_FIELDS (see the comment at the top of route.ts documenting
 * why stripe_api_key/resend_api_key/imap_pass/anthropic_api_key/indexnow_key
 * stay IN the response — settings/page.tsx prefills those into editable
 * inputs). PUT never applied that same strip: its response body was built
 * straight from `.update(...).select().single()` (or the fallback
 * `select('*')` re-fetch), a full tenants row, and returned verbatim as
 * `tenant`. That silently re-exposed the 3 fields GET deliberately guards
 * against, on every settings save.
 */

const T = 'tid-a'

const SECRETS_STAYING_IN = {
  stripe_api_key: 'v1:SECRET-STRIPE-KEY',
  telnyx_api_key: 'v1:SECRET-TELNYX-KEY',
  resend_api_key: 'v1:SECRET-RESEND-KEY',
  imap_pass: 'v1:SECRET-IMAP-PASS',
  anthropic_api_key: 'v1:SECRET-ANTHROPIC-KEY',
  indexnow_key: 'v1:SECRET-INDEXNOW-KEY',
}
const NEVER_RETURNED = {
  google_tokens: { access_token: 'a', refresh_token: 'SECRET-GOOGLE-REFRESH-TOKEN', expires_at: 123 },
  telegram_bot_token: 'v1:SECRET-TELEGRAM-BOT-TOKEN',
  telegram_webhook_secret: 'v1:SECRET-TELEGRAM-WEBHOOK-SECRET',
}

const tenantRow: Record<string, unknown> = {
  id: T,
  name: 'Acme',
  phone: '+15551234567',
  ...SECRETS_STAYING_IN,
  ...NEVER_RETURNED,
}

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { tenant: tenantRow, tenantId: T, userId: 'u1', role: 'owner' },
    error: null,
  })),
}))
vi.mock('@/lib/settings', () => ({ clearSettingsCache: vi.fn() }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))
vi.mock('@/lib/security', () => ({ logSecurityEvent: vi.fn(async () => {}) }))
vi.mock('@/lib/secret-crypto', () => ({
  encryptTenantSecrets: (updates: Record<string, unknown>) => updates,
}))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from(table: string) {
      if (table !== 'tenants') throw new Error(`unexpected table ${table}`)
      return {
        update(_patch: Record<string, unknown>) {
          return {
            eq() {
              return {
                select() {
                  return {
                    single: async () => ({ data: tenantRow, error: null }),
                  }
                },
              }
            },
          }
        },
      }
    },
  },
}))

import { PUT } from './route'

function req(body: Record<string, unknown>) {
  return new Request('http://t/api/settings', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

describe('PUT /api/settings — vendor-secret redaction probe', () => {
  it('never returns google_tokens/telegram_bot_token/telegram_webhook_secret', async () => {
    const res = await PUT(req({ name: 'Acme Updated' }))
    const body = await res.json()
    expect(res.status).toBe(200)
    for (const key of Object.keys(NEVER_RETURNED)) {
      expect(body.tenant[key]).toBeUndefined()
    }
    expect(JSON.stringify(body.tenant)).not.toContain('SECRET-GOOGLE-REFRESH-TOKEN')
    expect(JSON.stringify(body.tenant)).not.toContain('SECRET-TELEGRAM')
  })

  it('CONTROL: fields the settings UI legitimately prefills into editable inputs still come through', async () => {
    const res = await PUT(req({ name: 'Acme Updated' }))
    const body = await res.json()
    for (const [key, val] of Object.entries(SECRETS_STAYING_IN)) {
      expect(body.tenant[key]).toBe(val)
    }
    expect(body.tenant.name).toBe('Acme')
  })
})
