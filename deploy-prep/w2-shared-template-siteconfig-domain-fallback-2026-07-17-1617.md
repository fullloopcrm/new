# W2 gap/fluidity refresh — 2026-07-17 16:17

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-schedule-monitor-terminated-employee-gap-2026-07-17-1610.md`.

## Flagging first: this appears to be a stale re-dispatch of an already-completed order

My driver started this session with the LEADER order text "15:53 LEADER->W2: Fresh 3-deep queue... (1) genuinely new feature surface per your own 15:25 recommendation -- SEO/content generation routes... or scheduling/dispatch algorithms, your call, pick one untouched tonight. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current." That is word-for-word the same order already logged in the channel at 15:53 and already reported DONE at **16:07 W2->LEADER** (commits `0b5f56dd`/`e352716d` — schedule-monitor terminated-employee detection gap). I did not re-do that work; it's already committed and reported. Treating this session as a genuine continuation rather than a duplicate, since I found real additional ground below that the 16:07 pass didn't reach (see next section) — flagging the redispatch itself so it doesn't read as me claiming fresh credit for already-reported work.

## Real gap in the 16:07 pass's own scoping claim

The 16:07 report said SEO/content-gen's domain-fallback resolver-precedence class was "already exhausted" and cited `auto-verify.ts`/`backlinks.ts` (both under `src/lib/seo/*`) as proof, then pivoted to scheduling/dispatch on that basis. That scoping check only covered `src/lib/seo/*` (~30 files, the SEO *automation engine* — alerts/backlinks/competitors/health/onboarding/etc.). It never looked at `src/app/site/template/_config/load.ts` — a completely different directory, the shared marketing-template's own per-request `SiteConfig` loader (`getSiteConfig()`). That's the actual "content generation route" surface the order named (blog, service pages, sitemap) — the automation lib and the template's config loader are two different consumers of tenant-domain data that happen to share a directory name ("seo") in one case but not the other.

**Real bug found and fixed**: `getSiteConfig()`'s domain resolution was `str(tenant, 'domain') ?? str(tenant, 'domain_name')` — read straight off the `tenants` row from `getTenantFromHeaders()`, never consulting `tenant_domains`. `identity.url` (the value this produces) is the canonical URL, OpenGraph URL, and JSON-LD `url` for every page the shared template renders — home, blog index + every blog post, services index + every service page, every area/neighborhood page, about/faq/pricing/careers/reviews/legal, and `sitemap.xml`'s own `BASE_URL`. Per the established pattern elsewhere in this codebase (admin/websites writes `tenant_domains` only, never `tenants.domain`), any template tenant with an active custom domain living only in `tenant_domains` and no `website_url` set fell through domain/domain_name (both null) straight to the neutral `defaultConfig.identity.url` — literally `https://example.com` — as the canonical/OG/JSON-LD origin across its *entire* site, and as the base for every sitemap URL. Same bug class as the 18 prior resolver-precedence mirrors this session/lane, just in a surface nobody had checked: the template's own config loader, not any of the SEO lib/automation files.

**Fix**: added `getPrimaryTenantDomain(tenantId)` ahead of the legacy `domain`/`domain_name` columns in `getSiteConfig()`'s domain resolution — same precedence as `tenantSiteUrl()`/`resolveOrigin()`'s other callers. `website_url`'s existing higher priority (an explicit admin-set override) is untouched; only the domain-lookup step itself gained the missing `tenant_domains` check. Also de-duplicated 2 redundant `str(tenant, 'id')` calls into the `tenantId` var this fix already introduces (minor, same-file cleanup, not a separate change).

## Continue pass — checked for the same gap elsewhere in the content-gen surface

- Grepped all of `src/app/site/*` (every bespoke, forked-per-tenant site, not just `template/`) for direct `tenant.domain` reads outside `template/` — zero hits. The bespoke tenant sites hardcode their own domain as a literal string (pre-dating any dynamic tenant-row resolution), so they're not exposed to this bug class at all — different risk profile, not a second instance.
- `src/lib/seo/tenant-sitemap.ts`, `api/tenant-sitemap/route.ts`, `src/lib/seo/backlinks.ts`, `auto-verify.ts`, `onboarding.ts`, `ingest.ts`, `health.ts` — re-confirmed (not re-fixed) all already carry the correct `tenant_domains`-first precedence with explicit comments citing it. Genuinely already closed, matches the 16:07 report's claim for that subset.
- `getAreaByUrlSlug`/`getNeighborhoodByUrlSlug` (checked while reading `[slug]/page.tsx` for context) do exact `===` matching against `urlSlug` — ruled out as a false-lead alias-mismatch candidate; a match guarantees `slug === area.urlSlug`, so the canonical-tag construction there is safe.

No second bug found in this continue pass.

## Verification this round

- New test file `src/app/site/template/_config/load.domain-fallback.test.ts` — 5 tests: tenant_domains-primary wins, falls back to `tenants.domain`, falls back to `domain_name`, falls back to the neutral default only when all four sources are empty, and a wrong-tenant probe (tenant B's `tenant_domains` row never leaks into tenant A's `identity.url`). All 5 pass.
- `npx tsc --noEmit`: 0 errors.
- Full suite: 603/603 test files, 2643/2680 tests passed, 37 skipped, 0 failed, 0 regressions.

File-only, no push/deploy/DB.
