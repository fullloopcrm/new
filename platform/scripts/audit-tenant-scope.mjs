#!/usr/bin/env node
/**
 * Tenant-isolation guard. Fails (exit 1) if any LIVE query on a tenant-owned
 * table is not scoped by tenant_id and is not a row-specific id lookup — i.e.
 * a cross-tenant leak candidate.
 *
 * The platform runs every query through the service-role client, which BYPASSES
 * Postgres RLS. So tenant isolation is enforced only by each query including
 * `.eq('tenant_id', ...)`. This script is the backstop for that convention:
 * run it in CI / pre-push so a forgotten filter can't merge.
 *
 *   node scripts/audit-tenant-scope.mjs           # gate live code, exit 1 on leak
 *   node scripts/audit-tenant-scope.mjs --all     # include dead clones, never fails
 *
 * When a flagged query is a genuine false positive (e.g. an intentional
 * cross-tenant admin aggregate), add `// tenant-scope-ok: <reason>` on the
 * .from() line to silence it.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'

const ALL = process.argv.includes('--all')
const UPDATE_BASELINE = process.argv.includes('--update-baseline')
const ROOT = 'src'
// Known-accepted violations (existing debt + intentional cross-tenant paths).
// The gate fails only on findings NOT in this baseline, so new leaks can't
// merge while the 96 legacy candidates are triaged separately.
const BASELINE_FILE = 'scripts/.tenant-scope-baseline.json'
const keyOf = (f) => `${f.file}::${f.table}::${f.snippet}`

// Tables that carry tenant_id and hold per-tenant data.
const TENANT_TABLES = new Set([
  'bookings','clients','sms_conversations','sms_conversation_messages','notifications',
  'team_members','recurring_schedules','cleaners','deals','quotes','payments','documents',
  'service_types','document_signers','uploads','comhub_threads','comhub_messages','invoices',
  'comhub_active_calls','campaigns','lead_clicks','deal_activities','campaign_recipients',
  'bank_transactions','expenses','reviews','google_reviews','routes','waitlist',
])

// Excluded from the gate: legacy per-tenant marketing/portal CLONES (each is a
// single fixed tenant, slated for deletion — see platform/CLAUDE.md) and the
// super-admin analytics surface (intentionally cross-tenant).
const EXCLUDE = ALL ? [] : [
  /^src\/app\/site\/(nyc-mobile-salon|wash-and-fold-hoboken|wash-and-fold-nyc)\//,
  /^src\/app\/admin\/analytics\//,
]

const files = execSync(`grep -rl "\\.from('" ${ROOT} --include="*.ts" --include="*.tsx"`, { encoding: 'utf8' })
  .trim().split('\n').filter(Boolean)
  .filter(f => !EXCLUDE.some(rx => rx.test(f)))

const flagged = []
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n')
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/\.from\('([a-z_]+)'\)/)
    if (!m || !TENANT_TABLES.has(m[1])) continue
    if (/tenant-scope-ok/.test(lines[i])) continue
    if (/\.storage\.from\(/.test(lines[i])) continue             // storage bucket, not a table
    const chain = lines.slice(i, i + 12).join('\n')
    const scoped = /tenant_id/.test(chain)                       // filter or insert payload
    // Row/entity-specific keys are globally unique (UUIDs / secret tokens), so a
    // lookup by id / *_id / *token* is inherently row-scoped, not a leak.
    const idLookup = /\.(eq|in)\('(id|[a-z_]*_id|[a-z_]*token[a-z_]*)'\s*,/.test(chain)
    if (!scoped && !idLookup) {
      flagged.push({ file, line: i + 1, table: m[1], snippet: lines[i].trim().slice(0, 110) })
    }
  }
}

if (UPDATE_BASELINE) {
  const keys = flagged.map(keyOf).sort()
  writeFileSync(BASELINE_FILE, JSON.stringify(keys, null, 2) + '\n')
  console.log(`baseline updated: ${keys.length} accepted findings written to ${BASELINE_FILE}`)
  process.exit(0)
}

const baseline = existsSync(BASELINE_FILE)
  ? new Set(JSON.parse(readFileSync(BASELINE_FILE, 'utf8')))
  : new Set()
const fresh = flagged.filter((f) => !baseline.has(keyOf(f)))

if (fresh.length === 0) {
  console.log(`✓ tenant-scope guard: no NEW unscoped queries (${flagged.length} known/baselined)`)
  process.exit(0)
}
console.error(`✗ tenant-scope guard: ${fresh.length} NEW unscoped quer${fresh.length === 1 ? 'y' : 'ies'} on tenant tables\n`)
for (const f of fresh) console.error(`  ${f.file}:${f.line}  [${f.table}]  ${f.snippet}`)
console.error('\nAdd .eq(\'tenant_id\', tenantId); or `// tenant-scope-ok: <reason>` if intentional; or `npm run audit:tenant -- --update-baseline` to accept.')
process.exit(ALL ? 0 : 1)
