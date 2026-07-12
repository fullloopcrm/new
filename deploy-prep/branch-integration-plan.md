# Branch Integration Plan — merging p1-w1..w6 into main safely

**Status:** Read-only git analysis. **Nothing merged, nothing pushed, no refs
touched.** This is the concrete, ordered execution plan for the eventual GATED
integration. The leader (or Jeff) runs the actual merges after approval.

**Author:** W6, branch `p1-w6`, 2026-07-12. Builds directly on
[`cross-lane-merge-conflict-audit.md`](./cross-lane-merge-conflict-audit.md)
(Q-O1) — that doc has the full pairwise conflict matrix and per-step
conflicted-file simulation; this doc adds the file-touch map, the
cherry-pick-vs-full-integration classification, migration-numbering safety,
and a step-by-step runbook. Read Q-O1 first if you haven't.

---

## 0. TL;DR

- **Recommended merge order (unchanged from Q-O1, re-verified):**
  `w1 → w3 → w4 → w2 → w6 → w5`. Total conflict work is ~conserved at ~45
  conflicted-file events regardless of order; this order concentrates the
  unavoidable w1↔w3 clash (21 files) into one early, deliberate step instead
  of a 34-file dump at the end.
- **A prior partial integration attempt already exists:** branch
  `integ/wave2-2026-07-11` (172 commits ahead of main, not fully merging any
  of the 6 lanes — it stopped roughly 20-30% into each lane around
  2026-07-11). It already resolved the `escape-html.ts` apostrophe-encoding
  conflict (commit `e79d67eb`) and green-lit Stage-0 auth-route tests
  (`dfa67c57`). **Do not redo that resolution from scratch — inspect it as a
  worked example before re-resolving `escape-html.ts` in step 2.** See §5.
- **Two independent duplicate fixes exist for the same bugs**, implemented
  separately in two lanes each. These need dedup, not a 3-way merge pick:
  `x-tenant-sig` forgery on `/api/yinez` (w3 `016ee7d7` vs w4 `b1f84ca3`),
  and unscoped `inbound_emails` (w3 `42b5a39c` vs w4 `8255a3c8`, migration
  `062_add_tenant_id_inbound_emails.sql` byte-identical in both). See §4.
- **No migration-number collisions.** w1 owns 055-057/059/060/063, w2 owns
  058/061, w3+w4 both add 062 with byte-identical content (verified `diff`,
  clean union merge). Full numbering map in §3.
- A small set of commits are genuinely safe to **cherry-pick standalone**
  ahead of the full integration if Jeff wants an early narrow hotfix wave —
  see §6 for the list and why each qualifies.

---

## 1. Per-lane file-touch map

Counted vs the shared fork point `2cca5da` (all 6 lanes' common ancestor;
see Q-O1 §1 for why this is the correct base, not `main` directly).

| Lane | unique files | api-routes | lib/ | site-pages | deploy-prep docs | tests | other |
|------|-------------:|-----------:|-----:|-----------:|------------------:|------:|------:|
| p1-w1 | 204 | 41 | 106 | 46 | 15 | ~30 embedded in lib/api counts | 5 |
| p1-w2 | 194 | 165 | 30 | 0 | 9 | mostly embedded in api-routes | 7 |
| p1-w3 | 304 | 4 | 35 | 233 | 21 | embedded in site-pages | 20 |
| p1-w4 | 112 | 56 | 43 | 0 | 16 | embedded in api/lib | 5 |
| p1-w5 | 159 | 10 | 76 | 62 | 23 | 2 standalone | 4 |
| p1-w6 | 133 | 16 | 11 | 62 | 37 | 5 standalone | 12 |

Reading (what each lane's shape tells you about integration risk):
- **w1** is the broadest lane (persona-wiring `feat` commits × 22 are
  additive/independent per-tenant config files — low conflict risk despite
  the volume) **plus** the security-core fixes (`escape-html.ts`, SSRF
  guard, `.or()` sanitization) that make it the conflict hub. The persona
  commits and the security commits are separable in principle but ship as
  one linear history — full-lane integration, not cherry-pick (see §4).
- **w2** is almost entirely `api-routes/` — the `tenantDb()` conversion
  campaign (67+ sequential commits converting one route at a time, tracked
  with running "N/498 converted" progress docs). This is **the most
  order-dependent lane**: later commits assume earlier conversions landed.
  Must integrate as a full contiguous unit.
- **w3** is almost entirely `site-pages/` (SEO/sitemap sweep across every
  tenant site) plus the JSON-LD XSS fix that collides with w1's escaper.
  The SEO sweep itself is mechanical and low-risk; the security commits
  embedded in it are the hazard.
- **w4** is the most cherry-pick-friendly lane by shape: almost every commit
  is a single-purpose `fix(security)` + its own `test(isolation)` regression
  commit immediately after. See §6.
- **w5** is explicitly **unwired, reversible** proof-of-conversion scaffolding
  for a `tenantClient()` RLS-scoping campaign — every commit says so in its
  message. None of it is live-wired to production routes yet. Low merge risk
  (mostly new test files), but it delivers zero runtime behavior change until
  a separate wiring pass happens (not part of this plan).
- **w6** (this lane) is almost entirely `deploy-prep/` docs and narrow
  regression-guard tests (response-header guard, error-leakage guard,
  console.* ban, `.or()` injection guard) — no route/lib rewrites. Cheapest
  lane to integrate; conflicts only where it touches `escape-html.ts`,
  `team-portal/auth/route.ts`, `dashboard/ai/page.tsx`, `JsonLd.tsx` (all
  already covered by w1/w3/w4's resolution work, so w6 rides in after them
  for free per Q-O1's simulation).

---

## 2. Conflict hotspots (synthesis of Q-O1 §2-3)

| File | Pairs in conflict | What's actually different | Resolution rule |
|---|---|---|---|
| `platform/src/lib/escape-html.ts` | 5 | w1/w5/w6 add an ~18-line escaper; w3 adds a different ~54-line version | **Take the superset.** w3's version is broader (handles more entity classes) — verify it covers everything w1's 18-line version does, keep w3's, re-point w1/w5/w6 callers at it. `integ/wave2` already worked through the apostrophe-encoding edge case here (`e79d67eb`) — check that resolution before redoing it. |
| `platform/src/app/api/team-portal/auth/route.ts` | 5 | w5/w6 have a 35-line rewrite (PIN throttle + widen); w4 has an 8-line authz/IDOR fix; w1 a 1-line change | **w4's fix must survive** — it's a real cross-tenant auth hole, not a style change. Layer it onto the w5/w6 rewrite, don't let `-X theirs` silently drop it. |
| `.../consortium-nyc/_lib/schema.tsx`, `.../the-nyc-marketing-company/_lib/schema.tsx` | 3 | w1/w3/w6 diverge on JSON-LD schema content + the AggregateRating-removal fix (w3) | Keep w3's fabricated-rating removal (it's a legal/trust fix, see w3 commit `a604b132`), reconcile copy on top. |
| `.../template/_components/JsonLd.tsx` (+`.test.tsx`) | 2 | w3's `safeJsonLd` XSS hardening vs others' unrelated edits | Keep w3's hardening; it's the fix, not a stylistic alternative. |
| `platform/src/app/dashboard/ai/page.tsx` | 2 | render/markdown path — w6 has the reflected-XSS escape fix | Keep w6's escape; verify markdown rendering still works after. |
| `platform/src/app/api/yinez/route.ts` | 2 | **duplicate fix**, not a real conflict — see §4 | Take either lane's implementation, drop the other, keep both lanes' tests. |
| 30+ SEO/test add-adds | 1 each | mostly brand/SEO copy + add/add test files | Union-mergeable, but do **not** blind `-X ours`/`-X theirs` — read each before accepting (Q-O1 §6). |

Migrations: **clean.** `062_add_tenant_id_inbound_emails.sql` (w3+w4,
byte-identical, verified this session) and
`2026_07_11_team_member_payouts_unique.sql` both auto-merge.

---

## 3. Migration numbering map (no collisions, verified this session)

```
055  w1  tenant_domains_routing (+ .backfill, .verify)
056  w1  tenant_domains_routing_enforce
057  w1  freeze_tenants_domain / unfreeze_tenants_domain
058  w2  fix_nycmaid_routing
059  w1  backfill_vercel_project
060  w1  lockdown_secdef_rpcs
061  w2  unique_journal_entries
062  w3+w4  add_tenant_id_inbound_emails  ← same lane fork-point, byte-identical, free union
063  w1  nycmaid_routing_reconcile (+ .verify)
```

Sequential 055→063, zero gaps, zero number reuse with divergent content. Run
each migration's own `.verify.sql` after applying (per-migration verify
files already exist for 055 and 063). This is a read-only observation — the
leader still runs the actual DDL after Jeff approves, per standing rules.

---

## 4. Duplicate fixes: same bug, two independent implementations

These are **not** merge conflicts in the git sense (the files may not even
overlap) — they're two lanes independently fixing the same vulnerability
without knowing about each other. A 3-way merge will happily keep both
implementations, which is wasteful and can leave two slightly-different
guards guarding the same code path. Reconcile explicitly:

1. **`x-tenant-sig` forgery on `/api/yinez`** — w3 `016ee7d7` "verify
   x-tenant-sig on /api/yinez (close forgeable-header tenant leak)" vs w4
   `b1f84ca3` "verify x-tenant-sig on /api/yinez (close forgeable-header
   tenant leak)" — **identical commit message**, independently authored.
   Diff the two implementations before picking one; keep whichever's test
   coverage is more complete (w4 also has `f790b602` "W4 independent
   regression for yinez sig + inbound-email scoping").
2. **Unscoped `inbound_emails` row leak** — w3 `42b5a39c` vs w4 `8255a3c8`,
   same title. Same reconciliation: diff, pick one, keep the union of tests.
   The migration (`062_...`) is already byte-identical so at least the DDL
   side needs no decision.

Both pairs land in the w4 step of the recommended order (step 3, after
w1+w3 are in the base) — that's exactly when this reconciliation should
happen, since both sides of each duplicate are already present.

---

## 5. Prior integration attempt: `integ/wave2-2026-07-11`

A branch already exists that started this exact task and stopped partway:

- 172 commits ahead of `main`, but **none of the 6 `p1-wN` lanes are fully
  merged into it** (`git merge-base --is-ancestor p1-wN integ/wave2-...`
  fails for all 6, verified this session).
- It reaches only the early portion of each lane (merge commits pull in
  individual commits like `7fd21a1b` (w2), `da64f6c1` (w3), `53a28aee`
  (w1), `771a15af` (w4) — roughly the first quarter to third of each lane's
  history, dated around 2026-07-11).
- It already contains the `security-fixes-integration` cluster (4 merged
  hotfix branches: `fix-email-escape-w1`, `fix-aixss-w1`, `fix-pin-w3`,
  `fix-payout-w2`, squashed as `62623a8d`) plus the consortium-nyc SEO
  retarget sweep — the same commits that later became the shared w5/w6 fork
  point `6a052a58` (see Q-O1 §1). **These are not on `main`** (verified:
  `git merge-base --is-ancestor 62623a8d main` fails) despite the `[deploy]`
  tags — they were staged for a deploy that didn't happen from this branch.
- It has 4 of its own reconciliation commits worth reading before you
  re-resolve the same conflicts: `e79d67eb` (escape-html.ts apostrophe
  encoding — the exact w1↔w3 escaper conflict from §2), `3aa4d786`
  (restored a `failClosed` lockout guard that a merge had accidentally
  weakened — a good example of the "verify the security fix survives"
  discipline this plan calls for elsewhere), `fbe36df0` and `dfa67c57`
  (test-mock green-up after the merges).

**Recommendation:** before starting step 2 (the w1↔w3 escape-html.ts
reconciliation) in the real integration, `git show e79d67eb` and
`git log integ/wave2-2026-07-11` to see how far that attempt got and whether
its resolution can be ported instead of redone. It is NOT a substitute for
this plan (it's stale — it stopped before ~70% of each lane's work existed),
but it's free prior art for the hardest single step.

Two other narrow branches already extracted single fixes and are ready to
inspect as cherry-pick precedent (both sit directly on the shared w5/w6 fork,
28 and 27 commits ahead of main respectively, not yet on main):
`hotfix/selena-idor` (adds exactly 2 commits: a witness test + the
cross-tenant IDOR fix for `/api/selena?convoId`) and
`hotfix/tcpa-sms-consent` (adds exactly 1 commit: the TCPA opt-out
`sms_consent` vs `sms_opt_in` fix). These mirror the same fixes present
inside w4/w5's full history — another dedup point to check in step 3/6.

---

## 6. Cherry-pick-safe vs needs-full-lane-integration

### Safe to cherry-pick standalone (small, single-purpose, own test, low blast radius)

These could go out as an early narrow hotfix wave ahead of the full 6-lane
integration if Jeff wants faster coverage on specific holes. Each is judged
safe because it's 1 file + 1 test, doesn't depend on earlier commits in its
own lane, and doesn't touch a file in the §2 hotspot table:

- w4 `017043fa` scope booking reschedule/cancel to caller + per-tenant owner check
- w4 `a7614f7e` telnyx-voice ed25519 signature verify + derive tenant from DID
- w4 `be8e1c1e` telegram webhook `X-Telegram-Bot-Api-Secret-Token` fail-closed
- w4 `c8976a6f` scope client/recurring + preferred-cleaner to caller (IDOR)
- w4 `d66219e2` auth team-portal/messages via bearer token, not caller id (IDOR)
- w4 `de516e18` authenticate + scope team-portal/15min-alert (IDOR)
- w4 `90af6b98` rate-limit portal/auth verify_code (OTP brute-force)
- w4 `ecfb6c60` client/login per-tenant lockout for distributed PIN spray
- w4 `49f8f5e2` referrers/auth/request use crypto RNG for login OTP
- w4 `ffa048ae` client/verify-code exact phone match (not `endsWith`)
- w2 `63eedce0` scope portal `verify_code` to resolved tenant (cross-tenant auth)
- `hotfix/selena-idor` and `hotfix/tcpa-sms-consent` branches (§5) — already
  isolated, literally ready to fast-forward-merge onto `main` today pending
  Jeff's go-ahead; they don't depend on anything else in this plan.

**Caveat:** cherry-picking ahead of the full integration means these commits
land on `main` twice conceptually (once now, once again as part of their
home lane's eventual merge) — when the home lane merges later, git will see
the same diff already applied and it'll no-op cleanly *if the cherry-pick
was clean*, but confirm with `git log --grep` on the target commit message
before the full-lane merge to avoid a duplicate/conflicting reapply.

### Needs full-lane integration (order-dependent, cannot be safely split)

- **w1's persona-wiring commits (22 of them)** and **the P1-schema
  migrations (055-060, 063)** — later commits assume earlier schema state;
  splitting them risks a route referencing a column that isn't backfilled
  yet.
- **w2's entire `tenantDb()` conversion campaign** — explicitly sequential
  (progress-tracked "N/498 converted"), later routes may share helpers
  touched by earlier commits in the same campaign.
- **w3's SEO/sitemap sweep** — low individual risk per file, but 233 files
  is impractical to cherry-pick piecemeal; take as a lane.
- **w5's `tenantClient()` proof-of-conversion suite** — internally
  consistent as a body of evidence (each commit documents a load-bearing
  ordering hazard for the *next* commit's route, e.g. the `team_members`
  tier-gap flagged across 6+ commits); splitting it loses the cross-commit
  reasoning trail that the real wiring pass will need.
- **w6's compliance docs (P7-P14) and deploy-prep docs generally** — these
  are documentation, not code; "integration" for these is just merging the
  `deploy-prep/` and `docs/compliance/` directories, which is close to
  conflict-free (Q-O1: w6 total conflict involvement = 8, the lowest of all
  6 lanes).

---

## 7. Step-by-step runbook

Same order as Q-O1 §5 (`w1 → w3 → w4 → w2 → w6 → w5`), expanded with the
dedup/verification work from this doc:

1. **Branch off `main`** into a scratch integration branch (not `main`
   itself, not any existing `p1-wN` worktree).
2. **Merge w1.** Free (0 conflicts, per Q-O1 simulation). `npx tsc --noEmit`
   + run w1's own test files.
3. **Merge w3 → resolve the 21-file clash** (escape-html.ts,
   escape-html.test.ts, email-templates.ts×2, 4 schema/JsonLd files, ~13 SEO
   template pages). Check `integ/wave2-2026-07-11`'s `e79d67eb` first (§5).
   Take the escaper superset rule from §2. `npx tsc --noEmit` + full test
   run before proceeding — this is the highest-risk step, don't compound
   errors into w4.
4. **Merge w4 → resolve 8 files** (`team-portal/auth/route.ts`,
   `client/login/route.ts`, 6 test files). Verify w4's IDOR/authz fix
   literally survives the diff (read the merged file, don't trust a clean
   auto-merge). **Also do the §4 dedup here**: diff w3's vs w4's
   `/api/yinez` and `inbound_emails` fixes, pick one, keep both test suites.
5. **Merge w2 → resolve 10 files** (`clients/route.ts`, `yinez/route.ts`
   — should already be reconciled from step 4 — `webhooks/telegram/*`,
   `selena/agent-config-loader.ts`, checkout/quote tests, add/add tests).
6. **Merge w6 → resolve 6 files** (`team-portal/auth/route.ts` again,
   `dashboard/ai/page.tsx`, `consortium-nyc/_lib/schema.tsx`,
   `JsonLd.tsx`+test, `escape-html.ts`). Mostly re-touching files already
   reconciled in steps 3-4 — verify no regression, don't re-litigate.
7. **Merge w5.** Free tail merge (w5/w6 share fork `6a052a`, remaining w5
   diff doesn't collide with anything already merged).
8. **Final gate:** full `npx tsc --noEmit`, full test suite, re-run the
   `.verify.sql` for each of the 9 migrations in §3 order, spot-check the
   §2 hotspot files by eye one more time.

At every step: never blind-resolve a security file with `-X ours`/`-X
theirs` (Q-O1 §6) — a wrong side silently reintroduces an XSS/IDOR hole that
the test suite may not catch if the corresponding regression test lives in
the *other* lane and got dropped in the same bad resolution.

---

## 8. What this doc does not cover

- Actual conflict-resolution diffs (this is a plan, not the resolution
  itself — do that live, at merge time, referencing §2's rules).
- Whether to squash each lane's history or preserve it — Jeff's call: the
  measured conflict counts hold either way since `merge-tree` operates on
  trees, not commit graphs.
- Post-merge deploy sequencing (covered by w3's `phased A->B->C->D deploy
  runbook`, `deploy-prep/*.md`, and the migration-run-order pack — link,
  don't duplicate).
- w5's `tenantClient()` **wiring** (turning the unwired proof-of-conversion
  tests into live route swaps) — that's separate follow-on work after this
  integration lands, gated on the `team_members`/`service_types`/etc. RLS
  tier gaps w5 itself flags.

### Reproduce the numbers in this doc

```bash
FORK=$(git merge-base p1-w1 p1-w2)
# file-touch map (§1):
for w in 1 2 3 4 5 6; do
  git diff --name-only "$FORK"..p1-w$w | wc -l
done
# migration numbering (§3):
for w in 1 2 3 4 5 6; do
  git diff --name-only --diff-filter=A "$FORK"..p1-w$w -- 'platform/src/lib/migrations/0*.sql'
done
# duplicate-fix identity check (§4):
diff <(git show p1-w3:platform/src/lib/migrations/062_add_tenant_id_inbound_emails.sql) \
     <(git show p1-w4:platform/src/lib/migrations/062_add_tenant_id_inbound_emails.sql)
# prior-attempt reach (§5):
git log main..integ/wave2-2026-07-11 --merges --oneline
for w in 1 2 3 4 5 6; do git merge-base --is-ancestor "p1-w$w" integ/wave2-2026-07-11 && echo "w$w merged" || echo "w$w NOT merged"; done
```
