#!/usr/bin/env node
/**
 * Tenant-config reconcile — read-only drift detector across the places that
 * decide "which domain -> which tenant -> which site -> which Vercel project":
 *   1. tenants.domain                    (resolver checks this FIRST)
 *   2. tenant_domains (active)           (resolver fallback) — carries the
 *      authoritative routing_mode / status / vercel_project per domain
 *   3. BESPOKE_SITE_TENANTS in src/middleware.ts (routes slug -> /site/<slug>)
 *   4. src/app/site/<slug>/              (the actual folder that renders)
 *
 * There is no single source of truth today, so these drift and silently
 * mis-route (see the 2026-07-10 outage). This surfaces every disagreement so
 * we can design the authoritative registry around real data.
 * READ-ONLY: it issues SELECTs only — never writes.
 *
 *   node scripts/reconcile-tenant-config.mjs
 *
 * The Supabase Management-API token is read from the environment
 * ($SUPABASE_ACCESS_TOKEN_FULLLOOP, e.g. a CI secret) first, then from
 * ~/.env.local for local dev. If it is absent the script SKIPS CLEANLY
 * (exit 0) so it is safe to wire into CI on branches/forks that do not
 * carry the secret.
 *
 * STRUCTURE: the pure drift logic (parseBespokeSet / computeFindings /
 * summarize) is exported so it can be unit-tested without a DB or network.
 * The CLI (token guard, SQL, report, exit) runs ONLY when this file is invoked
 * directly — importing the module does no I/O and never exits.
 */
import { readFileSync, existsSync, readdirSync, realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..')
const REF = 'cetnrttgtoajzjacfbhe'

export const norm = (d) =>
  (d || '')
    .trim()
    .toLowerCase()
    .replace(/^www\./, '')
    .replace(/:\d+$/, '') // strip a port suffix (e.g. example.com:8443) — same real domain
    .replace(/\.+$/, '') // strip trailing dot(s) — absolute-FQDN form (example.com.) is the same domain

// --- Source 3: parse BESPOKE_SITE_TENANTS out of the middleware source ---
export function parseBespokeSet(middlewareSource) {
  const block = middlewareSource.match(/BESPOKE_SITE_TENANTS\s*=\s*new Set<string>\(\[([\s\S]*?)\]\)/)
  return new Set(block ? [...block[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]) : [])
}

// KNOWN-PENDING allowlist for Drift L only. These bespoke-set entries are
// currently unresolvable (no tenants row) but are AWAITING JEFF'S DISPOSITION —
// the orphan question (delete the middleware entry + build-guard slug, or
// re-create the tenant?) is open to Jeff, not yet decided. Until he decides,
// they still SURFACE as CRIT in the report so they stay visible, but they do
// NOT red-gate CI (exit 1) — otherwise every unrelated PR is blocked on a
// disposition that isn't ours to make. Any OTHER unresolvable set entry still
// hard-fails the gate. REMOVE a slug from this set the moment Jeff dispositions
// it (recreate the tenant, or drop it from BESPOKE_SITE_TENANTS + the guard).
export const KNOWN_PENDING_ORPHANS = new Set(['toll-trucks-near-me', 'wash-and-fold-hoboken'])

/**
 * Pure drift computation over already-fetched inputs — no DB, no filesystem of
 * its own (folder existence is injected via hasHome). This is the gate logic.
 *
 * @param {object}   input
 * @param {Array}    input.tenants  rows: { id, slug, domain, status }
 * @param {Array}    input.tds      tenant_domains rows joined to tenants.slug:
 *                                  { tenant_id, domain, active, is_primary,
 *                                    routing_mode, status, vercel_project, slug }
 * @param {Set}      input.bespokeSet  slugs routed bespoke by middleware
 * @param {Function} input.hasHome  (slug) => boolean — does /site/<slug> render a home
 * @param {Set|null} input.resolvableSlugs  slugs that resolve to a tenants row of
 *                                  ANY status. Pass null to SKIP Drift L (the
 *                                  orphan-set check that needs a second query).
 * @returns {Array} findings: { sev, slug, msg, pending? }
 */
export function computeFindings({ tenants, tds, bespokeSet, hasHome, resolvableSlugs = null }) {
  const findings = []
  const add = (sev, slug, msg) => findings.push({ sev, slug, msg })

  const tdByTenant = new Map()
  for (const r of tds) {
    if (!tdByTenant.has(r.tenant_id)) tdByTenant.set(r.tenant_id, [])
    tdByTenant.get(r.tenant_id).push(r)
  }
  // domain -> [tenant slugs] to catch a domain claimed by >1 tenant
  const domainClaims = new Map()
  const claim = (domain, slug, src) => {
    const k = norm(domain)
    if (!k) return
    if (!domainClaims.has(k)) domainClaims.set(k, new Set())
    domainClaims.get(k).add(`${slug}(${src})`)
  }

  for (const t of tenants) {
    const tdRows = tdByTenant.get(t.id) || []
    const activeTd = tdRows.filter((r) => r.active)
    const isBespoke = bespokeSet.has(t.slug)
    const folderOk = hasHome(t.slug)

    // routing_mode is the DB's authoritative INTENT per active domain. What
    // actually renders is decided by middleware (isBespoke) + folder; drift is
    // when that outcome disagrees with the DB's declared routing_mode.
    const modes = new Set(activeTd.map((r) => (r.routing_mode || '').toLowerCase()).filter(Boolean))
    const dbBespoke = modes.has('bespoke')
    const dbTemplate = modes.has('template')

    if (t.domain) claim(t.domain, t.slug, 'tenants.domain')

    // Drift A: tenants.domain set but not mirrored in active tenant_domains
    if (t.domain && !activeTd.some((r) => norm(r.domain) === norm(t.domain))) {
      add('WARN', t.slug, `tenants.domain=${t.domain} has NO matching active tenant_domains row (resolver uses tenants.domain; tenant_domains is out of sync)`)
    }
    // Drift B: active tenant_domains but tenants.domain empty (resolver still works via fallback, but split brain)
    if (!t.domain && activeTd.length) {
      add('INFO', t.slug, `no tenants.domain; relies on tenant_domains fallback (${activeTd.map((r) => r.domain).join(', ')})`)
    }
    // Drift C: bespoke-routed but folder missing (guard should catch; double-check)
    if (isBespoke && !folderOk) add('CRIT', t.slug, `in BESPOKE_SITE_TENANTS but /site/${t.slug} has no homepage`)
    // Drift D: folder exists + has a domain but NOT bespoke-routed -> would serve
    // template. Suppressed when the DB explicitly declares routing_mode=bespoke
    // (that mismatch is the more precise Drift G below, don't double-report).
    if (!isBespoke && !dbBespoke && folderOk && (t.domain || activeTd.length)) {
      add('CRIT', t.slug, `has a /site/${t.slug} folder AND a live domain but is NOT in BESPOKE_SITE_TENANTS -> serves the generic template`)
    }
    // Drift G: DB says routing_mode=bespoke but middleware won't route it that way
    // -> the resolver serves the generic template. This is the exact 2026-07-10
    // silent mis-route class, now caught from the authoritative DB column.
    if (dbBespoke && !isBespoke) {
      add('CRIT', t.slug, `tenant_domains.routing_mode=bespoke but slug NOT in BESPOKE_SITE_TENANTS -> middleware serves the generic template`)
    }
    // Drift H: DB says template but middleware routes to the bespoke folder
    // (stale tenant_domains row, or middleware entry that should be dropped).
    if (dbTemplate && !dbBespoke && isBespoke) {
      add('WARN', t.slug, `tenant_domains.routing_mode=template but slug IS in BESPOKE_SITE_TENANTS -> middleware serves /site/${t.slug}, not the template the DB expects`)
    }
    // Drift I: a tenant's active domains disagree with each other on routing_mode.
    if (dbBespoke && dbTemplate) {
      add('WARN', t.slug, `active tenant_domains rows have MIXED routing_mode (bespoke + template) — ambiguous which site should render`)
    }
    // Drift J: an active domain whose status is not 'active' (enabled but not live).
    activeTd
      .filter((r) => (r.status || '').toLowerCase() !== 'active')
      .forEach((r) => add('WARN', t.slug, `active tenant_domains row ${r.domain} has status='${r.status}' (routing enabled on a non-active domain)`))
    // Drift E: has a domain, no folder, not obviously template-served
    if (!folderOk && (t.domain || activeTd.length) && t.slug !== 'full-loop-crm' && t.slug !== 'the-va-virtual-assistant') {
      add('INFO', t.slug, `live domain but no bespoke folder (template-served? confirm it's intentional)`)
    }
  }

  // Claim source: tenant_domains, scanned across ALL rows (not just ones matched
  // to a tenant present in `tenants`). The tenants query filters to
  // active/live/setup status; a row whose owning tenant was hard-deleted or fell
  // outside that filter (the real query LEFT JOINs, so its slug can be null) is
  // otherwise invisible to Drift F — a stale active=true row then silently
  // squats a domain a live tenant also claims, with no collision ever surfacing.
  for (const r of tds) {
    if (r.active) claim(r.domain, r.slug || `tenant:${(r.tenant_id || '').slice(0, 8)}`, 'tenant_domains')
  }

  // Drift F: a domain claimed by more than one tenant
  for (const [domain, slugs] of domainClaims) {
    const distinct = new Set([...slugs].map((s) => s.split('(')[0]))
    if (distinct.size > 1) add('CRIT', [...distinct].join('+'), `domain ${domain} is claimed by MULTIPLE tenants: ${[...slugs].join(', ')}`)
  }

  // Drift K: any tenant_domains row with no vercel_project set. Warn-only — the
  // domain still routes, but we can't tie it to a Vercel project, which breaks
  // deploy/alias automation and makes cutover verification blind. Swept across
  // EVERY row (not just active ones on active tenants) so nothing is missed.
  for (const r of tds) {
    if (r.vercel_project === null || r.vercel_project === undefined || r.vercel_project === '') {
      const label = r.slug || `tenant:${(r.tenant_id || '').slice(0, 8)}`
      add('WARN', label, `tenant_domains row ${r.domain} has vercel_project=NULL (no Vercel project bound; deploy/alias automation can't target it)`)
    }
  }

  // Drift L: a BESPOKE_SITE_TENANTS entry with NO resolvable tenant. The main
  // loop above only iterates DB tenants, so a middleware set entry that points at
  // nothing (tenant deleted or never created) is invisible to it — the domain
  // falls through to the main site while the build guard still PROTECTs the slug,
  // giving false confidence. Resolvability is checked against tenants of ANY
  // status (not the active filter used above) so a legitimately paused/disabled
  // bespoke tenant is not mis-flagged. Since tenant_domains.tenant_id references
  // tenants, "no tenants row" already implies "no tenant_domains row" for the slug.
  // Skipped entirely when resolvableSlugs is null (caller had nothing to check).
  if (resolvableSlugs !== null && bespokeSet.size) {
    for (const slug of bespokeSet) {
      if (!resolvableSlugs.has(slug)) {
        const pending = KNOWN_PENDING_ORPHANS.has(slug)
        const suffix = pending
          ? ' [KNOWN-PENDING: awaiting Jeff disposition — reported but does NOT gate CI; remove from KNOWN_PENDING_ORPHANS once resolved]'
          : ''
        findings.push({
          sev: 'CRIT',
          slug,
          msg: `in BESPOKE_SITE_TENANTS but has NO resolvable tenant (no tenants row of any status) -> middleware routes nothing; the build guard PROTECTs a phantom slug${suffix}`,
          pending,
        })
      }
    }
  }

  return findings
}

/**
 * Reduce findings to sorted report rows + gate decision. gatingCrit excludes
 * KNOWN-PENDING CRITs (reported, but they do not fail CI).
 */
export function summarize(findings) {
  const order = { CRIT: 0, WARN: 1, INFO: 2 }
  const sorted = [...findings].sort((a, b) => order[a.sev] - order[b.sev])
  const counts = sorted.reduce((c, f) => ((c[f.sev] = (c[f.sev] || 0) + 1), c), {})
  const pendingCrit = sorted.filter((f) => f.sev === 'CRIT' && f.pending).length
  const gatingCrit = (counts.CRIT || 0) - pendingCrit
  return { sorted, counts, pendingCrit, gatingCrit }
}

// --- Token guard: env var (CI) -> ~/.env.local (local) -> null (skip clean) ---
/**
 * @param {{ SUPABASE_ACCESS_TOKEN_FULLLOOP?: string, HOME?: string }} [env]
 */
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

// --- CLI (runs only when invoked directly; import is side-effect-free I/O) ---
async function main() {
  const TOK = loadToken()
  if (!TOK) {
    console.log('reconcile-tenant-config: SUPABASE_ACCESS_TOKEN_FULLLOOP absent — skipping (exit 0).')
    process.exit(0)
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

  // Source 3 + 4 from the working tree.
  const bespokeSet = parseBespokeSet(readFileSync(join(REPO, 'src', 'middleware.ts'), 'utf8'))
  const siteDir = join(REPO, 'src', 'app', 'site')
  const hasHome = (slug) => {
    const d = join(siteDir, slug)
    if (!existsSync(d)) return false
    if (existsSync(join(d, 'page.tsx'))) return true
    return readdirSync(d).some((e) => e.startsWith('(') && e.endsWith(')') && existsSync(join(d, e, 'page.tsx')))
  }

  const [tenants, tds] = await Promise.all([
    sql("select id, slug, domain, status from tenants where status in ('active','live','setup')"),
    sql(
      'select td.tenant_id, td.domain, td.active, td.is_primary, td.routing_mode, td.status, td.vercel_project, t.slug' +
        ' from tenant_domains td left join tenants t on t.id = td.tenant_id',
    ),
  ])

  // Drift L needs a second query: which bespoke slugs resolve to a tenants row.
  let resolvableSlugs = null
  if (bespokeSet.size) {
    const slugList = [...bespokeSet].map((s) => `'${s.replace(/'/g, "''")}'`).join(',')
    const resolvable = await sql(`select slug from tenants where slug in (${slugList})`)
    resolvableSlugs = new Set(resolvable.map((r) => r.slug))
  }

  const findings = computeFindings({ tenants, tds, bespokeSet, hasHome, resolvableSlugs })

  // --- Report ---
  const { sorted, counts, pendingCrit, gatingCrit } = summarize(findings)
  console.log(`\nTenant-config reconcile — ${tenants.length} tenants | CRIT:${counts.CRIT || 0} (gating:${gatingCrit}, known-pending:${pendingCrit}) WARN:${counts.WARN || 0} INFO:${counts.INFO || 0}\n`)
  for (const f of sorted) console.log(`  [${f.sev}] ${f.slug.padEnd(30)} ${f.msg}`)
  if (!sorted.length) console.log('  no drift — all four sources agree.')
  console.log('')
  process.exit(gatingCrit ? 1 : 0)
}

// Run the CLI only when this file is the entrypoint (node scripts/…​.mjs).
// Importing the module (tests) must not touch the network or exit the process.
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
