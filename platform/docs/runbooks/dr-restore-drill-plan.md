# Disaster-Recovery Restore Drill — Plan

_Status: PLAN ONLY. Docs only — nothing in this file executes anything. No prod
DDL, no prod write, no backup taken by writing this file._
_Owner: platform on-call + Jeff (leader) for any prod-touching step._
_Last authored: 2026-07-11 (W4, branch `p1-w4`). Addresses master-list **A6 —
"DR never tested."**_

## Why this exists

We have never rehearsed a database restore. "We have backups" is a claim we
cannot defend until we have restored one and watched the app come up on it. This
plan is the drill that turns that claim into a verified fact, **without touching
production**: every step restores into a throwaway ("scratch") Supabase project
and validates there. The one destructive path — actually cutting production over
to a restore in a real disaster — is written down at the end (§7) as reference,
is Jeff-gated, and is **not** part of the routine drill.

### What is verified vs. what a driller must confirm

Facts below are grouped so nobody acts on an assumption:

- **Verified from the repo (this branch):** the app is Supabase-Postgres,
  service-role everywhere (`SUPABASE_SERVICE_ROLE_KEY`, ~541 call sites), hosted
  on Vercel. Isolation is application-level — RLS is enabled but has **0
  policies** on sampled tables, so nothing in the DB stops cross-tenant reads
  except each query's `.eq('tenant_id', …)` (see
  `platform/docs/tenant-isolation-rls-plan.md`). App connects via four env vars:
  `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Highest-volume tenant-scoped tables:
  `bookings`, `clients`, `tenants`, `sms_conversations`, `notifications`,
  `team_members`, `payments`, `invoices`.
- **NOT verified here — confirm on the Supabase dashboard before drilling
  (read-only lane cannot see billing/plan state):**
  1. **Plan tier + PITR add-on.** PITR (point-in-time recovery, WAL-based) is a
     paid add-on. Whether it is enabled on the prod project determines the
     achievable RPO (§4) and whether §5-A is available at all. If PITR is
     **not** on, only the daily logical backup exists and the drill uses the
     dump/restore path (§5-B).
  2. **Backup retention window** actually configured (daily-only vs PITR
     window).
  3. **Whether the current plan supports "restore to a new project" / clone.**
     Historically Supabase PITR restores **in place** (rewinds the live
     project — destructive). If restore-to-new-project is not offered on the
     tier, the scratch-project drill **must** use §5-B (dump → fresh project),
     never in-place PITR against prod.

> Honesty note: I could not confirm items 1–3 from code. Do not assume PITR is
> on. The first drill's job #0 is to read the dashboard and write the real
> answers into §4 and §5.

---

## 1. Scope and safety rules for the drill

- **Non-destructive by construction.** The drill only ever writes to a scratch
  project you created for the drill. It never runs against the prod project ref.
- **Two projects, never confused.** Before any restore step, echo and eyeball
  the target project ref. A restore aimed at the wrong ref is the one
  catastrophic mistake this drill can make.
- **Scratch project is disposable and gets deleted after** (§8). It holds a full
  copy of prod PII (client names, phones, addresses, payments) — treat it as
  production-sensitive until deleted.
- **Secrets stay in their existing home.** The scratch project's URL + keys go
  into a **local** `.env.drill` used only for the validation run — never into
  the Vercel prod project, never committed. Pointer-only, per the access rules.
- **Prod cutover (§7) is out of scope for a drill** and requires explicit Jeff
  approval at the moment of a real incident.

---

## 2. Prerequisites (gather before drill day)

- Supabase dashboard access to the prod project (to read plan/PITR state and to
  trigger a restore or download a backup).
- Ability to create a new (scratch) Supabase project on the same org.
- Local `psql`, `pg_dump`, `pg_restore` (matching the prod Postgres major
  version — mismatched `pg_dump` majors fail).
- The prod DB connection string (for the `pg_dump` path) — from the dashboard,
  used read-only; do not persist it.
- A clock/stopwatch: the drill **is** the RTO measurement (§4). Note wall-clock
  start when you begin the restore and stop when validation §6 passes.

---

## 3. Choose the restore target time

Pick a target timestamp `T` to restore to:

- **PITR drill:** choose `T` a few minutes in the past (e.g. "now − 10 min").
  This exercises the WAL-replay path and proves granularity.
- **Daily-backup drill:** `T` is fixed to whenever the most recent daily
  snapshot was taken; you cannot choose an arbitrary minute. Note the snapshot's
  actual timestamp — the gap between `T` and "now" is your **real RPO** for this
  tier (§4).

Record `T` and the method chosen — validation row counts (§6) are interpreted
relative to `T`, not to "now."

---

## 4. RTO / RPO targets to set

These are **proposed** targets to ratify with Jeff, then measure against during
the drill. A target you have never measured is a guess; the drill replaces the
guess with the observed number.

| Metric | Proposed target | What it means here | How the drill measures it |
|---|---|---|---|
| **RPO** (max data loss) | **≤ 5 min** if PITR is on; **≤ 24 h** if daily-only | How far back the newest safe restore point is. PITR gives ~minutes (WAL); daily backup gives up-to-24h loss. | The `now − T` gap in §3. If it exceeds the target, the tier/add-on must change — flag to Jeff. |
| **RTO** (time to restored + serving) | **≤ 2 h** for full prod cutover | Wall-clock from "decide to restore" to "app serving correct tenant data again." | Time the whole drill (§5 start → §6 pass), then add a realistic estimate for the §7 cutover + Vercel redeploy + DNS-unaffected verification. The drill measures the DB half directly. |
| **Restore-verify time** (drill-internal) | **≤ 45 min** | Restore into scratch + pass §6 validation. | Directly timed by the drill. |

Rationale: this is a multi-tenant CRM handling live bookings and **payments** —
RPO of "a full day of bookings and ledger rows" is likely unacceptable for the
payment path, which is the strongest argument for confirming PITR is on (§0
item 1). Set the real numbers with Jeff after the first drill produces observed
values.

---

## 5. Restore into a scratch project

Do exactly one of the two paths, depending on what §0 confirmed.

### 5-A. PITR → new project (only if the tier offers restore-to-new-project)

1. In the Supabase dashboard, open the **prod** project → Database → Backups /
   PITR.
2. Confirm PITR is enabled and note the available window.
3. Trigger a restore to timestamp `T` **into a new/cloned project** — NOT
   in-place. If the dashboard only offers **in-place** restore, **stop**: that
   rewinds prod and is destructive. Switch to §5-B instead.
4. Wait for the new project to provision and finish WAL replay to `T`.
5. Capture the scratch project's URL, anon key, and service-role key into a
   local `.env.drill` (not committed, not into Vercel).

### 5-B. Dump → fresh scratch project (always available; the safe default)

This path never touches prod beyond a read-only `pg_dump`, so it is the default
when PITR/clone availability is unconfirmed.

1. Create a new empty Supabase project (the scratch target). Note its ref.
2. Dump prod (read-only). Prefer restoring from a **downloaded daily backup
   file** if available (fully decoupled from prod); otherwise `pg_dump` the live
   prod DB read-only:
   ```
   pg_dump --no-owner --no-privileges -Fc "$PROD_DB_URL" -f /tmp/drill-restore.dump
   ```
   `--no-owner --no-privileges` avoids role mismatches between projects.
3. Restore into the scratch project:
   ```
   pg_restore --no-owner --no-privileges -d "$SCRATCH_DB_URL" /tmp/drill-restore.dump
   ```
4. Shred the dump file after the drill (`rm /tmp/drill-restore.dump`) — it is a
   full PII copy.
5. Capture the scratch project's URL + keys into `.env.drill` as in 5-A step 5.

> Note: `pg_dump` restores a logical snapshot as of dump start, so its effective
> `T` is "when the dump began," not an arbitrary minute. That is the RPO reality
> of the daily-only tier (§4).

---

## 6. Validate the restore (the part that proves it worked)

Run all three against the **scratch** project (via `.env.drill`). A restore that
provisions but fails validation is a failed drill — record it as such.

### 6-A. Row counts (integrity — did the data actually come across)

For the core tenant-scoped tables, compare scratch counts against prod counts as
of `T`. Query both with the same statement and diff:

```sql
select 'bookings' t, count(*) from bookings
union all select 'clients', count(*) from clients
union all select 'tenants', count(*) from tenants
union all select 'payments', count(*) from payments
union all select 'invoices', count(*) from invoices
union all select 'team_members', count(*) from team_members
union all select 'sms_conversations', count(*) from sms_conversations
order by 1;
```

- **Pass:** scratch counts equal prod-as-of-`T` (allow for rows created in prod
  *after* `T`, which the restore correctly should not have).
- **Fail:** any table materially short → the restore is incomplete; do not
  proceed to cutover thinking on this backup.

### 6-B. Tenant-isolation spot-check (the multi-tenant-specific risk)

A restore that reshuffled `tenant_id` values, or dropped the column's integrity,
would be a silent cross-tenant data disaster. Confirm isolation survived:

1. Pick **two** real tenants A and B (by `tenants.id` / slug / domain).
2. Confirm each scoped table still partitions cleanly — e.g. no bookings whose
   `tenant_id` is null or points at a non-existent tenant:
   ```sql
   select count(*) from bookings b
   left join tenants t on t.id = b.tenant_id
   where b.tenant_id is null or t.id is null;   -- expect 0
   ```
3. Confirm A's row counts and B's row counts are non-zero and distinct, and that
   a known A-owned record (e.g. a specific booking) still carries A's
   `tenant_id`, not B's.
4. Run the existing app-level scope auditor against the scratch DB pointed via
   `.env.drill`:
   ```
   node platform/scripts/audit-tenant-scope.mjs
   ```
   It encodes the "every query remembers `tenant_id`" invariant; a clean run on
   restored data is strong evidence isolation is intact.

> Reminder (from the RLS plan): isolation here is **application-level**; the DB
> has RLS on but 0 policies, so this check is verifying the *data shape*, not a
> DB-enforced boundary. Cross-ref `platform/docs/tenant-isolation-rls-plan.md`.

### 6-C. Booking + payment flow (functional — does the app actually work on it)

Row counts prove data landed; this proves the app runs on it end-to-end.

1. Point a **local** app instance at the scratch project using `.env.drill`
   (the four Supabase env vars from §0). Do not point the Vercel prod deployment
   at scratch.
2. For one chosen tenant, exercise the core revenue path against scratch:
   - Load that tenant's booking surface and **create a test booking**.
   - Take/record a **payment** for it and confirm the **ledger row posts** to
     `payments` (the idempotent `23505`-as-success write should behave normally
     — cross-ref incident-response card #5).
   - Confirm the booking and its payment read back correctly scoped to that
     tenant only.
3. **Pass:** booking created, payment posted, both correctly tenant-scoped, no
   errors in the app log. **Fail:** any step errors → the restore is not
   serve-ready even if row counts matched.

---

## 7. Go-live cutover-back (REAL disaster only — Jeff-gated, NOT part of the drill)

This is the destructive promotion path, written down so it is not improvised
during an outage. **Do not run any of this during a drill.** It runs only when
prod is genuinely lost and Jeff has approved cutting over to a restore.

1. **Decide the restore point** with Jeff (accepting the RPO gap per §4).
2. **Produce the authoritative restored DB.** Either an in-place PITR of the
   prod project to `T` (rewinds prod — only when prod data is already lost/bad),
   or promote a validated restored project to be the new prod DB.
3. **Freeze writes** to avoid split-brain: if the old prod is partially alive,
   take it out of rotation first (a running app writing to a to-be-replaced DB
   loses those writes at cutover).
4. **Repoint the app** by updating the four Supabase env vars in the **Vercel
   prod project** to the restored DB's values:
   `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Then **redeploy** so the running functions
   pick up the new env (per the env-restart discipline — a running process with
   stale env is a time bomb).
5. **DNS is unaffected** — tenants resolve via Vercel/domain config, not the DB
   host, so no `dig`/registrar changes are needed for a DB swap (contrast
   incident-response card #2, which is DNS-specific).
6. **Re-run §6 validation against the promoted prod** (row counts, isolation
   spot-check, one booking+payment) before declaring the site recovered.
7. **Reconcile the RPO gap:** any bookings/payments that occurred between `T` and
   the outage are lost from the DB. Coordinate with the payments owner to
   reconcile against the provider (Stripe/Telnyx) — the provider is the
   out-of-band source of truth for money that moved after `T`.

---

## 8. After the drill

- **Delete the scratch project** (it is a full PII copy).
- `rm` any dump file and the `.env.drill`.
- **Record the results** (append to this file's drill log below, or the control
  channel): date, method (5-A/5-B), chosen `T`, observed RPO gap, observed
  restore-verify time and estimated full RTO, and pass/fail of each §6 check.
- **File any gap as a real item:** if RPO exceeded target → PITR/tier change; if
  restore-verify time exceeded target → automate the dump/restore steps; if any
  §6 check failed → the backup itself is suspect and is the top priority.

### Drill cadence

- First drill: as soon as an owner is assigned (this closes A6 from "never
  tested" to "tested once, on <date>").
- Thereafter: **quarterly**, and after any change to the DB provider, plan tier,
  or the tenant-isolation model (e.g. when RLS policies land per the RLS plan —
  that changes what §6-B must verify).

---

## Cross-references

- `platform/docs/runbooks/incident-response.md` — live incident cards; card #1
  (site down / Supabase outage), card #5 (payment/ledger idempotency), card #6
  (tenant divergence).
- `platform/docs/tenant-isolation-rls-plan.md` — why isolation is app-level
  today; what §6-B is and isn't verifying.
- `platform/scripts/audit-tenant-scope.mjs` — app-level tenant-scope auditor used
  in §6-B.
- Supabase project dashboard → Database → Backups/PITR — the plan/tier/window
  facts §0 requires (not visible from the repo).
</content>
</invoke>
