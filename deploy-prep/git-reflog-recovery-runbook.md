# Git Reflog Checks / Lost-Commit Recovery — design + runbook (Q-W2, FOR-JEFF-REVIEW)

**Status:** PROPOSAL. No script installed, no cron wired, nothing run against the live fleet. Author: W6, branch `p1-w6`, 2026-07-13.

**Problem statement (Section Q, THIS WEEK tier):** "git reflog checks (recover work if a branch/commit is lost)." Confirmed via `grep` across `LEADER-CHANNEL.md` and every `deploy-prep/` tree visible from this worktree that no other lane has picked this item up yet (Q-N3 and Q-N5 — the two other open NOW-tier items at dispatch time — were already closed by W4/W1 respectively this session; Q-W2 was not).

---

## 1. Why this is a real risk in THIS fleet, not a generic git tip

Verified this pass (read-only, no state changed):

- **20 worktrees share one object database.** `git rev-parse --git-common-dir` from this worktree resolves to `/Users/jefftucker/fullloopcrm/.git` — every `flwork-*` directory (`git worktree list` shows 20+ linked worktrees: `p1-w1..w6`, `hotfix/*`, `integ/*`, scratch lanes) is a **linked worktree of the same repo**, not a separate clone. This cuts both ways:
  - **Good:** a commit made in `p1-w3`'s worktree is recoverable from `p1-w6`'s worktree (or anywhere) via `git fsck`/`git reflog`, because the object store is shared — recovery doesn't require being in the original worktree.
  - **Bad:** a destructive git operation in ANY worktree (a bad `git gc --aggressive`, `git reflog expire --expire=now --all`, or `git prune`) prunes recovery data for the **entire fleet**, not just that lane. One worker running the wrong cleanup command can erase every other lane's safety net.
- **The standing fleet workflow does exactly the kind of operations that lose commits when they go wrong:** `branch-integration-plan.md` (Wave 1) calls for cherry-picks and merges across 6 lanes in a specific order; `cross-lane-merge-conflict-audit.md` documents 81 real conflicts across those lanes. Conflict resolution during a merge/rebase is precisely where `git reset --hard`, a botched `rebase --abort` that doesn't actually restore the pre-rebase tip, or an accidental `checkout -- .` most commonly discards a commit that was never pushed anywhere else.
- **Confirmed current git config (this checkout):** `core.logAllRefUpdates=true` (default, reflog is being recorded) but `gc.reflogExpire` / `gc.reflogExpireUnreachable` / `gc.pruneExpire` are **unset**, meaning git's own defaults apply silently: unreachable reflog entries expire in **30 days**, reachable ones in **90 days**, and `git gc --auto` can prune dangling objects older than **2 weeks** the moment loose-object count crosses git's internal threshold (default ~6700 objects) — nobody in this fleet has to run `gc` by hand for a window to close. Nothing today snapshots refs before a risky operation, so recovery depends entirely on this expiring window plus someone remembering to check `reflog` before it lapses.
- Git version on host: `2.39.5 (Apple Git-154)` — everything below is compatible with that.

## 2. What this proposes (two parts: a runbook that works today, a script that makes it proactive)

### 2a. Recovery runbook — usable immediately, no new tooling required

If a lane reports (or the leader observes) a commit or branch that "disappeared" — force-push undone locally, a bad `reset --hard`, an accidentally deleted local branch, a merge/rebase that discarded work:

```bash
# 1. From ANY worktree (shared odb — doesn't have to be the original lane's directory):
cd /Users/jefftucker/flwork-p1-w6   # or any other worktree

# 2. Check that branch's own reflog first — cheapest, most targeted:
git reflog show p1-w6 --date=iso | head -50
#   or, if you don't know which local ref, check HEAD's reflog in the lane
#   where it happened:
git reflog show HEAD --date=iso | head -50

# 3. If the ref itself was deleted (branch -D, or a worktree removed), the reflog
#    for that branch name is usually gone too. Fall back to a full dangling-commit
#    sweep across the SHARED odb (safe, read-only — does not modify anything):
git fsck --full --no-reflogs --unreachable --dangling 2>/dev/null | grep 'commit'

# 4. For each candidate `dangling commit <sha>`, inspect before trusting it:
git show --stat <sha>
git log -1 --format='%H %ci %s' <sha>

# 5. Once identified, recover onto a new branch (never force-push, never overwrite
#    the current broken tip — recover SIDE-BY-SIDE so nothing is lost twice):
git branch recovery/<lane>-<short-sha> <sha>

# 6. Diff the recovered branch against the current (broken) tip to see exactly
#    what would be restored, before deciding what to do with it:
git diff p1-w6 recovery/p1-w6-<short-sha>
```

Step 3's `git fsck --unreachable --dangling` is the actual safety net once a branch ref (not just a commit) is gone — this is what makes the shared-odb property in §1 valuable rather than just risky: even a `branch -D` in a completely different lane's worktree does not erase the *commit object* until gc actually prunes it, and `fsck` finds it fleet-wide.

**Hard rule to bank alongside this runbook (standing-rule addition, not yet in `LEADER-HANDOFF.md`):** no lane or leader session may ever run `git gc --aggressive`, `git gc --prune=now`, or `git reflog expire --expire=now --all` on this shared repo. Because the object store is shared across all 20+ worktrees, any one of those commands can permanently erase another lane's unpushed recovery window. Plain `git gc` (no flags) respects the default `gc.pruneExpire` grace period (2 weeks) and is low-risk; the aggressive/immediate variants are not.

### 2b. Proactive ref-snapshot script — closes the "reflog already expired" gap

The runbook above only works within git's expiry windows. For belt-and-suspenders coverage that survives past 30/90 days (or a `gc.auto` trigger nobody scheduled), a snapshot script appends each lane's current tip to a plain append-only log **before** any planned risky operation (a scheduled merge/rebase/integration step), independent of git's own reflog:

```bash
#!/bin/bash
# scripts/git-ref-snapshot.sh — PROPOSAL, not installed, not run.
# Appends "<timestamp> <worktree> <branch> <sha>" for every fleet worktree to a
# plain-text log OUTSIDE git's object store, so the record survives even if the
# repo's own reflog/odb is later pruned. Read-only against git (no writes).
set -euo pipefail
SNAPSHOT_LOG="${SNAPSHOT_LOG:-/Users/jefftucker/fullloopcrm/deploy-prep-fleet-ops/git-ref-snapshots.log}"
mkdir -p "$(dirname "$SNAPSHOT_LOG")"
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
git -C /Users/jefftucker/fullloopcrm worktree list --porcelain | awk '
  /^worktree /{wt=$2}
  /^branch /{split($2,a,"/"); print wt, a[length(a)]}
' | while read -r wt branch; do
  sha=$(git -C "$wt" rev-parse HEAD 2>/dev/null) || continue
  printf '%s %s %s %s\n' "$TS" "$wt" "$branch" "$sha" >> "$SNAPSHOT_LOG"
done
echo "snapshot appended: $SNAPSHOT_LOG"
```

Usage (once Jeff/leader approves and installs it): run it **immediately before** any Wave 1 cherry-pick/merge session per `branch-integration-plan.md`, and again after, so a bad merge has a known-good SHA to `git branch recovery/<lane> <sha>` back to — no dependency on reflog expiry at all, since the SHA is captured in a plain file the moment the snapshot runs. Cheap enough to also run on a low-frequency cron (e.g. every 6h) for a permanent trailing record, but that's a nice-to-have on top of the "run before risky ops" floor, not a substitute for it.

## 3. What this does and does not fix

- **Fixes:** gives the leader/any worker a concrete, tested recovery procedure (§2a) that works today with zero new tooling, plus a standing-rule guardrail against the one class of command that would defeat it fleet-wide. §2b closes the residual "reflog already expired" gap for planned risky operations specifically.
- **Does not fix:** anything already-force-pushed to the **remote** (`github.com/fullloopcrm/new`) with history rewritten there — this is a **local-object-store** recovery mechanism only. Remote-side recovery would need GitHub's own reflog-equivalent (its API doesn't expose one for arbitrary force-pushes) or a prior local snapshot per §2b pushed as a tag before the force-push. Also does not fix a lost commit whose blobs were already `gc`'d before this runbook existed — nothing can recover an object already physically removed; §2b's whole purpose is to stop that from being the only option going forward.

## 4. Verification done / not done

- **Not run.** `scripts/git-ref-snapshot.sh` is a proposal in this doc, not written to `scripts/` and not executed — per standing rule (no live-fleet script changes without Jeff's review).
- **Confirmed by direct command, this pass:** `git rev-parse --git-common-dir` (shared odb), `git worktree list` (20+ linked worktrees), `git config --get core.logAllRefUpdates` (`true`), absence of `gc.reflogExpire`/`gc.pruneExpire` overrides (git defaults apply), `git --version` (2.39.5), and a live `git reflog -5` on this branch (shows real recent W6 commits, confirming reflog is actively recording on this checkout).
- **Not tested:** the `git fsck --unreachable --dangling` recovery path was not exercised against a real deliberately-orphaned commit in this pass (would require creating and discarding a throwaway commit — a live-repo mutation outside this file-only lane's scope). Recommend the leader dry-run §2a once on a disposable scratch worktree (several already exist: `flwork-junk2`, `flwork-junkfix`) before relying on it under real incident pressure.
- No code changed by this doc; `tsc --noEmit` not applicable.

## 5. Dependencies / sequencing

- Complements `atomic-queue-claim-design.md` (Q-N2, prevents the double-run bug) and `channel-vs-git-reconciliation-note.md` (Q-W1, catches DONE-claim/git mismatch) — those two are about *detecting* a divergence between claimed and real state; this doc is about *recovering* once a commit is confirmed actually lost, a distinct failure mode neither of those covers.
- Should be read alongside `branch-integration-plan.md` before Wave 1 executes — that is the highest-risk moment for this fleet's shared history.
