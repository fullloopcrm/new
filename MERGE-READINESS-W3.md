# Merge-readiness — p1-w3 (2026-07-23)

7 commits ahead of origin/main, oldest first. All pushed to `origin/p1-w3-2026-07-23-w3`. Nothing pushed to main, no prod writes, no deploys.

## 1. `25858b159` — feat(dashboard): clickable stat drill-downs, mobile strip-down, multi-person booking display

**What:** Generic drill-down modal pattern for Loop dashboard stat tiles (`ClickableStatGrid.tsx` + `StatDrillModal.tsx`, reusable — not nycmaid-specific). Mobile view strips the dashboard to today/tomorrow jobs + this-month count/revenue, removes the schedule-issues banner and map. Bookings list/dashboard now show all assigned team members on a multi-person booking, not just one.

**Standalone-safe:** No. Touches `dashboard/page.tsx` with a large diff (351 lines changed). **Known live bug in this same file, NOT introduced or fixed by this commit:** the Today/Tomorrow Schedule widget still uses raw `new Date()`/`.getFullYear()` etc. instead of the `etToday()`/`parseNaiveET()` helpers used everywhere else (found in my 16:22 investigate-only report to the leader, not yet fixed by anyone). A merge here will carry that bug forward unless someone fixes it first — flagging so whoever merges doesn't assume this file is clean. Also touches `bookings/route.ts` (1-line) and `BookingsAdmin.tsx` — check for line-level conflicts against W1's cancel-jobs/mark-paid fixes to the same files (`2918c611d`, `f8bb7b804` on p1-w1) before merging; I have not diffed against p1-w1's current state to confirm overlap depth.

## 2. `09b6f6c83` — feat(bookings,sales): surface job numbers on the Bookings list and Sales pipeline

**What:** Job numbers now visible on both Booking view and Sales pipeline view. New `pipeline/route.job-number.test.ts`.

**Standalone-safe:** Mostly. Touches `BookingsAdmin.tsx` again (14 lines) — same conflict-risk note as above. `pipeline/route.ts` and `sales/pipeline/page.tsx` are new/isolated to this feature, low conflict risk. Note: W4's 17:03 report confirms `job_seq`/`customer_number` are purely trigger-assigned, never written by any API route — this commit only reads/displays them, consistent with that finding, no known conflict with W4's newest-migration audit.

## 3. `48b9be523` — feat(clients): safe delete button, click-to-call/text, service-notes history, contact info on Loop schedule

**What:** Client profile delete (soft/safe-archive, not hard delete), click-to-call/text on client list, service-notes history section, client address+phone surfaced on the Loop dashboard's today/tomorrow schedule.

**Standalone-safe:** Mostly. Touches `dashboard/page.tsx` again (9 lines, smaller) and `clients/[id]/route.ts` (33 lines, adds DELETE handling + `audit.ts` 1-line addition to `AuditAction`). Check `audit.ts` for enum-value collisions if another branch also extended `AuditAction` (W1's cancel-jobs fix extended it with `booking.cancelled`/`booking.hard_deleted` — different values, should merge cleanly, but verify no duplicate-key conflict).

## 4. `b8997665b` — feat(clients): per-address phone + communication preferences

**What:** Extends the existing `client-addresses.tsx` multi-address UI with per-address phone + SMS/Email/Call toggles. `lib/client-properties.ts` + the properties API route read/write the new columns, backward-compatible (new params optional).

**Standalone-safe: NO — has a real external dependency.** Ships `platform/src/lib/migrations/2026_07_23_client_property_phone_comms.sql` (adds `phone`/`sms_ok`/`email_ok`/`call_ok` to `client_properties`) — **prepared, NOT run against prod.** The UI/API code is safe to merge (all new columns are optional, nothing breaks if the migration hasn't run yet — reads/writes will just no-op on the missing columns until it does), but the FEATURE doesn't actually work end-to-end until Jeff approves running this migration. Flag this explicitly at merge time so it doesn't get treated as fully live just because the code merged.

## 5. `ffa0fc9af` — fix(security): vendor-items link accepted cross-tenant vendor_id/inventory_item_id

**What:** `POST /api/vendors/[id]/items` now verifies both `vendor_id` (URL) and `inventory_item_id` (body) belong to the caller's tenant before upsert — closes a real read-leak via the route's own `inventory_items()` embed.

**Standalone-safe: Yes.** Solo find, only touches `vendors/[id]/items/route.ts` + its own new test file. No other branch reported touching this file.

## 6. `542c70436` — fix(security): catalog items accepted a cross-tenant category_id

**What:** `POST`/`PATCH /api/catalog` now verify `category_id` belongs to the caller's tenant before writing.

**Standalone-safe: NO — confirmed duplicate fix.** W4 independently fixed the identical gap in the identical file (`catalog/route.ts`) at nearly the same time — see `b1fe4dfe5` on `p1-w4-2026-07-23-w4` (flagged mutually in the channel at 16:53/16:55). Both fixes are functionally equivalent (same check, same 400 behavior) but are literally different diffs against the same lines — **this WILL produce a merge conflict.** Recommend: at merge time, take one version (doesn't matter which, they're equivalent) and drop the other rather than trying to reconcile both; keep whichever branch's test file has better coverage (mine adds 3 tests to the existing `route.isolation.test.ts`, 8 total — didn't diff against W4's test file to compare).

## 7. `bf6e3e42d` — fix(security): equipment CRUD accepted cross-tenant service_type_id/category_id

**What:** `POST`/`PATCH /api/equipment` now verify `service_type_id` and `category_id` before writing.

**Standalone-safe: NO — same duplicate-fix situation as #6.** W4 also independently fixed this file (`equipment/route.ts`) in the same `b1fe4dfe5` commit on `p1-w4-2026-07-23-w4`. Same recommendation: pick one at merge time, don't try to reconcile.

## Summary for whoever merges

- **Clean, no-dependency commits:** `ffa0fc9af` (vendor-items) — cherry-pick anytime, zero risk.
- **Needs a decision, not a blocker:** `542c70436` and `bf6e3e42d` collide with p1-w4's `b1fe4dfe5` — pick one branch's version of `catalog/route.ts` and `equipment/route.ts`, discard the other. Functionally equivalent either way.
- **Needs Jeff's word before it's fully live (code is safe to merge regardless):** `b8997665b` — migration not yet run.
- **Check against p1-w1 before merging:** `25858b159`, `09b6f6c83`, `48b9be523` all touch `BookingsAdmin.tsx`/`dashboard/page.tsx`, which W1 also modified this session (cancel-jobs, mark-paid, the ET/UTC cron sweep touches adjacent files). I have not personally diffed p1-w3 against p1-w1's current HEAD to quantify the overlap — recommend whoever merges does a real `git diff`/three-way check rather than assume it's conflict-free based on this doc alone.
- **Known pre-existing bug carried forward, not introduced by any of these commits:** `dashboard/page.tsx`'s Today/Tomorrow Schedule widget still has the ET/UTC midnight-boundary bug (naive `new Date()` instead of the established `etToday()`/`parseNaiveET()` helpers). Worth fixing before or shortly after merge, not blocking.
