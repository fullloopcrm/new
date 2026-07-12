# SECURITY DEFINER RPC Review — DB-side functions

_Author: worker W5, branch `p1-w5`, 2026-07-12. **Docs only — no DDL run, no prod changes.**_

## What this is

A security review of `SECURITY DEFINER` database functions: for each one, its **scope**
(what it can touch and who may call it) and its **`search_path`** (whether it is pinned,
which is the specific hardening the Supabase advisor asks for). `SECURITY DEFINER` functions
run with the **privileges of the function owner** (typically a superuser / `postgres` role),
not the caller — so an unpinned `search_path` on such a function is a documented privilege-
escalation vector: an attacker who can create objects in a schema earlier on the path can
shadow a table/function the body references and have it run as the owner.

## ⚠️ Method & limitation — READ FIRST (the count does not match)

The order specified **"26 SECURITY DEFINER DB-side rpc fns."** This review is **derived from
the migration files in the repo**, not from a live database read. In the repo I find **only
2** functions declared `SECURITY DEFINER`:

| # | Function | File | Language |
|---|----------|------|----------|
| 1 | `post_journal_entry(uuid,uuid,date,text,text,uuid,uuid,jsonb)` | `platform/src/lib/migrations/039_atomic_ledger_and_hardening.sql` | plpgsql |
| 2 | `cpa_token_bump_usage(text)` | `platform/src/lib/migrations/039_atomic_ledger_and_hardening.sql` | sql |

I searched every `*.sql` under `platform/` (case-insensitive `security definer`) and every
`CREATE FUNCTION` (33 total). **The other 24 are not in the repo.** The most likely
explanations, in order:

1. The **26 comes from a Supabase Security Advisor / linter run against live prod**, which
   counts `SECURITY DEFINER` routines that exist in the database but were **created outside
   these migration files** — via the Supabase SQL editor, an extension (`pg_graphql`,
   `pgsodium`, `vault`, `pg_net`, `supabase_functions`, PostGIS, etc.), or older ad-hoc SQL
   that never landed in a migration. Supabase's own managed schemas ship many SECDEF
   functions.
2. The advisor's **"Security Definer View"** lint (a separate rule) may be conflated into the
   same count; that rule flags **views**, not functions.

**I cannot read prod (test-mode, no DB access), so I cannot enumerate or review the other
24.** This mirrors the same limitation flagged in `rls-coverage-audit.md`: the repo is not
authoritative for live prod. **§4 below gives the exact `pg_proc` query the leader must run
against prod** to produce the real list; each row it returns that is *not* one of the 2 below
needs the same scope/`search_path` review applied.

Bottom line: I reviewed the **2 functions the application actually owns and calls via RPC**
(confirmed by 8 distinct `supabase.rpc(...)` names in `platform/src`, of which these 2 are
the only SECDEF ones). The remaining count is a **prod-introspection gap**, not a repo gap.

---

## 1. `post_journal_entry(...)` — SECURITY DEFINER, plpgsql

**Source:** `platform/src/lib/migrations/039_atomic_ledger_and_hardening.sql:14`
**Called from:** app via `supabase.rpc('post_journal_entry', …)` (ledger posting path).

**What it does / scope**
- Inserts one `journal_entries` row + N `journal_lines` rows in a single transaction, so a
  failed lines-insert can never leave an orphan entry. Validates debits = credits and
  non-zero before writing. Resolves a default `entity_id` when caller omits it.
- Tables touched: `entities` (SELECT), `journal_entries` (INSERT), `journal_lines` (INSERT).
- **Grant:** `GRANT EXECUTE … TO authenticated, service_role;` (line 83). So a request-scoped
  `authenticated` JWT client — not just `service_role` — can invoke it.

**Why it is SECURITY DEFINER**
- Legitimate: it must write ledger tables atomically regardless of the caller's RLS. Today
  writes go through `supabaseAdmin` (service_role) anyway, so DEFINER is currently belt-and-
  suspenders, but it becomes load-bearing the moment any `authenticated` path calls it.

**`search_path`: NOT PINNED.** ⚠️ This is the finding. The body references `entities`,
`journal_entries`, `journal_lines` by **unqualified** name. With no `SET search_path`, name
resolution follows the caller's `search_path`. Because `authenticated` can execute it, this
is the textbook SECDEF search_path risk.

**Scope risk beyond search_path**
- `p_tenant_id` is a **caller-supplied argument**, not derived from the JWT. The function does
  no check that the caller is entitled to write to `p_tenant_id`. A malicious `authenticated`
  caller could post journal entries into **another tenant's** books. Isolation here is 100%
  application-level (the app only ever passes the request's own tenant). This is acceptable
  *only* while the sole caller is trusted server code; it is a cross-tenant write primitive if
  ever exposed to an untrusted `authenticated` client.

**Recommendation** (implemented by planned `060_lockdown_secdef_rpcs.sql`, item 2.7 in
`part0-execution-master-checklist.md`):
1. **Pin the search_path:** `ALTER FUNCTION post_journal_entry(...) SET search_path = pg_catalog, public;`
   (or `SET search_path = ''` and fully schema-qualify every table as `public.journal_entries`).
2. **REVOKE EXECUTE FROM authenticated;** keep only `service_role`. If no `authenticated`
   path ever calls it (true today — all callers use `supabaseAdmin`), this removes the
   escalation surface entirely. Re-grant narrowly only if a JWT path is later designed.
3. Longer term, derive `tenant_id` from the JWT claim inside the function rather than trusting
   the argument, if it is ever exposed to `authenticated`.

---

## 2. `cpa_token_bump_usage(p_token text)` — SECURITY DEFINER, sql

**Source:** `platform/src/lib/migrations/039_atomic_ledger_and_hardening.sql:86`
**Called from:** app via `supabase.rpc('cpa_token_bump_usage', …)` (CPA download token path).

**What it does / scope**
- One statement: `UPDATE cpa_access_tokens SET last_used_at = NOW(), use_count = use_count+1
  WHERE token = p_token;`. Avoids a read-then-write race across concurrent downloads.
- Tables touched: `cpa_access_tokens` (UPDATE only).
- **Grant:** `GRANT EXECUTE … TO authenticated, service_role;` (line 96).

**Why it is SECURITY DEFINER**
- So a low-privilege caller can bump usage counters on the tokens table without holding write
  rights to `cpa_access_tokens` directly.

**`search_path`: NOT PINNED.** ⚠️ Same risk class as #1 — unqualified `cpa_access_tokens`, and
`authenticated` can execute. `NOW()` resolves from `pg_catalog` so it is not itself shadow-able,
but the table reference is.

**Scope risk beyond search_path**
- The `WHERE token = p_token` scopes the write to a single supplied token, so blast radius per
  call is one row and there is no tenant argument to spoof. Lower risk than #1. Worst case is
  an attacker who already holds/guesses a valid token inflating its own `use_count` — a
  metrics-integrity nuisance, not a data breach. It cannot read token values back (returns
  `void`).

**Recommendation** (same `060_lockdown_secdef_rpcs.sql`):
1. **Pin search_path** exactly as #1.
2. **REVOKE EXECUTE FROM authenticated;** leave `service_role` only, matching the fact that
   the download path runs server-side. Verify the calling route uses `supabaseAdmin` before
   revoking (it does in the repo).

---

## 3. Full in-repo DB-function inventory (context)

For completeness: **33 `CREATE FUNCTION` definitions exist in the repo; only the 2 above are
`SECURITY DEFINER`.** Everything else is the PostgreSQL default **`SECURITY INVOKER`** (runs as
the caller — no escalation surface) and is either a trigger function or a read-only helper:

- **Trigger functions (SECURITY INVOKER, `RETURNS TRIGGER`)** — `*_updated_at` / `*_set_updated_at`
  touch functions (routes, entities, documents, invoices, quotes, prospects, periods,
  recurring_expenses, territories, client_contacts, yinez_skills, territory), plus
  `audit_row_changes`, `check_period_lock`, `check_journal_balance`, `deals_stage_change_tracker`,
  `invoices_recompute_paid`, `refresh_team_member_rating`, `fn_block_booking_overlap`,
  `comhub_mirror_sms_message`. Not RPC-callable; not SECDEF; out of scope for this review.
- **RPC helpers called by the app but SECURITY INVOKER** — `comhub_get_or_create_contact_by_phone`,
  `comhub_get_or_create_contact_by_email`, `comhub_get_or_create_thread`, `seo_run_detection`,
  `seo_money_keywords` (`stable`), `seo_refresh_rollup`, `count_errors_by_severity`. These run
  with caller privilege; **none is SECDEF**, so the search_path escalation vector does not
  apply. (They still rely on app-level tenant scoping like everything else — that is the RLS
  audit's concern, not this one.)

**No function in the repo pins `search_path`** (grep for `search_path` across `platform/`
returns nothing but the reference in `part0-execution-master-checklist.md`). So when prod's
real SECDEF set is enumerated (§4), assume **none is pinned** until proven otherwise.

---

## 4. Prod enumeration query the LEADER must run (closes the 26 gap)

Run this against **prod** (read-only; safe) to produce the authoritative SECDEF list, then
apply the §1–§2 scope/search_path review to every row that is not one of the 2 above. This is
the step I cannot perform from a worktree.

```sql
-- All SECURITY DEFINER functions, with whether search_path is pinned and who can execute.
SELECT
  n.nspname                              AS schema,
  p.proname                              AS function,
  pg_get_function_identity_arguments(p.oid) AS args,
  p.prosecdef                            AS is_security_definer,   -- true = SECDEF
  (SELECT array_agg(cfg) FROM unnest(p.proconfig) cfg
     WHERE cfg LIKE 'search_path=%')     AS pinned_search_path,    -- NULL = NOT pinned ⚠️
  pg_get_userbyid(p.proowner)            AS owner,
  (SELECT string_agg(DISTINCT grantee, ', ')
     FROM information_schema.routine_privileges rp
    WHERE rp.specific_schema = n.nspname
      AND rp.routine_name = p.proname
      AND rp.privilege_type = 'EXECUTE') AS execute_grants
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.prosecdef = true
  AND n.nspname NOT IN ('pg_catalog','information_schema')   -- drop to see Supabase-managed ones too
ORDER BY n.nspname, p.proname;

-- Quick count to reconcile against the advisor's "26":
SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE p.prosecdef;
```

Interpretation:
- `pinned_search_path IS NULL` → **unpinned SECDEF** → hardening candidate (pin it).
- Rows in `public` owned by `postgres` that the app owns → treat like §1/§2.
- Rows in `auth`, `storage`, `graphql`, `vault`, `pgsodium`, `extensions`, `supabase_functions`,
  `realtime` → **Supabase-managed**; do **not** alter. They explain most of the gap between 2
  and 26 and are out of our remediation scope.

---

## 5. Summary / handoff

- **In-repo, app-owned SECDEF functions: 2**, both unpinned, both granted to `authenticated`.
  Both are already targeted by planned `060_lockdown_secdef_rpcs.sql` (part0 item 2.7):
  **REVOKE EXECUTE FROM authenticated + pin search_path.** This review confirms that plan is
  the correct remediation and adds the cross-tenant-write note on `post_journal_entry` as the
  higher-severity of the two.
- **The "26" is a prod-introspection number I could not verify from the repo.** The §4 query
  is the one action that reconciles it; each additional app-owned row it surfaces gets the same
  two-line fix. Supabase-managed schemas account for the bulk and must be left alone.
- **Nothing here was executed.** This is a file-only artifact.
