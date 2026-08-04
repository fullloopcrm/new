import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * sendSMS() phone normalization — real, reproduced production bug
 * (2026-07-22): every client-facing SMS call site in this codebase passes
 * the raw DB value (e.g. clients.phone = "9253893636", no country code)
 * straight to Telnyx. Confirmed live against nycmaid's real Telnyx account
 * that a bare 10-digit number is rejected with "The 'to' address should be
 * a single valid number" — this broke SMS for a real new lead. Normalizing
 * at the actual API-call boundary (not each of the ~50 call sites) fixes
 * every caller at once.
 */

vi.mock('./secret-crypto', () => ({
  decryptSecret: (v: string) => v,
}))

type FakeFetchResponse = { ok: boolean; status?: number; json: () => Promise<unknown> }

const fetchMock = vi.fn(async (_url: string, _init: RequestInit): Promise<FakeFetchResponse> => ({
  ok: true,
  json: async () => ({ data: { id: 'msg-1' } }),
}))

import { sendSMS } from './sms'

beforeEach(() => {
  fetchMock.mockClear()
  vi.stubGlobal('fetch', fetchMock)
})

function toSentInBody(): string {
  const [, init] = fetchMock.mock.calls[0]
  return (JSON.parse(init.body as string) as { to: string }).to
}

describe('sendSMS — E2E.164 normalization at the send boundary', () => {
  it('adds +1 to a bare 10-digit US number', async () => {
    await sendSMS({ to: '9253893636', body: 'hi', telnyxApiKey: 'key', telnyxPhone: '+15551234567' })
    expect(toSentInBody()).toBe('+19253893636')
  })

  it('adds + to an 11-digit number already carrying the leading 1', async () => {
    await sendSMS({ to: '19253893636', body: 'hi', telnyxApiKey: 'key', telnyxPhone: '+15551234567' })
    expect(toSentInBody()).toBe('+19253893636')
  })

  it('leaves an already-E.164 number unchanged (idempotent)', async () => {
    await sendSMS({ to: '+19253893636', body: 'hi', telnyxApiKey: 'key', telnyxPhone: '+15551234567' })
    expect(toSentInBody()).toBe('+19253893636')
  })

  it('passes formatting-tolerant input (dashes/parens/spaces) through as E.164', async () => {
    await sendSMS({ to: '(925) 389-3636', body: 'hi', telnyxApiKey: 'key', telnyxPhone: '+15551234567' })
    expect(toSentInBody()).toBe('+19253893636')
  })
})

/**
 * MMS support (2026-08-03): outbound image attachments, plus a fallback for
 * Telnyx error 40328 ("message would be divided into too many parts" — their
 * own docs say to send it as MMS instead). Telnyx auto-detects SMS vs MMS off
 * the `media_urls` field, and an EMPTY `media_urls: []` is documented to force
 * MMS mode with no attachment, which has no such part-count ceiling.
 */
describe('sendSMS — MMS media + part-limit fallback', () => {
  function sentBody(callIndex = 0): Record<string, unknown> {
    const [, init] = fetchMock.mock.calls[callIndex]
    return JSON.parse(init.body as string)
  }

  it('includes media_urls in the request when attachments are provided', async () => {
    await sendSMS({
      to: '9253893636', body: 'photo', telnyxApiKey: 'key', telnyxPhone: '+15551234567',
      mediaUrls: ['https://example.com/a.jpg'],
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(sentBody().media_urls).toEqual(['https://example.com/a.jpg'])
  })

  it('omits media_urls entirely for a plain text send with no attachments', async () => {
    await sendSMS({ to: '9253893636', body: 'hi', telnyxApiKey: 'key', telnyxPhone: '+15551234567' })
    expect(sentBody().media_urls).toBeUndefined()
  })

  it('retries forced into MMS mode (media_urls: []) when Telnyx rejects for exceeding SMS parts', async () => {
    fetchMock
      .mockImplementationOnce(async () => ({
        ok: false, status: 422,
        json: async () => ({ errors: [{ code: '40328', detail: 'too many parts' }] }),
      }))
      .mockImplementationOnce(async () => ({
        ok: true,
        json: async () => ({ data: { id: 'msg-2' } }),
      }))

    const result = await sendSMS({ to: '9253893636', body: 'a'.repeat(1000), telnyxApiKey: 'key', telnyxPhone: '+15551234567' })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(sentBody(0).media_urls).toBeUndefined()
    expect(sentBody(1).media_urls).toEqual([])
    expect((result as { data: { id: string } }).data.id).toBe('msg-2')
  })

  it('does not retry-as-MMS for an unrelated 4xx error, and surfaces it', async () => {
    fetchMock.mockImplementation(async () => ({
      ok: false, status: 400,
      json: async () => ({ errors: [{ code: '40001', detail: 'bad request' }] }),
    }))

    await expect(sendSMS({ to: '9253893636', body: 'hi', telnyxApiKey: 'key', telnyxPhone: '+15551234567' }))
      .rejects.toThrow(/bad request/)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not retry-as-MMS when media was already attached (already MMS)', async () => {
    fetchMock.mockImplementation(async () => ({
      ok: false, status: 400,
      json: async () => ({ errors: [{ code: '40328', detail: 'too many parts' }] }),
    }))

    await expect(sendSMS({
      to: '9253893636', body: 'hi', telnyxApiKey: 'key', telnyxPhone: '+15551234567',
      mediaUrls: ['https://example.com/a.jpg'],
    })).rejects.toThrow()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
