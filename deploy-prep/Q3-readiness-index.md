# Q3 Deploy Readiness Index

**Author:** W1 (schema + backfill lane) · **Date:** 2026-07-12 · **Status:** FILE ONLY — an ordered rollup/index. **Nothing here was pushed, deployed, or run against any DB.** One walkable checklist for the gated Q3 sequence.

**Source of truth:** [`BATCH-REVIEW-MANIFEST.md`](../../BATCH-REVIEW-MANIFEST.md) (waves, DB-write order, gates). This index does not invent sequencing — it consolidates the manifest + the `deploy-prep/` docs into a per-wave READY / MISSING / JEFF-GATED view. Where the two disagree, the manifest wins and it's flagged.

> **⚠️ Verification scope (honesty).** W1 works in the **`p1-w1` worktree** and can
> only file-verify artifacts that exist here. Artifacts on `p1-w2` / `p1-w3` /
> `p1-w4` (the resolver flip, the security bundle, migrations 058 / 061-journal /
> 062, the owner_phone backfill, the smoke suite) are listed from the manifest and
> marked **⧉ cross-branch (unverified here)** — their existence/contents were NOT
> confirmed by W1. Confirm those against their own branches before relying on this
> row.

**Legend:** ✅ READY (file-verified in this worktree) · ⧉ cross-branch (per manifest, not verifiable here) · ⚠️ MISSING / open · 🔒 JEFF-GATED (needs Jeff to run).

---

## The three gates (only these need Jeff)

Everything below is prepared as files. Nothing crosses these lines without Jeff:

1. 🔒 **Prod DB writes** beyond the already-applied P1 migration
2. 🔒 **git push to main**
3. 🔒 **deploy to prod**

---

## Pre-wave: prod DB writes — run in THIS order (manifest §A)

DB writes precede the deploys that depend on them. Order and prereqs are the manifest's; the READY/⧉ marks are W1's file check.

| # | Migration | Owner | In this worktree? | Rollback doc | Notes |
|---|---|---|---|---|---|
| 1 | `058_fix_nycmaid_routing.sql` | p1-w2 | ⧉ not here | — | Flips nycmaid routing template→bespoke. Idempotent, low risk. |
| 2 | `060_lockdown_secdef_rpcs.sql` | p1-w1 | ✅ present | `rollback-note-per-migration.md` §060 | REVOKE EXECUTE + pin search_path. Defense-in-depth, safe. |
| 3 | `061_unique_journal_entries.sql` | p1-w2 | ⧉ not here | — | Partial UNIQUE on journal_entries. **⚠️ run the dup-detection probe in the file header FIRST** or it errors. **Number collides with W1's `061_nycmaid_routing_reconcile.sql`** — see §Collisions. |
| 4 | `059_backfill_vercel_project.sql` | p1-w1 | ✅ present | `rollback-note-per-migration.md` §059 | Sets vercel_project where determinable; unknowns NULL. Safe. Full backfill deferred (needs Vercel token). |
| 5 | **owner_phone backfill** (DATA) | p1-w1 | ✅ **present** | `rollback-note-per-migration.md` (owner_phone) | `platform/migrations/2026_07_11_owner_phone_backfill.sql` + fail-loud `.verify.sql`. Fills only NULL/blank rows from 3 derived sources. **⚠️ MUST run BEFORE the booking-owner fix deploy** (Wave C `017043f`); the verify gate blocks the deploy if any *active* tenant is still NULL. Remaining risk = the **blocking-list residual** (owners with no phone in any source). **⚠️ Earlier index rows claimed this file "does not exist" — that was wrong; see [`owner-phone-backfill-premise-correction.md`](./owner-phone-backfill-premise-correction.md).** |
| 6 | `062_add_tenant_id_inbound_emails.sql` | p1-w3 | ⧉ not here | — | Additive/idempotent ADD COLUMN + backfill note. **⚠️ run BEFORE the inbound-email scoping deploy** (Wave C `42b5a39`). |

**W1's own tenant_domains schema chain** (this lane owns it; all ✅ present here, run in order): `055_tenant_domains_routing.sql` → `055_…backfill.sql` → `055_…verify.sql` (read-only gate) → `056_tenant_domains_routing_enforce.sql`. Freeze/thaw around the resolver flip: `057_freeze_tenants_domain.sql` / `057_unfreeze_tenants_domain.sql`. Per-migration reverse SQL: `rollback-note-per-migration.md`.

---

## Wave-by-wave rollup (deploy Phases A → B → C → D)

Ship order A→B→C→D with probes between each; **revert order D→C→B→A** (see `rollback-per-wave.md`). Deploy-first revert: promote the previous Vercel deployment, touch the DB layer only if a migration is implicated.

### Wave A — low-risk / non-behavioral changes first
- **Ships:** non-behavioral changes; establishes the probe baseline before anything behavioral. Gate: green probes before B.
- **Prereq DB writes:** none behavioral (DB writes 1–4 can precede A as they're safe/idempotent).
- **Supporting docs:** ✅ `provisioning-atomicity.md`, ✅ `third-party-dependency-ledger.md`, ✅ `preview-smoke-gate-plan.md` (A4 — catch mis-route *before* promotion).
- **Test coverage:** ✅ lead-capture→CRM→attribution happy path — `platform/src/app/api/lead/lead-capture-attribution.test.ts` (W1, this session; tsc clean · vitest 5/5). ✅ `crews/route.test.ts`, ✅ `gdpr/export/route.test.ts`.
- **⚠️ Missing / open:** the concrete probe list to run between waves (what URLs/asserts define "green") is described in the monitor/smoke docs but not consolidated into a single runnable A-gate checklist.
- **🔒 Gated:** deploy to prod.

### Wave B — resolver flip [THE BIG GATE]
- **Ships:** `tenant_domains`-first resolution + `TENANT_DIVERGENCE` assert-and-refuse (⧉ p1-w2 `52289e6` + `8e2c805` + `ee8943a`). Deploy with `[deploy]`, assert-guard live, watch 24–48h, THEN `057_unfreeze` + drop fallback later.
- **Prereq DB writes:** W1 `055`→`055 backfill`→`055 verify`→`056` must be applied first (routing data must exist before the resolver reads it); `057_freeze` around the cutover.
- **Supporting docs:** ✅ `preview-smoke-gate-plan.md` (A4 — wire the smoke suite to every preview), ✅ `uptime-dns-monitor-spec.md` (A3 — outside-in prod watch), ✅ `tenant-domains-dns-target-spec.md` (expected-DNS-target design), ✅ `rollback-plan.md` (resolver-flip rollback), ✅ `per-tenant-field-verification.md`.
- **Test coverage:** ⧉ resolver-flip smoke suite `tenant-resolver-flip.smoke.test.ts` + fixture + `docs/RESOLVER-FLIP-SMOKE-RUNBOOK.md` — **⧉ NOT in this worktree** (A4 doc references them; they live on the resolver branch). **Verify present before treating A4 as wired.**
- **⚠️ Missing / open:** smoke suite unverifiable from here; the A3 monitor is a spec, not a provisioned service.
- **🔒 Gated:** deploy to prod + the eventual `057_unfreeze` + fallback drop.

### Wave C — auth-behavior security fixes
- **Ships (⧉ cross-branch commits):** owner_phone gating / booking scope `017043f`, portal OTP throttle `63eedce`, yinez header verify `016ee7d`, voice webhook sig `a7614f7`, Selena tool scoping, inbound-email scoping `42b5a39`. Watch auth-related errors; clean → done.
- **Prereq DB writes (ORDER-CRITICAL):**
  - ⚠️ **owner_phone backfill MUST precede `017043f`** (else affected owners lose owner-only **conversational-agent** tooling — the SMS/voice assistant owner gate, NOT the web admin dashboard). **Backfill + fail-loud verify gate are present** (`platform/migrations/2026_07_11_owner_phone_backfill.sql` / `.verify.sql`); the Part-0 verify gate must pass (zero active-tenant NULLs) before deploy. Corrected premise: [`owner-phone-backfill-premise-correction.md`](./owner-phone-backfill-premise-correction.md).
  - ⧉ **`062` MUST precede `42b5a39`** (inbound-email scoping needs the column).
  - ⚠️ voice: any 2nd voice tenant needs its DID seeded in `tenants.telnyx_phone` or calls 404 (admin-ring still nycmaid-global — separate follow-up).
- **Supporting docs:** ✅ `per-tenant-field-verification.md` (owner_phone / per-tenant field presence), ✅ `rollback-per-wave.md` §C.
- **⚠️ Missing / open:** the owner_phone **blocking-list residual** (active tenants with no derivable phone — the verify gate enumerates + fails on these); the 2nd-voice-tenant DID seeding. *(The backfill file itself is present — the earlier "file does not exist" claim was wrong.)*
- **🔒 Gated:** deploy + the owner_phone DB write.

### Wave D (last) — webhook idempotency fix
- **Ships:** webhook idempotency `cba595e` (⧉ p1-w2). **Requires `TELEGRAM_WEBHOOK_SECRET` set + coordinated webhook re-register FIRST**, and DB write `061_unique_journal_entries` applied (with its dup-probe run first).
- **Prereq DB writes:** ⧉ `061_unique_journal_entries` (paired with `ledger.ts` treating 23505 as idempotent success).
- **Supporting docs:** ✅ `rollback-per-wave.md` §D, ✅ `rollback-note-per-migration.md` (journal-entries reversal note if the W1-vs-W2 061 is disambiguated).
- **⚠️ Missing / open:** `TELEGRAM_WEBHOOK_SECRET` provisioning + webhook re-register runbook; the 061 numbering collision must be resolved before this DB write.
- **🔒 Gated:** env-var setup, webhook re-register, deploy, DB write.

---

## After the waves — pushes to main (manifest §C)

🔒 p1-w1, p1-w2, p1-w3, p1-w4 each merge to main. **⚠️ Watch migration-number collisions** (see below). p1-w3 adds a reconcile CI gate (2 orphans allowlisted). Merge-time one-liner for PR#12's payout lane: add `{ idempotencyKey: \`payout_${bookingId}\` }` to `stripe.transfers.create` (belt-and-suspenders; NOT applied on p1-w2 by design).

---

## `deploy-prep/` document inventory (what each covers)

| Doc | Covers | Wave |
|---|---|---|
| `Q3-readiness-index.md` | **this file** — the ordered rollup | all |
| `rollback-plan.md` | release-level rollback (resolver + migrations + security) | B |
| `rollback-per-wave.md` | per-deploy-wave revert (deploy-first) | A–D |
| `rollback-note-per-migration.md` | per-migration reverse SQL (055–062 + backfills) | pre-wave / DB |
| `preview-smoke-gate-plan.md` (A4) | wire resolver-flip smoke to every preview deploy | B |
| `uptime-dns-monitor-spec.md` (A3) | outside-in prod uptime + DNS/TLS/WHOIS watch | B (prod) |
| `tenant-domains-dns-target-spec.md` | expected-DNS-target column design (feeds A3 §3b) | B (prod) |
| `provisioning-atomicity.md` | tenant provisioning atomicity | A |
| `per-tenant-field-verification.md` | per-tenant required-field presence (owner_phone etc.) | C |
| `third-party-dependency-ledger.md` | external dependency ledger | A |
| `gdpr-export-format-spec.md` | GDPR export format (supporting) | — |

---

## ⚠️ Migration-number collisions & staleness flags

- **`061` collision:** this worktree has W1's **`061_nycmaid_routing_reconcile.sql`** (+`.verify`); the manifest §A calls DB-write #3 **`061_unique_journal_entries.sql`** (p1-w2). **Two different `061`s on two branches** — the manifest §C already warns of "058/061 on w2." **Renumber one before merge/apply** or the ledger DB write and the routing-reconcile clash. Not resolvable inside W1's lane alone.
- **owner_phone backfill (§A #5):** the manifest's "file TBD" marker was **stale** — the backfill (`2026_07_11_owner_phone_backfill.sql`) + fail-loud `.verify.sql` are **present in this worktree** (committed `9fccb574`/`4b84eae5`/`e0868d6a`, all before this index was written). The only open item is the **bounded blocking-list residual**, not a missing file. Full correction: [`owner-phone-backfill-premise-correction.md`](./owner-phone-backfill-premise-correction.md).
- **Smoke suite (A4):** `preview-smoke-gate-plan.md` references `tenant-resolver-flip.smoke.test.ts` + fixture + runbook that are **not in this worktree** — confirm they exist on the resolver branch before calling A4 "ready to wire."
- **A3 monitor:** a **spec**, not a provisioned service; standing it up is a leader/Jeff action (no code/workflows created).

---

## One-line status

Waves A–D are **file-ready in the parts W1 can see**; the gating blockers are all
🔒 Jeff actions plus two ⚠️ items W1 flags: the **owner_phone blocking-list
residual** (the backfill + verify gate exist — earlier rows wrongly said the file
was missing; see the correction note — the open part is populating owners with no
derivable phone) and the **061 numbering collision** (Wave D DB write, not closable
inside W1's lane). Everything else is prepared and waiting on a gate.
