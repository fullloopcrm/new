/**
 * Finds a row by an exact PIN match, supporting both legacy-plaintext PINs
 * (fast, indexed `.eq('pin', guess)` lookup) and newly-encrypted PINs
 * (decrypt-and-compare fallback).
 *
 * Why the fallback exists: clients.pin / team_members.pin are encrypted at
 * rest with secret-crypto's AES-256-GCM (random IV per encryption), so the
 * same PIN never produces the same ciphertext twice — an indexed exact-match
 * lookup against an encrypted column is structurally impossible without a
 * separate deterministic blind-index column, which is a larger, separate
 * migration. Until that exists, an encrypted PIN is found by decrypting each
 * tenant-scoped candidate and comparing in application code. Bounded by
 * `scanCandidates` (callers should cap it) so this can't turn into an
 * unbounded fetch on a large tenant.
 */
import { decryptSecret } from './secret-crypto'

export async function findRowByPin<T extends { pin: string | null }>(
  guessedPin: string,
  fastLookup: () => Promise<T | null>,
  scanCandidates: () => Promise<T[]>,
): Promise<T | null> {
  const fast = await fastLookup()
  if (fast) return fast

  const candidates = await scanCandidates()
  for (const row of candidates) {
    if (row.pin && decryptSecret(row.pin) === guessedPin) return row
  }
  return null
}
