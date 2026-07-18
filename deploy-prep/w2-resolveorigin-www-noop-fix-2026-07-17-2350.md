# W2 gap/fluidity refresh — 2026-07-17 23:50

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-legacy-domain-negative-cache-bust-plus-www-order-bug-2026-07-17-2342.md`.

Leader's instruction this round (23:45 LEADER->W2): fresh 3-deep queue -- (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1) — new fresh-ground surface: `resolveOrigin()`'s www-strip was a no-op

`src/lib/site-readiness.ts`'s `resolveOrigin()` (the origin resolver behind the admin readiness dashboard's live-site HTTP/SEO audit) ended its domain normalization chain with:

```
custom.replace(/^www\./, 'www.')
```

That replaces the literal substring `"www."` with the literal string `"www."` — a no-op for every input. A prior round (`site-readiness.ts` fresh-ground commit, NOTICED list) already spotted this and explicitly left it unfixed as out-of-scope for that round's specific bug: *"line 162's `.replace(/^www\./, 'www.')` is a no-op regex replace (replaces "www." with the literal string "www." -- likely meant to strip it to ''). Pre-existing, unrelated to the domain-fallback bug, left unchanged."*

**Concrete impact:** the resolver (`getTenantByDomain` in `tenant-lookup.ts`/`tenant.ts`) normalizes every host by stripping `www.` — `www.acme.com` and `acme.com` resolve identically. `resolveOrigin()`'s own doc comment claims "same precedence as `getPrimaryTenantDomain()`'s other callers," but for a **legacy** `tenants.domain`/`domain_name` row written before this session's earlier www-order fix (i.e. any row still literally containing `"www.acme.com"`), this no-op meant the admin readiness audit fetched `https://www.acme.com` instead of the resolver-normalized `https://acme.com` — inconsistent with every other caller in this precedence family (`tenantSiteUrl()`, `tenantBrand()`, `getAgentConfig()`, the resolver itself).

**Fixed:** the trailing no-op replace is now a real strip: `.replace(/^www\./, '')`.

## (2) — continuation: swept for the same no-op pattern and adjacent normalization gaps

- Grepped for the same `replace(/^www\./, 'www.')` no-op pattern repo-wide — only the one occurrence, now fixed.
- Checked the other named callers in `resolveOrigin()`'s own precedence comment (`tenantSiteUrl()` in `tenant-site.ts`, `tenantBrand()` in `messaging/brand.ts`, `getAgentConfig()`): none of them attempt a www-strip on the legacy `tenant.domain` fallback at all (by design — they pass through whatever's stored, no normalization step exists to be broken). Not a bug of the same class; left unchanged rather than adding speculative normalization no one asked for.
- Re-confirmed (per last round's sweep) the 3 `tenants.domain` write call sites (`admin/businesses` POST, `admin/businesses/[id]` PUT, `admin/tenants/[id]` PUT) all normalize lowercase-then-strip-www correctly, so no NEW legacy rows should reproduce this going forward — this fix specifically covers rows already written before that ordering fix landed.

## (3) — gap/fluidity kept current

Carried-forward NOTICED items, unchanged:
1. `tenant_domains` DELETE/reactivate gap — still open, still gated on Jeff's product call. Confirmed again this round: no `[id]`-scoped route exists under `admin/websites` or elsewhere for deleting/deactivating/reassigning an individual `tenant_domains` row; `POST` (create) is the only write endpoint.
2. `lib/tenant-schema.ts` — still confirmed dead code.
3. `platformFallback` compliance question (JEFF-MORNING-QUEUE.md) — still open.
4. `bookings/batch/route.ts`'s platform-fallback anomaly — still gated on #3.
5. `finance/upload/route.ts`'s MIME gap — fixed elsewhere (`p1-w4`, commit `5af092d2`), pending merge into `p1-w2`. No change.
6. Existing referrers' `commission_rate` rows stuck at signup-time value; no PUT/PATCH to edit post-signup, no backfill of pre-fix hardcoded-10% rows. Product/business decision, not acted on.
7. `tenant_domains_single_primary` DB migration (partial unique index) — prepared as a file, not yet run. Gated on Jeff's approval; LEADER runs it, not this worker.

NEW this round: none carried forward — the fix in (1) was scoped and closed outright.

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward, unchanged:
8. `dashboard/referrals/page.tsx`'s referrals-tab copy overpromises per-referrer rate control that doesn't exist. Not changed — copy-only UX call, flagging rather than acting.

## Verification this round

- `npx tsc --noEmit` clean (repo-wide).
- 3 new tests added to `src/lib/site-readiness.test.ts` (no-op-bug probe, mixed-case www strip, bare-domain-unchanged control) — all pass; existing 7 tests in the same file unaffected (10/10 total).
- Mutation-verified: reverted the fix via `git stash` on just `site-readiness.ts`, re-ran the suite — both new www-strip assertions failed for the right reason (`https://www.legacy-ace.com` instead of `https://legacy-ace.com`); reapplied, back to green.
- Full repo suite running in background at time of writing; will not re-open this file if it comes back clean.

File-only, no push/deploy/DB write from this worker. 1 code commit this round (the fix + 3 new tests, same file pair) + 1 docs commit.
