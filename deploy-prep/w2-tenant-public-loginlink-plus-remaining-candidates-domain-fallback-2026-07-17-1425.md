# W2 gap/fluidity refresh — 2026-07-17 14:25

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-tenant-sitemap-domain-fallback-gap-2026-07-17-1406.md`.

Leader's fresh 3-deep queue this round (14:09 LEADER->W2): (1) fix the promoted `/api/tenant/public` finding. (2) pick from the 5 remaining resolver-precedence candidates or continue fresh-ground. (3) keep gap/fluidity current.

## (1) Ninth mirror — the promoted `/api/tenant/public` finding

`GET /api/tenant/public` returned `domain: tenant.domain || null` (raw column, no `tenant_domains` resolution) in its public tenant-branding payload. Last round traced this to `src/app/dashboard/users/page.tsx:60`, which uses it to build a copyable operator team-login-link (`https://${t.domain}/fullloop`) — for a tenant_domains-only tenant, `t.domain` was null, so the login-link UI block silently never rendered (`{loginUrl && (...)}`), leaving only placeholder text. UI-visible, not a background SEO signal.

**Fixed:** resolve via `getPrimaryTenantDomain(tenant.id)` first, `tenants.domain` fallback — same precedence as `tenantSiteUrl()`'s other callers. Checked every other consumer of this route (`portal/collect`, `unsubscribe`, `site/apply`, `site/feedback`, `reviews/submit`) — none of them read the `domain` field, so no other behavior changes.

**New test file** `route.domain-fallback.test.ts` (4 cases) incl. a wrong-tenant probe. Mutation-verified: `git apply -R` sent 2/4 RED for the right reason (domain-fallback + wrong-tenant-probe), reapplied, all 4 green. tsc clean, full suite green (592 files, 2586 passed). Committed `a6517452`.

## (2) Tenth through thirteenth mirrors — closed the remaining 5-item carry-forward list (one ruled out as dead code)

Worked through last round's remaining candidate list in order:

- **`POST /api/admin/broadcast-guidelines`** — team-login portal URL texted to every active team member via SMS (`notify()`) was `tenant.domain ? https://${tenant.domain}/team : '/team'`. For a tenant_domains-only tenant this fell to a bare `/team` relative path baked into an SMS body — a dead link outside a browser tab already on the tenant's site (SMS clients don't resolve relative paths at all). Fixed via `tenantSiteUrl({ id, domain, slug })`.
- **`POST /api/admin/campaigns/generate`** — the AI-generated "Book Now" CTA embedded in customer-facing marketing email/SMS copy was `tenant.domain ? https://${tenant.domain}/book : '/book'`. Same defect shape, worse blast radius: a relative `/book` href inside a marketing email is a dead link in every mail client. Fixed via `tenantSiteUrl()`.
- **`GET /api/cron/phone-fixup`** — legacy nycmaid-only `cleaners`-table cron (per its own doc comment, a no-op for all fullloop tenants on the `team_members` model). Below the existing `website_url`-first precedence, it fell straight to `tenant.domain ? https://${tenant.domain} : null`, never consulting `tenant_domains`, before the final hardcoded `https://www.thenycmaid.com` default. Lowest real blast radius of the five (scoped to whichever tenants still use the `cleaners` table), but a genuine mirror of the same defect shape — fixed by slotting `getPrimaryTenantDomain()` in below `website_url`, above `tenants.domain`. `website_url`'s existing top precedence is unchanged, verified by a dedicated test case.
- **`lib/onboarding-verify.ts` `runAllChecks()`** — real finding, higher-severity than expected walking in. DNS A/CNAME/MX + SSL checks (used by `POST /api/admin/businesses/[id]/verify-checklist`, which persists results straight into `tenants.dns_configured` and `setup_progress` — both surfaced back to the tenant on `dashboard/websites` as "DNS configured: Pending/Verified") ran against `tenant.domain || ''`. For a tenant_domains-only tenant, every DNS/SSL check ran against an empty string, always returning `{ok:false, detail:'No domain set'}`, and the route persists `dns_configured: checks.dns_a.ok && checks.dns_cname_www.ok` on **every** verify run — so this silently overwrote a previously-correct state back to `false` each time an admin clicked "verify" for a tenant whose real custom domain was live and correctly registered, entirely because it lived in `tenant_domains` instead of the legacy column. Fixed by resolving through `getPrimaryTenantDomain()` first, `tenants.domain` fallback, before the DNS/SSL batch runs.
- **`lib/onboarding-gate.ts` `runOnboardingGate()`** — real finding, gates actual tenant activation. The SITE stage's `host` (`tenant?.domain || tenant?.domain_name || slug-subdomain`) also gates the LEAD stage (`ok: !!host && !leadErr`), and `passed = stages.every(...)`. `runOnboardingGate` is called from `activate-tenant.ts`, `tenant-readiness.ts`, `site-readiness.ts`, and `onboarding-tasks.ts` — i.e. this is a real gate on the onboarding→active flip, not just a diagnostic. A tenant_domains-only tenant with a live, correctly-registered custom domain failed both the SITE and LEAD stages here, which could block activation despite the tenant's site being fully live and reachable. Fixed by resolving through `getPrimaryTenantDomain()` first, `tenants.domain`/`domain_name` fallback.
- **`lib/tenant-schema.ts` — RULED OUT as dead code, not fixed.** Its schema.org LocalBusiness/Service/JobPosting URL builders use `tenant.website_url || <slug>.homeservicesbusinesscrm.com` — never `tenant.domain` or `tenant_domains` at all, so on the surface this looked like the same defect shape (SEO-impact, wrong-host structured data for a tenant_domains-only tenant with no `website_url` set). Grepped every import of `@/lib/tenant-schema` across the repo: **zero callers, anywhere.** `tenantLocalBusinessSchema`, `tenantServiceSchema`, `tenantJobPostingSchema`, `tenantFAQSchema`, `tenantBreadcrumbSchema`, `tenantWebPageSchema`, `tenantAggregateRatingSchema`, and `generateTenantFAQs` are all exported and unused. No live behavior to fix — noting as a dead-code candidate alongside last round's `selena-legacy-email.ts` finding, not fixing (out of this bug class's fresh-ground track, and fixing dead code has no verifiable behavior change).

**New test files** (4, one per real fix): `broadcast-guidelines/route.domain-fallback.test.ts` (3 cases), `campaigns/generate/route.domain-fallback.test.ts` (3 cases), `cron/phone-fixup/route.domain-fallback.test.ts` (4 cases incl. website_url-precedence-preserved), `lib/onboarding-verify.domain-fallback.test.ts` (4 cases), `lib/onboarding-gate.domain-fallback.test.ts` (4 cases) — 18 total, each set incl. a wrong-tenant probe.

**Regression caught and fixed in the same pass:** the pre-existing `campaigns/generate/route.rbac.test.ts` didn't mock `@/lib/supabase` at all (that route previously had no DB dependency in its POST handler). Adding `getPrimaryTenantDomain()` gave it one, and the unmocked call hit a real `fetch failed` network error under test, turning 3 previously-green permission-probe tests red (500 instead of 200/403). Root-caused via the mutation-verify pass on the reapplied fix (not initially — first full-suite run after commit 1 caught it) and fixed by adding a minimal `tenant_domains`-table `@/lib/supabase` mock to that file. Documented in the same commit as the 4 fixes to keep the regression fix traceable to what caused it.

Mutation-verified all 4 real fixes together: `git apply -R` on the combined route.ts/lib diff sent exactly the 10 domain-fallback + wrong-tenant-probe tests (2 per file × 5 files, incl. the `/api/tenant/public` fix's own file from item (1) was verified separately last commit) RED for the right reason; the 8 fallback/precedence-preserved tests stayed green on revert (unchanged code paths). Reapplied, all 18 green.

**NOTICED:** none new this round beyond the dead-code tenant-schema.ts note above and the regression fix (both already folded into this section).

## (3) NOTICED — not fixed, flagging for the leader/Jeff

**New this round:** `src/lib/tenant-schema.ts` — same tenant.domain-adjacent defect shape as `selena-legacy-email.ts` (last round's dead-code finding), but for `website_url`/schema.org markup instead of `tenant.domain`/email. Zero live callers anywhere in the repo. Worth a deliberate call on whether to wire it into `/site/template` pages (real SEO upside — LocalBusiness/Service/JobPosting structured data is a legitimate rich-results signal this codebase doesn't currently emit anywhere) or delete it, rather than leaving it as dead code indefinitely.

Carried forward unchanged from prior rounds: `selena-legacy-email.ts`'s dead-code finding, and the four inline `docs@`/`invoices@`/`quotes@${tenant.domain || 'fullloopcrm.com'}` sender-address fallbacks that bypass `tenantSender()` (flagged two rounds ago, different bug shape, not blind-fixed).

## MISSING-FEATURE GAPS

Carried forward unchanged from the prior round's list, items 1-26 (gap #18 stays open on `reviews/request`, unchanged, still Jeff's product call). Item #28 (dead neighborhood-attribution feature) still straddles both tracks per the earlier note. The admin/websites PATCH/DELETE observation carried forward unnumbered, still not promoted to a formal gap. New candidate this round (not yet a formal gap): should `tenant-schema.ts`'s structured-data helpers be wired into `/site/template` — real SEO upside currently left on the table (see NOTICED above).

## UX-FRICTION

Carried forward unchanged from the prior round's list.

## Remaining candidates, not yet fixed (fresh ground for a future round)

The known resolver-precedence carry-forward list is now fully closed (9 real mirrors fixed across this and prior rounds, 2 ruled out as dead code: `selena-legacy-email.ts`, `tenant-schema.ts`). No open candidates remain from the original triage. Next round should either:

- resume fresh-ground grepping for any `tenant.domain`/`tenant?.domain`/`domain_name` read site not yet triaged (the last two rounds' sweeps found the list was nearly exhausted — expect diminishing returns, may need to widen the search to `website_url`-only call sites like `tenant-schema.ts` turned out to be), or
- pick up one of the two carried-forward NOTICED items (dead-code disposition call on `selena-legacy-email.ts`/`tenant-schema.ts`, or the `tenantSender()` sender-address bypass) if the leader wants those converted from flagged to fixed.

## Verification this round

- `npx tsc --noEmit` clean, repo-wide (checked after both commits this round).
- `npx vitest run` — full repo suite: **597 test files, 2603 tests passed, 37 skipped, 1 failed** (`finance-export.test.ts`'s 200k-row pagination timeout — confirmed pre-existing/flaky, not caused by this round's changes: passes standalone in 1.8s, only times out under full-suite parallel load).
- Mutation-verified via `git apply -R` / reapply on both diffs this round — RED-for-the-right-reason confirmed each time (2/4 on the `/api/tenant/public` fix, 10/18 on the combined 4-fix batch), reapplied, all green.
- File-only, no push/deploy/DB write.
