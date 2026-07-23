# W4 merge-readiness — p1-w4-2026-07-23-w4 (2026-07-23)

File-only prep. No merge, no push to main, no prod DB writes performed by this doc.

Branch is 10 commits ahead of `origin/main` (verified `git log origin/main..HEAD --oneline` on `p1-w4-2026-07-23-w4` @ ~17:13). Listed oldest → newest (apply order matters where noted).

---

### 1. `086251861` — feat: wire Find-a-Team-Member to the booking/client it's for

Files: `admin/find-cleaner/recent/route.ts`, `admin/find-cleaner/send/route.ts`, `dashboard/bookings/BookingsAdmin.tsx`, `dashboard/find-cleaner/page.tsx`, migration `2026_07_23_cleaner_broadcasts_booking_link.sql`.

**NOT standalone-safe (migration gate only — file-merge risk now CLOSED, see below).** Carries a real migration (adds `booking_id`/`client_id` to `cleaner_broadcasts`) that has **not** been applied to prod (prod DB write = Jeff's gate, not run by any worker). The code path silently degrades without it — `find-cleaner/send` writes the new columns, but they won't exist until the migration runs. **Must land migration before or atomically with this commit** at merge/deploy time. Also touches `BookingsAdmin.tsx`, shared with commit #2 below and with W1's/W3's `BookingsAdmin.tsx` edits — apply order verified, see the update below.

### 2. `078b9df24` — feat(bookings): add Resend Payment Link button; confirm time-edit already works

Files: new `bookings/[id]/resend-payment-link/route.ts` + isolation test, `dashboard/bookings/BookingsAdmin.tsx`.

**Depends on #1's edit to `BookingsAdmin.tsx` landing first** (same file, sequential edits). New API route is self-contained, no migration needed. **STILL NOT live-click-tested** (would fire a real SMS to a real client), but as of 2026-07-23 ~18:02 there's a confirmed reason it wouldn't have worked anyway even if tested: this route's client-SMS leg calls `sendClientSMS()` from `lib/nycmaid/client-contacts.ts`, which hits the same broken global-`TELNYX_API_KEY` legacy path the fleet is actively fixing as a P0 (see LEADER-CHANNEL.md ~17:20-17:25 — clients not getting 30-min-post-checkout payment texts). This route degrades gracefully (`sent:false` surfaced honestly to the UI + admin fallback SMS via the working path), it doesn't silently fail — but it will not successfully text a client until that P0 fix lands. Flagged to the channel at 18:02; the P0 fix (once shipped) should be verified against this route too, not just the original 30-min-alert path.

**UPDATE 2026-07-23 ~18:00 — BookingsAdmin.tsx apply-order CONFIRMED, not just planned.** Ran a real isolated-worktree merge test (`scratchpad/scratch-merge-test-w1w3w4-bookingsadmin`, off `origin/main`, symlinked `node_modules`, not pushed anywhere, fully removed after) cherry-picking all 5 commits that touch this file across 3 branches in dependency order: W1's `f8bb7b804` (mark-paid) → W3's `25858b159` (dashboard drill-down) + `09b6f6c83` (job numbers) → this branch's `086251861` + `078b9df24`. **Every cherry-pick auto-merged, zero conflict markers, zero manual resolution.** Verified after: `tsc --noEmit` clean, full suite 804 files / 4429 tests passing, 0 failed. Spot-checked the merged file directly — both UI additions (Find a Team Member button, Resend Payment Link button) are present and intact. This closes W3's earlier hunk-proximity concern (flagged in `MASTER-MERGE-PLAN-2026-07-23.md`) — real 3-way merge resolves cleanly, no human call needed for this file.

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

**CROSS-BRANCH CONFLICT, RESOLVED.** W1 independently fixed the identical bug on `p1-w1-2026-07-23` (commit `1e655c962`) — same file, same `route.isolation.test.ts` filename (add/add conflict, not a content merge). Diffed both sides directly (2026-07-23 ~17:19-17:50): functionally EQUIVALENT — both verify `vendor_id`/`service_type_id`/`budget_line_item_id` ownership before insert, same active-read-leak coverage. Only difference is code shape: W1's reuses the existing `category_id`-derivation query as the `service_type_id` ownership check (one fewer DB round-trip); this branch's does a uniform loop with a separate query per field. **RECOMMENDATION (independently reached by both W1 and this branch, corroborated in the channel): take W1's `1e655c962`, drop this branch's `dbbb7e185`** — pure efficiency win, no coverage gap either way. W2 also independently checked this file on their own audit pass and did not re-fix it (already covered by one of the two).

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

- **Group A (BookingsAdmin.tsx dependency chain):** #1 → #2, in order. #1 also needs its migration run first (Jeff gate). **Full 5-commit cross-branch merge test (this branch + W1 + W3) CONFIRMED clean as of 2026-07-23 ~18:00 — see update under #2 above.**
- **Group B (middleware.ts dependency chain):** #3 → #4, in order.
- **Group C (fully standalone, any order):** #5, #7, #8, #9, #10 (#6 moved to conflict list below — resolved).
- **Cross-branch conflicts, all resolved to a single recommendation:**
  - #6 (job-expenses) vs `p1-w1` `1e655c962` — **take W1's**, drop this branch's `dbbb7e185`.
  - #9 (catalog-materials) vs `p1-w1` `e0882efe5` — **take W1's** (verified superset).
  - #10 (catalog.ts + equipment.ts category_id) vs `p1-w3` `542c70436`+`bf6e3e42d` — equivalent fixes, pick either side (W3's arbitrary tiebreak per `MASTER-MERGE-PLAN-2026-07-23.md` keeps theirs, drop this branch's `b1fe4dfe5`).

## Gates still open (Jeff-only, not touched by this branch)

- Migration `2026_07_23_cleaner_broadcasts_booking_link.sql` (commit #1) not yet run on prod.
- Item 3 from the original queue (mileage tracking / equipment-maintenance planner) — investigation-only, no code, holding for Jeff's go per 15:49 report.
- Resend-payment-link (#2) has never been live-click-tested against a real client (would fire a real SMS) — flagged, not resolved.

## Verification status (all commits, as of last push)

Final pre-merge health check (2026-07-23 ~17:38, ordered by leader): `tsc --noEmit` clean, full suite 807 files / 4451 tests passing, 0 failed, 38 skipped (pre-existing). Every commit individually RED/GREEN-verified at the time it landed (see LEADER-CHANNEL.md for the per-commit verification detail). Branch pushed to `origin/p1-w4-2026-07-23-w4` through commit #10 (`ba66ec7e9`, this doc's first version) — this update adds no new commits, doc-only.

## Open note not yet resolved: shared P0 in flight

As of 2026-07-23 ~18:02 the fleet is actively fixing a P0 (clients not receiving 30-min-post-checkout payment texts) rooted in the same `lib/nycmaid/client-contacts.ts` → `lib/nycmaid/sms.ts` legacy path that commit #2's Resend Payment Link route also calls (see #2's update above). Whatever fix lands for that P0 should be verified against this branch's route too before/at merge — not yet done as of this doc's last update.
