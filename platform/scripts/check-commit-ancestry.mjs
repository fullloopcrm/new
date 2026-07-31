#!/usr/bin/env node
/**
 * CI gate: verifies every `last_verified_commit` cited in the ledger is a
 * real ancestor of the commit being checked (HEAD in CI, i.e. the PR's tip).
 *
 * Why this exists: on 2026-07-30, 7 checkpoints (lss-01/02/03/04/06/07,
 * bsr-01) cited commits that only existed on a sibling, unmerged, PR-less
 * branch -- the ledger scored real work that wasn't actually present in the
 * branch/commit the ledger.json itself was committed against. Nothing
 * caught this automatically; it took a manual `git merge-base
 * --is-ancestor` sweep across every cited hash. This script makes that
 * sweep permanent and mechanical, the same way validate-ledger-evidence.mjs
 * makes the evidence-type cap mechanical.
 *
 * A checkpoint with `last_verified_commit: null` is skipped -- not every
 * evidence_type implies a specific commit (live_query/manual_code_read
 * checkpoints often don't name one).
 *
 * Usage: node scripts/check-commit-ancestry.mjs
 * Exit 0 = every cited commit is a real ancestor of HEAD (or doesn't exist
 *          in the repo at all, which is reported as a separate failure).
 * Exit 1 = at least one cited commit exists but is not an ancestor of HEAD,
 *          or doesn't exist in the repo's object database at all.
 */
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const LEDGER_PATH = 'docs/readiness/ledger.json'

function sh(cmd, args) {
  return execFileSync(cmd, args, { encoding: 'utf8' }).trim()
}

function commitExists(sha) {
  try {
    sh('git', ['cat-file', '-e', `${sha}^{commit}`])
    return true
  } catch {
    return false
  }
}

function isAncestorOfHead(sha) {
  try {
    sh('git', ['merge-base', '--is-ancestor', sha, 'HEAD'])
    return true
  } catch {
    return false
  }
}

function main() {
  const ledger = JSON.parse(readFileSync(LEDGER_PATH, 'utf8'))

  // sha -> [{ domainKey, id }]
  const citedBy = new Map()
  for (const [domainKey, domain] of Object.entries(ledger.domains)) {
    for (const cp of domain.checkpoints) {
      if (!cp.last_verified_commit) continue
      const list = citedBy.get(cp.last_verified_commit) || []
      list.push({ domainKey, id: cp.id })
      citedBy.set(cp.last_verified_commit, list)
    }
  }

  if (citedBy.size === 0) {
    console.log('check-commit-ancestry: no checkpoints cite a last_verified_commit -- nothing to check.')
    return
  }

  const missing = []
  const notAncestor = []

  for (const [sha, checkpoints] of citedBy) {
    if (!commitExists(sha)) {
      missing.push({ sha, checkpoints })
      continue
    }
    if (!isAncestorOfHead(sha)) {
      notAncestor.push({ sha, checkpoints })
    }
  }

  if (missing.length > 0 || notAncestor.length > 0) {
    console.error(`\n✗ check-commit-ancestry: ${missing.length + notAncestor.length} cited commit(s) fail\n`)
    for (const m of missing) {
      console.error(`  [${m.sha}] does not exist in this repo's object database`)
      for (const c of m.checkpoints) console.error(`    cited by [${c.domainKey}/${c.id}]`)
    }
    for (const n of notAncestor) {
      console.error(`  [${n.sha}] exists but is NOT an ancestor of HEAD`)
      for (const c of n.checkpoints) console.error(`    cited by [${c.domainKey}/${c.id}]`)
    }
    console.error('\nEither merge the branch that actually contains this commit before scoring against it,')
    console.error('or update the checkpoint to cite a commit that is really on this branch.\n')
    process.exit(1)
  }

  console.log(`check-commit-ancestry: clean -- ${citedBy.size} cited commit(s), all real ancestors of HEAD.`)
}

main()
