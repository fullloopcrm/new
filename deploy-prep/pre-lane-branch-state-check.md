# Pre-Lane Branch/Worktree State Check — Design (FOR-JEFF-REVIEW, DOCS ONLY)

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-13
**Status:** design proposal only. No live script touched, no `.worker-driver.sh` hot-swapped, nothing wired.

**Problem statement (MASTER-TODO-LIST.md §Section Q, THIS WEEK tier):**
`Q-W5 pre-lane branch state check (verify worktree/branch clean before dispatching)`.

---

## 0. This is not a hypothetical — it's happening right now, fleet-wide

Before writing this design, I checked `git status --short` + `git branch --show-current` across all six
worktrees the fleet currently drives (read-only, no changes made to any of them):

| Lane | Branch correct? | Uncommitted state right now |
|---|---|---|
| p1-w1 | yes | 2 untracked driver files (`.worker-driver.sh`, `.bak-session4`) — harmless, gitignored-candidate |
| p1-w2 | yes | same 2 untracked driver files + 2 untracked new `deploy-prep/*.md` (not yet committed) |
| p1-w3 | yes | same 2 untracked driver files **+ 2 tracked files with uncommitted MODIFICATIONS** (`attribution/manual/route.ts`, `client/reschedule/[id]/route.ts`) |
| p1-w4 | yes | same 2 untracked driver files **+ 2 tracked files with uncommitted MODIFICATIONS** (`client/book/route.ts`, `client/properties/route.ts`) + 1 untracked doc |
| p1-w5 | yes | same 2 untracked driver files **+ 3 tracked files with uncommitted MODIFICATIONS** (`portal/connect/route.ts`, `portal/connect/unread/route.ts`, `team-portal/notifications/route.ts`) |
| p1-w6 (this lane) | yes | same 2 untracked driver files only |

None of this is touched or fixed by this doc — other lanes' in-flight work is theirs to commit or discard,
and reading it here is read-only `git status`, not a modification. But it is the concrete evidence Q-W5
names in the abstract: **three of six lanes currently have tracked-file modifications sitting uncommitted**,
and the leader/dispatcher has zero visibility into that unless someone manually runs `git status` per
worktree, which nothing currently does automatically. If the leader dispatched a new order to p1-w3 right
now, that worker's next `git add <path>` + commit could silently bundle those 2 pre-existing modified files
in with whatever it's about to change, if the new task happens to touch either of the same 2 files — or,
just as likely, the worker could start editing a 3rd file, finish, and commit only that 3rd file, leaving
the 2 stray modifications uncommitted indefinitely across many more dispatch cycles, invisible to
`LEADER-CHANNEL.md` the whole time.

---

## 1. What "clean" should mean before a dispatch

A pre-dispatch check is a read-only gate the **leader** (or `.worker-driver.sh` itself, see §3) runs against
a worktree immediately before sending it a new `LEADER->W<n>:` order. It should answer four questions, each
independently:

1. **Right branch?** `git -C "$WT" branch --show-current` equals the lane's assigned branch
   (`p1-w1`..`p1-w6`). A worktree accidentally left on `main` or detached HEAD must block dispatch — that's
   the one failure mode standing rules explicitly forbid (`work ONLY in this worktree` / `never push to
   main`), and a stray `checkout` from a prior debugging session would otherwise go unnoticed until commit
   time.
2. **No unexpected tracked-file modifications carried over from a previous invocation.** `git -C "$WT"
   diff --name-only HEAD` non-empty means the previous invocation edited files but never committed them —
   either it crashed, hit a tool-permission denial mid-task, or the session ended before its own commit
   step ran. This is the highest-value check: it is the one that actually fired against 3 of 6 lanes above.
3. **No unmerged/conflict state.** `git -C "$WT" status --short | grep -q '^UU\|^AA\|^DD'` — a worktree left
   mid-conflict (e.g. from a `git pull`/rebase a human ran by hand against a lane worktree) should never
   receive a new automated order; the next invocation's edits would land on top of unresolved markers.
4. **Not behind/ahead in a way that indicates a stale clone.** `git -C "$WT" rev-parse HEAD` compared to
   what the leader last recorded for that lane in its own bookkeeping (or simply: has anything changed HEAD
   since last dispatch that wasn't this fleet's own commits?) — catches the "human force-pushed or rebased
   this worktree out from under the fleet" case. Lower priority than #1–#3; flagged for completeness, not
   because it was observed today.

Untracked files that are **known driver artifacts** (`.worker-driver.sh`, `.worker-driver.sh.bak*`,
`node_modules/`) should NOT block dispatch — they're expected steady-state, not drift. The check needs an
allowlist/ignore pattern for these so it doesn't cry wolf on every single poll (see §2).

---

## 2. Proposed check (pseudocode, not wired)

```bash
# pre_lane_check.sh <worktree-path> <expected-branch>  →  exit 0 = clean, exit 1 = blocked (prints why)
WT="$1"; EXPECT_BRANCH="$2"
cd "$WT" || { echo "BLOCK: worktree path missing"; exit 1; }

ACTUAL_BRANCH=$(git branch --show-current)
[ "$ACTUAL_BRANCH" = "$EXPECT_BRANCH" ] || { echo "BLOCK: on branch '$ACTUAL_BRANCH', expected '$EXPECT_BRANCH'"; exit 1; }

# Ignore known-benign untracked artifacts; only tracked-file modifications + non-driver untracked files count.
DIRTY=$(git status --short \
  | grep -vE '^\?\? \.worker-driver\.sh(\.bak.*)?$' \
  | grep -vE '^\?\? node_modules/$')
[ -z "$DIRTY" ] || { echo "BLOCK: uncommitted state carried over from a previous invocation:"; echo "$DIRTY"; exit 1; }

CONFLICTS=$(git status --short | grep -E '^(UU|AA|DD) ')
[ -z "$CONFLICTS" ] || { echo "BLOCK: unresolved merge/conflict markers present"; exit 1; }

echo "CLEAN: $EXPECT_BRANCH ready for dispatch"; exit 0
```

**Where this plugs in:** `.worker-driver.sh` (per-lane, e.g. this worktree's own copy at
`.worker-driver.sh:11-21`) already polls `LEADER-CHANNEL.md` in a loop and invokes `claude -p` the instant
it matches a `LEADER->W<n>:` line. The natural insertion point is immediately before the `claude --model
sonnet -p "..."` call (driver line 23 in this worktree's copy) — if `pre_lane_check.sh` exits non-zero, the
driver should skip invoking Claude for that order and instead append a `W<n>->LEADER: BLOCKED — <reason>,
order not run` line to the channel itself, so the leader sees the block immediately instead of silently
losing the dispatch or (worse) running it anyway against dirty state.

This document does **not** propose editing any lane's live `.worker-driver.sh` — per standing rules and the
explicit LEADER order (`NO hot-swap of the live .worker-driver.sh`), this stays a FOR-JEFF-REVIEW proposal.
If approved, the rollout would be: land `pre_lane_check.sh` as a new file first, get it reviewed/tested
standalone (it's read-only — safe to run against all 6 worktrees today with zero risk), and only then wire
the one-line call into each driver copy in a coordinated pass.

---

## 3. Why this is a driver-side check, not a channel-side one

Q-N4 (atomic channel writes) and Q-N2 (atomic queue claim) both harden *how orders move through
`LEADER-CHANNEL.md`*. Q-W5 is a different layer: it's about the **state of the filesystem the order is
about to run against**, which the channel has no visibility into at all — `LEADER-CHANNEL.md` only ever
records what workers *chose* to report, never what `git status` actually shows. That's exactly why the
3-of-6 drift in §0 was invisible until this doc's author ran `git status` directly against each worktree —
no amount of channel-log hardening would have caught it, because the channel was never the source of that
information to begin with.

---

## 4. Recommended severity / rollout order

- **Low risk to add**, since the check itself is read-only (`git branch`, `git status`, `git diff
  --name-only`) — it cannot corrupt or lose work by running it.
- **Real value observed today**: would have flagged 3 of 6 active lanes this session.
- **Suggested next step for Jeff/leader**, not taken here: run `pre_lane_check.sh` manually (or via a
  one-off leader command) against all 6 worktrees right now as a first live test before deciding whether to
  wire it into the drivers permanently.
