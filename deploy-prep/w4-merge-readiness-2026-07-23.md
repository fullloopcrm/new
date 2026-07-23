# W4 merge-readiness — p1-w4-2026-07-23-w4 (2026-07-23)

File-only prep. No merge, no push to main, no prod DB writes performed by this doc.

Branch is 10 commits ahead of `origin/main` (verified `git log origin/main..HEAD --oneline` on `p1-w4-2026-07-23-w4` @ ~17:13). Listed oldest → newest (apply order matters where noted).

---

### 1. `086251861` — feat: wire Find-a-Team-Member to the booking/client it's for

Files: `admin/find-cleaner/recent/route.ts`, `admin/find-cleaner/send/route.ts`, `dashboard/bookings/BookingsAdmin.tsx`, `dashboard/find-cleaner/page.tsx`, migration `2026_07_23_cleaner_broadcasts_booking_link.sql`.

**NOT standalone-safe.** Carries a real migration (adds `booking_id`/`client_id` to `cleaner_broadcasts`) that has **not** been applied to prod (prod DB write = Jeff's gate, not run by any worker). The code path silently degrades without it — `find-cleaner/send` writes the new columns, but they won't exist until the migration runs. **Must land migration before or atomically with this commit** at merge/deploy time. Also touches `BookingsAdmin.tsx`, shared with commit #2 below — apply in order, don't cherry-pick out of sequence.

### 2. `078b9df24` — feat(bookings): add Resend Payment Link button; confirm time-edit already works

Files: new `bookings/[id]/resend-payment-link/route.ts` + isolation test, `dashboard/bookings/BookingsAdmin.tsx`.

**Depends on #1's edit to `BookingsAdmin.tsx` landing first** (same file, sequential edits — cherry-picking this alone onto a clean main would likely still apply cleanly since it's an additive UI block, but safest to take #1 and #2 together in order). New API route is self-contained, no migration needed. Not yet live-verified (would fire a real SMS to a real client — flagged at the time, still unverified).

### 3. `c1ebff6e1` — fix(referral): resolve the referrer-portal 404 for 16 of 22 tenants

Files: `dashboard/referrals/page.tsx`, `middleware.ts`, `middleware.tenant-routing.test.ts`.

**Sequential dependency with #4** — both touch `middleware.ts`'s referral/signup carve-out; #4 splits the single exclusion set this commit introduces into two. Apply #3 then #4, don't skip either. No migration, no other-branch collision known.

### 4. `44e77b82f` — fix(referral): nycmaid's own referrer-portal link 404s; split portal/signup carve-out; restyle template portal

Files: `site/nycmaid/referral/page.tsx`, `site/template/referral/page.tsx`, `middleware.ts`, `middleware.tenant-routing.test.ts`.

Builds directly on #3 (splits its combined exclusion set into two independent ones + restyles the shared referral portal to design tokens). Take with #3, in order. Standalone-safe otherwise — no migration, no known cross-branch file overlap.

### 5. `953ad637a` — feat(sales-partners): finish referrer commission tracking, integrate with Sales Partners admin page

Files: `api/referrers/route.ts` + isolation test, `dashboard/sales-partners/page.tsx`.

**Standalone-safe.** No file overlap with #1-4 or any other commit on this branch. No migration. Conceptually related to the referral work (#3/#4) but doesn't touch the same files — can cherry-pick independently.

### 6. `dbbb7e185` — fix(security): job expenses accepted a cross-tenant vendor/service/budget-line id

Files: `jobs/[id]/expenses/route.ts` + isolation test.

**Standalone-safe.** No migration, no overlap with any other commit here. W2 independently confirmed this exact fix on their own branch's audit pass and did NOT re-fix it (already covered) — no cross-branch collision on this one specifically.

### 7. `5d3685abf` — fix(security): quote budget line items accepted cross-tenant service_type_id/category_id

Files: `quote-budgets/[quoteId]/route.ts` + isolation test.

**Standalone-safe.** Same as #6 — W2 independently checked this file and found it already fixed here, chose not to duplicate. No known cross-branch collision.

### 8. `675dc456f` — fix(security): equipment bookings accepted cross-tenant job_id/quote_id

Files: `equipment/[id]/bookings/route.ts` + isolation test.

**Standalone-safe.** No migration, no known overlap with any other branch's commits (distinct file from #10's `equipment/route.ts` base CRUD).

### 9. `b8f339ba2` — fix(security): catalog BOM materials accepted cross-tenant inventory_item_id

Files: `catalog/[id]/materials/route.ts` + isolation test.

**Standalone-safe.** Distinct file from #10's `catalog/route.ts` base CRUD. No known overlap. (W1 independently found and fixed a MORE SEVERE version of this same route on `p1-w1-2026-07-23` — commit `e0882efe5` — which also covers the URL-param `service_type_id` this commit didn't touch. **Cross-branch overlap, not a correctness conflict** — W1's fix is a superset. When merging, prefer W1's version or diff the two before taking both.)

### 10. `b1fe4dfe5` — fix(security): catalog/equipment accepted cross-tenant category_id/service_type_id

Files: `catalog/route.ts` + isolation test, `equipment/route.ts` + isolation test.

**KNOWN CROSS-BRANCH COLLISION, flagged live in the channel (16:53/16:55).** `p1-w3-2026-07-23-w3` independently fixed the identical bug in both files: `catalog/route.ts` category_id (their commit `542c70436`) and `equipment/route.ts` service_type_id/category_id (their commit `bf6e3e42d`). Both branches' fixes are functionally equivalent and independently RED/GREEN verified — not a correctness problem, but merging both branches as-is WILL produce a file conflict on these two files. **Recommend at merge time: take one side's version (either is correct), diff the two for any test-coverage differences worth keeping, drop the duplicate.** Standalone-safe otherwise — no migration.

---

## Summary — apply-order groups

- **Group A (BookingsAdmin.tsx dependency chain):** #1 → #2, in order. #1 also needs its migration run first (Jeff gate).
- **Group B (middleware.ts dependency chain):** #3 → #4, in order.
- **Group C (fully standalone, any order):** #5, #6, #7, #8, #9, #10.
- **Cross-branch conflicts to resolve at merge time (not blocking, just needs a human/leader pick):** #9 vs `p1-w1` `e0882efe5` (take the superset — W1's), #10 vs `p1-w3` `542c70436`+`bf6e3e42d` (equivalent fixes, pick one).

## Gates still open (Jeff-only, not touched by this branch)

- Migration `2026_07_23_cleaner_broadcasts_booking_link.sql` (commit #1) not yet run on prod.
- Item 3 from the original queue (mileage tracking / equipment-maintenance planner) — investigation-only, no code, holding for Jeff's go per 15:49 report.
- Resend-payment-link (#2) has never been live-click-tested against a real client (would fire a real SMS) — flagged, not resolved.

## Verification status (all commits, as of last push)

tsc clean, full suite 807 files / 4451 tests passing (last full run @ ~16:48, after commit #10). Every commit individually RED/GREEN-verified at the time it landed (see LEADER-CHANNEL.md for the per-commit verification detail). Branch pushed to `origin/p1-w4-2026-07-23-w4` through commit #10 — this doc adds no new commits.
