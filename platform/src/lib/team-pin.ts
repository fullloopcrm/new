import { randomInt } from 'crypto'

/**
 * Generate a team-member login PIN.
 *
 * 6 digits (100000–999999). Widened from the legacy 4-digit space
 * (1000–9999 = 9,000 values), which was small enough to sweep against the
 * public team-portal login. Paired with the per-tenant failed-attempt throttle
 * in /api/team-portal/auth, brute-forcing is no longer practical.
 */
export function generateTeamPin(): string {
  return String(randomInt(100000, 1000000))
}
