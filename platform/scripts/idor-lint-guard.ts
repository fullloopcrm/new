#!/usr/bin/env -S npx tsx
/**
 * IDOR route guard — standalone runnable check (PROTOTYPE, reporting-only).
 *
 * CLI companion to src/lib/idor-route-guard.ts (the analyzer) and
 * src/lib/idor-route-guard.test.ts (the vitest ratchet that already rides CI).
 * This script exists so the guard can also run as a plain `node`/`tsx`
 * invocation — the same shape as scripts/audit-tenant-scope.mjs — for local
 * use and for the sample (non-blocking) CI job proposed in
 * deploy-prep/idor-lint-guard.sample.yml.
 *
 * Scans every src/app/**\/route.ts for a tenant-owned table read/written by
 * `id` through the service_role client with no sibling `.eq('tenant_id', …)`.
 * See deploy-prep/idor-lint-guard-spec.md for the full heuristic, the
 * precision/recall envelope, and why this is reporting-only rather than a
 * blocking gate today.
 *
 *   npx tsx scripts/idor-lint-guard.ts                  # report, exit 1 on NEW offenders
 *   npx tsx scripts/idor-lint-guard.ts --update-baseline # accept current findings
 *
 * This script does NOT get wired into .github/workflows by itself — that is
 * a workflow edit, which is Jeff-gated. See the spec's "graduation path".
 */
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync, realpathSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { analyzeSource } from '../src/lib/idor-route-guard'

export const API_ROOT = join(process.cwd(), 'src', 'app', 'api')
export const BASELINE_PATH = join(process.cwd(), 'src', 'lib', 'idor-route-guard.baseline.json')

export function walkRoutes(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walkRoutes(full))
    else if (entry === 'route.ts') out.push(full)
  }
  return out
}

// Signatures are relative to process.cwd() by design (matches how the
// committed baseline.json was generated and how CI's cwd lines up with a
// local run) — callers scanning a different root should pass a relativeTo.
export function collectCurrentSignatures(apiRoot: string, relativeTo: string = process.cwd()): string[] {
  const findings = walkRoutes(apiRoot).flatMap((f) =>
    analyzeSource({ file: relative(relativeTo, f), source: readFileSync(f, 'utf8') }),
  )
  return Array.from(new Set(findings.map((f) => `${f.file}::${f.table}`))).sort()
}

// A missing baseline file (fresh clone before the first `--update-baseline`
// run, or the committed baseline.json accidentally not checked out) is
// treated as an EMPTY baseline, not a crash — every current signature then
// reports as "new". This is a deliberate fail-open-to-reporting (not
// fail-silent) choice: the script still exits 1 and lists every candidate
// rather than silently passing with nothing to compare against.
export function loadBaseline(baselinePath: string): string[] {
  return existsSync(baselinePath) ? JSON.parse(readFileSync(baselinePath, 'utf8')) : []
}

export function diffAgainstBaseline(current: string[], baseline: string[]): string[] {
  const baselineSet = new Set(baseline)
  return current.filter((s) => !baselineSet.has(s))
}

export function main(): void {
  const updateBaseline = process.argv.includes('--update-baseline')
  const current = collectCurrentSignatures(API_ROOT)

  if (updateBaseline) {
    writeFileSync(BASELINE_PATH, JSON.stringify(current, null, 2) + '\n')
    console.log(`baseline updated: ${current.length} candidate signatures written to ${BASELINE_PATH}`)
    process.exit(0)
  }

  const fresh = diffAgainstBaseline(current, loadBaseline(BASELINE_PATH))

  if (fresh.length === 0) {
    console.log(`✓ idor-lint-guard: no NEW by-id-without-tenant_id chains (${current.length} known/baselined candidates)`)
    process.exit(0)
  }

  console.error(`✗ idor-lint-guard: ${fresh.length} NEW unscoped by-id chain${fresh.length === 1 ? '' : 's'} on tenant-owned tables\n`)
  for (const sig of fresh) console.error(`  ${sig}`)
  console.error(
    "\nAdd .eq('tenant_id', tenantId) (or use tenantDb(tenantId).from(...)); or, if the " +
      'table is genuinely cross-tenant by design, add it to CROSS_TENANT_TABLES in ' +
      "src/lib/idor-route-guard.ts with a justification; or run with --update-baseline " +
      'to accept (only for confirmed-safe findings).',
  )
  process.exit(1)
}

// Run the CLI only when this file is the entrypoint (npx tsx scripts/…​.ts).
// Importing the module (tests) must not touch stdout/exit codes.
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  main()
}
