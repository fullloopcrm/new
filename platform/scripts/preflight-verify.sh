#!/usr/bin/env bash
#
# Section-Q completion gate: tsc + vitest + tenant-scope audit must ALL pass
# before any worker or leader marks a Section-Q item complete.
#
#   ./scripts/preflight-verify.sh     (from platform/)
#   npm run preflight                 (from platform/)
#
# Why this exists: reports of "done"/"complete" on Section-Q items have so far
# relied on each worker remembering to run tsc/vitest/audit by hand and pasting
# real output. This is that same check as one command with a single pass/fail
# verdict, so "complete" always maps to one check that could have failed and
# didn't.
#
# Exits 0 only if every step passes. On failure, prints which step(s) failed
# and the tail of their output, then exits 1.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

ALL_PASS=1
STEP_LOG=$(mktemp)

run_step() {
  local name="$1"
  shift
  echo "── ${name} ──"
  if "$@" >"$STEP_LOG" 2>&1; then
    echo "✓ ${name} PASS"
  else
    echo "✗ ${name} FAIL"
    tail -40 "$STEP_LOG"
    ALL_PASS=0
  fi
  echo
}

run_step "tsc --noEmit"  npx tsc --noEmit
run_step "vitest run"    npm run test --silent
run_step "audit:tenant"  npm run audit:tenant --silent

rm -f "$STEP_LOG"

if [ "$ALL_PASS" -eq 1 ]; then
  echo "PRE-FLIGHT: ALL CHECKS PASS -- safe to mark this Section-Q item complete"
  exit 0
else
  echo "PRE-FLIGHT: FAILED -- do NOT mark this Section-Q item complete until green"
  exit 1
fi
