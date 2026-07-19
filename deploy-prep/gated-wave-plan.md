# GATED-ITEM WAVE PLAN — for Jeff (clear one wave per sitting, not 52 one-offs)

> Every item here is JEFF-GATED (merge / prod DB / DNS / env / deploy / sign). The fleet cannot do these — they need you. Ordered so each wave unblocks the next. Do NOT reorder within a wave without reading the DO-NOT-SKIP notes.
> Author: leader session-5 · 2026-07-12 ~19:04 · Source: `~/flwork-todo/MASTER-TODO-LIST.md`

---

## WAVE 0 — Zero-risk merges (do first, ~20 min)
Independent hotfix PRs already cherry-picked clean off main. No DB, no sequence dependency.
- [ ] Merge **PR #14** (TCPA SMS opt-out) → main → deploy. github.com/fullloopcrm/new/pull/14
- [ ] Merge **PR #15** (selena IDOR, PII leak) → main → deploy. github.com/fullloopcrm/new/pull/15
- [ ] **nycmaid Vercel binding** — repoint thenycmaid.com to current prod deployment in YOUR personal Vercel account (leader has no access). Then W4 re-verifies /api/health + /api/tenant/public = 200.
  - _added 2026-07-12 19:53: WATCH THIS during the binding fix — W6's audit found a nycmaid `routing_mode` contradiction (template vs bespoke; 058 flips template→bespoke). If the domain binding and the routing config disagree, repointing the deployment alone may NOT fully resolve the stale-serving issue. Check that routing_mode is bespoke (or 058 is applied) when you rebind. See deploy-prep/wave-plan-gaps-reconcile.md (W6)._

## WAVE 1 — Re-integrate + rebuild green (blocks everything below)
- [ ] Fresh-merge current branch HEADs in order: **p1-w4 → p1-w1 → p1-w3 (authoritative on SEO/schema) → p1-w2**. Integration branch is STALE (~28 stranded wave-2 commits).
- [ ] **GATE:** rebuild green on re-integrated branch — `npm run build` + full `vitest` + `tsc --noEmit`. Old "286/461" was on the stale branch, does NOT count.
- [ ] 3-way reconcile re-integrated vs local main `669f588` (fortress) vs origin/main `62623a8`. Watch migration-number collisions (059/060 w1, 058/061 w2).
  - _added 2026-07-12 19:33: FILE COLLISION on `sidebar-counts` — p1-w1 (columns-cast-to-`*` wrapper fix, matches p1-w2 pattern) vs p1-w3 (revert-wrapper + cast at 2 call sites). Both tsc-clean/tested. At merge, pick ONE: W3 recommends preferring the p1-w2 wrapper-level pattern (p1-w1's) and dropping W3's call-site casts for consistency. Don't auto-merge both._

## WAVE 2 — Prod DB migrations, STRICT ORDER (each has a DO-NOT-SKIP)
- [ ] `055` routing schema + backfill + verify
- [ ] `056` enforce (keeps vercel_project NULLABLE) · `059` vercel_project backfill (partial; full needs Vercel API token)
- [ ] **owner_phone backfill** — BEFORE booking-owner deploy, or 19 tenants lock owners out (DO-NOT-SKIP #1; 19 NULL verified)
- [ ] run **061 dup-probe FIRST**, then `061` unique index on journal_entries(tenant_id,source,source_id) — before webhook-idempotency code
- [ ] `062` add tenant_id to inbound_emails — before inbound-email scope fix deploy
- [ ] `058` flip nycmaid routing_mode template→bespoke
- [ ] `060` lockdown SECURITY DEFINER RPCs (post_journal_entry, cpa_token_bump_usage)
- [ ] **F3 pricing backfill** — FIRST run `SELECT DISTINCT industry FROM tenants`, extend PASS C allowlist, add nycmaid guard to PASS A/B (DO-NOT-SKIP #2)

## WAVE 3 — Env + secrets (before the deploys that depend on them)
- [ ] Set `TELEGRAM_WEBHOOK_SECRET` in prod AND re-register every bot webhook — skip = all 3 Telegram routes fail closed, bots go dark
- [ ] Activate config-SoT reconcile build-gate via Vercel env `SUPABASE_ACCESS_TOKEN_FULLLOOP`
- [ ] Seed 2nd voice tenant DID in tenants.telnyx_phone or its calls 404

## WAVE 4 — Deploy the security bundle (ONLY after 061 + owner_phone + 062 run)
- [ ] Deploy security bundle (booking IDOR, voice webhook sig, telegram, portal OTP/PIN throttle, yinez, inbound-email, ledger TOCTOU, team-portal token constant-time compare)
  - _added 2026-07-12 19:15: W3 found + fixed a timing side-channel in team-portal/auth/token.ts — `!==` HMAC compare (referrer-portal used `timingSafeEqual` on the SAME shared TEAM_PORTAL_SECRET), forgeable `scope:team` bearer = cross-tenant team-member impersonation. Fix on p1-w3 (constant-time, mirrors referrer). Deploys inside this bundle; no separate deploy._
- [ ] Confirm deploy killed the live fabricated AggregateRating on flagged sites (19/22, Google manual-action risk)

## WAVE 5 — THE BIG GATE: resolver flip (24-48h watch window)
- [ ] Deploy `[deploy]` with TENANT_DIVERGENCE assert-and-refuse guard live (8e2c805), wire a prod log alert on it
- [ ] Watch 24-48h · run smoke `SMOKE_RUN=1 npx vitest run src/lib/tenant-resolver-flip.smoke.test.ts`
- [ ] THEN `057_unfreeze` + drop tenants.domain fallback
- [ ] Re-probe all 22 live domains post-deploy (pre-merge green does NOT carry forward)

## WAVE 6 — DNS (you or registrar; leader never touches DNS)
- [ ] toll-trucks-near-me — repoint NS to Vercel (GoDaddy → cancelled SiteGround zone = SERVFAIL, site dark)
- [ ] fladumpsterrentals.com — nameservers unreachable, repoint
- [ ] wash-and-fold-hoboken — confirm live domain + fix canonical

## WAVE 7 — Sign / attest (no build, ~30-60 min total)
- [ ] PCI SAQ-A self-attestation (Stripe, ~30 min)
- [ ] Sign DPAs with sub-processors (Stripe, Telnyx, Supabase, Resend, Anthropic/xAI, Vercel)
- [ ] Backup restore drill execution (P12 — requires prod access; ties to DR runbook)

---
**Suggested cadence:** Wave 0 tonight (~20 min). Wave 1 next sitting. Waves 2-4 one careful session (DB order matters). Wave 5 starts a 24-48h clock. Waves 6-7 anytime, independent.

### MERGE COLLISIONS (banked 22:20, from W1 tenantDb-adoption-tracker 99bf061b) — resolve at Wave 1 fresh-merge
- **crews**: W2 vs W3 both converted. W3 version ALSO fixes a real cross-tenant PATCH bug — PREFER W3 at merge (keeps the security fix). Do NOT auto-merge both.
- **recurring-expenses**: W2 vs W3 both converted. Pick ONE (recommend W3 for consistency with crews). Do NOT auto-merge both.
- (already banked earlier: sidebar-counts W1 vs W3 — prefer wrapper pattern.)
