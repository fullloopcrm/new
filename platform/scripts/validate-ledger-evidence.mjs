#!/usr/bin/env node
/**
 * CI gate: fails the build if any checkpoint in docs/readiness/ledger.json
 * scores above 25 without a real evidence field.
 *
 * "Real evidence" is checked mechanically, not judged by prose quality:
 *   1. evidence must exist, be a string, and be at least MIN_LENGTH chars
 *      (rules out placeholders like "done" or "yes").
 *   2. evidence must not consist ONLY of banned low-content phrases
 *      ("tbd", "trust me", "should work", "probably fine", "n/a").
 *   3. evidence must contain at least one CONCRETE marker: a commit SHA
 *      (7-40 hex chars), a file path (contains '/' and a plausible
 *      extension or a known repo-root dir), the word "test" near a
 *      filename-shaped token, or one of the recognized verification-verb
 *      markers (live query, git log, curl, psql, verified, confirmed via).
 *
 * This does not prove the evidence is TRUE — a human/AI reviewing the PR
 * still has to judge that. It only proves something concrete was written,
 * not a confident-sounding placeholder. That's the actual, achievable job
 * of a mechanical gate.
 *
 * Usage: node scripts/validate-ledger-evidence.mjs
 */
import { readFileSync } from 'node:fs'

const LEDGER_PATH = 'docs/readiness/ledger.json'
const MIN_LENGTH = 20
const BANNED_PHRASES = ['tbd', 'trust me', 'should work', 'probably fine', 'n/a', 'looks good', 'seems fine']
const SHA_RE = /\b[0-9a-f]{7,40}\b/i
const FILE_PATH_RE = /[\w.-]+\/[\w./-]+\.\w{1,10}\b/
const VERIFICATION_VERB_RE = /\b(live query|git log|curl|psql|verified|confirmed via|test(s)? pass(ing|ed)?|read live|exercised live)\b/i

function isConcrete(evidence) {
  return SHA_RE.test(evidence) || FILE_PATH_RE.test(evidence) || VERIFICATION_VERB_RE.test(evidence)
}

function main() {
  const ledger = JSON.parse(readFileSync(LEDGER_PATH, 'utf8'))
  const failures = []

  for (const [domainKey, domain] of Object.entries(ledger.domains)) {
    for (const cp of domain.checkpoints) {
      if (typeof cp.score !== 'number' || cp.score <= 25) continue

      const evidence = typeof cp.evidence === 'string' ? cp.evidence.trim() : ''
      const lower = evidence.toLowerCase()

      if (evidence.length < MIN_LENGTH) {
        failures.push({ domainKey, id: cp.id, name: cp.name, reason: `evidence too short (${evidence.length} chars, need >= ${MIN_LENGTH})` })
        continue
      }
      if (BANNED_PHRASES.some((p) => lower === p || lower.includes(p))) {
        failures.push({ domainKey, id: cp.id, name: cp.name, reason: 'evidence is a known low-content placeholder phrase' })
        continue
      }
      if (!isConcrete(evidence)) {
        failures.push({ domainKey, id: cp.id, name: cp.name, reason: 'evidence has no concrete marker (no commit SHA, file path, or verification verb found)' })
      }
    }
  }

  if (failures.length > 0) {
    console.error(`\n✗ validate-ledger-evidence: ${failures.length} checkpoint(s) scored above 25 with insufficient evidence\n`)
    for (const f of failures) {
      console.error(`  [${f.domainKey}/${f.id}] ${f.name}`)
      console.error(`    ${f.reason}`)
    }
    console.error('\nA checkpoint above 25 needs a commit SHA, a file:line, a live query result, or a')
    console.error('named test that was actually run -- not a confident sentence with nothing to check.\n')
    process.exit(1)
  }

  const total = Object.values(ledger.domains).flatMap((d) => d.checkpoints).length
  const above25 = Object.values(ledger.domains).flatMap((d) => d.checkpoints).filter((c) => typeof c.score === 'number' && c.score > 25).length
  console.log(`validate-ledger-evidence: clean -- ${above25}/${total} checkpoints score above 25, all have concrete evidence.`)
}

main()
