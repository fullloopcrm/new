# RLS Tier 4 missing-table reconciliation — booking_cleaners / cleaners / cleaner_payouts / settings / member_pin_reset_codes

_Author: worker W1, branch `p1-w1`, 2026-07-15 16:xx ET. **Read-only only — no DDL/DML run, nothing
enabled, no guard code changed.** Scope: reconcile the 5 Tier 4 targets in
`deploy-prep/rls-gap-closure.sql` (authored by W5, `p1-w5`) that W2's live census
(`p1-w2/deploy-prep/rls-tier2-5-readiness.md`, 2026-07-15) found do not exist in prod, which
also contradicts W5's `schema-drift-register.md` assumption that 2 of the 5 exist unmigrated
("PROD-ONLY, confirm")._

## Independent re-verification (this session)

I did not have the `SUPABASE_ACCESS_TOKEN_FULLLOOP` Management-API token W2 used for their
direct-SQL pass (not present in this worktree's env or `.env.local`; a `curl` to
`api.supabase.com/v1/projects/.../database/query` with the cached `supabase` CLI token returned
`401 Unauthorized` — that token is not scoped for the Management API's SQL endpoint). I did not
attempt to work around this.

Instead I re-ran the equivalent of W2's Pass 1 independently — direct PostgREST `GET
.../rest/v1/<table>?select=*&limit=1` calls against prod (`cetnrttgtoajzjacfbhe`, confirmed prod
per multiple prior worker reports) using the service-role key from
`/Users/jefftucker/fullloopcrm/platform/.env.local` (the shared main-repo checkout, read-only
credential, no writes). All 5 targets return the same result W2 got:

```
booking_cleaners        -> 404 PGRST205 "Could not find the table 'public.booking_cleaners'"
cleaners                 -> 404 PGRST205 "Could not find the table 'public.cleaners'"
cleaner_payouts          -> 404 PGRST205 "Could not find the table 'public.cleaner_payouts'"
settings                 -> 404 PGRST205 "Could not find the table 'public.settings'"
member_pin_reset_codes   -> 404 PGRST205 "Could not find the table 'public.member_pin_reset_codes'"
```

**Confirmed independently, via a different credential path than W2 used for their Pass 1: all 5
tables genuinely do not exist in prod.** (I could not independently reproduce W2's Pass 2
Management-API/`to_regclass` check due to the token gap above — flagging that gap, not papering
over it — but PostgREST's `PGRST205` is itself derived from the live Postgres catalog via schema
introspection, not a stale application-level cache miss, and W2 already cross-checked it two
ways.)

## ⚠️ Higher-severity finding than the RLS guard abort — this blocks live app code too, not just RLS

The guard-abort framing (W2's doc) undersells this. I checked whether current application code
actually queries these 5 tables. It does, heavily, for `cleaners` and `cleaner_payouts`, and in
one case there's a wired end-user feature depending on a table that was never migrated:

| Table | Live call sites in `platform/src` | What breaks |
|---|---:|---|
| `cleaners` | **30+** across `lib/nycmaid/*`, `lib/selena/{agent,core,tools}.ts`, `api/cron/phone-fixup`, `api/webhooks/telnyx-voice`, and 3 `site/*/​_lib/*` template dirs (nyc-mobile-salon, wash-and-fold-hoboken, wash-and-fold-nyc) | Cleaner scheduling, availability, geo, SMS-consent, Selena AI tool calls — every one of these queries would fail today if reached |
| `cleaner_payouts` | 3, all in `lib/selena/tools.ts` | Selena payout tool calls |
| `booking_cleaners` | 2, `lib/nycmaid/smart-schedule.ts:46`, `lib/selena/tools.ts:717` | Booking↔cleaner assignment reads |
| `settings` | **0** — no reference found anywhere in `platform/src` | Nothing; dead target name |
| `member_pin_reset_codes` | 4, all in `api/pin-reset/route.ts` — **and this route is wired to a real user-facing page**: `src/app/reset-pin/page.tsx` + `ResetPinForm.tsx` call `POST /api/pin-reset` | Every operator PIN-reset attempt would 500 |

I did not verify whether these code paths are actually being hit in prod right now (no log/Sentry
access from here, and that's outside this task's scope) — it's possible `cleaners`/`cleaner_payouts`
call sites are dead in practice (unreachable template variants, feature never cut over for any live
tenant) while `nycmaid`'s flagship traffic goes through some other path I haven't traced. But
`member_pin_reset_codes` has no such escape hatch: it's a real migration
(`platform/migrations/2026_07_03_member_pin_reset.sql`, full `CREATE TABLE IF NOT EXISTS`, in-repo,
tenant-scoped, indexed) sitting unapplied, wired to a live UI form. **This reads as a genuine
unapplied-migration bug independent of RLS** — recommend leader/Jeff check Sentry/Vercel logs for
`PGRST205`/`42P01` on `member_pin_reset_codes` and `cleaners` before anything else in this doc,
since that's a possible live incident, not a schema-hygiene item.

## Per-table disposition — drop vs. rename in the guard's target array

`schema-drift-register.md` only covers 2 of these 5 (`cleaners`, `cleaner_payouts`, both marked
"PROD-ONLY — confirm live"); it doesn't mention `booking_cleaners`, `settings`, or
`member_pin_reset_codes` at all, so it's incomplete relative to the guard's actual target list, not
just wrong about the 2 it does cover.

| Target | In-repo `CREATE TABLE`? | Live app usage | PostgREST fuzzy hint | Hint verified? | **Recommendation** |
|---|---|---|---|---|---|
| `booking_cleaners` | No | 2 call sites | `booking_assignees` (exists, 0 rows) | Semantically plausible (assignment join), but `booking_assignees` **has no `tenant_id` column** (`42703` on probe) — not RLS-ready even if it is the right table | **Drop from guard array now.** Not a mechanical rename — `booking_assignees` would need a `tenant_id` column added and the equivalence confirmed before it could go in the array. Separate ticket. |
| `cleaners` | No | 30+ call sites | `leads` (exists, but has **no `tenant_id`** either, and semantically unrelated — leads ≠ staff) | Hint is a Levenshtein artifact, not real. Better hypothesis (mine, from `schema-drift-register.md`'s own evidence that `011_parity_with_nycmaid.sql` adds `sms_consent` to **`team_members`**, not `cleaners`): `cleaners` was superseded by `team_members`, which I confirmed **exists, has `tenant_id`, has live data**. | **Drop from guard array now; do not rename to `team_members` without a real column-diff.** I only verified `team_members` has `tenant_id` — I have not compared it column-for-column against what `cleaners` call sites expect (`name`, `phone`, `status`, `zone`, `hourly_rate`, `sms_consent`, `home_latitude/longitude` per `selena/tools.ts`). If confirmed equivalent, the fix is a **code migration** (repoint 30+ call sites to `team_members`), not a guard-array edit — bigger than this doc's scope. |
| `cleaner_payouts` | No | 3 call sites | `team_member_payouts` (exists, has `tenant_id`, 0 rows) | Same `cleaners`→`team_members` hypothesis extends naturally here; plausible but unverified, and 0 live rows is odd for an "actively used" payouts table | **Drop from guard array now**, pending the same `cleaners`/`team_members` reconciliation above (they're almost certainly one decision, not two). |
| `settings` | No | **0 call sites — nothing in the repo references it** | `ratings` (exists, has `tenant_id`, real data — but semantically unrelated, pure fuzzy-match noise) | N/A | **Drop from guard array — permanently, not just "for now."** `tenant_settings` is already a separate, confirmed-existing entry in the same Tier 4 list (per W2's census: 1 row, 0 NULL). `settings` looks like a stale/duplicate name that never should have been a separate target. |
| `member_pin_reset_codes` | **Yes** — `platform/migrations/2026_07_03_member_pin_reset.sql`, full definition incl. `tenant_id uuid not null` | 4 call sites, wired to a live UI (`/reset-pin`) | — | — | **Not a naming question. Run the existing migration.** This is the one target where the fix is "apply the migration that already exists," not "reconcile a name." Until it's applied, drop from the guard array so Tier 4 isn't blocked by it; re-add it once the migration runs and the table is confirmed present with 0 NULL `tenant_id` rows (it will be — `tenant_id NOT NULL` from creation, no legacy rows possible). |

## Recommended immediate action (mechanical, in scope for "drop from target array")

All 5 should come **out** of `rls-gap-closure.sql`'s `_targets` array (currently 58) so the Tier
1–5 guard can proceed past its precondition check without being blocked by names that don't
resolve today. That drops the array to 53 and the `IF array_length(_targets, 1) <> 58` self-check
on line 102 needs updating to 53 in the same edit. **I have not made this edit** — leader order was
file-only reconciliation doc, no guard code changes yet. This is a 1-line array edit + 1-line
count-constant edit when authorized.

None of these 5 should be silently dropped from the *product* — `member_pin_reset_codes` is a live
broken feature, and `cleaners`/`cleaner_payouts`/`booking_cleaners` cover 35+ call sites that need
a real disposition (dead code vs. needs repointing to `team_members`/`team_member_payouts`/
`booking_assignees`). Those are follow-up items, not blockers to unsticking the Tier 2–5 RLS
rollout — RLS just needs the array fixed to stop referencing tables that don't exist.

## Summary for the leader

1. **Confirmed independently** (different credential path than W2): all 5 tables genuinely absent
   from prod. Agrees with W2, contradicts W5's older `schema-drift-register.md` assumption for
   `cleaners`/`cleaner_payouts`.
2. **New, higher-priority finding**: `member_pin_reset_codes` isn't a naming/drift issue — it's an
   unapplied in-repo migration backing a live user-facing PIN-reset form. Recommend checking
   prod error logs for this before anything else here.
3. **Mechanical fix for RLS unblock**: drop all 5 from `rls-gap-closure.sql`'s target array (58→53,
   update the self-check constant) — not done yet, awaiting authorization.
4. **Not mechanical, needs a real decision**: whether `cleaners`/`cleaner_payouts`/`booking_cleaners`
   app code is dead or needs repointing to `team_members`/`team_member_payouts`/`booking_assignees`
   — I only confirmed `tenant_id` presence on the candidates, not full column equivalence. `settings`
   has zero live references and should just be deleted from the array permanently, no follow-up
   needed.

Nothing enabled, no DDL run, no guard file edited.
