# FullLoop — Team-Readiness Roadmap

**Purpose:** the single source of truth for turning this from a solo build into a
codebase a hired developer can join and change with confidence. Honest status,
real effort. Update the checkboxes as work lands — do not mark anything done
until it's verified.

**Status legend:** ✅ done + verified · 🟡 in progress · ⬜ not started ·
🧱 program (multi-day, not a one-pass fix)

---

## Where this stands (honest)

- Isolation is **application-level only**: every query runs through the
  `service_role` client, which **bypasses RLS**. Discipline (`.eq('tenant_id', …)`)
  is the only wall. A grep guard (`scripts/audit-tenant-scope.mjs`) backs it up.
- The one **confirmed live cross-tenant leak** (Selena's cleaner-scoring path)
  is **fixed and covered by a regression test**.
- There is now **CI** (`.github/workflows/ci.yml`) gating type errors, failing
  tests, and new unscoped queries. Before this, nothing enforced the gates.
- Big gaps remain for multi-dev comfort: no RLS backstop, thin test coverage,
  no migration system, ~45 cloned dashboards, sparse onboarding docs.

---

## Phase 0 — Stop the bleeding (isolation) — 🟡

- [x] ✅ Fix confirmed leak: `scoreCleanersForBooking` scoped by `tenant_id`
      (`src/lib/nycmaid/smart-schedule.ts` + callers `selena/core.ts`,
      `selena/tools.ts`). Regression test proves it (red without filter, green with).
- [x] ✅ Remove dead tenant-blind import from `selena/core.ts`.
- [x] ✅ Scope `nycmaid/availability.ts` (5 functions) + fix
      `api/admin/cleaner-availability` route to resolve tenant.
- [x] ✅ CI gate for **new** unscoped queries (guard baseline: 96 → 91).
- [ ] 🟡 Triage the remaining **91 baselined** candidates to **0**: read each,
      add `.eq('tenant_id', …)` if a real leak, or `// tenant-scope-ok: <reason>`
      if safe (row-key/token/by-design). Then delete the baseline file.
      *Most are false positives (row-scoped) or by-design admin/cron; the goal is
      that every one is read and justified, not assumed.*

## Phase A — Isolation backstop (RLS) — 🧱 ⬜

Foundation so a forgotten `.eq` **fails closed** instead of leaking. Design is
already written and verified against prod: `docs/tenant-isolation-rls-plan.md`.

- [ ] Add `SUPABASE_JWT_SECRET` to env; build the per-request tenant-scoped client.
- [ ] Uniform RLS policy (`tenant_id = auth.jwt()->>'tenant_id'`) across the ~120
      tenant_id tables; stage on qa-sandbox first.
- [ ] Migrate tenant-facing reads/writes off `service_role` onto the scoped client;
      keep `service_role` only for genuine cross-tenant ops (admin/cron/platform).
- [ ] **Done means:** a query with no `tenant_id` filter returns zero foreign rows
      in a test, not everything.

## Phase B — Test net + enforcement — 🧱 🟡

- [x] ✅ CI runs tsc + vitest + guard on every push/PR.
- [ ] Characterization tests on the money paths (Stripe webhook, invoices,
      deposits, payouts) **before** anyone refactors them.
- [ ] Isolation tests for the top tenant-facing flows (bookings, clients, deals).
- [ ] Raise coverage toward the 80% target (currently ~10 test files).
- [x] ✅ Lint is a **blocking** gate (`eslint src --quiet` is error-clean today).
- [ ] Add pre-push hook mirroring CI (fast feedback before push).

## Phase C — Reproducible database — 🧱 ⬜

- [ ] Replace 34 hand-run `.sql` files with a real migration tool (schema-in-code,
      up/down, applied-state tracking).
- [ ] Snapshot current prod schema as the baseline migration.
- [ ] **Done means:** a dev can rebuild the schema from the repo and know it matches prod.

## Phase D — One codebase, not forks — 🧱 ⬜

- [ ] Auth/routing cutover: repoint `wash-and-fold-nyc`, `wash-and-fold-hoboken`,
      `the-florida-maid` operators to global `/dashboard` + `/admin`.
- [ ] Delete the ~45 cloned operator pages **after** cutover is verified
      (deleting first darkens a live tenant — see root `CLAUDE.md`).

## Phase E — Onboarding surface — 🟡

- [x] ✅ CI visible in repo.
- [ ] Rewrite `README.md`: what it is, run locally, env, deploy, where things live.
- [ ] `ARCHITECTURE.md`: tenant model, request→tenant resolution, Selena engine,
      messaging, money flow (link the good root `CLAUDE.md` rules).
- [ ] `CONTRIBUTING.md`: branch/PR flow, the gates, "never add per-tenant operator code."
- [ ] Archive the 27 root planning `.md` files into `docs/history/` (keep root clean).

## Phase F — Code health — 🧱 ⬜

- [ ] Split files >800 lines (`BookingsAdmin.tsx` 2,905; `selena/core.ts` 2,595;
      `settings/page.tsx` 2,100).
- [ ] Burn down `any`/`as any` (307) and `@ts-ignore` (58).
- [ ] Replace 582 `console.*` with a structured logger.

---

## Day-1 checklist for a new dev

1. Read root `CLAUDE.md` (the architecture rules) and this file.
2. `cd platform && npm ci` → `npm run dev`.
3. Before every PR: `npx tsc --noEmit`, `npx vitest run`,
   `node scripts/audit-tenant-scope.mjs` (CI runs all three).
4. **The one rule that prevents the worst bug:** every query on a tenant-owned
   table must include `.eq('tenant_id', …)`. If you can't, you probably want the
   scoped client (Phase A) — ask.
