import { describe, it, expect } from 'vitest'
import { normalizeDescription, transactionFingerprint } from './ledger'

/**
 * Ledger transaction fingerprint (money / de-dup path). Imported bank
 * transactions are de-duplicated by (date, amountCents, normalizedDescription).
 * If normalization or the hash drifts, either a real transaction is dropped as a
 * "duplicate" or the same charge posts twice into the books. Pure logic, zero DB.
 *
 * NOTE: this is beyond the five paths the order named (payout/checkout/resolver/
 * booking-authz/rate-limits) — added because the ledger de-dup key is a money
 * path with zero prior coverage. Flagged in the W4 report.
 */

describe('normalizeDescription', () => {
  it('is case-insensitive and collapses whitespace runs', () => {
    expect(normalizeDescription('ACME   Corp')).toBe(normalizeDescription('acme corp'))
    expect(normalizeDescription('  a\t b\n c  ')).toBe('a b c')
  })

  it('strips punctuation but keeps alphanumerics and #', () => {
    expect(normalizeDescription('ACME, Corp. (Payment)!')).toBe('acme corp payment')
  })

  it('collapses long (4+ digit) numbers to # but preserves short numbers', () => {
    expect(normalizeDescription('invoice 100')).toBe('invoice 100')
    expect(normalizeDescription('ref 12345')).toBe('ref #')
  })

  it('tolerates empty / falsy input', () => {
    expect(normalizeDescription('')).toBe('')
    // @ts-expect-error exercising the (s || '') guard against null at runtime
    expect(normalizeDescription(null)).toBe('')
  })
})

describe('transactionFingerprint', () => {
  const date = '2026-07-11'

  it('is a deterministic 32-char lowercase hex digest', () => {
    const fp = transactionFingerprint(date, 5000, 'ACME Corp Payment')
    expect(fp).toBe(transactionFingerprint(date, 5000, 'ACME Corp Payment'))
    expect(fp).toMatch(/^[0-9a-f]{32}$/)
  })

  it('is stable across case / whitespace / punctuation differences (de-dup holds)', () => {
    expect(transactionFingerprint(date, 5000, 'ACME Corp Payment'))
      .toBe(transactionFingerprint(date, 5000, '  acme,  corp.  payment '))
  })

  it('collapses differing long reference numbers to the same fingerprint', () => {
    expect(transactionFingerprint(date, 5000, 'Deposit ref 12345'))
      .toBe(transactionFingerprint(date, 5000, 'Deposit ref 67890'))
  })

  it('changes when the amount differs (no false-duplicate across amounts)', () => {
    expect(transactionFingerprint(date, 5000, 'ACME Corp'))
      .not.toBe(transactionFingerprint(date, 5001, 'ACME Corp'))
  })

  it('changes when the date differs', () => {
    expect(transactionFingerprint('2026-07-11', 5000, 'ACME Corp'))
      .not.toBe(transactionFingerprint('2026-07-12', 5000, 'ACME Corp'))
  })

  it('changes when a short number in the description differs (real distinct txns)', () => {
    expect(transactionFingerprint(date, 5000, 'Invoice 100'))
      .not.toBe(transactionFingerprint(date, 5000, 'Invoice 200'))
  })
})
