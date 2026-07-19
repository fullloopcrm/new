import { describe, it, expect, afterEach } from 'vitest'
import { validateW9Input, encryptW9Data, decryptW9Data, last4 } from './w9-crypto'

/**
 * W-9 data carries a full SSN/EIN — the highest-sensitivity PII this
 * codebase stores. Unlike secret-crypto's tenant-secret helpers (which
 * degrade to plaintext when no key is configured), this module must FAIL
 * CLOSED: no key means no write, never a silent plaintext fallback.
 */

const VALID_KEY = 'a'.repeat(64)
const ORIGINAL_KEY = process.env.SECRET_ENCRYPTION_KEY

afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.SECRET_ENCRYPTION_KEY
  else process.env.SECRET_ENCRYPTION_KEY = ORIGINAL_KEY
})

const VALID_INPUT = {
  legal_name: 'Jordan Rivera',
  business_name: 'Rivera Consulting LLC',
  address_line1: '123 Main St',
  address_line2: 'Apt 4B',
  city: 'Brooklyn',
  state: 'ny',
  zip: '11201',
  tax_classification: 'llc',
  tin_type: 'ein',
  tin: '12-3456789',
}

describe('validateW9Input', () => {
  it('accepts a fully valid submission and normalizes state/tin', () => {
    const result = validateW9Input(VALID_INPUT)
    expect(result.error).toBeNull()
    expect(result.data?.state).toBe('NY')
    expect(result.data?.tin).toBe('123456789') // dashes stripped
    expect(result.data?.business_name).toBe('Rivera Consulting LLC')
  })

  it('accepts an individual filer with no business_name/address_line2', () => {
    const { business_name, address_line2, ...rest } = VALID_INPUT
    const result = validateW9Input({ ...rest, tax_classification: 'individual', tin_type: 'ssn' })
    expect(result.error).toBeNull()
    expect(result.data?.business_name).toBeNull()
    expect(result.data?.address_line2).toBeNull()
  })

  it.each(['legal_name', 'address_line1', 'city', 'state', 'zip', 'tax_classification', 'tin_type', 'tin'])(
    'rejects a submission missing required field %s',
    (field) => {
      const input: Record<string, unknown> = { ...VALID_INPUT }
      delete input[field]
      const result = validateW9Input(input)
      expect(result.error).toBe(`${field} is required`)
      expect(result.data).toBeNull()
    },
  )

  it('rejects an invalid tax_classification (whitelist, not free text)', () => {
    const result = validateW9Input({ ...VALID_INPUT, tax_classification: 'trust_me_bro' })
    expect(result.error).toBe('Invalid tax_classification')
  })

  it('rejects an invalid tin_type', () => {
    const result = validateW9Input({ ...VALID_INPUT, tin_type: 'passport' })
    expect(result.error).toBe('Invalid tin_type')
  })

  it('rejects a TIN with the wrong digit count after stripping formatting', () => {
    const result = validateW9Input({ ...VALID_INPUT, tin: '123-45-678' }) // 8 digits
    expect(result.error).toBe('tin must be 9 digits (SSN or EIN)')
  })

  it('rejects a non-object body', () => {
    expect(validateW9Input(null).error).toBe('Invalid request body')
    expect(validateW9Input('a string').error).toBe('Invalid request body')
  })

  it('rejects an oversized field (mass-assignment-adjacent DoS guard)', () => {
    const result = validateW9Input({ ...VALID_INPUT, legal_name: 'x'.repeat(200) })
    expect(result.error).toBe('legal_name exceeds max length 100')
  })
})

describe('encryptW9Data / decryptW9Data — round trip', () => {
  it('round-trips full W-9 field set including the raw TIN', () => {
    process.env.SECRET_ENCRYPTION_KEY = VALID_KEY
    const data = {
      legal_name: 'Jordan Rivera',
      business_name: 'Rivera Consulting LLC',
      address_line1: '123 Main St',
      address_line2: null,
      city: 'Brooklyn',
      state: 'NY',
      zip: '11201',
      tin: '123456789',
    }
    const envelope = encryptW9Data(data)
    expect(envelope).not.toContain('123456789')
    expect(envelope).not.toContain('Jordan Rivera')
    expect(decryptW9Data(envelope)).toEqual(data)
  })

  it('FAILS CLOSED: throws instead of storing plaintext when no key is configured', () => {
    delete process.env.SECRET_ENCRYPTION_KEY
    expect(() =>
      encryptW9Data({
        legal_name: 'x', business_name: null, address_line1: 'x', address_line2: null,
        city: 'x', state: 'NY', zip: '00000', tin: '123456789',
      }),
    ).toThrow('SECRET_ENCRYPTION_KEY not set')
  })

  it('a tampered envelope fails to decrypt rather than returning corrupted data', () => {
    process.env.SECRET_ENCRYPTION_KEY = VALID_KEY
    const envelope = encryptW9Data({
      legal_name: 'x', business_name: null, address_line1: 'x', address_line2: null,
      city: 'x', state: 'NY', zip: '00000', tin: '123456789',
    })
    const [prefix, iv, ct, tag] = envelope.split(':')
    const flipped = ct.slice(0, -2) + (ct.slice(-2) === 'AA' ? 'BB' : 'AA')
    expect(() => decryptW9Data(`${prefix}:${iv}:${flipped}:${tag}`)).toThrow()
  })
})

describe('last4', () => {
  it('returns the last 4 digits of a 9-digit TIN', () => {
    expect(last4('123456789')).toBe('6789')
  })
})
