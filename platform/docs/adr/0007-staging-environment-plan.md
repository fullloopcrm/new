# ADR 0007 — Persistent staging environment: local-first, cloud option costed but not created

- **Status:** Proposed — local option implemented (scripts, not yet run end-to-end in this session — see Verification below); cloud option **BLOCKED on Jeff's cost approval**
- **Date:** 2026-07-28
- **Decision driver:** platform-hardening queue item 1 — "a persistent staging environment with its own data exists for pre-deploy smoke tests."
- **Deciders:** Jeff (owner)
- **Author:** W4 (platform-hardening lane)

---

## What exists today (verified)

- **Deploys are a single Vercel project**, prod only. `scripts/deploy.sh` runs `vercel --prod` directly; there is no staging Vercel environment referenced anywhere in the deploy tooling.
- **Every branch/PR gets a Vercel *preview* URL** (standard Vercel behavior), but a preview deployment has **no environment of its own data** — it points at the same `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` env vars as everything else unless someone manually overrides them per-branch, which nothing in this repo does. So a "preview" today is prod data behind a different URL, not an isolated environment.
- **One Supabase project** (`cetnrttgtoajzjacfbhe`) backs prod. No second project, no branch database, no seeded fixture dataset exists anywhere in the repo.
- **No migration-tracking system** (confirmed separately, TEAM-READINESS.md Phase C) — 156 hand-run `.sql` files in `platform/src/lib/migrations/`, applied to prod one-by-one via the Supabase Management API per `docs/runbooks/migration-runbook.md`. There is no tooling anywhere that replays them onto a fresh database — that gap is exactly what blocks a staging DB from existing today, cloud or local.

**Conclusion: there is currently no way to smoke-test a change against real-shaped data before it hits prod.** A Vercel preview is a different URL, not a different environment.

## Options

### Option A — A second, dedicated Supabase project as real cloud staging
- Create a second Supabase project, apply the same 156 migrations to it (one-time, then keep in sync going forward — which requires the migration-tracking system TEAM-READINESS Phase C flags as separately missing; without it, "keeping staging in sync" is manual re-application, the same operational cost prod migrations already have), seed it with representative data, and give it its own Vercel env vars for preview branches to target.
- **Cost:** Supabase's Pro plan (~$25/mo base, needed for a usable second project beyond the free tier's compute/pause limits) plus whatever compute add-on the staging project needs — a second small/paused-when-idle project can likely stay near the Pro-plan included allowance, but I'm not going to state an exact number with false confidence; **Jeff should confirm current pricing at supabase.com/pricing before approving** (my training data may be stale on exact tiers/limits).
- **Pros:** genuinely separate infra, closest to a real staging tier, can be pointed at from Vercel preview deployments directly.
- **Cons:** recurring cost, and doesn't remove the "156 files, no tracked migration state" problem — it just gives that problem a second place to go wrong.
- **This is the cost-gated path.** Per the platform-hardening brief's hard rule, **nothing was created for this option** — no Supabase project, no billing change. This ADR documents it as a proposal only.

### Option B — Local, Docker-based staging via the Supabase CLI (implemented this session)
- `supabase start` runs the full Supabase stack (Postgres, Auth, Storage, Studio) locally via Docker — **free, no cloud resource, nothing billed.**
- Data persists in a Docker volume across `supabase stop`/`supabase start` cycles — genuinely "persistent" for the purpose of running smoke tests between sessions, not re-created from scratch every time.
- Migrations are replayed from the same 156 files already in the repo (read-only from this ADR's perspective — **no migration file was created, edited, or renumbered**, per the queue's explicit "stay out of migration files" boundary).
- **Pros:** zero cost, works today, gives every worker/dev the same reproducible local target, catches the most common pre-deploy risk class (a migration or query that behaves differently against a populated schema vs. an empty one) without waiting on Jeff's approval.
- **Cons:** not identical to prod (local Postgres version is pinned to match — see below — but extensions, storage config, and scale characteristics differ); the 156-file replay is **best-effort, not guaranteed clean** (see the script's own header for why); doesn't help a Vercel *preview URL* point at real-shaped data, only local `next dev`.

## Decision

**Implement Option B now** (it's free and achievable with scripts alone, per the queue's own instruction). **Defer Option A** to Jeff's approval — proposed here with the honest caveat that its cost isn't pinned to an exact number without a pricing-page check at approval time.

## What was built (Option B)

| File | Purpose |
|---|---|
| `supabase/config.toml` (+ `supabase/.gitignore`) | `supabase init` scaffold — `project_id` set to a stable `fullloopcrm-staging` (not the worktree directory name, which differs per worker/session and would otherwise produce a different Docker project per checkout). `major_version = 17` matches prod (`supabase/.temp/postgres-version` reads `17.6.1.063`). |
| `scripts/staging-up.sh` | Orchestrator: `supabase start` → apply migrations → seed one tenant if the DB is empty. `--reset` wipes first. Prints the local DB/API URLs and the `npm run dev` invocation to point the app at it. |
| `scripts/staging-apply-migrations.sh` | Replays `platform/src/lib/migrations/*.sql` in filename-sorted order via `psql`, per-file, continuing past failures (logged to `scripts/.staging-logs/`) rather than hard-stopping — see the script's header for why a per-file failure isn't necessarily a real problem on an empty DB. |
| `platform/scripts/staging-seed-tenant.ts` | Seeds one representative tenant (cleaning industry) + one team member + one client + one completed/paid booking — enough to exercise the booking → payment → payroll-prep chain, not a demo dataset. Follows the same minimal-insert shape already proven by `platform/scripts/seed-100-tenants.ts`. |

## Verification (honest status — read before trusting this is "done")

**I did not run `supabase start` in this session** — the sandbox's Docker daemon was not running (`docker info` failed) and starting a multi-container stack reliably from an agent session carried more risk/uncertainty than this task's budget justified. **These scripts are written, syntax-checked (`bash -n`, `tsc --noEmit`), and reviewed against the actual `tenants`/`service_types`/`team_members`/`clients`/`bookings` insert shapes already used elsewhere in this repo — but the end-to-end path (`supabase start` → migrations → seed → app boots against it) has NOT been executed.**

**Exact verification steps for whoever runs this next** (Jeff, the leader, or the next worker with Docker available):
```bash
open -a Docker   # or however Docker Desktop starts locally; wait for it to be ready
cd /Users/jefftucker/fullloopcrm-leader-2026-07-28
./scripts/staging-up.sh --reset
# Expect: local stack starts, migrations report N/156 applied cleanly (some
# failures on legacy data-backfill files are expected — read the summary),
# one tenant seeded. Then:
cd platform && NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=<from `supabase status`> npm run dev
# Hit http://localhost:3000/dashboard and confirm the seeded tenant's data loads.
```
If the migration-replay failure count is high on real schema (not data-backfill) files, that's a genuine finding to fix in a follow-up — not something to paper over.

## Consequences

**If Option B is adopted going forward:** every worker gets a free, reproducible local target for pre-deploy smoke tests; the migration-replay script also becomes a cheap ongoing signal for "does this migration file actually apply cleanly to a fresh schema," which is otherwise never checked today.

**If Option A is later approved:** it should reuse the same migration-replay script (pointed at the cloud project's connection string) rather than inventing a second apply mechanism — that's exactly why `staging-apply-migrations.sh` takes the connection string as a parameter instead of hardcoding the local one.

**Cross-references:** `docs/runbooks/migration-runbook.md` (how prod migrations are actually applied — untouched by this ADR), `docs/adr/0006-error-tracking-sentry-plan.md` (same cost-gate pattern applied to a different infra decision), TEAM-READINESS.md Phase C (the still-open "no real migration system" gap this local replay does not fix, only works around).
