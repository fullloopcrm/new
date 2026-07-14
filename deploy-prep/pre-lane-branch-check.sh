#!/usr/bin/env bash
# pre-lane-branch-check.sh — verify a lane's worktree is in a dispatchable
# state before the leader sends it a new order. READ-ONLY: no git writes,
# no process signals — the PID-liveness check below only reads a `ps -e`
# snapshot, never sends anything.
# See pre-lane-branch-check.md (Q-W5, FOR-JEFF-REVIEW) for the full design,
# and deploy-prep/q-w5-reconciliation-note.md for why uncommitted tracked
# state is PID-gated between BLOCK and WARN below (merges W1's original
# mid-batch-is-normal reasoning with W6's orphaned-state-should-block finding,
# both independently correct for different situations `git status` alone
# can't tell apart).
#
# Usage: ./pre-lane-branch-check.sh <worker-id, e.g. W1>
# Exit codes: 0 = PASS (dispatch OK), 1 = BLOCK (do not dispatch), 2 = usage/lookup error.
set -uo pipefail

ID="${1:?usage: pre-lane-branch-check.sh W<n>}"
N="${ID#W}"
WT="/Users/jefftucker/flwork-p1-w${N}"
EXPECT_BRANCH="p1-w${N}"

fail() { echo "BLOCK $ID: $*"; exit 1; }
warn() { echo "WARN  $ID: $*"; }

# 1. Worktree present and actually a git worktree.
[ -d "$WT" ] || fail "worktree directory missing: $WT"
git -C "$WT" rev-parse --is-inside-work-tree >/dev/null 2>&1 \
  || fail "not a git worktree (corrupt or unregistered): $WT"

# 2. On the expected branch, not detached.
HEAD_REF=$(git -C "$WT" symbolic-ref -q --short HEAD 2>/dev/null || echo "")
if [ -z "$HEAD_REF" ]; then
  fail "detached HEAD (expected branch $EXPECT_BRANCH) — a commit here lands on no branch"
elif [ "$HEAD_REF" != "$EXPECT_BRANCH" ]; then
  fail "wrong branch checked out: on '$HEAD_REF', expected '$EXPECT_BRANCH'"
fi

# 3. Not mid-rebase/merge/cherry-pick/bisect. Resolve the real git-dir first —
#    a worktree's git-dir is .git/worktrees/<name>, not $WT/.git.
GITDIR=$(git -C "$WT" rev-parse --git-dir 2>/dev/null) || fail "cannot resolve git-dir"
case "$GITDIR" in /*) : ;; *) GITDIR="$WT/$GITDIR" ;; esac
for marker in rebase-merge rebase-apply MERGE_HEAD CHERRY_PICK_HEAD BISECT_LOG; do
  if [ -e "$GITDIR/$marker" ]; then
    fail "in-progress git operation detected ($marker present) — worktree needs manual resolution before dispatch"
  fi
done

# 4. Stale index.lock — a prior invocation likely died mid-git-op.
if [ -e "$GITDIR/index.lock" ]; then
  fail "stale index.lock present — every git command in this worktree will fail until this is removed by a human after confirming no git process is actually running"
fi

# 5. Uncommitted tracked-file modifications: PID-gated BLOCK vs WARN.
#    - A live claude invocation still running for this lane (matched by the
#      unique "autonomous worker <ID>. cwd=<WT>" substring the driver embeds
#      in its -p prompt — see .worker-driver.sh) means the lane is mid-batch;
#      uncommitted state is expected, so WARN only.
#    - No matching process means the last invocation already returned. Any
#      uncommitted TRACKED modification left behind is orphaned — the next
#      order's `git add <files>` risks silently bundling stale, unrelated
#      changes into its own commit. BLOCK until a human looks at it.
#    Untracked-only paths (new scratch files, no tracked-file risk) still
#    only WARN regardless of PID state — nothing for a future `git add
#    <specific-files>` to accidentally sweep in.
TRACKED_DIRTY=$(git -C "$WT" status --porcelain 2>/dev/null | grep -vc '^??' || true)
UNTRACKED=$(git -C "$WT" status --porcelain 2>/dev/null | grep -c '^??' || true)
# NOTE: deliberately `ps -e` + grep -F, not `pgrep -f`. Verified live on this
# host (macOS): `pgrep -f` silently fails to match a process that is an
# ancestor of the pgrep-invoking shell (confirmed: it correctly found 4 other
# lanes' invocations in a live 6-lane test, but missed this lane's own PID
# when this lane checked itself, even though `ps -e`/`ps -p <pid>` show that
# exact PID with that exact command-line substring). `ps -e` does not have
# that blind spot in the same test. Checking a *different* lane (the intended
# real usage — the leader checks a worker it is not a descendant of) is
# unaffected either way; this only matters for the self-check case exercised
# during verification.
PS_SNAPSHOT=$(ps -e -o command= 2>/dev/null)
NEEDLE="autonomous worker ${ID}. cwd=${WT}"
INVOCATION_LIVE=""
case "$PS_SNAPSHOT" in
  *"$NEEDLE"*) INVOCATION_LIVE=1 ;;
esac

if [ "${TRACKED_DIRTY:-0}" != "0" ]; then
  if [ -n "$INVOCATION_LIVE" ]; then
    warn "$TRACKED_DIRTY uncommitted tracked-file change(s) — invocation still running for $ID, normal mid-batch"
  else
    fail "$TRACKED_DIRTY uncommitted tracked-file change(s) with NO live invocation for $ID — orphaned from a finished/crashed run, needs a human look before the next order's git add bundles it in"
  fi
fi
[ "${UNTRACKED:-0}" != "0" ] && warn "$UNTRACKED untracked path(s) — informational, next order's git add targets specific files, not swept in"

echo "PASS  $ID: $WT on $EXPECT_BRANCH, clean git state, dispatch OK"
exit 0
