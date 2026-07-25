#!/usr/bin/env node
/**
 * Clients (name/email/phone) format backfill — all tenants.
 *
 * WHY THIS EXISTS
 * ----------------
 * clients.phone has been stored in whatever punctuation the write path
 * happened to use (raw-as-typed, digits-only, or occasionally E.164),
 * clients.email was inconsistently trimmed/lowercased, and clients.name was
 * never capitalized anywhere. All three broke substring search on the
 * clients page, the booking page's client picker, and the bookings list
 * search bar (a client typed with different punctuation than what's stored
 * never matches). The write paths (POST/PATCH /api/clients, /api/lead,
 * /api/ingest/lead, /api/clients/import, /api/client/book) were fixed to
 * normalize going forward — this script is the one-time catch-up for rows
 * that already existed before that fix landed.
 *
 * Canonical formats (must match src/lib/format.ts + src/lib/phone.ts,
 * copied here in plain JS since this script has no TS module resolution):
 *   phone -> E.164 (+1XXXXXXXXXX), same as client_contacts.phone_e164 and
 *            the normalization lib/sms.ts already applies at the send
 *            boundary (see that file's comment re: the 2026-07-22 nycmaid
 *            outage this format was already chosen to fix).
 *   email -> trim + lowercase
 *   name  -> Title Case per space-separated word (McDonald/O'Brien/de la
 *            Cruz will NOT be handled specially — accepted tradeoff)
 *
 * MODES
 * -----
 *   (default)  report — count rows that would change per tenant, print a
 *                        handful of before/after samples, NO writes.
 *   --apply             apply the changes. Only rows that actually differ
 *                        are touched; batched in transactions of 200.
 *
 * SAFETY
 * ------
 * --apply requires BOTH the flag AND BACKFILL_CLIENTS_FORMAT_CONFIRM=yes in
 * the environment. This script has been AUTHORED but NOT RUN against prod.
 * Do not run --apply without Jeff's explicit go-ahead on the report output.
 *
 *   node scripts/backfill-clients-format.mjs                 # report
 *   BACKFILL_CLIENTS_FORMAT_CONFIRM=yes node scripts/backfill-clients-format.mjs --apply
 *
 * Token loaded the same way as dedupe-clients-email.mjs / reconcile-tenant-
 * config.mjs: $SUPABASE_ACCESS_TOKEN_FULLLOOP first, then ~/.env.local.
 * Absent -> SKIPS CLEANLY (exit 0).
 *
 * STRUCTURE: normalizeName / normalizeEmail / normalizePhone / planChanges
 * are pure (no I/O) and exported so they're unit-testable without a DB. The
 * CLI (token guard, SQL, report/apply, exit) runs ONLY when this file is
 * invoked directly.
 */
import { readFileSync, existsSync, realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const REF = 'cetnrttgtoajzjacfbhe'

// --- Pure: mirror src/lib/format.ts#formatName ---
export function normalizeName(name) {
  if (typeof name !== 'string') return name
  return name
    .toLowerCase()
    .split(' ')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ')
    .trim()
}

// --- Pure: mirror src/lib/format.ts#formatEmail ---
export function normalizeEmail(email) {
  if (typeof email !== 'string') return email
  return email.toLowerCase().trim()
}

// --- Pure: mirror src/lib/phone.ts#normalizePhone ---
export function normalizePhone(input) {
  if (!input) return null
  const digits = String(input).replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (digits.length === 0) return null
  return `+${digits}`
}

// --- Pure: turn raw rows into a change plan ---
/**
 * @param {Array<{id:string, tenant_id:string, name:string|null, email:string|null, phone:string|null}>} rows
 */
export function planChanges(rows) {
  const changes = []
  let unparseablePhones = 0
  for (const r of rows) {
    const newName = r.name != null ? normalizeName(r.name) : r.name
    const newEmail = r.email != null ? normalizeEmail(r.email) : r.email
    let newPhone = r.phone
    if (r.phone != null && r.phone !== '') {
      const normalized = normalizePhone(r.phone)
      if (normalized) {
        newPhone = normalized
      } else {
        unparseablePhones++
      }
    }

    const fields = {}
    if (newName !== r.name) fields.name = newName
    if (newEmail !== r.email) fields.email = newEmail
    if (newPhone !== r.phone) fields.phone = newPhone

    if (Object.keys(fields).length > 0) {
      changes.push({ id: r.id, tenant_id: r.tenant_id, before: r, fields })
    }
  }
  return { changes, unparseablePhones }
}

// --- Token guard: identical to dedupe-clients-email.mjs ---
export function loadToken(env = process.env) {
  const fromEnv = env.SUPABASE_ACCESS_TOKEN_FULLLOOP
  if (fromEnv && fromEnv.trim()) return fromEnv.trim()
  const envPath = join(env.HOME || '', '.env.local')
  if (!existsSync(envPath)) return null
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*SUPABASE_ACCESS_TOKEN_FULLLOOP\s*=\s*(.*)\s*$/)
    if (m) return m[1].replace(/^["']|["']$/g, '').trim() || null
  }
  return null
}

function sqlLiteral(v) {
  if (v === null || v === undefined) return 'null'
  return `'${String(v).replace(/'/g, "''")}'`
}

async function main() {
  const TOK = loadToken()
  if (!TOK) {
    console.log('backfill-clients-format: SUPABASE_ACCESS_TOKEN_FULLLOOP absent — skipping (exit 0).')
    process.exit(0)
  }

  const apply = process.argv.includes('--apply')
  if (apply && process.env.BACKFILL_CLIENTS_FORMAT_CONFIRM !== 'yes') {
    console.error(
      '--apply requires BACKFILL_CLIENTS_FORMAT_CONFIRM=yes in the environment as a deliberate ' +
      'second confirmation (this rewrites real client rows across every tenant). Refusing to proceed.',
    )
    process.exit(1)
  }

  const sql = async (query) => {
    const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOK}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })
    const d = await r.json()
    if (!Array.isArray(d)) throw new Error('SQL: ' + JSON.stringify(d).slice(0, 200))
    return d
  }

  const rows = await sql(`select id, tenant_id, name, email, phone from clients`)
  const { changes, unparseablePhones } = planChanges(rows)

  console.log(`backfill-clients-format: ${rows.length} total clients across all tenants.`)
  console.log(`${changes.length} row(s) need a name/email/phone change.`)
  if (unparseablePhones > 0) {
    console.log(`${unparseablePhones} row(s) have a phone value that couldn't be parsed into E.164 — left untouched.`)
  }

  const perTenant = new Map()
  for (const c of changes) perTenant.set(c.tenant_id, (perTenant.get(c.tenant_id) || 0) + 1)
  console.log('\nBy tenant:')
  for (const [tenantId, count] of [...perTenant.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${tenantId}: ${count}`)
  }

  console.log('\nSample (up to 15):')
  for (const c of changes.slice(0, 15)) {
    const beforeBits = []
    const afterBits = []
    if ('name' in c.fields) { beforeBits.push(c.before.name); afterBits.push(c.fields.name) }
    if ('email' in c.fields) { beforeBits.push(c.before.email); afterBits.push(c.fields.email) }
    if ('phone' in c.fields) { beforeBits.push(c.before.phone); afterBits.push(c.fields.phone) }
    console.log(`  [${c.id}] "${beforeBits.join(' | ')}" -> "${afterBits.join(' | ')}"`)
  }

  if (!apply) {
    console.log('\nReport-only run (no writes). Re-run with --apply (+ BACKFILL_CLIENTS_FORMAT_CONFIRM=yes) to write.')
    process.exit(0)
  }

  console.log('\nApplying...')
  const batchSize = 200
  for (let i = 0; i < changes.length; i += batchSize) {
    const batch = changes.slice(i, i + batchSize)
    const statements = batch
      .map((c) => {
        const sets = Object.entries(c.fields)
          .map(([k, v]) => `"${k}" = ${sqlLiteral(v)}`)
          .join(', ')
        return `update clients set ${sets} where id = ${sqlLiteral(c.id)};`
      })
      .join('\n')
    await sql(`begin;\n${statements}\ncommit;`)
    console.log(`  applied batch ${Math.floor(i / batchSize) + 1} (${batch.length} rows)`)
  }
  console.log(`\nDone. ${changes.length} row(s) updated. Re-run in report mode to confirm zero rows remain.`)
}

try {
  if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
    main().catch((e) => {
      console.error(e)
      process.exit(1)
    })
  }
} catch {
  /* argv[1] unresolvable (e.g. odd runner) — treat as "not the entrypoint" */
}
