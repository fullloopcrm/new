# W2 gap/fluidity refresh — 2026-07-17 13:55

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-tenant-domains-single-primary-invariant-plus-archetype-depth-2026-07-17-1335.md`.

Leader's fresh 3-deep queue this round (13:37 LEADER->W2): (1) continue project archetype depth. (2) continue fresh-ground hunting. (3) keep gap/fluidity current.

Before starting fresh work, caught up the prior round's report (13:36 W2->LEADER) which had landed in the working tree but not yet been committed — verified (tsc clean, full suite 588/588 files green) and committed as 3 commits (fix + sim probe + docs) matching the reported content exactly.

## (1) Fresh-ground — sixth mirror of the resolver-precedence class

`GET /api/cron/post-job-followup` — the review-request SMS sent to every customer 2 hours after their booking/job completes, across every active tenant — built its review link from `tenant.domain ? https://${tenant.domain}/reviews/submit : https://${tenant.slug}.homeservicesbusinesscrm.com/reviews/submit`. Legacy `tenants.domain` column only, never consulting `tenant_domains`. Duplicated identically across both the standalone-booking send path and the job-level send path in the same file.

**Blast radius:** live today, for every active tenant on every completed booking or job (2 send paths x every tenant). A tenant whose real custom domain lives only in `tenant_domains` (the normal state — admin/websites writes `tenant_domains` only, never `tenants.domain`) got their review-request SMS pointed at the internal `<slug>.homeservicesbusinesscrm.com` carrying subdomain instead of their own branded domain. Not a broken link (the subdomain is real and live-routed) but wrong-brand, in a customer-facing text, the same shape as the client-sms `brand.ts` bug fixed earlier this session — except this bug only fires when the tenant has NOT configured `settings.google_review_link` (which takes priority when set), so blast radius is narrower than brand.ts's but not zero.

**Fixed:** routed both call sites through the already-tested `tenantSiteUrl()` helper (`tenant_domains` PRIMARY → `tenants.domain` → slug subdomain), computed once per tenant per cron run rather than duplicated inline twice. DRY, same helper 5a-54's invoice/quote/document fix reused rather than reinventing resolution logic a sixth time.

**New test file** `route.domain-fallback.test.ts` (4 cases): tenant_domains-PRIMARY-wins-over-null-tenants.domain, slug-subdomain-fallback-when-neither-resolves, wrong-tenant probe (two tenants each with their own `tenant_domains` PRIMARY row, confirms tenant A's review SMS never contains tenant B's domain and vice versa), and a case confirming the job-level send path gets the same fix (not just the booking path). Mutation-verified: reverted the route.ts diff via `git apply -R`, 3 of the 4 new tests went RED for the right reason (missing domain, falling back to slug subdomain in every case — the 4th, the plain slug-subdomain-fallback test, stayed green on revert since that's the pre-existing behavior being preserved, not the bug being fixed); reapplied, all 10 tests in the directory (6 pre-existing + 4 new) green.

**NOTICED:** none new this round from this fix — clean mirror, no design-decision-shaped side findings.

## (2) Archetype depth — 5a-56

Added **5a-56** to `platform/scripts/sim-all-trades.ts` (after 5a-55, before `5b. CHANGE ORDER`). Unlike most prior probes in this series, this isn't re-proving `tenantSiteUrl()`/`getPrimaryTenantDomain()`'s precedence from scratch (5a-49 and 5a-54 already did that against the live schema) — it checks something none of the prior probes checked: post-job-followup.ts is the first caller in this class to string-concat a URL **path suffix** onto `tenantSiteUrl()`'s return value (`${await tenantSiteUrl(tenant)}/reviews/submit`) instead of using the bare resolved URL standalone. Seeds a real `tenant_domains` PRIMARY row, calls `tenantSiteUrl()` directly, and confirms the composed string matches the exact URL the cron route now sends — no double slash, no missing scheme — against the real live schema, not a mock.

**Leader: please run `SIM_ONLY=roofing npx tsx scripts/sim-all-trades.ts` (or a full run) to confirm 5a-56 (and the still-pending 5a-35 through 5a-55) pass before relying on them.**

## (3) NOTICED — not fixed, flagging for the leader/Jeff

Carried forward unchanged from the prior round (items 1-30). No new items this round.

## MISSING-FEATURE GAPS

Carried forward unchanged from the prior round's list, items 1-26 (gap #18 stays open on `reviews/request`, unchanged, still Jeff's product call). Item #28 (dead neighborhood-attribution feature) still straddles both tracks per last round's note. The admin/websites PATCH/DELETE observation from last round (an admin can add+primary a domain but never demote/deactivate one except by direct DB access) carried forward unnumbered, still not promoted to a formal gap.

## UX-FRICTION

Carried forward unchanged from the prior round's list.

## Remaining candidates swept this round, not yet fixed (fresh ground for a future round)

While hunting for this round's fix, grepped every remaining `tenant.domain`/`tenant.website_url`/`domain_name` read site not already covered by this session's prior rounds. Found several more candidates, triaged but not fixed this round (one clean fix per round has been this session's cadence):

- `src/app/api/indexnow/route.ts` — SEO ping to search engines, `tenant.domain` only, no tenant_domains fallback. Real gap, lower urgency (SEO indexing signal, not customer-facing).
- `src/app/api/tenant-sitemap/route.ts` — sitemap.xml generation, `tenant.domain` then `website_url` then subdomain, no tenant_domains. SEO impact (search engines see the wrong canonical host in tenant's own sitemap).
- `src/app/api/admin/campaigns/generate/route.ts` — marketing campaign generator's `bookUrl`, `tenant.domain` only. Admin-triggered tool, could embed a wrong-brand link in generated ad copy.
- `src/app/api/admin/broadcast-guidelines/route.ts` — team portal URL in an admin broadcast, `tenant.domain` only. Internal-facing (team members, not customers).
- `src/lib/onboarding-gate.ts` / `src/lib/onboarding-verify.ts` — onboarding-completion checks reference `tenant.domain`/`domain_name` directly, no tenant_domains consulted. Worth checking whether this ever gates a tenant's onboarding status incorrectly — not yet investigated deeply enough to say if it's a real bug or an intentional check against the column admin/websites' own onboarding step writes.
- `src/lib/tenant-schema.ts` — JSON-LD structured-data helpers use `tenant.website_url` only (not `domain` or `tenant_domains`) for schema.org markup on the tenant's own site. SEO impact if `website_url` is unset but a domain lives in `tenant_domains`.
- `src/app/api/cron/phone-fixup/route.ts` — `website_url`/`domain` fallback, but scoped to the legacy nycmaid-only `cleaners` table per its own doc comment ("tenants without cleaners table data... get empty queries and are no-ops here") — essentially zero live blast radius outside nycmaid, which already has its domain set directly. Lower priority, similar shape to the already-triaged SELENA Q4-gated landmine.

None fixed this round — flagging as the fresh-ground queue for a subsequent pass rather than batching multiple unrelated fixes into one commit.

## Verification this round

- `npx tsc --noEmit` clean, repo-wide (both the fix and the sim probe addition).
- `npx vitest run` — full repo suite: **589 test files, 2573 tests passed, 37 skipped, 0 failed**.
- `npx eslint` on touched files: 0 new warnings (1 pre-existing `_opts` unused-var warning, confirmed present in the sibling test file this new one was patterned after, not introduced by this round).
- Mutation-verified via `git apply -R` / reapply on the route.ts diff — 3/4 new tests went RED for the right reason on revert, all 10 green after reapply.
- File-only, no push/deploy/DB write. `sim-all-trades.ts`'s 5a-56 probe is prepared but not executed by this worker — leader-run-only, per standing convention.
