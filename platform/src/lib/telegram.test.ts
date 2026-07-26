import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'

/**
 * alertOwner() is the single choke point every platform monitoring alert
 * (error-tracking, system-check, comms/health monitors, Jefe pillars) already
 * calls. Re-added email as a second channel here (2026-07-26) instead of at
 * each call site, so this locks in: email fires alongside Telegram when
 * configured, is skipped when not, and a failing email never blocks or
 * throws through the Telegram send.
 *
 * Module-level env reads mean each test re-imports fresh via vi.resetModules()
 * after setting env vars, same pattern as otp-send-code-failclosed.test.ts.
 */

type SendEmailArgs = { to: string; subject: string; html: string }
const sendEmailMock = vi.fn(async (_args: SendEmailArgs) => ({ success: true }))
vi.mock('./email', () => ({ sendEmail: sendEmailMock }))

const originalFetch = global.fetch

beforeEach(() => {
  vi.resetModules()
  sendEmailMock.mockClear()
  sendEmailMock.mockResolvedValue({ success: true })
  global.fetch = vi.fn(async () => new Response('{"ok":true}', { status: 200 })) as typeof fetch
  delete process.env.ADMIN_NOTIFICATION_EMAIL
  delete process.env.JEFE_OWNER_CHAT_ID
  delete process.env.TELEGRAM_OWNER_CHAT_ID
  delete process.env.JEFE_BOT_TOKEN
})

afterAll(() => {
  global.fetch = originalFetch
})

describe('alertOwner — email + Telegram fan-out', () => {
  it('sends both email and Telegram when both are configured', async () => {
    process.env.ADMIN_NOTIFICATION_EMAIL = 'jeff@example.com'
    process.env.JEFE_OWNER_CHAT_ID = '-100'
    process.env.JEFE_BOT_TOKEN = 'bot-token'
    const { alertOwner } = await import('./telegram')

    await alertOwner('Site down', 'nycmaid is unreachable')

    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(sendEmailMock.mock.calls[0][0]).toMatchObject({
      to: 'jeff@example.com',
      subject: '[FL] Site down',
    })
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('skips email entirely when ADMIN_NOTIFICATION_EMAIL is not set', async () => {
    process.env.JEFE_OWNER_CHAT_ID = '-100'
    process.env.JEFE_BOT_TOKEN = 'bot-token'
    const { alertOwner } = await import('./telegram')

    await alertOwner('Site down')

    expect(sendEmailMock).not.toHaveBeenCalled()
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('still sends Telegram when the email send rejects', async () => {
    process.env.ADMIN_NOTIFICATION_EMAIL = 'jeff@example.com'
    process.env.JEFE_OWNER_CHAT_ID = '-100'
    process.env.JEFE_BOT_TOKEN = 'bot-token'
    sendEmailMock.mockRejectedValueOnce(new Error('resend down'))
    const { alertOwner } = await import('./telegram')

    const result = await alertOwner('Site down')

    expect(result?.ok).toBe(true)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('still emails even when Telegram is not configured', async () => {
    process.env.ADMIN_NOTIFICATION_EMAIL = 'jeff@example.com'
    const { alertOwner } = await import('./telegram')

    const result = await alertOwner('Site down')

    expect(result).toBeNull()
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
