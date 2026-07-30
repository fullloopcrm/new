#!/usr/bin/env node
/**
 * CI gate: docs/readiness/taxonomy.json (checkpoint definitions -- what
 * counts as a checkpoint, its severity, its weight) can only change with an
 * explicit, new sign-off note. Scoring (ledger.json) changes freely; the
 * taxonomy itself is a distinct, visible, approved action, per Jeff's
 * explicit instruction that a single session must not silently redefine
 * what's being measured while also scoring it.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const TAXONOMY_REL = 'docs/readiness/taxonomy.json'
const TAXONOMY_GIT = 'platform/docs/readiness/taxonomy.json'

function sh(cmd, args) { return execFileSync(cmd, args, { encoding: 'utf8' }).trim() }

function resolveBaseRef() {
  const candidate = process.env.GITHUB_BASE_REF || process.env.CI_BASE_REF || 'main'
  const ref = `origin/${candidate}`
  try { sh('git', ['rev-parse', '--verify', ref]); return ref }
  catch { try { sh('git', ['fetch', '--depth=50', 'origin', candidate]); return ref } catch { return null } }
}

function main() {
  const baseRef = resolveBaseRef()
  if (!baseRef) { console.log('check-taxonomy-signoff: could not resolve base ref, skipping.'); return }

  const changed = sh('git', ['diff', '--name-only', `${baseRef}...HEAD`]).split('\n')
  if (!changed.includes(TAXONOMY_REL)) {
    console.log('check-taxonomy-signoff: taxonomy.json not touched -- nothing to check.')
    return
  }

  let oldTaxonomy
  try { oldTaxonomy = JSON.parse(sh('git', ['show', `${baseRef}:${TAXONOMY_GIT}`])) }
  catch { console.log('check-taxonomy-signoff: no taxonomy.json on base ref -- first introduction, ok.'); return }

  const newTaxonomy = JSON.parse(readFileSync(TAXONOMY_REL, 'utf8'))

  if (newTaxonomy.approved_note === oldTaxonomy.approved_note) {
    console.error('\n✗ check-taxonomy-signoff: taxonomy.json changed but approved_note is unchanged.')
    console.error('  Editing the checkpoint taxonomy (what counts as a checkpoint, its severity,')
    console.error('  domain weights) requires a NEW approved_note describing the change and who')
    console.error('  signed off on it -- this is a distinct, visible action from scoring.\n')
    process.exit(1)
  }

  console.log(`check-taxonomy-signoff: clean -- new approval note present: "${newTaxonomy.approved_note}"`)
}

main()
