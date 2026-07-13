# DR Restore Drill — Plan (PLAN ONLY — do NOT run)

**Also answers:** the leader's later request for `deploy-prep/dr-restore-drill-plan.md` (19:33 order) —
that filename doesn't exist separately; this document already covers RTO/RPO targets (§4), scratch-project
restore steps (§5), and post-restore validation checks (§5.6–§5.8, §6) in full. Not duplicating it under a
second filename — extending this one if anything further is needed.

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-12
**Status:** file-only plan. **Nothing in this document has been executed.** No Supabase project was
created, no restore was attempted, no prod credential was touched. This is the concrete execution plan
for the open item already flagged in `platform/docs/compliance/disaster-recovery-runbook.md` §7:
*"Run the P12 restore drill (Jeff-gated): restore latest backup into a scratch instance, verify
integrity, record actual RTO/RPO achieved."*

**Do not duplicate the DR runbook here.** That document (§1–§6) already covers the full backup
inventory, asset list, and recovery procedures for every disaster class (data loss, provider outage,
signing-secret loss). This document is narrower: **the step-by-step drill procedure** to actually test
the one thing the runbook admits is untested — point-in-time restore — plus the RTO/RPO targets the
drill is designed to validate or falsify.

**Verification anchors read this pass:** `platform/docs/compliance/disaster-recovery-runbook.md` (full
file), `app/api/cron/backup/route.ts:1-75` (the existing nightly per-tenant JSON export), no
`supabase/config.toml` or PITR config found in this repo (grep, confirmed empty).

---

## 1. Why this drill, specifically

The DR runbook is honest that PITR cadence, retention window, and whether PITR is even enabled on the
Supabase plan are **unverified placeholders** (`⟪confirm in dashboard⟫`, runbook §2). Separately, this
codebase already runs a **nightly per-tenant JSON export** to a Supabase Storage bucket
(`app/api/cron/backup/route.ts`) covering 11 tables per active tenant — but that is explicitly a
supplementary, partial export ("Supabase already does daily DB backups on Pro plan, but this gives
per-tenant granular snapshots we control," `:5-6`), **not** a full-schema backup and **not** a substitute
for PITR (it excludes `tenants` itself, secrets, `sms_conversations`, `portal_leads`, `tenant_members`,
and everything not in its 11-table list — grep-confirmed against the route). A backup that has never
been restored is a hope, not a backup, for **both** of these — this drill exercises the real one (PITR),
since it's the mechanism the DR runbook's own recovery procedures (§4.1, §4.2) depend on.

---

## 2. Pre-requisites (all Jeff-gated — this worktree has none of these)

- Supabase organization/project **owner or admin** access (to confirm plan tier, PITR status, and to
  create a scratch project).
- Confirmation of which Supabase **plan** the prod project is on — PITR is plan-gated on Supabase; if
  the plan doesn't include it, this drill's step 1 will surface that as a genuine finding, not a blocker
  to work around.
- Ability to create a **new, isolated scratch Supabase project** (or a Supabase branch, if the plan
  supports branching) — the restore target must never be the prod project or overwrite prod data.
- A maintenance/low-traffic window is **not required** for this drill (restoring into an isolated scratch
  project touches nothing live), but budget real wall-clock time (30–90 min depending on DB size).
- A named drill runner with authority to spend on a temporary scratch project (Supabase PITR restores
  can incur cost depending on plan/data size — confirm before running, see §8).

## 3. Scope — what this drill restores, and what it deliberately does not

**In scope:** full Postgres database, restored via Supabase PITR to a specific timestamp, into an
isolated scratch project. This is the mechanism the DR runbook's §4.1 (accidental deletion) and §4.2
(full DB loss) procedures both depend on — proving it works once is the highest-leverage single test.

**Explicitly out of scope for this drill** (real gaps, tracked separately, not silently rolled into
"done" here):
- **Storage bucket restore** — the DR runbook flags storage backup coverage as an unconfirmed gap
  (§4.3). This drill is DB-only; a separate drill is needed once storage backup coverage is confirmed.
- **`SECRET_ENCRYPTION_KEY` recovery** — per the DR runbook §5, this key needs its own out-of-band
  backup separate from the database; a DB restore does not help if the key itself is lost. Not exercised
  here.
- **Full redeploy + DNS repoint timing** (DR runbook §4.2 steps 4–5) — this drill measures the DB-restore
  component of RTO only, not "point prod traffic at the restored DB and go live," which is a separate,
  higher-risk exercise against real infrastructure.
- **Multi-tenant, fleet-scale failover** — this is a single scratch-project restore, not a test of
  restoring under full production load.

## 4. RTO/RPO targets — what the drill validates

The DR runbook proposes these as targets Jeff has not yet confirmed (runbook §3). This drill is designed
to produce real numbers against them, not assume they already hold:

| Metric | Proposed target | What the drill actually measures |
|---|---|---|
| **RPO** (max data loss) | ≤ 1 hour, **if PITR is enabled and continuous** | Step 1 confirms PITR is on and its retention window. If PITR is *not* enabled, the drill should stop and report that finding immediately — the real RPO is then bounded by the last daily backup (up to ~24h), which is a materially different number Jeff needs to know before this policy can claim ≤1h. |
| **RTO** (max downtime) | ≤ 4 hours, full incident | This drill measures only the **DB-restore** leg (steps 4–5 below) — the time from "start restore" to "restored DB is queryable and verified correct." Redeploy/DNS-repoint time (a separate, real cost) is explicitly not included — see §3. |

If the drill's measured DB-restore time alone approaches or exceeds the 4h RTO target, that's a hard
finding: the full incident RTO (restore + redeploy + DNS + verification) cannot possibly meet 4h, and
the target needs revising, not the drill.

## 5. Step-by-step procedure

**Every step below operates against a NEW, isolated scratch Supabase project. Nothing here touches the
prod project's data.**

1. **Confirm PITR status.** In the Supabase dashboard for the prod project, confirm PITR is enabled and
   note the actual retention window (e.g., 7 days on some plans). If PITR is not enabled, stop here and
   report that as the drill's primary finding — do not substitute a plain daily-backup restore and call
   it a PITR drill; that would misrepresent the RPO capability.
2. **Pick a drill timestamp T.** Choose a point in the recent past (e.g., now − 2 hours) that has real,
   identifiable data after it — a specific booking, lead, or client record created within the last 2
   hours in a known tenant. This makes point-in-time precision verifiable (§5.7), not just "a restore
   completed."
3. **Start the clock (T0).** Record wall-clock start time before initiating the restore.
4. **Restore to timestamp T into a NEW scratch project.** Use the Supabase dashboard (or Management API)
   PITR restore-to-timestamp flow, targeting the new/isolated project. Never target the prod project or
   an in-place restore.
5. **Stop the clock at restore-complete.** This elapsed time (T0 → restore-complete) is the measured
   DB-restore component of RTO (§4).
6. **Verify aggregate correctness.** Compare row counts / spot-check specific rows against what should
   exist as of T: total `tenants` count, `bookings` count for the known tenant from step 2, a specific
   row's `updated_at` ≤ T.
7. **Verify point-in-time precision (the real RPO proof).** Confirm the specific record created *after*
   T in step 2 is correctly **absent** from the restored scratch DB. A restore that includes post-T data
   isn't actually proving point-in-time recovery — this check is what distinguishes "we have a backup"
   from "we have PITR."
8. **Verify the app layer can read the restored DB.** Point a throwaway, non-prod env (never prod
   Vercel env vars) at the scratch project's connection string and run a basic read (fetch one tenant
   row) to confirm no schema drift — i.e., that migrations applied after timestamp T aren't silently
   required for the app to function against data from before T. Note explicitly whether any migrations
   would need re-applying to bring the restored DB current; this is real, separate work not measured by
   this drill's RTO number.
9. **Tear down the scratch project.** Delete it immediately after verification — cost hygiene, and it
   should never be left running as an unmonitored, unpatched copy of prod data.
10. **Record results.** Write actual: PITR retention window (from step 1), timestamp T used, measured
    restore-complete elapsed time (step 5), pass/fail on steps 6–8, and any schema-drift finding from
    step 8. This becomes the update to DR runbook §7 (checking off the "run the drill" item with real
    numbers, not the current placeholders).

## 6. Pass/fail criteria for the drill itself

- **Pass:** PITR restore into the scratch project completes, restored data exactly matches expected
  pre-T state (§5.6), the specific post-T record is confirmed absent (§5.7), and the app layer can read
  the restored schema without error (§5.8).
- **Fail (a real, reportable finding — not a drill failure to hide):** PITR is not enabled at all; the
  restore includes post-T data (precision failure); row counts don't match expectation; the app layer
  errors against the restored schema (drift). Any of these is exactly the kind of gap this drill exists
  to surface — report it plainly, don't retry until it looks clean.

## 7. Who runs this

**Jeff-gated.** This worktree has no Supabase organization/project access, no ability to create a
scratch project, and no authority to initiate a restore of any kind — consistent with the standing rule
that DB writes are prepared as files for the leader/Jeff to run, never executed by a worker. This
document is the plan Jeff or the leader executes; no worker should attempt any step above.

## 8. Cost note

Depending on Supabase plan, a scratch project and/or a PITR restore operation may not be free. Confirm
cost implications before running — flagging this explicitly so it isn't a surprise mid-drill.

## 9. Addendum (2026-07-13) — this plan assumes "the migrations" are one linear thing; they are not

This plan's §1/§5 language ("migrations applied after timestamp T") implicitly treats schema history as a
single linear sequence. Investigation this session
(`migrations-tree-reconciliation-note.md`) found **three separate schema sources** with no documented
apply order and no single script that runs all three: a one-time foundation file
(`platform/supabase/schema.sql`, stale since 2026-03-11, only 12 of 100+ live tables), plus two
independently-committed migration trees (`platform/src/lib/migrations/`, `platform/migrations/`) with a
confirmed cross-tree dependency (tables in tree 3 reference `team_members`, which only tree 1 creates).

**This does not block a straight PITR restore** (§5's steps 1–8 restore *existing* prod data/schema as a
point-in-time snapshot — they don't reconstruct from zero, so the 3-source split is irrelevant to that
path). **It does block any drill variant that tries to build a fresh environment from repo source** (a
true DR scenario where the Supabase project itself is unrecoverable, not just a bad write to roll back
from) — there is currently no way to go from an empty Supabase project to current schema using only what's
committed in this repo. Recommend this gap be closed (see that note's §"Recommendation") before anyone
treats this drill's eventual "pass" as covering total-project-loss recovery, not just point-in-time
rollback within an existing project.
