# W2 gap/fluidity refresh — 2026-07-18 06:41

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-18-detect-migration-plus-3-financial-status-gate-gaps-2026-07-18-0632.md`.

Leader's instruction this round (06:35 LEADER->W2): fresh 3-deep queue — (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1) — new fresh-ground surface: NONE FOUND. Reporting the null result rather than fabricating one.

Re-swept every remaining candidate for the `tenantServesSite()` status-gate bug class (30+ rounds deep this session) and the resolver-precedence class (this worker's own lane). Nothing new survived scrutiny:

- **Every cron route without a `route.status-gate.test.ts`** (`gdpr-purge`, `cleanup-videos`, `refresh-job-postings`, `comms-monitor`, `email-monitor`, `health-monitor`, `system-check`, `anthropic-health`, `jefe-heartbeat`) — read each end-to-end. All independently re-confirm prior rounds' judgment: `gdpr-purge` is correctly ungated by design (GDPR rights apply regardless of business status); `cleanup-videos` is tenant-scoped storage hygiene with no customer-facing write, arguably should keep running for a dead tenant; `refresh-job-postings` is a harmless cache-revalidate no-op for a dark tenant (already unreachable via resolver-layer gating); the rest are platform-wide monitoring/alerting with no tenant-scoped write, routing only to Jeff/admin. No regressions since the last time each was checked (`w2-recurring-expenses-auto-reply-reviews-status-gate-gap-2026-07-18-0536.md`, item 47).
- **The seo-* lib layer (11 files)** — already fully triaged last round (`w2-17-...-0619.md`): 7 fixed + `ingest.ts`'s metrics-pull step fixed, `detect.ts` migration prepared-not-applied (carried forward, unchanged), `verify-revert.ts`/`alerts.ts`/`health.ts` are judgment calls flagged for Jeff, unchanged. Nothing left to open here.
- **The resolver stack** (`middleware.ts`, `tenant-lookup.ts`, `tenant.ts`, `domains.ts`) — re-read `middleware.ts` in full end-to-end (my own lane). No regression: subdomain routing, custom-domain routing, the `STATIC_TENANT_MAP` wrong-tenant guard, and the `TENANT_DIVERGENCE` catch are all intact and match the fixes from prior rounds. Checked every other live caller of `getTenantByDomain`/`getTenantBySlug` repo-wide (`ingest/lead`, `ingest/application`, `webhooks/resend`, `webhooks/stripe`, `admin/*`, `cron/tenant-health`) for divergence-error handling: `ingest/*` only use the status-agnostic slug lookup (no domain-divergence surface); `webhooks/resend`'s dormant (env-flag-gated, currently off) inbound-tenant-scope path catches ALL resolver errors — including a hypothetical `TENANT_DIVERGENCE` — and treats them as "unresolved" (`tenantId: null`), which is the *safe* direction (same as refusing to serve), not a gap.
- **`webhooks/stripe-platform/route.ts`** (not previously individually named in this session's docs) — read in full. Correctly calls `activateTenant()` on paid checkout completion, best-effort/non-fatal on activation failure. Not the same file as the HIGH-SEVERITY `webhooks/stripe` gap already in `JEFF-MORNING-QUEUE.md` (that one's the tenant-Connect webhook's self-serve-signup branch, still open, unchanged, needs Jeff's schema-verification call — re-confirmed still open, not silently re-fixed by anyone else).

Also confirmed the two open MISSING-FEATURE items (18, 20) and item 33 (cross-tenant-contaminated dead `_lib/domains.ts`/`_lib/lead-filters.ts` in three bespoke tenants) are still explicitly product/data calls awaiting Jeff, not something to unilaterally implement or guess at — no new information changes that.

## (2) — no surface opened, nothing to continue

Since (1) found no new code-fixable gap, there's no fresh thread to pull on this round.

## (3) — gap/fluidity kept current

Carried-forward NOTICED items 1–32, 34–35, unchanged.

Carried forward, still flagged not fixed (product/rollout/data calls, unchanged):
- `webhooks/stripe` never calling `activateTenant()` (HIGH SEVERITY, in `JEFF-MORNING-QUEUE.md`) — re-verified still open this round.
- Item 30: ComHub `requireAdmin()` vs. nav-parity.
- Item 33: three bespoke-site tenants' dead, cross-tenant-contaminated `_lib/domains.ts` + `_lib/lead-filters.ts`.
- Item 38: owner/admin Telegram bots hardcoded off nycmaid / not tenant-scoped.
- Item 49: `backup`'s use of `tenantServesSite()` may be too strict for data-retention purposes — needs Jeff's call.
- Item 52 sub-items: `verify-revert.ts`, `alerts.ts`, `health.ts` (seo lib layer) — judgment calls, unchanged.
- `detect.ts`'s migration (item 0, prior round) is prepared as a file but NOT applied — needs Jeff's approval + the leader to run it against prod.

No new numbered items this round — nothing met the bar for a real, unambiguous, code-fixable gap.

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward, unchanged: items 18–20.

## Verification this round

- No code changed — `git status --porcelain -- platform/src` empty.
- `npx tsc --noEmit` not run — no source edits to verify.
- File-only, no push/deploy/DB write from this worker. 0 code files touched, 1 docs commit.

## Assessment for the leader

After ~19 rounds, the `tenantServesSite()` status-gate bug class and this worker's own resolver-precedence lane both appear genuinely exhausted: every remaining item found is either already fixed, correctly judged not-a-gap by design, or blocked on a product/data decision only Jeff can make (7 distinct items now sitting in that bucket, listed above). Recommend the next round either (a) waits on Jeff's decisions on the queued items rather than manufacturing new busywork, or (b) explicitly pivots the queue to a different surface/track (e.g. the missing-feature/UX-friction backlog, or a code-review pass over this session's own ~50 fixes for regressions) rather than continuing to re-sweep the same status-gate class.
