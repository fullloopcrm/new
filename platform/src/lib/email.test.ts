/**
 * src/lib/email.ts -- the Resend email primitive underlying every outbound
 * email in the app (booking confirmations, security alerts, notifications,
 * comhub replies). Zero coverage before this suite.
 *
 * Two concerns get tested:
 *  1. tenantSender() -- the per-tenant "From" identity string builder.
 *  2. sendEmail() -- client selection (per-tenant decrypted key vs default),
 *     recipient sanitization, attachment passthrough, and the retry/no-retry
 *     error classification contract with withRetry() (retry.ts's isClientError
 *     string-matches on "400"/"invalid"/"unauthorized"/"forbidden" -- email.ts
 *     is responsible for prefixing validation-class Resend errors with "400 "
 *     so they short-circuit instead of retrying 3x).
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

const sendMock = vi.fn()

vi.mock('resend', () => {
  class FakeResend {
    emails = { send: sendMock }
  }
  return { Resend: vi.fn(FakeResend) }
})

describe('tenantSender', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('uses the tenant email_from verbatim when set', async () => {
    const { tenantSender } = await import('./email')
    expect(tenantSender({ email_from: 'Acme Cleaning <hello@acme.com>' })).toBe(
      'Acme Cleaning <hello@acme.com>'
    )
  })

  it('falls back to an identified fullloopcrm.com address built from name+slug', async () => {
    const { tenantSender } = await import('./email')
    expect(tenantSender({ name: 'Acme Cleaning', slug: 'acme-cleaning' })).toBe(
      'Acme Cleaning <acme-cleaning@fullloopcrm.com>'
    )
  })

  it('sanitizes angle brackets, quotes, and newlines out of the display name', async () => {
    const { tenantSender } = await import('./email')
    expect(
      tenantSender({ name: 'Acme <script>"\r\nCleaning', slug: 'acme' })
    ).toBe('Acme scriptCleaning <acme@fullloopcrm.com>')
  })

  it('defaults the display name to "Full Loop CRM" when tenant.name is missing or blank', async () => {
    const { tenantSender } = await import('./email')
    expect(tenantSender({ slug: 'x' })).toBe('Full Loop CRM <x@fullloopcrm.com>')
    expect(tenantSender({ name: '   ', slug: 'x' })).toBe('Full Loop CRM <x@fullloopcrm.com>')
  })

  it('slugifies non-alphanumeric characters and strips leading/trailing dashes', async () => {
    const { tenantSender } = await import('./email')
    expect(tenantSender({ name: 'Acme', slug: '--Acme Cleaning Co!!--' })).toBe(
      'Acme <acme-cleaning-co@fullloopcrm.com>'
    )
  })

  it('defaults the local part to "no-reply" when slug is missing or sanitizes to empty', async () => {
    const { tenantSender } = await import('./email')
    expect(tenantSender({ name: 'Acme' })).toBe('Acme <no-reply@fullloopcrm.com>')
    expect(tenantSender({ name: 'Acme', slug: '!!!' })).toBe('Acme <no-reply@fullloopcrm.com>')
  })

  it('handles a null/undefined tenant with the full default identity', async () => {
    const { tenantSender } = await import('./email')
    expect(tenantSender(null)).toBe('Full Loop CRM <no-reply@fullloopcrm.com>')
    expect(tenantSender(undefined)).toBe('Full Loop CRM <no-reply@fullloopcrm.com>')
  })
})

describe('sendEmail', () => {
  beforeEach(() => {
    sendMock.mockReset()
  })

  describe('with a configured default client (RESEND_API_KEY set)', () => {
    let sendEmail: typeof import('./email').sendEmail

    beforeEach(async () => {
      vi.resetModules()
      vi.stubEnv('RESEND_API_KEY', 'test-default-key')
      ;({ sendEmail } = await import('./email'))
    })

    afterEach(() => {
      vi.unstubAllEnvs()
    })

    it('sends via the default client when no per-tenant resendApiKey is given', async () => {
      sendMock.mockResolvedValue({ data: { id: 'em_1' }, error: null })
      const result = await sendEmail({ to: 'a@example.com', subject: 'Hi', html: '<p>hi</p>' })
      expect(result).toEqual({ id: 'em_1' })
      expect(sendMock).toHaveBeenCalledTimes(1)
      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'Full Loop CRM <hello@fullloopcrm.com>',
          to: ['a@example.com'],
          subject: 'Hi',
          html: '<p>hi</p>',
        })
      )
    })

    it('uses the caller-supplied "from" over the default sender', async () => {
      sendMock.mockResolvedValue({ data: { id: 'em_2' }, error: null })
      await sendEmail({ to: 'a@example.com', subject: 'S', html: 'H', from: 'Tenant <t@tenant.com>' })
      expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ from: 'Tenant <t@tenant.com>' }))
    })

    it('trims whitespace and drops empty recipients', async () => {
      sendMock.mockResolvedValue({ data: { id: 'em_3' }, error: null })
      // The declared param type is `to: string`, but the implementation branches on
      // Array.isArray(to) — array recipients are a real, exercised runtime path.
      await sendEmail({
        to: [' a@example.com\n', '  ', 'b@example.com  '] as unknown as string,
        subject: 'S',
        html: 'H',
      })
      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({ to: ['a@example.com', 'b@example.com'] })
      )
    })

    it('wraps a single string recipient into an array', async () => {
      sendMock.mockResolvedValue({ data: { id: 'em_4' }, error: null })
      await sendEmail({ to: 'a@example.com  \n', subject: 'S', html: 'H' })
      expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ to: ['a@example.com'] }))
    })

    it('omits the attachments field entirely when none are given', async () => {
      sendMock.mockResolvedValue({ data: { id: 'em_5' }, error: null })
      await sendEmail({ to: 'a@example.com', subject: 'S', html: 'H' })
      const callArg = sendMock.mock.calls[0][0]
      expect(callArg).not.toHaveProperty('attachments')
    })

    it('passes attachments through when provided', async () => {
      sendMock.mockResolvedValue({ data: { id: 'em_6' }, error: null })
      const attachments = [{ filename: 'invoice.pdf', content: 'base64==' }]
      await sendEmail({ to: 'a@example.com', subject: 'S', html: 'H', attachments })
      expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ attachments }))
    })

    it('creates a per-tenant Resend client from a decrypted resendApiKey instead of the default client', async () => {
      const { Resend } = await import('resend')
      sendMock.mockResolvedValue({ data: { id: 'em_7' }, error: null })
      // secret-crypto's decryptSecret() passes legacy plaintext (no envelope prefix) straight through.
      await sendEmail({ to: 'a@example.com', subject: 'S', html: 'H', resendApiKey: 'tenant-plaintext-key' })
      expect(Resend).toHaveBeenCalledWith('tenant-plaintext-key')
    })

    it('throws "400 <message>" for a Resend validation error (no retry)', async () => {
      sendMock.mockResolvedValue({ data: null, error: { message: 'Invalid `to` field validation failed' } })
      await expect(
        sendEmail({ to: 'bad', subject: 'S', html: 'H' })
      ).rejects.toThrow('400 Invalid `to` field validation failed')
      expect(sendMock).toHaveBeenCalledTimes(1)
    })

    it('throws "400 <message>" for an unsubscribed recipient (no retry)', async () => {
      sendMock.mockResolvedValue({ data: null, error: { message: 'recipient is unsubscribed' } })
      await expect(sendEmail({ to: 'a@example.com', subject: 'S', html: 'H' })).rejects.toThrow(
        '400 recipient is unsubscribed'
      )
      expect(sendMock).toHaveBeenCalledTimes(1)
    })

    it('throws "400 <message>" when the recipient is not allowed (no retry)', async () => {
      sendMock.mockResolvedValue({ data: null, error: { message: 'domain not allowed to send' } })
      await expect(sendEmail({ to: 'a@example.com', subject: 'S', html: 'H' })).rejects.toThrow(
        '400 domain not allowed to send'
      )
      expect(sendMock).toHaveBeenCalledTimes(1)
    })

    it('retries a transient (non-validation) Resend error up to maxAttempts, then throws the raw message', async () => {
      vi.useFakeTimers()
      sendMock.mockResolvedValue({ data: null, error: { message: 'internal server error' } })

      const promise = sendEmail({ to: 'a@example.com', subject: 'S', html: 'H' })
      // Swallow the eventual rejection so it doesn't register as unhandled while
      // fake timers advance past the two retry delays (2s, 4s per email.ts's options).
      const assertion = expect(promise).rejects.toThrow('internal server error')
      await vi.runAllTimersAsync()
      await assertion

      expect(sendMock).toHaveBeenCalledTimes(3)
      vi.useRealTimers()
    })

    it('throws immediately (no client call) when a network-level rejection occurs and is classified retryable, retrying up to maxAttempts', async () => {
      vi.useFakeTimers()
      sendMock.mockRejectedValue(new Error('fetch failed: ECONNRESET'))

      const promise = sendEmail({ to: 'a@example.com', subject: 'S', html: 'H' })
      const assertion = expect(promise).rejects.toThrow('fetch failed: ECONNRESET')
      await vi.runAllTimersAsync()
      await assertion

      expect(sendMock).toHaveBeenCalledTimes(3)
      vi.useRealTimers()
    })
  })

  describe('with no default client configured (RESEND_API_KEY unset)', () => {
    let sendEmail: typeof import('./email').sendEmail

    beforeEach(async () => {
      vi.resetModules()
      vi.stubEnv('RESEND_API_KEY', '')
      ;({ sendEmail } = await import('./email'))
    })

    afterEach(() => {
      vi.unstubAllEnvs()
    })

    it('throws "Email not configured" when no per-tenant key is supplied either', async () => {
      await expect(sendEmail({ to: 'a@example.com', subject: 'S', html: 'H' })).rejects.toThrow(
        'Email not configured — no Resend API key available'
      )
      expect(sendMock).not.toHaveBeenCalled()
    })

    it('still sends when a per-tenant resendApiKey is supplied even with no default client', async () => {
      sendMock.mockResolvedValue({ data: { id: 'em_8' }, error: null })
      const result = await sendEmail({
        to: 'a@example.com',
        subject: 'S',
        html: 'H',
        resendApiKey: 'tenant-key',
      })
      expect(result).toEqual({ id: 'em_8' })
    })
  })

  describe('with RESEND_API_KEY="placeholder"', () => {
    let sendEmail: typeof import('./email').sendEmail

    beforeEach(async () => {
      vi.resetModules()
      vi.stubEnv('RESEND_API_KEY', 'placeholder')
      ;({ sendEmail } = await import('./email'))
    })

    afterEach(() => {
      vi.unstubAllEnvs()
    })

    it('treats the literal "placeholder" value as unconfigured, not a real key', async () => {
      await expect(sendEmail({ to: 'a@example.com', subject: 'S', html: 'H' })).rejects.toThrow(
        'Email not configured — no Resend API key available'
      )
    })
  })
})
