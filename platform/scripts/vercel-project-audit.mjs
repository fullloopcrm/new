#!/usr/bin/env node
/**
 * Vercel-project audit for the 18 bespoke tenants left NULL by
 * 059_backfill_vercel_project.sql (unresolvable from repo alone — see that
 * file's header). Closes the UX-friction gap flagged in the P1 W1 report at
 * 2026-07-16 13:29: today someone reads a static /tmp/w1-vercel-audit.md
 * snapshot (ephemeral, already gone from disk) and hand-edits SQL array
 * literals. This hits the FL project's live Vercel domains API and the
 * current DB state instead, and prints ready-to-paste SQL — no hand-derived
 * snapshot, no manual API curling.
 *
 * READ-ONLY: a read-only Supabase Management API SQL query (same mechanism
 * scripts/reconcile-tenant-config.mjs already uses) + a GET against the
 * Vercel domains API. Writes NOTHING. Prints SQL for a human/leader to
 * review and run — same division of labor as every other migration in this
 * lane (W1 authors, leader executes after Jeff approves).
 *
 *   node scripts/vercel-project-audit.mjs
 *
 * Needs SUPABASE_ACCESS_TOKEN_FULLLOOP + VERCEL_API_TOKEN + VERCEL_TEAM_ID in
 * ~/.env.local (same file reconcile-tenant-config.mjs and vercel-domains.ts's
 * runtime env already rely on).
 */
import { readFileSync } from 'node:fs'

const REF = 'cetnrttgtoajzjacfbhe'
// The FL platform project — same id as 059_backfill_vercel_project.sql's
// fl_project literal. Keep these two in sync by hand; both are single-line
// literals, not worth a shared module for two call sites.
const FL_PROJECT = 'prj_PtBsLFfrCvSYXzo60GlNAjPoPjbj'

// Mirrors 059_backfill_vercel_project.sql's unknown_slugs array VERBATIM.
// That migration is the single source of truth for which bespoke tenants are
// still unresolved; if it changes, update this list too (it is small and
// reviewed every time this script runs, so drift is caught by a human before
// the SQL below gets pasted anywhere).
const UNKNOWN_SLUGS = [
  'nycmaid',
  'we-pay-you-junk',
  'nyc-mobile-salon',
  'the-nyc-exterminator',
  'nyc-tow',
  'nycroadsideemergencyassistance',
  'theroadsidehelper',
  'toll-trucks-near-me',
  'sunnyside-clean-nyc',
  'wash-and-fold-nyc',
  'wash-and-fold-hoboken',
  'landscaping-in-nyc',
  'debt-service-ratio-loan',
  'fla-dumpster-rentals',
  'stretch-ny',
  'stretch-service',
  'the-home-services-company',
  'the-nyc-seo',
]

const env = {}
try {
  readFileSync(join(process.env.HOME, '.env.local'), 'utf8').split('\n').forEach((l) => {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
  })
} catch (err) {
  console.error(`could not read ~/.env.local: ${err.message}`)
  process.exit(1)
}
function join(...parts) {
  return parts.join('/')
}

const SUPABASE_TOK = env.SUPABASE_ACCESS_TOKEN_FULLLOOP
const VERCEL_TOK = env.VERCEL_API_TOKEN
const VERCEL_TEAM = env.VERCEL_TEAM_ID

if (!SUPABASE_TOK) { console.error('missing SUPABASE_ACCESS_TOKEN_FULLLOOP'); process.exit(1) }
if (!VERCEL_TOK || !VERCEL_TEAM) { console.error('missing VERCEL_API_TOKEN / VERCEL_TEAM_ID'); process.exit(1) }

async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SUPABASE_TOK}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const d = await r.json()
  if (!Array.isArray(d)) throw new Error('SQL: ' + JSON.stringify(d).slice(0, 200))
  return d
}

// GET is read-only; paginates the FL project's attached domains.
async function listFlProjectDomains() {
  const domains = []
  let next
  do {
    const url = new URL(`https://api.vercel.com/v10/projects/${FL_PROJECT}/domains`)
    url.searchParams.set('teamId', VERCEL_TEAM)
    url.searchParams.set('limit', '100')
    if (next) url.searchParams.set('until', String(next))
    const res = await fetch(url, { headers: { Authorization: `Bearer ${VERCEL_TOK}` } })
    if (!res.ok) throw new Error(`Vercel domains list failed: ${res.status} ${await res.text()}`)
    const body = await res.json()
    domains.push(...(body.domains || []))
    next = body.pagination?.next
  } while (next)
  return domains
}

const norm = (d) => (d || '').toLowerCase().replace(/^www\./, '').trim()

async function main() {
  console.log(`Auditing ${UNKNOWN_SLUGS.length} unresolved bespoke tenant(s) against live Vercel state...\n`)

  const [rows, flDomains] = await Promise.all([
    sql(
      `select t.slug, td.domain, td.vercel_project
       from tenant_domains td
       join tenants t on t.id = td.tenant_id
       where t.slug = any(array[${UNKNOWN_SLUGS.map((s) => `'${s}'`).join(',')}])`
    ),
    listFlProjectDomains(),
  ])

  const flDomainSet = new Set(flDomains.map((d) => norm(d.name)).filter(Boolean))
  const flVerifiedSet = new Set(
    flDomains.filter((d) => d.verified).map((d) => norm(d.name)).filter(Boolean)
  )

  const bySlug = new Map()
  for (const r of rows) {
    if (!bySlug.has(r.slug)) bySlug.set(r.slug, [])
    bySlug.get(r.slug).push(r)
  }

  const cutoversFound = []
  const stillStandalone = []
  const noDomainOnFile = []

  for (const slug of UNKNOWN_SLUGS) {
    const tdRows = bySlug.get(slug) || []
    if (tdRows.length === 0) {
      noDomainOnFile.push(slug)
      continue
    }
    for (const row of tdRows) {
      const host = norm(row.domain)
      const onFl = flDomainSet.has(host)
      const verified = flVerifiedSet.has(host)
      if (onFl) {
        cutoversFound.push({ slug, domain: row.domain, verified, currentDbValue: row.vercel_project })
      } else {
        stillStandalone.push({ slug, domain: row.domain, currentDbValue: row.vercel_project })
      }
    }
  }

  if (cutoversFound.length > 0) {
    console.log(`✅ ${cutoversFound.length} domain(s) now LIVE on the FL project (cutover happened since 059) — SQL to paste after review:\n`)
    for (const c of cutoversFound) {
      if (c.currentDbValue === FL_PROJECT) {
        console.log(`   -- ${c.slug} (${c.domain}) already correct in DB, no SQL needed`)
        continue
      }
      const flag = c.verified ? '' : '  -- WARNING: attached but NOT verified on Vercel yet, confirm before running'
      console.log(`   update tenant_domains set vercel_project = '${FL_PROJECT}' where domain = '${c.domain}';${flag}`)
    }
    console.log()
  }

  if (stillStandalone.length > 0) {
    console.log(`⏳ ${stillStandalone.length} domain(s) still NOT on the FL project (standalone project unchanged, no SQL to run):`)
    for (const s of stillStandalone) console.log(`   • ${s.slug}: ${s.domain} (DB currently: ${s.currentDbValue ?? 'NULL'})`)
    console.log()
  }

  if (noDomainOnFile.length > 0) {
    console.log(`⚠️  ${noDomainOnFile.length} slug(s) in UNKNOWN_SLUGS have no tenant_domains row at all (check spelling / tenant exists):`)
    for (const s of noDomainOnFile) console.log(`   • ${s}`)
    console.log()
  }

  console.log('Done. This is a live snapshot, not a cached file — re-run any time to get current state, no stale doc to keep in sync by hand.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
