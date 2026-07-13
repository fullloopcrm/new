import { describe, it, expect } from 'vitest'
import { createHmac, generateKeyPairSync, sign as cryptoSign } from 'node:crypto'
import { verifySvix, verifyTelnyx, verifyTelegramSecretToken } from './webhook-verify'

function svixHeaders(id: string, timestamp: string, signature: string): Headers {
  const h = new Headers()
  h.set('svix-id', id)
  h.set('svix-timestamp', timestamp)
  h.set('svix-signature', signature)
  return h
}

function signSvix(secretBase64: string, id: string, timestamp: string, body: string): string {
  const secret = Buffer.from(secretBase64, 'base64')
  const payload = `${id}.${timestamp}.${body}`
  const sig = createHmac('sha256', secret).update(payload).digest('base64')
  return `v1,${sig}`
}

describe('verifySvix', () => {
  const secretRaw = Buffer.from('unit-test-secret-bytes-for-signing').toString('base64')
  const secret = `whsec_${secretRaw}`

  it('accepts a valid signature', () => {
    const id = 'msg_01'
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const body = JSON.stringify({ type: 'user.created', data: { id: 'u1' } })
    const sig = signSvix(secretRaw, id, timestamp, body)

    const result = verifySvix(svixHeaders(id, timestamp, sig), body, secret)
    expect(result.valid).toBe(true)
  })

  it('rejects a forged body', () => {
    const id = 'msg_01'
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const body = JSON.stringify({ type: 'user.created', data: { id: 'u1' } })
    const sig = signSvix(secretRaw, id, timestamp, body)

    const tampered = JSON.stringify({ type: 'user.deleted', data: { id: 'u1' } })
    const result = verifySvix(svixHeaders(id, timestamp, sig), tampered, secret)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('signature mismatch')
  })

  it('rejects a stale timestamp', () => {
    const id = 'msg_01'
    const staleTs = (Math.floor(Date.now() / 1000) - 10 * 60).toString() // 10 min old
    const body = '{}'
    const sig = signSvix(secretRaw, id, staleTs, body)

    const result = verifySvix(svixHeaders(id, staleTs, sig), body, secret)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('timestamp out of window')
  })

  it('rejects when secret is missing', () => {
    const result = verifySvix(svixHeaders('x', '0', 'v1,xxx'), '{}', undefined)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('secret not configured')
  })

  it('rejects when headers are missing', () => {
    const result = verifySvix(new Headers(), '{}', secret)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('missing svix headers')
  })
})

describe('verifyTelnyx', () => {
  // Generate an Ed25519 keypair once per test run.
  const { privateKey, publicKey } = generateKeyPairSync('ed25519')
  // Telnyx public keys are raw 32-byte base64. Extract the last 32 bytes of the DER SPKI.
  const spkiBuf = publicKey.export({ format: 'der', type: 'spki' }) as Buffer
  const rawPub = spkiBuf.subarray(spkiBuf.length - 32).toString('base64')

  function headers(ts: string, sig: string): Headers {
    const h = new Headers()
    h.set('telnyx-timestamp', ts)
    h.set('telnyx-signature-ed25519', sig)
    return h
  }

  it('accepts a valid Ed25519 signature', () => {
    const ts = Math.floor(Date.now() / 1000).toString()
    const body = JSON.stringify({ data: { event_type: 'message.received', payload: {} } })
    const sig = cryptoSign(null, Buffer.from(`${ts}|${body}`, 'utf8'), privateKey).toString('base64')

    const result = verifyTelnyx(headers(ts, sig), body, rawPub)
    expect(result.valid).toBe(true)
  })

  it('rejects a forged body', () => {
    const ts = Math.floor(Date.now() / 1000).toString()
    const body = JSON.stringify({ data: { event_type: 'message.received' } })
    const sig = cryptoSign(null, Buffer.from(`${ts}|${body}`, 'utf8'), privateKey).toString('base64')

    const result = verifyTelnyx(headers(ts, sig), '{"data":{"event_type":"hack"}}', rawPub)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('signature mismatch')
  })

  it('rejects when public key is missing', () => {
    const result = verifyTelnyx(headers('0', 'sig'), '{}', undefined)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('public key not configured')
  })

  it('rejects stale timestamp', () => {
    const ts = (Math.floor(Date.now() / 1000) - 10 * 60).toString()
    const body = '{}'
    const sig = cryptoSign(null, Buffer.from(`${ts}|${body}`, 'utf8'), privateKey).toString('base64')
    const result = verifyTelnyx(headers(ts, sig), body, rawPub)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('timestamp out of window')
  })
})

describe('verifyTelegramSecretToken', () => {
  function headers(secret: string | null): Headers {
    const h = new Headers()
    if (secret !== null) h.set('x-telegram-bot-api-secret-token', secret)
    return h
  }

  it('accepts a matching secret', () => {
    const result = verifyTelegramSecretToken(headers('correct-secret'), 'correct-secret')
    expect(result.valid).toBe(true)
  })

  it('rejects a forged/guessed secret — this is the actual attack this check exists to stop', () => {
    const result = verifyTelegramSecretToken(headers('guessed-secret'), 'correct-secret')
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('secret mismatch')
  })

  it('rejects a missing header when a secret is configured', () => {
    const result = verifyTelegramSecretToken(headers(null), 'correct-secret')
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('missing secret token header')
  })

  it('rejects a different-length secret without throwing', () => {
    const result = verifyTelegramSecretToken(headers('short'), 'a-much-longer-correct-secret')
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('secret mismatch')
  })

  it('allows through (unverified) when no secret is configured yet — transitional/pre-activation state', () => {
    const result = verifyTelegramSecretToken(headers(null), undefined)
    expect(result.valid).toBe(true)
    expect(result.reason).toMatch(/pending activation/)
  })
})
