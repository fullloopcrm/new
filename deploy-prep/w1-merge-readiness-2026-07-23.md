# W1 merge-readiness — p1-w1 (pushed to origin/p1-w1-2026-07-23)

16 commits ahead of origin/main. No merge performed, no push to main.
Full suite green at HEAD: `npx tsc --noEmit` 0 errors, `npx vitest run`
817/817 test files, 4464/4464 tests, 38 skipped, 0 failed.

## Commits (oldest first)

**e376fbfca** — `fix: Calendar view now opens bookings in a side panel, not a full page`
Extracted `dashboard/bookings/[id]/page.tsx`'s inline detail markup into a new
`BookingDetailContent.tsx` component, reused it from a side panel in
`RichMonthView.tsx` (Calendar view) so both entry points now share one UI
instead of Calendar opening a full page and the Bookings list opening a
panel. New test: `RichMonthView.calendar-panel.test.tsx`.

**f85cdf9f9** — `fix: team member delete FK crash from unguarded payout/payroll history`
`team/[id]/route.ts` DELETE now checks `team_member_payouts`/payroll history
before deleting (was a raw FK-constraint 500). New test:
`route.delete-payout-guard.test.ts`.

**4e1875e91** — `fix: Job Map re-geocoded every address on every load, add real caching`
New `clients/[id]/geocode-cache/route.ts` persists lat/lng after a fresh
geocode; `dashboard/map/page.tsx` checks cache before calling the geocoder.
New tests: `route.isolation.test.ts`, `page.geocode-cache.test.tsx`.

**90c6325f9** — `perf: skip redundant in-build TypeScript check to cut Vercel deploy time`
`next.config.ts` only — `typescript.ignoreBuildErrors` gated on a real
pre-build `tsc` step already existing elsewhere in the pipeline (CI runs it
separately). Standalone.

**bb9d64e98, 5e93d88c5, ccda65e40, f9fb9bd4e, 8dac74c2f, ac0e79a5a** — 6 cron
naive-ET/UTC misparse fixes (`renurture`, `payment-followup-daily`,
`retention`, `outreach`, `no-show-check`, `late-check-in`). Each cron route +
its own new `route.et-boundary.test.ts`/similar. Standalone per-file, no
overlap with any other branch's work I'm aware of.

**2918c611d** — `fix: DELETE /api/bookings/[id] hard-deleted every booking, ignoring cancel_series/hard_delete`
`bookings/[id]/route.ts` DELETE: default soft-cancel, `cancel_series=true`
pauses the schedule + cancels future siblings, `hard_delete=true` only when
already cancelled. New `route.cancel-and-hard-delete.test.ts`, updated
`route.isolation.test.ts`. `audit.ts` gains `booking.cancelled`/
`booking.hard_deleted` actions.

**f8bb7b804** — `fix: Mark Paid in BookingsAdmin.tsx silently dropped payment fields`
`BookingsAdmin.tsx` now routes payment-field saves to
`PATCH /api/bookings/[id]/payment` instead of the generic PUT (which
silently dropped `status`/`payment_date` derivation). **File overlap: W3 and
W4 also touched `BookingsAdmin.tsx` this session** — per W3's 17:35 master
merge plan, this is a real 3-way conflict needing an actual merge attempt
with full-suite verification, not a static-diff guess (W3 was dispatched to
attempt this at 17:12, in progress as of this doc).

**2c9ba84a6** — `fix(security): budget template edit accepted a cross-tenant service_type/category id`
`budget-templates/[id]/route.ts` PUT — verifies `line_items[].service_type_id`/
`category_id` belong to the caller's tenant before insert. No known overlap
(W4 checked the `apply-to-quote` sibling separately, called it a dead end).

**e0882efe5** — `fix(security): catalog materials/BOM endpoint had an active cross-tenant read-leak`
`catalog/[id]/materials/route.ts` POST — verifies `service_type_id` (URL) +
`inventory_item_id` (body) before upsert; GET's own embed made this an
active read-leak. **File overlap: W4 independently fixed the same file
(b8f339ba2)** — already resolved in W3's master merge plan (take mine as the
verified superset, drop W4's).

**5aeed3b1e** — `fix(security): job photo pair_id accepted a cross-tenant/cross-job reference`
`jobs/[id]/photos/[photoId]/route.ts` PATCH — verifies `pair_id` belongs to
the same tenant + job before writing. No known overlap.

**1e655c962** — `fix(security): job expense vendor/service-type/budget-line ids accepted cross-tenant references`
`jobs/[id]/expenses/route.ts` POST — verifies `vendor_id`/`service_type_id`/
`budget_line_item_id` before insert (active read-leak via GET's unfiltered
embeds). **File overlap NOT YET in the master merge plan: W4 independently
fixed the SAME file/same bug earlier this session (dbbb7e185, 16:28, per
channel) on p1-w4.** I found and fixed this fresh on my own branch without
realizing W4 had already landed it on theirs — each worktree started from
the same unfixed base, so this is a genuine 4th cross-branch conflict, same
shape as the catalog-materials one. Flagging for the master plan; haven't
diffed my fix against W4's line-by-line to say which is the superset.

**b4902ceff** — `test: fix 2 cross-tenant probes left stale by this session's DELETE /api/bookings/[id] soft-cancel change`
Self-caught regression: my own 2918c611d change left 2 tests in
`src/lib/cross-tenant-routes.test.ts` and
`cross-tenant-routes-booking-detail.test.ts` asserting the old
unconditional-hard-delete contract. Route behavior was correct and
consistent with GET/PUT on the same route; only the stale assertions needed
updating. No overlap — these files aren't touched by any other branch I'm
aware of.

## Cross-branch overlap summary

- `BookingsAdmin.tsx` — 3-way conflict (W1/W3/W4), master plan flags it for a
  real merge attempt, in progress by W3 as of this doc.
- `catalog/[id]/materials/route.ts` — 2-way conflict (W1/W4), already
  resolved in the master plan (take W1's).
- `jobs/[id]/expenses/route.ts` — 2-way conflict (W1/W4), **not yet in the
  master plan** — needs the same treatment as catalog-materials.
- Everything else in my 16 commits (crons, calendar panel, team-delete,
  geocode-cache, deploy-speed, budget-templates/[id], job-photos pair_id,
  the stale-test fix) has no known file overlap with W2/W3/W4's branches.

## Recommended merge order

The 6 cron fixes, calendar-panel fix, team-delete fix, geocode-cache fix,
and deploy-speed perf fix are independent and can land in any order. The
security fixes (budget-templates, catalog-materials, job-photos pair_id)
are independent of each other but catalog-materials and job-expenses need
cross-branch reconciliation with W4 first (see above). The bookings DELETE
soft-cancel fix + its stale-test fix should land together (same logical
change). BookingsAdmin.tsx mark-paid fix waits on the 3-way merge W3 is
attempting.
