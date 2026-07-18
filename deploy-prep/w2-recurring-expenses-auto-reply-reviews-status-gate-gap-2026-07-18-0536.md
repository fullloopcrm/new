# W2 gap/fluidity refresh — 2026-07-18 05:36

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-cron-fanout-status-gate-gap-2026-07-18-0526.md`.

Leader's instruction this round (05:28 LEADER->W2): fresh 3-deep queue — (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1) — new fresh-ground surface: `cron/recurring-expenses` never gated on `tenantServesSite()`, a second financial write path (after `generate-recurring`)

**Bug found and fixed.** Re-surveyed every cron under `src/app/api/cron/*` for the `tenantServesSite()` gap class one more level down — not just "does it filter tenants at all" but "does it write real financial/customer-facing data with zero status check." `cron/recurring-expenses/route.ts` fires due `recurring_expenses` rows and posts a real double-entry `journal_entries` row via `postJournalEntry` (debit expense CoA, credit bank CoA) — the exact same shape of gap as `generate-recurring`, but for the accounting ledger instead of the booking calendar: a suspended/cancelled/deleted tenant's recurring expense (rent, subscriptions, etc.) kept posting real entries to its own P&L, indefinitely, every period it fired, with zero dependency on the tenant's site/dashboard being reachable.

**Fixed:** added a batch tenant-status lookup (`.in('id', dueTenantIds)`) before the per-row loop, skipping any recurring-expense row whose tenant isn't serving (same shape as `generate-recurring`/`no-show-check`/`sales-follow-ups`). A skipped row is left completely untouched — no journal post, no `next_due_date` advance, no failure-count bump — so a reactivated tenant picks back up from where it left off rather than silently losing a period. Added `route.status-gate.test.ts`: parametrized probe over all 3 non-serving statuses (confirms zero `postJournalEntry` calls and zero `recurring_expenses` updates for that tenant, alongside a co-existing active tenant that still fires normally) plus all 3 serving statuses (still fires). Also had to add a `tenants` table stub to the pre-existing `route.test.ts` (per-occurrence idempotency suite, unrelated to this gap) since it now calls `supabaseAdmin.from('tenants')` — every tenant in that suite resolves as `'active'` so the new gate is a no-op there, all 8 original assertions unchanged and still passing.

## (2) — continued: same class found and fixed in 1 more cron — `cron/auto-reply-reviews`

Broadened the same-round sweep to the other Google-Business-Profile cron sibling of `sync-google-reviews` (fixed last round). `cron/auto-reply-reviews/route.ts` queries `tenant_settings` for every tenant with `google_auto_reply` enabled (no status join at all) and, for each, calls `autoReplyReviews(tenantId)` — which spends a real Google API call to post a **public** reply on the tenant's Google Business Profile. A suspended/cancelled/deleted tenant kept auto-replying to its own Google reviews forever, publicly, on a dead business's behalf — arguably worse optics than the messaging-only gaps fixed earlier (public-facing, permanent, visible to anyone reading that business's reviews). Fixed with the same batch tenant-status lookup pattern (`tenant_settings.tenant_id` has no embedded tenant row, so a separate `.in('id', ...)` lookup against `tenants` was needed, same as `recurring-expenses`). Added `route.status-gate.test.ts` (no pre-existing test file for this route) covering all 6 statuses.

Checked but confirmed NOT the same gap (different semantics, no fix needed):
- `cron/gdpr-purge` — correctly ungated by design. GDPR/CCPA deletion rights apply regardless of a tenant's business status; gating this on `tenantServesSite()` would be the bug, not fixing it.
- `cron/cleanup-videos` — tenant-scoped storage cleanup (deletes stale walkthrough/final video URLs older than 30 days), but pure hygiene with no customer-facing message or financial write. Arguably *should* keep running for a dead tenant to reduce storage cost, not gated.
- `cron/refresh-job-postings` — cache revalidation of static career pages only; a dark tenant's pages are already unreachable via the existing resolver-layer gating, so refreshing their cache tag is a harmless no-op.
- `cron/anthropic-health`, `cron/comms-monitor`, `cron/email-monitor`, `cron/health-monitor`, `cron/health-check`, `cron/system-check`, `cron/jefe-heartbeat` — platform-wide monitoring/alerting crons, correctly not tenant-scoped (alert the platform owner, `notifications.tenant_id` nullable by design for exactly this case).

## (3) — gap/fluidity kept current

Carried-forward NOTICED items 1–29, 31–32, 34–35, unchanged (see prior rounds' docs).

Carried forward, still flagged not fixed (product/rollout/data calls, unchanged):
- `webhooks/stripe` never calling `activateTenant()` (HIGH SEVERITY, flagged 2026-07-18 ~02:10, in `JEFF-MORNING-QUEUE.md`).
- Item 30: ComHub `requireAdmin()` vs. nav-parity (20 route files gated Jeff-only while nav exposes ComHub to every operator; needs Jeff's rollout-gating call).
- Item 33: three bespoke-site tenants' dead, cross-tenant-contaminated `_lib/domains.ts` + `_lib/lead-filters.ts` (needs Jeff's call on delete-vs-provide-correct-data; confirmed dead/no live impact).
- Item 38: owner/admin Telegram bots (`webhooks/telegram/route.ts`, `webhooks/telegram/jefe/route.ts`) hardcoded off nycmaid / not tenant-scoped, chat-ID-allowlisted, no status check — needs Jeff's call (same shape as item 30).

NEW this round:

45. `cron/recurring-expenses` never gated its journal-entry posting on `tenantServesSite()` — the second write path found this session that WRITES real financial/ledger data (not just messaging) for a dead tenant — fixed above (1).
46. `cron/auto-reply-reviews` never gated its Google Business Profile auto-reply on `tenantServesSite()` — a PUBLIC-facing write (a visible reply on a live Google listing) for a dead tenant, arguably higher-visibility than any gap fixed so far — fixed above (2).
47. `cron/gdpr-purge`, `cron/cleanup-videos`, `cron/refresh-job-postings` individually checked and confirmed NOT this gap class (see (2) above) — no longer "unswept," can be dropped from the carry-forward list.
48. Remaining unswept from prior carry-forward: the 11 `seo-*` pipeline crons, plus `finance-post` (already `.eq('status','active')`, likely safe but not individually re-verified), `confirmation-reminder`, `confirmations`, `daily-summary`, `late-check-in`, `lifecycle`, `outreach`, `payment-followup-daily`, `payment-reminder`, `phone-fixup`, `post-job-followup`, `rating-prompt`, `release-due-payments`, `reminders`, `retention`, `schedule-monitor`, `backup` — most of these showed a nonzero `status`/`active` filter grep hit in this round's survey (suggesting existing gating of some kind) but were not individually read end-to-end to confirm it's actually a `tenantServesSite()`-equivalent check and not something narrower. Carried forward for next round, prioritized by write-count and customer-facing-ness: `payment-reminder` (writes=7), `reminders` (writes=16), `late-check-in` (writes=7), `post-job-followup` (writes=5) look highest-value to verify first.

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward, unchanged: items 18–20.

## Verification this round

- `npx tsc --noEmit`: clean.
- `npx vitest run src/app/api/cron/`: 40 files, 145/145 pass (13 new across 2 new test files, 1 pre-existing test file updated for compatibility with the new tenant-status lookup — `recurring-expenses/route.test.ts`, all 8 original assertions unchanged and still passing).
- Full repo suite: run in background this round (large; prior round was 715 files / 3088 passed / 37 skipped / 0 failed) — not yet confirmed complete as of this doc; will report result separately if anything regressed.

File-only, no push/deploy/DB write from this worker. 2 code fixes this round (recurring-expenses, auto-reply-reviews) + 2 new test files + 1 existing test file updated for compatibility + 1 docs commit.
