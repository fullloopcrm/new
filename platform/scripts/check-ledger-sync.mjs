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
// 'platform/src/app/...', never 'src/app/...'. depends_on_files entries are
// written relative to platform/ (matching LEDGER_GIT_PATH's own prefix
// convention above), so every changed path needs that same prefix stripped
// before comparison. Without this, `changed.has(dep)` can never be true --
// confirmed 2026-08-01: this gate silently never caught a single stale
// checkpoint since inception, in this exact repo layout, despite reporting
// "clean" on every run. A file outside platform/ (nothing should be, but
// don't silently mis-map if one ever is) is dropped rather than left
// wrong-prefixed.
const REPO_PREFIX = 'platform/'
function changedFiles(baseRef) {
  const out = sh('git', ['diff', '--name-only', `${baseRef}...HEAD`])
  const rel = out
    .split('\n')
    .filter(Boolean)
    .filter((p) => p.startsWith(REPO_PREFIX))
    .map((p) => p.slice(REPO_PREFIX.length))
  return new Set(rel)
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
