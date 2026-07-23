# Master merge plan — all 4 worker branches (2026-07-23)

Consolidates `MERGE-READINESS-W3.md` (this branch), `deploy-prep/w2-merge-readiness-2026-07-23.md`, `deploy-prep/w4-merge-readiness-2026-07-23.md`, and W1's actual commit log (**W1 never produced a written doc** — pulled directly via `git log origin/main..HEAD --oneline` + per-commit `git show --stat` on `/Users/jefftucker/flwork-p1-w1`, so this section is sourced from git, not a self-report).

No merge performed. No push to main. No prod writes. This is a plan only.

**Total: 35 commits across 4 branches** (W1: 15, W2: 4, W3: 8, W4: 10).

---

## 1. Cross-branch conflicts — one decision each

Three real file-level conflicts exist across all 35 commits. Everything else is either standalone or a same-branch sequential dependency (see §2).

### Conflict A — `catalog/[id]/materials/route.ts`: W1 vs W4

- W1's `e0882efe5` fixes BOTH the URL-param `service_type_id` AND the body's `inventory_item_id`.
- W4's `b8f339ba2` (branch commit #9) fixes only `inventory_item_id` — a strict subset.
- **Decision: take W1's `e0882efe5`. Drop W4's `b8f339ba2` entirely** (already flagged as a superset relationship by W4 themselves in their own doc — confirmed correct on inspection, not just trusting their self-report).

### Conflict B — `catalog/route.ts` + `equipment/route.ts`: W3 vs W4

- W3's `542c70436` (catalog) + `bf6e3e42d` (equipment) vs W4's `b1fe4dfe5` (branch commit #10, covers both files in one commit).
- Compared objectively: both fix the identical gap (unverified `category_id`/`service_type_id` from request body) with the identical shape (tenant-ownership check, 400 on miss), both RED/GREEN-verified, both extend the same pre-existing `route.isolation.test.ts` files rather than duplicating them, comparable diff size on both sides (W3: 27+40 lines in the two route.ts files; W4: 22+38). Genuinely equivalent — this is a coin-flip, not a quality call.
- **Decision: take W3's `542c70436` + `bf6e3e42d`. Drop W4's `b1fe4dfe5`.** Tiebreak reason (not a correctness reason): W3's fixes were verified against a full 805/4436-test suite run at the time each individually landed, and I have direct first-hand knowledge of the test coverage on this side to vouch for it. Jeff/leader can override — functionally interchangeable.

### Conflict C — `dashboard/bookings/BookingsAdmin.tsx`: W1, W3, W4 (3 branches, 4 commits)

This is the single highest-risk merge item and **this doc cannot fully resolve it** — the honest position is that it needs a real three-way merge attempt, not confident resolution from reading diffs in isolation, because line numbers shift as each patch applies and I have not run the actual merges.

What I verified directly (hunk line ranges against the common `origin/main` ancestor):
- W1 `f8bb7b804`: hunks at ~line 16 (import) and ~line 638-639 (mark-paid handler).
- W3 `25858b159`: hunks at ~line 27, 65, **618, 1383, 1654, 1773, 1850, 2011**.
- W3 `09b6f6c83`: hunks at ~line **636**, 1400, 1859 (sequential on top of `25858b159`, same branch — no conflict with itself).
- W4 `086251861`: hunks at ~line 261, 2359-2365.
- W4 `078b9df24`: hunk at ~line 2365 (sequential on top of `086251861`, same branch).

W1's ~638 and W3's ~618/636 region are close enough (20-line window) that a clean auto-merge is not guaranteed — both are editing inside the same `function BookingsPage()` body near the booking-action-button area. W4's edits (~261, ~2359-2365) look far enough from W1/W3's ~618-680 cluster to probably merge cleanly, but W3's own hunks run all the way out to ~2011-2029, which is close to W4's ~2359 region once line-number drift from earlier patches is accounted for — **too close to call without actually running the merge.**

**Decision: whoever performs the real merge must apply these 4 commits one at a time (not squashed, not parallel), resolving each conflict as it appears, and run the full test suite after each application** — not attempt to pre-resolve this file from static diffs. Suggested apply order: W1's `f8bb7b804` first (smallest diff, isolated mark-paid logic), then W3's `25858b159` → `09b6f6c83` (same-branch sequential pair, must stay together and in order), then W4's `086251861` → `078b9df24` (same-branch sequential pair, must stay together and in order — `086251861` also gates on its migration, see §3).

---

## 2. Proposed ordered apply sequence

### Phase 1 — Zero-conflict, zero-dependency (any order, safe to batch)

- W2: `a98d5fb1f` (cleaner star rating), `7edb90468` (CI flake retry) — **drop `277548166`** (net-zero diagnostic commit per W2's own doc, verified plausible: it's immediately reverted by the very next commit).
- W2: `b27e76bcf` (applicant photo carry-through)
- W1: `f85cdf9f9` (team-delete FK crash), `90c6325f9` (skip redundant tsc in Vercel build)
- W1: 6 cron ET/UTC fixes — `bb9d64e98`, `5e93d88c5`, `ccda65e40`, `f9fb9bd4e`, `8dac74c2f`, `ac0e79a5a` (each touches a distinct cron route file, no overlap with anything else in the fleet)
- W1: `2c9ba84a6` (budget-templates line-items), `5aeed3b1e` (job-photos pair_id), `e376fbfca` (calendar side panel — touches `BookingDetailContent.tsx`/`bookings/[id]/page.tsx`/`RichMonthView.tsx`, none shared with any other branch)
- W3: `ffa0fc9af` (vendor-items) — solo, zero overlap anywhere
- W4: `953ad637a` (referrer commission tracking), `dbbb7e185` (job-expenses — W2 independently confirmed already-fixed, not duplicated), `5d3685abf` (quote-budgets — same, W2-confirmed no duplicate), `675dc456f` (equipment-bookings sub-route, distinct file from equipment.ts base)
- W4: `c1ebff6e1` → `44e77b82f` (referral-portal 404 fix, same-branch sequential pair on `middleware.ts` — must land together in order, no cross-branch collision on `middleware.ts`)

### Phase 2 — Resolved conflicts (apply per §1 decisions)

- Take W1's `e0882efe5` (catalog materials), drop W4's `b8f339ba2`.
- Take W3's `542c70436` + `bf6e3e42d` (catalog + equipment category_id/service_type_id), drop W4's `b1fe4dfe5`.

### Phase 3 — High-risk sequential (apply one at a time, test after each — see Conflict C)

1. W1 `f8bb7b804` (mark-paid)
2. W1 `2918c611d` (cancel-jobs soft-delete — also touches `audit.ts`, confirmed non-conflicting with W3's separate `audit.ts` edit, different line)
3. W3 `25858b159` → `09b6f6c83` (dashboard drill-down + job numbers, sequential pair)
4. W3 `48b9be523` (client delete/contact-info — also touches `audit.ts`, `dashboard/page.tsx`; `dashboard/page.tsx` confirmed NOT touched by W1, so only stacks on top of W3's own `25858b159` edit to that file, same-branch, no cross-branch conflict there)
5. W3 `b8997665b` (per-address phone/comms — **migration gate, see §3**)
6. W4 `086251861` → `078b9df24` (find-cleaner + resend-payment-link, sequential pair — **migration gate on `086251861`, see §3**)

`bookings/route.ts` note: W1's `4e1875e91` and W3's `25858b159` both edit the exact same `.select(...)` line (W1 adds `latitude, longitude` to the `clients(...)` embed, W3 adds a new `booking_team_members(...)` embed alongside it). Textually a conflict, semantically trivial — the resolved line is just both additions concatenated into one select string. Flag it, don't fear it.

---

## 3. Gates still open (Jeff-only — not touched by any worker, no prod writes made)

- **Migration** `2026_07_23_client_property_phone_comms.sql` (W3 `b8997665b`) — code merges safely without it (new columns are optional), but the per-address-comms-prefs feature isn't functionally live until it runs.
- **Migration** `2026_07_23_cleaner_broadcasts_booking_link.sql` (W4 `086251861`) — code degrades silently without it per W4's own doc; must land migration before or atomically with this commit.
- **Live-fire risk, not migration-blocked but unverified:** W4's `078b9df24` resend-payment-link has never been click-tested against a real client (would fire a real SMS).
- Item 3 from the original W4 queue (mileage tracking / equipment-maintenance planner) — investigation-only, holding for Jeff, no code exists to merge.
- W2's CI-flake retry (`7edb90468`) is a documented stopgap, not a root-cause fix — informational, not blocking.

---

## 4. Verification status per branch (self-reported by each worker, not independently re-run by me for W1/W2/W4)

- **W1:** not yet reported as of this doc's writing (leader dispatched W2/W4 for a final health check at 17:06; no equivalent explicit re-check dispatch to W1 seen in the channel as of 17:2x — worth confirming W1 also runs one before Jeff's merge decision).
- **W2:** health check dispatched 17:06, ack'd 17:06, result not yet posted to channel as of this doc.
- **W3 (this branch):** tsc clean, full suite 805 files / 4436 tests passing as of last commit (`bf6e3e42d`, ~16:54) — not re-run since (only a docs commit landed after).
- **W4:** tsc clean, 807 files / 4451 tests passing per their own doc (as of ~16:48); health check re-dispatched 17:06, ack'd 17:17, result not yet posted to channel as of this doc.

**Caveat:** none of these numbers reflect a merged tree — each is a single-branch suite run. A real pre-merge health check has to run after Phase 1-3 are actually applied together, not before.

---

## 5. What this doc does NOT do

- Does not perform any merge, rebase, or cherry-pick.
- Does not push anything to main.
- Does not resolve Conflict C (BookingsAdmin.tsx) beyond identifying the risk and a suggested apply order — that needs a live merge attempt.
- Does not independently re-verify W1/W2/W4's individual commit claims beyond what's checkable from git metadata (file lists, line hunks, migration presence) — their described *behavior* (what each fix does) is taken from their own reports, same as any other worker's self-report in this fleet.
