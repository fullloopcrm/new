# W2 — 2026-07-18 12:41 — Tucker's Landscaping Company test-tenant build

## Task

New task from Jeff (12:32 LEADER->W2), separate from this worker's standing
gap-hunting brief: build a second test tenant on the `lawn_care` industry
archetype — "Tucker's Landscaping Company" — with 20 real clients (varied
property types/service history) and 5 real field team members (real HR
profiles, pay rates, hire dates). Priority: stand up the tenant + 20 clients
+ 5 team members correctly first; go deeper only if time allowed. File-only,
test/sim environment, no push/deploy/DB migration.

## What was built

`platform/scripts/sim-landscaping-tenant.ts` — new script, reuses
`sim-gc-lifecycle.ts`'s infra directly (env bootstrap, `provisionTenant`,
`seedHrDefaults`/`provisionApprovedApplicant` HR pipeline, team-portal
PIN/checkin/checkout real-route exercises, `postPayrollToLedger`/
`postPaymentRevenue` finance posting, cleanup-on-exit shape). Differs where
the vertical differs: `lawn_care` is a SERVICE (recurring booking) archetype,
not `remodeling`'s PROJECT (lead-sale) archetype — `mapIndustry('Lawn Care &
Landscaping Maintenance')` resolves to `lawn_care` (the recurring-mow
booking vertical), not the broader `landscaping` project vertical, since
Jeff's ask describes a client roster with ongoing service history, which is
`lawn_care`'s shape.

**Tenant**: active, growth plan, provisioned with the real 4-service
lawn_care catalog (Mowing & Trim / Fertilization / Aeration & Overseed /
Leaf Cleanup), Selena config, guidelines, owner invite for Jeff.

**5 field team members** — real `hr_employee_profiles` (not placeholder
rows): Hector Delgado (Crew Lead, W-2, $26/hr, hired ~3 years ago), Mason
Fitch + DeShawn Price (Mower Operators, W-2, $19/$18-hr, hired 2 years /
14 months ago), Kayla Simmons (Landscape Technician — planting/mulch/
hardscape, W-2, $21/hr, 8 months), Roy Whitfield (seasonal leaf-cleanup
1099 sub, $24/hr, 2 months — realistic seasonal-staffing pattern for lawn
care). All 5 hired through the real `provisionApprovedApplicant` →
`team_members` → 4-digit portal PIN path, HR profiles backfilled, all
applicable onboarding docs (W-9/W-4/I-9/direct-deposit/ID/agreement)
submitted + approved, crew lead's real PIN login verified against the live
`team-portal/auth` route.

**20 real clients** — varied property types and service history, not a
uniform placeholder set: small residential starter lots, a 2.6-acre estate
w/ pool + irrigation, an HOA common-grounds contract, a hillside corner lot,
new-construction fresh sod, a historic shaded lot with no irrigation, a
commercial office park, a retirement-community clubhouse, a 3-unit rental
landlord, a farmhouse w/ 5-acre pasture edge mowing, a condo association, a
church campus, a waterfront erosion-control property, a duplex, a corporate
HQ, a brand-new signup with zero history, a 5-year tenured weekly client,
a seasonal-cleanup-only client, and a churned client (cancelled after a
billing dispute, 10 weeks of history then stopped). Every client got a real
`client_properties` row (the platform's actual multi-address-per-client
table) and a realistic mix of backdated `completed` service-history bookings
(weekly/biweekly/monthly/seasonal cadences depending on the client) plus,
for active/new clients, one real upcoming `scheduled` booking. 246 history
bookings + 18 upcoming bookings, all inserted successfully.

**Depth pass** (time allowed, so exercised beyond the floor ask): dispatched
a real upcoming visit through actual check-in/check-out on the team portal;
sold + converted one real recurring weekly-mowing plan via
`createRecurringSeriesFromQuote` for the brand-new client; ran payroll for
all 5 employees through `postPayrollToLedger`; cut + paid one real invoice
for a tenured client via ACH and posted it through `postPaymentRevenue`;
read the tenant back through the same headcount/client-count/completed-visit
aggregates the dashboard would query.

## Bugs / gaps found

**1. Real bug (not a sim artifact) — `src/lib/finance/post-labor.ts`
`postLabor()` has a race between chart-of-accounts seeding and a parallel
account lookup.**

```ts
const [laborAcct, transitAcct] = await Promise.all([
  laborAccountId(tenantId, teamMemberId),      // awaits ensureChartAccounts() internally, then reads its own code
  getAccountIdByCode(tenantId, '2450'),         // does NOT wait for that seed — races it
])
```

`laborAccountId()` calls `ensureChartAccounts(tenantId)` before its own
lookup, but the sibling `getAccountIdByCode(tenantId, '2450')` (the Payouts-
in-Transit clearing account) fires in the same `Promise.all` and is not
gated on that seed finishing. On a brand-new tenant's very FIRST
labor-ledger post — `chart_of_accounts` still empty — the `'2450'` read can
return `null` before the upsert commits, so `postPayrollToLedger` silently
returns `{posted:false, reason:"accounts_missing"}`. No throw, no visible
error surface; the `payroll_payments` row is created but never reaches the
books unless a caller explicitly checks `.posted` and retries/alerts.

Reproduced deterministically across two consecutive full runs of this
script: this tenant's payroll run is the first finance-ledger post ever
made for it (no invoice/payment had posted yet), and the first loop
iteration (crew lead Hector Delgado) loses the race both times — 4/5
payroll payments posted, 1/5 silently dropped. `sim-gc-lifecycle.ts` never
surfaces this because its payroll stage runs *after* a Stripe/ACH payment
has already called `ensureChartAccounts` for that tenant, masking the race.
Any real tenant whose *first* finance event ever is a payroll run (plausible
— a new tenant onboards a crew before their first invoice clears) is exposed
to this in production.

Not fixed here — out of scope for a data-seeding task and touches a shared
finance module other tenants depend on. Fix is straightforward: await
`ensureChartAccounts(tenantId)` once before the `Promise.all`, not inside
one branch of it. Flagging for the leader/Jeff to route to whoever owns
`src/lib/finance/`.

**2. Sim-methodology note (not a product bug) — booking-overlap guard
(`015_booking_overlap_trigger.sql`) correctly rejected inserts when this
script's first draft round-robin-assigned crew to backdated bookings without
staggering time-of-day.** With 20 clients sharing a handful of common
mowing intervals (7/14/30 days) and the crew cycling through only 5 members,
many bookings landed on the exact same calendar day at the same 9:00am slot
for the same tech — a real double-booking, correctly blocked by the trigger
(which applies to `completed` history rows too, not just `scheduled` ones).
First run: 127/246+ intended bookings inserted, rest silently rejected.
Fixed in the script (not the product) by giving each client a fixed
crew+time-of-day "route" (5 clients per hour-of-day bucket, each bucket's 5
clients on 5 distinct crew members) — realistic for a real lawn-care
business anyway (a route reuses the same tech + slot weekly). Second run:
246/246 history + 18/18 upcoming bookings inserted clean, reproduced twice.
Also fixed a duplicate-duration bug in the same loop (`end` time was always
computed as a flat 2 hours regardless of service type via a dead ternary)
and a bug in the depth-pass dispatch step that moved a booking's
`start_time` to "now" without updating its stale multi-day-future
`end_time`.

## Verification

- `npx tsc --noEmit`: clean, both before and after all fixes.
- Ran the full script twice after the overlap-guard fix: identical, stable
  26/27 checks passed both times (stages 1–3 — tenant/HR/clients — 17/17
  both runs; only the documented `post-labor.ts` race fails, consistently).
- Did not persist the sim tenant (default cleanup path) — this was a
  correctness/repro run, not a request to leave the tenant live. If Jeff
  wants the actual "Tucker's Landscaping Company" tenant left in place for
  manual inspection, re-run with `SIM_PERSIST=1` (documented in the script's
  header, same convention as `sim-gc-lifecycle.ts`).
- No push, no deploy, no prod DB writes — script targets this worktree's
  configured Supabase project only, cleans up its own rows on exit.
