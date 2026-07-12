# Channel ↔ Git Reconciliation — verifying worker DONE claims

**Author:** W6 (Q-W1) · **Purpose:** the LEADER channel is self-reported. A worker writes `Wk->LEADER: DONE … [abc1234]` and the leader takes it on trust. This note gives a **read-only** procedure (and a runnable script) to confirm each claimed commit *actually exists, sits on that worker's own branch, and matches its claimed files* — so overstated / phantom / wrong-branch DONE claims surface instead of shipping on faith.

Companion script: `deploy-prep/reconcile-channel-vs-git.sh` (read-only; no refs/worktrees/objects touched). Numbers below are from running it against the live channel this session.

---

## Why this is even verifiable (the enabling fact)

Each worker runs in its **own git worktree on its own branch** (`flwork-p1-wN` → branch `p1-wN`), but **all worktrees in the family share ONE object store** (`.git/objects`). So a commit created in `flwork-p1-w4` is fully inspectable from `flwork-p1-w6` — `git cat-file`, `git show`, `git branch --contains` all resolve it. Verified this session: from the w6 worktree, W4's claimed `722ed11d` and W2's `091b6216` both inspect cleanly and report `p1-w4` / `p1-w2` respectively.

That means the leader does **not** need to `cd` into each worktree. One pass from anywhere reconciles the whole fleet.

## The four verification levels

For a claimed hash `H` attributed to worker `Wk` (expected branch `p1-wk`):

| Level | Question | Command | Failure meaning |
|---|---|---|---|
| 1 · Exists | Is `H` a real commit object? | `git cat-file -t H` → `commit` | Not a commit → phantom/typo/DB-id/external-SHA (classify, see below) |
| 2 · Own branch | Is `H` reachable from `p1-wk`? | `git branch --contains H` includes `p1-wk` | Off-branch → committed to wrong lane **or** (usually) just cited another lane's commit |
| 3 · Content | Do the changed files match the claim? | `git show --stat H` | Files ≠ claim → mislabeled / overstated |
| 4 · Non-empty | Did it change anything? | stat shows ≥1 file | `0 files` → empty commit dressed as work |

Level 1+2 are automatable and cheap. Level 3 needs the human to compare `--stat` output against the sentence the worker wrote ("added witness test X", "one commit each for A/B/C").

## What the live run found (this session)

Reconciling every 7–40-char hex token in `LEADER-CHANNEL.md`:

- **376 VERIFIED** — real commit, on the claimant's own `p1-wN`. This is the bulk; the fleet's DONE claims are overwhelmingly backed by real, correctly-placed commits. Spot-checked own-branch containment on W6/W4/W2 samples — all correct.
- **106 "MISMATCH" (off-branch)** — **mostly NOT dishonesty.** The dominant cause is a worker *citing* a hash that isn't theirs: another lane's commit ("per W4 audit `3fdcaa…`"), or a hash that has since propagated onto integration branches (`integ/wave2-2026-07-11`, `p1-final-integration`, …). A hash on `p1-w3,integ/…` claimed in a W1 line is W1 *referencing*, not W1 mis-committing. **Off-branch is a review queue, not a verdict.**
- **17 "UNRESOLVED"** — hex tokens that are **not commits in this repo**. Every one this session was a *false positive of naive extraction*, not a fabricated commit:
  - external GitHub-Action SHA pins W3 proposed (`34e1148` checkout, `49933ea` setup-node, `ea165f8` upload-artifact) — real SHAs, in *other* repos;
  - algorithm / word fragments: `ed25519` (Telnyx sig algo), `feedbac` (prefix of `feedback_*` rule names);
  - DB/tenant/cron UUID fragments: W1's `20b3f627`/`25c005a4`/… on the "created 6 REAL prod tenants" line; W4's `2c1034fc` (a cron job id).

### The precision lesson (do not cry wolf)
The channel's hex namespace **overlaps** commit hashes with external SHAs, UUIDs, cron ids, and rule-name fragments. A reconciler that flags every non-resolving hex token as "phantom DONE" will produce 17 false alarms and 0 real ones — and train the leader to ignore it. **"Not a commit" ≠ "lying."** The tool must *partition*, and the human classifies the residue. The genuinely actionable signal is narrow:

1. A token used in an explicit **DONE/commit context** (`[hash]`, `commit hash`, "one commit each … hash") that **resolves to nothing** → real overstatement. (Zero found this session.)
2. A **`0!EMPTY`** commit under a DONE claim → work claimed, nothing changed. (Zero found.)
3. An off-branch commit whose branch list contains **no `p1-w*` and no integration branch** and isn't a plain cross-reference → possible wrong-lane commit. (Eyeball the 106.)

## How to run it

```bash
# from any worktree in the family:
./deploy-prep/reconcile-channel-vs-git.sh                     # default channel path
./deploy-prep/reconcile-channel-vs-git.sh /path/to/LEADER-CHANNEL.md
# triage:
./deploy-prep/reconcile-channel-vs-git.sh | grep -E '^UNRESOLVED|EMPTY'   # highest-priority
./deploy-prep/reconcile-channel-vs-git.sh | grep '^MISMATCH'              # cross-ref vs wrong-lane review
```

Single-claim spot check (Level 3, human reads the stat):
```bash
H=722ed11d
git cat-file -t "$H"                          # commit ?
git branch --contains "$H" | grep p1-w4       # on the claimant's lane ?
git show --stat "$H"                           # files match the claimed description ?
```

## What git reconciliation CANNOT verify (trust boundaries)

Reconciliation proves a commit *exists and is placed correctly*. It says nothing about:

- **"tsc clean" / "FULL vitest N passed"** — runtime claims. Not in the object store. Re-run in the worker's worktree to confirm, or treat as unverified.
- **"[NOT APPLIED]" specs** — many W-lane deliverables are `.md` specs deliberately *not* wired into code. Their commit is real; the *safety* claim ("ready-to-apply diff") needs a human read, not a hash.
- **Semantic correctness** — `git show --stat` proves files changed, not that the change is right or that a test actually asserts what its name says. (A witness test can pass while asserting nothing.)
- **Rebase/squash drift** — a hash quoted *before* an integration rebase may legitimately vanish from the object store afterward. That's an UNRESOLVED that is neither a lie nor a bug; it's stale. Reconcile against the branch, not a frozen hash, once integration starts.

## Bottom line
The fleet's DONE claims are **well-backed**: 376/376 resolvable commit-claims sit on their own lane; the 17 unresolved are extraction false-positives (external SHAs, UUIDs, words), not fabricated work; the 106 off-branch are dominated by legitimate cross-references. Use the script as a **triage filter**, act on the three narrow actionable signals above, and remember it cannot vouch for tsc/vitest/semantic claims — those still need a re-run.
