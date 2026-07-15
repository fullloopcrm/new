# Per-branch CI validation for the p1-wN wave — proposal note

**Question (leader):** how should CI validate EACH `p1-wN` branch pre-merge
(tsc + FULL vitest per branch) to de-risk the eventual wave-2 integration?
Cite the existing `ci.yml`.

**Docs only.** W3 does not edit workflow YAML, open PRs, or push. This is a
proposal for the leader/Jeff to act on.

---

## 1. What `ci.yml` already gives you — for free, unedited

`.github/workflows/ci.yml`'s `verify` job runs, on every trigger it fires for:

- `npx tsc --noEmit --pretty false` (line 43)
- `npx vitest run` (line 46) — **unfiltered**: no path arg, no `--project`,
  no `--shard`, no `--changed`. Vitest therefore runs every file matched by
  `vitest.config.ts`'s `include: ['src/**/*.test.{ts,tsx}']` — confirmed the
  FULL suite (46 test files / 493 tests as of this commit) in
  `deploy-prep/ci-full-suite-gate-note.md`.
- `node scripts/audit-tenant-scope.mjs` (line 51) — the tenant-isolation guard.
- `npx eslint src --quiet` (line 56).

So the tsc + FULL vitest bar the leader wants **already exists, per branch,
with zero new workflow code** — *if* the trigger fires for that branch.

## 2. The actual gap: the trigger, not the checks

`ci.yml`'s trigger (lines 5–8):

```yaml
on:
  push:
    branches: [main]
  pull_request:
```

- `push` only fires for pushes **to `main`**. Pushing a branch like `p1-w3`
  directly does **not** trigger `ci.yml` (or `tenant-scope.yml` /
  `tenant-config-reconcile.yml` — both use the identical `push: branches:
  [main]` + `pull_request:` pattern, lines 9–11 and 15–17 respectively).
- `pull_request` fires only when a PR **exists** for that branch (any base).
  No open PR ⇒ no run, regardless of how many commits sit on the branch.

**Verified today (2026-07-12):** all six worker branches are pushed to
`origin` with real, divergent work and **zero open PRs**:

| Branch | Commits ahead of `main` | Open PR |
|---|---|---|
| `p1-w1` | 79 | none |
| `p1-w2` | 66 | none |
| `p1-w3` | 72 | none |
| `p1-w4` | 66 | none |
| `p1-w5` | 63 | none |
| `p1-w6` | 59 | none |

(`git rev-list --count main..origin/<branch>`; `gh pr list --state all
--search "head:p1-w1 OR head:p1-w2 OR head:p1-w3 OR head:p1-w4 OR
head:p1-w5 OR head:p1-w6"` returned nothing.)

So none of the six branches have been tsc/vitest-checked by CI at all — every
commit above was authored and locally self-verified by its worker (per each
worker's own standing rules), but never run through the actual CI gate. That
is real risk sitting in front of the wave-2 integration merge described in
`deploy-prep/stage0-integration-runbook.md` (merge order `p1-w4 → p1-w1 →
p1-w3 → p1-w2`, now with `p1-w5`/`p1-w6` also needing a slot).

## 3. Options, cheapest first

**(a) Open a (draft) PR per `p1-wN` branch against `main`.** Zero workflow
edits — `pull_request:` (already present, all three workflows) fires
immediately. Gives independent tsc + FULL vitest + tenant-scope + lint per
branch, visible as normal PR checks. Cost: six PRs appear in the repo's PR
list (visible to others — a push/PR-creation action, so this is a leader/Jeff
call, not something this lane does unilaterally). Recommended default.

**(b) Add a branch-name trigger to `ci.yml`** (e.g. `push: branches: [main,
'p1-w*']`) so every push to a worker branch auto-validates without a PR
existing. A **workflow edit** — Jeff-gated. Lower friction than (a) going
forward (no PR needed to get a signal) but pollutes Actions history with
non-PR runs and needs the branch-name pattern kept in sync as new waves spin
up (`p2-w*`, etc.).

**(c) A dedicated `integration-matrix` workflow** — one job per branch
(`strategy.matrix.branch: [p1-w1, p1-w2, p1-w3, p1-w4, p1-w5, p1-w6]`,
`workflow_dispatch` or scheduled), each job checking out that branch and
running the same tsc + vitest steps. Best fit for a recurring "validate the
whole wave together" signal without permanently changing `ci.yml`'s trigger
surface. Also a **workflow edit** — Jeff-gated. Highest setup cost of the
three; worth it only if this pattern (many long-lived worker branches, no
PRs) recurs across future waves rather than being a one-off for wave 2.

## 4. The point a per-branch matrix alone would miss

Green CI on each `p1-wN` branch individually does **not** prove the
*merged* result is green — `stage0-integration-runbook.md` §4 already
documents real conflicts (1 on the w4 merge, 7 on the w1 merge, at time of
writing) that per-branch checks cannot see, since each branch is tsc/vitest-
clean against `main` alone, not against its sibling branches' changes.
Whichever option above is adopted, the **integration branch** the runbook
builds (`integ/wave2`) should *also* get a PR (or equivalent CI run) before
the final merge to `main` — that is the run that actually proves the
combined tree compiles and passes the full suite. Per-branch validation
de-risks each worker's contribution in isolation; it is a precondition for,
not a substitute for, validating the integrated result.

## 5. Recommendation

Short-term, for this wave: **(a)** — six draft PRs, no workflow edits, uses
`ci.yml` exactly as it stands today. Leader/Jeff executes (PR creation is
out of this lane's scope). Longer-term, only if future waves keep this
long-lived-branch-without-a-PR shape: **(c)**, since it doesn't touch the
existing required trigger surface. **(b)** is the weakest option — it changes
`ci.yml`'s trigger for every future branch matching the pattern, permanently,
for a benefit (b) and (c) both give without that cost.

## 6. Not touched

No `.github/workflows/*.yml` file edited. No PR opened. No push beyond this
worktree's own commits to `p1-w3`.
