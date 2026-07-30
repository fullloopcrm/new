#!/usr/bin/env node
/**
 * CI gate: fails the build if a PR touches any file a ledger checkpoint
 * lists in `depends_on_files` without that SAME checkpoint's JSON entry
 * also changing in docs/readiness/ledger.json.
 *
 * "That checkpoint's entry changed" is checked precisely, not just
 * "the ledger file changed somewhere" -- the old and new versions of each
 * checkpoint object (by id) are compared directly, so editing an unrelated
 * checkpoint doesn't satisfy the requirement for a different one.
 *
 * Base ref resolution (in order): $GITHUB_BASE_REF (PR builds), then
 * $CI_BASE_REF, then falls back to 'main'. Always prefixed with 'origin/'
 * and fetched shallow if missing, so this works in a fresh CI checkout.
 *
 * Usage: node scripts/check-ledger-sync.mjs
 * Exit 0 = clean. Exit 1 = at least one checkpoint is stale (printed).
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const LEDGER_REL_PATH = 'docs/readiness/ledger.json' // relative to platform/ (this script's cwd in CI)
const LEDGER_GIT_PATH = 'platform/docs/readiness/ledger.json' // relative to repo root (for git show)

function sh(cmd, args) {
  return execFileSync(cmd, args, { encoding: 'utf8' }).trim()
}

function resolveBaseRef() {
  const candidate = process.env.GITHUB_BASE_REF || process.env.CI_BASE_REF || 'main'
  const ref = `origin/${candidate}`
  try {
    sh('git', ['rev-parse', '--verify', ref])
    return ref
  } catch {
    // Shallow CI checkouts may not have origin/<branch> fetched yet.
    try {
      sh('git', ['fetch', '--depth=50', 'origin', candidate])
      return ref
    } catch (err) {
      console.error(`check-ledger-sync: could not resolve base ref '${ref}': ${err.message}`)
      process.exit(1)
    }
  }
}

function changedFiles(baseRef) {
  const out = sh('git', ['diff', '--name-only', `${baseRef}...HEAD`])
  return new Set(out.split('\n').filter(Boolean))
}

function loadLedgerAt(ref) {
  if (ref === 'WORKTREE') {
    return JSON.parse(readFileSync(LEDGER_REL_PATH, 'utf8'))
  }
  const raw = sh('git', ['show', `${ref}:${LEDGER_GIT_PATH}`])
  return JSON.parse(raw)
}

function checkpointIndex(ledger) {
  const map = new Map()
  for (const domain of Object.values(ledger.domains)) {
    for (const cp of domain.checkpoints) map.set(cp.id, cp)
  }
  return map
}

function main() {
  const baseRef = resolveBaseRef()
  const changed = changedFiles(baseRef)

  if (changed.size === 0) {
    console.log('check-ledger-sync: no files changed vs base -- nothing to check.')
    return
  }

  let oldLedger
  try {
    oldLedger = loadLedgerAt(baseRef)
  } catch {
    console.log('check-ledger-sync: no ledger.json on base ref yet -- first introduction, skipping sync check.')
    return
  }
  const newLedger = loadLedgerAt('WORKTREE')

  const oldIndex = checkpointIndex(oldLedger)
  const newIndex = checkpointIndex(newLedger)

  const stale = []
  for (const [id, newCp] of newIndex) {
    const deps = newCp.depends_on_files || []
    // A dependency path is written relative to `platform/` (this script's
    // own cwd) except when it's an absolute home-dir path (operational
    // scripts under ~/.claude, checked as informational only -- CI can't
    // see outside the repo checkout, so those never block CI, only local
    // review).
    const repoRelDeps = deps.filter((d) => !d.startsWith('~'))
    const touchedDep = repoRelDeps.find((d) => changed.has(d))
    if (!touchedDep) continue

    const oldCp = oldIndex.get(id)
    const unchanged = oldCp && JSON.stringify(oldCp) === JSON.stringify(newCp)
    if (unchanged) {
      stale.push({ id, name: newCp.name, file: touchedDep })
    }
  }

  if (stale.length > 0) {
    console.error('\n✗ check-ledger-sync: dependent file(s) changed without updating the checkpoint\n')
    for (const s of stale) {
      console.error(`  [${s.id}] ${s.name}`)
      console.error(`    depends on ${s.file}, which changed in this PR`)
      console.error(`    but this checkpoint's entry in docs/readiness/ledger.json did not.`)
    }
    console.error('\nUpdate the checkpoint(s) above (score, evidence, last_verified, last_verified_commit)')
    console.error('in docs/readiness/ledger.json in this same PR, or this check will keep failing.\n')
    process.exit(1)
  }

  console.log(`check-ledger-sync: clean -- ${changed.size} file(s) changed, no stale checkpoints.`)
}

main()
