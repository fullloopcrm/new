# STAGE-0 INTEGRATION RUNBOOK — WAVE-2 RE-INTEGRATION

**Purpose:** the exact, guided procedure to re-integrate the four P1 worker
branches (`p1-w1` … `p1-w4`) on top of the security base, resolve the three known
conflicts, and prove the result with a full rebuild gate — **before** anyone
pushes or merges to `main`.

> **Docs only.** This file executes nothing. It is written by autonomous worker
> **W3** (file-only lane). Every command below is safe to run locally in a
> throwaway worktree. The two gated actions — **push to `main`** and **deploy to
> prod** — are **NOT** part of this runbook. They are Jeff-gated and executed by
> the LEADER after Jeff's explicit go. See `deploy-prep/deploy-runbook.md`.

---

## 0. WHAT THIS PRODUCES

A single local integration branch — `integ/wave2` — containing:

```
security base (security/xss-theme-css-2026-07-10 @ 6a052a58)
  └─ p1-w4  (771a15af)   authz / tenant-isolation tests + yinez isolation
       └─ p1-w1  (53a28aee)   recurring.ts date-gen + open_365 unit coverage
            └─ p1-w3  (da64f6c1)   SEO/JSON-LD hardening  ← AUTHORITATIVE on SEO/schema
                 └─ p1-w2  (7fd21a1b)   leader handoff / docs
```

The branch is a **staging artifact only**. It is never pushed by this runbook.

---

## 1. VERIFIED FACTS (checked 2026-07-11, worktree p1-w3)

Do not take the merge order on faith — these are the SHAs and file states this
runbook was written against. Re-verify if the branches have moved.

| Ref | SHA | Tip subject |
|-----|-----|-------------|
| security base | `6a052a58` | consortium-nyc positioning sweep `[deploy]` |
| p1-w4 | `771a15af` | test(authz): de-vacuify reschedule cross-tenant sub-test |
| p1-w1 | `53a28aee` | test(P1/W1): recurring.ts date-gen + open_365 holiday gate |
| p1-w3 | `da64f6c1` | docs(deploy-prep): DNS fix checklist |
| p1-w2 | `7fd21a1b` | docs(P1): LEADER CONTEXT-HANDOFF PACKAGE |

Note: a branch `integ/wave2-2026-07-11` already exists locally **pointing at the
security base** (`6a052a58`, same as `origin/main`). If you reuse that name,
confirm it has not diverged first (`git rev-parse integ/wave2-2026-07-11`).

---

## 2. MERGE ORDER (do not reorder)

```
p1-w4  →  p1-w1  →  p1-w3  →  p1-w2
```

**Why this order:**
- **p1-w4 first** — biggest test surface (authz/isolation). Land it early so later
  branches conflict against it once, not repeatedly.
- **p1-w3 before p1-w2** — p1-w3 is **AUTHORITATIVE on any SEO/schema/JSON-LD
  conflict**. Landing it late means its versions win the tree without a fight.
- **p1-w2 last** — docs/handoff only; lowest blast radius, nothing depends on it.

---

## 3. CREATE THE INTEGRATION WORKTREE

Off the security base, in a **separate** worktree so no worker lane is disturbed:

```bash
# from the main repo (NOT inside an existing worker worktree)
git fetch --all
git worktree add -b integ/wave2 ../flwork-integ-wave2 security/xss-theme-css-2026-07-10
cd ../flwork-integ-wave2
git rev-parse HEAD          # expect 6a052a58...
```

If `integ/wave2` already exists and is clean at the base, you may check it out
instead of `-b`. If it has diverged, pick a fresh name (`integ/wave2-b`).

---

## 4. THE MERGES + THE THREE KNOWN CONFLICTS

Merge one branch at a time. **Stop and resolve** before the next merge — never
carry an unresolved index forward.

```bash
git merge --no-ff p1-w4    # (A)
git merge --no-ff p1-w1    # (B)  ← tenant-query.test.ts conflict lands here
git merge --no-ff p1-w3    # (C)  ← SEO/schema conflicts resolve to w3
git merge --no-ff p1-w2    # (D)  ← docs only, expect clean
```

### Conflict 1 — `platform/src/lib/tenant-query.test.ts` (w1 ∩ w4)

**Reality (verified):** this file exists on **both** `p1-w1` and `p1-w4`, and the
two versions **diverge substantially** — `git diff p1-w1 p1-w4` on this file is
**110 insertions / 180 deletions**. This is **not** two disjoint test sets you can
blindly concatenate; w4 rewrote large parts. The "union + dedupe" instruction is
the *intent*, but treat it as a **real manual merge**, not a mechanical paste.

**Resolution:**
1. Open the conflicted file. For each `describe`/`test` block, keep the **superset
   of behaviors**: every assertion that exists on either side must survive.
2. Where both sides test the *same* behavior with different phrasing, keep **one**
   copy (dedupe) — prefer the w4 phrasing since w4 landed first and is the newer
   rewrite.
3. Do not leave two `describe` blocks with the same name importing the same
   symbols — that is the classic union-merge breakage.
4. **Prove it in isolation before continuing the merge chain:**
   ```bash
   git add platform/src/lib/tenant-query.test.ts
   npx vitest run platform/src/lib/tenant-query.test.ts
   ```
   Both the w1-origin cases (recurring/date-gen adjacent) and the w4-origin cases
   (cross-tenant authz) must be present and green. If a case vanished, you
   over-deduped — go back.

### Conflict 2 — yinez + inbound-email tenant fixes (w3 ∩ w4)

**Reality (verified):** the security fix commit appears on both branches with
**different SHAs** (`016ee7d7` on w3, `b1f84ca3` on w4) but the resulting file
**content is identical** at the tips for:
- `platform/src/app/api/yinez/route.ts`
- `platform/src/lib/inbound-email-tenant.ts`
- `platform/src/lib/migrations/062_add_tenant_id_inbound_emails.sql`

Because the content is byte-identical, **git auto-resolves these** — expect **no
conflict markers**. Nothing to do by hand.

**One asymmetry to know:** `p1-w4` additionally carries a test file that `p1-w3`
does **not** have:
```
platform/src/app/api/yinez/route.isolation.test.ts
```
Since p1-w4 merges **first** (step A), this file is already in the tree by the time
p1-w3 merges. It is a **pure add** — no conflict — and it **must be kept**. Do not
delete it thinking it's a w3/w4 duplicate; w3 never had it.

### Conflict 3 — SEO / JSON-LD / schema files → **take p1-w3**

**Reality (verified):** p1-w3 is the SEO/schema hardening lane. Files under
`platform/src/app/site/**/_lib/{seo,schema}*` and the JSON-LD template
(`platform/src/app/site/template/_components/JsonLd.tsx` + its test) are p1-w3's
authoritative surface.

**Resolution:** on **any** conflict in an SEO/schema/JSON-LD file, take the
**p1-w3** version:
```bash
git checkout --theirs <path>   # 'theirs' == the branch being merged, i.e. p1-w3, during step C
git add <path>
```
> Verify `--theirs` resolves to p1-w3 in your git version before trusting it — in a
> `git merge p1-w3`, `--theirs` is p1-w3 and `--ours` is the in-progress integ
> branch. When unsure, open the file and keep the p1-w3 content explicitly.

Steps B and D are not expected to touch SEO/schema files; if one does, that is a
**surprise** — stop and inspect, do not auto-resolve.

---

## 5. REBUILD GATE — ALL THREE MUST PASS

After D (the last merge), from the integration worktree. **Every one** of these is
a blocker; a single failure means the integration is not done.

```bash
cd platform          # (adjust if the workspace root differs)
npm ci               # clean install against the merged lockfile
npm run build        # 1. production build must succeed
npx vitest run       # 2. FULL suite — not a subset — must be green
npx tsc --noEmit     # 3. zero type errors
```

**Pass criteria:**
- [ ] `npm run build` exits 0, no unresolved-module / build errors.
- [ ] `vitest run` — **0 failed**. Note the total count; if it dropped sharply vs
      the individual branches, a merge silently ate tests (suspect Conflict 1).
- [ ] `tsc --noEmit` — **0 errors**.

If any fails: fix in the integration worktree, re-run **all three**, do not
proceed on a partial pass. Do not `--force`, do not skip a suite to "get green."

---

## 6. WHAT THIS RUNBOOK DOES **NOT** DO (Jeff-gated)

- ❌ **`git push`** (any branch, especially `main`).
- ❌ **Merge to `main`.**
- ❌ **Deploy to prod** (Vercel — needs `[deploy]` in the eventual merge commit).
- ❌ **Any prod DB write / migration** (062 backfill runs per `deploy-runbook.md`,
  after Jeff's go).

When the gate in §5 is green, the integration branch is a **verified candidate**.
Handing it to `main` is a separate, Jeff-approved LEADER action — see
`deploy-prep/deploy-runbook.md` (PART 0 phased deploy) and `migration-verify.sql`.

---

## 7. IF SOMETHING GOES WRONG

- **Bad merge, want to restart clean:** the integ worktree is disposable.
  ```bash
  git merge --abort                 # mid-merge
  # or, to scrap entirely:
  cd .. && git worktree remove --force flwork-integ-wave2
  git branch -D integ/wave2
  ```
  No worker lane is affected — they are separate worktrees.
- **Test count dropped after §4:** re-open `tenant-query.test.ts`; you almost
  certainly over-deduped Conflict 1. The union must be a superset.
- **A gated action feels necessary to unblock:** it isn't. Stop, report to LEADER,
  wait for Jeff. Nothing in re-integration requires a push, deploy, or prod write.
