# Master merge plan — all 4 worker branches (2026-07-23)

**UPDATE ~17:56, second pass.** W1 has since written its own `deploy-prep/w1-merge-readiness-2026-07-23.md` (wasn't available at first pass). Since first pass: the BookingsAdmin.tsx conflict (Conflict C below) was actually merge-tested in a scratch worktree — resolved cleanly, no longer just a risk assessment. A TOP-PRIORITY financial-bug sweep landed 3 new fixes (W1 SMS timeout, W2 payment-row display, my checkout-price recompute) plus a 4th real cross-branch conflict W1 found (`jobs/[id]/expenses/route.ts` vs W4's earlier fix on the same file).

No merge performed. No push to main. No prod writes. This is a plan only.

**Total: 39 commits across 4 branches** (W1: 17, W2: 5, W3: 9, W4: 10).

---

## 1. Cross-branch conflicts — one decision each

Four real file-level conflicts exist across all 39 commits. Everything else is either standalone or a same-branch sequential dependency (see §2).

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

**UPDATE 17:48 — actually tested, not just planned.** Per leader's 17:12 dispatch, ran the real 3-way merge in an isolated scratch worktree (`scratchpad/scratch-merge-test`, off `origin/main`, never pushed anywhere) covering the W1+W3 portion (`f8bb7b804` → `25858b159` → `09b6f6c83`): **all 3 applied via a clean git auto-merge, zero conflict markers, zero manual resolution.** Full suite after: tsc clean, 803 files / 4425 tests passing, 0 failed. The 20-line hunk-proximity concern below was a real risk to flag beforehand but turned out to be a false alarm once tested — the actual line-level changes didn't overlap enough to conflict.

**Not yet tested: W4's 2 commits** (`086251861`, `078b9df24`) against this same file — out of scope of the 17:12 dispatch (W1+W3 only). Given W4's hunks (~261, ~2359-2365) sit far from the W1/W3 cluster (~618-680), a clean merge is likely but **not verified** — recommend the same real-merge-test treatment before assuming it, not a repeat of the static-diff mistake.

**Decision:** apply W1's `f8bb7b804` → W3's `25858b159` → `09b6f6c83` as a pre-tested-clean group (confirmed above). Then attempt W4's `086251861` → `078b9df24` on top with the same real-worktree-test method before trusting it — `086251861` also gates on its migration, see §3.

### Conflict D — `jobs/[id]/expenses/route.ts`: W1 vs W4 (found 17:09/per W1's 17:5x doc, not caught in first pass)

- W1's `1e655c962` and W4's `dbbb7e185` (already landed earlier in this plan's Phase 1, see below) independently fixed the identical gap on the identical file — same 3 fields (`vendor_id`/`service_type_id`/`budget_line_item_id`), same active-read-leak class (GET's unfiltered `vendors(name)`/`service_types(name)` embed), both RED/GREEN-verified, comparable diff size (W1: 67 lines incl. test; W4: 59 lines incl. test). Objectively equivalent again — same shape as Conflict B.
- **Decision: take W4's `dbbb7e185` since it's already in Phase 1 of this plan and W2 independently confirmed it clean/non-duplicated at 17:01. Drop W1's `1e655c962`.** Reason: minimizes churn to an already-resolved phase rather than re-sequencing Phase 1. Functionally interchangeable — override if preferred.
- **Correction to Phase 1 below:** the line crediting `dbbb7e185` to W4 needs a footnote that W1 independently re-fixed the same thing on their own branch — not a new problem, just documenting it here so it's not rediscovered a third time.

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
- **NEW (TOP-PRIORITY financial-bug sweep, ~17:37-17:52):**
  - W1 `68745041d` — Telnyx SMS fetch had no timeout, could silently exhaust maxDuration and drop client texts with zero trace. Touches `lib/nycmaid/sms.ts`, `src/app/team/page.tsx` (client-side timeout on the mobile Heads-Up button). No known file overlap with W2/W3/W4.
  - W2 `748261419` — closeout payment rows showed $0.00 for real payments (`closeout-detail.tsx` read `p.amount`, API returned `p.amount_cents`; aggregate total was unaffected, only the row display). No known overlap.
  - W3 `770577c0f` (this branch) — `dashboard/bookings/[id]/page.tsx`'s "Complete" button called a bare status-only PATCH that never recomputed `price`/`actual_hours`/`team_member_pay`, unlike the two other checkout paths (mobile `team-portal/checkout`, desktop `BookingsAdmin.tsx`) which already did. Fixed to match.
  - **CONFLICT E, CONFIRMED (not speculative — checked directly): `770577c0f` vs W1's `e376fbfca`.** W1's calendar-panel refactor (Phase 1 above) DELETES `STATUS_ACTIONS`, `updateStatus()`, and the "Complete" button entirely from `bookings/[id]/page.tsx`, moving them into a new `BookingDetailContent.tsx` — the exact code my fix edited. `git show e376fbfca -- .../page.tsx` confirms `updateStatus`/`STATUS_ACTIONS`/the `onClick={() => updateStatus('completed')}` button all appear only on the delete side of that diff (664 lines removed). **This is not a textual merge conflict that resolves itself — if W1's commit lands, my pricing-recompute fix has nothing left to attach to in this file and will be silently dropped unless someone manually ports the same `computeCheckoutPricing()` logic into the new `BookingDetailContent.tsx`.** Decision: whoever merges must apply W1's `e376fbfca` FIRST, then manually re-implement my `770577c0f` fix against `BookingDetailContent.tsx`'s copy of the Complete button (same fix, new location) — not a drop-in cherry-pick. Flagging to the channel separately, this is too important to leave buried in this doc alone.

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

- **W1:** tsc clean, 818 files / 4467 tests passing per their own doc (as of `68745041d`, the SMS fix, ~17:37).
- **W2:** tsc clean, eslint clean per their own report (as of `748261419`, the payment-row fix, ~17:48) — no full vitest count given for that specific commit, but their 17:06-dispatched health check (an earlier commit) reported 802/802 files, 4422/4422 tests, 0 failed.
- **W3 (this branch):** tsc clean, full suite 806 files / 4437 tests passing as of `770577c0f` (the checkout-price fix, ~17:52) — current as of this doc.
- **W4:** tsc clean, 807 files / 4451 tests passing per their own doc (as of ~16:48) — no update since; their 17:06-dispatched final health check was ack'd 17:17, result not yet posted to channel as of this doc.

**Caveat:** none of these numbers reflect a merged tree — each is a single-branch suite run. A real pre-merge health check has to run after Phase 1-3 are actually applied together, not before. Conflict C (partial) is the one exception — that specific 3-commit subset (W1+W3 on BookingsAdmin.tsx) WAS tested merged together, see §1.

---

## 5. What this doc does NOT do

- Does not perform any merge, rebase, or cherry-pick.
- Does not push anything to main.
- Does not resolve Conflict C (BookingsAdmin.tsx) beyond identifying the risk and a suggested apply order — that needs a live merge attempt.
- Does not independently re-verify W1/W2/W4's individual commit claims beyond what's checkable from git metadata (file lists, line hunks, migration presence) — their described *behavior* (what each fix does) is taken from their own reports, same as any other worker's self-report in this fleet.
