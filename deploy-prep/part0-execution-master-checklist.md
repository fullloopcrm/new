# PART 0 — EXECUTION MASTER CHECKLIST

_Author: worker **W5**, branch `p1-w5`, 2026-07-12. **Index only — W5 ran no DDL/DML, no push, no deploy, no DNS, no env change.** Every gated action below is executed by the LEADER after Jeff's explicit go, per the gate on that line._

## What this is

The single ordered list of **every file-only prep artifact authored across all lanes this
sprint**, so Q3 (the execution round) is a checklist to work down — not improvisation.
Each entry carries: **file path**, **the Jeff-gate it needs**, and **where it sits in the
dependency order**.

This document **does not duplicate** the detailed runbooks — it **links** them. The three
authoritative runbooks remain the source of truth for the *how*; this is the *what, in what
order, gated by what*:

- **`BATCH-REVIEW-MANIFEST.md`** (repo root, base `security/xss-theme-css-2026-07-10`) — LEADER's review handoff; already contains "THE THREE GATES" and an ordered prod-DB-writes section (§A). This checklist extends it with the artifacts authored **after** it was assembled (RLS trilogy, webhook lane, leak register — all 2026-07-12).
- **`deploy-prep/deploy-runbook.md`** (branch `integ/wave2`) — the phased A→D deploy procedure + probes.
- **`deploy-prep/stage0-integration-runbook.md`** (branch `p1-w3`) — the exact branch-merge procedure that produces the `integ/wave2` staging branch.

### How to read this file honestly

- Paths were verified to **exist on disk** during a worktree survey on 2026-07-12. They are
  **repo-relative**; the "Lives on" column names the branch/worktree that currently holds
  each file, because **none of these are merged to `main` yet**.
- **Applied-state is NOT live-verified here.** Some P1 migrations may already be applied to
  prod (BATCH-REVIEW-MANIFEST says "prod DB writes *beyond the already-applied P1 migration*").
  W5 has no prod DB access and ran no live check. **Before running any prod-DB step, run its
  paired `*.verify.sql` / audit against live to confirm applied-vs-pending.**

---

## Gate legend

| Gate | Meaning | Who runs it |
|------|---------|-------------|
| **prod-DB** | DDL/DML against the production database | LEADER, after Jeff approves that specific step |
| **push-main** | `git push` to `main` | LEADER, after Jeff go |
| **deploy** | deploy to prod (Vercel) | LEADER, after Jeff go |
| **env** | set an environment variable / secret in Vercel | LEADER, after Jeff go |
| **DNS** | registrar / DNS record change | LEADER (or Jeff), after Jeff go |
| **none** | read-only analysis; informs a gated fix but is itself ungated | anyone |

---

## ⚠️ BLOCKERS — resolve before the push-main gate

These are file-level integration hazards found during the survey. They are **not** gated
actions; they are cleanups that must happen on the integration branch **before** `main`.

1. **Migration 061 numbering collision.** Two *different* migrations both numbered `061`
   exist across lanes:
   - `platform/src/lib/migrations/061_unique_journal_entries.sql` — on `integ/wave2`
   - `platform/src/lib/migrations/061_nycmaid_routing_reconcile.sql` (+`.verify.sql`) — on `p1-w1`

   These are unrelated changes sharing a number. Whichever lane merges second must be
   **renumbered** (e.g. nycmaid-routing-reconcile → `063_*`) before consolidation, or the
   migration runner order becomes ambiguous. **Decide the canonical numbering before push-main.**

2. **owner_phone `.verify.sql` asymmetry.** `2026_07_11_owner_phone_backfill.sql` is present
   on `integ/wave2`, but the paired `.verify.sql` currently only exists on `p1-w1`. Make sure
   the verify file rides along into the integration branch so the backfill can be checked.

3. **Two migration directories.** Routing/RLS/ledger migrations live under
   `platform/src/lib/migrations/`; the owner_phone backfill lives under `platform/migrations/`.
   Confirm the runner picks up both (or relocate owner_phone) — otherwise it silently won't run.

---

## The dependency order (top → bottom)

```
[BLOCKERS resolved]  →  push-main  →  prod-DB (schema/routing)  →  prod-DB (data backfills)
        →  env (webhook secrets)  →  deploy (phased A→D)  →  DNS  →  prod-DB (RLS trilogy)
        →  post-deploy probes
```

RLS is deliberately **last** among DB work: it scopes rows, and its Stage-1 precondition
(no NULL `tenant_id`) can only be trusted once the routing/tenant-id-backfill migrations
above it have settled. See `deploy-prep/rls-enablement-rollout-plan.md` for the internal
Stage 0→3 gating; this checklist treats that plan as one sequenced sub-runbook.

---

## PHASE 1 — Code onto `main`

| # | Artifact | Path | Lives on | Gate | Notes |
|---|----------|------|----------|------|-------|
| 1.1 | Stage-0 integration procedure | `deploy-prep/stage0-integration-runbook.md` | `p1-w3` | none | Produces the `integ/wave2` staging branch by merging p1-w1…w4 on the security base. Run locally first. |
| 1.2 | All P1 lane code merged → `integ/wave2` | (branch) | `integ/wave2` | **push-main** | Gated. Precondition: BLOCKERS §1–3 resolved; tsc/build/vitest green (BATCH-REVIEW-MANIFEST records the integration as green at assembly time — **re-verify at push time**). |

---

## PHASE 2 — prod-DB: schema & routing migrations

Run **in this order**. Each has a paired `.verify.sql` where noted — run verify against live
**first** to confirm pending-vs-applied. Cross-ref: BATCH-REVIEW-MANIFEST §A, and
`deploy-prep/migration-verify.sql` (branch `integ/wave2`) which bundles verification queries.

| # | Migration | Path (`platform/src/lib/migrations/`) | Lives on | Gate | Notes |
|---|-----------|----------------------------------------|----------|------|-------|
| 2.1 | tenant_domains routing — schema | `055_tenant_domains_routing.sql` | `integ/wave2`, `p1-w1` | **prod-DB** | Foundation for the resolver flip. Paired: `055_..._routing.backfill.sql` + `055_..._routing.verify.sql`. |
| 2.2 | tenant_domains routing — backfill | `055_tenant_domains_routing.backfill.sql` | `integ/wave2`, `p1-w1` | **prod-DB** | Run after 2.1. Verify with `.verify.sql`. |
| 2.3 | tenant_domains routing — enforce | `056_tenant_domains_routing_enforce.sql` | `integ/wave2`, `p1-w1` | **prod-DB** | Constraints; run only after 2.2 backfill is clean. |
| 2.4 | fix nycmaid routing | `058_fix_nycmaid_routing.sql` | `integ/wave2` | **prod-DB** | Flips nycmaid `routing_mode` template→bespoke, keyed on tenant_id from live domains. Idempotent, low risk (BATCH-REVIEW-MANIFEST §A.1). |
| 2.5 | nycmaid routing reconcile | `061_nycmaid_routing_reconcile.sql` | `p1-w1` | **prod-DB** | ⚠️ **061 collision — see BLOCKER §1.** Paired `.verify.sql`. Sequence relative to 2.4 per its header. |
| 2.6 | backfill vercel_project | `059_backfill_vercel_project.sql` | `integ/wave2`, `p1-w1` | **prod-DB** | Sets `vercel_project` where determinable; unknowns NULL. Full backfill deferred (needs Vercel API token). Safe (§A.4). |
| 2.7 | lockdown SECDEF rpcs | `060_lockdown_secdef_rpcs.sql` | `integ/wave2`, `p1-w1` | **prod-DB** | REVOKE EXECUTE on `post_journal_entry` + `cpa_token_bump_usage`, pin search_path. Defense-in-depth, safe (§A.2). |
| 2.8 | unique journal entries | `061_unique_journal_entries.sql` | `integ/wave2` | **prod-DB** | ⚠️ **061 collision — see BLOCKER §1.** Closes ledger TOCTOU. **Run the dup-detection probe in the file header FIRST** or it errors (§A.3). Paired with `ledger.ts` treating 23505 as idempotent success. |
| 2.9 | add tenant_id to inbound_emails | `062_add_tenant_id_inbound_emails.sql` | `integ/wave2` | **prod-DB** | Additive column. Prereq for the RLS trilogy's NULL-backfill on that table (Phase 6). |

---

## PHASE 3 — prod-DB: data backfills (gate the auth/behavior deploys)

| # | Artifact | Path | Lives on | Gate | Notes |
|---|----------|------|----------|------|-------|
| 3.1 | owner_phone backfill | `platform/migrations/2026_07_11_owner_phone_backfill.sql` | `integ/wave2` (verify on `p1-w1`) | **prod-DB** | Populate `tenants.owner_phone` for every non-nycmaid tenant. ⚠️ **MUST run BEFORE the Phase-C booking-owner deploy** or non-nycmaid owners lose admin tooling (fail-closed by design — §A.5). Verify: `2026_07_11_owner_phone_backfill.verify.sql`. Note dir mismatch (BLOCKER §3). |

---

## PHASE 4 — env: webhook secrets (gate the Phase-D webhook deploy)

Source: `deploy-prep/webhook-hardening-plan.md` (branch `p1-w6`). These must be set **before**
the webhook idempotency/signature deploy (Phase 5, wave D), and the Telegram `setWebhook`
re-register must be coordinated with the deploy.

| # | Secret / change | Where | Gate | Notes |
|---|-----------------|-------|------|-------|
| 4.1 | `TELEGRAM_WEBHOOK_SECRET` | Vercel env | **env** | Global telegram route signature gate. |
| 4.2 | `TELEGRAM_JEFE_WEBHOOK_SECRET` | Vercel env | **env** | Jefe route. |
| 4.3 | Per-tenant `telegram_webhook_secret` column | `ALTER TABLE tenants ADD COLUMN telegram_webhook_secret text;` | **prod-DB** | Preferred house pattern for `telegram/[tenant]/route.ts`. Additive, one-line. (Fallback: shared `TELEGRAM_TENANT_WEBHOOK_SECRET` env — weaker.) See webhook-hardening-plan.md "Env/secret deps". |

---

## PHASE 5 — deploy: phased A→D

Do **not** deploy all fixes in one push. Authoritative procedure + per-wave probes:
`deploy-prep/deploy-runbook.md`, `deploy-prep/post-deploy-probes.md`,
rollback: `deploy-prep/rollback-plan.md` (all branch `integ/wave2`). Wave definitions from
BATCH-REVIEW-MANIFEST "DEPLOY STRATEGY":

| Wave | Content | Gate | Preconditions |
|------|---------|------|---------------|
| **A** | low-risk / non-behavioral changes | **deploy** | push-main done (Phase 1). Probe green before B. |
| **B** | resolver flip (assert-guard live) | **deploy** | Phase 2 routing migrations applied. Watch `TENANT_DIVERGENCE` first 30 min. |
| **C** | auth-behavior security fixes (owner_phone gating, portal OTP throttle, header verify, voice webhook sig, Selena tool scoping) | **deploy** | **owner_phone backfill (3.1) applied first.** |
| **D** | webhook idempotency fix | **deploy** | **env secrets (Phase 4) set + Telegram webhook re-registered first.** |

Supporting analysis feeding these waves (ungated, read-only) — see PHASE 7.

---

## PHASE 6 — DNS

| # | Artifact | Path | Lives on | Gate | Notes |
|---|----------|------|----------|------|-------|
| 6.1 | DNS fix checklist | `deploy-prep/dns-fix-checklist.md` | `integ/wave2`, `p1-w3` | **DNS** | Registrar changes for migrated ex-standalone apex domains. Coordinate with deploy so `post-deploy-probes.md` domain checks pass. |

---

## PHASE 7 — prod-DB: RLS trilogy (last DB work)

Authoritative sub-runbook: **`deploy-prep/rls-enablement-rollout-plan.md`** (branch `p1-w5`,
this lane). It sequences Stage 0→3 with its own gates (1a/1b/2). Summarized here for placement
in the master order; **do not re-derive the internal order — follow the plan.**

| # | Stage | Path (`deploy-prep/`) | Lives on | Gate | Notes |
|---|-------|-----------------------|----------|------|-------|
| 7.0 | Coverage audit (input) | `rls-coverage-audit.md` | `p1-w5` | none | 132 tenant_id tables mapped, 58 no-RLS gaps flagged. The map the trilogy acts on. |
| 7.1 | Stage 0 — confirm live state matches map | (queries in rollout plan) | `p1-w5` | none | Read-only. Gate 0 before proceeding. |
| 7.2 | Stage 1 — NULL-tenant_id backfill | `null-tenant-backfill.sql` | `p1-w5` | **prod-DB** | ADR-0005 hard precondition. Audit first: `null-tenant-backfill-audit.md`. Verify: `null-tenant-backfill-verify.sql` (Gate 1a/1b). Depends on 2.9 (tenant_id column on inbound_emails). |
| 7.3 | Stage 2 — enable RLS + tenant policy (inert) | `rls-gap-closure.sql` | `p1-w5` | **prod-DB** | Enables RLS + `tenant_isolation` policy on the 58 no-RLS tenant tables, highest-risk tier first. **Has a precondition guard that aborts the whole run if NULL tenant_ids remain** — so 7.2 must be green. Verify: `rls-gap-closure-verify.sql` (Gate 2). Inert until scoped-client cutover. |
| 7.4 | Stage 3 — scoped-client cutover | — | — | (future) | **OUT OF SCOPE** for this trilogy. This is when RLS actually enforces. Separate future gate. |

---

## PHASE 8 — read-only audits (ungated inputs; they motivate gated fixes)

These author no DB/deploy action themselves. They are the analysis that the Phase-5 waves and
future fixes draw from. Listed so nothing is lost; **gate = none**, but track that each open
finding still needs a gated fix.

| Artifact | Path (`deploy-prep/`) | Lives on | Feeds |
|----------|------------------------|----------|-------|
| Cross-tenant leak register | `cross-tenant-leak-register.md` | `p1-w2` | Prioritized proven-leak fix ordering (Q3 fix queue). |
| Webhook idempotency audit | `webhook-idempotency-audit.md` | `p1-w6` | Phase-5 wave D + `webhook-hardening-plan.md`. |
| Webhook hardening plan | `webhook-hardening-plan.md` | `p1-w6` | Phase 4 (env) + wave D. |
| Webhook dedupe helper design | `webhook-dedupe-helper-design.md` | `p1-w6` | Implementation shape for wave D. |
| Rate-limit coverage audit | `rate-limit-coverage-audit.md` | `p1-w6` | Auth-behavior fixes (wave C) coverage gaps. |
| CSRF coverage audit | `csrf-coverage-audit.md` | `p1-w6` | State-changing endpoints / SameSite posture; GET-mutation flags. |

---

## Supporting artifacts referenced above (not new gates)

On branch `integ/wave2` unless noted — the deploy-runbook and stage0 runbook already fold these in:

- `deploy-prep/migration-verify.sql` — bundled verification queries for the Phase-2/3 migrations.
- `deploy-prep/post-deploy-probes.md` — per-wave probe checks for Phase 5.
- `deploy-prep/rollback-plan.md` — rollback for each deploy wave.
- `deploy-prep/env-var-inventory.md` — full env var inventory (superset of Phase 4).
- `deploy-prep/e2e-tenant-cleanup.sql` — test-tenant cleanup (test-mode; not a prod gate).
- `deploy-prep/tenant-config-authoring-plan.md` — tenant-config authoring plan.
- **slug / tenant-config reconcile** (read-only drift detector): `platform/scripts/reconcile-tenant-config.mjs` + `.github/workflows/tenant-config-reconcile.yml` (`npm run reconcile:tenants`). Detects drift across `tenants.domain` / `tenant_domains` / `BESPOKE_SITE_TENANTS` / site folders. Gate = **none** to run (read-only); the workflow file itself rides in on **push-main**. The distinct *routing* reconcile migration is 2.5 (`061_nycmaid_routing_reconcile`).

---

## One-line summary of the order

**Resolve BLOCKERS → push-main → routing/schema migrations (2.x) → owner_phone backfill (3.1)
→ webhook env+column (4.x) → phased deploy A→D (5) → DNS (6) → RLS trilogy last (7) →
probes.** Audits (8) are ungated inputs. The three runbooks own the *how*; this owns the
*order and the gates*.
