#!/usr/bin/env bash
# pre-lane-branch-check.sh — verify a lane's worktree is in a dispatchable
# state before the leader sends it a new order. READ-ONLY: no git writes.
# See pre-lane-branch-check.md (Q-W5, FOR-JEFF-REVIEW) for the full design.
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

# 5. Informational only, never blocks: uncommitted work is NORMAL for a lane
#    mid-batch. Just surface the shape so the leader isn't dispatching blind.
DIRTY=$(git -C "$WT" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
[ "$DIRTY" != "0" ] && warn "$DIRTY uncommitted/untracked path(s) — normal mid-batch, not a block"

echo "PASS  $ID: $WT on $EXPECT_BRANCH, clean git state, dispatch OK"
exit 0
