# W2 gap/fluidity refresh — 2026-07-17 13:54

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-post-job-followup-review-link-domain-fallback-gap-plus-archetype-depth-2026-07-17-1355.md`.

Leader's fresh 3-deep queue this round (13:51 LEADER->W2): (1) pick one of the 7 freshly-triaged tenant.domain-only sites for the next clean fix. (2) continue fresh-ground hunting after that. (3) keep gap/fluidity current.

## (1) Fresh-ground — seventh mirror of the resolver-precedence class

Picked `POST /api/indexnow/route.ts` off last round's 7-item triage list (indexnow was first in that list, lowest-effort of the remaining candidates since the handler already fetches the `tenants` row and only needed the domain resolution swapped).

`POST /api/indexnow` — the per-tenant IndexNow instant-indexing submission handler (Bing/Yahoo/DuckDuckGo/Yandex ping) built its `host`/`keyLocation` from `tenant.domain` directly, the legacy column only, never consulting `tenant_domains`.

**Blast radius:** live today, any time a tenant or the cron path submits URLs for indexing. A tenant whose real custom domain lives only in `tenant_domains` (the normal state) had every IndexNow ping submitted for the wrong host — and worse, the `keyLocation` ownership-verification URL (`https://${host}/api/indexnow?key=...`) pointed at a host that would never resolve back through this same route's own GET handler (which resolves the tenant from the request host via `getTenantFromHeaders()`), so the search engine's verification fetch would 404 against the wrong domain. SEO-signal impact, not customer-facing, so lower urgency than the SMS-link mirrors fixed earlier this session — but a real functional break for any tenant in the normal (tenant_domains-only) state, not just wrong-brand cosmetics.

**Fixed:** resolve via `getPrimaryTenantDomain(tenantId)` first, `tenants.domain` fallback — same precedence as `tenantSiteUrl()`/`resolveOrigin()`'s other callers. Did not route through `tenantSiteUrl()` itself since that helper also falls back to the `<slug>.homeservicesbusinesscrm.com` subdomain, which isn't the right final fallback here (IndexNow key ownership is verified per real domain, not the platform subdomain) — this route already errors when no domain resolves at all, which is the correct behavior for this call site.

**New test file** `route.domain-fallback.test.ts` (4 cases): tenant_domains-PRIMARY-wins-over-null-tenants.domain, tenants.domain-fallback-when-no-active-tenant_domains-row, errors-when-neither-resolves, wrong-tenant probe (two tenants each with their own tenant_domains PRIMARY row, confirms tenant A's submission never contains tenant B's domain and vice versa). Mutation-verified: reverted the route.ts diff via `git apply -R`, 2 of the 4 new tests went RED for the right reason (fallback case and wrong-tenant-probe's tenant-A assertion both failed — the pre-existing-behavior test and the errors-when-neither-resolves test stayed green on revert, as expected since those paths were unchanged); reapplied, all 4 green.

**NOTICED:** none new this round from this fix — clean mirror, no design-decision-shaped side findings.

## (3) NOTICED — not fixed, flagging for the leader/Jeff

Carried forward unchanged from the prior round (items 1-30). No new items this round.

## MISSING-FEATURE GAPS

Carried forward unchanged from the prior round's list, items 1-26 (gap #18 stays open on `reviews/request`, unchanged, still Jeff's product call). Item #28 (dead neighborhood-attribution feature) still straddles both tracks per last round's note. The admin/websites PATCH/DELETE observation carried forward unnumbered, still not promoted to a formal gap.

## UX-FRICTION

Carried forward unchanged from the prior round's list.

## Remaining candidates from last round's sweep, not yet fixed (fresh ground for a future round)

One clean fix per round has been this session's cadence. Remaining 6 from last round's triage, unchanged:

- `src/app/api/tenant-sitemap/route.ts` — sitemap.xml generation, `tenant.domain` then `website_url` then subdomain, no tenant_domains. SEO impact (search engines see the wrong canonical host in tenant's own sitemap).
- `src/app/api/admin/campaigns/generate/route.ts` — marketing campaign generator's `bookUrl`, `tenant.domain` only. Admin-triggered tool, could embed a wrong-brand link in generated ad copy.
- `src/app/api/admin/broadcast-guidelines/route.ts` — team portal URL in an admin broadcast, `tenant.domain` only. Internal-facing (team members, not customers).
- `src/lib/onboarding-gate.ts` / `src/lib/onboarding-verify.ts` — onboarding-completion checks reference `tenant.domain`/`domain_name` directly, no tenant_domains consulted. Not yet investigated deeply enough to say if it's a real bug or an intentional check against the column admin/websites' own onboarding step writes.
- `src/lib/tenant-schema.ts` — JSON-LD structured-data helpers use `tenant.website_url` only (not `domain` or `tenant_domains`) for schema.org markup on the tenant's own site. SEO impact if `website_url` is unset but a domain lives in `tenant_domains`.
- `src/app/api/cron/phone-fixup/route.ts` — scoped to the legacy nycmaid-only `cleaners` table per its own doc comment, essentially zero live blast radius outside nycmaid (which already has its domain set directly). Lowest priority of the six.

None fixed this round — flagging as the fresh-ground queue for a subsequent pass. Next task this round per leader's queue item (2): continue fresh-ground hunting beyond this list.

## Verification this round

- `npx tsc --noEmit` clean, repo-wide.
- `npx vitest run` — full repo suite: **590 test files, 2577 tests passed, 37 skipped, 0 failed**.
- Mutation-verified via `git apply -R` / reapply on the route.ts diff — 2/4 new tests went RED for the right reason on revert, all 4 green after reapply.
- File-only, no push/deploy/DB write.
