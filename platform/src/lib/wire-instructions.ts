/**
 * Wire instructions for the $25,000 setup fee — a real bank wire, paid 100%
 * upfront, never charged through Stripe. Bank details live in env vars, not
 * hardcoded, since they're real account numbers.
 *
 * Env: FL_WIRE_BANK_NAME, FL_WIRE_ACCOUNT_NUMBER, FL_WIRE_ROUTING_NUMBER,
 * FL_WIRE_BENEFICIARY_NAME (the exact legal name on the account — required
 * for a wire to actually land; not yet set as of 2026-08-02).
 */
import crypto from 'crypto'
import { PRICING } from './billing-pricing'

export interface WireInstructions {
  bankName: string
  accountNumber: string
  routingNumber: string
  beneficiaryName: string | null
  amount: number
  reference: string
  complete: boolean
}

/** Short, deterministic reference/memo so a wire can be matched to a lead. */
export function wireReferenceFor(leadId: string): string {
  return `FL-${leadId.replace(/-/g, '').slice(0, 8).toUpperCase()}`
}

/**
 * The thank-you page shows your real bank account/routing number keyed only
 * off ?lead=<uuid> — anyone with that URL sees it, no login. A UUID isn't
 * practically guessable, but Stripe's success_url is still a bare query
 * param sitting in browser history/referrers/logs. This signs the leadId so
 * the page only renders wire details when it was actually reached via a real
 * checkout redirect, not just a copied/guessed lead id.
 */
function secret(): string {
  const s = process.env.PORTAL_SECRET || process.env.ADMIN_TOKEN_SECRET
  if (!s) throw new Error('PORTAL_SECRET (or ADMIN_TOKEN_SECRET fallback) is required for wire-page token signing')
  return s
}

export function signWireToken(leadId: string): string {
  return crypto.createHmac('sha256', secret()).update(leadId).digest('hex').slice(0, 32)
}

export function verifyWireToken(leadId: string, token: string | null | undefined): boolean {
  if (!token) return false
  const expected = signWireToken(leadId)
  if (expected.length !== token.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token))
  } catch {
    return false
  }
}

export function getWireInstructions(leadId: string): WireInstructions {
  const bankName = process.env.FL_WIRE_BANK_NAME || ''
  const accountNumber = process.env.FL_WIRE_ACCOUNT_NUMBER || ''
  const routingNumber = process.env.FL_WIRE_ROUTING_NUMBER || ''
  const beneficiaryName = process.env.FL_WIRE_BENEFICIARY_NAME || null

  return {
    bankName,
    accountNumber,
    routingNumber,
    beneficiaryName,
    amount: PRICING.setupFee,
    reference: wireReferenceFor(leadId),
    complete: Boolean(bankName && accountNumber && routingNumber && beneficiaryName),
  }
}
