#!/usr/bin/env node
/**
 * Clients (tenant_id, email) dedupe finder + merger.
 *
 * WHY THIS EXISTS
 * ----------------
 * verify-code.ts looks up an existing client by (tenant_id, email) and only
 * INSERTs a new one when the lookup finds nothing — with no unique
 * constraint backing that decision. A double-tap on "verify" can race two
 * requests past the lookup before either INSERT lands, creating two client
 * rows for one signup. `clients` is not in the tracked migration history
 * (created out-of-band), so whether duplicates already exist today is
 * unknown. This script finds out, and (behind --apply) merges them, ahead
 * of adding the UNIQUE index in
 * src/lib/migrations/2026_07_13_clients_tenant_email_unique.sql.
 *
 * MODES
 * -----
 *   (default)  report  — find duplicate (tenant_id, lower(email)) groups,
 *                         list every row + how many other tables reference
 *                         it, NO writes. Safe to run anytime.
 *   --apply             — merge each group: keep the OLDEST row (same
 *                         tie-break verify-code.ts's own lookup already
 *                         uses — `.order('created_at',{ascending:true})
 *                         .limit(1)` — so merging does not change which
 *                         client id the app already treats as canonical),
 *                         reassign every FK-referencing table's rows from
 *                         the newer duplicate(s) to the winner (FK columns
 *                         discovered LIVE via information_schema, not
 *                         hardcoded — clients' own referrers aren't fully
 *                         tracked in migrations either, so a hardcoded list
 *                         could miss one), then DELETE the losers. Each
 *                         group is one BEGIN/COMMIT.
 *
 * SAFETY
 * ------
 * --apply requires BOTH the flag AND DEDUPE_CLIENTS_CONFIRM=yes in the
 * environment — a deliberate second gate on top of the flag, since this
 * mutates/deletes real client rows across every table that references them.
 * This script has been AUTHORED but NOT RUN against prod. Do not run --apply
 * without Jeff/leader sign-off.
 *
 *   node scripts/dedupe-clients-email.mjs             # report
 *   DEDUPE_CLIENTS_CONFIRM=yes node scripts/dedupe-clients-email.mjs --apply
 *
 * The Supabase Management-API token is read the same way as
 * reconcile-tenant-config.mjs: $SUPABASE_ACCESS_TOKEN_FULLLOOP first, then
 * ~/.env.local. Absent -> SKIPS CLEANLY (exit 0).
 *
 * STRUCTURE: findDuplicateGroups / planMerge are pure (no I/O) and exported
 * so the grouping + merge-plan logic is unit-testable without a DB. The CLI
 * (token guard, SQL, report/apply, exit) runs ONLY when this file is
 * invoked directly.
 */
import { readFileSync, existsSync, realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const REF = 'cetnrttgtoajzjacfbhe'

// --- Pure: group raw clients rows into duplicate (tenant_id, email) sets ---
/**
 * @param {Array<{id:string, tenant_id:string, email:string|null, created_at:string}>} rows
 * @returns {Array<{tenant_id:string, email_lc:string, rows:Array}>}
 */
export function findDuplicateGroups(rows) {
  const groups = new Map()
  for (const r of rows) {
    if (!r.email) continue
    const key = `${r.tenant_id}::${r.email.toLowerCase()}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(r)
  }
  const dupes = []
  for (const [key, groupRows] of groups) {
    if (groupRows.length < 2) continue
    const [tenant_id, email_lc] = key.split('::')
    const sorted = [...groupRows].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    dupes.push({ tenant_id, email_lc, rows: sorted })
  }
  return dupes
}

// --- Pure: turn duplicate groups into a merge plan (winner + losers) ---
/**
 * @param {ReturnType<typeof findDuplicateGroups>} groups
 * @returns {Array<{tenant_id:string, email_lc:string, winnerId:string, loserIds:string[]}>}
 */
export function planMerge(groups) {
  return groups.map((g) => ({
    tenant_id: g.tenant_id,
    email_lc: g.email_lc,
    // Oldest wins — matches verify-code.ts's existing lookup tie-break, so
    // the merge does not change which id the app already resolves to.
    winnerId: g.rows[0].id,
    loserIds: g.rows.slice(1).map((r) => r.id),
  }))
}

// --- Token guard: identical to reconcile-tenant-config.mjs ---
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

async function main() {
  const TOK = loadToken()
  if (!TOK) {
    console.log('dedupe-clients-email: SUPABASE_ACCESS_TOKEN_FULLLOOP absent — skipping (exit 0).')
    process.exit(0)
  }

  const apply = process.argv.includes('--apply')
  if (apply && process.env.DEDUPE_CLIENTS_CONFIRM !== 'yes') {
    console.error(
      '--apply requires DEDUPE_CLIENTS_CONFIRM=yes in the environment as a deliberate second ' +
      'confirmation (this merges/deletes real client rows). Refusing to proceed.',
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

  const rows = await sql(
    `select id, tenant_id, email, created_at from clients where email is not null and email <> ''`,
  )
  const groups = findDuplicateGroups(rows)

  if (!groups.length) {
    console.log('dedupe-clients-email: no duplicate (tenant_id, email) groups found. Safe to run the migration.')
    process.exit(0)
  }

  // FK columns that reference clients(id), discovered live — not hardcoded —
  // since `clients` itself is created out-of-band and its full set of
  // referrers may not all be present in the tracked migration files.
  const fkCols = await sql(`
    select tc.table_name, kcu.column_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on tc.constraint_name = ccu.constraint_name and tc.table_schema = ccu.table_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema = 'public'
      and ccu.table_name = 'clients'
      and ccu.column_name = 'id'
  `)

  console.log(`\ndedupe-clients-email: ${groups.length} duplicate (tenant_id, email) group(s) found.`)
  console.log(`Referencing tables discovered: ${fkCols.map((c) => `${c.table_name}.${c.column_name}`).join(', ') || '(none)'}\n`)

  const plan = planMerge(groups)
  for (const g of plan) {
    console.log(`  [${g.tenant_id}] ${g.email_lc}: keep ${g.winnerId}, merge/delete ${g.loserIds.join(', ')}`)
  }

  if (!apply) {
    console.log('\nReport-only run (no writes). Re-run with --apply (+ DEDUPE_CLIENTS_CONFIRM=yes) to merge.')
    process.exit(0)
  }

  console.log('\nApplying merge...')
  for (const g of plan) {
    const reassigns = fkCols
      .map(
        (c) =>
          `update "${c.table_name}" set "${c.column_name}" = '${g.winnerId}' where "${c.column_name}" in (${g.loserIds.map((id) => `'${id}'`).join(',')});`,
      )
      .join('\n')
    const deletes = `delete from clients where id in (${g.loserIds.map((id) => `'${id}'`).join(',')});`
    await sql(`begin;\n${reassigns}\n${deletes}\ncommit;`)
    console.log(`  merged ${g.tenant_id}/${g.email_lc} -> ${g.winnerId}`)
  }
  console.log('\nDone. Re-run in report mode to confirm zero duplicate groups remain, then run the migration.')
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
