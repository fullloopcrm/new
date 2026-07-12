import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// P3-8: sendEmail() must pass a stable idempotencyKey to Resend so a retry
// (network blip, timeout) can't result in the same email going out twice —
// Resend recognizes a repeated idempotencyKey server-side and returns the
// original result instead of sending again.

vi.mock('./secret-crypto', () => ({
  decryptSecret: (v: string) => v,
}))

const sendMock = vi.fn()
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(function ResendMock() {
    return { emails: { send: sendMock } }
  }),
}))

import { sendEmail } from './email'

describe('sendEmail — idempotency on retry (P3-8)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    sendMock.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('passes an idempotencyKey to Resend', async () => {
    sendMock.mockResolvedValueOnce({ data: { id: 'email_123' }, error: null })

    await sendEmail({
      to: 'client@example.com',
      subject: 'Booking confirmed',
      html: '<p>Confirmed</p>',
      resendApiKey: 'key',
    })

    expect(sendMock).toHaveBeenCalledTimes(1)
    const [, options] = sendMock.mock.calls[0]
    expect(options?.idempotencyKey).toBeTruthy()
  })

  it('reuses the SAME idempotencyKey across retry attempts for one logical send', async () => {
    sendMock
      .mockResolvedValueOnce({ data: null, error: { message: '500 temporary failure' } })
      .mockResolvedValueOnce({ data: { id: 'email_123' }, error: null })

    const send = sendEmail({
      to: 'client@example.com',
      subject: 'Booking confirmed',
      html: '<p>Confirmed</p>',
      resendApiKey: 'key',
    })

    await vi.advanceTimersByTimeAsync(2000)

    await expect(send).resolves.toEqual({ id: 'email_123' })
    expect(sendMock).toHaveBeenCalledTimes(2)

    const key1 = sendMock.mock.calls[0][1]?.idempotencyKey
    const key2 = sendMock.mock.calls[1][1]?.idempotencyKey
    expect(key1).toBe(key2)
  })
})
