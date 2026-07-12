# Phased Deploy Runbook — Wave A → D

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-12 · **Status:** docs only, nothing applied,
nothing merged, nothing deployed.
**Scope:** groups `deploy-prep/gated-wave-plan.md`'s 8 execution waves (0-7) into 4 higher-level
deploy phases with go/no-go gates, rollback posture, and pointers to the guard specs each phase
depends on. **This is not a replacement for the wave plan** — that document is the literal,
Jeff-executable checklist (author: leader session-5, `~/flwork-todo/MASTER-TODO-LIST.md`) and stays
the source of truth for exact PR numbers, migration order, and env var names. This doc answers a
different question: *"if I only have time for one sitting, where's the safe stopping point, and what
breaks if I stop between phases instead of at a wave boundary."*

**Predicted by name in `deploy-prep/branch-integration-plan.md` §8**, which flags post-merge deploy
sequencing as "covered by w3's `phased A->B->C->D deploy runbook`" — this is that document, authored
by W6 per the leader's explicit order tonight rather than w3.

---

## 0. Phase-to-wave mapping

| Phase | Gated-wave-plan waves covered | One-line theme |
|---|---|---|
| **A — Pre-flight** | Wave 0 (zero-risk merges) + Wave 1 (re-integrate, rebuild green) | Get a clean, green, re-integrated branch. No prod state touched. |
| **B — Data + secrets** | Wave 2 (DB migrations, strict order) + Wave 3 (env/secrets) | Land the schema and config the code deploy assumes exists. Prod DB writes begin here. |
| **C — Code deploy** | Wave 4 (security bundle deploy) | Ship the app code that depends on B already being live. |
| **D — Flip + close-out** | Wave 5 (resolver flip, 24-48h watch) + Wave 6 (DNS) + Wave 7 (sign/attest) | The irreversible-feeling stuff: the resolver cutover clock, registrar changes, compliance sign-off. |

**Why this grouping and not some other one:** each phase boundary is a point where the *kind* of risk
changes, not just the wave number. A→B crosses from "git operations only" to "prod DDL begins."
B→C crosses from "schema exists" to "code that assumes the schema runs in prod." C→D crosses from
"reversible via redeploy" to "resolver flip starts a 24-48h clock that isn't cleanly abortable
mid-window" (§4 below). Waves 6 and 7 fold into D not because they depend on Wave 5 technically (they
don't — the wave plan's own footer calls Waves 6-7 "anytime, independent") but because by the time
you're doing DNS/compliance sign-off you're past the point where stopping and reassessing costs
anything; they're bundled here as "the low-coordination tail," not a hard dependency chain.

---

## Phase A — Pre-flight (Wave 0 + Wave 1)

**Goal:** a rebuilt-green branch, re-integrated from all 6 `p1-wN` lanes, with zero prod state
touched. Nothing in this phase requires Jeff beyond merge approval and the one Vercel binding fix.

**Steps (from gated-wave-plan, unchanged):**
1. Wave 0: merge PR #14 (TCPA), PR #15 (selena IDOR), fix nycmaid's Vercel binding.
2. Wave 1: fresh-merge `p1-w4 → p1-w1 → p1-w3 → p1-w2` (order and rationale fully specified in
   `deploy-prep/branch-integration-plan.md` — **do not re-derive the merge order here**, that doc's
   §0/§7 is the authoritative step-by-step, including the `escape-html.ts` superset rule and the
   `integ/wave2-2026-07-11` prior-art branch worth inspecting before re-resolving the w1↔w3 clash).
3. **GATE:** `npm run build` + full `vitest` + `tsc --noEmit` on the re-integrated branch. The wave
   plan is explicit that the old "286/461" number is stale-branch and does not count — this must be a
   fresh run.

**Go/no-go for Phase A → B:** green build + green full test suite on the re-integrated branch,
migration-number collision check clean (`branch-integration-plan.md` §3 — confirmed already: no
collisions, 055→063 sequential). If either fails, **stop here** — nothing in Phase B is safe to start
against a red or unverified branch, since B's migrations assume the code that reads their new columns
is the code that just got merged.

**Rollback posture:** trivially reversible — this phase is git operations on a scratch integration
branch (`branch-integration-plan.md` §7 step 1: "not `main` itself, not any existing `p1-wN`
worktree"). Nothing prod-facing changes; abandon the branch and start over if needed, no cost beyond
time.

**What breaks if you stop mid-phase instead of at the boundary:** nothing — this is the one phase
where a partial stop is free. An unfinished 6-lane merge just isn't deployed yet.

---

## Phase B — Data + secrets (Wave 2 + Wave 3)

**Goal:** every migration and env var the security bundle (Phase C) assumes exists, actually exists in
prod, in the order that avoids the two explicitly flagged DO-NOT-SKIP hazards.

**This is the first phase where prod is touched.** Per this lane's standing rules, everything below is
prepared as files; the leader runs the actual DDL/env changes after Jeff approves. Nothing in this
worktree executes any of it.

**Steps (from gated-wave-plan Wave 2, strict order — reproduced here because the order IS the safety
mechanism, not just a checklist):**
1. `055` routing schema + backfill + verify.
2. `056` enforce (keeps `vercel_project` NULLABLE) + `059` vercel_project backfill (partial — full
   backfill needs a Vercel API token the leader doesn't have yet).
3. **owner_phone backfill — DO-NOT-SKIP #1.** Must run *before* any booking-owner deploy step in
   Phase C, or 19 already-verified tenants lock their owners out. This is a hard ordering dependency
   across the Phase B/C boundary, not just within B — flag this explicitly when planning a single
   sitting that spans both phases.
4. `061` dup-probe FIRST, then the `061` unique index on `journal_entries(tenant_id, source,
   source_id)` — must land *before* the webhook-idempotency code in Phase C's security bundle, or that
   code assumes a constraint that isn't there yet.
5. `062` add `tenant_id` to `inbound_emails` — before the inbound-email scope fix deploy (same
   Phase B→C ordering shape as steps 3-4).
6. `058` flip nycmaid `routing_mode` template→bespoke.
7. `060` lockdown `SECURITY DEFINER` RPCs (`post_journal_entry`, `cpa_token_bump_usage`).
8. **F3 pricing backfill — DO-NOT-SKIP #2.** First run `SELECT DISTINCT industry FROM tenants`, extend
   the PASS C allowlist, add the nycmaid guard to PASS A/B before running.

**Then Wave 3 (env/secrets), no strict ordering *within* this list but must complete before Phase C's
deploy that depends on each one:**
- `TELEGRAM_WEBHOOK_SECRET` in prod, **AND** every existing tenant bot re-registered with the matching
  `secret_token` — skip either half and Phase C's Telegram auth guard fail-closes every bot at once
  (this is `deploy-prep/incident-runbooks.md` §2b's rollout risk, made concrete: this is the exact
  moment that risk becomes live if the rollout order in
  `telegram-tenant-webhook-auth-guard-spec.md` isn't followed).
- Config-SoT reconcile build-gate activation via `SUPABASE_ACCESS_TOKEN_FULLLOOP` Vercel env.
- Seed 2nd voice tenant DID in `tenants.telnyx_phone` — **read `deploy-prep/incident-runbooks.md` §4
  before treating this as a one-line data fix.** That runbook's finding: seeding the column alone does
  not give the second tenant working voice, because `telnyx-voice/route.ts` has no per-tenant call
  routing at all today — it's hardcoded to nycmaid's `TELNYX_VOICE_CONNECTION_ID`. If a second tenant's
  live voice is actually the goal (not just satisfying the wave-plan checklist item), scope a small
  code change for multi-tenant voice routing as a Phase-C-adjacent task, not a Phase-B data seed.

**Go/no-go for Phase B → C:** all 8 migration steps applied and each migration's own `.verify.sql`
passed (`branch-integration-plan.md` §3: "run each migration's own `.verify.sql` after applying"); both
DO-NOT-SKIP items confirmed complete; Telegram secret rollout's re-registration sweep confirmed done
for every tenant with a live `telegram_bot_token` (not just the env var set) before Phase C ships the
auth guard.

**Rollback posture:** materially harder than Phase A. Migrations `055-063` are additive/backfill in
shape (per the wave plan's own framing — `056` explicitly "keeps vercel_project NULLABLE," i.e.
designed not to break existing rows), but this phase is real prod DDL — a bad migration here isn't a
branch to abandon, it's a rollback migration to write and run, same Jeff-gated posture. The DO-NOT-SKIP
items exist specifically because their failure mode isn't "migration errors out," it's "migration
succeeds and silently produces a worse state" (19 tenants locked out; wrong pricing for un-allowlisted
industries) — verify their preconditions before running, not just their post-run success.

**What breaks if you stop mid-phase instead of at the boundary:** stopping between the DB migrations
and the env/secrets half is safe (they're independent within Wave 2 vs Wave 3). Stopping **inside**
the Wave 2 migration sequence — e.g., after `061`'s dup-probe but before the unique index, or after
the owner_phone backfill but before verifying it — is not: re-read the specific DO-NOT-SKIP note for
whichever step you stopped on before resuming, don't assume "I did most of Wave 2" is equivalent to
"Wave 2 is in a safe intermediate state."

---

## Phase C — Code deploy (Wave 4)

**Goal:** ship the security bundle, now that Phase B's schema and secrets exist for it to depend on.

**Steps (from gated-wave-plan Wave 4):**
1. Deploy the security bundle: booking IDOR fix, voice webhook signature verify (closes
   `deploy-prep/webhook-auth-throttle-guard-spec.md` Finding 1 — the presence-only, fail-open
   `telnyx-voice` check flagged in `deploy-prep/incident-runbooks.md` §4 root cause #3), Telegram auth
   guard (`telegram-tenant-webhook-auth-guard-spec.md`, `webhook-auth-throttle-guard-spec.md`), portal
   OTP/PIN throttle, yinez fix, inbound-email scope fix, ledger TOCTOU fix.
2. Confirm the deploy killed the live fabricated `AggregateRating` on the flagged sites (19/22 —
   Google manual-action risk per the wave plan; this is a content/schema fix, not a webhook guard, but
   ships in the same bundle).

**Hard precondition, restated because it's the single easiest thing to get wrong across this whole
runbook:** every item in this bundle that has a Phase B dependency (owner_phone backfill, the `061`
unique index, the `062` `inbound_emails` tenant_id column, the Telegram secret rollout) must have
**already landed and verified**, not just "be in the same sitting." If Phase B and C happen in the same
session, re-run Phase B's go/no-go checklist immediately before starting Phase C — don't rely on
memory that "I did that migration earlier today."

**Go/no-go for Phase C → D:** deploy is live, smoke-tested against the specific guards it ships (a
forged Telegram request → 401; a forged Telnyx voice signature → rejected, not accepted; the
`AggregateRating` schema confirmed gone from the 19/22 flagged sites). This is also the point to
re-verify `deploy-prep/incident-runbooks.md` §1-4's failure modes are actually closed, not just
deployed — a clean deploy log doesn't prove a guard fires correctly under a forged request, only that
the code compiled and started.

**Rollback posture:** a standard Vercel redeploy/rollback to the prior production deployment — this is
the easiest phase to reverse of the three that touch prod, *provided* Phase B's schema changes are
backward-compatible with the pre-bundle code (true for the additive migrations in this set; re-verify
per-migration if the actual applied set differs from what's listed here by the time this runs).

**What breaks if you stop mid-phase instead of at the boundary:** this bundle is described as one
deploy, not a sequence of independent sub-deploys — the wave plan doesn't offer a partial-bundle order,
and several of its pieces are the Phase-B-dependent items above. Treat Phase C as atomic: don't ship
half the bundle and call it a stopping point without re-checking which half depends on which Phase-B
migration.

---

## Phase D — Flip + close-out (Wave 5 + Wave 6 + Wave 7)

**Goal:** complete the tenant-domains cutover, fix the DNS-dark domains, and close the compliance
sign-off items. This phase contains the one genuinely time-boxed, non-abortable-mid-window step in the
entire plan.

### D1. The resolver flip (Wave 5) — read this before starting, not during

1. Deploy `[deploy]` with the `TENANT_DIVERGENCE` assert-and-refuse guard live (commit `8e2c805`,
   already merged per the wave plan's phrasing — confirm it's actually in the branch being deployed,
   don't assume). **Wire a prod log alert on it before starting the watch window, not after** — per
   `deploy-prep/incident-runbooks.md` §5, no alert exists today; grep-only detection is the current
   state, and this is the single highest-leverage prevention gap flagged anywhere in this session's
   docs given the watch window is specifically when this guard is expected to fire.
2. **Watch 24-48h.** Run the smoke test: `SMOKE_RUN=1 npx vitest run
   src/lib/tenant-resolver-flip.smoke.test.ts`. During this window, treat any `TENANT_DIVERGENCE` log
   line per `incident-runbooks.md` §5's response steps — it is the guard working as designed, not a
   regression to panic about, but it does mean a specific host is fully down until its underlying
   `tenant_domains`/`tenants.domain` data conflict is corrected.
3. **THEN, only after the watch window clears clean:** run `057_unfreeze` and drop the
   `tenants.domain` fallback.
4. **Re-probe all 22 live domains post-deploy** — the wave plan is explicit that "pre-merge green does
   NOT carry forward." Use the same `/api/health`-first probe method as
   `deploy-prep/incident-runbooks.md` §1, not just a homepage curl.

**Why this sub-step is the phase boundary that matters most:** unlike Phases A-C, this isn't
"deploy, verify, move on" — it's "deploy, then wait through a fixed clock during which the system is
expected to occasionally refuse traffic by design." Starting this without the alert from step 1 means
spending the entire 24-48h window with the same manual-grep-only detection `incident-runbooks.md` §5
already flags as the concrete gap — do not start the clock without at least a manual log-tail plan in
place, even if the real fix (a wired alert) isn't ready.

### D2. DNS (Wave 6) — Jeff/registrar only, leader never touches DNS

- `toll-trucks-near-me` — repoint NS to Vercel (currently GoDaddy → cancelled SiteGround zone =
  SERVFAIL, site fully dark).
- `fladumpsterrentals.com` — nameservers unreachable, repoint.
- `wash-and-fold-hoboken` — confirm live domain + fix canonical.

No code or DB dependency on D1 — can run in parallel with the watch window, per the wave plan's own
"independent" framing. Bundled into Phase D here because it's low-coordination tail work best batched
with sign-off, not because it's gated on the resolver flip.

### D3. Sign / attest (Wave 7) — no build, ~30-60 min total

- PCI SAQ-A self-attestation (Stripe).
- Sign DPAs with sub-processors (Stripe, Telnyx, Supabase, Resend, Anthropic/xAI, Vercel).
- Backup restore drill execution — **this is P12, and the full step-by-step procedure, pre-requisites,
  and RTO/RPO targets are already written up in `deploy-prep/dr-drill-plan.md`.** Do not re-derive the
  drill procedure here; that document is PLAN ONLY (nothing executed) and is the thing Jeff/leader
  actually runs for this checklist item.

**Go/no-go — there is no further phase, so this is the overall plan's exit criteria:** all 22 domains
re-probed clean post-flip, DNS repointed on the 3 dark domains, sign-off items complete. At this point
`deploy-prep/credential-rotation-policy.md`'s routine cadence (§2) becomes the relevant ongoing
document, not this runbook — deploy is done, operations begin.

**Rollback posture:** D2/D3 are trivially safe (DNS and paperwork, no app-state risk). D1 is the outlier
— once `057_unfreeze` runs and the `tenants.domain` fallback is dropped, reverting means re-adding the
fallback and re-freezing, not a simple redeploy. This is the one true point-of-no-return in the entire
4-phase plan; treat the "THEN, only after..." gate in D1 step 3 as the real decision point, not a
formality.

---

## Summary table

| Phase | Prod touched? | Reversible how | Hard cross-phase dependency |
|---|---|---|---|
| A — Pre-flight | No | Abandon branch | None |
| B — Data + secrets | Yes — DDL + env | Rollback migration (Jeff-gated) | Must complete before C ships dependent code |
| C — Code deploy | Yes — app code | Vercel redeploy to prior version | Requires B's migrations/secrets already live |
| D — Flip + close-out | Yes — resolver cutover, DNS, legal | D1 only: re-freeze + re-add fallback (costly); D2/D3 trivial | D1's watch window should not start without a `TENANT_DIVERGENCE` alert wired first |

## Cross-references

- `deploy-prep/gated-wave-plan.md` — the authoritative literal checklist this doc groups into phases.
  Read it for exact PR links, table names, and env var names; this doc is the sequencing/risk view on
  top of it, not a substitute.
- `deploy-prep/branch-integration-plan.md` — Phase A's merge mechanics in full.
- `deploy-prep/incident-runbooks.md` — what each Phase C/D guard is defending against, and how to
  respond if it fires during or after this deploy.
- `deploy-prep/prospect-to-live-runbook.md` — unaffected by this deploy sequence directly, but §7's
  go-live gate assumes the Phase C security bundle (booking IDOR, portal throttle) is already live;
  don't onboard new tenants mid-Phase-C if avoidable.
- `deploy-prep/dr-drill-plan.md` — the D3 backup-drill procedure.
- `deploy-prep/health-monitor-coverage-gap.md`, `deploy-prep/credential-rotation-policy.md` — ongoing
  operational documents that pick up where this deploy runbook's exit criteria leave off.
