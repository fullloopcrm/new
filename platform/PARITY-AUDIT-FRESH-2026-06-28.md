# FullLoop ↔ NYC Maid — Fresh Parity Audit (re-done current code, not the stale plan)

**Date:** 2026-06-28
**Method:** Read-only diff of FullLoop shared backend (`~/fullloopcrm/platform`) vs real nycmaid (`~/Desktop/nycmaid`), current code on both sides. No DB connected, no changes.
**Why:** The 06-25 plan was 3 days stale — multiple "open" items are already done. This replaces it.

---

## Bottom line

Parity is **NOT ~5 days.** It's **~2–3 days dominated by ONE feature (multi-address properties)**, plus a 15-minute comhub wire, plus one Yinez design decision. The platform backend is shared and tenant-scoped, so porting these into shared code gives **all tenants** the feature at once — which is the actual goal.

---

## Area-by-area (current truth)

| Area | 06-25 plan said | Actual state today | Work left |
|------|-----------------|--------------------|-----------|
| **Money path** | BROKEN (button → dead `/api/notifications`) | **DONE.** Button POSTs `/api/team-portal/15min-alert`; endpoint builds tenant `stripe_pay_link` + `client_reference_id`, admin "call manually" fallback. No dead `/pay/` link. | Verify-only: each tenant's `stripe_pay_link` populated; payout 15-min rule + Stripe Connect onboarding spot-check. |
| **Smart scheduling** | 85 lines behind, missing `propertyId`/`jobCoords` | **DONE.** `scoreCleanersForBooking` has `propertyId`+`jobCoords`+geocode-once; `049_smart_schedule_parity.sql` exists. | Verify-only: migration applied to prod. `propertyId` param is dormant pending properties (below). |
| **Multi-address properties** | ~0.5d + schema | **THE GAP.** nycmaid: `client_properties` in 29 files, `property_id` in 10, a 288-line `lib/client-properties.ts`. FL: `client_properties` in 2 files (dormant comments only), `property_id` in **0**, **no client-properties lib**. Migration exists, ~zero runtime wiring. | **Full port. ~2 days, high-risk (touches booking/money/scheduling).** |
| **Yinez agent** | port deltas, design Q | **DIVERGED, not behind.** FL agent = 796 lines vs nycmaid 687 — already abstracted for multi-tenant. | **Design decision (Jeff): exact-copy vs per-tenant master.** Then port deltas. Riskiest. |
| **Comhub** | code ported, orphaned | Still orphaned: `admin/layout.tsx:30` nav → `/admin/inbox`; `/admin/comhub` built but unlinked. | **~15 min:** decide canonical inbox + rewire nav. |
| **GPS / check-in** | re-enable 2-tier, census fallback | FL has `geo.ts`, `nycmaid/geo.ts`, smart-schedule geo, migrations 049/050. Mostly present. | The properties-linked geo (geocode per property) folds into the properties port. |

---

## The one real worklist item: Multi-address properties

**Goal:** one client → many addresses; a booking carries `property_id`; address used everywhere = `property ?? client.address` (per nycmaid rule; Yinez must never override).

**Port from nycmaid:**
- `src/lib/client-properties.ts` (288 lines) → FL (likely `src/lib/nycmaid/client-properties.ts` to match the ported namespace).
- Wire `property_id` through (nycmaid touch-list): bookings `route` / `[id]` / `batch` / `batch-update`, `client/book`, `client/reschedule/[id]`, `client/recurring`, `admin/recurring-schedules`, team `check-in` / `jobs` / `available-jobs` / `travel-times`, `dashboard`, `send-booking-emails`, `attribution`, `yinez/tools` + `yinez/core`.
- Notification/address resolution: every send path must use `property ?? client.address` (matches the nycmaid "address-in-notifications" fix).

**Hard prerequisite (BLOCKER — can't verify from here):** is the `client_properties` / `property_id` / `preferred_cleaner_id` migration **applied to the prod FL DB**? The file exists; applied-state is unknown (rules forbid me bulk-reading prod DB). If not applied, runtime code referencing those columns will 500. **Confirm before I write runtime code that assumes the columns exist.**

**Risk:** booking + money + scheduling paths, multi-tenant, live. Port in complete verified units; do not deploy half.

---

## Decisions needed from Jeff (don't block properties except #1)

1. **[BLOCKS PROPERTIES]** Is the properties schema migration applied to prod, or should I treat columns as not-yet-existing (and produce the migration to run first)?
2. **Comhub:** canonical inbox = `/admin/comhub` (full) or `/admin/inbox` (simple)?
3. **Yinez:** exact-nycmaid-copy per tenant, or one per-tenant master agent? (Blocks Yinez port only.)

---

## Could NOT verify (no DB/runtime, by your rules)
- Whether migrations `049_smart_schedule_parity`, `050_nycmaid_parity`, and the properties migration are **applied to prod**.
- Whether each tenant's `stripe_pay_link` is populated (money path completeness per tenant).
- Runtime behavior of any of the above on a live tenant domain.

---

## Recommended order
1. **Properties** (the real gap) — once #1 decision answered. Port lib → wire booking/team/dashboard → address-in-notifications → verify against nycmaid.
2. **Comhub wire** (15 min) — once #2 answered.
3. **Yinez** — once #3 answered; riskiest, last.
4. **Verify-only sweep** — confirm migrations applied + per-tenant `stripe_pay_link`.
