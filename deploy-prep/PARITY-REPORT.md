# PARITY-REPORT — nycmaid → FL tenant (...001)

Per-worker parity findings from the 2026-07-13 10:32 LEADER PARITY-DIFF order.
Source: `~/Desktop/nycmaid` (thenycmaid/nycmaid @ 15837e3, READ-ONLY, never modified).
Target: this FL platform, nycmaid tenant `00000000-0000-0000-0000-000000000001`.
NO cutover/webhook/DNS/deploy/prod-DB work in this pass.

---

## W2 — LANE: CRONS behavior (21 nycmaid crons vs FL routes)

Presence was already verified (all 21 nycmaid cron names have FL route
equivalents in `platform/vercel.json`; 3 — `reminders`, `payment-reminder`,
`schedule-monitor` — were already behavior-verified in an earlier pass per
`nycmaid-cutover-CHECKLIST.md` §J). This lane closes the remaining 18 "open"
items from that checklist by diffing LOGIC, not just presence, against
`~/Desktop/nycmaid/src/app/api/cron/*`.

**Tally: 10 ✅MATCH · 7 fixed (commits below) · 1 ⚠️FLAGGED for Jeff (not auto-ported).**

### ✅ MATCH — no drift, no action

| Cron | Notes |
|---|---|
| `confirmation-reminder` | nycmaid:`src/app/api/cron/confirmation-reminder/route.ts` vs FL:`platform/src/app/api/cron/confirmation-reminder/route.ts` — faithful tenant-scoped fan-out port, per-tenant dedupe via `sms_logs` preserved. |
| `rating-prompt` | Same file pair — CAP=10 bulk-block safety rail (the "157-SMS blast" lesson) correctly re-enforced **per tenant**, not just globally. |
| `late-check-in` | Same file pair — naive-timestamp comparison is behaviorally equivalent on both sides (Postgres ignores the tz suffix when casting a string to a `timestamp` column; both apps run in UTC, so digit-for-digit comparison matches). Minor note (not fixed): FL inlines its own `Bearer` check instead of the shared `protectCronAPI` helper other crons use — cosmetic, both fail closed to 401, no behavior difference. |
| `health-check` | nycmaid:54 lines vs FL:271 lines — FL is a strict superset (self-healing retry engine, stale-notification cleanup, stale-booking auto-complete) on top of the original connectivity/env checks. Covers nycmaid tenant by iterating all active tenants. |
| `backup` | Mechanism changed (nycmaid: CSV-via-email to `ADMIN_EMAIL`; FL: per-tenant JSON snapshot to Supabase Storage `platform-backups/<slug>/<date>.json`) but intent is preserved — iterates all active tenants including nycmaid. Deliberate architecture upgrade, not a regression. |
| `comms-monitor` | Platform-wide admin alert monitor (not tenant-specific by design in either version). FL substitutes Telegram (`alertOwner`) for nycmaid's email+SMS admin alert — reasonable platform-ops equivalent. |
| `sync-google-reviews` | Tenant-scoped correctly, upsert uses composite key `tenant_id,google_review_id`. **Note (not fixed, out of cron-lane scope):** nycmaid cached `avg_rating`/`total_reviews` onto `settings.google_business` each sync; FL dropped that aggregate-stats write. The admin UI (`admin/google-profile/page.tsx:39`) reads a `google_avg_rating` field that is never written anywhere in the codebase — appears to be a platform-wide dead field, not a nycmaid-specific regression. Flagging for whoever owns that admin surface. |
| `cleanup-videos` | Logic matches; storage bucket renamed `cleaner-photo` → `uploads`. **Note (not fixed — needs live-DB check, can't verify from code):** if nycmaid's synced video URLs still reference the old `cleaner-photo` path, `extractStoragePath()`'s regex (`/object/public/uploads/`) won't match them, so old files won't actually be deleted from storage (the DB pointer still clears fine — no functional/customer-facing break, just potential storage cost). |
| `payment-followup-daily` | Tenant-scoped correctly; nycmaid qualifies (`telnyx_api_key` + `payment_link` both set per the cutover checklist). Faithful port including the ET-slot gating, 14-day recency floor, per-slot idempotency, and the send cap. |
| `phone-fixup` | Tenant-scoped correctly; nycmaid-only in practice since it queries the `cleaners` table model (other FL tenants use `team_members`). Signed-token link, CAP=10, 7-day dedupe all preserved. |

### ❌/⚠️ FIXED — commits on `p1-w2`

| Cron | Bug | Fix | Commit |
|---|---|---|---|
| `sales-follow-ups` | Queried `deals.status` — **a column that doesn't exist.** `deals` was unified onto a single `stage` field (migration `2026_07_03_sales_pipeline_unify.sql`: new/qualifying/quoted/pending/sold/lost). The query has been erroring on every run, for every tenant, since that migration — cron silently 500s, no follow-up reminders ever fire. | `.eq('status','active')` → `.not('stage','in','(sold,lost)')`, matching nycmaid's `stage='active'` intent (still open). | `5083a8e7` |
| `outreach` | Same bug class: sales-board exclusion queried `deals.status`. Query errored → silently fell back to empty set → clients actively being worked in the sales pipeline received seasonal marketing SMS they should have been excluded from. | Same fix pattern. | `11a0e7fb` |
| `daily-summary` | Recurring-expiration dedup ("already notified within 7 days") filtered only on `tenant_id`+`type` — no client/schedule scope. The first expiring recurring schedule to fire in a tenant silently suppressed every **other** expiring schedule's warning for a full week. nycmaid scoped the dedup via a message `LIKE` match on client name + recurring type. | Restored the `.like('message', '%client%type%')` scope. | `fba8a903` |
| `comhub-email` | nycmaid hardcoded Yinez/Selena's **email** auto-reply OFF on 2026-05-29 (Jeff: she wasn't checking schedule availability before replying to email leads — a documented safety decision, not an oversight). The tenant-scoped FL port dropped that override entirely — Selena would auto-email nycmaid leads with the same bug Jeff turned off. | Gated the off-switch to the nycmaid tenant only; other tenants keep auto-reply (their own deliberate feature, unaffected). | `95af9291` |
| `refresh-job-postings` | Revalidated `/site/available-nyc-maid-jobs` + `/site/careers/operations-coordinator` (bare `/site/...` root) for "nycmaid." But `middleware.ts` (`ROOT_SITE_TENANTS` is empty; `nycmaid` is in `BESPOKE_SITE_TENANTS`) rewrites nycmaid's live domain to `/site/nycmaid/...` — the bare root is dead code for domain routing. nycmaid's actual live job/career pages were **never** being revalidated, reproducing the exact Google-for-Jobs staleness bug this cron exists to prevent. | Added the correct `/site/nycmaid/available-nyc-maid-jobs`, `/site/nycmaid/careers/commission-sales-partner`, `/site/nycmaid/careers/operations-coordinator` paths. Left the legacy root entries in place (harmless). | `8810cedc` |
| `anthropic-health` | nycmaid alerts at most once per 30 min per failure kind (system_state-backed) — "Jeff has no other signal the agent is dead," deliberately capped, not silenced. FL's port had no cooldown at all; this cron runs every 15 min, so a sustained Anthropic outage would page the owner's Telegram on every tick. | Ported the 30-min cooldown via a `notifications`-table dedup (same proven pattern `cron/comms-monitor` already uses) rather than `system_state`, which isn't referenced anywhere else in the current codebase and its schema couldn't be verified. | `404615a9` |
| `health-monitor` | The `reminders` check watched `email_logs` for a subject `ILIKE '%reminder%'` — but `cron/reminders` **never writes `email_logs`** (only `client/book` and `client/reschedule` do; `reminders` writes `notifications` rows). The check would find nothing and permanently report "reminders silent," false-alarming every 6h even while reminders fire correctly. | Replaced with checks on the notification types `cron/reminders` actually produces: `daily_ops_recap`, `daily_digest` (verified at `cron/reminders/route.ts:526,575`). | `42b5d267` |

### ⚠️ FLAGGED for Jeff — not auto-ported (too broad/risky for this pass)

| Cron | Drift |
|---|---|
| `generate-recurring` | nycmaid keeps a rolling buffer of **6 future bookings** per schedule (16-week lookahead for monthly patterns), replenished only when the count drops below 6. FL instead generates on a fixed **4-week horizon** from the latest existing booking, regardless of schedule frequency. For weekly schedules the two models land close; for **biweekly/monthly nycmaid schedules** FL's 4-week horizon produces meaningfully less lookahead than nycmaid's count-based buffer (e.g. a biweekly schedule: nycmaid buffers ~12 weeks out to hold 6 occurrences; FL only reaches 4 weeks = ~2 occurrences). This is core booking-generation logic **shared across every tenant on the platform**, not nycmaid-specific code — rewriting it to match nycmaid's count-based model in this pass would be a platform-wide behavior change I'm not comfortable making unreviewed in a parity-diff pass. Also note: the "auto-resume paused schedules" sub-feature is intentionally hardcoded to `NYCMAID_TENANT_ID` only (comment: "NYC Maid parity") — correct for nycmaid's own behavior, but is architecture debt against this repo's own GLOBAL-feature rule (`platform/CLAUDE.md`) worth cleaning up separately. |

### Also noticed, not in this lane (surfaced for the owning worker/lane)

- `deals.status` (nonexistent column) may be queried elsewhere outside `cron/*` — a broader grep turned up hits in `api/pipeline/route.ts`, `api/quotes/route.ts`, `api/deals/route.ts`, `api/deals/at-risk/route.ts`, `lib/selena/tools.ts`, `lib/tenant-db.test.ts`. Not verified individually (out of the crons lane) — worth a targeted sweep.
- `google_avg_rating`/`google_review_count` fields read by `admin/google-profile/page.tsx` appear to be dead (never written by any code path found) — platform-wide, not nycmaid-specific.

### Test coverage

Every fix above ships with a non-vacuous `route.test.ts` in the same directory
(verified failing against the pre-fix code via `git stash`, passing post-fix).
`npx tsc --noEmit` clean after each commit.
