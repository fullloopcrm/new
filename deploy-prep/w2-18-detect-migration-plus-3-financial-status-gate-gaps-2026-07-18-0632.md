# W2 gap/fluidity refresh — 2026-07-18 06:32

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-17-seo-lib-layer-status-gate-2026-07-18-0619.md`.

Leader's instruction this round (06:21 LEADER->W2): fresh 3-deep queue — (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current. Leader also flagged carrying forward: `detect.ts` needs a DB-side RPC migration (prepare as file, not applied).

## (0) — prepared (not applied) the flagged detect.ts migration

`src/lib/migrations/2026_07_18_seo_detection_status_gate.sql` — `seo_run_detection()`'s classification logic lives entirely in this Postgres function (reads the materialized `seo_page_rollup`), so the app-layer `nonServingTenantIds()` filter added to every other seo-* lib file last round never touches it. Migration adds a `left join tenants` + status filter mirroring `tenant-status.ts`'s `NON_SERVING_STATUSES` exactly (fail-open for `tenant_id is null` and for any status outside `suspended`/`cancelled`/`deleted`, same as every app-layer gate this session). Downstream consumers (`remediate.ts`, `competitor-remediate.ts`, `enrich.ts`, `autopilot.ts`) already filter non-serving tenants via `tenant-gate.ts`, so this migration doesn't by itself stop a new write — it stops the function from re-generating `seo_issues` rows for a dead tenant every run in the first place (wasted per-run cost + a live "open issues" count sitting in the DB for a tenant that no longer exists). **LEADER: run after Jeff approves — not executed by this worker.**

## (1) — new fresh-ground surface: `release-due-payments` cron, a real financial write with zero status check

`src/app/api/cron/release-due-payments/route.ts` — daily cron, bulk `UPDATE job_payments SET status='invoiced' WHERE trigger='on_date' AND status='pending' AND due_at <= now()`. No tenant filter of any kind. This is the time-based leg of the payment-trigger engine (the event-based leg, `releasePaymentsForEvent`, fires inline from an already tenant-scoped caller and is fine). A suspended/cancelled/deleted tenant's scheduled payments kept auto-flipping to "invoiced" (due to collect) indefinitely — a real financial state change with no human review, same severity class as `finance-post`/`lifecycle`/`recurring-expenses` earlier this session, just discovered a round later because it's a single bulk UPDATE rather than a per-tenant loop.

**Fix:** SELECT the due candidates first, batch-fetch their tenants' status, filter to `tenantServesSite()`, then UPDATE only the surviving row ids (`.in('id', ...)`) — same fetch-all/filter-in-memory shape used everywhere else this session, adapted because the original was a single blind UPDATE with no SELECT-then-filter step. 8 new tests (`route.status-gate.test.ts`) incl. a 0-candidates and an all-dead-tenant no-op case.

## (2) — continuation: same class found twice more, both real sends/writes, not just skipped messages

Kept pulling the thread on "cron/background surface that fans out across tenants with no `tenantServesSite()` import" (the same grep this session has used every round: cron routes + lib files missing the import). Two more, both worse than (1) because they involve external sends, not just an internal status flip:

- **`src/app/api/email/monitor/route.ts`** (backs the `email-monitor` cron) — polls every tenant with `email_monitor_enabled=true`'s IMAP inbox for Zelle/Venmo payment confirmations. On a match: INSERTs into `payments`, flips the matched `booking.payment_status` to `paid`, and **texts the client a payment-confirmation SMS**. Zero tenant status check — a suspended/cancelled/deleted tenant's inbox kept getting polled and its "payments" kept getting recorded and its customers kept getting SMS receipts on the dead tenant's behalf, forever. Same class as `comhub-email` (fixed earlier this session) but a distinct file/route this worker hadn't yet swept. Fix: `tenantServesSite()` filter on the tenants list before the per-tenant loop. 5 new tests incl. a wrong-tenant probe (dead + live tenant co-seeded, asserts the live tenant's payment insert/booking update never carries the dead tenant's id and the dead tenant's IMAP inbox is never even fetched) and a null-status fail-open case.
- **`src/app/api/cron/health-check/route.ts`**'s self-healing notification-retry step (section 1 of 6) — re-fetches any `notifications` row with `status='failed'` from the last hour (`retry_count < 3`) and calls `notify()` (real `sendEmail`/`sendSMS`) again, keyed only on `notif.tenant_id` with no status check. A suspended/cancelled/deleted tenant's failed sends kept getting re-attempted (up to 3x within the retry window) indefinitely — real outbound messages sent on a dead tenant's behalf. Fix: batch-fetch the failed notifications' tenant ids, filter to `tenantServesSite()`, skip retry (zero writes, matching every other "skip means skip" precedent this session — no retry-count bump, no status touch) for a non-serving tenant's notification. 7 new tests incl. a wrong-tenant probe.

Checked and cleared as NOT this gap (read carefully, not assumed):
- `src/app/api/cron/health-check/route.ts` section 2 ("detect broken tenant integrations") and `src/app/api/cron/system-check/route.ts` section 4 — both filter `tenants` on `.eq('status','active')` instead of `tenantServesSite()`, the exact literal-status bug pattern this session has fixed a dozen times elsewhere. NOT fixed here: both are read-only diagnostic/reporting features (push a string into an internal `issues`/`checks` array read only by Jeff via the admin alert email; no write, no spend, no customer-facing action). Using `tenantServesSite()` instead would additionally surface `setup`/`pending` tenants missing integrations — arguably more correct, but low-value/low-risk enough that this worker judged it not worth a churn-only diff this round. Noting for completeness rather than silently leaving it unswept.
- `src/app/api/cron/health-check/route.ts` section 5 (auto-complete stale in-progress bookings) — data-hygiene cleanup, not new spend or a new message; same judgment as `verify-revert.ts` last round ("cleanup/corrective, not proactive spend or new harm" — correct regardless of tenant status). Left as-is.
- `src/app/api/cron/system-check/route.ts` in full, `src/app/api/cron/comms-monitor/route.ts`, `src/app/api/cron/jefe-heartbeat/route.ts` (+ `src/lib/jefe/heartbeat.ts`) — all genuinely platform-level monitoring: no tenant-scoped write, no per-tenant spend, alerts route only to Jeff/admin, not customers. `jefe_snapshots` carries no `tenant_id` by design. Not this gap.

## (3) — gap/fluidity kept current

Carried-forward NOTICED items 1–29, 31–32, 34–35, unchanged (see prior rounds' docs).

Carried forward, still flagged not fixed (product/rollout/data calls, unchanged):
- `webhooks/stripe` never calling `activateTenant()` (HIGH SEVERITY, flagged 2026-07-18 ~02:10, in `JEFF-MORNING-QUEUE.md`).
- Item 30: ComHub `requireAdmin()` vs. nav-parity.
- Item 33: three bespoke-site tenants' dead, cross-tenant-contaminated `_lib/domains.ts` + `_lib/lead-filters.ts`.
- Item 38: owner/admin Telegram bots hardcoded off nycmaid / not tenant-scoped.
- Item 49: `backup`'s use of `tenantServesSite()` may be too strict for data-retention purposes — needs Jeff's call.
- Item 52 sub-items: `verify-revert.ts`, `alerts.ts`, `health.ts` (seo lib layer) — judgment calls, unchanged, see `w2-17-...` for specifics.
- NEW carry-forward: `detect.ts`'s migration (item 0 above) is prepared as a file but NOT applied — needs Jeff's approval + the leader to run it against prod.

NEW this round:

54. `release-due-payments` cron's bulk `job_payments` invoice-flip carried no tenant status check — fixed.
55. `email/monitor`'s per-tenant IMAP payment-matching loop (payments insert + booking paid-flip + client SMS receipt) carried no tenant status check — fixed. Worst of this round's three: real money-adjacent writes plus an outbound customer SMS, not just an internal status flip.
56. `health-check` cron's notification-retry step re-sent real email/SMS for a dead tenant's failed notifications with no status check — fixed.
57. `health-check`/`system-check`'s `.eq('status','active')` diagnostic-only tenant-integration checks — same literal-status pattern as the rest of the session, but read-only/admin-facing only, deliberately left unfixed this round (see (2) above for reasoning) rather than silently skipped.

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward, unchanged: items 18–20.

## Verification this round

- `npx tsc --noEmit`: clean.
- `npx vitest run src/app/api/cron/release-due-payments/ src/app/api/email/monitor/ src/app/api/cron/health-check/`: 4 test files, 37/37 pass (20 new: 8 release-due-payments, 5 email-monitor, 7 health-check; the other 2 email-monitor suites pre-existing and unmodified, still pass).
- Full repo suite: 744 files, 3210 passed, 37 skipped, 0 failed.
- `2026_07_18_seo_detection_status_gate.sql`: not run (file-only per standing rules) — syntax matches the original function it replaces (`create or replace function`), same shape as every prior migration in `src/lib/migrations/`.

File-only, no push/deploy/DB write from this worker. 1 new migration file (not applied) + 3 route fixes + 3 new test files (20 new tests) + 1 docs commit.
