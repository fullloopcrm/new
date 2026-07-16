import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/settings — permission gate + dead-field stripping.
 *
 * BUG (fixed here): GET only called getTenantForRequest(), which succeeds
 * for ANY tenant_members row regardless of role, then returned the raw
 * `select('*')` tenants row verbatim -- including every live vendor API key
 * (stripe_api_key, telnyx_api_key, resend_api_key, imap_pass,
 * anthropic_api_key, indexnow_key, telegram_bot_token/webhook_secret) and
 * the Google OAuth token pair (google_tokens.access_token is stored
 * PLAINTEXT and is a live ~1hr Graph/Business-Profile bearer credential).
 * 'staff' (rbac.ts grants only clients/bookings/team/schedules/reviews/
 * sales/notifications view -- never settings.view) could pull every
 * integration credential the tenant has configured via one direct API call,
 * same class as the social/accounts access_token leak fixed in 663917aa.
 *
 * FIX: requirePermission('settings.view') gates the route (matches the
 * permission catalog's own settings.view description and PUT's existing
 * settings.edit gate). google_tokens/telegram_bot_token/telegram_webhook_
 * secret are also stripped for authorized viewers -- grepped dashboard/**,
 * zero read-back consumers for those three. Deliberately did NOT strip
 * stripe_api_key/resend_api_key/imap_pass/anthropic_api_key/indexnow_key:
 * settings/page.tsx prefills each into an editable input (form.X || '') so
 * an operator can see/update a key without retyping it -- stripping those
 * would blank the field and risk wiping the stored key on the next save.
 */

const A = 'tid-a'

const TENANT_ROW = {
  id: A,
  name: 'Acme',
  stripe_api_key: 'v1:aaa:bbb:ccc',
  telnyx_api_key: 'plaintext-telnyx-key',
  resend_api_key: 'plaintext-resend-key',
  imap_pass: 'secret-imap-pass',
  anthropic_api_key: 'sk-ant-xxx',
  indexnow_key: 'indexnow-secret',
  telegram_bot_token: 'telegram-bot-token',
  telegram_webhook_secret: 'telegram-webhook-secret',
  google_tokens: { access_token: 'live-google-access-token', refresh_token: 'v1:aaa:bbb:ccc', expires_at: 123 },
}

const roleHolder = vi.hoisted(() => ({ role: 'owner' as string }))
vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: A,
      tenant: { ...TENANT_ROW },
      role: roleHolder.role,
    })),
  }
})

import { GET } from './route'

beforeEach(() => {
  roleHolder.role = 'owner'
})

describe('GET /api/settings — permission probe', () => {
  it('owner (has settings.view) can load settings', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it("'manager' (has settings.view per rbac.ts) can load settings", async () => {
    roleHolder.role = 'manager'
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'staff' (no settings.view) is forbidden, zero fields returned", async () => {
    roleHolder.role = 'staff'
    const res = await GET()
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.tenant).toBeUndefined()
  })
})

describe('GET /api/settings — dead-field stripping (zero UI consumers)', () => {
  it('strips google_tokens and the telegram bot credentials, even for an authorized owner', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tenant.id).toBe(A)
    expect(body.tenant.name).toBe('Acme')
    expect(body.tenant.google_tokens).toBeUndefined()
    expect(body.tenant.telegram_bot_token).toBeUndefined()
    expect(body.tenant.telegram_webhook_secret).toBeUndefined()
  })

  it('still returns the vendor keys the settings-edit form prefills from (owner)', async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.tenant.stripe_api_key).toBe(TENANT_ROW.stripe_api_key)
    expect(body.tenant.telnyx_api_key).toBe(TENANT_ROW.telnyx_api_key)
    expect(body.tenant.resend_api_key).toBe(TENANT_ROW.resend_api_key)
    expect(body.tenant.imap_pass).toBe(TENANT_ROW.imap_pass)
    expect(body.tenant.anthropic_api_key).toBe(TENANT_ROW.anthropic_api_key)
    expect(body.tenant.indexnow_key).toBe(TENANT_ROW.indexnow_key)
  })
})
