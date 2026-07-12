# Cross-Lane Merge-Conflict Audit (Q-O1, FOR-JEFF-REVIEW)

**Status:** Read-only git analysis. **Nothing merged, nothing pushed.** This is a
map of where the 6 `p1-wN` lanes collide and a recommended integration order for
the eventual **GATED** integration. The leader runs the actual merges after Jeff
approves.

**Author:** W6, branch `p1-w6`, 2026-07-12.
**Method:** `git merge-base`, `git diff --name-only`, and real 3-way merge
simulation via `git merge-tree --write-tree --name-only` + `git commit-tree`
(no refs updated, no working tree touched — only dangling objects created).

---

## TL;DR

- All 6 lanes share a **common fork point** `2cca5da` (2026-07-10 22:02), which is
  itself **above** main's merge-base `669f588` (2026-07-10 19:15). The "70+ commits
  from main" figure is real but misleading for conflict analysis: the bottom
  ~segment is **shared history** identical across all lanes and merges trivially.
- Measuring each lane's **unique** work (vs the `2cca5da` fork), **162 files** are
  touched by more than one lane. Half of those (**81**) have byte-identical results
  across the touching lanes → they auto-merge. The other **81** genuinely diverge.
- Actual merge simulation: total conflict work is **~conserved at ~45 conflicted-file
  events regardless of order** — the divergences are inherent; order only decides
  *when* you pay and how concentrated each step is.
- The **dominant, unavoidable clash is w1 ↔ w3 = 21 files** (both are XSS/HTML-escape
  security lanes editing the same helpers). Whichever lands second pays that 21.
- **Recommended order: `w1 → w3 → w4 → w2 → w6 → w5`.** Hottest lane first (merges
  free), the big security clash concentrated into one deliberate step, the two
  near-identical clean lanes (w5/w6) last as ~free tail merges.

---

## 1. Branch topology (why "commits from main" overcounts conflicts)

```
main tip
  └─ 669f588  (2026-07-10 19:15)   = merge-base(main, every p1-wN)
        └─ … shared work …
             └─ 2cca5da (2026-07-10 22:02) = fork point of ALL 6 lanes
                  ├─ p1-w1  (204 unique files)
                  ├─ p1-w2  (194)
                  ├─ p1-w3  (304)
                  ├─ p1-w4  (112)
                  └─ 6a052a (2026-07-11 20:50) = extra shared point of w5+w6
                       ├─ p1-w5 (159)
                       └─ p1-w6 (133)
```

| Lane | commits ahead of main | unique files vs fork `2cca5da` | identity (tip subject) |
|------|----------------------:|-------------------------------:|------------------------|
| p1-w1 | 88 | 204 | XSS/HTML-email escape + seat-quantity tests |
| p1-w2 | 79 | 194 | tenantDB conversion (RLS scoping) |
| p1-w3 | 82 | 304 | JsonLd XSS + sitemap/SEO fixes |
| p1-w4 | 74 | 112 | selena authz / cross-tenant IDOR (audit-gate) |
| p1-w5 | 75 | 159 | tenant-client shared-lib conversion |
| p1-w6 | 72 | 133 | fleet hardening + deploy-prep docs |

**Consequence:** integrate against **main** (their true common ancestor is
`2cca5da`, so git will 3-way-merge correctly). Do **not** try to rebase lanes onto
each other first — the shared `669f588..2cca5da` segment is common and rebasing
would replay it needlessly.

---

## 2. Pairwise conflict matrix (real `merge-tree`, conflicted-file counts)

|        | w2 | w3 | w4 | w5 | w6 |
|--------|---:|---:|---:|---:|---:|
| **w1** | 5  | **21** | 8 | 3 | 3 |
| **w2** | –  | 1  | 5 | 0 | 0 |
| **w3** | –  | –  | 0 | 4 | 4 |
| **w4** | –  | –  | – | 1 | 1 |
| **w5** | –  | –  | – | – | 0 |

Total conflict involvement per lane (sum of its row+column):
**w1=40, w3=30, w4=15, w2=11, w5=8, w6=8.**

Reading:
- **w1 is the hot lane** and **w1↔w3 (21) is the single biggest clash** — both edit
  the same security-sensitive HTML-escape / schema files.
- **Clean pairs (0 conflicts):** w2↔w5, w2↔w6, w3↔w4, w5↔w6. w5 and w6 are
  near-twins (shared `6a052a` fork) and barely touch anything else.

---

## 3. The files that actually collide (ranked)

Frequency = number of the 15 lane-pairs in which the file conflicts.

| # pairs | File | Nature |
|--------:|------|--------|
| 5 | `platform/src/lib/escape-html.ts` | **security core.** w1/w5/w6 add the same ~18-line escaper; w3 adds a **different ~54-line** version. 3-way divergence on a shared XSS helper — resolve by hand, pick the superset. |
| 5 | `platform/src/app/api/team-portal/auth/route.ts` | **auth.** w5/w6 have a 35-line rewrite; w4 has an 8-line authz fix; w1 a 1-line change. Reconcile so w4's IDOR/authz fix survives the w5/w6 rewrite. |
| 3 | `platform/src/app/site/consortium-nyc/_lib/schema.tsx` | SEO/JSON-LD schema; w1/w3/w6 diverge. |
| 2 | `platform/src/app/site/template/_components/JsonLd.tsx` (+ `.test.tsx`) | w3's JsonLd XSS fix vs others. |
| 2 | `platform/src/app/dashboard/ai/page.tsx` | render/markdown path. |
| 2 | `platform/src/app/api/yinez/route.ts` | route logic. |
| 1 | 30+ other files (SEO `template/*` & `the-nyc-seo/*` pages, `*.test.ts` add/add, `email-templates.ts`, `notify.ts`, `client/login`, `webhooks/telegram`, `selena/agent-config-loader.ts`) | mostly mechanical: brand/SEO copy edits and add/add test files (union-mergeable). |

Note the recurring theme: the genuinely dangerous conflicts are the **security
files touched by multiple security lanes** (`escape-html.ts`, `team-portal/auth`,
`JsonLd.tsx`). The long tail is SEO content pages and test-file add/adds that are
low-risk to resolve but must not be blind-`-X ours`/`theirs`'d.

**Migrations are clean:** `062_add_tenant_id_inbound_emails.sql` and
`2026_07_11_team_member_payouts_unique.sql` appear in two lanes each but with
**identical** blobs — no migration-ordering conflict.

---

## 4. Integration-order simulation (measured, not guessed)

Each order simulated by merging lanes sequentially onto `main` with `merge-tree`,
feeding each step's result tree forward as the next base (`commit-tree`, no refs
touched). First lane in any order always merges free (0 conflicts).

| Order | per-step conflicts | total |
|-------|--------------------|------:|
| `5 6 2 4 3 1` (clean-first) | 0,0,0,6,5,**34** | 45 |
| **`1 3 4 2 6 5` (recommended)** | 0,**21**,8,10,6,0 | 45 |
| `3 1 2 5 6 4` | 0,21,6,6,0,13 | 46 |

Total is ~conserved — **order does not reduce total conflict work.** What it
changes is distribution. Clean-first (`5 6 2 4 3 1`) is the **worst UX**: it defers
w1 to last where it dumps **34 conflicts in one step** against a fully-loaded base.

---

## 5. Recommended integration order: `w1 → w3 → w4 → w2 → w6 → w5`

Exact conflicted files per step (from simulation):

- **+ w1 → 0.** Hottest lane merges free onto clean main. Base now has the
  XSS-escape + email-escape work.
- **+ w3 → 21.** The deliberate security-clash step. Files: `escape-html.ts`,
  `escape-html.test.ts`, `email-templates.ts`, `nycmaid/email-templates.ts`,
  `consortium-nyc/_lib/schema.tsx`, `the-nyc-marketing-company/_lib/schema.tsx`,
  `the-nyc-seo/page.tsx`, `the-nyc-interior-designer/page.tsx`, and ~13
  `template/*` SEO pages. **Do this as a focused review pass** — reconcile the two
  escapers into one superset, keep both lanes' JSON-LD hardening.
- **+ w4 → 8.** `team-portal/auth/route.ts`, `client/login/route.ts`, and 6
  `*.test.ts` files. **Verify w4's cross-tenant IDOR fix survives.**
- **+ w2 → 10.** `clients/route.ts`, `yinez/route.ts`, `webhooks/telegram/*`,
  `selena/agent-config-loader.ts`, invoice/quote checkout tests, add/add tests.
- **+ w6 → 6.** `team-portal/auth/route.ts` (again), `dashboard/ai/page.tsx`,
  `consortium-nyc/_lib/schema.tsx`, `JsonLd.tsx`+`.test.tsx`, `escape-html.ts`.
- **+ w5 → 0.** w5 is a near-twin of w6 sharing fork `6a052a`; once w6 is in the
  base its remaining changes are identical → free tail merge.

**Why this order:**
1. First-merge-free goes to the hottest lane (w1), removing its 34-conflict
   worst-case entirely.
2. w1↔w3's unavoidable 21-file clash is **isolated into one step, early**, while
   the base is still small and the diff is easiest to reason about. Both are
   security lanes, so a reviewer resolving them together has the full XSS picture.
3. Security-critical lanes (w1,w3,w4) land first and stabilize the base before the
   bulkier data/SEO lanes (w2) and the near-duplicate twins (w5,w6).
4. w5/w6 last = ~free, because their shared work is already in the base.

The 21-file w3 step is the practical **floor for the largest single step** — no
order avoids it, because w1 and w3 genuinely edit the same 21 files differently.

---

## 6. Gates / guardrails for the actual integration (leader runs these)

- After **each** lane merge: `npx tsc --noEmit` in `platform/` + run the touched
  test files before proceeding to the next lane. A green base per step keeps the
  blast radius one-lane-wide.
- **Never** blind-resolve security files (`escape-html.ts`, `team-portal/auth`,
  `JsonLd.tsx`) with `-X ours`/`-X theirs` — they need the *superset* of both
  lanes' hardening. A wrong side here silently reintroduces an XSS/IDOR hole.
- add/add `*.test.ts` conflicts are usually a union of both lanes' cases — keep
  both, dedupe identical `describe` blocks.
- This audit reflects branch tips as of 2026-07-12. If lanes advance before
  integration, **re-run the simulation** — the numbers move.

### Reproduce this audit

```bash
FORK=$(git merge-base p1-w1 p1-w2)          # 2cca5da, common to all 6
for w in 1 2 3 4 5 6; do git diff --name-only "$FORK"..p1-w$w; done \
  | sort | uniq -c | awk '$1>1'             # overlap list

# real conflicts, sequential onto main:
base=$(git rev-parse main)
for w in 1 3 4 2 6 5; do
  out=$(git merge-tree --write-tree --name-only "$base" "p1-w$w")
  tree=$(echo "$out" | head -1)
  echo "+w$w: $(echo "$out" | tail -n +2 | sed '/^$/q;/^$/d' | grep -c .) conflicts"
  base=$(git commit-tree "$tree" -p "$base" -p "p1-w$w" -m "integ w$w")
done
```
