# NYC Maid → FullLoop — Full Parity Scope & Plan
**Prepared:** 2026-06-25 (late night session)
**Goal:** Copy (not cutover) NYC Maid fully into the FullLoop `nycmaid` tenant, prove it 100% live on `nycmaid.fullloopcrm.com`, then move the `thenycmaid` domain last.
**Verification standard (per Jeff):** every task's done-check compares against the **real NYC Maid** (live `thenycmaid.com` + `~/Desktop/nycmaid` source), not FullLoop-in-isolation.

---

## 1. The Reality (baselines, from git logs)

- **FullLoop backend was brought to nycmaid parity ~June 6**, topped up through **~June 13** (find-cleaner dispatch, team-portal PIN login, comhub inbox, recurring schedules, "add all NYC Maid columns").
- **After ~June 13, FullLoop work shifted to marketing/SEO/site — NOT backend.** (06-22, 06-24, 06-25 commits are site/SEO.)
- **NYC Maid kept developing the backend hard from mid-June → today.** ~107 commits since June 1; the backend-affecting ones after ~June 13 are the drift.
- **Net:** FullLoop's backend is effectively frozen at a **~June 6–13** snapshot. ~2 weeks of nycmaid backend dev is unported.

**Honest full-parity estimate: ~5 focused working days** (range 5–8 depending on schema/Stripe/Yinez depth). Not an overnight job.

---

## 2. DONE this session (frontend — verified live against nycmaid)

- ✅ Stripe-only payment copy synced (7 pages + 2 SEO lib files) — 0 content drift vs live nycmaid.
- ✅ Real `/book/new` 812-line self-book wizard ported, redirect removed, **live, single nav, correct title**, screenshot-verified.
- ✅ `/apply`, `/feedback`, `/referral` ported — 0 source drift vs nycmaid, live 200.
- ✅ Rich sitemap: **5,199 URLs + 5,181 image entries** (was a 6-URL stub) — exact match to real nycmaid.
- ✅ Tenant page-title metadata fix.
- Commits: e02e873, d1cd785, 72f060b, dc1c2cc (pushed to `fullloopcrm/new` main, auto-deployed).

**Frontend known leftovers (minor):** `/book` PIN-login link is 404; ~39 absolute `thenycmaid.com` links (mostly correct canonicals).

---

## 3. Backend Parity Gaps (the worklist)

### 3a. Smart Scheduling (the "key" system) — ~1.5d
- ❌ `suggestBookingSlots` (alternate-time picker) **missing from both FL smart-schedule libs**. Added to nycmaid **today** (44ea5f1 15:32).
- ❌ `scoreCleanersForBooking` on FL is ~85 lines behind nycmaid's (missing `propertyId`/`jobCoords` geocode-once params).
- ❌ Always-on admin time suggestions + waitlist fallback w/ admin alerts (14d82a5).
- ⚠️ **Two competing libs** to reconcile: `lib/smart-schedule.ts` (`scoreTeamForBooking`, team_members) vs `lib/nycmaid/smart-schedule.ts` (`scoreCleanersForBooking`, cleaners) — the route uses the latter.
- 06-17 hardening batch unported: availability persistence, working-hours honored, zone CoverageMap, self-healing schedule issues, hard zone rule (4d11bc2).

### 3b. The Money Path (lead → pay) — ~1.5d  **[CRITICAL / lead-to-review]**
- ❌ **Yellow 30-min button is wired to `/api/notifications`** (just inserts a row) instead of a pay-text endpoint. Cleaner hits button → client gets NOTHING.
- ⚠️ Correct tenant-aware pay-text endpoint `/api/team-portal/15min-alert` **exists but is orphaned** (nothing calls it).
- ❌ Its pay link builds `/pay/[bookingId]` which **doesn't exist**. nycmaid instead sends a **Stripe Payment Link** (`buy.stripe.com/...?client_reference_id=bookingId`).
- ✅ FL HAS better infra: `/api/payments/link` (per-tenant `stripe_api_key` → Stripe link → saves `bookings.payment_link`) + Stripe webhook — but **nothing in the cleaner flow calls it**.
- Payout 15-min rule (d342133), Stripe Connect onboarding link (0f7c6d1) unported.
- **OPEN DECISION (Jeff):** is the nycmaid tenant's `stripe_api_key` populated in the FL `tenants` table? Needed for `createPaymentLink`.

### 3c. Multi-address Properties — ~0.5d + schema
- ❌ `client_properties` table **not in FL migrations**; `preferred_cleaner_id` **not in FL migrations**.
- nycmaid: one client → many addresses, booking carries `property_id` (115d9d7, 06-22). Unported. Schema migration + backfill required.

### 3d. Check-in / GPS / Geocoder — ~0.5d
- Two-tier GPS gating re-enabled (6e2c573), Census geocoder fallback (5790261), check-in rejection logging — all 06-24/06-25, unported. Note: nycmaid currently has GPS toggle-able (`CHECK_IN_GPS_ENABLED`).

### 3e. Yinez Agent — ~1.5d (riskiest)
- Yinez is **dialed-in specifically for nycmaid**; FL needs per-tenant personalization (agent-abstraction). Unported tweaks: never-overwrite-address/add-property (7ddf617), self-book-link-only, never-confirm-availability, lead-capture-on-turn-1, suggest_times tool (part of 44ea5f1).
- **OPEN QUESTION (Jeff raised):** is FL Yinez the exact nycmaid Yinez, or a per-tenant master? Needs design confirmation before porting.

### 3f. Comhub (unified comms) — ~0.25d (wiring only)
- ✅ Code fully ported (`/admin/comhub` page + `/api/admin/comhub/*` + softphone components).
- ❌ **Orphaned:** admin nav "Inbox" points to `/admin/inbox` (a separate simpler page); `/admin/comhub` linked nowhere. Fix = nav wiring + decide which inbox is canonical.

---

## 4. Day-by-Day Plan (full parity)

- **Day 1 — Money path (lead-to-review critical):** wire yellow button → generate tenant Stripe link via `/api/payments/link` → send pay-now SMS via `15min-alert`. Confirm `stripe_api_key`. Verify end-to-end (test booking, no real client SMS).
- **Day 2 — Smart scheduling:** port `suggestBookingSlots` + update `scoreCleanersForBooking` (propertyId/jobCoords) + reconcile the two libs + wire client/admin smart-schedule routes. Verify suggestions vs nycmaid logic.
- **Day 3 — Properties + schema:** `client_properties` + `preferred_cleaner_id` migrations + backfill; booking `property_id`; address-in-notifications parity.
- **Day 4 — Yinez agent:** confirm per-tenant design with Jeff, port the agent/tools deltas (suggest_times, lead-capture, self-book-only), brand-scope outbound.
- **Day 5 — Check-in/GPS + comhub wiring + payout rules + full E2E verify** of lead→schedule→confirm→check-in→pay→review against nycmaid. Buffer for slippage.

---

## 5. Open Decisions Needed From Jeff
1. Is the nycmaid tenant's `stripe_api_key` set in the FL `tenants` table? (blocks money path)
2. Yinez: exact-copy vs per-tenant master? (blocks agent parity)
3. Canonical inbox: `/admin/comhub` (full) or `/admin/inbox` (simple)?
4. Confirm aim: prove lead-to-review on `nycmaid.fullloopcrm.com` first, domain move last.

---

## 5b. DAY 1 EXECUTION RECIPE — Money Path (exact files, captured while in-context)

**Goal:** cleaner hits yellow 30-min button → tenant Stripe link generated → client gets pay-now SMS with that link. Verify against nycmaid's working flow.

**Reference (nycmaid, WORKING):**
- Button: `~/Desktop/nycmaid/src/app/(app)/team/dashboard/page.tsx:1403` and `team/[token]/page.tsx:360` → `fetch('/api/team/30min-alert', {bookingId})`.
- Endpoint: `~/Desktop/nycmaid/src/app/api/team/30min-alert/route.ts` (217 lines). Sends client SMS via `sendClientSMS`, pay link = hardcoded `https://buy.stripe.com/8x2aEZ4FL0wYfxe5f0fnO03?client_reference_id=${bookingId}`, admin SMS via `smsAdmins`, retry + `admin_tasks` fallback if undelivered, sets `fifteen_min_alert_time`.

**FullLoop pieces (all exist):**
1. **Button to rewire:** `platform/src/app/team/page.tsx` — function `onHeadsUp` (~line 555-588). Currently POSTs `/api/notifications` with `{type:'15min_warning', booking_id}` (line ~570) → only inserts a row. **Change:** POST to the pay-text endpoint instead (with `Authorization: Bearer ${auth.token}`).
2. **Pay-text endpoint (orphaned, tenant-aware):** `platform/src/app/api/team-portal/15min-alert/route.ts` (177 lines). Loads tenant `telnyx_api_key/telnyx_phone/payment_methods/zelle_email`, computes `clientOwes`, sends client SMS + admin SMS, fallback `admin_tasks` (`payment_alert_failed`). **Bug to fix (line ~91):** `payLink = ${baseUrl}/pay/${bookingId}` — `/pay` route does NOT exist. Replace with the generated tenant Stripe link.
3. **Link generator (tenant Stripe):** `platform/src/app/api/payments/link/route.ts` (62 lines). POST `{booking_id}` → loads tenant `stripe_api_key` → `createPaymentLink({amount, serviceName, bookingId, tenantId, stripeApiKey})` (from `@/lib/stripe`) → saves `bookings.payment_link`. Uses `booking.price` (must be set).

**Wiring options (pick Day 1):**
- (A) Make `15min-alert` call `createPaymentLink` internally (or read `bookings.payment_link`, generating if null), use that URL in the SMS, then rewire the button → `15min-alert`. Cleanest — one button, one endpoint.
- (B) Button calls `/api/payments/link` first, then `15min-alert`. More round-trips.
→ Recommend (A).

**Blocker to confirm first:** tenant `stripe_api_key` populated for nycmaid? (`tenants.stripe_api_key`). If null, `createPaymentLink` falls back to `process.env.STRIPE_SECRET_KEY` — confirm that's the right nycmaid Stripe account, or set per-tenant. **Do NOT bulk-read prod DB; ask Jeff or check one tenant row.**

**Verify (no real client SMS):** create a test booking on the nycmaid tenant with a test client phone (Jeff's own), trigger the flow, confirm SMS arrives with a working Stripe link + correct amount. Compare wording/behavior to nycmaid's 30min-alert.

**Caution:** `team/page.tsx` is the SHARED main portal (nycmaid + other tenants). The endpoint is already tenant-scoped, so rewiring the button helps all tenants — but it's money code: port as one complete, verified unit; don't deploy half.

## 6. Risks
- Money + scheduling + agent are live-platform, multi-tenant code — half-done states are dangerous; port in complete, verifiable units only.
- Schema migrations touch prod DB — apply via dashboard (local key stale), backfill carefully.
- `thenycmaid` domain move is LAST and gated on full lead-to-review verification.
