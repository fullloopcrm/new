# RPC — does W1's real `060_lockdown_secdef_rpcs.sql` cover both gaps this review already flagged? (FOR-JEFF-REVIEW, docs only)

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-13
**Status:** read-only cross-check. No DB commands run, no file on any branch modified by this doc.

**Follows up on:** `rpc-security-definer-review.md` §1 (the 3 original 060 fixes), §4b (search_path
pinning recommended as a low-priority addition for 4 `SECURITY INVOKER` functions), and §6 (the
`p_entity_id`-trust gap on `post_journal_entry`, proposed as "a candidate addition to 060"). All three
of those sections *assumed* what 060 would contain ("already planned by w1") without reading the actual
file — this pass reads it.

---

## What I did

`060_lockdown_secdef_rpcs.sql` is not in this worktree (this lane doesn't own the P1-schema migrations
number range) but exists on disk at `/Users/jefftucker/flwork-p1-w1/platform/src/lib/migrations/060_lockdown_secdef_rpcs.sql`
— read directly (read-only `ls`/`cat`-equivalent, no write, same cross-worktree method already used for
`q-roster-status-snapshot.md`).

## Coverage check

| Fix | Proposed by | In the real 060 file? |
|---|---|---|
| `REVOKE EXECUTE ... FROM authenticated` on `post_journal_entry` | §1 | ✅ Yes (`:39`) |
| `REVOKE EXECUTE ... FROM authenticated` on `cpa_token_bump_usage` | §1 | ✅ Yes (`:45`) |
| `REVOKE ... FROM PUBLIC` (defense-in-depth) on both | §1 (implied "lockdown") | ✅ Yes (`:40`, `:46`) — a stricter version of what §1 asked for |
| `GRANT EXECUTE ... TO service_role` on both | §1 (implied — something must still be able to call them) | ✅ Yes (`:41`, `:47`) |
| `SET search_path = public, pg_temp` on both | §1 | ✅ Yes (`:42`, `:48`) |
| `SET search_path` on the 4 `SECURITY INVOKER` functions (`seo_run_detection`, `seo_money_keywords`, `comhub_get_or_create_contact_by_phone`, `comhub_get_or_create_thread`) | §4b | ❌ **Not present** — 060 only touches the 2 `SECURITY DEFINER` functions from migration 039 |
| `p_entity_id` validated against `p_tenant_id` inside `post_journal_entry` | §6 | ❌ **Not present** — 060 is grant/search_path only, no function-body change |

**Bottom line: both gaps this review's later extensions (§4b, §6) called out are real — 060 as it
exists today does not close them.** That's not a criticism of 060 itself: §1's own text asked for exactly
the 3 things 060 delivers (revoke/grant/search_path on the 2 DEFINER functions), and §4b/§6 were written
*after* §1, proposing additions "framed as an addition to 060" — but nothing re-read 060's actual content
to confirm the addition ever landed there. It didn't. This is on this review's own §4b/§6 for not
verifying the target file, not on W1's migration, which does exactly what it was scoped to do.

## Ready-to-fold-in addendum (not applied, not a new migration number)

Both gaps are small, additive, and match 060's own idempotency style (repeatable `ALTER`/`CREATE OR
REPLACE`). Proposed as literal SQL W1 or the leader can paste into `060_lockdown_secdef_rpcs.sql` directly
— **deliberately not authored as a competing `060b`/`064` file**, since both changes touch functions 060
already opens for editing (avoids a second migration touching the same objects, same collision-avoidance
reasoning `branch-integration-plan.md` already established for this migration-number range).

```sql
-- ── Addendum A: search_path pinning for the 4 SECURITY INVOKER RPC-called functions ──
-- (not SECURITY DEFINER, so no privilege-escalation risk — this is the cheap,
-- lower-priority hardening rpc-security-definer-review.md §4b recommended alongside 060.)
ALTER FUNCTION seo_run_detection() SET search_path = public, pg_temp;
ALTER FUNCTION seo_money_keywords() SET search_path = public, pg_temp;
ALTER FUNCTION comhub_get_or_create_contact_by_phone(UUID, TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION comhub_get_or_create_thread(UUID, UUID) SET search_path = public, pg_temp;
-- NOTE: exact argument types not independently re-verified by this doc — confirm signatures
-- against platform/src/lib/migrations/2026_07_04_seo_detection_fn.sql,
-- 2026_07_05_seo_competitors.sql, and platform/migrations/2026_05_19_comhub.sql before running.

-- ── Addendum B: reject a p_entity_id that doesn't belong to p_tenant_id ──
-- (rpc-security-definer-review.md §6 — a ledger data-integrity gap, not just access-control;
-- insert immediately after the existing NULL-fallback block inside post_journal_entry's body.)
-- IF p_entity_id IS NOT NULL THEN
--   PERFORM 1 FROM entities WHERE id = p_entity_id AND tenant_id = p_tenant_id;
--   IF NOT FOUND THEN
--     RAISE EXCEPTION 'post_journal_entry: entity % does not belong to tenant %', p_entity_id, p_tenant_id;
--   END IF;
-- END IF;
-- Left commented/pseudocode here since it's a body-internal edit (CREATE OR REPLACE FUNCTION of the
-- whole 039 function), not a standalone statement like Addendum A — needs the full function body
-- from 039_atomic_ledger_and_hardening.sql:14-83 reproduced with this block spliced in, which this
-- doc intentionally does not attempt (risk of transcribing the rest of the body incorrectly across
-- a worktree boundary without running anything to verify it). Recommend whoever holds 039/060
-- (W1, in-worktree) makes this specific edit directly against the real function source.
```

**Not applied. Nothing run against any database. No file on `p1-w1` or any other worktree modified by
this doc.** Recommend the leader route Addendum A + B to W1 (owns the 055-060/063 migration range) for
inclusion in 060 before Wave 2 ships, rather than this lane authoring a new migration number in someone
else's owned range.

## What this closes vs. what's still open

- **Closes:** the ambiguity in this review's own §4b/§6, which described both gaps as "candidate
  addition[s] to 060" without ever confirming whether that addition existed. Now confirmed: it doesn't,
  yet.
- **Still open (unchanged from §4c):** the live-introspection question for
  `comhub_get_or_create_contact_by_email` / `seo_refresh_rollup` — this coverage check is orthogonal to
  that gap (060 doesn't touch either of those two names, and neither should it — they're not
  `SECURITY DEFINER`, if they exist at all).
