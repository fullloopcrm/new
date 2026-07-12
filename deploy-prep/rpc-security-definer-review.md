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

## 3. Verdict

- **In-repo SECURITY DEFINER functions: 2, both already covered by planned migration 060.** No additional
  lockdown work identified beyond what w1 already scoped.
- **6 other `.rpc()` targets are unaudited** because they aren't defined in this repo — flagged as an open
  gap requiring live DB introspection, not something this file-only review can resolve.
- **The "26" figure in the LEADER order does not reconcile** with either the 25 call-site count, the
  8-distinct-name count, or the 2-SECURITY-DEFINER count found by grep in this worktree. Recommend the
  leader confirm where "26" originated (a different branch's migration set, or a live pg_proc count) before
  treating this review as covering the full stated scope.
