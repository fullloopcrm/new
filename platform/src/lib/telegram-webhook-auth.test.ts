import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  verifyTelegramWebhook,
  deriveTelegramSecret,
  telegramWebhookSecretConfigured,
  TELEGRAM_SECRET_HEADER,
} from './telegram-webhook-auth'

/**
 * Telegram webhook authenticity — the fix for a forged body-supplied chat_id
 * driving the owner agent. Every inbound update must carry Telegram's
 * X-Telegram-Bot-Api-Secret-Token; we verify it FAIL-CLOSED and per bot scope.
 */

const MASTER = 'unit-test-telegram-master-secret'

function reqWith(secret?: string): Request {
  const h = new Headers()
  if (secret !== undefined) h.set(TELEGRAM_SECRET_HEADER, secret)
  return new Request('https://x/api/webhooks/telegram', { method: 'POST', headers: h })
}

describe('telegram webhook secret-token verification (fail-closed)', () => {
  const original = process.env.TELEGRAM_WEBHOOK_SECRET

  afterEach(() => {
    if (original === undefined) delete process.env.TELEGRAM_WEBHOOK_SECRET
    else process.env.TELEGRAM_WEBHOOK_SECRET = original
  })

  describe('master secret UNSET → fail closed', () => {
    beforeEach(() => {
      delete process.env.TELEGRAM_WEBHOOK_SECRET
    })

    it('reports not configured', () => {
      expect(telegramWebhookSecretConfigured()).toBe(false)
      expect(deriveTelegramSecret('platform-owner')).toBeNull()
    })

    it('REJECTS even a request that carries some secret header (cannot fall open)', () => {
      const r = verifyTelegramWebhook(reqWith('anything'), 'platform-owner')
      expect(r.ok).toBe(false)
      expect(r.reason).toBe('webhook_secret_unconfigured')
    })

    it('REJECTS a request with no header', () => {
      expect(verifyTelegramWebhook(reqWith(), 'jefe').ok).toBe(false)
    })
  })

  describe('master secret SET', () => {
    beforeEach(() => {
      process.env.TELEGRAM_WEBHOOK_SECRET = MASTER
    })

    it('derives a stable, telegram-legal (A-Za-z0-9_-) secret per scope', () => {
      const s = deriveTelegramSecret('platform-owner')
      expect(s).not.toBeNull()
      expect(s).toMatch(/^[A-Za-z0-9_-]{1,256}$/)
      // deterministic
      expect(deriveTelegramSecret('platform-owner')).toBe(s)
    })

    it('ACCEPTS the correct derived secret for the scope', () => {
      const secret = deriveTelegramSecret('platform-owner')!
      const r = verifyTelegramWebhook(reqWith(secret), 'platform-owner')
      expect(r.ok).toBe(true)
      expect(r.reason).toBe('ok')
    })

    it('REJECTS a missing header', () => {
      const r = verifyTelegramWebhook(reqWith(), 'platform-owner')
      expect(r.ok).toBe(false)
      expect(r.reason).toBe('missing_secret_token')
    })

    it('REJECTS an empty header', () => {
      const r = verifyTelegramWebhook(reqWith(''), 'platform-owner')
      expect(r.ok).toBe(false)
      expect(r.reason).toBe('missing_secret_token')
    })

    it('REJECTS a forged/wrong secret (attacker guesses)', () => {
      const r = verifyTelegramWebhook(reqWith('deadbeef'.repeat(8)), 'platform-owner')
      expect(r.ok).toBe(false)
      expect(r.reason).toBe('bad_secret_token')
    })

    it('per-scope isolation: a valid tenant-A secret is REJECTED under tenant-B scope', () => {
      const aSecret = deriveTelegramSecret('tenant:aaaaaaaa-0000-0000-0000-000000000001')!
      const bSecret = deriveTelegramSecret('tenant:bbbbbbbb-0000-0000-0000-000000000002')!
      expect(aSecret).not.toBe(bSecret)
      // replay A's secret against B
      const r = verifyTelegramWebhook(reqWith(aSecret), 'tenant:bbbbbbbb-0000-0000-0000-000000000002')
      expect(r.ok).toBe(false)
      expect(r.reason).toBe('bad_secret_token')
    })

    it("owner-bot secret is REJECTED on the jefe bot (scope-bound)", () => {
      const ownerSecret = deriveTelegramSecret('platform-owner')!
      expect(verifyTelegramWebhook(reqWith(ownerSecret), 'jefe').ok).toBe(false)
    })
  })
})
