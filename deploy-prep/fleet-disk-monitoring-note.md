# Fleet Disk Monitoring & Cleanup Note (Q-O3, FOR-JEFF-REVIEW)

**Status:** Observation + proposed policy. **Nothing deleted.** Every cleanup
command below is presented for the leader/Jeff to run deliberately; this doc runs
none of them.

**Author:** W6, branch `p1-w6`, 2026-07-12.

---

## Two honest corrections to the premise up front

1. **It's not 6 worktrees — it's 22** (+ `fullloopcrm` itself = 23 checkouts).
   `git worktree list` shows the full fleet. The disk problem is bigger than the
   order implies.
2. **There are no "screenshots" eating disk.** I searched the whole family for
   screenshot / test-results / playwright-report / artifact dirs and found none in
   the repo (only two stale `platform/coverage/` dirs). The real disk hogs are
   **`.next/` build caches and per-worktree `node_modules/`.** I'm flagging this
   rather than inventing a screenshots problem that isn't there.

I also only have a **point-in-time snapshot** (2026-07-12), not growth-over-time — I
can't fabricate a historical series. The check command in §4 is what makes growth
trackable from here forward.

---

## 1. Snapshot (2026-07-12) — total family footprint ≈ **33 GB**

Per-checkout totals (`du -sh`, sorted):

| Checkout | Size | node_modules | .next | notes |
|----------|-----:|-------------:|------:|-------|
| flwork-p1-w2 | **4.2 G** | 768 M | **3.4 G** | runaway `.next` cache — single worst offender |
| fullloopcrm | 1.5 G | 758 M | 597 M | primary checkout |
| flwork-junkupload | 1.4 G | 770 M | 610 M | |
| flwork-backlog | 1.4 G | 770 M | 610 M | |
| flwork-integration | 1.3 G | 756 M | 503 M | |
| flwork-junkfix | 1.2 G | — | — | (has build/deps) |
| flwork-sim | 1.0 G | — | — | |
| flwork-junk2 | 1.0 G | — | — | |
| flwork-p1-w5 | 843 M | 758 M | — | deps only |
| flwork-p1-w3 | 840 M | 756 M | — | deps only |
| flwork-p1-w1 | 85 M | — | — | source only + coverage |
| flwork-p1-w4, -p1-w6, -aixss, -seo-w4, -fix-payout-w2, -fix-auditgate-w4, -w2, -w4, -cutover, -todo, -comhub | 78–85 M each | — | — | **source only (no deps installed)** |
| Shared `.git` object store | 89 M | — | — | tiny — worktrees share ONE object DB |

**Read of the data:**
- The 84 MB baseline = a clean source-only worktree. That's the floor; it's fine.
- Everything above ~85 MB is **rebuildable, git-ignored cache**: `node_modules`
  (~760 M each) and `.next` (500 M – 3.4 G). Confirmed ignored in
  `platform/.gitignore`: `/node_modules`, `/.next/`, `/out/`, `/build`, `/coverage`,
  `*.tsbuildinfo`.
- **Deleting all of it loses nothing** — `npm/pnpm install` + `next build`
  regenerate it. The git object store (89 M, shared across all worktrees) is the
  only irreplaceable part and it's already tiny.

## 2. Why it grows

- **`node_modules` duplicates per worktree.** Each worktree that gets an
  `install` adds ~760 M. 7 installed today = ~5.3 G of near-identical deps. Every
  new active lane adds another ~760 M.
- **`.next` grows unbounded across dev/build runs.** flwork-p1-w2 at 3.4 G vs a
  fresh ~500 M build shows a cache that was never cleared between many
  build/dev cycles. This is the fastest-growing, least-valuable bytes on disk.
- **Dormant worktrees keep their caches.** Most of the 84 MB worktrees are done or
  idle but still occupy a `git worktree` slot; the ones that were built retain
  full caches indefinitely because nothing prunes them.

## 3. Proposed cleanup policy

Ordered by safety (all safe — everything here is git-ignored and rebuildable):

**P0 — reclaim now, ~zero risk (frees the most, fastest):**
- Delete every `.next/` in the family. Reclaims ~**6 GB+** (3.4 G from p1-w2 alone).
  Rebuilt on next `next build`/`next dev`.
- Delete stale `coverage/` dirs (2 present). Rebuilt on next `--coverage` run.

**P1 — reclaim from dormant worktrees:**
- For any worktree **not actively being worked** (no LEADER order in flight),
  delete its `node_modules/`. ~760 M each. Reinstall when the lane resumes.

**P2 — prune finished worktrees entirely:**
- After a lane is merged/abandoned, `git worktree remove <path>` (or
  `git worktree prune` for already-deleted dirs). This removes the whole checkout,
  not just its caches. Do **not** remove a worktree with uncommitted work — check
  `git -C <path> status` first (blast-radius rule; these may hold un-pushed work).

**Standing rule to slow regrowth:** clear `.next` between build sessions rather than
letting it accumulate — a periodic P0 sweep (below) is enough.

## 4. Check command (run any time; makes growth trackable)

**Read-only audit — what's using disk, biggest first:**
```bash
# per-worktree total
du -sh /Users/jefftucker/flwork-* /Users/jefftucker/fullloopcrm 2>/dev/null | sort -rh

# just the reclaimable caches, family-wide
du -sh /Users/jefftucker/flwork-*/platform/{.next,node_modules,coverage} \
       /Users/jefftucker/fullloopcrm/platform/{.next,node_modules,coverage} \
       2>/dev/null | sort -rh

# grand total of the whole family
du -sc /Users/jefftucker/flwork-* /Users/jefftucker/fullloopcrm 2>/dev/null | tail -1
```

**Track growth over time** (append a dated line to a log — this is how you get the
time series that doesn't exist yet):
```bash
echo "$(date +%F) $(du -sc /Users/jefftucker/flwork-* /Users/jefftucker/fullloopcrm \
  2>/dev/null | tail -1 | cut -f1) KB" >> ~/fleet-disk-history.log
```

## 5. Reclaim commands (leader/Jeff runs deliberately — NOT auto-run)

```bash
# P0: nuke all .next build caches (safe, rebuildable) — frees ~6 GB+
find /Users/jefftucker/flwork-* /Users/jefftucker/fullloopcrm \
  -maxdepth 3 -type d -name .next -prune -exec rm -rf {} +

# P0: stale coverage dirs
find /Users/jefftucker/flwork-* /Users/jefftucker/fullloopcrm \
  -maxdepth 3 -type d -name coverage -prune -exec rm -rf {} +

# P1: node_modules ONLY in dormant worktrees — list first, delete by hand.
#     Never blanket-delete: an active lane mid-build will break.
du -sh /Users/jefftucker/flwork-*/platform/node_modules 2>/dev/null | sort -rh

# P2: prune finished worktrees (verify clean status FIRST)
git -C /Users/jefftucker/<path> status --short   # must be empty
git worktree remove /Users/jefftucker/<path>
git worktree prune                                # drops refs to deleted dirs
```

**Guardrails:**
- `rm -rf` is irreversible — the `-name .next`/`-name coverage` filters keep the
  blast radius to git-ignored caches only. Do not widen the pattern.
- Before any `git worktree remove`, confirm `git status` is clean in that worktree
  — these checkouts may hold un-pushed lane work (blast-radius rule).
- Do **not** touch the shared `.git` object store (89 M) — it backs every worktree.

## 6. Rough reclaim estimate

- P0 (all `.next` + coverage): **~6 GB** immediately, ~zero risk.
- P1 (node_modules of the ~5 dormant installed worktrees): **~3.8 GB** more.
- P2 (remove finished worktrees): trims the long tail of 84 MB source checkouts
  once lanes are merged.

**Total readily reclaimable today: ~10 GB of the ~33 GB (≈30%), all rebuildable.**
