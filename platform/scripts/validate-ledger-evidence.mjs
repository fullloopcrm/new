#!/usr/bin/env node
/**
 * CI gate: mechanically caps score by evidence_type. Not a judgment call --
 * a checkpoint scored above its type's cap fails, period.
 */
import { readFileSync } from 'node:fs'

const LEDGER_PATH = 'docs/readiness/ledger.json'
const CAPS = { live_query: 100, live_http_check: 100, test_run: 90, git_log_diff: 75, manual_code_read: 50, none: 0 }
const VALID_TYPES = new Set(Object.keys(CAPS))

function main() {
  const ledger = JSON.parse(readFileSync(LEDGER_PATH, 'utf8'))
  const failures = []

  for (const [domainKey, domain] of Object.entries(ledger.domains)) {
    for (const cp of domain.checkpoints) {
      if (typeof cp.score !== 'number') continue

      if (!cp.evidence_type || !VALID_TYPES.has(cp.evidence_type)) {
        failures.push({ domainKey, id: cp.id, reason: `missing or invalid evidence_type (got: ${cp.evidence_type})` })
        continue
      }
      const cap = CAPS[cp.evidence_type]
      if (cp.score > cap) {
        failures.push({ domainKey, id: cp.id, reason: `score ${cp.score} exceeds cap ${cap} for evidence_type '${cp.evidence_type}'` })
        continue
      }
      const evidence = typeof cp.evidence === 'string' ? cp.evidence.trim() : ''
      if (cp.score > 25 && evidence.length < 20) {
        failures.push({ domainKey, id: cp.id, reason: 'score above 25 with no substantive evidence text (< 20 chars)' })
      }
    }
  }

  if (failures.length > 0) {
    console.error(`\n✗ validate-ledger-evidence: ${failures.length} checkpoint(s) fail\n`)
    for (const f of failures) console.error(`  [${f.domainKey}/${f.id}] ${f.reason}`)
    console.error('')
    process.exit(1)
  }

  const total = Object.values(ledger.domains).flatMap((d) => d.checkpoints).length
  console.log(`validate-ledger-evidence: clean -- ${total} checkpoints, all scores within their evidence_type cap.`)
}

main()
