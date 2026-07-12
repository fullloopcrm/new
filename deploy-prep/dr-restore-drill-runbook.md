# Disaster-Recovery Restore Drill — Runbook

**Author:** W4 (verification-harness lane) · **Branch:** `p1-w4` · **Date:** 2026-07-12
**Status:** runbook · doc-only · **the drill itself is Jeff-gated** — this document
does NOT execute any restore, create any cloud resource, or touch prod.

---

## 0. TL;DR (read this first)

- **Two backup layers exist, and they are NOT equivalent:**
  1. **Supabase managed DB backup** — the code comment says "Supabase already
     does daily DB backups on Pro plan" (`src/app/api/cron/backup/route.ts:3-4`).
     **PITR (point-in-time recovery) is a separate paid add-on and is NOT
     confirmed enabled.** This is the **first thing to verify** — it decides your
     RPO (see §1). If it's daily-snapshot-only, worst-case data loss is **up to
     24 h**, not seconds.
  2. **App-level per-tenant JSON snapshots** — the nightly `/api/cron/backup`
     cron (`vercel.json` `0 5 * * *`) exports **11 tables per active tenant** to
     the `platform-backups` Supabase **Storage** bucket
     (`route.ts:70-79`). This is **partial** (only 11 tables, active tenants
     only) and is **not a full-DB restore path** — it's a granular
     per-tenant export, useful for single-tenant recovery, not for rebuilding
     the whole database.
- **Single-point-of-failure worth stating up front:** the JSON snapshots live in
  the **same Supabase project** they back up (bucket `platform-backups`). If that
  project is lost/corrupted, **the app-level backups go with it.** True DR must
  not depend solely on in-project storage. Flag for Jeff (§5).
- **Project ref:** FullLoop Supabase project `cetnrttgtoajzjacfbhe` (from
  `deploy-prep/env-var-inventory.md:160`). Management API token
  `SUPABASE_ACCESS_TOKEN_FULLLOOP` is in `~/.env.local`.
- **The drill restores to a SCRATCH project — never prod.** Prod is never
  written during a drill.

---

## 1. Pre-drill verification (do this BEFORE scheduling a drill)

These are **dashboard/console facts I cannot read from the repo** — Jeff or the
leader must confirm them first, because they define what the drill is even testing:

| # | Verify | Why it matters | Where |
|---|---|---|---|
| P-1 | **Is PITR enabled** on project `cetnrttgtoajzjacfbhe`? | If yes → RPO ≈ seconds/minutes, restore to any timestamp. If no → only daily snapshots, RPO up to 24 h. | Supabase Dashboard → Database → Backups |
| P-2 | **Backup retention window** (7 / 14 / 28 days?) | Bounds how far back a restore can reach. | Same |
| P-3 | **Plan tier** (Pro / Team / Enterprise) | Gates PITR availability and restore SLAs. | Supabase Dashboard → Billing |
| P-4 | **Is the nightly `/api/cron/backup` actually succeeding?** | It's best-effort per-tenant and only logs to an in-app notification (`route.ts:88-100`); a silently-failing backup cron = no app-level snapshots. Check recent `platform-backups` bucket contents (`backups/<slug>/<date>.json`). | Supabase Storage → `platform-backups` |
| P-5 | **Is `platform-backups` replicated off-project** anywhere? | If not, it's the SPOF in §0. | Supabase Storage config |

**Do not run the drill until P-1–P-4 are answered.** A drill that "passes"
against an assumption (e.g. "PITR is on") when it isn't proves nothing.

---

## 2. Drill scope & targets

- **Restore target:** a **fresh scratch Supabase project** (new ref), created for
  the drill and torn down after. **Never** the prod project.
- **Verification app:** a **preview/scratch deployment** of the platform pointed
  at the scratch project via env override (§3 step 5). Do **not** repoint prod
  env vars.
- **Two drill variants** (run whichever the backup layer supports):
  - **Variant A — Full-DB restore** (requires managed backup/PITR, P-1/P-2):
    restore the entire database to a scratch project at a chosen timestamp.
  - **Variant B — Single-tenant restore** (uses the app-level JSON snapshot):
    take one tenant's `backups/<slug>/<date>.json` and re-import its 11 tables
    into a scratch project. Proves the granular recovery path.

---

## 3. Drill steps (Jeff-gated — DO NOT EXECUTE from this lane)

> Every step below is **blast-radius gated**: creating a Supabase project and
> restoring backups costs money and touches infra. Jeff runs these; W4/leader do
> not. This is the checklist to hand him.

**Variant A — Full-DB restore to scratch:**

1. **Stamp T0.** Record wall-clock start time (this begins the RTO clock, §4).
2. **Create scratch project.** New Supabase project in the same region as prod.
   Record its ref, URL, anon key, service-role key.
3. **Trigger the restore.**
   - PITR path (if P-1 = yes): restore to a chosen recovery point (e.g. "1 hour
     ago"). Record the exact target timestamp — that's your RPO reference.
   - Snapshot path (if P-1 = no): restore the most recent daily snapshot.
   *(Supabase's restore-into-a-new-project mechanism depends on plan; confirm the
   exact console flow during P-3. If cross-project restore isn't offered on the
   tier, the fallback is a `pg_dump` of a restored prod-snapshot branch → `pg_restore`
   into scratch. This is a Jeff/Management-API operation, not scripted here.)*
4. **Stamp T1 = restore-complete.** RTO = T1 − T0.
5. **Point a scratch app at it.** Deploy a preview with:
   - `NEXT_PUBLIC_SUPABASE_URL` = scratch URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = scratch anon key
   - `SUPABASE_SERVICE_ROLE_KEY` = scratch service-role key
   (these three drive both `supabase` and `supabaseAdmin`, `src/lib/supabase.ts:1-11`).
   **Do not** put prod cron/payment secrets on this preview.
6. **Integrity-verify** (§4 checklist).
7. **Compute RPO.** RPO = (last committed prod write time) − (restore target
   timestamp). For daily-snapshot-only, RPO ≈ time since the snapshot ran.
8. **Tear down** the scratch project and preview deployment. Confirm no prod env
   var was altered.

**Variant B — Single-tenant JSON restore to scratch:**

1. Stamp T0.
2. Pull `backups/<slug>/<date>.json` from the `platform-backups` bucket.
3. Into a scratch project (or a scratch schema), insert the 11 tables from the
   snapshot's `data` block (`clients, bookings, team_members, service_types,
   recurring_schedules, reviews, notifications, campaigns, referrals→referrers,
   expenses, payroll_payments` — note the export labels `referrals` data as
   `referrers` in the JSON, `route.ts:63`; preserve the mapping on re-import).
4. Stamp T1. RTO = T1 − T0.
5. Verify row counts and a spot-check record match the snapshot.
6. **Note the coverage gap:** this restores **only those 11 tables**. Any tenant
   data outside them (invoices, payments, quotes, messages, portal data, etc.)
   is **not** in the app-level snapshot and would need the managed DB backup
   (Variant A). State this in the drill report — do not imply Variant B is a full
   tenant restore.

---

## 4. RTO / RPO capture

**Targets (proposed — Jeff sets the real SLOs):**

| Metric | Proposed target | Meaning |
|---|---|---|
| **RTO** (recovery time objective) | ≤ 4 h to a serving scratch restore | how long to get data back |
| **RPO** (recovery point objective) | ≤ 1 h (requires PITR) / ≤ 24 h (daily-only) | max acceptable data loss |

**Capture template (fill during the drill):**

```
Drill date/operator: ____________________
Variant: A (full-DB) / B (single-tenant)
Backup layer used: PITR / daily-snapshot / app-JSON
Prod project ref: cetnrttgtoajzjacfbhe   Scratch ref: __________
T0 (start): __________   T1 (restore complete): __________
RTO = T1 - T0: __________
Restore target timestamp: __________
Estimated last prod write before target: __________
RPO = last-write - target: __________
```

**Integrity checklist (Variant A):**

- [ ] `tenants` row count in scratch ≈ prod (± writes since restore point)
- [ ] A known tenant's `bookings` / `clients` counts match expectation
- [ ] Tenant isolation intact — spot-check that `tenant_id` FKs resolve, no cross-tenant bleed
- [ ] Scratch app boots (no `placeholder.supabase.co` fallback → means env wired, `src/lib/supabase.ts:3`)
- [ ] A read through `getTenantFromHeaders` path returns the expected tenant
- [ ] Storage objects (if in scope) present or explicitly noted as out-of-scope

---

## 5. Risks & gaps to raise with Jeff (before the drill)

1. **PITR unconfirmed (P-1).** If it's daily-only, the platform's real RPO is up
   to 24 h — likely unacceptable for a live multi-tenant CRM taking bookings and
   payments. **Decision needed:** enable PITR or accept 24 h RPO.
2. **App-level backups are a SPOF (§0).** `platform-backups` lives in the same
   project it backs up. A project-level loss takes the backups too. **Decision:**
   replicate the bucket (or `pg_dump`) to off-project/off-provider storage.
3. **Backup cron is silent-fail (P-4).** `/api/cron/backup` only logs success to
   an in-app notification and swallows per-tenant errors into a return payload
   (`route.ts:82-100`) — no alert if it stops. Pair with the Fortress
   heartbeat gap (`fortress-health-coverage-audit.md §3 F-A`): **nothing alerts
   when a scheduled job silently dies.**
4. **App backup is partial** (11 tables, active tenants only). Inactive/churned
   tenants and all non-listed tables are absent from Variant B.
5. **No prior drill on record.** Grep of the repo shows no restore drill artifact
   — this would be the **first** DR validation. An untested backup is a
   hypothesis, not a recovery plan.

---

## 6. What I verified vs. did not

- **Verified (static, this working tree):** the two backup layers and their
  shape — managed-DB comment and the app-level per-tenant JSON export to
  `platform-backups` (11 tables, active tenants, `0 5 * * *`), including its
  best-effort error handling (`src/app/api/cron/backup/route.ts`, `vercel.json`);
  the three env vars that repoint the app at a database (`src/lib/supabase.ts`);
  the prod project ref and Management-API token pointer
  (`deploy-prep/env-var-inventory.md`); absence of any prior DR-drill artifact in
  the repo.
- **Did NOT verify (requires Supabase console / Jeff — cannot from this lane):**
  whether **PITR is enabled**, the **plan tier**, the **retention window**,
  whether the nightly backup cron is **currently succeeding**, whether
  `platform-backups` is **replicated off-project**, and the exact
  **restore-into-a-new-project** console flow for the current plan. **Every RTO/RPO
  number in §4 is a proposed target, not a measured result — this runbook has not
  been executed.**
