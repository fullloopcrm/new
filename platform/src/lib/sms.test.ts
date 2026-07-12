import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// P3-8: sendSMS() must not double-text a client when a retry follows an
// AMBIGUOUS failure (a request timeout/abort, where Telnyx may have already
// received and queued the first attempt). A definite failure (e.g. a 5xx
// response) is safe to retry since we know that attempt didn't succeed.

vi.mock('./secret-crypto', () => ({
  decryptSecret: (v: string) => v,
}))

import { sendSMS } from './sms'

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }
}

describe('sendSMS — idempotency on retry (P3-8)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('does not retry after an ambiguous timeout/abort — avoids a duplicate text', async () => {
    const fetchMock = vi.fn().mockImplementation(() => {
      const err = new Error('The operation was aborted')
      err.name = 'AbortError'
      return Promise.reject(err)
    })
    vi.stubGlobal('fetch', fetchMock)

    const send = sendSMS({
      to: '+15551234567',
      body: 'Your appointment is confirmed',
      telnyxApiKey: 'key',
      telnyxPhone: '+15559876543',
    })

    await expect(send).rejects.toThrow(/aborted/i)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('sends the same Idempotency-Key header on every attempt', async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(jsonResponse(500, { errors: [{ detail: 'temporary' }] }))
    )
    vi.stubGlobal('fetch', fetchMock)

    const send = sendSMS({
      to: '+15551234567',
      body: 'Your appointment is confirmed',
      telnyxApiKey: 'key',
      telnyxPhone: '+15559876543',
    })
    // Absorb the eventual rejection so the unhandled-rejection warning doesn't
    // fire while we're still driving fake timers below.
    send.catch(() => {})

    await vi.advanceTimersByTimeAsync(2000)
    await vi.advanceTimersByTimeAsync(4000)

    await expect(send).rejects.toThrow(/SMS failed/)
    expect(fetchMock).toHaveBeenCalledTimes(3)

    const keys = fetchMock.mock.calls.map(
      (call) => (call[1]?.headers as Record<string, string>)['Idempotency-Key']
    )
    expect(keys[0]).toBeTruthy()
    expect(new Set(keys).size).toBe(1) // same key reused across all attempts
  })

  it('still retries a definite (non-ambiguous) failure like a 5xx response', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(500, { errors: [{ detail: 'temporary' }] }))
      .mockResolvedValueOnce(jsonResponse(200, { id: 'msg_123' }))
    vi.stubGlobal('fetch', fetchMock)

    const send = sendSMS({
      to: '+15551234567',
      body: 'Your appointment is confirmed',
      telnyxApiKey: 'key',
      telnyxPhone: '+15559876543',
    })

    await vi.advanceTimersByTimeAsync(2000)

    await expect(send).resolves.toEqual({ id: 'msg_123' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
