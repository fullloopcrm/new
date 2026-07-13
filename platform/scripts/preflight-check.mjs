#!/usr/bin/env node
/**
 * Section-Q "done" pre-flight. Fails (exit 1) unless typecheck, the full unit
 * suite, and the tenant-isolation gate all pass.
 *
 * WHY THIS EXISTS
 * ---------------
 * Fleet workers self-report DONE in LEADER-CHANNEL.md after running some
 * ad-hoc subset of tsc/vitest/audit locally (see 15:07 LEADER->ALL, item 5).
 * There has been no single command that runs the same gate CI runs, so
 * "DONE" reports vary in what was actually verified. This script is that
 * single command — run it, read PASS/FAIL, then report.
 *
 * Mirrors the `verify` job in .github/workflows/ci.yml minus install/lint
 * (lint is style, not a correctness gate; this script is for fast local use).
 * audit-funnel-mode is included but token-gated: it prints "skipping" and
 * exits 0 when SUPABASE_ACCESS_TOKEN_FULLLOOP is absent, same as CI/local
 * dev without prod credentials — that is not a preflight failure.
 *
 *   node scripts/preflight-check.mjs
 *
 * Exit 0 = safe to report DONE. Exit 1 = do not report DONE; see which step
 * failed above the summary table.
 *
 * STRUCTURE: summarize() is pure (no I/O) and exported so the PASS/FAIL/exit
 * logic is unit-testable without actually spawning tsc/vitest. The CLI
 * (spawning STEPS, printing, exiting) runs ONLY when this file is invoked
 * directly.
 */
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..')

export const STEPS = [
  { name: 'typecheck (tsc --noEmit)', cmd: 'npx', args: ['tsc', '--noEmit', '--pretty', 'false'], required: true },
  { name: 'unit tests (vitest)', cmd: 'npx', args: ['vitest', 'run'], required: true },
  { name: 'tenant-isolation gate', cmd: 'node', args: ['scripts/audit-tenant-scope.mjs'], required: true },
  { name: 'funnel-mode audit', cmd: 'node', args: ['scripts/audit-funnel-mode.mjs'], required: false },
]

// Pure: given [{name, required, passed}], returns the summary lines and
// whether any required step failed. No process/spawn access.
export function summarize(results) {
  const lines = []
  let hardFailure = false
  for (const r of results) {
    const label = r.passed ? 'PASS' : r.required ? 'FAIL' : 'SKIP/FAIL (non-blocking)'
    lines.push(`  [${label}] ${r.name}`)
    if (!r.passed && r.required) hardFailure = true
  }
  return { lines, hardFailure }
}

async function main() {
  const results = []
  for (const step of STEPS) {
    process.stdout.write(`\n=== ${step.name} ===\n`)
    const res = spawnSync(step.cmd, step.args, { cwd: REPO, stdio: 'inherit' })
    results.push({ ...step, passed: res.status === 0 })
  }

  const { lines, hardFailure } = summarize(results)
  process.stdout.write('\n=== preflight summary ===\n')
  process.stdout.write(lines.join('\n') + '\n')

  if (hardFailure) {
    process.stdout.write('\npreflight: FAILED — do not report Section-Q item DONE.\n')
    process.exit(1)
  }
  process.stdout.write('\npreflight: PASSED — required gates green.\n')
  process.exit(0)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
