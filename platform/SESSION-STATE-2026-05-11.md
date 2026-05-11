# Session state — multi-tenant foundation handoff

**Date saved:** 2026-05-11
**Branch:** `feat/multitenant-foundation`
**Commits this session:** 35, all local, no push
**Build status:** `npx next build` green (30,249 pages)
**tsc status:** clean

---

## Where this is at — the truth

**Done:**
- Multi-tenant schema migration applied to shared Supabase (21 tenants, 56 tables tenant_id'd)
- All 21 tenant `/site/<slug>/` trees render 200 in dev + prod modes
- Yinez agent ported + tenant-scoped (~100 query sites in core.ts + tools.ts threaded)
- Brand override prepended to Yinez prompt for non-nycmaid tenants
- Non-nycmaid guard active on sms/web channels (refuses politely until further verified)
- Comhub email + voice webhooks tenant-stamped (nycmaid-by-design)
- 5 missing crons ported with tenant-loop wrappers (3 of 5 — 2 are nycmaid-only by infra)
- Per-tenant brand assets (globals.css, icons, favicons, og-images) copied for 15 of 20 tenants
- 5 source-less tenants stubbed with minimal brand
- 2 empty FAQ pages stubbed with placeholder content
- nycmaid LIVE prod still healthy (verified via curl: /, /book, /portal, /admin all 200)

**NOT done (cutover prereqs, you need to do these):**
- Push `feat/multitenant-foundation` to GitHub (requires `gh auth switch --user fullloopcrm`)
- Transcribe ~60 env vars from nycmaid Vercel to fullloop Vercel (see `PRE-CUTOVER-AUDIT-2026-05-11.md`)
- Deploy preview from feature branch
- Run the readiness gate (`NYCMAID-READINESS-VERIFY.md`)
- Flip Telnyx webhook URL, Stripe webhook URL, DNS at registrar
- Active monitoring window post-cutover (`POST-CUTOVER-ACTION-PLAN.md`)

**Known gaps (visible but not blocking):**
- ~5 lingering unscoped queries in legacy `src/lib/yinez/core.ts` askYinez (dead code, no consumers)
- Per-tenant rich sitemaps not generated (only generic 5-URL sitemap via `/api/tenant-sitemap`)
- Yinez has NEVER actually run against real Supabase in fullloop context (placeholder env)
- 5 source-less tenants have first-letter icon stubs, not real brand
- 2 FAQ pages say "Content coming soon"

---

## To-do actions (in order)

### Action 1 — Push (5 min) — REQUIRES YOUR AUTH

```bash
cd /Users/jefftucker/fullloopcrm/platform
gh auth switch --user fullloopcrm
gh auth status   # confirm fullloopcrm is active
git push origin feat/multitenant-foundation
```

Wait ~4 min for Vercel preview build to complete. Vercel emits a preview URL.

### Action 2 — Env vars (30-45 min)

Open `PRE-CUTOVER-AUDIT-2026-05-11.md`. For each of the 74 env vars listed, copy value from nycmaid's Vercel project settings to fullloop's Vercel project settings.

Order: critical first (Supabase, Anthropic, Telnyx, Stripe, Email, Owner, Cron, Site URL). Then high, then medium, then low.

### Action 3 — Preview smoke test (1-2 hrs)

Open the preview URL Vercel deployed. Run through `NYCMAID-READINESS-VERIFY.md` Layer 2 checks. If any layer fails, fix before flipping.

### Action 4 — Cutover window (5 min hot + 1 hr watch)

Follow `NYCMAID-CUTOVER-PLAN-2026-05-09.md` cutover-window steps. Pick a 3am ET window for low SMS traffic. Pre-lower DNS TTL on `thenycmaid.com` 24h ahead.

### Action 5 — Post-cutover monitoring

Open `POST-CUTOVER-ACTION-PLAN.md`. Print it. Run through T+0 to T+60 active monitoring. Watch for rollback triggers.

### Action 6 — Sustained monitoring (next 7 days)

T+4h, T+8h, T+12h, T+24h checkpoints per the action plan. Run the daily sanity SQL.

### Action 7 — Other 20 tenants (per-tenant DNS flip, days)

After nycmaid stable for 7 days, start adding the other 20 tenants. Per-tenant DNS flip. Per-tenant verification.

---

## Follow-up improvements (after cutover stable, weeks)

These are NOT required for cutover but should be done in the first month:

1. **Delete `src/lib/yinez/core.ts` legacy `askYinez`** (line 2280, dead code)
2. **Update `.env.example`** with all 74 env vars (right now 14 are documented)
3. **Per-tenant rich sitemap.ts** — port each tenant's `_data/` + `sitemap.ts` from source repo
4. **Real brand assets** for the 5 stubbed tenants (florida, wash-and-fold-nyc, wash-and-fold-hoboken, stretch-ny, stretch-service)
5. **Real FAQ content** for consortium-nyc + the-nyc-marketing-company `nyc-digital-marketing-agency-faqs/page.tsx`
6. **Remove non-nycmaid Yinez guard** at `src/lib/yinez/agent.ts` once a second tenant is verified populated
7. **Decommission old nycmaid Vercel project** after 30 days clean

---

## Repository state

```
35 commits on feat/multitenant-foundation:

Recent:
3009714 docs: post-cutover action plan — T+0 through T+30 days
c5acdbc docs: env var coverage + hardcoded-ref audit for cutover prep
56a0c42 docs: pre-cutover readiness verification checklist for nycmaid
8d7e406 chore: remove accidentally-committed .next trace artifacts
9e468cd fix(site): brand stubs for 5 source-less tenants + FAQ page stubs
4cb5718 fix(build): make production build green
... 29 earlier feat/fix commits
```

Branch is up-to-date locally. Working tree clean (except this file getting committed now).

---

## Reference docs at branch root

- `NYCMAID-CUTOVER-PLAN-2026-05-09.md`
- `NYCMAID-READINESS-VERIFY.md`
- `PRE-CUTOVER-AUDIT-2026-05-11.md`
- `POST-CUTOVER-ACTION-PLAN.md`
- `SESSION-STATE-2026-05-11.md` (this file)

Read in that order before doing anything.

---

## If you forget where you left off, read this file first.
