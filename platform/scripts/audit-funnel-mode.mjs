#!/usr/bin/env node
/**
 * Funnel-mode audit (F1). provision-tenant.ts's DEFAULT_SELENA_CONFIG never
 * set selena_config.funnel_mode until this branch (see
 * src/lib/industry-presets.ts defaultFunnelMode + src/lib/provision-tenant.ts).
 * Every tenant provisioned before that fix has funnel_mode UNSET in
 * selena_config, which lib/settings.ts silently defaults to 'booking' — wrong
 * for the 23 "project (lead)" verticals (remodeling, roofing, restoration,
 * etc.), which should run 'pipeline' (quote/proposal, not self-serve hourly
 * scheduling). Those tenants' client-facing self-booking widget currently
 * offers hourly timeslots it should not.
 *
 * READ-ONLY: issues a SELECT only — never writes. This audit script finds and
 * lists the affected tenants; it does not backfill them. Backfilling
 * selena_config on live tenant rows is a prod DB write and must be reviewed
 * and run separately after Jeff approves (see the UPDATE template this script
 * prints in its report).
 *
 *   node scripts/audit-funnel-mode.mjs
 *
 * Token guard matches scripts/reconcile-tenant-config.mjs: reads
 * $SUPABASE_ACCESS_TOKEN_FULLLOOP (CI secret) first, then ~/.env.local for
 * local dev. If absent, SKIPS CLEANLY (exit 0) so it's safe to wire into CI
 * on branches/forks that don't carry the secret.
 *
 * STRUCTURE: the pure classification logic (PROJECT_VERTICALS,
 * effectiveFunnelMode, computeFindings) is exported so it can be unit-tested
 * without a DB or network. The CLI (token guard, SQL, report, exit) runs ONLY
 * when this file is invoked directly.
 */
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { realpathSync } from 'node:fs'

const REF = 'cetnrttgtoajzjacfbhe'

// Mirrors PROJECT_VERTICALS in src/lib/industry-presets.ts — the 23 "project
// (lead)" verticals from the IndustryKey union (jobs that run days-to-a-year
// and close via quote/proposal, never a self-served hourly timeslot).
// Duplicated here (plain script, no TS import) — keep in sync with
// industry-presets.ts if that list ever changes.
export const PROJECT_VERTICALS = new Set([
  'landscaping', 'remodeling', 'roofing', 'siding', 'painting', 'flooring',
  'concrete', 'deck', 'fencing', 'demolition', 'drywall', 'epoxy',
  'foundation', 'insulation', 'moving', 'paving', 'windows_doors', 'stucco',
  'solar', 'smart_home', 'accessibility', 'restoration', 'interior_design',
])

/** Mirrors the fallback in src/lib/settings.ts TenantSettings.funnel_mode. */
export function effectiveFunnelMode(selenaConfig) {
  const raw = selenaConfig && typeof selenaConfig === 'object' ? selenaConfig.funnel_mode : undefined
  if (raw === 'pipeline') return 'pipeline'
  if (raw === 'lead_only') return 'lead_only'
  return 'booking'
}

/**
 * @param {Array<{id:string, name:string, industry:string|null, selena_config:object|null}>} tenants
 * @returns {Array<{id:string, name:string, industry:string, funnel_mode:string}>}
 */
export function computeFindings(tenants) {
  return tenants
    .filter((t) => PROJECT_VERTICALS.has(t.industry) && effectiveFunnelMode(t.selena_config) === 'booking')
    .map((t) => ({ id: t.id, name: t.name, industry: t.industry, funnel_mode: effectiveFunnelMode(t.selena_config) }))
}

// --- Token guard: env var (CI) -> ~/.env.local (local) -> null (skip clean) ---
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
    console.log('audit-funnel-mode: SUPABASE_ACCESS_TOKEN_FULLLOOP absent — skipping (exit 0).')
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

  const tenants = await sql(
    "select id, name, industry, selena_config from tenants where status in ('active','live','setup')",
  )

  const findings = computeFindings(tenants)

  console.log(`\nFunnel-mode audit (F1) — ${tenants.length} tenants scanned | ${findings.length} misconfigured\n`)
  for (const f of findings) {
    console.log(`  [CRIT] ${f.id}  ${f.name.padEnd(30)} industry=${f.industry.padEnd(16)} funnel_mode=${f.funnel_mode} (should be 'pipeline')`)
  }
  if (findings.length) {
    console.log(
      '\n  Backfill template (review + run manually after approval — this script never writes):\n' +
        "    update tenants set selena_config = selena_config || '{\"funnel_mode\":\"pipeline\"}'::jsonb\n" +
        `    where id in (${findings.map((f) => `'${f.id}'`).join(', ')});\n`,
    )
  } else {
    console.log('  no drift — every project/lead-vertical tenant already runs the pipeline funnel.')
  }
  console.log('')
  process.exit(0)
}

try {
  if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
    main().catch((e) => {
      console.error(e)
      process.exit(1)
    })
  }
} catch {
  // process.argv[1] not resolvable (e.g. under a test runner) — do nothing.
}
