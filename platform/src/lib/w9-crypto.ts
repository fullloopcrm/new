/**
 * Encrypted W-9 tax-form collection for Commission Sales Partners
 * (nycmaid ref 072ceed0). Reuses src/lib/secret-crypto.ts's AES-256-GCM
 * envelope (same SECRET_ENCRYPTION_KEY already provisioned for tenant vendor
 * secrets) — no new crypto or key introduced.
 *
 * Deliberately stricter than encryptTenantSecrets(): a W-9 carries a full SSN
 * or EIN, so this FAILS CLOSED (throws) when no encryption key is
 * configured, rather than degrading to plaintext like vendor API keys do.
 * There is no acceptable "store it in the clear for now" fallback for tax ID
 * numbers.
 */
import { encryptSecret, decryptSecret, encryptionKeyAvailable } from './secret-crypto'

export type TaxClassification =
  | 'individual' | 'sole_proprietor' | 'llc' | 'c_corp' | 's_corp' | 'partnership' | 'other'

export type TinType = 'ssn' | 'ein'

const TAX_CLASSIFICATIONS: readonly TaxClassification[] =
  ['individual', 'sole_proprietor', 'llc', 'c_corp', 's_corp', 'partnership', 'other']
const TIN_TYPES: readonly TinType[] = ['ssn', 'ein']

export interface W9Data {
  legal_name: string
  business_name: string | null
  address_line1: string
  address_line2: string | null
  city: string
  state: string
  zip: string
  tin: string // digits only, full SSN (9) or EIN (9)
}

export interface W9SubmitInput extends W9Data {
  tax_classification: TaxClassification
  tin_type: TinType
}

const MAX_LEN: Record<string, number> = {
  legal_name: 100,
  business_name: 100,
  address_line1: 100,
  address_line2: 100,
  city: 60,
  state: 2,
  zip: 10,
}

/**
 * Validate + whitelist a raw request body into a W9SubmitInput. Mirrors the
 * shape of src/lib/validate.ts's validate() (required-field + max-length
 * checks, mass-assignment-safe whitelist) but W-9-specific because of the
 * TIN digit/length rules tied to tin_type.
 */
export function validateW9Input(body: unknown): { data: W9SubmitInput; error: null } | { data: null; error: string } {
  if (!body || typeof body !== 'object') {
    return { data: null, error: 'Invalid request body' }
  }
  const b = body as Record<string, unknown>

  for (const field of ['legal_name', 'address_line1', 'city', 'state', 'zip', 'tax_classification', 'tin_type', 'tin']) {
    if (typeof b[field] !== 'string' || (b[field] as string).trim() === '') {
      return { data: null, error: `${field} is required` }
    }
  }

  for (const [field, max] of Object.entries(MAX_LEN)) {
    const v = b[field]
    if (typeof v === 'string' && v.length > max) {
      return { data: null, error: `${field} exceeds max length ${max}` }
    }
  }

  const taxClassification = b.tax_classification as string
  if (!TAX_CLASSIFICATIONS.includes(taxClassification as TaxClassification)) {
    return { data: null, error: 'Invalid tax_classification' }
  }

  const tinType = b.tin_type as string
  if (!TIN_TYPES.includes(tinType as TinType)) {
    return { data: null, error: 'Invalid tin_type' }
  }

  const tinDigits = (b.tin as string).replace(/[^0-9]/g, '')
  if (tinDigits.length !== 9) {
    return { data: null, error: 'tin must be 9 digits (SSN or EIN)' }
  }

  const businessName = typeof b.business_name === 'string' && b.business_name.trim() !== '' ? b.business_name.trim() : null
  const addressLine2 = typeof b.address_line2 === 'string' && b.address_line2.trim() !== '' ? b.address_line2.trim() : null

  return {
    data: {
      legal_name: (b.legal_name as string).trim(),
      business_name: businessName,
      address_line1: (b.address_line1 as string).trim(),
      address_line2: addressLine2,
      city: (b.city as string).trim(),
      state: (b.state as string).trim().toUpperCase(),
      zip: (b.zip as string).trim(),
      tin: tinDigits,
      tax_classification: taxClassification as TaxClassification,
      tin_type: tinType as TinType,
    },
    error: null,
  }
}

export function last4(tin: string): string {
  return tin.slice(-4)
}

/** JSON-serialize + encrypt the PII/TIN fields into one opaque envelope. */
export function encryptW9Data(data: W9Data): string {
  if (!encryptionKeyAvailable()) {
    throw new Error('SECRET_ENCRYPTION_KEY not set — refusing to store W-9 data unencrypted')
  }
  return encryptSecret(JSON.stringify(data))
}

/** Decrypt + parse a W-9 envelope back into its fields. Admin-only caller. */
export function decryptW9Data(envelope: string): W9Data {
  const json = decryptSecret(envelope)
  return JSON.parse(json) as W9Data
}
