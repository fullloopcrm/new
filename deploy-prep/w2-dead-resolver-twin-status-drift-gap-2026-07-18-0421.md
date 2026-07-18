# W2 gap/fluidity refresh — 2026-07-18 04:21

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-comhub-requireadmin-vs-nav-parity-gap-2026-07-18-0407.md`.

Leader's instruction this round (04:13 LEADER->W2): fresh 3-deep queue — (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1) — new fresh-ground surface: `tenant.ts`'s `getTenantBySlug`/`getTenantByDomain` are dead-but-discoverable resolver twins that hardcoded `status==='active'` instead of `tenantServesSite()`

**Bug found and fixed.** After the slug/domain resolver-twin sweeps of the last several rounds (7 live resolver twins fixed, sim-harness wrong-module bug fixed, STATIC_TENANT_MAP fixed, PIN-header status gate fixed), I went looking for any remaining resolver surface nobody had checked. Repo-wide grep for every import of `getTenantBySlug`/`getTenantByDomain` shows every single production call site — `middleware.ts`, `ingest/lead`, `ingest/application`, `webhooks/resend`, the sim harness — imports them from `tenant-lookup.ts`. **Nobody imports these two functions from `tenant.ts`.** They're exported, fully implemented, carry the same "reconciled to the P1 resolver contract" doc comments as the live ones, and sit in the exact same file as `getCurrentTenant()`/`getHeaderTenant()` (which ARE live and correctly gate on `tenantServesSite()`) — but they themselves hardcoded `.eq('status', 'active')` on both the `tenant_domains`-matched tenant load and the `tenants.domain` fallback load.

That filter predates `tenant-status.ts`/`tenantServesSite()` entirely (it's the original pre-P1 status check, explicitly preserved "to keep tenant.ts's own contract" by commit `ee8943a4`, which reconciled everything else about this function to the P1 contract but left status filtering untouched). `tenant-status.ts`'s own doc comment is explicit about why this is wrong as a general rule: *"New tenants are 'setup'/'pending' and must still be servable immediately (booking + lead collection work before full activation) — gating on status === 'active' would hide every new tenant until onboarding passed."* That's exactly what these two functions would have done to a 'setup'/'pending' tenant, had anything ever called them: silently returned null for a tenant that every live resolver in the platform considers fully servable.

**Why this is worth fixing despite zero live callers:** these are landmines, not just dead code. A future dev (or agent) grepping `tenant.ts` for "get tenant by domain" — the obvious first place to look, since it's right next to the live `getCurrentTenant()`/`getHeaderTenant()` — would find a fully-implemented, well-commented, heavily-tested (20 existing tests) function that LOOKS like the canonical resolver and would silently reintroduce the exact "hides setup/pending tenants" bug this fleet has spent many rounds eliminating everywhere else, the moment it got wired up.

**Fixed:** both functions now gate on `tenantServesSite(data.status)` instead of a DB-level `.eq('status', 'active')` filter — matching every live resolver in the codebase (`tenant-query.ts`, `tenant-lookup.ts`, middleware's own inline checks). For `getTenantByDomain`'s `tenant_domains`-matched branch specifically: a matched tenant that `tenantServesSite()` considers dark (suspended/cancelled/deleted) is now treated the same as a dangling pointer — returns null, does **not** fall through to the `tenants.domain` fallback (which could otherwise serve a *different* tenant for that host — the same brand-swap failure mode every other guard in this function exists to prevent). Doc comments on both functions updated to state the corrected contract and explain why it matters despite having no production caller today.

## (2) — swept for siblings: no other unreferenced/dead tenant-resolution twin found

Repo-wide grep for every other tenant-by-slug / tenant-by-domain-shaped query (`.eq('slug', ...)`, `.eq('domain', ...)` against `tenants`/`tenant_domains`) turned up only call sites already accounted for by prior rounds' sweeps (the 7 fixed resolver twins, `domains.ts`'s `findDomainOwner`/`getPrimaryTenantDomain`/`reconcilePrimaryDomain`, the admin `tenants`/`businesses` PUT domain-collision guards, `seo/ingest.ts`'s `linkTenant`) — all either route through the canonical resolvers or are independently hardened with their own `tenantServesSite()`/collision checks from earlier rounds. Also checked `dashboard/layout.tsx`'s own tenant-domain pre-gate (the one place that decides whether to consult `getCurrentTenant()` at all) — its admin-token check is intentionally status-agnostic (the follow-on `getCurrentTenant()` call is what enforces `tenantServesSite()`), so no gap there. Nothing else found unreferenced or drifted.

## (3) — gap/fluidity kept current

Carried-forward NOTICED items 1–23, unchanged (see prior rounds' docs for full list, most recently restated in `w2-tenant-health-cron-status-gate-gap-2026-07-18-0306.md` and `w2-static-tenant-map-domain-reassignment-bypass-2026-07-18-0300.md`).

Carried forward, still flagged not fixed (product/rollout calls, unchanged):
- Item re: `webhooks/stripe` never calling `activateTenant()` (HIGH SEVERITY, flagged 2026-07-18 ~02:10, in `JEFF-MORNING-QUEUE.md`).
- Item 30 (ComHub `requireAdmin()` vs. nav-parity — 20 route files gated Jeff-only while nav exposes ComHub to every operator; needs Jeff's rollout-gating call).

NEW this round:

31. `tenant.ts`'s `getTenantBySlug`/`getTenantByDomain` were dead resolver twins hardcoding `status==='active'` instead of `tenantServesSite()` — fixed above (1). No live impact (zero production callers), but removed the landmine before anyone wires them up.

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward, unchanged: items 18–20.

## Verification this round

- `npx tsc --noEmit`: clean.
- `npx vitest run src/lib/tenant.test.ts`: 43/43 pass (33 pre-existing + 10 new: setup/pending tenants now resolve via both the `tenant_domains` and `tenants.domain` fallback paths on `getTenantByDomain`, a suspended tenant resolved via `tenant_domains` returns null AND does not fall through to a different tenant's stale legacy row (wrong-tenant probe), a cancelled tenant via the fallback path returns null, and the `getTenantBySlug` describe block gained a setup-tenant-resolves case plus a parametrized suspended/cancelled/deleted wrong-tenant probe). 3 pre-existing tests that asserted the OLD (buggy) `status==='active'` DB-filter behavior updated to assert the corrected contract instead (no behavior they were protecting is lost — the divergence-guard/masked-error/case-normalization assertions in the same tests are untouched).
- Full repo suite: 706 files, 3027 passed, 37 skipped, 0 failed — confirms no other suite depended on the old dead-code behavior.

File-only, no push/deploy/DB write from this worker. 1 code commit this round (2-function fix in `tenant.ts` + test updates) + 1 docs commit.
