#!/usr/bin/env node
/**
 * Tenant-config reconcile — read-only drift detector across the FOUR places
 * that currently decide "which domain -> which tenant -> which site":
 *   1. tenants.domain          (resolver checks this FIRST)
 *   2. tenant_domains (active)  (resolver fallback)
 *   3. BESPOKE_SITE_TENANTS in src/middleware.ts (routes slug -> /site/<slug>)
 *   4. src/app/site/<slug>/    (the actual folder that renders)
 *
 * There is no single source of truth today, so these drift and silently
 * mis-route (see the 2026-07-10 outage). This surfaces every disagreement so
 * we can design the authoritative registry around real data. READ-ONLY.
 *
 *   node scripts/reconcile-tenant-config.mjs
 *
 * Needs SUPABASE_ACCESS_TOKEN_FULLLOOP in ~/.env.local (Mgmt API).
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..')
const REF = 'cetnrttgtoajzjacfbhe'

const env = {}
readFileSync(join(process.env.HOME, '.env.local'), 'utf8').split('\n').forEach((l) => {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
})
const TOK = env.SUPABASE_ACCESS_TOKEN_FULLLOOP
if (!TOK) { console.error('missing SUPABASE_ACCESS_TOKEN_FULLLOOP'); process.exit(1) }

async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOK}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const d = await r.json()
  if (!Array.isArray(d)) throw new Error('SQL: ' + JSON.stringify(d).slice(0, 200))
  return d
}

const norm = (d) => (d || '').toLowerCase().replace(/^www\./, '').trim()

// --- Source 3: BESPOKE_SITE_TENANTS from middleware ---
const mw = readFileSync(join(REPO, 'src', 'middleware.ts'), 'utf8')
const block = mw.match(/BESPOKE_SITE_TENANTS\s*=\s*new Set<string>\(\[([\s\S]*?)\]\)/)
const bespokeSet = new Set(block ? [...block[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]) : [])

// --- Source 4: folders ---
const siteDir = join(REPO, 'src', 'app', 'site')
const folders = new Set(readdirSync(siteDir).filter((f) => existsSync(join(siteDir, f))))
const hasHome = (slug) => {
  const d = join(siteDir, slug)
  if (!existsSync(d)) return false
  if (existsSync(join(d, 'page.tsx'))) return true
  return readdirSync(d).some((e) => e.startsWith('(') && e.endsWith(')') && existsSync(join(d, e, 'page.tsx')))
}

const findings = []
const add = (sev, slug, msg) => findings.push({ sev, slug, msg })

const [tenants, tds] = await Promise.all([
  sql("select id, slug, domain, status from tenants where status in ('active','live','setup')"),
  sql('select tenant_id, domain, active, is_primary from tenant_domains'),
])
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

  if (t.domain) claim(t.domain, t.slug, 'tenants.domain')
  activeTd.forEach((r) => claim(r.domain, t.slug, 'tenant_domains'))

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
  // Drift D: folder exists + has a domain but NOT bespoke-routed -> would serve template
  if (!isBespoke && folderOk && (t.domain || activeTd.length)) {
    add('CRIT', t.slug, `has a /site/${t.slug} folder AND a live domain but is NOT in BESPOKE_SITE_TENANTS -> serves the generic template`)
  }
  // Drift E: has a domain, no folder, not obviously template-served
  if (!folderOk && (t.domain || activeTd.length) && t.slug !== 'full-loop-crm' && t.slug !== 'the-va-virtual-assistant') {
    add('INFO', t.slug, `live domain but no bespoke folder (template-served? confirm it's intentional)`)
  }
}

// Drift F: a domain claimed by more than one tenant
for (const [domain, slugs] of domainClaims) {
  const distinct = new Set([...slugs].map((s) => s.split('(')[0]))
  if (distinct.size > 1) add('CRIT', [...distinct].join('+'), `domain ${domain} is claimed by MULTIPLE tenants: ${[...slugs].join(', ')}`)
}

// --- Report ---
const order = { CRIT: 0, WARN: 1, INFO: 2 }
findings.sort((a, b) => order[a.sev] - order[b.sev])
const counts = findings.reduce((c, f) => ((c[f.sev] = (c[f.sev] || 0) + 1), c), {})
console.log(`\nTenant-config reconcile — ${tenants.length} tenants | CRIT:${counts.CRIT || 0} WARN:${counts.WARN || 0} INFO:${counts.INFO || 0}\n`)
for (const f of findings) console.log(`  [${f.sev}] ${f.slug.padEnd(30)} ${f.msg}`)
if (!findings.length) console.log('  no drift — all four sources agree.')
console.log('')
process.exit(counts.CRIT ? 1 : 0)
