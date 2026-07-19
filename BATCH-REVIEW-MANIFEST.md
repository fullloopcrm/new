# BATCH-REVIEW MANIFEST — P1 hardening sprint (2026-07-11)
Assembled by LEADER for Jeff's review session. Nothing here is pushed/deployed/DB-run. All branches based on `security/xss-theme-css-2026-07-10`.

## 🏁 MASTER HANDOFF → `/tmp/MASTER-HANDOFF.md` (read this first)
One executive doc with the full ordered runbook. Supporting: `/tmp/w1-remaining-gaps-v2.md` (go/no-go), `/tmp/w4-final-security-posture.md` (security ledger), `/tmp/w4-post-deploy-verification.md` (prove-it-live plan), `/tmp/w4-backfill-audit.md` (money/access migration review).

## ✅ FINAL INTEGRATION GREEN (W2, branch `p1-final-integration` @ 87243602, local)
Fresh branch off `security-fixes-integration`; merged ALL 4 lanes at final tips (migration + core-process + all security + full SEO). All merge conflicts resolved (kept superior team-portal throttle, unioned agent-config selects, p1-w3 authoritative for SEO); 6 cross-lane test-harness breaks fixed, no assertion weakened. **BUILD GREEN (1261 pages) · tsc CLEAN · vitest 461 passed / 0 failed (56 files) · example.com=0.** One residual: `the-nyc-seo` fabricated AggregateRating (20 files + reviewCounts) — being purged on p1-w3, then re-merge. This is the definitive "it all holds together" proof; everything else is Jeff-gated.

## 📋 DEFINITIVE GO/NO-GO CHECKLIST → `/tmp/w1-remaining-gaps.md`
W1's completeness-critic produced the authoritative ordered go/no-go (P0/P1/P2/P3 gaps, per-domain ledger, dependency-ordered merge/deploy steps). **Verdict: NO-GO to call "done" until P0/P1 close.** In-flight now: OTP/PIN HIGHs (W4), SEO finish (W3), owner_phone + F3-pricing backfills + crews R-1 (W1), Selena F-4 (W4). Read that file for the full list.

## ✅ INTEGRATION VERIFIED (W2, branch `p1-integration-verify`, local)
All 4 branches merged (w1/w4 clean; w2 2 conflicts resolved; w3 8 SEO conflicts → took p1-w3 per rule). **tsc GREEN · vitest 376 passed / 0 failed · build compiles green · all 1261 static pages prerender.** Only failure = missing SUPABASE_URL in the worktree, which fails identically on the untouched base branch = NOT a regression. **The batch is truly mergeable — no integration breaks.** Real prod build needs the supabase build-env present.

## ⚠️ 2 NEW HIGH auth holes (W4 capability audit) — fix in flight (p1-w4)
- portal `verify_code`: no rate limit on OTP-verify → 6-digit brute-force → client-portal takeover.
- team-portal auth: rate-limit bucket keyed on the PIN value → PIN enumeration unthrottled → field-staff takeover.
- (MEDs: client/login no lockout; referrers OTP uses Math.random; client/verify-code loose phone endsWith.)
- VERIFIED-SOLID: documents/invoices/quotes/cpa tokens (192-bit, scoped), referrer/unsubscribe (HMAC+timingSafeEqual).

## 🚀 DEPLOY STRATEGY — phased in 4 waves with probe verification between each (consultant, banked)
Do NOT deploy all fixes in one push — phased deploy means if something breaks you know which wave caused it (no bisect).
- **Phase A:** deploy the low-risk / non-behavioral changes first; run probes; green before B.
- **Phase B:** resolver flip — deploy with assert-guard live; watch `TENANT_DIVERGENCE` errors first 30 min; clean → proceed.
- **Phase C:** auth-behavior security fixes (owner_phone gating, portal OTP throttle, yinez header verify, voice webhook sig, Selena tool scoping); watch auth-related errors; clean → done.
- **Phase D (last):** webhook idempotency fix — requires `TELEGRAM_WEBHOOK_SECRET` set + coordinated webhook re-register FIRST.
Prereqs sequence: TELEGRAM_WEBHOOK_SECRET setup precedes Phase D; owner_phone blocking-list populated before Phase C. (Staging vs deploy-to-prod-with-probes is Jeff's call; consultant leans deploy-to-prod-with-probes given time constraints.)

## THE THREE GATES (only these need Jeff)
(a) prod DB writes beyond the already-applied P1 migration · (b) git push to main · (c) deploy to prod

---

## A. PROD DB WRITES — run in THIS order (Jeff-gated)
1. **058_fix_nycmaid_routing.sql** (p1-w2 `82d3c06`) — flips nycmaid tenant_domains routing_mode template→bespoke. Keyed on tenant_id resolved from live domains (not slug). Idempotent. Low risk.
2. **060_lockdown_secdef_rpcs.sql** (p1-w1 `e1a9e33`) — REVOKE EXECUTE FROM authenticated on post_journal_entry + cpa_token_bump_usage, pin search_path. Defense-in-depth (not exploitable today; all calls service_role). Safe.
3. **061_unique_journal_entries.sql** (p1-w2 `cba595e`) — partial UNIQUE(tenant_id,source,source_id) WHERE source_id IS NOT NULL on journal_entries, closes ledger TOCTOU. Paired with `ledger.ts` treating 23505 as idempotent success. ⚠️ MUST run the dup-detection probe in the file header FIRST before adding, or it errors. (Concurrent double-PAYOUT was already closed by PR#12's claim-before-transfer — verified, not re-fixed.)
4. **059_backfill_vercel_project.sql** (p1-w1 `69942cc`) — sets vercel_project for determinable rows, unknowns NULL. Safe. (Full backfill still needs a Vercel API token — deferred.)
5. **owner_phone backfill** (DATA — file TBD) — populate `tenants.owner_phone` for every non-nycmaid tenant. ⚠️ MUST run BEFORE deploying the booking-owner fix (017043f), else non-nycmaid owners lose admin tooling (fail-closed by design).
6. **062_add_tenant_id_inbound_emails.sql** (p1-w3 `42b5a39`) — additive/idempotent ADD COLUMN IF NOT EXISTS tenant_id + index + backfill note. Safe. ⚠️ run BEFORE deploying the inbound-email scoping route change (42b5a39), which sets tenant_id on insert.

## B. DEPLOYS (Jeff-gated)
- **Resolver flip [THE BIG GATE]** — p1-w2 `52289e6` + `8e2c805` (+ `ee8943a` tenant.ts reconcile). tenant_domains-first resolution + TENANT_DIVERGENCE assert-and-refuse. Deploy with `[deploy]`, assert-guard live, watch 24–48h, THEN 057_unfreeze + drop fallback later. Smoke suite ready: `a2d9adb` (run with SMOKE_RUN=1 against the deploy URL).
- **Security fixes bundle** (deploy after review): portal verify_code `63eedce`, yinez header `016ee7d`, booking scope `017043f` (⚠️ AFTER owner_phone backfill), voice hardening `a7614f7` (⚠️ any 2nd voice tenant must have its DID seeded in `tenants.telnyx_phone` or its calls 404; admin-ring routing still nycmaid-global — separate follow-up), inbound-email scoping `42b5a39` (⚠️ AFTER migration 062), webhook idempotency `cba595e` (⚠️ AFTER migration 061).

## C. PUSHES TO MAIN (Jeff-gated)
- p1-w1, p1-w2, p1-w3, p1-w4 each merge to main. Watch for package/migration-number collisions between branches (059/060 on w1, 058/061 on w2). p1-w3 adds the reconcile CI gate — the 2 orphans are allowlisted so it won't red-gate.
- **MERGE-TIME ONE-LINER:** in PR#12's payout lane (`fix-payout-w2`), add `{ idempotencyKey: \`payout_${bookingId}\` }` as the 2nd arg to `stripe.transfers.create` (belt-and-suspenders on Stripe's auto-retry). NOT applied on p1-w2 by design — it sits inside PR#12's claim-before-transfer block and editing it there risks clobbering the actual CRITICAL fix.

---

## OPEN DECISIONS FOR JEFF (not gated, but blocking downstream)
### SEO fixes — RECONCILED: W1's `c749195` was PARTIAL, W3 completes on p1-w3 (authoritative)
- W1 `c749195` (p1-w1) removed AggregateRating/example.com from ~29 files but LEFT 18 files with fabricated AggregateRating (the-nyc-seo ×9, nycmaid, wash-and-fold ×2, sunnyside, template ×4) + 10 template example.com files.
- **W3 now owns the COMPLETE SEO fix on p1-w3** (all 19 sites gated via the nyc-classifieds real-review pattern, all example.com canonicals, 15 orphaned-page sitemaps, template NAP). **MERGE RULE: for site-schema/SEO files, take p1-w3 over p1-w1** (c749195's SEO portion is superseded). Keep `nyc-classifieds` untouched (already correct/gated).

### CORE-PROCESS fixes (p1-w2, in progress) — from W2 audit
Runtime is trade-agnostic; breaks are provisioning/config gaps. Fixing: F1 CRITICAL (23 project/lead verticals default to booking-mode → set quote_first), F2 HIGH (agent ignores seeded per-trade checklist → wire it in), F3 MED/HIGH (flat/per-unit trades priced as $/hr → model as flat/per-unit). Payment/quote/recurring/confirmation all PASS globally.

### SITE STABILITY (W4 sweep) — 20/22 + 2 hosts HTTP 200, tenant-correct, no cross-tenant swap
Two dark/broken sites need JEFF/INFRA (leader cannot touch DNS — hard rule):
- **toll-trucks-near-me DARK** — total DNS outage; GoDaddy still delegates to a cancelled SiteGround zone (SERVFAIL). Fix = repoint nameservers to Vercel. Not code.
- **wash-and-fold-hoboken** — no determinable live domain; canonical stale → thenycmaid.com. Confirm real domain in `tenant_domains`.
- Build-time `verify-protected-tenants.mjs` passes but is DNS-blind — recommend an external uptime/DNS monitor.

## OPEN DECISIONS FOR JEFF (not gated, but blocking downstream)
- **F1 — Selena routing — RESOLVED (Jeff via consultant, 2026-07-11):** NOT a full cutover. Direction:
  1. NYC Maid stays UNTOUCHED — reference build / working case study, do not modify.
  2. Every tenant gets its OWN Selena with its own per-tenant memory file.
  3. Architecture = base engine + per-tenant customization layer (not one gated engine).
  4. Migrate non-nycmaid tenants ONE AT A TIME, starting with the EXTERMINATOR (config already exists — `exterminatorAgentConfig` — but is never imported = W1's F2 finding).
  5. Global code never overwrites tenant data — same rule as the front-end sites (July-8 lesson applied to the AI layer).
  → **IN PROGRESS — per-tenant Selena migration, all on p1-w1 (sequential, registry lives here):**
    - `2c4d854` the-nyc-exterminator (F2 wire + F3 rate carry-through)
    - `76b7753` nyc-tow · `e0a250b` nyc-mobile-salon · `759efc6` we-pay-you-junk · `8a8b81f` landscaping-in-nyc · `db68d13` the-florida-maid
    - **6 tenants done.** Each: own `tenants/<slug>.ts` persona + slug-keyed registry, real rates via `buildPriceCopy` where the trade quotes, tests. tsc 0, vitest 189 pass, nycmaid byte-untouched. Remaining tenants being migrated one at a time on the same pattern. `agent_name='Selena'` default (DB `selena_config` overrides downstream).
- **Orphan disposition:** are tolltrucksnearme.com + the Hoboken wash-fold domain LIVE standalone deploys or dead? (blocks removing the allowlist / PROTECTED guard cleanup)
- **Vercel API token:** needed to finish the vercel_project full backfill (~15 unknown rows).

## VERIFIED FINDINGS THIS SPRINT (all committed, file-only)
- RPC SECDEF audit: 1 latent-CRITICAL (post_journal_entry cross-tenant ledger forgery once Supabase Auth wired) → fixed by 060.
- Route→tenant-filter map: 498 routes, NO confirmed cross-tenant leaks; tenantDb() wrapper 0/498 adoption = highest-leverage future hardening.
- Selena tool safety: cross-tenant booking reschedule/cancel + global isOwner → fixed 017043f (15 adversarial tests).
- Comhub routing: yinez forgeable-header leak → fixed 016ee7d; VOICE hardcode + EMAIL gap → in-flight (W4/W3).
- Webhook idempotency: CRITICAL concurrent double-payout + 2 HIGH → fixes in-flight (W2); reconcile vs live uq_payouts index required.
- tenant_domains alias investigation: 0 true orphans, c4=15 is a false-positive class.
