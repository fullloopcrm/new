# W2 gap/fluidity refresh — 2026-07-18 05:26

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-telnyx-voice-comhub-email-status-gate-gap-2026-07-18-0511.md`.

Leader's instruction this round (05:12 LEADER->W2): fresh 3-deep queue — (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1) — new fresh-ground surface: `cron/generate-recurring` never gated on `tenantServesSite()`, and it WRITES new operational data

**Bug found and fixed.** Swept every cron under `src/app/api/cron/*` for the same `tenantServesSite()` gap class (Telegram/Telnyx webhooks, comhub-email cron, all fixed prior rounds). Most crons that loop across tenants already query `.from('tenants').eq('status', 'active')` up front — safe against this specific gap (over-restrictive in a different, non-security way: it also excludes `setup`/`pending` tenants, not just suspended/cancelled/deleted, but that's a separate onboarding-availability question, not this bug).

`cron/generate-recurring/route.ts` was the outlier: it queries `recurring_schedules` directly (no tenant join, no status filter anywhere) and, for every schedule found, materializes brand-new future `bookings` rows 4 weeks out — including real staff assignment (binary-lock or smart-assign path) — every week, forever. Unlike every messaging-only cron fixed so far, this one is a **write path**: a suspended/cancelled/deleted tenant's recurring schedule kept auto-generating net-new operational data (future jobs on the calendar, staff scheduled to show up) with zero dependency on the tenant's site/dashboard being reachable. Also found the same file's NYC Maid auto-resume-paused-schedules block (hardcoded to `NYCMAID_TENANT_ID`) had the identical gap — a suspended nycmaid tenant would still get its paused schedules silently reactivated.

**Fixed:** added a `tenantServesSite()` check gating the auto-resume block (fetches the nycmaid tenant's status first), plus a batch tenant-status lookup (`.in('id', scheduleTenantIds)`) before the generation loop, skipping any schedule whose tenant isn't serving. Added `route.status-gate.test.ts`: parametrized probe over all 3 non-serving statuses (confirms zero booking rows inserted for that tenant, alongside a co-existing active tenant that still generates normally) plus all 3 serving statuses (still generates).

## (2) — continued: same class found and fixed in 4 more crons, same root cause (direct booking/deal-table queries with zero tenant status filter)

Broadened the sweep beyond `.from('tenants')`-first crons to any cron whose first query hits a tenant-scoped operational table (`bookings`, `deals`) directly, then resolves `tenant_id` afterward — these have no status filter opportunity at all unless explicitly added. Found and fixed 4:

- **`cron/follow-up/route.ts`** — queries `bookings` across ALL tenants (any `status IN (completed, paid)` within a 3-day-ago window), then sends a real promotional "thank you, book again — mention THANKYOU for 10% off" email to the client via `notify()`. A suspended/cancelled/deleted tenant's customer kept getting marketing email on that dead business's behalf. Fixed: extended the existing per-booking tenant lookup to select `status` too and skip before calling `notify()`.
- **`cron/sales-follow-ups/route.ts`** — queries `deals` across ALL tenants, notifies the tenant's admin (email) and, for nycmaid specifically, also SMS-alerts admins. Fixed: batch tenant-status lookup keyed off the distinct `tenant_id`s in the due-deals result, skip before notifying.
- **`cron/no-show-check/route.ts`** — queries `bookings` across ALL tenants, flips matching rows to `status = 'no_show'` and fires an admin `notify()`. Lower customer-facing severity (admin-only, no client message) but still a live write + notification firing indefinitely for a dead tenant. Fixed: same batch tenant-status lookup pattern, skip before the flip+notify.
- **`cron/sync-google-reviews/route.ts`** — queries `tenants` for anyone with `google_tokens` set (no status filter at all, unlike its siblings), then spends a real Google Business Profile API call, writes `google_reviews` rows, and fires an admin notification per tenant. Fixed: added `status` to the select and a `tenantServesSite()` check as the first line of the per-tenant loop.

All 4 follow the same batched-lookup shape used by the primary fix — one `tenants` query per cron run (not per-row), consistent with the existing pattern in `comhub-email`'s `collectAccounts()`.

**Not yet swept this round** (checked names/imports only, not read in full — carrying forward, not flagged as confirmed-safe or confirmed-buggy): the 11 `seo-*` pipeline crons, plus `recurring-expenses`, `comms-monitor`, `phone-fixup`, `email-monitor`, `backup`, `cleanup-videos`, `health-check`, `system-check`, `anthropic-health`, `jefe-heartbeat`, `finance-post` (this last one already does `.eq('status', 'active')`, likely safe but not individually verified this round). None of these send client-facing messages by name/purpose (mostly internal ops/monitoring/SEO), so lower priority than the 5 fixed above, but not confirmed clean.

## (3) — gap/fluidity kept current

Carried-forward NOTICED items 1–29, 31–32, 34–35, unchanged (see prior rounds' docs).

Carried forward, still flagged not fixed (product/rollout/data calls, unchanged):
- `webhooks/stripe` never calling `activateTenant()` (HIGH SEVERITY, flagged 2026-07-18 ~02:10, in `JEFF-MORNING-QUEUE.md`).
- Item 30: ComHub `requireAdmin()` vs. nav-parity (20 route files gated Jeff-only while nav exposes ComHub to every operator; needs Jeff's rollout-gating call).
- Item 33: three bespoke-site tenants' dead, cross-tenant-contaminated `_lib/domains.ts` + `_lib/lead-filters.ts` (needs Jeff's call on delete-vs-provide-correct-data; confirmed dead/no live impact).
- Item 38: owner/admin Telegram bots (`webhooks/telegram/route.ts`, `webhooks/telegram/jefe/route.ts`) hardcoded off nycmaid / not tenant-scoped, chat-ID-allowlisted, no status check — needs Jeff's call (same shape as item 30).

NEW this round:

39. `cron/generate-recurring` never gated its NYC Maid auto-resume-paused-schedules block, nor its main schedule-generation loop, on `tenantServesSite()` — the only status-gate gap found so far that WRITES new operational data (future bookings + staff assignments) rather than just messaging or reading — fixed above (1).
40. `cron/follow-up` never gated its post-service "thank you, book again" promotional client email on `tenantServesSite()` — fixed above (2).
41. `cron/sales-follow-ups` never gated its admin-notify + nycmaid-admin-SMS on `tenantServesSite()` — fixed above (2).
42. `cron/no-show-check` never gated its booking status-flip + admin-notify on `tenantServesSite()` — fixed above (2).
43. `cron/sync-google-reviews` never gated its Google API sync + review-write + admin-notify on `tenantServesSite()` (the only one of this batch with literally zero tenant status filter, not even the weaker `.eq('status','active')` its siblings use) — fixed above (2).
44. 11 `seo-*` crons plus 10 internal-ops/monitoring crons (listed above) not yet individually checked for this same gap class — carried forward for next round's sweep.

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward, unchanged: items 18–20.

## Verification this round

- `npx tsc --noEmit`: clean.
- `npx vitest run src/app/api/cron/`: 38 files, 133/133 pass (30 new across 5 new test files, including 2 pre-existing test files updated to seed/support the new tenant-status lookup — `sales-follow-ups/route.test.ts` and `generate-recurring/route.terminated-crew-guard.test.ts` — both still passing their original assertions unchanged).
- Full repo suite: 715 files, 3088 passed, 37 skipped, 0 failed.

File-only, no push/deploy/DB write from this worker. 5 code fixes this round (generate-recurring, follow-up, sales-follow-ups, no-show-check, sync-google-reviews) + 5 new test files + 2 existing test files updated for compatibility + 1 docs commit.
