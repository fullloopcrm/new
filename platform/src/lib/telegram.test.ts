import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'

/**
 * alertOwner() is the single choke point every platform monitoring alert
 * (error-tracking, system-check, comms/health monitors, Jefe pillars) already
 * calls. Email fan-out was removed 2026-07-27 (Jeff's call) — monitoring
 * alerts route to the monitoring system (error_logs/notifications) and this
 * Telegram channel only, never to his inbox. This locks in: Telegram-only,
 * no email regardless of ADMIN_NOTIFICATION_EMAIL.
 *
 * alertOwnerCritical() is the new "major error" channel — SMS via NYC Maid's
 * own Telnyx number to NYC Maid's owner_phone. This locks in: fires when NYC
 * Maid's Telnyx/owner-phone is configured, no-ops silently when it isn't.
 *
 * Module-level env reads mean each test re-imports fresh via vi.resetModules()
 * after setting env vars, same pattern as otp-send-code-failclosed.test.ts.
 */

let tenantRow: Record<string, unknown> | null

const sendSMSMock = vi.fn(async (_args: unknown) => ({}))
vi.mock('./sms', () => ({ sendSMS: (args: unknown) => sendSMSMock(args as never) }))

vi.mock('./supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: () => ({
        eq: (_col: string, _val: unknown) => ({
          single: async () => {
            if (table !== 'tenants') return { data: null, error: null }
            return { data: tenantRow, error: null }
          },
        }),
      }),
    }),
  },
}))

const originalFetch = global.fetch

beforeEach(() => {
  vi.resetModules()
  sendSMSMock.mockClear()
  tenantRow = null
  global.fetch = vi.fn(async () => new Response('{"ok":true}', { status: 200 })) as typeof fetch
  delete process.env.ADMIN_NOTIFICATION_EMAIL
  delete process.env.JEFE_OWNER_CHAT_ID
  delete process.env.TELEGRAM_OWNER_CHAT_ID
  delete process.env.JEFE_BOT_TOKEN
})

afterAll(() => {
  global.fetch = originalFetch
})

describe('alertOwner — Telegram only, never email', () => {
  it('sends Telegram and never touches email even when ADMIN_NOTIFICATION_EMAIL is set', async () => {
    process.env.ADMIN_NOTIFICATION_EMAIL = 'jeff@example.com'
    process.env.JEFE_OWNER_CHAT_ID = '-100'
    process.env.JEFE_BOT_TOKEN = 'bot-token'
    const { alertOwner } = await import('./telegram')

    const result = await alertOwner('Site down', 'nycmaid is unreachable')

    expect(result?.ok).toBe(true)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('no-ops when Telegram is not configured', async () => {
    process.env.ADMIN_NOTIFICATION_EMAIL = 'jeff@example.com'
    const { alertOwner } = await import('./telegram')

    const result = await alertOwner('Site down')

    expect(result).toBeNull()
    expect(global.fetch).not.toHaveBeenCalled()
  })
})

describe('sendTelegram — failed sends are logged, not silent', () => {
  it('logs a non-ok Telegram response instead of swallowing it', async () => {
    global.fetch = vi.fn(async () => new Response('{"ok":false,"description":"Forbidden: bot was blocked by the user"}', { status: 403 })) as typeof fetch
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { sendTelegram } = await import('./telegram')

    const result = await sendTelegram('-100', 'test message', 'bot-token')

    expect(result.ok).toBe(false)
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('sendMessage failed'))
    errorSpy.mockRestore()
  })

  it('logs a thrown network error instead of swallowing it', async () => {
    global.fetch = vi.fn(async () => { throw new Error('fetch failed: ENOTFOUND') }) as typeof fetch
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { sendTelegram } = await import('./telegram')

    const result = await sendTelegram('-100', 'test message', 'bot-token')

    expect(result.ok).toBe(false)
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('sendMessage threw'), expect.any(Error))
    errorSpy.mockRestore()
  })
})

describe('alertOwnerCritical — SMS via NYC Maid Telnyx', () => {
  it('sends SMS to NYC Maid owner_phone via NYC Maid Telnyx when configured', async () => {
    tenantRow = {
      telnyx_api_key: 'key-123',
      telnyx_phone: '+18883164019',
      owner_phone: '+12125551212',
    }
    const { alertOwnerCritical } = await import('./telegram')

    await alertOwnerCritical('CRITICAL Error: cron/comms-monitor', 'boom')

    expect(sendSMSMock).toHaveBeenCalledTimes(1)
    expect(sendSMSMock.mock.calls[0][0]).toMatchObject({
      to: '+12125551212',
      telnyxApiKey: 'key-123',
      telnyxPhone: '+18883164019',
    })
  })

  it('no-ops silently when NYC Maid Telnyx/owner-phone is not configured', async () => {
    tenantRow = { telnyx_api_key: null, telnyx_phone: null, owner_phone: null }
    const { alertOwnerCritical } = await import('./telegram')

    await expect(alertOwnerCritical('CRITICAL Error: cron/comms-monitor', 'boom')).resolves.toBeUndefined()
    expect(sendSMSMock).not.toHaveBeenCalled()
  })

  it('never throws when the tenant lookup or send fails', async () => {
    tenantRow = { telnyx_api_key: 'key-123', telnyx_phone: '+18883164019', owner_phone: '+12125551212' }
    sendSMSMock.mockRejectedValueOnce(new Error('telnyx down'))
    const { alertOwnerCritical } = await import('./telegram')

    await expect(alertOwnerCritical('CRITICAL Error: cron/comms-monitor', 'boom')).resolves.toBeUndefined()
  })
})
