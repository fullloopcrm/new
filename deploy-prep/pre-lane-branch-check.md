# Pre-Lane Branch State Check — design (Q-W5, FOR-JEFF-REVIEW)

**Status:** PROPOSAL / design only. Nothing applied. `.worker-driver.sh` is **not**
modified by this doc (standing rule: no touching live fleet scripts). This
describes a companion read-only check script and how the leader would use it;
the leader wires it in after Jeff approves.

**Author:** W1, branch `p1-w1`, 2026-07-13.

---

## The gap

Every lane's driver (`.worker-driver.sh`, one instance per worktree, per
`/Users/jefftucker/flwork-p1-w1/.worker-driver.sh` — see its contents for the
exact mechanism) does one `cd "$WT"` at startup and then, on every matched
`LEADER->W<n>:` order, blindly runs:

```bash
OUT=$(claude --model sonnet -p "...cwd=${WT} (git worktree, branch p1-wN)...LEADER order: ${ORDER}" --permission-mode acceptEdits 2>&1)
```

Nothing before that line ever re-checks that `$WT` is still a healthy,
on-branch, uncorrupted git worktree. The prompt *tells* the invoked Claude
instance "cwd=${WT}, branch p1-wN" as a text assertion — it does not verify it.
If the actual worktree state has drifted from that assertion, the invocation
proceeds anyway, on bad information, for the entire order.

Concrete ways a lane's worktree can silently drift out of dispatchable state
between orders, none of which the current dispatch loop would catch:

1. **Detached HEAD** — a manual `git checkout <sha>` (debugging, a botched
   rebase abort, etc.) leaves the worktree off its named branch. Every commit
   the next order makes lands on no branch at all and is one `git checkout
   p1-wN` away from being orphaned/GC'd.
2. **Wrong branch checked out** — same worktree path, different branch (e.g.
   someone ran a git command by hand in the wrong shell). The next order's
   commits land on the wrong branch, corrupting that lane's history relative
   to what the leader believes it owns.
3. **Mid-rebase / mid-merge / mid-cherry-pick / mid-bisect** — an interrupted
   interactive git operation (session killed, laptop slept) leaves
   `.git/rebase-merge`, `.git/rebase-apply`, `MERGE_HEAD`, `CHERRY_PICK_HEAD`,
   or `BISECT_LOG` behind. The next order's git commands (commit, in
   particular) either fail confusingly or — worse — silently complete a stale
   in-progress operation the worker never intended.
4. **Stale `index.lock`** — an invocation that was killed (timeout, crash,
   manual `kill`) mid-git-operation can leave `.git/index.lock` behind. Every
   subsequent git command in that worktree fails with `Unable to create
   '.git/index.lock': File exists` until someone manually removes it. The
   driver has no way to distinguish "worktree is fine" from "permanently
   wedged" — it just keeps dispatching orders that will keep failing the same
   way, burning invocations.
5. **Worktree directory gone or unregistered** — moved, deleted, or `git
   worktree prune`d out from under a still-running driver process. `cd "$WT"`
   in the driver already `exit 1`s in this case *at driver startup*, but a
   worktree that vanishes **after** the driver started (mid-session) is not
   re-checked before the next order.

None of these are hypothetical categories invented for this doc — they are
the standard git-worktree failure modes for a long-lived, unattended,
poll-and-invoke loop; #3/#4 are exactly the state a killed invocation (e.g.
the `invocation-timeout-design.md` hang case, once wired) would tend to leave
behind, which makes this proposal a natural companion to Q-W3.

**Verified live example of unrelated drift this session:** this worktree
(`flwork-p1-w1`) had two untracked files at session start —
`.worker-driver.sh` and `.worker-driver.sh.bak-session4` — that `git status`
does not flag as a problem (they're untracked, not conflicting), but that a
naive "worktree looks clean" assumption would miss entirely. Not a bug by
itself, but it is exactly the class of unremarked drift this check makes
*visible* before a leader dispatches into it, rather than after something
breaks.

## Design

A read-only, no-side-effects check script,
`deploy-prep/pre-lane-branch-check.sh` (this proposal), run by the **leader**
against a lane's worktree immediately before writing a new `LEADER->W<n>:`
order to `LEADER-CHANNEL.md`. It never touches the worktree — it only reads
git state and reports PASS/BLOCK/WARN.

```bash
#!/usr/bin/env bash
# pre-lane-branch-check.sh — verify a lane's worktree is in a dispatchable
# state before the leader sends it a new order. READ-ONLY: no git writes.
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
```

### Leader workflow change

Before appending a new `LEADER->W<n>:` line to `LEADER-CHANNEL.md`, the
leader runs `./pre-lane-branch-check.sh W<n>`:

- **PASS** → dispatch as normal.
- **WARN** → dispatch as normal; the warning is informational (uncommitted
  work mid-batch is expected, not a fault).
- **BLOCK** → **do not dispatch**. Post a diagnostic line instead (e.g.
  `LEADER->JEFF: W<n> worktree BLOCKED — <reason> — needs manual look before
  next order`) and hold that lane's queue until a human (or a separate,
  explicitly-authorized recovery order) resolves it. Dispatching into a
  BLOCK state either wastes the invocation (git commands fail) or — for
  detached-HEAD / wrong-branch — actively corrupts that lane's history.

This is a **leader-side, pre-dispatch gate**, not a driver-side change —
`.worker-driver.sh` itself is untouched. It slots into whatever mechanism the
leader currently uses to compose and send each `LEADER->W<n>:` line (manual,
scripted, or otherwise) as one extra command before that write.

## What this does and does not fix

- **Fixes:** the leader dispatching a new order into a worktree that is
  detached, on the wrong branch, mid-rebase/merge, or wedged behind a stale
  lock — all of which currently fail silently or (worse) corrupt history,
  discovered only after the fact via `reconcile-channel-vs-git.sh` or a
  confused worker report.
- **Does not fix:** a worktree that goes bad **during** an order that already
  passed the check (a race, not this proposal's target — see
  `atomic-queue-claim-design.md`/`atomic-channel-write-design.md` for the
  adjacent claim/write-race problems). Does not fix hung invocations (that's
  `invocation-timeout-design.md`, Q-W3) — though a killed invocation from that
  fix is one of the more likely causes of the stale-lock case this check
  catches on the *next* dispatch.

## Tunables

None needed — the check is a fixed set of git-state predicates, not a
policy with thresholds. The one judgment call is what "BLOCK" should *do*
(hold the queue vs. auto-attempt recovery); this proposal recommends
hold-and-flag, not auto-recovery, since auto-resolving a detached HEAD or an
in-progress rebase requires deciding what to do with whatever state it's in
— exactly the kind of destructive judgment call that should go to a human,
not a script.

## Verification done / not done

- **Ran directly** against all six live lanes as they exist right now
  (read-only, no mutation): all six report `PASS` — each worktree is present,
  on its expected `p1-w<n>` branch, no rebase/merge/lock markers. This
  confirms the script's happy-path logic runs cleanly against the real fleet
  today; it does not confirm the BLOCK branches (no lane is currently in a
  bad state to test against).
- **Not tested:** the actual BLOCK-path detections (detached HEAD, wrong
  branch, mid-rebase, stale lock) were verified by code review against git's
  documented on-disk markers, not by inducing each failure mode against a
  scratch worktree and confirming the script catches it. That's the
  recommended next step before Jeff wires this into the live dispatch loop —
  same caveat pattern as `invocation-timeout-design.md`'s group-kill path.
- **Not wired:** no leader script or `.worker-driver.sh` was modified. This
  is a standalone, invokable-by-hand script today.
- `bash -n` syntax check passes. No `shellcheck` on this host (same gap noted
  in `invocation-timeout-design.md`) — ran the cheapest available check, not
  the thorough one.
- A scratch-repo BLOCK-path test (detached HEAD, wrong branch, stale lock,
  mid-rebase marker, missing worktree dir, each induced in a disposable
  `mktemp -d` repo, never touching a live lane) was planned but the command
  was denied before it ran — so, as stated above, the BLOCK branches remain
  verified by code review against git's documented on-disk markers only, not
  by an executed test. That scratch test is the concrete next step, not a
  hypothetical one.
