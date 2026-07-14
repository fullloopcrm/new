# Q-W5 duplicate reconciliation — status + recommendation (FOR-JEFF-REVIEW)

**Author:** W1, branch `p1-w1`, 2026-07-13. Docs-only, no code/script changed.

## Why this doc exists

Per LEADER-CHANNEL.md, Section Q (fleet reliability & hardening, 20 items,
MASTER-TODO-LIST.md) is now fully rostered — every item has at least one
FOR-JEFF-REVIEW proposal doc (W6's 11:48 report: "Section Q roster now: ALL 20
items have docs"). Before authoring a new Section Q item I checked the
roster and confirmed nothing is genuinely open — writing another item would
just be duplicate work of the exact kind Q-S2 (`queue-reconciliation-design.md`)
was written to catch. So instead of manufacturing a 21st doc, this closes the
one concrete gap W6 already flagged and asked the leader to resolve: **two
independent Q-W5 ("pre-lane branch state check") proposals exist**, and they
disagree on one substantive point.

## The two docs

| | `deploy-prep/pre-lane-branch-check.{md,sh}` | `deploy-prep/pre-lane-branch-state-check.md` |
|---|---|---|
| Branch | p1-w1 (this lane, 177a5fc7) | p1-w6 (f460927f mentions it as prior work) |
| Ships a script? | Yes — `pre-lane-branch-check.sh`, runnable today, exit 0/1/2 | No — pseudocode only (`pre_lane_check.sh`, not written as a file) |
| Detached HEAD / wrong branch | BLOCK | BLOCK |
| Mid-rebase/merge/cherry-pick/bisect | BLOCK | BLOCK (via `UU`/`AA`/`DD` conflict-marker check) |
| Stale `index.lock` | BLOCK | not checked |
| Missing worktree dir | BLOCK | not explicitly checked (assumes `cd` failure is enough) |
| **Uncommitted tracked-file modifications** | **WARN (non-blocking)** — "that's normal mid-batch" | **BLOCK** |
| Live verification | Ran against all 6 real lanes today — all PASS (happy path only; BLOCK paths verified by code review, not induced) | Ran `git status`/`branch --show-current` against all 6 real lanes today — found 3 of 6 (p1-w3/w4/w5) with real uncommitted tracked-file modifications *right now* |
| Driver insertion point | Named but not detailed | Named and detailed (before the `claude --model sonnet -p` call) |

Both are read-only, neither touches `.worker-driver.sh` or any live fleet
script, both are FOR-JEFF-REVIEW proposals only.

## The one real disagreement: is uncommitted work a BLOCK or a WARN?

This isn't just a naming collision — it's a genuine design fork, and W6's own
evidence (3 of 6 lanes dirty with tracked modifications *at time of writing*)
cuts against my WARN choice more than I'd realized when I wrote it. My
reasoning was that a worker mid-batch (e.g. 2 of 3 queue items committed,
3rd in progress) legitimately has uncommitted state between orders, so
BLOCKing on it would false-positive on completely normal fleet operation.
W6's reasoning is the opposite: uncommitted tracked-file modifications
*carried over from a previous invocation* are exactly the failure signal
worth blocking on, because the alternative is a new order's `git add`
silently bundling stale, unrelated changes into its own commit.

Both are right about different situations, and neither doc's check can tell
them apart from `git status` output alone:

- **Mid-batch, same invocation still running:** uncommitted state is
  expected and should not block (my WARN).
- **Previous invocation ended (crashed, denied, or just finished) leaving
  uncommitted tracked changes behind, and a NEW invocation is about to
  start:** that uncommitted state is orphaned and should block until a human
  looks at it (W6's BLOCK).

`git status` alone conflates these two cases — the distinguishing signal is
whether a driver invocation is currently *running* for that lane, which
neither script currently checks (a live PID check, same primitive
`fleet-supervisor.sh`/Q-N1 already needs for respawn-vs-duplicate detection).

## Recommendation

1. **Merge, don't pick one.** Keep my BLOCK conditions (detached HEAD, wrong
   branch, mid-rebase/merge/cherry-pick/bisect, stale `index.lock`, missing
   worktree dir — W6's proposal doesn't cover the lock/missing-dir cases) and
   adopt W6's uncommitted-tracked-changes check, but gate it on a live PID
   check first: if no driver process is currently running for that lane,
   escalate uncommitted tracked changes to BLOCK; if one is running, WARN
   (matches my original mid-batch reasoning). This reuses the PID-liveness
   primitive Q-N1 already needs, so it isn't new surface area.
2. **Ship one script, not two.** Since mine is the one with a runnable `.sh`
   file (`pre-lane-branch-check.sh`) and W6's is pseudocode-only, the least
   duplicate-effort path is extending my script with W6's
   uncommitted-changes-BLOCK branch (PID-gated per #1) rather than writing
   W6's pseudocode into a second file.
3. **Naming:** keep `pre-lane-branch-check.sh` (already a real file, already
   run against all 6 lanes) and retire `pre-lane-branch-state-check.md` as a
   design-rationale reference once its BLOCK-vs-WARN point is folded in —
   don't delete it, it documents *why* the merged version blocks on
   uncommitted state (the 3-of-6-dirty evidence is worth keeping).

Not applying any of this myself — it's a design decision plus a live-lane
uncommitted-state check that belongs to the leader/Jeff gate, same as both
source docs. This note is the reconciliation W6 asked for, nothing wired.
