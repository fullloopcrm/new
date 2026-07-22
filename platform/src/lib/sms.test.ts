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

const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => ({
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
