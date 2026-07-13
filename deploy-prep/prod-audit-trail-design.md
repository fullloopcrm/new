# Prod Audit Trail — Design (consolidated, folds in RPC/SECURITY DEFINER scope)

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-12
**Status:** design doc. No migration was written or run, no table created, no DB touched. This
consolidates two prior file-only outputs from this lane —
[`prod-audit-trail-spec.md`](./prod-audit-trail-spec.md) (the general who-changed-what trail) and
[`rpc-security-definer-review.md`](./rpc-security-definer-review.md) (the RPC/SECURITY DEFINER scope) —
into one design that explicitly folds the second into the first, per the LEADER order (master
`MASTER-TODO-LIST.md` line 99 + line 97 / `w1-rpc-audit`). Where content is unchanged from those two files
this doc cross-references rather than duplicates verbatim; §4 below is new synthesis, not present in
either source file.

---

## 1. The gap this closes

`impersonation_events` (migration 041) already answers *"what did an admin do while wearing a tenant's
identity?"* — it fires on every request while the `fl_impersonate` cookie is active. There is **no general
trail** for *"what changed in prod, who changed it, before/after"* independent of impersonation — a normal
Clerk super-admin editing tenant pricing, granting a role, or freezing a domain leaves no reconstructable
record today beyond whatever the row's own `updated_at` shows (no actor, no before-value). That's the gap
Section R (master line 99) asks to close.

Full category list, schema, retention, and read-access model are in
[`prod-audit-trail-spec.md`](./prod-audit-trail-spec.md) §2–§5 — reproduced only where §4 below depends on
it. That spec's six event categories (tenant CRUD, config/pricing, role/membership, deploys, impersonation,
auth/session) were scoped from **route-handler** mutation points. §4 below is the fold-in: a **seventh
category the route-scoped list misses**, found by cross-referencing the RPC review.

---

## 2. The RPC/SECURITY DEFINER scope being folded in

Summary of [`rpc-security-definer-review.md`](./rpc-security-definer-review.md) (full detail there,
not reproduced): the LEADER order referenced "26" `.rpc()` SECURITY DEFINER functions; the actual count
found by grep in this worktree is **25 call sites across 8 distinct function names**, of which only **2
have an in-repo `CREATE FUNCTION`** (`post_journal_entry`, `cpa_token_bump_usage`, both in migration
`039_atomic_ledger_and_hardening.sql`) — the other 6 (`comhub_get_or_create_*` ×3, `seo_*` ×3) have no
in-repo definition and are an **unverified blind spot** requiring live `pg_proc` introspection to close
(query provided in that file, not run here). Both in-repo functions are already scoped into planned
migration `060_lockdown_secdef_rpcs` (per `branch-integration-plan.md`, `phased-deploy-runbook.md`) for
`REVOKE EXECUTE ... FROM authenticated` + pinning `search_path` — that lockdown work is unchanged by this
doc; this doc only asks a different question of the same two functions: **should calling them also write
an audit row?**

---

## 3. Why RPCs are a distinct audit problem, not just a route problem

The general spec's event categories (§1 above) were scoped by grepping route handlers
(`/api/admin/tenants`, `/api/admin/settings`, `/api/admin/businesses/[id]/users`). That misses privileged
mutations that happen **inside a shared library function**, called from multiple routes, rather than
inline in a single route handler:

- `post_journal_entry` is called from `platform/src/lib/ledger.ts:113` (`postJournalEntry()`), a shared
  helper — **not** inline in any one route. Verified: `grep -rn "post_journal_entry\|cpa_token_bump_usage"
  platform/src` finds exactly these two call sites, both in library code, not route code.
- `cpa_token_bump_usage` is called from `platform/src/app/api/cpa/[token]/year-end-zip/route.ts:30`
  directly — closer to the route-scoped pattern, but the caller here is a **CPA-token holder**, not an
  admin actor at all (`actor_kind` in the general spec's schema doesn't currently have a slot for
  "external token-authenticated caller," only `pin_admin | clerk_super_admin | tenant_owner | system`).

If audit instrumentation is only added at the route-handler layer (as the general spec's §2 trigger-list
implies), any *other* route that calls `postJournalEntry()` in the future gets audit coverage only if that
route also remembers to insert its own `prod_audit_events` row — an easy miss, and exactly the kind of gap
this table exists to prevent. **The fix is to instrument at the choke point, not at every call site**:
wrap `postJournalEntry()` itself so every journal entry — regardless of which route triggered it — writes
one `prod_audit_events` row as part of the same function, not as a duty each caller remembers separately.

---

## 4. Fold-in: schema and category additions (new synthesis, not in either source file)

**New event category**, added to the `event_type` check constraint proposed in
`prod-audit-trail-spec.md` §3:

```sql
-- addition to the event_type check in prod_audit_events (spec §3), not a new table
'ledger_post',        -- post_journal_entry() succeeded — one row per journal entry
'cpa_token_use'       -- cpa_token_bump_usage() succeeded — one row per CPA portal access
```

**New actor_kind**, added to the `actor_kind` check constraint (spec §3):

```sql
'cpa_token_holder'    -- external caller authenticated only by possessing a valid CPA token,
                       -- not an admin/owner identity — actor_id = the token itself (or its hash,
                       -- never the raw token value, to avoid the audit table becoming a second
                       -- place a leaked token grants replay)
```

**Instrumentation point:** `postJournalEntry()` in `lib/ledger.ts`, immediately after the existing
`if (typeof data !== 'string') throw ...` check (line 129) succeeds — insert one `prod_audit_events` row
with `event_type = 'ledger_post'`, `resource_type = 'journal_entry'`, `resource_id = data` (the returned
entry id), `after_value` = the posted entry's amount/account/tenant fields (already in scope at that call
site, no extra query needed). This is a **library-level change**, not a migration — out of scope to write
here (file-only design pass); flagged as the implementation task once the migration itself is reviewed
and applied by the leader.

**Why not audit the 6 unverified RPCs (§2) the same way:** cannot design instrumentation for functions
whose signature, return shape, and even `SECURITY DEFINER` status are unverified from this repo. Once the
live `pg_proc` query in `rpc-security-definer-review.md` §2 is run and confirms which of the 6 are
privilege-relevant, this section should be revisited — flagged as a follow-up, not attempted here on
unverified premises (assumption-stacking risk: designing audit rows for functions we haven't confirmed
exist as described would be building on an unverified base).

**Retention/read-access:** `ledger_post` rows follow the same "retained indefinitely" carve-out the
general spec already gives `role_grant`/`role_revoke`/`tenant_delete` (spec §4) — money-movement audit
rows are exactly the kind of record most likely to matter in a later dispute, and are low-volume enough
that indefinite retention isn't a storage concern. `cpa_token_use` rows follow the general 2-year default
(spec §4) — access-pattern telemetry, not a financial-dispute record.

---

## 5. What this design does NOT cover (unchanged from the source spec, restated for completeness)

- The general spec's own out-of-scope list still applies: no Vercel deploy webhook receiver exists yet
  (prerequisite for `event_type = 'deploy'` rows), no `INSERT` calls are actually wired into any route or
  library function yet (this pass, including §4's `ledger.ts` instrumentation point, is design only), and
  no `/api/admin/audit-log` read UI is designed here.
- The 6 unverified RPC names (§2) remain unaudited pending the live `pg_proc` query — this doc does not
  close that gap, it only notes where the eventual answer plugs into the audit schema (§4, last paragraph).
- Migration `060_lockdown_secdef_rpcs`'s `REVOKE`/`search_path` work (§2) is unchanged and not duplicated
  here — this doc is additive (should these calls *also* be logged), not a replacement for that lockdown.

---

## Cross-references

- [`prod-audit-trail-spec.md`](./prod-audit-trail-spec.md) — full schema, retention, and RLS/read-access
  design for `prod_audit_events`; this doc's §4 is an addition to that spec's §3 constraint list, not a
  restatement of it.
- [`rpc-security-definer-review.md`](./rpc-security-definer-review.md) — full RPC/SECURITY DEFINER count
  reconciliation (25 call sites / 8 names / 2 in-repo SECURITY DEFINER functions vs. the LEADER order's
  "26"), the live-introspection query for the 6 unverified names, and confirmation that migration 060
  already covers the 2 known functions' lockdown.
- `platform/src/lib/ledger.ts` — `postJournalEntry()`, the proposed instrumentation choke point.
- `platform/src/app/api/cpa/[token]/year-end-zip/route.ts` — the `cpa_token_bump_usage` call site and its
  non-admin actor kind.

**Nothing in this file was applied. No migration, table, or DB row was created or changed.**
