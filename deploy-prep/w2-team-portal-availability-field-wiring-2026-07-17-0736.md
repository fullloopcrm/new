# W2 gap/fluidity refresh — 2026-07-17 07:36

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-team-portal-preferences-field-wiring-2026-07-17-0722.md`.

Leader's fresh 3-deep queue this round: (1) continue archetype depth, (2) continue fresh-ground hunting, (3) keep gap/fluidity current. All 3 done — see below.

## Fresh ground (real bug) — second instance of this session's field-wiring bug class on the team-member side, sibling of last round's preferences fix

Swept every `team-portal/*` route for the same "wrong storage location" shape found on `preferences` last round, widening beyond notification settings into the crew's other self-service settings.

**`GET/PUT /api/team-portal/availability`** (the crew member's own "Working Days" / "Time Off" settings, `/team` + `/team/availability` pages) — read and wrote a JSON blob into `team_members.notes` (the code comment literally said "Store availability in member notes as JSON for now") instead of the real `team_members.working_days` (`TEXT[]`), `unavailable_dates` (`DATE[]`), and `schedule` (`JSONB`) columns — all added by `migrations/013_full_parity.sql`, the same migration that added `notification_preferences` (last round's fix, this route's direct neighbor). Those three real columns are exactly what the scheduling engine reads to decide who's available on a given date: `src/lib/smart-schedule.ts`, `src/lib/availability.ts`, `src/lib/cleaner-availability.ts`, `src/app/api/cron/generate-recurring/route.ts` (auto-generates recurring bookings), `src/app/api/cron/schedule-monitor/route.ts`, and `src/app/api/admin/find-cleaner/preview/route.ts` (admin's manual assign tool). None of them read `notes`.

Consequence: this route's own PUT already checks for conflicting existing bookings before accepting a new blocked date (a real, working safeguard) — but that protection was illusory going forward. A crew member requesting time off had **zero effect on future scheduling**: `cron/generate-recurring` could still auto-generate a brand-new recurring booking on the exact date they'd explicitly blocked, and admin's find-cleaner tool would still suggest them as available on it. Changing working days via the portal never reached the column any scheduling surface actually reads either — every crew member's real `working_days`/`unavailable_dates`/`schedule` columns sat at whatever the admin last set (or null, for anyone whose availability was only ever self-managed), regardless of what they saved in their own portal.

**Fixed**: both handlers now target `working_days`/`unavailable_dates`/`schedule` directly (numeric day-index tokens from `/team/availability`'s UI are `String()`'d for the `TEXT[]` column and widened back to `Number` on GET; day-name tokens from `/team`'s own editor pass through unchanged — `day-availability.ts`'s `dayTokenToIndex` already normalizes both formats on the read side, so no format unification was needed here). 10 new tests (1 file): PUT writes the real `working_days`/`unavailable_dates`/`schedule` columns, PUT never touches `notes`, GET reads back from the real columns with correct numeric/day-name round-tripping, GET's Mon-Fri default is preserved for a never-configured member, the existing booking-conflict 409 check still works sourced from the real `unavailable_dates` column, plus 2 wrong-tenant/invalid-token probes. Mutation-verified via `git apply -R`/`git apply` — 4 of 10 failed for the right reason on revert (the other 6 — defaults, tenant probes, the booking-conflict block — correctly stayed green, since they don't depend on column mapping), restored GREEN.

`npx tsc --noEmit`: clean. `eslint` on all touched files: 0 errors, 0 new warnings (1 pre-existing `no-explicit-any` warning on an untouched line). Full suite: 545 files (was 544), 2451 tests total (was 2441) — 2414 passed + 37 skipped, 0 failed, 0 regressions from this round's change.

No DB migration needed — `working_days`, `unavailable_dates`, `schedule` already exist on `team_members` (migration 013).

## Archetype depth

Added `sim-all-trades.ts` section 5a-34. Proves against a real tenant/team_members row: (a) `working_days`/`unavailable_dates`/`schedule` genuinely exist as columns on the live table; (b) the fixed PUT update shape writes all three and leaves an unrelated `notes` value untouched; (c) `cron/generate-recurring`'s own `unavailable_dates.includes(date)` check now actually observes the crew member's real time-off request. Not yet executed — leader-run-only, writes to live tenant/team_members table. Verified statically: `tsc --noEmit` clean, `eslint` clean (0 new, same 3 pre-existing warnings on untouched lines).

## NOTICED — not fixed, flagging for the leader/Jeff

Carried forward unchanged from the prior round's list (`w2-team-portal-preferences-field-wiring-2026-07-17-0722.md`), items 1-15, plus:

16. **New, and a bigger version of the same disconnect**: the admin dashboard's own `/dashboard/team/[id]` "Schedule & Availability" and "Time Off" editors have the *identical* wrong-storage-location bug this round just fixed on the crew side — but on the admin side. `saveSchedule()` builds `notes.working_hours` (a `{0-6: {start,end}}` map) and `notes.time_off` (an array of `{start,end,reason}` **date ranges**) and persists both via `PUT /api/team/[id]` with `{ notes: JSON.stringify(...) }` — never touching the real `schedule`/`unavailable_dates` columns this round wired the crew's own page to. Not fixing unilaterally, for a real reason distinct from NOTICED #15's (that one was pure dead code — this one has a genuine format gap): admin's `time_off` entries are **date ranges with an optional reason string**, but `unavailable_dates` is a flat `DATE[]` with no reason field. Mapping one onto the other requires a product decision (expand each range into individual dates? where does `reason` go — a new column, or dropped?) that isn't inferable from the code. Flagging in detail now so it isn't rediscovered as a fresh mystery later. Also note: `notes` on `team_members` is now a **shared JSON scratch space** for three admin-side features (`working_hours`, `time_off`, and the already-flagged dead `notification_prefs` from NOTICED #15) plus arbitrary free text (the admin page's `displayNotes` logic falls back to showing raw `notes` as plain text when it doesn't parse as one of those known keys) — every one of those three JSON keys independently merges onto whatever's already there to avoid clobbering the others, which is fragile but currently functions as designed. This round's fix does not touch any of that; the crew-side route no longer participates in the shared `notes` blob at all (a strict improvement — one less writer to reconcile).

## MISSING-FEATURE GAPS

Carried forward unchanged from the prior round's list, items 1-26.

## UX-FRICTION

Carried forward unchanged from the prior round's list.

File-only, no push/deploy/DB. 3 commits this round (1× `fix`+test, 1× `test(sim)`, 1× `docs`).
