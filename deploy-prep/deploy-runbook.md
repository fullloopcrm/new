# PART 0 RELEASE — PHASED DEPLOY RUNBOOK

**Authoritative sequence for the WAVE-2 isolation/auth release.** Reference:
`JEFF-MORNING-QUEUE.md` **Q3** (20:37) — Jeff's decision was **approve, but staged,
not one push**. This file is the phase-by-phase execution of that decision.

> **Docs only.** This runbook does not deploy anything. It is written by an
> autonomous worker (file-only lane). The three gated actions below are executed
> by the LEADER **after Jeff's explicit go**, per the standing rules.

## GATED ACTIONS (Jeff-approval required, each time, individually)
1. **Prod DB write** (migrations, backfills, index/RLS changes beyond what is applied).
2. **`git push` to `main`.**
3. **Deploy to prod** (Vercel — needs `[deploy]` in the merge commit or Vercel auto-cancels).

Everything else in this file (running the read-only probes in `migration-verify.sql`,
authoring files, verifying branches) is non-gated.

## WHY STAGED (Q3 rationale, verbatim intent)
Phased = when something breaks you know **which wave** broke it without a bisect.
Blast radius if wrong is **HIGH** — touches all 22 brands, money paths, and auth.
Order is **A → B → C → D** and must not be reordered: B makes `tenant_domains`
authoritative (config source of truth); C changes auth **behavior** and depends on
the owner_phone backfill; D depends on the Telegram webhook secret existing first.

## ARTIFACT LOCATIONS (be explicit about what exists where)
- **In this worktree (`p1-w3`):** `deploy-prep/migration-verify.sql` (read-only
  PRE/POST probe pack for 060/061/062), `.github/workflows/{ci,tenant-config-reconcile,db-backup}.yml`
  (`tenant-scope.yml` removed 2026-07-17, folded into `ci.yml`),
  `platform/scripts/reconcile-tenant-config.mjs`.
- **On other worker branches (gated-prep, NOT yet on `main`):**
  - `p1-w2` (`ee8943a`): resolver flip + `TENANT_DIVERGENCE` assert-guard + `tenant.ts` reconcile.
  - `platform/docs/RESOLVER-FLIP-SMOKE-RUNBOOK.md` + `tenant-resolver-flip.smoke.test.ts` (Phase B smoke suite).
  - `platform/src/lib/migrations/057_unfreeze_tenants_domain.sql` (Phase B rollback / later unfreeze).
  - `platform/migrations/2026_07_11_owner_phone_backfill.sql` (Phase C prereq).
  - `platform/migrations/2026_07_11_enable_rls_gap_tables.sql` (Phase A; already RUN on prod, needs committing).
  - `058_fix_nycmaid_routing.sql`, `059_backfill_vercel_project.sql` (Phase B prereq — tenant_domains correctness).
- **GATED-PREP, not yet authored as migration files:** `060` (RPC lockdown) and
  `061` (journal dedup unique index). `migration-verify.sql` encodes their intended
  end-state; the DDL itself must be authored + reviewed before Phase A. `062`
  (`platform/src/lib/migrations/062_add_tenant_id_inbound_emails.sql`) exists.

## ALREADY DONE (do not re-run — from LEADER-HANDOFF)
- `055` add + backfill, `056` enforce, `057` freeze on `tenant_domains` — **APPLIED, verified.**
  `routing_mode`/`status`/`vercel_project` populated (21 bespoke / 16 template, 37 rows).
  Write-freeze `trg_freeze_tenants_domain` is **LIVE** (`tenants.domain` writes RAISE).
- Payout unique index `uq_payouts_tenant_booking` — **LIVE** (0 violating rows).
- RLS enabled on 15 previously-OFF tables — **RUN on prod**, migration file needs committing.

---

# PHASE A — LOW-RISK, NON-BEHAVIORAL

**Goal:** land the defense-in-depth DB changes and activate the CI/reconcile gates.
None of these change what a request returns to a user; they revoke unused privilege,
add a dedup constraint, add a nullable scoping column, and turn on drift alarms.

### What deploys
1. **Migration 060 — RPC lockdown.** Revoke `EXECUTE` on the two `SECURITY DEFINER`
   RPCs (`post_journal_entry`, `cpa_token_bump_usage`) from `anon`/`authenticated`/`PUBLIC`;
   keep `service_role` (the app calls them via `supabaseAdmin`).
2. **Migration 061 — journal dedup unique index.** Partial `UNIQUE (tenant_id, source,
   source_id) WHERE source_id IS NOT NULL` on `journal_entries` (matches
   `ledger.ts journalEntryExists()`).
3. **Migration 062 — `inbound_emails.tenant_id`.** Add nullable `uuid` FK → `tenants(id)`
   + leading index. Idempotent (`ADD COLUMN IF NOT EXISTS`).
4. **Commit the already-applied RLS enable migration** (`2026_07_11_enable_rls_gap_tables.sql`)
   so `main` matches prod. No new prod write — file catch-up only.
5. **Activate the reconcile gate** — set Vercel build env `SUPABASE_ACCESS_TOKEN_FULLLOOP`
   so `tenant-config-reconcile.yml` runs against live config on every push/PR. Until set,
   the script token-guards and exits 0 (passes without checking).

> **Data-prep that MAY run in this window but GATES a LATER deploy (not Phase A behavior):**
> - `owner_phone` backfill (`2026_07_11_owner_phone_backfill.sql`) — **prereq for Phase C.**
> - Pricing backfill — **prereq:** extend pricing PASS C allowlist + add nycmaid guard
>   FIRST, or flagship checkout math changes (Q3 DO-NOT-SKIP #3).
> These are prod DB writes → Jeff-gated. Running the data early is safe; the behavior
> flip that reads it is Phase B/C.

### Prereqs
- `060`/`061` DDL authored + reviewed (currently gated-prep — only the probes exist).
- A DB backup / point-in-time restore confirmed available (see `db-backup.yml`).
- For each migration: run its **PRE** block from `migration-verify.sql` first.
  **061's dup-probe is mandatory and must return ZERO rows** — `CREATE UNIQUE INDEX`
  fails the whole statement on any pre-existing duplicate group.

### Run order (per migration)
```
060.PRE  → apply 060 → 060.POST
061.PRE (dup-probe FIRST) → apply 061 → 061.POST
062.PRE  → apply 062 → 062.POST → run documented inbound_emails backfill → re-check 062.POST unscoped count
```

### Probe to run after
`deploy-prep/migration-verify.sql` POST blocks (safe against prod — every statement is
SELECT or a RAISE-only DO block):
- **060.POST:** `anon`+`authenticated` (and `PUBLIC`) denied EXECUTE; `service_role` retains it.
- **061.POST:** a UNIQUE index over `{tenant_id, source, source_id}` exists.
- **062.POST:** `inbound_emails.tenant_id` is `uuid` + FK→`tenants(id)` + indexed.
- CI: after the RLS-migration commit + reconcile-secret set, confirm `ci.yml`,
  `tenant-config-reconcile.yml` are **green** on the push. (`tenant-scope.yml`
  was removed 2026-07-17 — it duplicated ci.yml's own "Tenant-isolation guard"
  step; that check now lives only in `ci.yml`.)

### Go / No-Go
- **GO to Phase B** when: all three POST blocks emit their `... POST OK` NOTICE (no
  EXCEPTION), reconcile job is green with the secret live, and CI is green on `main`.
- **NO-GO / STOP:** any POST block RAISEs EXCEPTION; **061.PRE dup-probe returns any
  row** (resolve the rows before applying 061); `service_role` lost EXECUTE on either
  RPC (re-grant immediately — ledger writes are broken); reconcile job reports **CRIT**
  drift.

---

# PHASE B — RESOLVER FLIP (config source of truth) + ASSERT-GUARD + 24–48h WATCH

**Goal:** make `tenant_domains` authoritative for tenant resolution. This is the #1
priority (config-source-of-truth) — app-layer tenant filtering is only trustworthy once
the resolved tenant-id is unambiguous. This is a **behavioral** change to routing, so it
ships alone and is watched before Phase C.

### What deploys
- Merge `p1-w2` (`ee8943a`) → `main` **with `[deploy]`**. It rewrites `getTenantByDomain`
  to read `tenant_domains` **first**, with a `tenants.domain` **fallback**, guarded by a
  `TENANT_DIVERGENCE` **assert-and-refuse**: if the two sources disagree for a domain, the
  resolver refuses rather than silently serving the wrong tenant (the July-8 outage class).
  Second resolver in `tenant.ts` reconciled to match.

### Prereqs
- **Phase A complete and green.**
- `tenant_domains` **correct before it becomes authoritative:** run `058_fix_nycmaid_routing.sql`
  (nycmaid landed `routing_mode=template` due to slug `the-nyc-maid` vs `nycmaid`) and
  `059_backfill_vercel_project.sql`. A wrong `routing_mode`/`vercel_project` row becomes a
  live mis-route the instant the flip lands.
- Pre-flip divergence probe clean (LEADER-HANDOFF recorded c1=0, c2=0, c3=0, c4=15 benign
  aliases → flip is a no-op on current data). Re-run immediately before merge to confirm
  still clean.

### Probe to run after
- **Post-deploy smoke suite:** `platform/docs/RESOLVER-FLIP-SMOKE-RUNBOOK.md` +
  `tenant-resolver-flip.smoke.test.ts` — proves the flip resolves known domains to the
  right tenant and the divergence-guard fires on a forced mismatch.
- **Live spot check:** 2–3 bespoke + 2–3 template domains each return HTTP 200 and render
  their **own** tenant's site (not the generic template).
- **Divergence watch (24–48h):** monitor logs/alerts for any `TENANT_DIVERGENCE` refusal.
  With the assert-guard live, a divergence surfaces as an explicit refusal, not a silent
  wrong-tenant render.

### Go / No-Go
- **GO to Phase C** when: smoke suite passes, spot-checked domains render correctly, and
  **24–48h elapse with ZERO `TENANT_DIVERGENCE` events** and no routing regressions.
- **NO-GO / ROLLBACK:** any domain renders the wrong tenant, or `TENANT_DIVERGENCE` fires
  in prod. Rollback = revert the resolver deploy (fallback path already prefers
  `tenants.domain`, so reverting the merge restores prior behavior). The write-freeze stays
  live. **Do NOT run `057_unfreeze` or drop the fallback until the watch window is clean** —
  those are a later, separate step after B is proven stable.

---

# PHASE C — AUTH-BEHAVIOR

**Goal:** ship the changes that alter authentication/authorization behavior. Grouped and
deployed together, **after** the owner_phone backfill, because these can lock users out or
change who can act if their data prereqs aren't in place.

### What deploys
1. **`owner_phone` gating** — booking-owner / owner-action gating that reads `tenant.owner_phone`.
2. **Portal OTP fix** — `portal/auth` `verify_code` path (`src/app/api/portal/auth/route.ts`)
   now **filters** the stored code by `tenant_id`, closing the cross-tenant match on a
   phone+code collision (the one real MED from the 47-flag triage).
3. **Yinez** — public Yinez agent chat endpoint auth/scoping (`/api/yinez`, `askYinez` path)
   confirmed tenant-scoped.
4. **Voice signature hardening** — `telnyx-voice` webhook (`src/app/api/webhooks/telnyx-voice/route.ts`).
   Today it checks signature-header **presence** + a 5-min timestamp freshness window but does
   not fully verify the ed25519 signature against the body the way the SMS webhook does
   (`verifyTelnyx`). Phase C brings it to full verification.
5. **Selena scoping** — per-tenant `selena_config` / persona scoping (`tenant-profile.ts`,
   `selena/agent`) confirmed reads only the request tenant's config.

### Prereqs
- **Phase B proven stable** (24–48h watch clean).
- **`owner_phone` backfill APPLIED FIRST** (Q3 DO-NOT-SKIP #1) — **19 tenants have NULL
  `owner_phone` (verified).** Deploying owner_phone gating before the backfill **locks those
  19 tenants' owners out.** Confirm 0 NULL `owner_phone` (for gated tenants) before deploy.
- Regression test for the portal/auth tenant-scope fix in the suite and green.

### Probe to run after
- **Self-attack suite green** (this lane owns it):
  `npx vitest run src/lib/cross-tenant-attack.test.ts src/lib/cross-tenant-db.test.ts
  src/lib/cross-tenant-resolver.test.ts src/lib/tenant-header-sig.test.ts` — 114 tests,
  all cross-tenant attempts REJECTED.
- **Owner login smoke:** an owner from a previously-NULL (now backfilled) tenant can perform
  a gated owner action; a foreign owner cannot.
- **Portal OTP:** a valid code for tenant A does **not** authenticate against tenant B on a
  phone+code collision (403/appropriate rejection).
- **Voice webhook:** an unsigned / bad-signature POST to `telnyx-voice` is rejected 401; a
  valid signed call-control event still drives the flow.
- **Selena/Yinez:** agent responses for tenant A never surface tenant B config/persona.

### Go / No-Go
- **GO to Phase D** when: self-attack suite is 114/114 green post-deploy, owner login works
  for backfilled tenants, portal OTP cross-tenant is rejected, voice webhook rejects bad
  signatures, and no auth regressions in logs.
- **NO-GO / ROLLBACK:** any owner locked out, any cross-tenant auth success, or the
  self-attack suite goes red. Rollback = revert the Phase C deploy; owner_phone backfill data
  is harmless to leave in place.

---

# PHASE D — WEBHOOK IDEMPOTENCY

**Goal:** make webhook handlers idempotent so a replayed/duplicate delivery cannot
double-process (double SMS, double booking, double ledger entry). Deployed last because it
depends on the Telegram webhook secret being set + re-registered first.

### What deploys
- Idempotency keys on the webhook handlers (dedup on provider event id — e.g. Telnyx
  `payload.id`, Telegram `update_id` — so a redelivery is a no-op).
- Any Telegram handler change that assumes the `X-Telegram-Bot-Api-Secret-Token` header is
  present and verified.

### Prereqs
- **Phase C deployed and stable.**
- **`TELEGRAM_WEBHOOK_SECRET` set AND the webhook re-registered with Telegram FIRST**
  (Q3 DO-NOT-SKIP #2). If the handler starts requiring the secret header before the webhook
  is re-registered with that secret, **all bots go dark.** Env-var change + third-party
  re-registration are both gated.
- A durable dedup store confirmed (table/column the idempotency key writes to) so the check
  survives across serverless invocations.

### Probe to run after
- **Replay test:** POST the same provider event twice; the second is acknowledged but does
  **not** re-run side effects (no second SMS/booking/ledger row). Verify with the `061`
  journal dedup index still holding (no new duplicate `(tenant_id, source, source_id)` rows).
- **Telegram liveness:** send a real message through each tenant bot path and confirm a
  response — proves the secret + re-registration are correct and bots are **not** dark.
- **Signature/secret rejection:** a Telegram POST without the correct secret token is rejected.

### Go / No-Go
- **DONE** when: duplicate deliveries are no-ops, all tenant bots respond (not dark), and
  bad-secret POSTs are rejected.
- **NO-GO / ROLLBACK:** any bot goes dark (secret/registration mismatch — fix registration
  or revert the secret requirement immediately), or a replay double-processes. Rollback =
  revert the Phase D deploy; leave the Telegram secret set (harmless) but ensure the handler
  no longer hard-requires it if reverting.

---

# ROLLBACK QUICK-REFERENCE

| Phase | Change | Rollback |
|-------|--------|----------|
| A | 060 RPC lockdown | Re-`GRANT EXECUTE` to prior grantees (keep `service_role`) |
| A | 061 dedup index | `DROP INDEX CONCURRENTLY IF EXISTS <index>` |
| A | 062 tenant_id col | Leave column (nullable, idempotent add) — no rollback needed |
| A | RLS enable | Per-table `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` (defense-in-depth only; app is service-role) |
| B | Resolver flip | Revert the merge/deploy; fallback prefers `tenants.domain`; freeze stays live; do NOT unfreeze |
| C | Auth-behavior | Revert the deploy; owner_phone backfill data safe to leave |
| D | Webhook idempotency | Revert the deploy; leave Telegram secret set; drop hard secret requirement if reverting |

# POST-B LATER STEP (out of the A→D critical path)
Once Phase B has run clean for 24–48h: run `057_unfreeze_tenants_domain.sql` to lift the
`tenants.domain` write-freeze, then drop the `tenants.domain` fallback from the resolver so
`tenant_domains` is the sole source. This is deliberately **after** the watch window — it is
not part of the initial staged release.
