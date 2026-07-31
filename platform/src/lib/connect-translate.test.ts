/**
 * translateToEnEs() (Loop Connect EN/ES auto-translation) — previously had
 * zero automated test coverage (see docs/readiness/ledger.json ai-04
 * evidence, 2026-07-31). This was the stated reason the checkpoint was
 * capped at manual_code_read: the fail-open design and the JSON-extraction
 * regex's edge cases were "unverified by any test, only by this code read."
 *
 * These tests close that gap by mocking @anthropic-ai/sdk (no live/paid API
 * call — same mocking pattern as
 * src/app/api/admin/ai-chat/route.test.ts) and exercising every branch of
 * the real function:
 *   - happy path: valid JSON response is parsed and returned as-is
 *   - malformed (non-JSON) model output fails open to the original text
 *   - JSON present but missing en/es keys fails open
 *   - a thrown exception (network error, bad key) fails open
 *   - a source message containing literal `{}` characters doesn't break the
 *     JSON-extraction regex when the model's real reply still wraps them in
 *     a well-formed object
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const create = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: (...a: unknown[]) => create(...a) }
  },
}))

import { translateToEnEs } from './connect-translate'

function textResponse(text: string) {
  return { content: [{ type: 'text', text }] }
}

beforeEach(() => {
  create.mockReset()
})

describe('translateToEnEs', () => {
  it('parses a well-formed JSON response into { en, es }', async () => {
    create.mockResolvedValueOnce(textResponse('{"en": "Hello there", "es": "Hola"}'))
    const r = await translateToEnEs('Hello there')
    expect(r).toEqual({ en: 'Hello there', es: 'Hola' })
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('fails open (returns original text on both sides) when the model reply has no JSON at all', async () => {
    create.mockResolvedValueOnce(textResponse('Sorry, I cannot help with that.'))
    const r = await translateToEnEs('Original message')
    expect(r).toEqual({ en: 'Original message', es: 'Original message' })
  })

  it('fails open when the JSON is missing the en/es keys', async () => {
    create.mockResolvedValueOnce(textResponse('{"foo": "bar"}'))
    const r = await translateToEnEs('Original message')
    expect(r).toEqual({ en: 'Original message', es: 'Original message' })
  })

  it('fails open when messages.create throws (network error, bad key, etc.)', async () => {
    create.mockRejectedValueOnce(new Error('network error'))
    const r = await translateToEnEs('Original message')
    expect(r).toEqual({ en: 'Original message', es: 'Original message' })
  })

  it('fails open when the response content block is empty/non-text', async () => {
    create.mockResolvedValueOnce({ content: [] })
    const r = await translateToEnEs('Original message')
    expect(r).toEqual({ en: 'Original message', es: 'Original message' })
  })

  it('extracts JSON correctly even when the source message itself contains literal braces', async () => {
    const source = 'Can you send the {invoice} for job #42?'
    create.mockResolvedValueOnce(textResponse('{"en": "Can you send the {invoice} for job #42?", "es": "¿Puedes enviar la {factura} del trabajo #42?"}'))
    const r = await translateToEnEs(source)
    expect(r).toEqual({
      en: 'Can you send the {invoice} for job #42?',
      es: '¿Puedes enviar la {factura} del trabajo #42?',
    })
  })

  it('passes the tenant-decrypted API key through to the client when provided', async () => {
    create.mockResolvedValueOnce(textResponse('{"en": "hi", "es": "hola"}'))
    // Not asserting on the constructor args (that's anthropicFromStoredKey's
    // own contract, tested elsewhere) — just confirming a stored key doesn't
    // change the parse/fail-open behavior.
    const r = await translateToEnEs('hi', 'plaintext-key')
    expect(r).toEqual({ en: 'hi', es: 'hola' })
  })
})
