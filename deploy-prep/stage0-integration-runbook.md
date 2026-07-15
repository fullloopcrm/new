# STAGE-0 INTEGRATION RUNBOOK — WAVE-2 RE-INTEGRATION

**Purpose:** the exact, guided procedure to re-integrate the four P1 worker
branches (`p1-w1` … `p1-w4`) on top of the security base, resolve the **observed**
merge conflicts (**1** on the w4 merge, **7** on the w1 merge — see §4), and prove
the result with a full rebuild gate — **before** anyone pushes or merges to `main`.

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

## 4. THE MERGES + THE OBSERVED CONFLICTS

Merge one branch at a time. **Stop and resolve** before the next merge — never
carry an unresolved index forward.

```bash
git merge --no-ff p1-w4    # (A)  ← 1 conflict: team-portal/auth/route.ts (already DONE: ef3512fd)
git merge --no-ff p1-w1    # (B)  ← 7 conflicts (see 4B) — the real work is here
git merge --no-ff p1-w3    # (C)  ← SEO/schema authority: schema.tsx + JsonLd resolve to w3
git merge --no-ff p1-w2    # (D)  ← docs only, expect clean
```

> **These are not predictions.** The conflict sets below were reproduced against
> the actual tips (`git merge-tree ef3512fd p1-w1`) on 2026-07-11 in worktree
> p1-w3. Step A is already merged on `integ/wave2-2026-07-11` at **`ef3512fd`**.

### 4A. Step A — `git merge p1-w4` → **1 conflict** (DONE: `ef3512fd`)

Single conflict: **`platform/src/app/api/team-portal/auth/route.ts`** (content).
- **base** (`6a052a58`) already had the failed-attempt buckets
  `team_portal_auth_fail:slug:<slug>` + `team_portal_auth_fail:ip:<ip>`.
- **w4** added a pre-check bucket `team_portal_auth:<slug>:<ip>` (5 / 15 min).
- **Resolution taken = union (keep both):** w4's `team_portal_auth:<slug>:<ip>`
  pre-check **plus** base's two `team_portal_auth_fail:*` buckets. Verified: the
  resolved blob on `ef3512fd` contains all three `rateLimitDb(...)` calls.

This file **conflicts again at step B** against w1 — see 4B(2). Nothing more to do
for step A; it is committed.

### 4B. Step B — `git merge p1-w1` → **7 conflicts**

Exact paths and resolution per file. Resolve **all seven**, `git add` each, then
run the isolated checks in 4C before proceeding to step C.

**(1) `platform/src/app/api/client/login/route.ts`** (content) — **KEEP BOTH guards.**
- w4/base side: two-layer rate limit — per-IP `client-login:<tenant>:<ip>` (5/10min)
  **and** per-tenant `client-login-tenant:<tenant>` (100/10min).
- w1 side: single `client-login:<tenant>:<ip>` **with `{ failClosed: true }`**.
- **Resolve to:** keep w4's **two** buckets **and** add `{ failClosed: true }` to
  both `rateLimitDb(...)` calls. Do **not** collapse to w1's single bucket — that
  drops the distributed-PIN-spray (per-tenant) cap.

**(2) `platform/src/app/api/team-portal/auth/route.ts`** (content) — **KEEP BOTH guards. ⚠ SECURITY.**
- w4 side (in tree from step A): bucket keyed on **`team_portal_auth:<slug>:<ip>`**.
  Keying on the IP (not the PIN) **is the fix** — see the comment on that side.
- w1 side: bucket keyed on **`team_portal_auth:<slug>:<pin>`** with `{ failClosed: true }`.
- **Resolve to:** w4's **`<slug>:<ip>`** bucket key **+** w1's **`{ failClosed: true }`**
  flag, and preserve the base `team_portal_auth_fail:*` buckets from step A.
- **⚠ Do NOT take w1's line verbatim.** Keying on `<pin>` gives every guessed PIN a
  fresh 5-attempt budget → unthrottled PIN enumeration. This is the single most
  dangerous mis-resolution in the set.

**(3) `platform/src/app/site/consortium-nyc/_lib/schema.tsx`** (content) — **defer to w3 (take-w3-SEO).**
- w1 side **adds** `aggregateRatingSchema()` (a `ProfessionalService` AggregateRating).
- p1-w3 commit **`a604b132`** — *"remove fabricated self-serving AggregateRating from
  all bespoke sites (CRITICAL-1)"* — **deletes** exactly this.
- **Resolve to:** unblock step B however (keeping w1's add is fine); the file is
  reconciled at **step C**, where **w3 is authoritative and wins.**
- **Invariant to verify after step C:** `aggregateRatingSchema` must **NOT** exist
  in the final tree. `git grep aggregateRatingSchema` on the integ tip must return
  nothing. Keeping w1's fabricated rating past step C re-opens CRITICAL-1.

**(4) `platform/src/lib/escape-html.ts`** (add/add) — **take ONE impl + normalize one test.**
- Two independent `escapeHtml` impls that escape the **same 5 chars** and differ
  **only** in the apostrophe entity: base/w4 emits **`&#039;`**, w1 emits **`&#39;`**.
  Both are valid and XSS-safe; browsers render both as `'`.
- **Recommended: keep the base/w4 impl (`&#039;`)** — it is the security-base
  version already depended on by `leads`/`prospects` notification paths.
- **Then normalize the losing test:** w1's `platform/src/lib/escape-html.test.ts`
  asserts `&#39;` and will **fail** against the `&#039;` impl → change that one
  assertion to `&#039;`. (Base/w4's `platform/src/app/api/email-html-escape.test.ts`
  already asserts `&#039;`.) If you keep w1's impl instead, do the mirror edit to
  `email-html-escape.test.ts`. **Exactly one test-expectation edit either way** —
  it is a normalization, not a behavior change. Skipping it fails the rebuild gate
  on a phantom "regression."

**(5) `platform/src/lib/quote.test.ts`** (add/add, 6 hunks) — **union tests.**
**(6) `platform/src/lib/rate-limit-db.test.ts`** (add/add, 1 hunk) — **union tests.**
**(7) `platform/src/lib/tenant-query.test.ts`** (add/add, 3 hunks) — **union tests (careful).**

For (5)–(7): keep the **superset of behaviors** — every `test`/`it` assertion on
either side survives. Where both sides cover the *same* behavior with different
phrasing, keep **one** copy (prefer the w4/base phrasing). Do **not** leave two
same-named `describe` blocks re-importing the same symbols. **`tenant-query.test.ts`
diverges the most** (w4 rewrote large parts) — treat it as a real manual merge, not
a mechanical paste; if the total test count drops sharply you over-deduped.

### 4B-note. What did NOT conflict (do not go looking for these)

Predicted-but-absent in the observed merge — git auto-resolved them, so **leave
them alone**:
- **yinez / inbound-email tenant fixes** (`api/yinez/route.ts`,
  `lib/inbound-email-tenant.ts`, `migrations/062_add_tenant_id_inbound_emails.sql`) —
  content is byte-identical across branches; merges clean, **no markers**.
- **`api/yinez/route.isolation.test.ts`** — present only on p1-w4, a **pure add**,
  already in the tree from step A. **Keep it**; it is not a w3/w4 duplicate.

### 4C. Prove the step-B resolutions in isolation (before step C)

```bash
git add platform/src/app/api/client/login/route.ts \
        platform/src/app/api/team-portal/auth/route.ts \
        platform/src/app/site/consortium-nyc/_lib/schema.tsx \
        platform/src/lib/escape-html.ts \
        platform/src/lib/quote.test.ts \
        platform/src/lib/rate-limit-db.test.ts \
        platform/src/lib/tenant-query.test.ts
npx vitest run platform/src/lib/escape-html.test.ts \
               platform/src/app/api/email-html-escape.test.ts \
               platform/src/lib/quote.test.ts \
               platform/src/lib/rate-limit-db.test.ts \
               platform/src/lib/tenant-query.test.ts
```
All green before you `git merge --no-ff p1-w3`. If a case vanished from a union
test, you over-deduped — go back.

### 4D. Step C — `git merge p1-w3`: SEO / JSON-LD / schema → **take p1-w3**

p1-w3 is the SEO/schema hardening lane and is **authoritative** on `schema.tsx`,
`platform/src/app/site/template/_components/JsonLd.tsx` (+ its test), and anything
under `platform/src/app/site/**/_lib/{seo,schema}*`.

```bash
git checkout --theirs <path>   # in `git merge p1-w3`, --theirs == p1-w3, --ours == integ
git add <path>
```
> Confirm `--theirs` is p1-w3 in your git before trusting it; when unsure, open the
> file and keep the p1-w3 content explicitly.

After step C, run the schema invariant from 4B(3):
`git grep aggregateRatingSchema` → **must be empty.** Step D (p1-w2) is docs only;
expect clean. If B or D touches an SEO/schema file, that is a **surprise** — stop
and inspect, do not auto-resolve.

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
      the individual branches, a merge silently ate tests (suspect the union-test
      resolutions 4B(5)–(7), esp. `tenant-query.test.ts`).
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
- **Test count dropped after §4:** re-open the union tests 4B(5)–(7) —
  `tenant-query.test.ts` first; you almost certainly over-deduped. The union must
  be a superset.
- **`escapeHtml` test fails on `&#039;` vs `&#39;`:** that is expected until you do
  the one-line normalization in 4B(4) — it is not a real regression.
- **A gated action feels necessary to unblock:** it isn't. Stop, report to LEADER,
  wait for Jeff. Nothing in re-integration requires a push, deploy, or prod write.
