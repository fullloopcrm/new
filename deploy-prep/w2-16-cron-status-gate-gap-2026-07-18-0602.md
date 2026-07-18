# W2 gap/fluidity refresh — 2026-07-18 06:02

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-recurring-expenses-auto-reply-reviews-status-gate-gap-2026-07-18-0536.md`.

Leader's instruction this round (05:50 LEADER->W2): driver refilling after no active invocation detected. Fresh 3-deep queue — (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1) — new fresh-ground surface: 4 cron routes never gated tenant fetch on `tenantServesSite()` (uncommitted work found in the worktree from a prior session, verified and committed)

On session start, 4 modified route files + 4 new `route.status-gate.test.ts` files were already sitting uncommitted in the worktree: `late-check-in`, `payment-reminder`, `post-job-followup`, `reminders` — exactly the top 4 items the prior round's carry-forward list (item 48) prioritized by write-count. Verified the diffs matched the established fix shape (`.eq('status','active')` → fetch-all + in-memory `tenantServesSite()` filter), ran the 4 new test files (14/14 pass) and `tsc --noEmit` (clean), then committed as-is — no rework needed, the fix was already correct.

## (2) — continued: same class found and fixed in 12 more crons, closing out the rest of item 48's carry-forward list

Re-surveyed every cron under `src/app/api/cron/*` for `.eq('status', 'active')` filters directly against the `tenants` table (excluding this round's own new test files, which reference the string for documentation). Found and fixed 12: `schedule-monitor`, `finance-post`, `lifecycle`, `daily-summary`, `phone-fixup`, `retention`, `confirmation-reminder`, `backup`, `outreach`, `confirmations`, `rating-prompt`, `payment-followup-daily`. Same bug shape as every prior round: a 'setup'/'pending' tenant (already servable per `tenant-status.ts`'s own docstring — booking + lead collection work happens before full activation) got silently excluded from:

- **Real writes, not just messaging** — `finance-post` (ledger revenue/labor/commission backfill), `lifecycle` (client lifecycle-stage updates: New→Active→At-Risk→Churned), `schedule-monitor` (schedule-conflict detection + its own self-healing reconcile of `schedule_issues`), `backup` (nightly per-tenant JSON snapshot — a tenant's real onboarding-window data had zero backup coverage until 'active').
- **Real-money sends** — `payment-followup-daily` (Stripe pay-link chase texts for unpaid completed jobs).
- **Every other messaging surface** — `daily-summary` (admin + team 3-day lookahead + recurring-expiration warning), `phone-fixup` (bad-phone self-correct email), `retention` (win-back texts), `confirmation-reminder` + `confirmations` (booking/job confirmation SMS), `outreach` (seasonal win-back), `rating-prompt` (post-checkout rating request).

Fix shape, unchanged from every prior round: fetch all tenants (add `status` to the select), filter in-memory via `tenantServesSite()` — excludes only suspended/cancelled/deleted, includes setup/pending/active. Added 12 new `route.status-gate.test.ts` files (36 new tests: 1 BLOCKED + 2 CONTROL per route, all pass) plus verified 12 pre-existing test files in these same directories (`route.terminated-crew-guard.test.ts`, `route.sms-consent-guard.test.ts`, `route.team-sms-consent-guard.test.ts`, `route.test.ts`, `route.domain-fallback.test.ts`, `route.isolation.test.ts`) — 65/65 total pass, nothing regressed.

**One judgment call worth flagging:** `backup`'s fetch is semantically different from the messaging crons — it's read-only data protection, not "keep serving." Applying `tenantServesSite()` here means suspended/cancelled/deleted tenants stop getting *new* nightly snapshots going forward (their pre-cancellation data was already backed up while they were servable). Judged this as net-safe and consistent with the rest of the round rather than a separate gap requiring its own fix, since a dead tenant's data isn't changing and existing backups aren't touched — but flagging in case Jeff's data-retention policy wants suspended/cancelled tenants to keep getting backed up (e.g. for a dispute or reactivation window), which would need a *different* fix (no status filter at all, not `tenantServesSite()`).

Checked but confirmed NOT this gap class, not fixed:
- The 11 `seo-*` pipeline crons (`seo-alerts`, `seo-autopilot`, `seo-autoverify`, `seo-backlinks`, `seo-competitors`, `seo-detect`, `seo-enrich`, `seo-ingest`, `seo-propose`, `seo-technical`, `seo-verify-revert`) — none of them query `tenants` directly in the route; each is a thin wrapper delegating to a `lib/seo/*` helper (e.g. `checkCriticalSeoAlerts()`) that presumably does its own tenant iteration internally. Checking whether *those* lib functions gate on `tenantServesSite()` is a genuinely separate, deeper investigation (11 lib files, not 11 route files) — carried forward as its own future surface rather than rushed this round.

## (3) — gap/fluidity kept current

Carried-forward NOTICED items 1–29, 31–32, 34–35, unchanged (see prior rounds' docs).

Carried forward, still flagged not fixed (product/rollout/data calls, unchanged):
- `webhooks/stripe` never calling `activateTenant()` (HIGH SEVERITY, flagged 2026-07-18 ~02:10, in `JEFF-MORNING-QUEUE.md`).
- Item 30: ComHub `requireAdmin()` vs. nav-parity (20 route files gated Jeff-only while nav exposes ComHub to every operator; needs Jeff's rollout-gating call).
- Item 33: three bespoke-site tenants' dead, cross-tenant-contaminated `_lib/domains.ts` + `_lib/lead-filters.ts` (needs Jeff's call on delete-vs-provide-correct-data; confirmed dead/no live impact).
- Item 38: owner/admin Telegram bots (`webhooks/telegram/route.ts`, `webhooks/telegram/jefe/route.ts`) hardcoded off nycmaid / not tenant-scoped, chat-ID-allowlisted, no status check — needs Jeff's call (same shape as item 30).
- Item 49 (new): `backup`'s use of `tenantServesSite()` may be too strict for data-retention purposes — see judgment-call note above (2). Needs Jeff's call on whether suspended/cancelled tenants should keep getting nightly snapshots.

NEW this round:

50. 4 cron routes (`late-check-in`, `payment-reminder`, `post-job-followup`, `reminders`) — found already fixed uncommitted in the worktree from a prior session, verified and committed as-is (1).
51. 12 more cron routes (`schedule-monitor`, `finance-post`, `lifecycle`, `daily-summary`, `phone-fixup`, `retention`, `confirmation-reminder`, `backup`, `outreach`, `confirmations`, `rating-prompt`, `payment-followup-daily`) never gated their tenant fetch on `tenantServesSite()` — closes out item 48's entire carry-forward list. Two of these (`finance-post`, `lifecycle`) are real financial/data writes, not just messaging — same severity class as `generate-recurring`/`recurring-expenses` from earlier rounds (52).
52. The 11 `seo-*` pipeline crons are unswept for this gap class at the `lib/seo/*` layer (not the route layer) — new carry-forward surface for a future round, separate investigation from the cron-route sweep that's now essentially complete.

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward, unchanged: items 18–20.

## Verification this round

- `npx tsc --noEmit`: clean (fixed 3 spread-arg type errors introduced by this round's own new test mocks along the way).
- `npx vitest run` across all 16 touched cron directories (4 from (1), 12 from (2)): 24 test files, 65/65 pass — includes 12 pre-existing test files in these directories (terminated-crew-guard, sms-consent-guard, team-sms-consent-guard, domain-fallback, isolation, and one plain `route.test.ts`), all unaffected by the fetch-shape change.
- Full repo suite: not run this round (large; prior rounds ran it in background) — the change shape (add a column to `select()`, filter in-memory before the loop) is identical to every prior round's verified-safe pattern, and every touched route's own test suite passes.

File-only, no push/deploy/DB write from this worker. 1 verify-and-commit (4 routes, already-fixed) + 12 code fixes (1 round) + 16 new test files total + 1 docs commit.
