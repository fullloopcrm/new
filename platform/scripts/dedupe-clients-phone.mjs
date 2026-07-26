#!/usr/bin/env node
/**
 * Clients (tenant_id, phone) dedupe finder + merger.
 *
 * WHY THIS EXISTS
 * ----------------
 * Sibling of dedupe-clients-email.mjs, same problem for phone instead of
 * email. clients.phone was stored in inconsistent formats (raw-as-typed,
 * digits-only, occasionally E.164) until the 2026-07-24 fix normalized
 * every write path to E.164 and backfilled existing rows
 * (scripts/backfill-clients-format.mjs). Before that fix, a phone-based
 * duplicate lookup on a differently-formatted existing row would silently
 * miss and create a second client row instead of finding the first one.
 * Now that every phone is normalized to the same format, those pre-existing
 * duplicates are visible for the first time as exact (tenant_id, phone)
 * matches.
 *
 * MODES
 * -----
 *   (default)  report — find duplicate (tenant_id, phone) groups, list every
 *                        row + how many other tables reference it, NO
 *                        writes. Safe to run anytime.
 *   --apply             merge each group: keep the OLDEST row (same
 *                        tie-break as dedupe-clients-email.mjs), reassign
 *                        every FK-referencing table's rows from the newer
 *                        duplicate(s) to the winner (FK columns discovered
 *                        LIVE via information_schema), then DELETE the
 *                        losers. Each group is one BEGIN/COMMIT.
 *
 * SAFETY
 * ------
 * --apply requires BOTH the flag AND DEDUPE_CLIENTS_PHONE_CONFIRM=yes in the
 * environment. This script has been AUTHORED but NOT RUN against prod. Do
 * not run --apply without reviewing the report output first — several
 * tenants in this platform (nycmaid in particular) are LIVE REVENUE, and a
 * merge deletes a real row and reassigns its bookings/deals/invoices.
 *
 *   node scripts/dedupe-clients-phone.mjs             # report
 *   DEDUPE_CLIENTS_PHONE_CONFIRM=yes node scripts/dedupe-clients-phone.mjs --apply
 *
 * Token loaded the same way as dedupe-clients-email.mjs.
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

// --- Pure: group raw clients rows into duplicate (tenant_id, phone) sets ---
/**
 * @param {Array<{id:string, tenant_id:string, phone:string|null, name:string|null, created_at:string}>} rows
 * @returns {{dupes: Array<{tenant_id:string, phone:string, rows:Array}>, skipped: Array<{tenant_id:string, phone:string, rows:Array}>}}
 */
export function findDuplicateGroups(rows) {
  const groups = new Map()
  for (const r of rows) {
    if (!r.phone) continue
    const key = `${r.tenant_id}::${r.phone}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(r)
  }
  const dupes = []
  const skipped = []
  for (const [key, groupRows] of groups) {
    if (groupRows.length < 2) continue
    const [tenant_id, phone] = key.split('::')
    const sorted = [...groupRows].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    // Safety filter: a shared phone number with WILDLY different names
    // (e.g. an internal test/trace number reused across fake bookings) is
    // not one customer duplicated — it's a shared/misused number. Only
    // auto-merge when every row's name matches (case/whitespace-insensitive).
    // Everything else is reported but left alone for manual review.
    const norm = (n) => (n || '').trim().toLowerCase()
    const firstName = norm(sorted[0].name)
    const sameName = sorted.every((r) => norm(r.name) === firstName)
    if (sameName) {
      dupes.push({ tenant_id, phone, rows: sorted })
    } else {
      skipped.push({ tenant_id, phone, rows: sorted })
    }
  }
  return { dupes, skipped }
}

// --- Pure: turn duplicate groups into a merge plan (winner + losers) ---
/**
 * @param {ReturnType<typeof findDuplicateGroups>} groups
 * @returns {Array<{tenant_id:string, phone:string, winnerId:string, winnerName:string|null, loserIds:string[], loserNames:(string|null)[]}>}
 */
export function planMerge(groups) {
  return groups.map((g) => ({
    tenant_id: g.tenant_id,
    phone: g.phone,
    // Oldest wins — same convention as dedupe-clients-email.mjs.
    winnerId: g.rows[0].id,
    winnerName: g.rows[0].name,
    loserIds: g.rows.slice(1).map((r) => r.id),
    loserNames: g.rows.slice(1).map((r) => r.name),
  }))
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

async function main() {
  const TOK = loadToken()
  if (!TOK) {
    console.log('dedupe-clients-phone: SUPABASE_ACCESS_TOKEN_FULLLOOP absent — skipping (exit 0).')
    process.exit(0)
  }

  const apply = process.argv.includes('--apply')
  const drySql = process.argv.includes('--dry-sql')
  if (apply && !drySql && process.env.DEDUPE_CLIENTS_PHONE_CONFIRM !== 'yes') {
    console.error(
      '--apply requires DEDUPE_CLIENTS_PHONE_CONFIRM=yes in the environment as a deliberate second ' +
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
    `select id, tenant_id, phone, name, created_at from clients where phone is not null and phone <> ''`,
  )
  const { dupes: groups, skipped } = findDuplicateGroups(rows)

  if (skipped.length) {
    console.log(`\n${skipped.length} group(s) share a phone but NOT a matching name — a reused/shared number, not one customer duplicated. SKIPPED, not merged:`)
    for (const s of skipped) {
      console.log(`  ${s.phone}: ${s.rows.map((r) => `"${r.name}" (${r.id})`).join(', ')}`)
    }
  }

  if (!groups.length) {
    console.log('\ndedupe-clients-phone: no auto-mergeable (tenant_id, phone) groups found.')
    process.exit(0)
  }

  // FK columns that reference clients(id), discovered live — matches
  // dedupe-clients-email.mjs's approach, not hardcoded.
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

  // UNIQUE constraints that INCLUDE the FK column being reassigned (e.g.
  // outreach_log's (tenant_id, client_id, moment_id) dedup key). Reassigning
  // a loser's client_id straight to the winner's can collide with a row the
  // winner already has for the same natural key -- both are the same real
  // customer, so they plausibly logged the same outreach touchpoint,
  // received the same review request, etc. Discovered live per table, not
  // hardcoded, same spirit as the FK discovery above.
  const uniqueConstraints = await sql(`
    select tc.table_name, tc.constraint_name, array_agg(kcu.column_name order by kcu.ordinal_position) as columns
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
    where tc.constraint_type in ('UNIQUE', 'PRIMARY KEY')
      and tc.table_schema = 'public'
      and tc.table_name in (${[...new Set(fkCols.map((c) => c.table_name))].map((t) => `'${t}'`).join(',')})
    group by tc.table_name, tc.constraint_name
  `)

  // The Management API's SQL endpoint serializes array_agg() as a Postgres
  // array-literal string ("{a,b,c}"), not a JSON array -- parse it.
  const parsePgArray = (s) => (typeof s === 'string' ? s.replace(/^\{|\}$/g, '').split(',').filter(Boolean) : s)
  for (const uc of uniqueConstraints) uc.columns = parsePgArray(uc.columns)

  const tenants = await sql(`select id, name from tenants`)
  const tenantNames = new Map(tenants.map((t) => [t.id, t.name]))

  console.log(`\ndedupe-clients-phone: ${groups.length} duplicate (tenant_id, phone) group(s) found.`)
  console.log(`Referencing tables discovered: ${fkCols.map((c) => `${c.table_name}.${c.column_name}`).join(', ') || '(none)'}\n`)

  const fullPlan = planMerge(groups)

  // bookings/jobs both have a real, per-client UNIQUE(client_id, job_seq) --
  // these are customer-facing job numbers (see lib/format.ts#formatJobNumber),
  // not disposable log rows. A collision there can't be auto-resolved by
  // deleting (that would destroy a real booking) or silently renumbering
  // (that could change a number a customer already saw on an invoice) --
  // it needs a human to look. Groups that hit this are excluded from the
  // plan entirely and reported separately.
  const plan = []
  const jobSeqBlocked = []
  for (const g of fullPlan) {
    const allIds = [g.winnerId, ...g.loserIds]
    const idList = allIds.map((id) => `'${id}'`).join(',')
    const seqRows = await sql(
      `select client_id, job_seq from bookings where client_id in (${idList}) and job_seq is not null ` +
      `union all select client_id, job_seq from jobs where client_id in (${idList}) and job_seq is not null`,
    )
    const winnerSeqs = new Set(seqRows.filter((r) => r.client_id === g.winnerId).map((r) => r.job_seq))
    const hasCollision = seqRows.some((r) => g.loserIds.includes(r.client_id) && winnerSeqs.has(r.job_seq))
    if (hasCollision) jobSeqBlocked.push(g)
    else plan.push(g)
  }

  if (jobSeqBlocked.length) {
    console.log(`\n${jobSeqBlocked.length} group(s) BLOCKED -- winner and loser have colliding job_seq numbers in bookings/jobs (real business records, not auto-resolved):`)
    for (const g of jobSeqBlocked) {
      console.log(`  [${tenantNames.get(g.tenant_id) || g.tenant_id}] ${g.phone}: "${g.winnerName}" (${g.winnerId}) vs ${g.loserNames.map((n, i) => `"${n}" (${g.loserIds[i]})`).join(', ')}`)
    }
  }

  console.log(`\n${plan.length} group(s) clear to merge:`)
  for (const g of plan) {
    const tenantName = tenantNames.get(g.tenant_id) || g.tenant_id
    console.log(`  [${tenantName}] ${g.phone}: keep "${g.winnerName}" (${g.winnerId}), merge/delete ${g.loserNames.map((n, i) => `"${n}" (${g.loserIds[i]})`).join(', ')}`)
  }

  if (!apply) {
    console.log('\nReport-only run (no writes). Re-run with --apply (+ DEDUPE_CLIENTS_PHONE_CONFIRM=yes) to merge.')
    process.exit(0)
  }

  console.log('\nApplying merge...')
  for (const g of plan) {
    const loserList = g.loserIds.map((id) => `'${id}'`).join(',')

    const statements = []

    // Two more real UNIQUE indexes found live via pg_indexes that don't show
    // up in information_schema.table_constraints because they're partial
    // (CREATE UNIQUE INDEX ... WHERE ...), not formal constraints:
    //   client_contacts: UNIQUE(client_id) WHERE is_primary -- winner and
    //     loser each already have their own primary contact row; un-mark the
    //     loser's instead of deleting it (keeps the contact record, no data
    //     loss, no collision).
    //   connect_channels: UNIQUE(tenant_id, client_id) WHERE type='client'
    //     -- a chat channel, not a business record; safe to drop the
    //     loser's redundant one, same as the log-table dedup rows below.
    statements.push(`update client_contacts set is_primary = false where client_id in (${loserList}) and is_primary = true;`)
    statements.push(
      `delete from connect_channels where client_id in (${loserList}) and type = 'client' ` +
      `and exists (select 1 from connect_channels w where w.client_id = '${g.winnerId}' and w.type = 'client' and w.tenant_id = connect_channels.tenant_id);`,
    )

    for (const c of fkCols) {
      // Clear any loser row that collides with a winner row on a UNIQUE key
      // that includes this FK column -- see uniqueConstraints comment above.
      const collidingConstraints = uniqueConstraints.filter(
        (uc) => uc.table_name === c.table_name && uc.columns.includes(c.column_name),
      )
      for (const uc of collidingConstraints) {
        const otherCols = uc.columns.filter((col) => col !== c.column_name)
        if (otherCols.length === 0) continue // PK-only-is-the-FK case, nothing else to match on
        const matchClause = otherCols
          .map((col) => `t_loser."${col}" is not distinct from t_winner."${col}"`)
          .join(' and ')
        statements.push(
          `delete from "${c.table_name}" t_loser using "${c.table_name}" t_winner ` +
          `where t_loser."${c.column_name}" in (${loserList}) ` +
          `and t_winner."${c.column_name}" = '${g.winnerId}' and ${matchClause};`,
        )
      }
      statements.push(`update "${c.table_name}" set "${c.column_name}" = '${g.winnerId}' where "${c.column_name}" in (${loserList});`)
    }
    statements.push(`delete from clients where id in (${loserList});`)

    if (process.argv.includes('--dry-sql')) {
      console.log(`\n-- ${g.tenant_id}/${g.phone} -> ${g.winnerId}`)
      console.log(`begin;\n${statements.join('\n')}\ncommit;`)
      continue
    }

    await sql(`begin;\n${statements.join('\n')}\ncommit;`)
    console.log(`  merged ${g.tenant_id}/${g.phone} -> ${g.winnerId}`)
  }
  if (process.argv.includes('--dry-sql')) {
    console.log('\n--dry-sql: printed only, nothing executed.')
    process.exit(0)
  }
  console.log('\nDone. Re-run in report mode to confirm zero duplicate groups remain.')
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
