# W2 gap/fluidity refresh — 2026-07-17 14:06

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-indexnow-domain-fallback-gap-2026-07-17-1354.md`.

Leader's fresh 3-deep queue this round (14:00 LEADER->W2): (1) pick one of the 6 remaining candidates (tenant-sitemap/campaigns-generate/broadcast-guidelines/onboarding-gate-verify/tenant-schema/phone-fixup) for the next clean fix. (2) continue fresh-ground hunting after that. (3) keep gap/fluidity current.

## (1) Fresh-ground — eighth mirror of the resolver-precedence class

Picked `GET /api/tenant-sitemap/route.ts` off last round's 6-item carry-forward list — highest live SEO blast radius of the six (same class as the IndexNow fix, and confirmed live: middleware's custom-domain routing rewrites the apex `/sitemap.xml` request to this exact route for every tenant not in `TENANTS_WITH_RICH_SITEMAP`).

`GET /api/tenant-sitemap` — the per-tenant XML sitemap generator built `baseUrl` from `tenant.domain` directly (legacy column only), never consulting `tenant_domains`, before falling back to `website_url` then the platform subdomain.

**Blast radius:** live today for any tenant reached via a custom domain that lives only in `tenant_domains` (the normal state — admin/websites writes tenant_domains only, never tenants.domain) and isn't in the small `TENANTS_WITH_RICH_SITEMAP` allowlist. Confirmed the request path in `middleware.ts`: `getTenantByDomain(cleanHost)` resolves the tenant correctly off the real custom domain and rewrites `/sitemap.xml` → `/api/tenant-sitemap?slug=<slug>`, but the route itself then emitted every `<loc>` on the *wrong* host (falling through to `website_url` or the `<slug>.homeservicesbusinesscrm.com` platform subdomain) even though the request that fetched the sitemap arrived on the tenant's correct custom domain. Search engines crawling that sitemap would be pointed at URLs on a domain that either doesn't serve the tenant's site at all or duplicates content under the platform subdomain — a real indexing/canonicalization defect, same SEO-signal class as the IndexNow bug fixed last round.

**Fixed:** resolve via `getPrimaryTenantDomain(tenant.id)` first, `tenants.domain` fallback — same precedence as `tenantSiteUrl()`/`resolveOrigin()`/`getAgentConfig()`'s other callers. Kept the existing `website_url` → platform-subdomain fallback chain unchanged below that (this route's own established precedence, unlike indexnow which intentionally errors with no such fallback).

**New test file** `route.domain-fallback.test.ts` (5 cases): tenant_domains-PRIMARY-wins-over-null-tenants.domain, tenants.domain-fallback-when-no-active-tenant_domains-row, website_url-fallback-when-neither-domain-source-resolves, platform-subdomain-fallback-when-nothing-resolves, wrong-tenant probe (two tenants each with their own tenant_domains PRIMARY row, confirms tenant A's sitemap never contains tenant B's domain and vice versa). Mutation-verified: reverted the route.ts diff via `git apply -R`, 2 of the 5 new tests went RED for the right reason (the tenant_domains-PRIMARY-wins case and the wrong-tenant-probe both failed on the domain assertion; the tenants.domain-fallback, website_url-fallback, and platform-subdomain-fallback cases stayed green on revert, as expected since those paths were unchanged); reapplied, all 5 green.

**NOTICED:** none new this round from this fix — clean mirror, no design-decision-shaped side findings.

## (2) Fresh-ground hunting beyond the known list — one new real finding, rest ruled out

Grepped every remaining `tenant.domain`/`tenant?.domain` read site not already covered by prior rounds. 18 files matched; the majority are prior rounds' already-fixed call sites (`messaging/brand.ts`, `selena/agent-config-loader.ts`, `selena/agent.ts`, `site-readiness.ts`'s `resolveOrigin()`, `seo/backlinks.ts`, `site-export/route.ts`, `selena-legacy-email.ts` — already triaged last round as dead code) or this round's fix (`tenant-sitemap`). Investigated every not-yet-triaged remainder:

- **`src/app/api/documents/[id]/send/route.ts`, `.../public/[token]/sign/route.ts`, `src/app/api/invoices/[id]/send/route.ts`, `.../public/[token]/checkout/route.ts`, `src/app/api/quotes/[id]/send/route.ts`, `.../public/[token]/deposit-checkout/route.ts`** — false positive for the URL/`baseUrl` construction in all six: every one already calls `tenantSiteUrl({ id, domain, slug })`, which internally resolves `tenant_domains` first. Correct, matches this session's pattern exactly.
- **`src/app/api/referrers/[code]/route.ts`** — false positive. Already resolves `tenant_domains` (primary flag, else first active row) before falling back to `tenants.domain` — this is in fact the file `domains.ts`'s own doc comment on `getPrimaryTenantDomain()` cites as one of the precedents this whole bug class's fix pattern is modeled on.
- **`src/app/api/tenant/public/route.ts` — REAL FINDING, not fixed this round.** Returns `domain: tenant.domain || null` (raw column, no tenant_domains resolution) in its public tenant-branding payload. Traced every consumer of this endpoint's `domain` field: `src/app/dashboard/users/page.tsx:60` uses it to build a team-login-link the dashboard owner can copy/share (`https://${t.domain}/fullloop`) — for a tenant_domains-only tenant, `t.domain` is null, so `loginUrl` never gets set, the copyable-link UI block doesn't render at all (`{loginUrl && (...)}`), and the placeholder text `<your-domain>/fullloop` shows in its place. This is a live, user-facing dashboard feature silently broken for any tenant in the normal (tenant_domains-only) state — worth prioritizing on the candidate list below since it's UI-visible (an admin actively looking for their login link to share) rather than a background SEO signal.
- **`src/app/api/documents/[id]/send/route.ts:82`, `.../sign/route.ts:258,472`, `src/app/api/invoices/[id]/send/route.ts:56`, `src/app/api/quotes/[id]/send/route.ts:63`** — same-shape-but-different-bug finding, flagging as NOTICED not fixed: these four call sites construct a fallback sender address as `` `docs@${tenant.domain || 'fullloopcrm.com'}` `` / `` `invoices@${tenant.domain || ...}` `` / `` `quotes@${tenant.domain || ...}` `` inline, instead of using the codebase's established `tenantSender()` helper (`src/lib/email.ts`), which never constructs an address on the tenant's own domain at all — it falls back to an identified `<slug>@fullloopcrm.com` address specifically because Resend requires the sending domain to be verified in that Resend account, and a tenant's arbitrary custom domain (whether sourced from `tenants.domain` or `tenant_domains`) is not necessarily verified there. Swapping these four to resolve through `tenant_domains` would NOT clearly fix real behavior the way the URL-host mirrors did — the underlying issue is these four routes reinvented a fallback instead of reusing `tenantSender()`, and either fallback (old-column or tenant_domains) likely produces an address Resend will reject/bounce when `email_from` isn't set. Different bug shape from this session's resolver-precedence class; not this round's fresh-ground track. Real enough to flag for a deliberate look, not blind-fixed.

No other new live bug surfaced this round.

## (3) NOTICED — not fixed, flagging for the leader/Jeff

**New this round:**
- `src/app/api/documents/[id]/send/route.ts`, `.../public/[token]/sign/route.ts`, `src/app/api/invoices/[id]/send/route.ts`, `src/app/api/quotes/[id]/send/route.ts` — four inline `docs@`/`invoices@`/`quotes@${tenant.domain || 'fullloopcrm.com'}` sender-address fallbacks bypass the established `tenantSender()` helper; likely constructs an unverified-in-Resend From address whenever `tenant.email_from` isn't set, regardless of which domain column feeds it. Different bug shape from this session's tenant_domains class — flagging for a deliberate call, not blind-fixed.

Carried forward unchanged from prior rounds: `selena-legacy-email.ts`'s dead-code finding (items 1-30 plus that one, unchanged).

## MISSING-FEATURE GAPS

Carried forward unchanged from the prior round's list, items 1-26 (gap #18 stays open on `reviews/request`, unchanged, still Jeff's product call). Item #28 (dead neighborhood-attribution feature) still straddles both tracks per last round's note. The admin/websites PATCH/DELETE observation carried forward unnumbered, still not promoted to a formal gap.

## UX-FRICTION

Carried forward unchanged from the prior round's list.

## Remaining candidates, not yet fixed (fresh ground for a future round)

One clean fix per round has been this session's cadence. Remaining 5 from last round's triage plus 1 new finding this round:

- **`src/app/api/tenant/public/route.ts`** — NEW this round, promote to top of queue: `domain` field is raw `tenant.domain`, no tenant_domains resolution, feeds `dashboard/users/page.tsx`'s team-login-link UI which silently fails to render for tenant_domains-only tenants. UI-visible, not just a background SEO signal — recommend leader picks this one next.
- `src/app/api/admin/campaigns/generate/route.ts` — marketing campaign generator's `bookUrl`, `tenant.domain` only. Admin-triggered tool, could embed a wrong-brand link in generated ad copy.
- `src/app/api/admin/broadcast-guidelines/route.ts` — team portal URL in an admin broadcast, `tenant.domain` only. Internal-facing (team members, not customers).
- `src/lib/onboarding-gate.ts` / `src/lib/onboarding-verify.ts` — onboarding-completion checks reference `tenant.domain`/`domain_name` directly, no tenant_domains consulted. Not yet investigated deeply enough to say if it's a real bug or an intentional check against the column admin/websites' own onboarding step writes.
- `src/lib/tenant-schema.ts` — JSON-LD structured-data helpers use `tenant.website_url` only (not `domain` or `tenant_domains`) for schema.org markup on the tenant's own site. SEO impact if `website_url` is unset but a domain lives in `tenant_domains`.
- `src/app/api/cron/phone-fixup/route.ts` — scoped to the legacy nycmaid-only `cleaners` table per its own doc comment, essentially zero live blast radius outside nycmaid (which already has its domain set directly). Lowest priority.

None fixed this round beyond (1) — flagging as the fresh-ground queue for a subsequent pass.

## Verification this round

- `npx tsc --noEmit` clean, repo-wide.
- `npx vitest run` — full repo suite: **591 test files, 2582 tests passed, 37 skipped, 0 failed**.
- Mutation-verified via `git apply -R` / reapply on the route.ts diff — 2/5 new tests went RED for the right reason on revert, all 5 green after reapply.
- File-only, no push/deploy/DB write.
