# Queue Reconciliation — detect swallowed/duplicated orders automatically (Q-S2, FOR-JEFF-REVIEW)

**Status:** PROPOSAL / design only. No script written to `scripts/`, nothing run, nothing wired into any
live process. The leader decides whether to adopt.

**Author:** W6, branch `p1-w6`, 2026-07-13.

---

## The problem, caught live during this exact session (not a hypothetical)

Q-W5 ("pre-lane branch state check") was completed and reported closed by **this worker (W6)** at
`LEADER-CHANNEL.md:1588` (11:31): `deploy-prep/pre-lane-branch-state-check.md`, commit `1e21153c`. That
report explicitly says "Q roster now only Q-O4/Q-S1-4 open" — i.e. Q-W5 done, don't re-dispatch it.

Thirteen minutes later, `LEADER-CHANNEL.md:1606` (11:44) shows **W1 independently authoring the same
item**: `Q-W5 pre-lane-branch-check.{md,sh}` — different filename, different worktree/branch (`p1-w1`),
same Q-code, same intent (a pre-dispatch git-clean gate). W1's own report says it "checked all 6 lanes'
deploy-prep dirs first, only Q-W5/Q-O4/Q-S1-4 remained open" — meaning W1 looked and still missed that
Q-W5 was already closed 13 minutes earlier in a *sibling* worktree's `deploy-prep/`, which W1 cannot see
directly (each lane is its own git worktree; W1 has no filesystem view into `p1-w6/deploy-prep/`). The
only source W1 *could* have cross-referenced is `LEADER-CHANNEL.md` free text — and did not catch it, or
caught it too late.

This is exactly Q-S2's scope: **detecting a duplicated (here) or swallowed order automatically**, instead
of relying on every worker/leader session to manually grep scrollback and correctly parse informal
"Q roster now only X open" sentences buried inside longer prose reports. The failure mode just observed
is not a process the docs/tests can't reach — it is 40+ minutes of one worker's real token spend re-doing
work that already existed, discoverable only by a human (or a future report like this one) diffing two
timestamps against each other.

## Why free-text channel grep doesn't scale as fleet size × session count grows

Each worker's own "Q roster now open: ..." line (mine at 11:31, 11:41) is the *only* place closed-item
state is recorded, and it is:
- **Self-reported, not verified** — a worker could misstate the roster (miscounted, stale view).
- **Buried in prose** — mixed into a paragraph with commit hashes, findings, and caveats; a worker
  self-selecting a Q-item under time pressure may reasonably skim rather than parse every sibling's full
  report.
- **Not indexed by Q-code** — nothing lets a worker or the leader ask "is Q-W5 closed?" in one grep; they
  have to read backward through however much scrollback exists since Section Q was introduced
  (`LEADER-CHANNEL.md` is 1600+ lines and growing every dispatch cycle).

## Design

### A machine-parseable roster status file, updated at close time (not reconstructed after the fact)

`deploy-prep/../Q-ROSTER-STATUS.md` is the wrong location (per-worktree, not fleet-visible); this needs to
live where every lane can see it: `/Users/jefftucker/fullloopcrm/Q-ROSTER-STATUS.md` (the shared, non-
worktree-scoped leader directory, same tier as `LEADER-CHANNEL.md`/`MASTER-TODO-LIST.md`). One line per
Q-code, rewritten in place (not appended — this is a small, whole-row upsert, so the write-tmp-rename
primitive from `atomic-handoff-file-design.md` (Q-W4) is the right tool here, *not* the flock-append
primitive from Q-N4 — same distinction Q-W4 already drew between whole-file rewrites and concurrent
appends):

```
Q-N1  DONE  W6  f13308bb  fleet-supervisor-note.md
Q-N2  DONE  W6  b816f208  atomic-queue-claim-design.md
Q-W5  DONE  W6  1e21153c  pre-lane-branch-state-check.md
Q-S1  OPEN
Q-S2  OPEN
Q-S4  OPEN
```

**The rule that would have prevented the Q-W5 duplicate:** before a worker self-selects "next undone
Section Q item," it greps this one file for the code's status field — a single deterministic lookup
instead of parsing scrollback prose. Before the leader dispatches a Q-item by name, same check.

### Automated swallowed/duplicate detection (the reconciliation script itself)

Design (not built) for `scripts/reconcile-queue.mjs`, run periodically or on-demand, read-only:

1. Parse `LEADER-CHANNEL.md` for two line shapes: dispatch lines (`LEADER->W\d:`) and completion lines
   (`W\d->LEADER:`).
2. Extract Q-codes via regex (`Q-[A-Z]\d`) from both dispatch and completion text.
3. **Swallowed-order check**: for each dispatch line naming a Q-code (or a generic "pick the next Section Q
   item" dispatch), confirm a completion line from the same worker appears within a configurable window
   (e.g. 2 hours) referencing that Q-code or an explicit "no work found" reply. Flag any dispatch with
   neither.
4. **Duplicate-close check**: group completion lines by Q-code; flag any Q-code with **more than one**
   distinct commit hash across **different worktrees** closing it (exactly what happened with Q-W5 —
   `1e21153c` on p1-w6 and W1's still-unlanded-per-this-doc commit on p1-w1 would both match the same
   `Q-W5` token). This is the direct, mechanical version of the manual cross-reference that failed here.
5. Output: a short table (Q-code, dispatches, completions, verdict: OK / SWALLOWED / DUPLICATE), printed to
   stdout — read-only, no writes to the channel or roster file itself (that stays the workers'/leader's
   job, per each closing report).

### What this does NOT do

- Does not touch `LEADER-CHANNEL.md`'s write path (that's Q-N4's concern, already designed).
- Does not retroactively fix the Q-W5 duplicate — flagging that as a live finding for the leader to decide
  whether to keep, merge, or discard whichever of the two designs it prefers (both are FOR-JEFF-REVIEW
  proposals; neither is applied).
- `Q-ROSTER-STATUS.md` is not created in this pass. `scripts/reconcile-queue.mjs` is not written in this
  pass. Both are specified here as designs only, per standing file-only/no-live-script-activation rule.

## Flag for Jeff/leader

Recommend the leader (or whichever worker picks up W1's Q-W5 doc) decide: keep both
`pre-lane-branch-state-check.md` (this branch) and `pre-lane-branch-check.{md,sh}` (p1-w1) as independent
proposals to compare, or treat one as authoritative and retire the other before Wave-plan integration —
otherwise `branch-integration-plan.md`'s merge step inherits an avoidable naming collision between two
lanes' `deploy-prep/` directories.
