# Defense-in-Depth P3-6..P3-10 Review

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-12 · **Status:** docs only, nothing applied

**Scope:** review the 5 items the leader named explicitly for this pass (auto-resume scope, 24/7
auto-enable gap, SMS/email dedupe, dormant token columns, live-DB SECURITY DEFINER audit blind spot),
grounded fresh against this branch's actual code, plus this worker's own `rpc-security-definer-review.md`
finding on the SECDEF count.

**Verification anchors read this pass:** `app/api/cron/generate-recurring/route.ts`, `lib/availability.ts`,
`lib/provision-tenant.ts` (grep `open_365`, 0 hits), `lib/sms.ts`/`lib/email.ts`/`lib/messaging/client-sms.ts`/
`lib/messaging/client-email.ts` (grep `idempotenc|dedupe`, 0 hits), `lib/sale-to-recurring.ts` and 5 other
write sites for `team_member_token`, `app/api/client/confirm/[token]/route.ts` for `client_confirm_token`,
`lib/migrations/*.sql` (grep `SECURITY DEFINER`), plus `LEADER-CHANNEL.md` for prior findings this doc
re-verifies rather than blindly repeats.

**Numbering note, upfront:** `deploy-prep/defense-in-depth-P3-6-to-P3-10.md` (authored on p1-w2, commit
`9ae0f8bb`) already assigned **different** content to "P3-6..P3-10" — RLS backstop / tenantDb rollout /
CSRF Origin allowlist / output-encoding / rate-limit fail-open. This order's explicit list (below) doesn't
match that doc's assignments. Flagging the collision, not resolving it — reviewing exactly what this
order asked for, under the numbers this order gave them.

---

## P3-6: Recurring auto-resume scope (nycmaid-only)

**Finding (originally W5, 19:12 channel):** the `generate-recurring` cron's paused-schedule resume query
was hardcoded to a single tenant.

**Re-verified fresh on p1-w6 HEAD:** still true. `route.ts:8` imports `NYCMAID_TENANT_ID`, `route.ts:23`
filters the resume query `.eq('tenant_id', NYCMAID_TENANT_ID)`. Every other tenant's paused recurring
schedule has zero cron-driven path back to active — a schedule paused once stays paused forever for
every tenant except the one hardcoded UUID. This is a silent, permanent revenue leak, not a security bug.

**Status:** W5 already authored + tested a fix (commit `a26973a0` on p1-w5, removes the tenant filter so
resume matches the unscoped active-schedule fetch below it). Checked via
`git merge-base --is-ancestor a26973a0 HEAD` on this worktree: **NOT an ancestor** — the fix exists but is
not merged into or near p1-w6. This is a branch-integration gap, not an unsolved problem.

**Recommended next action:** carry `a26973a0` (or an equivalent) into the integration branch before
deploy. This should be treated as a functional P0/P1 for deploy readiness regardless of its P3 label here
— it silently loses revenue for every non-nycmaid tenant using recurring billing today.

---

## P3-7: 24/7 auto-enable gap

Three distinct, compounding gaps here, all re-verified live on p1-w6 HEAD:

1. **Same-day booking is unconditionally blocked for every tenant.** `availability.ts` (`checkAvailability`):
   `if (date === today) return { slots: [], sameDay: true, ... }` — no flag, no tenant setting, no
   exception. A 24/7 emergency tenant cannot self-book same-day through this path at all.
2. **Business hours are hardcoded, not settings-driven.** `BUSINESS_START = 9` / `BUSINESS_END = 17`
   (`availability.ts:24-25`) are module-level constants. `open_365` (`:135-136`) only suppresses the
   *holiday* closure check — it does nothing to the 9am–5pm window. A tenant flagged `open_365` still
   only gets 9–5 slots on this branch.
3. **Nothing auto-enables 24/7 at provisioning.** `grep -n "open_365" lib/provision-tenant.ts` → 0 hits,
   for every industry including the known emergency verticals already present in `industry-presets.ts`
   (`tree_service`, `plumbing`, etc.). An operator must manually flip the flag per-tenant after the fact
   — there's no "this vertical implies 24/7" default anywhere.

**Status — three divergent in-flight fixes, none merged here:**
- W2 (`4d412c2`/`68d848b`) wired the general availability path to `business_hours_start`/`end` settings.
- W3 (`1c7a2cf0`) removed the unconditional same-day block in `checkAvailability`.
- W5 was assigned (19:27 channel) to add an explicit 24/7/emergency-flag bypass on top of those — no
  commit for that specific task visible in the channel history reviewed this pass.

None of `4d412c2`, `68d848b`, or `1c7a2cf0` are ancestors of this branch's `availability.ts` history
(confirmed via `git log` on the file — none of those hashes appear).

**Recommended next action:** (1) reconcile the three in-flight fixes at integration time so they don't
silently conflict or partially overwrite each other; (2) close the provisioning-time gap W2 already
flagged and left unaddressed — add an `IndustryKey → default open_365` mapping for emergency verticals
so P3-7 doesn't require a manual per-tenant flip after go-live, the same shape of fix already applied for
`funnel_mode` (F1, `provisioning-failure-runbooks.md`).

---

## P3-8: SMS/email dedupe

**Finding:** verified zero idempotency/dedupe guard across the outbound send paths on this branch —
`grep -n "idempotenc\|dedupe\|dedup" lib/sms.ts lib/email.ts lib/messaging/client-sms.ts lib/messaging/client-email.ts`
→ 0 hits. A webhook redelivery, cron re-run, or manual resend can send a duplicate SMS/email to a real
customer with no guard anywhere in this path today.

**Status:** the leader's own order (19:27, to W5) states this explicitly — "P3-8 outbound dedupe: no
idempotency on outbound SMS/email → duplicate sends on retry. Author a dedupe/idempotency guard on
branch + test" — and this order flags **W5 is actively coding this**. No commit for it is visible in the
channel history reviewed this pass.

**Recommended next action:** none from this doc beyond tracking — do not duplicate in-flight work.
Once W5 lands it, confirm coverage extends to both send paths (Telnyx SMS, Resend email) and both
retry surfaces (cron re-run, webhook redelivery), not just one.

---

## P3-9: Dormant token columns

W4's capability-token audit (16:38 channel) flagged `client_confirm_token` + `team_member_token` together
as "generated/linked but no consumer."

**Re-verified fresh on p1-w6 HEAD — this needs a partial correction to that finding, not a restatement:**

- **`team_member_token` — confirmed genuinely dormant.** Written at 6 sites
  (`api/bookings/batch`, `api/admin/recurring-schedules` ×2, `api/client/book`, `api/client/recurring`,
  `lib/sale-to-recurring.ts`) but `grep -rn "team_member_token" platform/src` shows **zero** `.eq(...)` or
  any other read filter anywhere — a column populated on every relevant insert and never queried back.
  If it was meant to gate a team-member-facing link (the naming implies a token-based lookup, same
  pattern as `client_confirm_token`), that consumer was never wired.
- **`client_confirm_token` — NOT dormant on this branch.** It IS consumed:
  `api/client/confirm/[token]/route.ts:14,35` uses `.eq('client_confirm_token', token)` as its lookup
  key, and it's rendered into live SMS confirm-links in both `lib/nycmaid/sms-templates.ts:19` and
  `lib/messaging/sms-cleaning.ts:48`. Either this was wired after W4's audit or W4's audit missed the
  consumer — either way, W4's claim is stale for this specific token and shouldn't be carried forward
  as-is.

**Recommended next action:** `team_member_token` should either get a real consumer (if a team-member
confirm/magic-link flow was intended — worth asking Jeff/product) or be removed from its 6 write sites
as dead weight — a populated-but-never-read column is a false signal to the next person reading the
schema. `client_confirm_token` needs no action; it's live and correctly scoped to the record it belongs
to via the standard row lookup.

---

## P3-10: Live-DB SECURITY DEFINER audit blind spot

Ties directly into this worker's own `deploy-prep/rpc-security-definer-review.md` (this session, full
detail there — not duplicated here).

**The core finding:** the leader's own orders have referenced "26 SECURITY DEFINER functions" across
multiple threads (11:29 to W5, 12:47/13:09 to W1, 19:27 to this worker) — but **every independent audit
that has actually grepped the repo finds the same 2**: W1 (13:12 channel), W3 (09:37 channel), W5
(11:34 channel), and this worker (19:30 channel, `rpc-security-definer-review.md`). Re-confirmed again
this pass: `grep -rln "SECURITY DEFINER" platform/src/lib/migrations/*.sql` → only
`039_atomic_ledger_and_hardening.sql` (`post_journal_entry`, `cpa_token_bump_usage`).

**Determination — are the other ~24 DB-side-only (not in repo migrations)?** Almost certainly yes, for
at least a concrete subset: 25 `.rpc()` call sites exist across 8 distinct function names, and 6 of those
names — `comhub_get_or_create_contact_by_email`, `comhub_get_or_create_contact_by_phone`,
`comhub_get_or_create_thread`, `seo_money_keywords`, `seo_refresh_rollup`, `seo_run_detection` — have
**no matching `CREATE FUNCTION` anywhere in this repo's migrations.** The app calls them by name, so
something answers at that name in the live database; it just isn't defined anywhere a worker can read.
Whether any of those 6 (or any further Supabase-dashboard-only function outside this repo's 8 known
names) is `SECURITY DEFINER`, tenant-scoped, or has a pinned `search_path` is **unknowable from any
worktree** — every worker who's hit this wall reached the identical conclusion independently, which is
itself the strongest evidence this is a real, structural gap and not one worker's oversight.

**This is a repeat-confirmed audit blind spot, not a one-off finding.** Four separate workers across
four separate orders have now rediscovered "the list says 26, the repo has 2" from scratch, each burning
a full audit pass to reach the same wall. That repetition is itself a process cost worth flagging.

**Recommended next action:** Jeff/leader-gated, not closable file-only. A single read-only query already
exists (written in both `rpc-security-definer-review.md` and W5's `security-definer-rpc-review.md`):

```sql
SELECT n.nspname, p.proname, p.prosecdef,
       (SELECT array_agg(grantee::text) FROM information_schema.role_routine_grants
        WHERE routine_name = p.proname AND privilege_type = 'EXECUTE') AS execute_grantees
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.prosecdef = true;
```

Running this once against prod (unqualified by name, to catch anything beyond the 8 known `.rpc()`
targets too) and pasting the output back closes the gap permanently — every future worker currently has
to re-derive "26 doesn't reconcile" from zero. Until that query runs, this doc's recommendation is to
treat the 6 undefined `.rpc()` names as **unaudited SECURITY DEFINER risk by default** (fail-closed
assumption), not as presumed-safe just because no repo evidence of harm exists.

---

## Cross-lane numbering conflict (flagged, not resolved)

Two documents now both claim to cover "P3-6..P3-10" with incompatible contents:

- `deploy-prep/defense-in-depth-P3-6-to-P3-10.md` (p1-w2, `9ae0f8bb`): RLS backstop / tenantDb rollout /
  CSRF Origin allowlist / output-encoding / rate-limit fail-open.
- This document (p1-w6, per this order's explicit list): auto-resume scope / 24-7 auto-enable / SMS-email
  dedupe / dormant token columns / SECDEF audit blind spot.

Whoever integrates branches should pick one canonical P3 numbering before either document is treated as
authoritative for planning purposes — this worker is not adjudicating which numbering wins, only making
sure the collision is visible before it causes confusion at merge time.

## Cross-references

- `deploy-prep/rpc-security-definer-review.md` — full SECDEF/RPC detail, this doc's P3-10 section
  summarizes rather than duplicates it.
- `deploy-prep/defense-in-depth-P3-6-to-P3-10.md` — the sibling doc with conflicting P3 numbering.
- `deploy-prep/per-trade-status.md` — W5's original auto-resume + F4 findings this doc re-verifies.
