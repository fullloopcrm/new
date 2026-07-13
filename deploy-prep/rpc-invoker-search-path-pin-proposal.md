# RPC INVOKER function `search_path` pinning — proposal (FOR-JEFF-REVIEW, docs only)

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-13
**Status:** proposal only. No migration file authored, no DDL run, no code changed.

**Follows up on:** `rpc-security-definer-review.md` §4b, which found 4 `.rpc()`-called functions that are
`SECURITY INVOKER` (not `DEFINER`) and named `search_path` pinning as a "lower-priority residual gap that
does still apply... worth folding into 060's pinning pass as a cheap addition" — but never turned that
into a concrete, appliable artifact. This closes that loose end.

**Explicitly NOT a new migration file.** `rpc-security-definer-review.md` §1 already states migration
`060_lockdown_secdef_rpcs` is planned and owned by w1 (`branch-integration-plan.md:120`,
`phased-deploy-runbook.md:94`) for the 2 `SECURITY DEFINER` functions, and says in its own words: "No new
migration file is authored here — 060 already covers this; duplicating it would create a
migration-number collision the branch-integration-plan explicitly worked to avoid." That constraint
applies just as much to a *new* numbered migration for this narrower, INVOKER-only scope — this worktree
does not know what migration numbers other lanes have claimed since `migrations-tree-reconciliation-note.md`
already found the numbering isn't tracked in one place. So this doc supplies ready-to-apply SQL as a
**candidate addition to 060's own diff**, not a competing file, per the recommendation already on record.

---

## The 4 functions and why they're lower priority than the 060 pair

| Function | File | `SECURITY DEFINER`? | Reachable by `authenticated`/`anon` today? |
|---|---|---|---|
| `seo_run_detection` | `platform/src/lib/migrations/2026_07_04_seo_detection_fn.sql:4` (redefined `2026_07_05_seo_competitors.sql:119`) | No (INVOKER, the Postgres default) | No — no `GRANT EXECUTE` found for it anywhere in either migrations tree |
| `seo_money_keywords` | `platform/src/lib/migrations/2026_07_05_seo_competitors.sql:95` | No | No |
| `comhub_get_or_create_contact_by_phone` | `platform/migrations/2026_05_19_comhub.sql:242` | No | No |
| `comhub_get_or_create_thread` | `platform/migrations/2026_05_19_comhub.sql:293` | No | No |

None of the four combines `SECURITY DEFINER` with a grant to `authenticated`/`anon` — the specific shape
that makes `post_journal_entry`/`cpa_token_bump_usage` a privilege-escalation risk the instant Supabase
Auth is wired for end users. All four in-repo call sites go through `supabaseAdmin.rpc(...)` (service-role),
so today they already run at service-role privilege regardless of INVOKER/DEFINER — an unpinned
`search_path` on an INVOKER function is a defense-in-depth gap, not an active exploit: it means a
sufficiently-privileged, malicious actor who could get an object earlier in a manipulated `search_path`
resolved ahead of the intended one could redirect what the function calls — a real but narrower risk than
060's DEFINER-plus-authenticated-grant shape.

## Proposed SQL (candidate addition to 060, or a standalone follow-up — Jeff/leader's call)

```sql
-- Pin search_path on the 4 SECURITY INVOKER functions .rpc()-called from platform/src
-- that do not already have one set. Read-only against data; only changes function
-- metadata (pg_proc.proconfig). No behavior change unless one of these functions
-- currently relies on resolving an unqualified name via a non-default search_path,
-- which none of the 4 definitions do (each already schema-qualifies or uses only
-- built-ins/public-schema tables per source review).

ALTER FUNCTION public.seo_run_detection(uuid)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.seo_money_keywords(uuid)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.comhub_get_or_create_contact_by_phone(uuid, text)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.comhub_get_or_create_thread(uuid, uuid, text)
  SET search_path = public, pg_temp;
```

**Argument-signature caveat:** the parameter lists above are written from this worker's reading of each
function's `CREATE FUNCTION` line during the §4a pass, not re-verified character-for-character in this
pass. `ALTER FUNCTION` requires an exact signature match or it errors (safely — no partial application,
no silent no-op). **Whoever applies this must confirm each signature against
`\df+ <function_name>` or the live `pg_proc` row immediately before running**, not trust this doc's
transcription. Flagging explicitly rather than presenting these as copy-paste-safe.

## Recommendation

1. **Preferred:** fold these 4 `ALTER FUNCTION` statements into w1's `060_lockdown_secdef_rpcs.sql` as an
   additional section (same migration, same deploy, since it's already the agreed home for this class of
   fix and avoids a second migration touching the same functions area) — needs w1/leader coordination
   since this worktree doesn't own that file.
2. **Alternative, if 060 is judged out of scope for non-DEFINER functions:** a small standalone
   follow-up migration, numbered by whoever is the numbering authority at apply time (per the open
   two-trees question in `migrations-tree-reconciliation-note.md` — resolve that first if going this
   route, so the new number doesn't collide).
3. Either way: **verify live signatures before applying** (caveat above), and apply in the same
   maintenance window as 060 if possible, since both are the same "harden the RPC surface before Wave 2"
   effort and re-testing the RPC surface twice is wasted verification cost.

Not applied by this pass. No migration file created — SQL above is a proposal snippet only, matching
this worktree's standing file-only/no-DB-writes rule.
