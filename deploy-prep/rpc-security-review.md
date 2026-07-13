# SECURITY DEFINER `.rpc()` review — p1-w4

**Author:** W4 · file-only, analysis only, no DDL/push/deploy/DB · 2026-07-12
**Scope:** every Postgres function reachable via Supabase `.rpc()` from the app,
plus every repo-defined `SECURITY DEFINER` function. Static/read-only audit.

## 0. Read this first — branch-content gap

The LEADER order describes "26 `.rpc()` SECURITY DEFINER functions" and
references `w1-rpc-audit.md`. Neither matches what's actually on **this**
branch (`p1-w4`):

- **`grep -rn "\.rpc(" platform/src` on p1-w4 returns ZERO matches.** This
  branch has no call sites at all.
- **Only one migration file defines `SECURITY DEFINER` functions on p1-w4:**
  `platform/src/lib/migrations/039_atomic_ledger_and_hardening.sql`, containing
  exactly **two** functions (`post_journal_entry`, `cpa_token_bump_usage`) —
  not 26.
- No `deploy-prep/w1-rpc-audit.md` exists on p1-w4, p1-w1, p1-w2, p1-w3, p1-w5,
  p1-w6, or main. The closest existing document is
  **`deploy-prep/security-definer-rpc-audit.md` on branch `p1-w3`** (author:
  W3), which independently reaches the same two-function conclusion via the
  same grep. I treat that as the likely intended reference and have
  cross-checked against it below.
- **Sibling branches (`p1-w1`, `p1-w2`, `p1-w3`, `p1-w5`, `p1-w6`, `main`) each
  carry ~25–26 `.rpc()` call sites** (8 distinct function names) that do not
  exist on p1-w4 — this branch was cut before that RPC-based work landed, or
  it landed on a different lane. **This is a merge/integration item for the
  leader**, not something a static audit of p1-w4 alone can resolve: once this
  branch integrates with the others, the call sites and their target
  functions need a fresh pass.
- **`p1-w1` already has a prepared (not yet run) remediation migration**,
  `platform/src/lib/migrations/060_lockdown_secdef_rpcs.sql`, that locks down
  the exact two functions below (revokes `authenticated`/`PUBLIC` EXECUTE,
  keeps `service_role`, pins `search_path`). It is **absent from p1-w4**. I
  have not copied it into this branch (out of scope for a file-only,
  non-gated analysis task on p1-w4 — the leader should decide whether to
  cherry-pick it forward or let it arrive via normal branch integration).

Everything below is scoped to what is verifiably true for **p1-w4** today,
with sibling-branch context clearly labeled as such.

---

## 1. Repo-defined SECURITY DEFINER functions (p1-w4) — full list

Two functions, both in `039_atomic_ledger_and_hardening.sql`. `SECURITY
DEFINER` means each runs with the **function owner's** privileges and
**bypasses RLS** — the two things that matter for every such function are (a)
whether it re-derives/re-checks the tenant itself rather than trusting a
caller-supplied value, and (b) whether `search_path` is pinned (unpinned is a
known Postgres privilege-escalation vector for DEFINER functions).

### 1.1 `post_journal_entry(p_tenant_id, p_entity_id, p_entry_date, p_memo, p_source, p_source_id, p_created_by, p_lines)` — `039:14`

| Check | Result |
|---|---|
| Who can EXECUTE | `authenticated`, `service_role` (`039:83`) |
| Tenant source | Caller-supplied `p_tenant_id`, written verbatim into `journal_entries.tenant_id` / `journal_lines.tenant_id` |
| Internal tenant re-check | **None** — no comparison against the JWT `tenant_id` claim, no membership check |
| `search_path` pinned | **No** — references unqualified `entities`, `journal_entries`, `journal_lines` |
| **Cross-tenant risk** | **HIGH.** Because it is `SECURITY DEFINER` (bypasses RLS) *and* granted to `authenticated`, any authenticated end user can call `post_journal_entry(<victim tenant id>, …)` directly over PostgREST (`/rest/v1/rpc/post_journal_entry`) with a self-balancing set of lines and write forged journal entries into another tenant's ledger. The only server-side constraint (deferred trigger) checks debits==credits, not tenant ownership — it does not stop this. |
| Mitigating fact (not a fix) | On every branch I can see, the app only ever calls this via `service_role` (`supabaseAdmin`) with a server-resolved `p_tenant_id` — but that's an app-layer habit, not a DB-layer guarantee. The `authenticated` grant is a live, directly-reachable hole independent of any app bug, and it exists on p1-w4 right now (migration 039 is present here). |
| **Recommended lockdown** | `REVOKE EXECUTE ... FROM authenticated, PUBLIC; GRANT EXECUTE ... TO service_role;` and pin `SET search_path = public, pg_temp`. (Optionally, also add an in-function assertion rejecting the call when a JWT `tenant_id` claim is present and differs from `p_tenant_id`, as defense-in-depth beyond the grant revoke.) This is exactly what `060_lockdown_secdef_rpcs.sql` on p1-w1 already does — see §0. |

### 1.2 `cpa_token_bump_usage(p_token TEXT)` — `039:86`

| Check | Result |
|---|---|
| Who can EXECUTE | `authenticated`, `service_role` (`039:96`) |
| Tenant source | No tenant column — keyed by the bearer `p_token` itself (possession of the token is the authz) |
| Internal tenant re-check | N/A |
| `search_path` pinned | **No** — references unqualified `cpa_access_tokens` |
| **Cross-tenant risk** | **LOW.** Not a cross-tenant data hole (you must already hold/guess the token, and the only effect is bumping `use_count`/`last_used_at`). Residual: an authenticated caller who knows or brute-forces a token could inflate its use counter, which matters only if a use-cap is ever enforced on that column. |
| **Recommended lockdown** | Same shape as 1.1 for hardening consistency: `REVOKE ... FROM authenticated, PUBLIC; GRANT ... TO service_role; ALTER FUNCTION ... SET search_path = public, pg_temp;` — lower urgency than 1.1 since the exploit ceiling is much smaller. |

### 1.3 Everything else — SECURITY INVOKER (default), not flagged

No other `CREATE FUNCTION` in p1-w4's 74 migration files carries a `SECURITY
DEFINER` clause, so the remaining functions run as the calling role and RLS
applies normally (trigger functions, `count_errors_by_severity`,
`seo_run_detection`, `seo_money_keywords`, etc. — same inventory p1-w3's audit
lists in its §1.3).

---

## 2. Sibling-branch `.rpc()` call sites — reference only, NOT present on p1-w4

For completeness (this is almost certainly the "26" the leader's order is
pointing at), here is every distinct function name called via `.rpc(...)` on
`p1-w1` (26 call sites total, 8 distinct names — p1-w2/p1-w3/p1-w5/p1-w6/main
carry ~25 of the same set):

| Function | Call sites (p1-w1) | Repo-defined? | SECURITY DEFINER? |
|---|---|---|---|
| `comhub_get_or_create_thread` | 9 | Yes — `platform/migrations/2026_05_19_comhub.sql` | No (`LANGUAGE plpgsql`, no DEFINER clause) |
| `comhub_get_or_create_contact_by_phone` | 7 | Yes — same file | No |
| `comhub_get_or_create_contact_by_email` | 4 | **Not found in any repo copy checked** (p1-w1, comhub-fold-inbox, main) | **Unknown** — likely Supabase-dashboard-defined; can't verify statically |
| `seo_run_detection` | 1 | Yes | No (per p1-w3 audit §1.3) |
| `seo_refresh_rollup` | 1 | **Not found in any repo copy checked** | **Unknown** — likely Supabase-dashboard-defined |
| `seo_money_keywords` | 1 | Yes | No (per p1-w3 audit §1.3) |
| `post_journal_entry` | 1 | Yes (039, this branch too) | **Yes — see §1.1** |
| `cpa_token_bump_usage` | 1 | Yes (039, this branch too) | **Yes — see §1.2** |

Two names (`comhub_get_or_create_contact_by_email`, `seo_refresh_rollup`) have
call sites but no matching `CREATE FUNCTION` anywhere in the repo I could
search — same caveat p1-w3's audit raised: functions created directly in the
Supabase dashboard are invisible to a file grep. Their actual
`SECURITY DEFINER` status and grants are **unknown** from static analysis.

---

## 3. Recommendation

1. **Definitive answer requires the live enumeration query** (needs
   `SUPABASE_ACCESS_TOKEN_FULLLOOP`, which this worktree doesn't have — same
   blocker p1-w3 hit):

   ```sql
   select n.nspname as schema, p.proname as function,
          pg_get_function_identity_arguments(p.oid) as args,
          p.prosecdef as security_definer,
          (p.proconfig::text like '%search_path%') as search_path_pinned
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where p.prosecdef and n.nspname not in ('pg_catalog','information_schema')
   order by 1,2;
   ```

   This is the only way to catch dashboard-defined functions (including the
   two unresolved names in §2) and confirm `search_path` pinning platform-wide.

2. **`post_journal_entry` is the one HIGH item that matters regardless of
   which branch ships**: it's present, unlocked-down, and reachable by
   `authenticated` on p1-w4 right now. The fix is already written and tested
   as a migration file (`060_lockdown_secdef_rpcs.sql` on p1-w1) — the leader
   should cherry-pick or re-author that file for whichever branch actually
   ships to prod, and run it (with Jeff's approval) before or immediately
   after deploy.

3. **Before merging p1-w4 with the RPC-heavy branches**, re-run this review
   against the merged tree — the 26-call-site picture and the two unresolved
   dashboard-only functions need a fresh pass once the code actually exists
   in the branch being audited.
