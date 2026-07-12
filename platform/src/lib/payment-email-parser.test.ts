import { describe, it, expect } from 'vitest'
import { detectPaymentEmail, parsePaymentEmail } from './payment-email-parser'

describe('detectPaymentEmail', () => {
  it('detects Venmo from sender + subject signals', () => {
    expect(detectPaymentEmail('venmo@venmo.com', 'John Doe paid you', 'body')).toBe('venmo')
  })

  it('detects Venmo from subject + body signals when sender is unknown', () => {
    // venmoSubject (/paid you/) + (bodyHasVenmo && bodyHasAmount) = 2 signals
    expect(detectPaymentEmail('x@unknown.com', 'someone paid you', 'via venmo $25')).toBe('venmo')
  })

  it('detects Zelle via the bank shortcut (sender + bank subject + amount)', () => {
    expect(
      detectPaymentEmail('alerts@chase.com', 'John sent you $50', 'You received $50.00'),
    ).toBe('zelle')
  })

  it('detects Zelle from two generic signals', () => {
    // zelleSubject (/zelle.*payment/) + (bodyHasZelle && bodyHasAmount) = 2
    expect(detectPaymentEmail('x@unknown.com', 'zelle payment', 'zelle $30')).toBe('zelle')
  })

  it('returns null when there are not enough signals', () => {
    expect(detectPaymentEmail('newsletter@foo.com', 'weekly digest', 'no money here')).toBeNull()
  })

  it('requires an amount for the single-sender Zelle case', () => {
    // sender matches + bank subject but NO amount in body -> not enough
    expect(detectPaymentEmail('alerts@chase.com', 'account update', 'no dollar figures')).toBeNull()
  })
})

describe('parsePaymentEmail', () => {
  const date = new Date('2026-04-19T12:00:00Z')

  it('extracts a plain dollar amount and computes cents', () => {
    const p = parsePaymentEmail('zelle', 'alerts@chase.com', '', 'Payment', 'from John Smith $50.00', date, 'msg-1')
    expect(p).not.toBeNull()
    expect(p!.amount).toBe(50)
    expect(p!.amountCents).toBe(5000)
    expect(p!.senderName).toBe('John Smith')
    expect(p!.senderEmail).toBe('alerts@chase.com')
    expect(p!.referenceId).toBe('msg-1')
    expect(p!.method).toBe('zelle')
    expect(p!.date).toBe(date)
  })

  it('strips thousands separators before parsing', () => {
    const p = parsePaymentEmail('zelle', 'a@chase.com', '', 'Deposit', 'amount: $1,250.50', date, 'm2')
    expect(p!.amount).toBe(1250.5)
    expect(p!.amountCents).toBe(125050)
  })

  it('returns null when no positive amount can be found', () => {
    const p = parsePaymentEmail('zelle', 'a@chase.com', '', 'hello', 'no money mentioned', date, 'm3')
    expect(p).toBeNull()
  })

  it('falls back to fromName when the body has no name pattern', () => {
    const p = parsePaymentEmail('zelle', 'a@chase.com', 'Given Name', 'Payment', 'you received $12', date, 'm4')
    expect(p!.senderName).toBe('Given Name')
  })

  it('extracts a Venmo sender name from the subject when body has none', () => {
    const p = parsePaymentEmail('venmo', 'venmo@venmo.com', '', 'Jane Roe paid you $75', 'thanks', date, 'm5')
    expect(p!.senderName).toBe('Jane Roe')
    expect(p!.amount).toBe(75)
  })
})
