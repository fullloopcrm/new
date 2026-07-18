# W2 gap/fluidity refresh — 2026-07-17 22:11

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-primary-domain-ordering-gap-2026-07-17-2200.md`.

Leader's fresh 3-deep queue this round (22:01 LEADER->W2): (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1) — new fresh-ground surface: dashboard Website status page never showed real data, and its "Domain configured" check was legacy-only

Widened the hunt beyond the resolver functions themselves (`tenant.ts`, `tenant-lookup.ts`, `tenant-query.ts`, `domains.ts`, `tenant-site.ts` — re-verified all clean, no drift since the 15:24 full re-audit) into their **callers' response-consumption**, on the theory that a precedence bug doesn't have to live inside a resolver — it can live in how a caller reads the resolver's output.

Two stacked bugs found in `dashboard/websites/page.tsx` (the operator-facing "Website" setup-status page):

1. **Response-shape bug (the bigger one):** `GET /api/settings` has always nested the tenant row under `tenant` — `NextResponse.json({ tenant: safeTenant })` — every other consumer of this route (`settings/page.tsx`, `websites-settings.tsx`, `selena/page.tsx`, `_QuoteBuilder.tsx`, `CalendarBoard.tsx`, `sms/page.tsx` — checked all 6) correctly reads `data.tenant.*`. `dashboard/websites/page.tsx` alone read fields straight off the top-level response (`data.domain`, `data.dns_configured`, `data.email_domain_verified`, `data.website_published`, `data.website_url`) — every one of those was always `undefined`. Concrete impact: this page's entire setup checklist and stat tiles ("Domain configured", "DNS configured", "Email domain verified", "Website published", the Domain/Status/DNS tiles, the "Your Website" link block) showed as not-configured/not-live for every tenant, regardless of actual state — the operator-facing page for checking your own site status was silently reporting the wrong thing 100% of the time.
2. **Resolver-precedence bug (same bug class this lane exists to fix):** even with the shape fixed, the "Domain configured" check only ever looks at the legacy `tenant.domain`/`domain_name` columns — the identical bug already fixed for `tenantSiteUrl()`, `resolveOrigin()` (site-readiness.ts), `onboarding-gate.ts`, `tenant-sitemap`, `indexnow`, `broadcast-guidelines`, `campaigns/generate`, `referrers/[code]`, `site-export`, etc. A tenant whose live custom domain lives only in `tenant_domains` (added via `admin/websites`, never touching `tenants.domain`) would still show "No domain set" on its own Website status page even after fix #1.

**Fixed:**
- `app/api/settings/route.ts` GET now also resolves and returns `primaryDomain` via `getPrimaryTenantDomain(tenant.tenantId)` — same resolver, same precedence, scoped to the requesting tenant's own `tenantId` (not client-suppliable). The raw `tenant.domain`/`domain_name` fields stay unchanged in the response — `settings/page.tsx` and `websites-settings.tsx` still need those raw values for their edit forms.
- `dashboard/websites/page.tsx` now reads `data.tenant.*` (fixing the shape bug) and prefers `data.primaryDomain` over the raw legacy `domain` field for the "Domain configured" check/display (fixing the precedence bug), matching the `primary || tenant.domain || tenant.domain_name` pattern used everywhere else in this lane.

**Why this is squarely fresh ground and not a re-tread of the 15:24 "clean" re-audit:** that pass verified the *resolver functions* end-to-end (middleware, tenant.ts, tenant-lookup.ts, tenant-query.ts, tenant-site.ts, domains.ts) and confirmed them clean — correctly, they still are. This round's bug lives one layer further out, in a caller's *consumption* of an already-correct API response shape, which the resolver-level audit wouldn't surface. Same discovery pattern as the 22:00 round's finding (bug lives in a caller re-deriving/mis-consuming instead of in the shared resolver).

Tests: 4 new (`route.primary-domain.test.ts`) — tenant_domains-primary-wins-over-legacy, null-fallback-when-no-tenant_domains-row, **WRONG-TENANT PROBE** (two tenants' `primaryDomain` resolutions never cross — asserts `getPrimaryTenantDomain` is called with the correct, request-scoped `tenantId` each time and neither tenant's resolved domain leaks into the other's response), and a permission probe (a `staff` role forbidden from `settings.view` never triggers domain resolution at all — `getPrimaryTenantDomain` not called, `primaryDomain` not in the 403 body). Also had to add a `@/lib/domains` mock to the pre-existing `route.rbac.test.ts` (it exercises GET without one; the real resolver would otherwise attempt a live DB call in test).

Verification: `tsc --noEmit` clean, `eslint` 0 new warnings on all touched files (pre-existing `<a>`-vs-`<Link>` warning on an unrelated line in `websites/page.tsx`, unchanged by this diff), full suite 668/668 files, 2864/2901 tests (37 pre-existing skips, +4 new tests vs. last round), 0 regressions. File-only, no push/deploy/DB.

## (2) — continuation

Checked whether any OTHER dashboard page has the same top-level-vs-`data.tenant`-nested consumption bug against `/api/settings` — grepped all 6 consumers (listed above), only `dashboard/websites/page.tsx` had it. No third instance found; nothing further to continue on this specific bug.

## (3) — gap/fluidity kept current

Carried-forward NOTICED items unchanged from last round:
1. `tenant_domains` DELETE/reactivate gap — still open, still gated on Jeff's product call.
2. `lib/tenant-schema.ts` — still confirmed dead code.
3. `platformFallback` compliance question (JEFF-MORNING-QUEUE.md) — still open.
4. `bookings/batch/route.ts`'s platform-fallback anomaly — still gated on #3.
5. `finance/upload/route.ts`'s MIME gap — fixed elsewhere (`p1-w4`, commit `5af092d2`), pending merge into `p1-w2`. No change.

NEW this round: none deferred — the finding above was fixed in-round.

## MISSING-FEATURE GAPS / UX-FRICTION

Nothing new this round.
