/**
 * RFC 4122 v5 (namespace + name, SHA-1) deterministic UUID. Same (namespace,
 * name) always yields the same UUID — unlike gen_random_uuid()/randomUUID(),
 * which are never reproducible. Used to derive stable `source_id` values for
 * ledger postings that need a *different* id per real-world occurrence of a
 * row that itself never changes id (see recurring-expense-ledger.ts).
 *
 * Mirrored in SQL by
 * migrations/2026_07_18_recurring_expense_ledger_source_id.backfill.sql's
 * inline PL/pgSQL — same algorithm (SHA-1 via pgcrypto's digest(), same
 * version/variant byte positions), so the app and a one-off backfill agree on
 * the same id for the same (namespace, name) without either depending on the
 * other at runtime.
 */
import { createHash } from 'crypto'

function uuidToBytes(uuid: string): Buffer {
  return Buffer.from(uuid.replace(/-/g, ''), 'hex')
}

function bytesToUuid(bytes: Buffer): string {
  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function uuidV5(namespace: string, name: string): string {
  const hash = createHash('sha1')
    .update(Buffer.concat([uuidToBytes(namespace), Buffer.from(name, 'utf8')]))
    .digest()
  const bytes = Buffer.from(hash.subarray(0, 16))
  bytes[6] = (bytes[6] & 0x0f) | 0x50 // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // RFC 4122 variant
  return bytesToUuid(bytes)
}
