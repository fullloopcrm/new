import crypto from 'crypto'

/**
 * Hashing helpers for the two PIN-gated login flows that still store a
 * plaintext PIN today: team_members (team-portal / cleaner login) and
 * clients (client-portal login). Mirrors the HMAC-SHA256 scheme already used
 * for tenant_members.pin_hash (see src/lib/admin-pin.ts / migrations/
 * tenant-member-admin-pins.sql) — deterministic so login can still look up
 * by hash, not reversible without ADMIN_TOKEN_SECRET.
 *
 * Each entity type gets its own message prefix so a client PIN hash and a
 * team_member PIN hash never collide even if the numeric PIN value matches.
 *
 * NOT WIRED IN YET. These exist so the 2026_07_16_client_team_pin_hash
 * backfill's SQL-side HMAC computation has a JS-side reference to be verified
 * against, and so a future cutover of team-portal/auth + client/login to
 * hash comparison doesn't have to invent the scheme. The read/write paths
 * for team_members.pin and clients.pin remain plaintext until that cutover
 * — see the migration file header for why it isn't done in this pass.
 */

const SECRET = process.env.ADMIN_TOKEN_SECRET

function hashPin(prefix: string, pin: string): string {
  if (!SECRET) throw new Error('ADMIN_TOKEN_SECRET is not configured')
  return crypto.createHmac('sha256', SECRET).update(`${prefix}:${pin}`).digest('hex')
}

export function hashClientPin(pin: string): string {
  return hashPin('client-pin', pin)
}

export function hashTeamMemberPin(pin: string): string {
  return hashPin('team-member-pin', pin)
}
