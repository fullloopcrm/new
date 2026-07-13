#!/bin/bash
# Section-Q pre-flight gate (LEADER-CHANNEL.md 15:07 priority item 5).
#
# A worker or leader marking a Section-Q item "done" is a claim that the
# change is safe. This script is the check that claim must survive: it runs
# tsc, the full vitest suite, and the tenant-isolation gate, and exits
# non-zero if any of them fail. No Section-Q item should be marked complete
# on a run where this script exits non-zero.
#
# Usage: run from the platform/ directory (or pass --dir <path>).
#   ./scripts/section-q-preflight.sh
#
# Exit code: 0 = all three checks passed. 1 = at least one failed (see
# summary at the end for which).

set -u

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR" || { echo "FAIL: cannot cd into $DIR"; exit 1; }

STAMP=$(date +%Y%m%d-%H%M%S)
LOGDIR="/tmp/section-q-preflight-$STAMP"
mkdir -p "$LOGDIR"

run_check() {
  local name="$1"
  local logfile="$2"
  shift 2
  echo "== $name =="
  if "$@" > "$logfile" 2>&1; then
    echo "PASS: $name"
    return 0
  else
    echo "FAIL: $name (log: $logfile)"
    tail -n 20 "$logfile"
    return 1
  fi
}

TSC_OK=0
TEST_OK=0
AUDIT_OK=0

run_check "tsc --noEmit" "$LOGDIR/tsc.log" npx tsc --noEmit || TSC_OK=1
run_check "vitest (full suite)" "$LOGDIR/vitest.log" npx vitest run || TEST_OK=1
run_check "audit:tenant (tenant-isolation gate)" "$LOGDIR/audit-tenant.log" node scripts/audit-tenant-scope.mjs || AUDIT_OK=1

echo
echo "=================== SECTION-Q PRE-FLIGHT SUMMARY ==================="
[ "$TSC_OK" -eq 0 ]   && echo "  tsc --noEmit ............ PASS" || echo "  tsc --noEmit ............ FAIL  ($LOGDIR/tsc.log)"
[ "$TEST_OK" -eq 0 ]  && echo "  vitest run ............... PASS" || echo "  vitest run ............... FAIL ($LOGDIR/vitest.log)"
[ "$AUDIT_OK" -eq 0 ] && echo "  audit:tenant ............. PASS" || echo "  audit:tenant ............. FAIL ($LOGDIR/audit-tenant.log)"
echo "======================================================================="

if [ "$TSC_OK" -eq 0 ] && [ "$TEST_OK" -eq 0 ] && [ "$AUDIT_OK" -eq 0 ]; then
  echo "RESULT: PASS — safe to mark this Section-Q item complete."
  exit 0
else
  echo "RESULT: FAIL — do NOT mark this Section-Q item complete until all three pass."
  exit 1
fi
