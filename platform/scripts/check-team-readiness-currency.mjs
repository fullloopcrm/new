#!/usr/bin/env node
/**
 * Doc-currency gate for docs/TEAM-READINESS.md.
 *
 * WHY THIS EXISTS
 * ----------------
 * TEAM-READINESS.md is a hand-maintained "honest status" doc. Its own
 * preamble says "do not mark anything done until it's verified" — but
 * nothing ever verified the doc ITSELF against reality. Found 2026-07-28:
 * the file claimed "currently ~10 test files" while the repo actually had
 * 841. A claim like that isn't caught by tsc/vitest/the tenant-scope guard
 * — it just silently drifts every time someone adds tests without updating
 * the doc. This script is the backstop: it re-derives the same numbers the
 * doc claims and fails CI if they've drifted past a tolerance.
 *
 * WHAT IT CHECKS
 * --------------
 * 1. Test file count: `find src -name '*.test.ts' -o -name '*.test.tsx'`
 *    vs. the number embedded in the doc's coverage line. Exact match
 *    required — this is a cheap, deterministic count with no reason to
 *    tolerate drift.
 * 2. Statement coverage %: reads coverage/coverage-summary.json (produced
 *    by `vitest run --coverage`, which CI now runs before this script) and
 *    compares its overall `statements.pct` against the % embedded in the
 *    doc, allowing up to COVERAGE_TOLERANCE_PTS percentage points of drift
 *    (coverage moves every time anyone adds/removes a test — a small gap
 *    is normal churn, not staleness; the doc line should still be updated
 *    at least every so often).
 *
 * WHAT IT DOES NOT DO
 * -------------------
 * Does not check every checkbox/claim in the file — only the two numeric
 * claims in the coverage line, which is what actually silently rotted.
 * Extending this to more of the doc is a reasonable follow-up, not scope
 * creep to solve here.
 *
 * USAGE (mirrors preflight-check.mjs's structure — pure logic exported,
 * separately testable; CLI runs only when invoked directly):
 *   node scripts/check-team-readiness-currency.mjs
 * Exit 0 = doc is current within tolerance. Exit 1 = update the doc.
 */
import { readFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..')
const DOC_PATH = join(REPO, 'docs/TEAM-READINESS.md')
const COVERAGE_SUMMARY_PATH = join(REPO, 'coverage/coverage-summary.json')
const COVERAGE_TOLERANCE_PTS = 5

// The doc line this script is the backstop for. Exact format (deliberately
// no "/**" glob suffix on the paths — a literal "**" there would collide
// with the surrounding markdown bold markers and render ambiguously):
//   **Coverage (statements, src/lib + src/app/api, measured YYYY-MM-DD): NN.N%** — NNN test files.
const COVERAGE_LINE_RE = /\*\*Coverage \(statements, src\/lib \+ src\/app\/api, measured (\d{4}-\d{2}-\d{2})\):\s*([\d.]+)%\*\*\s*—\s*(\d+) test files\./

export function countTestFiles(repoRoot) {
  const out = execSync(
    `find src -name '*.test.ts' -o -name '*.test.tsx'`,
    { cwd: join(repoRoot), encoding: 'utf8' },
  )
  return out.split('\n').filter(Boolean).length
}

export function parseDocClaim(docText) {
  const m = docText.match(COVERAGE_LINE_RE)
  if (!m) return null
  return { measuredDate: m[1], statementsPct: Number(m[2]), testFileCount: Number(m[3]) }
}

export function readCoverageSummary(path) {
  if (!existsSync(path)) return null
  const json = JSON.parse(readFileSync(path, 'utf8'))
  const total = json.total
  if (!total?.statements) return null
  return { statementsPct: total.statements.pct }
}

// Pure comparison — no I/O — so it's unit-testable without shelling out or
// touching the filesystem. Returns { ok, problems: string[] }.
export function checkCurrency(opts) {
  const { claim, actualTestFileCount, actualCoveragePct, tolerancePts } = opts
  const problems = []
  if (!claim) {
    problems.push(
      `docs/TEAM-READINESS.md is missing the machine-readable coverage line (expected format: ` +
        `"**Coverage (statements, src/lib/** + src/app/api/**, measured YYYY-MM-DD): NN.N%** — NNN test files.")`,
    )
    return { ok: false, problems }
  }
  if (claim.testFileCount !== actualTestFileCount) {
    problems.push(
      `test file count is stale: doc says ${claim.testFileCount}, repo actually has ${actualTestFileCount}. ` +
        `Update the coverage line in docs/TEAM-READINESS.md.`,
    )
  }
  if (actualCoveragePct != null) {
    const drift = Math.abs(claim.statementsPct - actualCoveragePct)
    if (drift > tolerancePts) {
      problems.push(
        `statement coverage is stale: doc says ${claim.statementsPct}%, actual measured coverage is ` +
          `${actualCoveragePct.toFixed(1)}% (drift ${drift.toFixed(1)}pts > ${tolerancePts}pt tolerance). ` +
          `Re-run 'npm run test:coverage' and update the coverage line in docs/TEAM-READINESS.md.`,
      )
    }
  }
  return { ok: problems.length === 0, problems }
}

async function main() {
  if (!existsSync(DOC_PATH)) {
    console.error(`docs/TEAM-READINESS.md not found at ${DOC_PATH}`)
    process.exit(1)
  }
  const docText = readFileSync(DOC_PATH, 'utf8')
  const claim = parseDocClaim(docText)
  const actualTestFileCount = countTestFiles(REPO)
  const coverage = readCoverageSummary(COVERAGE_SUMMARY_PATH)
  if (!coverage) {
    console.log(
      `[doc-currency] no coverage/coverage-summary.json found — skipping the coverage-%% check ` +
        `(run 'npx vitest run --coverage' first; CI does this before calling this script). ` +
        `Test-file-count check still runs.`,
    )
  }

  const { ok, problems } = checkCurrency({
    claim,
    actualTestFileCount,
    actualCoveragePct: coverage?.statementsPct ?? null,
    tolerancePts: COVERAGE_TOLERANCE_PTS,
  })

  if (!ok) {
    console.error('[doc-currency] docs/TEAM-READINESS.md has drifted from reality:\n')
    for (const p of problems) console.error(`  - ${p}`)
    console.error('')
    process.exit(1)
  }
  console.log('[doc-currency] docs/TEAM-READINESS.md coverage line matches reality (within tolerance).')
  process.exit(0)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
