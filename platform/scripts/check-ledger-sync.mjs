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
const TAXONOMY_REL_PATH = 'docs/readiness/taxonomy.json'

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

// `git diff --name-only` always returns paths relative to the REPO ROOT, not
// this script's cwd -- even run from platform/, it returns
// 'platform/src/app/...', never 'src/app/...'. Most depends_on_files entries
// are written relative to platform/ (matching LEDGER_GIT_PATH's own prefix
// convention above), so those need the prefix stripped before comparison.
// But some are genuinely repo-root-relative already -- e.g. sec-01/sec-03
// cite '.github/workflows/db-backup.yml' / '.github/workflows/ci.yml',
// which live OUTSIDE platform/ entirely and were never platform/-prefixed to
// begin with. An earlier version of this fix (2026-08-01) only added the
// strip-if-platform-prefixed case and silently dropped every non-platform/
// path instead, confirmed via an independent re-check: those checkpoints
// could still never be flagged stale. Fixed by keeping BOTH the
// prefix-stripped form (for platform/-relative deps) and the raw form (for
// deps that are already repo-root-relative) in the comparison set, so a dep
// written either way can match.
const REPO_PREFIX = 'platform/'
function changedFiles(baseRef) {
  const out = sh('git', ['diff', '--name-only', `${baseRef}...HEAD`])
  const paths = out.split('\n').filter(Boolean)
  const rel = new Set(paths)
  for (const p of paths) {
    if (p.startsWith(REPO_PREFIX)) rel.add(p.slice(REPO_PREFIX.length))
  }
  return rel
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

// depends_on_files lives ONLY in taxonomy.json, never in ledger.json --
// ledger checkpoints are just {id, score, evidence_type, evidence,
// last_verified, last_verified_commit}. This function used to read
// `newCp.depends_on_files` off a LEDGER checkpoint object, which is always
// undefined -- confirmed 2026-08-01 (independent adversarial re-check) that
// this gate has never once fired since the ledger system's inception for
// this reason, entirely separate from (and deeper than) the path-prefix bug
// fixed earlier the same day. taxonomy checkpoints also carry `name`, which
// ledger checkpoints don't -- used below for the stale-report printout,
// which previously printed `undefined`.
function taxonomyIndex(taxonomy) {
  const map = new Map()
  for (const domain of Object.values(taxonomy.domains)) {
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
  const taxonomy = JSON.parse(readFileSync(TAXONOMY_REL_PATH, 'utf8'))
  const taxIndex = taxonomyIndex(taxonomy)

  const oldIndex = checkpointIndex(oldLedger)
  const newIndex = checkpointIndex(newLedger)

  const stale = []
  for (const [id, newCp] of newIndex) {
    const taxCp = taxIndex.get(id)
    const deps = taxCp?.depends_on_files || []
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
      stale.push({ id, name: taxCp?.name || '(unknown)', file: touchedDep })
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
