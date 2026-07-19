import { randomBytes, randomInt, scryptSync, timingSafeEqual } from 'crypto'

// PIN hashing for the Sales Partner portal login (email + 6-digit PIN).
// scrypt, no new dependency -- ported from nycmaid src/lib/sales-partner-auth.ts.
const SCRYPT_KEYLEN = 32

export function generatePin(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0')
}

export function hashPin(pin: string): { pinHash: string; pinSalt: string } {
  const pinSalt = randomBytes(16).toString('hex')
  const pinHash = scryptSync(pin, pinSalt, SCRYPT_KEYLEN).toString('hex')
  return { pinHash, pinSalt }
}

export function verifyPin(pin: string, pinHash: string, pinSalt: string): boolean {
  const candidate = scryptSync(pin, pinSalt, SCRYPT_KEYLEN)
  const stored = Buffer.from(pinHash, 'hex')
  if (candidate.length !== stored.length) return false
  return timingSafeEqual(candidate, stored)
}

export function generateSalesPartnerReferralCode(name: string): string {
  const baseCode = name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) || 'SALE'
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return baseCode + random
}
