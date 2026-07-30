#!/usr/bin/env node
/**
 * Computes the Full Loop readiness score from docs/readiness/taxonomy.json
 * (checkpoint definitions: severity, depends_on_files -- changes require
 * explicit sign-off, see check-taxonomy-signoff.mjs) joined with
 * docs/readiness/ledger.json (the actual scores: score, evidence_type,
 * evidence -- updated freely as re-verification happens).
 *
 * Domain score = severity-weighted average of its numeric checkpoints.
 * Coverage = (real surface-area files referenced by >=1 checkpoint's
 * depends_on_files) / (total real surface-area files), from
 * docs/readiness/surface-inventory.json. One overall number today --
 * per-domain coverage needs each surface item classified into a domain,
 * not done this pass (flagged, not faked).
 *
 * Every run leads with a diff against the last committed ledger.json
 * (via git show HEAD:...) BEFORE the headline numbers, per the hardening
 * rule: regressions surface first, not buried under a good-looking total.
 */
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const TAXONOMY_PATH = join(ROOT, 'docs', 'readiness', 'taxonomy.json')
const LEDGER_PATH = join(ROOT, 'docs', 'readiness', 'ledger.json')
const LEDGER_GIT_PATH = 'platform/docs/readiness/ledger.json'
const INVENTORY_PATH = join(ROOT, 'docs', 'readiness', 'surface-inventory.json')
const SAFE_TO_ONBOARD_DOMAINS = ['security_auth_infra', 'lead_sale_schedule', 'onboarding_activation']

function loadJson(p) { return JSON.parse(readFileSync(p, 'utf8')) }

function joinTaxonomyAndLedger(taxonomy, ledger) {
  const scoreById = new Map()
  for (const domain of Object.values(ledger.domains)) {
    for (const cp of domain.checkpoints) scoreById.set(cp.id, cp)
  }
  const joined = {}
  for (const [key, domain] of Object.entries(taxonomy.domains)) {
    joined[key] = {
      label: domain.label,
      checkpoints: domain.checkpoints.map((def) => ({ ...def, ...(scoreById.get(def.id) || {}) })),
    }
  }
  return joined
}

function domainScore(domain) {
  const numeric = domain.checkpoints.filter((c) => typeof c.score === 'number')
  const notScored = domain.checkpoints.filter((c) => c.score === 'not_scored' || c.score === undefined)
  if (numeric.length === 0) return { score: null, numericCount: 0, notScoredCount: notScored.length }
  const weightSum = numeric.reduce((a, c) => a + c.severity, 0)
  const weighted = numeric.reduce((a, c) => a + c.severity * c.score, 0)
  return { score: weighted / weightSum, numericCount: numeric.length, notScoredCount: notScored.length }
}

function computeScores(joined, weights) {
  let weightedSum = 0
  let weightUsed = 0
  const domainResults = {}
  for (const [key, domain] of Object.entries(joined)) {
    const r = domainScore(domain)
    domainResults[key] = { label: domain.label, weight: weights[key], ...r }
    if (r.score !== null) { weightedSum += weights[key] * r.score; weightUsed += weights[key] }
  }
  return { domainResults, platformScore: weightUsed > 0 ? weightedSum / 100 : null, weightUsed }
}

function computeSafeToOnboard(joined, weights) {
  const subsetTotal = SAFE_TO_ONBOARD_DOMAINS.reduce((a, k) => a + weights[k], 0)
  let weightedSum = 0
  const domainResults = {}
  for (const key of SAFE_TO_ONBOARD_DOMAINS) {
    const r = domainScore(joined[key])
    const nw = (weights[key] / subsetTotal) * 100
    domainResults[key] = { label: joined[key].label, weight: Number(nw.toFixed(1)), ...r }
    if (r.score !== null) weightedSum += nw * r.score
  }
  return { domainResults, score: weightedSum / 100 }
}

function computeCoverage() {
  let inventory
  try { inventory = loadJson(INVENTORY_PATH) } catch { return null }
  const taxonomy = loadJson(TAXONOMY_PATH)
  const allDeps = new Set()
  for (const domain of Object.values(taxonomy.domains)) {
    for (const cp of domain.checkpoints) {
      for (const f of cp.depends_on_files || []) allDeps.add(f)
    }
  }
  const routesCovered = inventory.routes.filter((r) => [...allDeps].some((d) => d.includes(r) || r.includes(d))).length
  const tablesCovered = inventory.tables.filter((t) => [...allDeps].some((d) => d.toLowerCase().includes(t.toLowerCase()))).length
  const totalItems = inventory.routes.length + inventory.tables.length
  const coveredItems = routesCovered + tablesCovered
  return {
    routes_total: inventory.routes.length, routes_covered: routesCovered,
    tables_total: inventory.tables.length, tables_covered: tablesCovered,
    overall_pct: Number(((coveredItems / totalItems) * 100).toFixed(1)),
    note: 'One overall number -- per-domain coverage needs each surface item classified into a domain, not done this pass.',
  }
}

function diffAgainstPrevious() {
  let prevLedger
  try {
    const raw = execFileSync('git', ['show', `HEAD:${LEDGER_GIT_PATH}`], { encoding: 'utf8', cwd: ROOT })
    prevLedger = JSON.parse(raw)
  } catch {
    return { available: false }
  }
  const cur = loadJson(LEDGER_PATH)
  const prevById = new Map()
  for (const d of Object.values(prevLedger.domains)) for (const c of d.checkpoints) prevById.set(c.id, c)
  const curById = new Map()
  for (const d of Object.values(cur.domains)) for (const c of d.checkpoints) curById.set(c.id, c)

  const changed = []
  for (const [id, curCp] of curById) {
    const prevCp = prevById.get(id)
    if (!prevCp) { changed.push({ id, kind: 'new', to: curCp.score }); continue }
    if (prevCp.score !== curCp.score) changed.push({ id, kind: 'score_change', from: prevCp.score, to: curCp.score })
  }
  for (const id of prevById.keys()) if (!curById.has(id)) changed.push({ id, kind: 'removed' })
  return { available: true, changed }
}

function main() {
  const taxonomy = loadJson(TAXONOMY_PATH)
  const ledger = loadJson(LEDGER_PATH)
  const joined = joinTaxonomyAndLedger(taxonomy, ledger)
  const weights = taxonomy.domain_weights
  const asJson = process.argv.includes('--json')

  // ── Diff first, per the hardening rule ──
  const diff = diffAgainstPrevious()
  if (!asJson) {
    console.log('\n=== DIFF vs previously committed ledger (read this before the score) ===')
    if (!diff.available) {
      console.log('No previously committed ledger.json to diff against (or this is the taxonomy/ledger split -- schema changed, diff resumes from here forward).')
    } else if (diff.changed.length === 0) {
      console.log('No checkpoint changes since the last committed ledger.')
    } else {
      for (const c of diff.changed) {
        if (c.kind === 'score_change') console.log(`  [${c.id}] score ${c.from} -> ${c.to}${Math.abs((typeof c.to === 'number' ? c.to : 0) - (typeof c.from === 'number' ? c.from : 0)) >= 15 ? '  ⚠ >=15pt swing' : ''}`)
        else if (c.kind === 'new') console.log(`  [${c.id}] new checkpoint, score ${c.to}`)
        else console.log(`  [${c.id}] removed`)
      }
    }
    console.log('')
  }

  const platformWide = computeScores(joined, weights)
  const safeToOnboard = computeSafeToOnboard(joined, weights)
  const coverage = computeCoverage()

  const output = {
    diff: diff.available ? diff.changed : 'unavailable',
    platform_wide_score: platformWide.platformScore !== null ? Number(platformWide.platformScore.toFixed(1)) : null,
    platform_weight_coverage: platformWide.weightUsed,
    safe_to_onboard_score: Number(safeToOnboard.score.toFixed(1)),
    surface_coverage: coverage,
    domains: platformWide.domainResults,
    safe_to_onboard_domains: safeToOnboard.domainResults,
  }

  if (asJson) { console.log(JSON.stringify(output, null, 2)); return }

  console.log(`Full Loop Readiness -- computed ${new Date().toISOString()}`)
  console.log(`Taxonomy v${taxonomy.version} (approved: ${taxonomy.approved_note})`)
  console.log(`Ledger last updated: ${ledger.last_updated}\n`)

  console.log('Domain breakdown (severity-weighted):')
  for (const [, r] of Object.entries(platformWide.domainResults)) {
    const s = r.score !== null ? r.score.toFixed(1) : 'N/A'
    console.log(`  ${r.label.padEnd(48)} weight ${String(r.weight).padStart(3)}%  score ${s.padStart(5)}  (${r.numericCount} scored, ${r.notScoredCount} not_scored)`)
  }
  console.log(`\nPLATFORM-WIDE SCORE: ${output.platform_wide_score}%`)
  if (coverage) console.log(`SURFACE COVERAGE (overall): ${coverage.overall_pct}%  (routes ${coverage.routes_covered}/${coverage.routes_total}, tables ${coverage.tables_covered}/${coverage.tables_total})`)

  console.log('\nSafe-to-onboard breakdown:')
  for (const [, r] of Object.entries(safeToOnboard.domainResults)) {
    const s = r.score !== null ? r.score.toFixed(1) : 'N/A'
    console.log(`  ${r.label.padEnd(48)} weight ${String(r.weight).padStart(5)}%  score ${s.padStart(5)}`)
  }
  console.log(`\nSAFE-TO-ONBOARD SCORE: ${output.safe_to_onboard_score}%`)

  const allNotScored = Object.values(joined).flatMap((d) => d.checkpoints.filter((c) => c.score === 'not_scored' || c.score === undefined))
  if (allNotScored.length > 0) {
    console.log(`\nNOT SCORED (${allNotScored.length}):`)
    for (const c of allNotScored) console.log(`  - ${c.id}: ${c.name}`)
  }
  console.log('')
}

main()
