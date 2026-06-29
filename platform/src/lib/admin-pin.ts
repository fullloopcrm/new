import crypto from 'crypto'

/**
 * Per-tenant admin-login PIN hashing.
 *
 * PINs for tenant operators are stored on tenant_members.pin_hash as
 * HMAC-SHA256(pin) keyed by ADMIN_TOKEN_SECRET — deterministic so login can
 * look up by hash, but not reversible without the server secret. We never store
 * or display a PIN after it is first issued; reset generates a new one.
 */

const SECRET = process.env.ADMIN_TOKEN_SECRET

export function hashAdminPin(pin: string): string {
  if (!SECRET) throw new Error('ADMIN_TOKEN_SECRET is not configured')
  return crypto.createHmac('sha256', SECRET).update(`tenant-admin-pin:${pin}`).digest('hex')
}

/** Cryptographically random 6-digit PIN as a zero-padded string. */
export function generateAdminPin(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
}

/** A PIN is 4–8 digits. 6 is the default we issue; we accept a small range for flexibility. */
export function isValidAdminPin(pin: string): boolean {
  return /^\d{4,8}$/.test(pin)
}
