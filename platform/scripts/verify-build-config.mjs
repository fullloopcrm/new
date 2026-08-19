#!/usr/bin/env node
/**
 * Build-perf-config guard. Fails (exit 1) if a known, previously-measured
 * Vercel build-speed/cost setting silently disappears from the repo.
 *
 * WHY THIS EXISTS
 * ----------------
 * `typescript.ignoreBuildErrors: true` in next.config.ts was added
 * 2026-07-23 (commit 90c6325f9) after measuring that the in-build TypeScript
 * check alone cost ~1m55s of a ~3min total build — safe to skip because
 * .github/workflows/ci.yml already runs `tsc --noEmit` as a separate,
 * blocking gate on every push/PR. Sometime between then and 2026-08-17 this
 * setting silently disappeared (not via a reverting commit anyone
 * remembered — nobody noticed until Vercel bills spiked and builds crept
 * from ~1min back up to 8-9min), and a session on 2026-08-17 re-added the
 * exact same fix without realizing it was a repeat. That is exactly the
 * kind of regression this script exists to catch before it costs another
 * three weeks of inflated build minutes.
 *
 * It runs automatically as part of the npm `prebuild` step (see
 * package.json), so `next build` — and therefore every Vercel deploy — will
 * not proceed while a known perf-critical setting has regressed.
 *
 *   node scripts/verify-build-config.mjs
 *
 * TO ADD A NEW GUARDED SETTING: add an entry to CHECKS below with a plain
 * substring or regex this file must contain, and a short WHY so the next
 * person (or Claude) understands what broke and why it mattered.
 */
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..')

const CHECKS = [
  {
    file: 'next.config.ts',
    check: (content) => /ignoreBuildErrors\s*:\s*true/.test(content),
    why:
      "typescript.ignoreBuildErrors: true is missing from next.config.ts. " +
      "This duplicates CI's tsc --noEmit gate inside the Vercel build itself, " +
      "which measured at ~1m55s of a ~3min build (2026-07-23 audit, commit " +
      "90c6325f9) and is most of why builds crept back up to 8-9min when it " +
      "went missing. Re-add: typescript: { ignoreBuildErrors: true } to the " +
      "next.config.ts NextConfig object.",
  },
  {
    file: 'vercel.json',
    // Checks the protective invariants, not an exact string match: the
    // command must still gate production behind [deploy], and gate
    // non-production, non-PR pushes behind an explicit tag. The exact shell
    // logic implementing this legitimately changed once already (2026-08-17
    // -> 2026-08-18, "$VERCEL_ENV" != vs = "production") without losing the
    // protection — a brittle exact-string check would have false-positived
    // on that refactor, which is exactly the kind of noise that makes people
    // stop trusting a guard. Checking the concepts, not the syntax.
    check: (content) =>
      /ignoreCommand/.test(content) &&
      /VERCEL_GIT_PULL_REQUEST_ID/.test(content) &&
      // Backslash count before the brackets varies with shell/JSON escaping
      // layers (already changed once between 08-17 and 08-18) -- tolerate
      // any amount rather than hand-encoding an exact count that's fragile
      // to re-break on the next legitimate escaping refactor.
      /\\*\[deploy\\*\]/.test(content),
    why:
      "vercel.json's ignoreCommand no longer gates non-production builds. " +
      "Without this, every push to every branch (including throwaway " +
      "worktree branches) triggers a full 7-13min preview build — this was " +
      "the single largest driver of the 2026-08-17 $708 Vercel overage " +
      "(~100+ deploys/week). Preview builds should only run for an actual " +
      "open PR or an explicit [deploy]/[preview] tag in the commit message.",
  },
]

const violations = []

for (const check of CHECKS) {
  const path = join(REPO, check.file)
  if (!existsSync(path)) {
    violations.push(`${check.file} not found at all — cannot verify build config. ${check.why}`)
    continue
  }
  const content = readFileSync(path, 'utf8')
  if (!check.check(content)) {
    violations.push(`${check.file}: ${check.why}`)
  }
}

if (violations.length > 0) {
  console.error('\n❌  BUILD-CONFIG GUARD FAILED — a known deploy-speed/cost fix has regressed:\n')
  for (const v of violations) console.error(`   • ${v}\n`)
  console.error('   Build blocked. Restore the setting(s) above before deploying.\n')
  process.exit(1)
}

console.log(`✅  build-config guard: ${CHECKS.length} known perf setting(s) present`)
