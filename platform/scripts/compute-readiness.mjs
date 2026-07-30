#!/usr/bin/env node
/**
 * Computes the Full Loop readiness score from docs/readiness/ledger.json.
 *
 * Pure arithmetic, no human judgment, no AI, no prose math. Every checkpoint
 * in the ledger is either a number (0/25/50/75/100) or the string
 * "not_scored". A domain's score is the mean of its numeric checkpoints
 * only -- not_scored checkpoints are excluded from the domain average (not
 * counted as 0, not silently dropped either: reported in the "not scored"
 * section below so the gap stays visible).
 *
 * Platform-wide score = sum(domain_weight * domain_score) using the weights
 * in ledger.meta.domain_weights.
 *
 * "Safe to onboard" score = the same formula restricted to
 * security_auth_infra, lead_sale_schedule, and onboarding_activation,
 * with their three weights re-normalized to sum to 100.
 *
 * Usage: node scripts/compute-readiness.mjs [--json]
 *   --json   emit machine-readable JSON instead of the human report
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LEDGER_PATH = join(__dirname, '..', 'docs', 'readiness', 'ledger.json')
const SAFE_TO_ONBOARD_DOMAINS = ['security_auth_infra', 'lead_sale_schedule', 'onboarding_activation']

function loadLedger() {
  const raw = readFileSync(LEDGER_PATH, 'utf8')
  return JSON.parse(raw)
}

function domainScore(domain) {
  const numeric = domain.checkpoints.filter((c) => typeof c.score === 'number')
  const notScored = domain.checkpoints.filter((c) => c.score === 'not_scored')
  if (numeric.length === 0) {
    return { score: null, numericCount: 0, notScoredCount: notScored.length, notScored }
  }
  const sum = numeric.reduce((acc, c) => acc + c.score, 0)
  return {
    score: sum / numeric.length,
    numericCount: numeric.length,
    notScoredCount: notScored.length,
    notScored,
  }
}

function computePlatformWide(ledger) {
  const weights = ledger.meta.domain_weights
  let weightedSum = 0
  let weightUsed = 0
  const domainResults = {}

  for (const [key, domain] of Object.entries(ledger.domains)) {
    const result = domainScore(domain)
    domainResults[key] = { label: domain.label, weight: weights[key], ...result }
    if (result.score !== null) {
      weightedSum += weights[key] * result.score
      weightUsed += weights[key]
    }
  }

  // If every domain has at least one numeric checkpoint, weightUsed == 100
  // and this is a straight weighted average. If a whole domain were
  // entirely not_scored, weightUsed < 100 and we say so explicitly rather
  // than silently renormalizing (that would hide a domain going dark).
  const platformScore = weightUsed > 0 ? weightedSum / 100 : null

  return { domainResults, platformScore, weightUsed, weightedSum }
}

function computeSafeToOnboard(ledger) {
  const weights = ledger.meta.domain_weights
  const subsetWeightTotal = SAFE_TO_ONBOARD_DOMAINS.reduce((acc, k) => acc + weights[k], 0)
  let weightedSum = 0
  const domainResults = {}

  for (const key of SAFE_TO_ONBOARD_DOMAINS) {
    const domain = ledger.domains[key]
    const result = domainScore(domain)
    const normalizedWeight = (weights[key] / subsetWeightTotal) * 100
    domainResults[key] = { label: domain.label, weight: Number(normalizedWeight.toFixed(1)), ...result }
    if (result.score !== null) {
      weightedSum += normalizedWeight * result.score
    }
  }

  return { domainResults, score: weightedSum / 100 }
}

function main() {
  const ledger = loadLedger()
  const platformWide = computePlatformWide(ledger)
  const safeToOnboard = computeSafeToOnboard(ledger)
  const asJson = process.argv.includes('--json')

  const output = {
    ledger_last_updated: ledger.meta.last_updated,
    platform_wide_score: platformWide.platformScore !== null ? Number(platformWide.platformScore.toFixed(1)) : null,
    platform_weight_coverage: platformWide.weightUsed,
    safe_to_onboard_score: Number(safeToOnboard.score.toFixed(1)),
    domains: platformWide.domainResults,
    safe_to_onboard_domains: safeToOnboard.domainResults,
  }

  if (asJson) {
    console.log(JSON.stringify(output, null, 2))
    return
  }

  console.log(`\nFull Loop Readiness -- computed ${new Date().toISOString()}`)
  console.log(`Ledger last updated: ${ledger.meta.last_updated}\n`)

  console.log('Domain breakdown:')
  for (const [key, r] of Object.entries(platformWide.domainResults)) {
    const scoreStr = r.score !== null ? r.score.toFixed(1) : 'N/A'
    console.log(`  ${r.label.padEnd(45)} weight ${String(r.weight).padStart(3)}%  score ${scoreStr.padStart(5)}  (${r.numericCount} scored, ${r.notScoredCount} not_scored)`)
  }

  console.log(`\nPLATFORM-WIDE SCORE: ${output.platform_wide_score}%`)
  if (platformWide.weightUsed < 100) {
    console.log(`  (weight coverage: ${platformWide.weightUsed}/100 -- a domain has zero numeric checkpoints)`)
  }

  console.log('\nSafe-to-onboard breakdown (Security/Infra, Lead->Sale->Schedule, Onboarding/Activation only):')
  for (const [key, r] of Object.entries(safeToOnboard.domainResults)) {
    const scoreStr = r.score !== null ? r.score.toFixed(1) : 'N/A'
    console.log(`  ${r.label.padEnd(45)} weight ${String(r.weight).padStart(5)}%  score ${scoreStr.padStart(5)}`)
  }
  console.log(`\nSAFE-TO-ONBOARD SCORE: ${output.safe_to_onboard_score}%`)

  const allNotScored = Object.values(ledger.domains).flatMap((d) => d.checkpoints.filter((c) => c.score === 'not_scored'))
  if (allNotScored.length > 0) {
    console.log(`\nNOT SCORED (${allNotScored.length} checkpoints, excluded from averages, not counted as 0):`)
    for (const c of allNotScored) console.log(`  - ${c.id}: ${c.name}`)
  }
  console.log('')
}

main()
