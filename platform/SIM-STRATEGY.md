# All-Trades Simulation — Strategy & Living Checklist

**Goal (Jeff):** Every trade/service vertical successfully uses the platform end-to-end.
Act as owner/admin per trade → lead → qualify → sell → onboard → use every feature.
Every issue → fix with confidence → re-loop until that trade passes 100%. Don't stop.

**Owner identity (all test tenants):** Jeff Tucker / fullloopcrm@gmail.com / +12122029220.
**Worktree:** `~/flwork-sim` @ `sim/trade-simulation-2026-07-08` (off origin/main). Never touch other trees.
**DB:** FL prod (`cetnrttgtoajzjacfbhe`). Pattern = create `test-*` rows via service role → exercise real
libs/routes → verify → clean up. No Stripe. No client SMS. Owner email/SMS to Jeff only, minimal.

## ONE system, thinks like the trade (Jeff's model)
- **Service business** (cleaning=1 day, lawn, window, pool…) → **bookings**. Self-book lands
  `pending` → smart-scheduling suggests the best worker. A booking IS a sale → shows in the sales tab.
- **Project business** (remodeling=up to a year, roofing, restoration…) → **lead/collect form** →
  sales pipeline → job with N sessions + payment plan. Long spans → the project calendar view.
- Either entry (booking OR lead) **creates a client profile**. Leads run the sales process; bookings
  also reflect in the sales tab. The master schedule's 4 views span 1-day slot → multi-day → project.

## The 53 trades (territory-map `service_categories`) + "Other"
Source of truth = `service_categories` (the admin territory map). The partnership lead form
(`src/components/PartnershipForm.tsx`) now lists all 53 + "Other". Each trade resolves to one of the
15 provisioning verticals via the real `mapIndustry()`; unmatched trades fall to `general` (generic
presets). The sim drives ALL 53 + "Other" through the full lifecycle and reports the trade→vertical map.

15 provisioning verticals (IndustryKey): cleaning · landscaping · hvac · plumbing · handyman ·
electrical · pest · towing · junk_removal · dumpster · mobile_salon · laundry · interior_design ·
fitness · general

## Phases (each must hit 100% across all 15 before moving on)
- [ ] **P1 — Lifecycle:** mapIndustry → prospect(lead) → approve(qualify) → tenant(sell) → entity →
      provisionTenant(onboard) → services w/ price_cents → selena_config+checklist → payment/hours/guidelines →
      invite → idempotency → cleanup.  Harness: `scripts/sim-all-trades.ts`.
- [ ] **P2 — Sales engine:** deals/quotes (proposal $ not $0), lead→deal, quote accept.
- [ ] **P3 — Jobs & scheduling:** job create, calendar duration-class, overlap guard, assign worker.
- [ ] **P4 — Finance:** billing-hours math, double-entry ledger balance, invoice.
- [ ] **P5 — HR & team/portals:** team member, portal rbac, earnings model-agnostic.
- [ ] **P6 — Comms:** notify() gating via notification_preferences, owner routing to Jeff.
- [ ] **P7 — Territory:** claim uniqueness (1/category/territory), release (don't collide w/ live tenants).
- [ ] **P8 — Site/config:** tenant public surface, industry gating (non-cleaning ≠ NYC-Maid site).
- [ ] **P9 — HTTP layer (escalation):** run `next dev`, drive real API routes for lead/book/portal.

## Status (2026-07-08)
Harness `scripts/sim-all-trades.ts` — 15 verticals, 63 checks/trade + 2 global phases.
- [x] P1 lifecycle — 15/15 GREEN
- [x] P2 sales (quote→accept→convert→booking) — 15/15 GREEN
- [x] P3 jobs & scheduling (duration-class, job/payments/sessions, overlap guard) — 15/15 GREEN
- [x] P4 finance (billing grace math, double-entry ledger balance) — 15/15 GREEN
- [x] P5 HR & team (portal rbac, seedHrDefaults, hire path, per-worker double-book reject) — 15/15 GREEN
- [x] P6 comms logic (normalizePrefs, capabilities, owner→Jeff) — 15/15 GREEN
- [x] P8 site industry gating (non-cleaning ≠ maid site) — added, per-trade
- [~] P6b comms-gate GLOBAL — **FAILS: tenants.notification_preferences MISSING on prod**
- [x] P7 territory exclusivity (claim→conflict→release) — global GREEN
- [ ] P9 HTTP layer (next dev, real routes) — pending

## Bugs found & fixed (this session)
1. **jobs.ts:203** — session bookings inserted nonexistent `address` col → PGRST204;
   broke every project sale w/ sessions. FIXED (commit d020152).
2. **team-provisioning.ts** — best-effort applicant email actually threw on send
   failure after member created. FIXED wrapped (commit d2bd715).
3. **comms system DARK on prod** — `tenants.notification_preferences` column never
   migrated (no migration file existed). Whole tenant-controlled comms gate falls
   back to defaults; Communications settings tab errors on save. Migration written:
   `migrations/2026_07_08_tenant_notification_preferences.sql` — **NEEDS APPLYING TO
   PROD** (no mgmt token / pg conn in this env to run DDL). Commit d2bd715.

## Log
- 2026-07-08: P1–P8 built + green (except comms-gate global, blocked on prod migration).
