# Rollback Per Deploy Wave (Q3)

**Author:** W1 (schema + backfill lane) · **Date:** 2026-07-12 · **Status:** FILE ONLY — nothing here was run. The **leader** executes against prod after Jeff approves. W1 ran no DB command and no deploy to author this.

**Scope / relationship to the other rollback docs:**
- `rollback-note-per-migration.md` = per-**migration** reverse SQL (055/056/057/059/060, backfills). *That is the SQL layer.*
- `rollback-plan.md` = the ordered Part-0 release rollback (resolver + migrations + security).
- **This file** = per-**deploy-wave** revert. The Q3 release ships in **4 waves (Phase A→B→C→D)** with probes between each. For each wave: what ships, the failure signal, and the **exact first-line revert** — which is usually a **deploy-level** action (Vercel promote-previous / `git revert`), *then* the SQL layer only if a DB change is implicated.

> **Wave source of truth:** `BATCH-REVIEW-MANIFEST.md` §"DEPLOY STRATEGY — phased in 4 waves" and §A/B/C. The staged sequence and per-wave prereqs below are taken from there, not invented.

---

## Golden rule for wave rollback

**Deploy-first, DB-second.** A code/deploy wave is reverted by rolling the
**deployment** back — on Vercel that's **promote the previous production
deployment** (instant, no rebuild), which is faster and safer than a `git revert`
+ rebuild. Touch the DB rollback layer **only** if the wave included a migration
*and* the migration is what broke. Roll back **only the wave that broke** unless a
lower layer is implicated (waves are ordered so each is independently revertible).

Reverse order overall: **D → C → B → A**.

---

## Pre-wave: STAGE 0–1 (re-integrate + merge to main) — before any deploy

Not a deploy wave, but its own revert path, because a bad merge poisons every wave.

- **Ships:** re-integrate WAVE-2 branch heads → rebuild green → merge to `main`.
- **Failure signal:** rebuild not green, or migration-number/package collisions between branches (059/060 on w1, 058/061 on w2).
- **Revert:** nothing is deployed yet — **do not promote.** Reset `main` to the pre-merge SHA (Jeff-gated push) or simply don't deploy. No prod state changed, so revert = "stop here." Fix the integration, rebuild green, re-attempt.
- **Blast radius if skipped:** zero prod impact (pre-deploy).

---

## Wave A — low-risk / non-behavioral changes

- **Ships (Phase A):** the low-risk, non-behavioral code changes deployed first specifically so that if something breaks you know which wave caused it (no bisect). No resolver change, no auth-behavior change.
- **DB coupled to this wave:** the **safe/idempotent** migrations can go here per the DB order — `060_lockdown_secdef_rpcs` (REVOKE, defense-in-depth), `059_backfill_vercel_project` (determinable rows, unknowns NULL). Both low risk. (Note: `058`/`061` referenced in the manifest DB order live on **p1-w2**, not the p1-w1 schema lane — see `rollback-note-per-migration.md` numbering note.)
- **Failure signal:** general 500s / broken pages after the Phase-A deploy, on a build that changed nothing behavioral (so a regression here is likely build/config, not logic).
- **Exact revert:**
  1. **Vercel → promote the previous production deployment** (the pre-Wave-A build). Instant. This alone restores service.
  2. Only if `060`/`059` are implicated (unlikely — both non-behavioral):
     - `060` → restore 039's grants (see `rollback-note-per-migration.md` §060: `GRANT EXECUTE … TO authenticated` + `RESET search_path`).
     - `059` → column-value backfill; a bad value is corrected by re-running the corrected backfill, not by dropping the column.
- **Blast radius:** all brands share the deploy, but changes are non-behavioral, so risk is low. Promote-previous is fully reversible.

---

## Wave B — resolver flip **[THE BIG GATE]**

- **Ships (Phase B):** the `tenant_domains`-first resolver + **TENANT_DIVERGENCE assert-and-refuse** guard live. p1-w2 `52289e6` + `8e2c805` (+ `ee8943a` tenant.ts reconcile). Deployed with the assert-guard live; **watch `TENANT_DIVERGENCE` for the first 30 min (24–48h full watch)**; clean → proceed to C. The `057_unfreeze` + drop-legacy-fallback happen *later*, not in this wave.
- **Failure signal:** a tenant host resolves to the **WRONG tenant** (brand swap), or a domain 404s / serves the template when it should be bespoke, or `TENANT_DIVERGENCE host=… td=… legacy=…` appears in prod logs. Fast check: hit 2–3 known bespoke hosts + run the smoke suite in direct mode (`SMOKE_RUN=1`).
- **Exact revert (deploy-first, this is the critical wave):**
  1. **Vercel → promote the previous production deployment** (the pre-flip build). This immediately restores `tenants.domain`-first resolution — **first-line, do this before anything else.**
  2. If promote-previous is unavailable, `git -C platform revert --no-edit <RESOLVER_FLIP_SHA>` then redeploy (slower — rebuild required).
  3. **DB layer:** because the flip did **not** yet run `057_unfreeze`, the legacy `tenants.domain` write-freeze (`057_freeze`) may still be on. If you need `tenants.domain` writable again after reverting, run `057_unfreeze_tenants_domain.sql` (see per-migration note §a). Do **not** drop `tenant_domains` — "roll back the flip" = restore ordering, not drop the table.
  4. A live `TENANT_DIVERGENCE` is the guard working *correctly* (refusing to brand-swap). Reverting the deploy stops the refusals; then fix the divergent `tenant_domains` row before re-attempting.
- **Blast radius:** **ALL 22 brands** — this is the highest-risk wave (routing for every domain). This is exactly why it's isolated as its own wave with a watch window and why promote-previous is the rehearsed lever.

---

## Wave C — auth-behavior security fixes

- **Ships (Phase C):** owner_phone gating (booking-owner `017043f`), portal OTP throttle, yinez header verify (`016ee7d`), voice webhook sig (`a7614f7`), Selena tool scoping, inbound-email scoping (`42b5a39`). Watch auth-related errors; clean → done.
- **DO-NOT-SKIP prereqs (a broken prereq *is* a Wave-C failure):**
  - **`owner_phone` backfill MUST run BEFORE `017043f` deploys** — else every non-nycmaid owner loses admin tooling (fail-closed by design). 19 tenants affected.
  - **`062_add_tenant_id_inbound_emails` MUST run BEFORE `42b5a39` deploys** — the route sets `tenant_id` on insert.
  - Any 2nd voice tenant must have its DID seeded in `tenants.telnyx_phone` or its calls 404.
- **Failure signal:** legitimate admins/owners locked out (fail-closed gate firing on missing data), portal OTP wrongly throttled, voice/inbound-email 404s.
- **Exact revert:**
  1. **Vercel → promote the previous production deployment** (pre-Wave-C, i.e. post-Wave-B build). Restores the prior auth behavior immediately.
  2. **If the cause is the missing-data prereq, not the code:** the faster fix is often to **complete the backfill** (populate `owner_phone`) rather than revert — the code is correct, the data is missing. Decide per-signal: mass lockout with correct data present → revert the code; lockout because backfill wasn't run → run the backfill.
  3. Migration `062` is additive (`ADD COLUMN IF NOT EXISTS` + index) — reverting the `42b5a39` deploy does **not** require dropping the column; leaving it is harmless.
- **Blast radius:** auth surface across tenants, but each fix is independently revertible via promote-previous. Owner_phone gate is the one with a data prereq that can masquerade as a code failure.

---

## Wave D (last) — webhook idempotency

- **Ships (Phase D):** the webhook idempotency fix (`cba595e`, paired with `061_unique_journal_entries`). **Requires `TELEGRAM_WEBHOOK_SECRET` set + coordinated webhook re-register FIRST**, and `061` applied first (with its dup-detection probe run before adding the unique index).
- **DO-NOT-SKIP prereqs:**
  - `TELEGRAM_WEBHOOK_SECRET` configured **and all bots re-registered** before Phase D — **or bots go dark.**
  - `061` applied first; run the file-header dup-detection probe **before** creating the partial UNIQUE index or it errors on existing dups.
- **Failure signal:** Telegram bots stop responding (secret/re-register mismatch), or ledger writes error with `23505` **not** being treated as idempotent success (`ledger.ts` must swallow 23505 as success).
- **Exact revert:**
  1. **Vercel → promote the previous production deployment** (pre-Wave-D). Restores prior webhook handling.
  2. **Telegram:** if bots went dark from a secret/re-register mismatch, **re-point the webhook registration back to the prior secret/config** — this is a Telegram-side re-register, not a code revert. Reverting the deploy without fixing the registration leaves bots dark.
  3. **DB `061`:** the partial UNIQUE index can be dropped if it's implicated: `DROP INDEX IF EXISTS <journal_entries_unique_idx_name>;` (confirm the exact index name from `061_unique_journal_entries.sql` — it's on `p1-w2`, not this lane). Only drop it if the constraint itself is rejecting legitimate writes; normally 23505 is *handled*, not fatal.
- **Blast radius:** webhook/ledger paths for tenants using them. Last wave by design so a webhook problem can't mask an earlier wave's signal.

---

## One-glance revert matrix

| Wave | First-line revert | Secondary (only if implicated) | Radius |
|---|---|---|---|
| STAGE 0–1 (merge) | Don't deploy / reset `main` | — | none (pre-deploy) |
| **A** low-risk | **Promote previous deploy** | `060` re-grant / `059` re-backfill | all (low risk) |
| **B** resolver flip | **Promote previous deploy** | `git revert <FLIP_SHA>`; `057_unfreeze` if legacy writes needed | **ALL 22 brands** |
| **C** auth fixes | **Promote previous deploy** | run `owner_phone` backfill (data, not code); `062` additive-keep | auth surface |
| **D** webhook idempotency | **Promote previous deploy** | Telegram re-register to prior secret; drop `061` index if rejecting writes | webhook/ledger |

**Reverse-of-release order if unwinding multiple waves: D → C → B → A.**

---

## Honesty / caveats

- Commit SHAs, migration numbers (`058`/`061` on p1-w2 vs `059`/`060` on p1-w1), and the DID/secret prereqs are taken from `BATCH-REVIEW-MANIFEST.md` and the channel handoffs, **not re-verified against a live prod deploy** (W1 has no prod/deploy access, by standing rule). Confirm the exact index name for `061` and the resolver-flip SHA against the branch actually merged before running any DB-layer step.
- "Promote previous deployment" assumes the previous prod deployment is still retained and healthy on Vercel — verify it exists before starting a wave so the lever is real.
- This is the **wave** layer. For the exact reverse SQL of each migration, use `rollback-note-per-migration.md`.
