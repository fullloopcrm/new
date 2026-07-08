# All-Trades Simulation — Strategy & Living Checklist

**Goal (Jeff):** Every trade/service vertical successfully uses the platform end-to-end.
Act as owner/admin per trade → lead → qualify → sell → onboard → use every feature.
Every issue → fix with confidence → re-loop until that trade passes 100%. Don't stop.

**Owner identity (all test tenants):** Jeff Tucker / fullloopcrm@gmail.com / +12122029220.
**Worktree:** `~/flwork-sim` @ `sim/trade-simulation-2026-07-08` (off origin/main). Never touch other trees.
**DB:** FL prod (`cetnrttgtoajzjacfbhe`). Pattern = create `test-*` rows via service role → exercise real
libs/routes → verify → clean up. No Stripe. No client SMS. Owner email/SMS to Jeff only, minimal.

## The 15 verticals (IndustryKey)
cleaning · landscaping · hvac · plumbing · handyman · electrical · pest · towing · junk_removal ·
dumpster · mobile_salon · laundry · interior_design · fitness · general

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

## Log
- 2026-07-08: worktree + harness scaffolding; P1 build.
