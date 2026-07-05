/**
 * Encrypt-at-rest migration for tenant secret fields.
 *
 * Backfills plaintext vendor keys (stripe/telnyx/resend/imap/anthropic/indexnow/
 * telegram) into the encrypted envelope format. Safe by construction: readers use
 * decryptSecret(), which passes plaintext through unchanged, so there is no window
 * where a half-migrated field breaks a live read. Never prints secret VALUES.
 *
 * MODES:
 *   (default)   dry-run  — report current state + what would change, NO writes
 *   --verify              — report encrypted/plaintext/empty tally, NO writes
 *   --apply               — encrypt every plaintext secret field, then re-verify
 *
 * REQUIREMENT for --apply: SECRET_ENCRYPTION_KEY must be set in THIS shell's env
 * (add it to .env.local with the SAME value you set in Vercel prod). Without it,
 * encryptTenantSecrets no-ops and the script refuses to "migrate" to plaintext.
 *
 * USAGE:  cd platform && npx tsx scripts/migrate-encrypt-secrets.ts [--verify|--apply]
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}

async function main() {
  const mode = process.argv.includes('--apply') ? 'apply' : process.argv.includes('--verify') ? 'verify' : 'dry'
  const { createClient } = await import('@supabase/supabase-js')
  const { encryptTenantSecrets, isEncrypted, ENCRYPTED_TENANT_FIELDS } = await import('../src/lib/secret-crypto')
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const FIELDS = ENCRYPTED_TENANT_FIELDS as readonly string[]
  const keyPresent = !!process.env.SECRET_ENCRYPTION_KEY

  const { data: tenants, error } = await db.from('tenants').select(['id', 'slug', ...FIELDS].join(', '))
  if (error) { console.error('read failed:', error.message); process.exit(1) }

  type Cls = 'encrypted' | 'plaintext' | 'empty'
  const classify = (v: unknown): Cls => (v == null || v === '' ? 'empty' : isEncrypted(v as string) ? 'encrypted' : 'plaintext')
  const tally = (rows: Record<string, unknown>[]) => {
    const t: Record<string, Record<Cls, number>> = {}
    for (const f of FIELDS) t[f] = { encrypted: 0, plaintext: 0, empty: 0 }
    for (const row of rows) for (const f of FIELDS) t[f][classify(row[f])]++
    return t
  }
  const report = (label: string, rows: Record<string, unknown>[]) => {
    const t = tally(rows)
    console.log(`\n=== ${label} (${rows.length} tenants) ===`)
    let plain = 0
    for (const f of FIELDS) {
      const c = t[f]; plain += c.plaintext
      console.log(`  ${f.padEnd(20)} encrypted:${c.encrypted}  plaintext:${c.plaintext}  empty:${c.empty}`)
    }
    console.log(`  --> total PLAINTEXT secret fields: ${plain}`)
    return plain
  }
  console.log(`SECRET_ENCRYPTION_KEY in this env: ${keyPresent ? 'present' : 'ABSENT'}`)
  const rows = tenants as unknown as Record<string, unknown>[]
  const plaintextNow = report('CURRENT STATE', rows)

  if (mode === 'verify') { process.exit(0) }

  if (!keyPresent) {
    console.log(`\n${mode === 'apply' ? 'CANNOT --apply' : 'DRY RUN'}: SECRET_ENCRYPTION_KEY is not set in this shell.`)
    console.log('Add it to .env.local (same value as Vercel prod), then re-run with --apply.')
    process.exit(mode === 'apply' ? 1 : 0)
  }

  if (mode === 'dry') {
    console.log(`\nDRY RUN: would encrypt ${plaintextNow} plaintext field(s). Re-run with --apply to write.`)
    process.exit(0)
  }

  // --apply
  let changed = 0
  for (const row of rows) {
    const plainSubset: Record<string, unknown> = {}
    for (const f of FIELDS) if (classify(row[f]) === 'plaintext') plainSubset[f] = row[f]
    if (!Object.keys(plainSubset).length) continue
    const enc = encryptTenantSecrets(plainSubset)
    const { error: uErr } = await db.from('tenants').update(enc).eq('id', row.id as string)
    if (uErr) { console.error(`  ! ${row.slug}: ${uErr.message}`); continue }
    changed += Object.keys(plainSubset).length
  }
  console.log(`\nApplied: encrypted ${changed} field(s).`)

  // re-verify from a fresh read
  const { data: after } = await db.from('tenants').select(['id', 'slug', ...FIELDS].join(', '))
  const remaining = report('AFTER MIGRATION', (after || []) as unknown as Record<string, unknown>[])
  console.log(remaining === 0 ? '\nALL SECRETS ENCRYPTED ✓' : `\n${remaining} still plaintext — investigate.`)
  process.exit(remaining === 0 ? 0 : 1)
}
main().catch(e => { console.error(e); process.exit(1) })
