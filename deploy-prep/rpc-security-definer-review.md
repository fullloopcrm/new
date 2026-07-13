# RPC / SECURITY DEFINER Review (DOCS ONLY — no DB writes)

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-12
**Status:** read-only review of `w1-rpc-audit.md` plus an independent re-grep of this worktree. No DB
commands run, no credentials touched.

---

## 0. Correcting the premise before reviewing it

The LEADER order asked to review "the 26 `.rpc()` SECURITY DEFINER functions." That number does not
match what's actually in this repo, and the discrepancy matters for what this review can and can't claim:

- **`grep -rn "\.rpc(" platform/src` → 25 call sites**, across **8 distinct function names**:
  `comhub_get_or_create_contact_by_email`, `comhub_get_or_create_contact_by_phone`,
  `comhub_get_or_create_thread`, `cpa_token_bump_usage`, `post_journal_entry`,
  `seo_money_keywords`, `seo_refresh_rollup`, `seo_run_detection`.
- **`grep -rilE 'security[[:space:]]+definer' platform/src/lib/migrations` → only ONE migration file**,
  `039_atomic_ledger_and_hardening.sql`, defining exactly **2** SECURITY DEFINER functions
  (`post_journal_entry`, `cpa_token_bump_usage`) — this matches w1's audit exactly.
- **The other 6 RPC names** (`comhub_get_or_create_*` ×3, `seo_*` ×3) have **no `CREATE FUNCTION` in this
  repo's migrations at all** (`grep -rn "CREATE.*FUNCTION" platform/src/lib/migrations` finds no match
  for any of them, checked both the numbered `0NN_*.sql` and the date-prefixed `2026_07_*.sql` migrations).

So "26" doesn't correspond to distinct functions, SECURITY DEFINER functions, or call sites in this repo
as it exists on this branch. Two readings reconcile partially: it may be a stale count from a different
branch/lane's migrations, or a count that included Supabase-dashboard-created functions no worker can see
via grep. Either way, **this review can only speak authoritatively about the 2 functions actually defined
in-repo** (§1) and must flag the other 6 as an unaudited blind spot (§2) rather than silently reviewing
2 functions and calling it complete against a 26-function ask.

---

## 1. The 2 SECURITY DEFINER functions defined in-repo

Both are in `platform/src/lib/migrations/039_atomic_ledger_and_hardening.sql`. Findings below extend
w1's audit (`/tmp/w1-rpc-audit.md`, read this pass) rather than duplicate it — see that file for full
line-by-line detail; this section is the tenant-scope / search_path / lockdown-need checklist the LEADER
order asked for.

| Function | Tenant-scoped? | Pinned `search_path`? | `authenticated` grant reachable today? | Needs 060-style lockdown? |
|---|---|---|---|---|
| `post_journal_entry(...)` | **No** — trusts caller-supplied `p_tenant_id`/`p_entity_id`/`p_created_by` with zero check against `auth.uid()` or JWT claims (`039_...sql:14-83`) | **No** — no `SET search_path` clause | No (no `authenticated` Supabase JWTs are minted anywhere in `platform/src`; all in-app calls use `supabaseAdmin`/service_role) | **Yes — highest priority.** Cross-tenant ledger forgery the instant Supabase Auth is wired. |
| `cpa_token_bump_usage(text)` | **No** — bypasses RLS, not tenant-scoped, but gated by exact-token equality match, returns `VOID`, no data disclosure | **No** — no `SET search_path` clause | No (same reason) | **Yes, but low priority.** Worst case is `use_count` inflation on a token the caller already possesses. |

**This matches migration `060_lockdown_secdef_rpcs` already planned by w1** (per
`deploy-prep/branch-integration-plan.md:120`, `deploy-prep/phased-deploy-runbook.md:94`) — this review
finds no reason to add a third function to that migration's scope, and confirms both fixes w1 already
recommended:
1. `REVOKE EXECUTE ON FUNCTION post_journal_entry(...) FROM authenticated;`
2. `REVOKE EXECUTE ON FUNCTION cpa_token_bump_usage(text) FROM authenticated;`
3. `ALTER FUNCTION ... SET search_path = public, pg_temp;` on both.

No new migration file is authored here — 060 already covers this; duplicating it would create a
migration-number collision the branch-integration-plan explicitly worked to avoid.

---

## 2. The 6 RPC names with no in-repo definition — audit blind spot

`comhub_get_or_create_contact_by_email`, `comhub_get_or_create_contact_by_phone`,
`comhub_get_or_create_thread`, `seo_money_keywords`, `seo_refresh_rollup`, `seo_run_detection` are called
from `platform/src` via `.rpc(...)` but are not defined by any migration file in this repo. That means:

- Whether any of these 6 is `SECURITY DEFINER` is **unknown from the repo alone**.
- Whether any of these 6 is granted `EXECUTE` to `anon`/`authenticated` is **unknown from the repo alone**.
- Whether any of these 6 pins `search_path` is **unknown from the repo alone**.

This is the same blind spot w1 already flagged in their audit's cross-cutting note #3 (functions created
directly in the Supabase dashboard won't show up in a repo grep). This review cannot close that gap
without live database access, which is out of scope (file-only, no DB commands per LEADER order and per
standing rules). **Recommended one-time live introspection** (Jeff/leader, when convenient, read-only):

```sql
SELECT n.nspname, p.proname, p.prosecdef,
       (SELECT array_agg(grantee::text) FROM information_schema.role_routine_grants
        WHERE routine_name = p.proname AND privilege_type = 'EXECUTE') AS execute_grantees
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname IN (
  'comhub_get_or_create_contact_by_email', 'comhub_get_or_create_contact_by_phone',
  'comhub_get_or_create_thread', 'seo_money_keywords', 'seo_refresh_rollup', 'seo_run_detection'
);
```

If any of these 6 turns out to be `SECURITY DEFINER` with an `authenticated`/`anon` grant and no
tenant-scope check, it should be added to (or spawn a sibling of) migration 060 before Supabase Auth is
introduced — same latent-landmine shape as `post_journal_entry`. Until that query is run, treat all 6 as
**unverified, not cleared**.

---

## 3. Verdict (as of 2026-07-12, superseded by §4 below)

- **In-repo SECURITY DEFINER functions: 2, both already covered by planned migration 060.** No additional
  lockdown work identified beyond what w1 already scoped.
- **6 other `.rpc()` targets are unaudited** because they aren't defined in this repo — flagged as an open
  gap requiring live DB introspection, not something this file-only review can resolve.
- **The "26" figure in the LEADER order does not reconcile** with either the 25 call-site count, the
  8-distinct-name count, or the 2-SECURITY-DEFINER count found by grep in this worktree. Recommend the
  leader confirm where "26" originated (a different branch's migration set, or a live pg_proc count) before
  treating this review as covering the full stated scope.

---

## 4. Extension (2026-07-13) — the "6 unaudited" claim above was itself wrong. Corrected below.

Re-running this review to close the stated blind spot found **the original grep missed real definitions**,
for two separate reasons — both worth naming so the mistake isn't repeated:

1. **Case sensitivity.** The original pass ran `grep -rn "CREATE.*FUNCTION" platform/src/lib/migrations`
   — case-sensitive. Two of the "6 unaudited" functions are in fact defined in this repo, just written
   lowercase (`create or replace function`): `seo_run_detection`
   (`platform/src/lib/migrations/2026_07_04_seo_detection_fn.sql:4`, superseded by a second definition at
   `platform/src/lib/migrations/2026_07_05_seo_competitors.sql:119`) and `seo_money_keywords`
   (`platform/src/lib/migrations/2026_07_05_seo_competitors.sql:95`).
2. **Wrong directory scoped.** There is a **second, separate migrations tree** at `platform/migrations/`
   (distinct from `platform/src/lib/migrations/` — confirmed both exist independently, 40 files vs. 55),
   never grepped by the original pass. It defines two more of the "6 unaudited" functions:
   `comhub_get_or_create_contact_by_phone` and `comhub_get_or_create_thread`
   (both in `platform/migrations/2026_05_19_comhub.sql:242` and `:293`). File dates in this second tree
   run 2026-05-09 through 2026-07-08, i.e. **older** than most of `platform/src/lib/migrations/` — this
   looks like an earlier migrations convention that was later moved/renamed to `src/lib/migrations/` for
   new work without the old tree being merged or removed. No README or reference in either tree states
   which one is the applied/canonical source of truth for prod; this review cannot determine that from the
   repo alone and flags it as a **separate, new gap** (see §4c).

### 4a. Corrected classification of the original 8 RPC names

| Function | Defined in-repo? | Where | `SECURITY DEFINER`? | Pinned `search_path`? | `GRANT EXECUTE` to `authenticated`/`anon`? |
|---|---|---|---|---|---|
| `post_journal_entry` | Yes | `platform/src/lib/migrations/039_atomic_ledger_and_hardening.sql:14` | **Yes** | No | Yes, to `authenticated` (line 83) |
| `cpa_token_bump_usage` | Yes | `platform/src/lib/migrations/039_atomic_ledger_and_hardening.sql:86` | **Yes** | No | Yes, to `authenticated` (line 96) |
| `seo_run_detection` | Yes (newly found) | `platform/src/lib/migrations/2026_07_04_seo_detection_fn.sql:4`, redefined `2026_07_05_seo_competitors.sql:119` | **No** (plain `language plpgsql`, no `SECURITY DEFINER` clause — defaults to INVOKER) | No | No `GRANT EXECUTE` statement found anywhere for it — default Postgres grant model applies (owner + any role the DB's default `PUBLIC` execute grant covers, typically revoked by Supabase's standard setup but **not independently confirmed** here) |
| `seo_money_keywords` | Yes (newly found) | `platform/src/lib/migrations/2026_07_05_seo_competitors.sql:95` | **No** (`language sql stable`, no `SECURITY DEFINER`) | No | Same as above — no explicit grant found |
| `comhub_get_or_create_contact_by_phone` | Yes (newly found, second migrations tree) | `platform/migrations/2026_05_19_comhub.sql:242` | **No** (`language plpgsql`, no `SECURITY DEFINER`) | No | No explicit grant found |
| `comhub_get_or_create_thread` | Yes (newly found, second migrations tree) | `platform/migrations/2026_05_19_comhub.sql:293` | **No** | No | No explicit grant found |
| `comhub_get_or_create_contact_by_email` | **Still not found anywhere in-repo** — searched both migrations trees and the whole worktree (`grep -rn` for the literal name, all `.sql` files, no node_modules) | — | Unknown | Unknown | Unknown |
| `seo_refresh_rollup` | **Still not found anywhere in-repo** — same repo-wide search | — | Unknown | Unknown | Unknown |

### 4b. Why the 4 newly-found functions don't need a 060-style lockdown (different from the original 2)

`seo_run_detection`, `seo_money_keywords`, `comhub_get_or_create_contact_by_phone`, and
`comhub_get_or_create_thread` are **not** `SECURITY DEFINER` — Postgres defaults every function to
`SECURITY INVOKER` unless the clause is explicitly added, and none of these four has it. That means they
run with the privileges of whichever role calls them. Every in-repo call site for all four goes through
`supabaseAdmin.rpc(...)` (service-role client — confirmed by re-grepping the 25 call sites in §0), so in
practice they already run at service-role privilege regardless of INVOKER/DEFINER, same as any other
service-role query. **This is a materially different risk shape than `post_journal_entry` /
`cpa_token_bump_usage`**, which combine `SECURITY DEFINER` *with* an explicit `GRANT EXECUTE ... TO
authenticated` — meaning THOSE two are reachable by a normal authenticated JWT holder today if Supabase
Auth (not just service-role) is ever wired up for an end-user session, bypassing whatever the invoking
role's own RLS would have restricted. The 4 newly-found functions have no such grant to `authenticated`
found anywhere in either migrations tree, so the "authenticated JWT could call this and bypass tenant
scoping" attack shape does not apply to them today. **Lower-priority residual gap that does still apply:**
none of the 4 pins `search_path`, which is a `060`-adjacent hardening best practice (prevents a
same-named function/object earlier in a manipulated `search_path` from being called instead) even for
INVOKER functions — worth folding into `060`'s pinning pass as a cheap addition, but not the
privilege-escalation-severity issue the original 2 are.

### 4c. Genuinely still-open gaps (narrower than the original "6 unaudited")

1. **`comhub_get_or_create_contact_by_email` and `seo_refresh_rollup`** — still zero in-repo definition
   after searching both migrations trees and the full worktree. The live DB introspection query in §2
   above remains the only way to close this for these two specifically (query updated below to drop the
   4 now-resolved names).
2. **New gap this pass surfaced: two parallel, unreconciled migrations trees** (`platform/migrations/` and
   `platform/src/lib/migrations/`). Whichever one is NOT the source actually applied to prod is a second,
   independent blind spot beyond individual function audits — if `platform/migrations/` is stale/dead,
   fine; if it's still being applied by some process this review didn't find (a separate deploy script,
   a manual `psql` habit, etc.), then this repo's migration history is split across two trees and neither
   `branch-integration-plan.md` nor `gated-wave-plan.md`'s migration-numbering collision notes account for
   that. **Recommend Jeff/leader confirm which tree (or both) is live** before Wave 2 proceeds — this is a
   process question this file-only review cannot resolve alone.

Updated live-introspection query (only the 2 still-unresolved names, per item 1 above):

```sql
SELECT n.nspname, p.proname, p.prosecdef,
       (SELECT array_agg(grantee::text) FROM information_schema.role_routine_grants
        WHERE routine_name = p.proname AND privilege_type = 'EXECUTE') AS execute_grantees
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname IN ('comhub_get_or_create_contact_by_email', 'seo_refresh_rollup');
```

### 4d. Revised verdict

- **In-repo SECURITY DEFINER functions: still 2** (`post_journal_entry`, `cpa_token_bump_usage`), both
  already covered by planned migration `060`. No third SECURITY DEFINER function was found by this
  extended pass.
- **4 more `.rpc()` targets are now confirmed in-repo** (not unaudited as previously stated) — all 4 are
  `SECURITY INVOKER`, none has an `authenticated`/`anon` grant, so none needs `060`-style lockdown; all 4
  would still benefit from `search_path` pinning as a low-priority addition (§4b).
- **Only 2 of the original 8 RPC names remain genuinely unauditable from the repo** (down from 6):
  `comhub_get_or_create_contact_by_email`, `seo_refresh_rollup`. The live-introspection ask in §4c item 1
  is narrower and cheaper to run than the original 6-name query.
- **New process-level gap identified:** two unreconciled migrations trees (§4c item 2) — flagged for
  Jeff/leader, not resolvable by grep alone.
