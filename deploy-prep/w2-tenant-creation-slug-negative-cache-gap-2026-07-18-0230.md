# W2 gap/fluidity refresh — 2026-07-18 02:30

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-signup-default-entity-plus-activate-tenant-bypass-2026-07-18-0210.md`.

Leader's instruction this round (02:16 LEADER->W2): "Good closure on the masked-error/duplicated-helper fix, and correctly did NOT wire activateTenant() blind into the self-serve signup path given the unverified schema conflict -- logged to JEFF-MORNING-QUEUE.md for Jeff's call, and flagged to him directly. Fresh 3-deep queue (file-only, no push/deploy/DB each): (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current."

## (1) — new fresh-ground surface: neither tenant-creation path ever busts its OWN new tenant's negatively-cached slug

**Bug found:** `tenant-lookup.ts`'s `getTenantBySlug()` negatively caches a "no tenant" result for the full 5-minute TTL on any miss — a bot/crawler scanning `*.fullloopcrm.com` wildcard subdomains, an admin previewing a proposed URL before conversion, or a prior failed conversion attempt reusing the same business name. `invalidateTenantCache()` cannot reach that entry: it only sweeps POSITIVE cache entries, matched by tenant id, and a negative entry (`tenant: null`) has none. `invalidateSlugCache(slug)` exists specifically to close this exact window — its own doc comment in `tenant-lookup.ts` already generalizes the problem beyond "just-deleted tenant" to "a slug that resolved to 'no tenant' even once" — and it's wired into the tenant DELETE path (`admin/businesses/[id]/route.ts`), but was never wired into either tenant-creation path:

- `create-tenant-from-lead.ts`'s `createTenantFromLead()` — the shared path both the paid-proposal webhook (`webhooks/stripe-platform/route.ts`) and the manual/comp admin conversion (`admin/requests/convert/route.ts`) funnel through.
- `webhooks/stripe/route.ts`'s Full Loop self-serve signup branch — its own inline `tenants` insert (not routed through the shared helper).

Concretely: a brand-new tenant's own subdomain — the URL the welcome email tells the paying customer to visit — could resolve to "no tenant" on a warm edge isolate for up to the rest of the TTL immediately after signup/conversion reports success, if that exact slug was ever missed before. `activateTenant()` (the canonical downstream activation step, called right after `createTenantFromLead()` in the proposal path) already busts `invalidateTenantCache` and `invalidateDomainCache` at its own status-flip-to-active step, with a doc comment reasoning through exactly this staleness class — but stops short of the slug cache, so the gap survives even through activation.

**Fixed:** added `invalidateSlugCache(slug)` right after the successful tenant insert in both `createTenantFromLead()` and the Stripe self-serve-signup branch — the same call already used on tenant deletion, now symmetric on creation. 2 new test files: `create-tenant-from-lead.slug-cache-bust.test.ts` (3 tests: busts on success, WRONG-TENANT PROBE against an unrelated slug, no-op when the insert fails) and `route.slug-cache-bust.test.ts` for the Stripe webhook (2 tests: busts with the exact derived slug the insert used, WRONG-TENANT PROBE).

## (2) — continued: traced whether `activateTenant()` itself needs the same fix — it doesn't, given (1)

Checked whether `activateTenant()`'s own status-flip-to-active step also needs an `invalidateSlugCache()` call, since it's "the ONE path every creation door should ultimately funnel through" per its own file header. With (1) fixed, the slug's negative-cache window is already closed at tenant-creation time — before `activateTenant()` ever runs (it's always called immediately after `createTenantFromLead()` in the one path that invokes it, `webhooks/stripe-platform/route.ts`). Re-busting the same slug a few hundred ms later at activation would be redundant, not a new gap. Not acting — no second fix needed once (1) is in place.

## (3) — gap/fluidity kept current

Carried-forward NOTICED items, unchanged:
1. `tenant_domains` DELETE/reactivate gap — still open, still gated on Jeff's product call.
2. `lib/tenant-schema.ts` — still confirmed dead code.
3. `platformFallback` compliance question (JEFF-MORNING-QUEUE.md) — still open.
4. `bookings/batch/route.ts`'s platform-fallback anomaly — still gated on #3.
5. `finance/upload/route.ts`'s MIME gap — fixed elsewhere (`p1-w4`, commit `5af092d2`), pending merge into `p1-w2`. No change.
6. Existing referrers' `commission_rate` rows stuck at signup-time value; no PUT/PATCH to edit post-signup. Product/business decision, not acted on.
7. `tenant_domains_single_primary` DB migration (partial unique index) — prepared as a file, not yet run. Gated on Jeff's approval.
8. `src/lib/lead-filters.ts` — ~90% dead code; 3 bespoke tenant clones each hardcode their own `OWNED_HOSTS`. Open product/architecture question, not acted on.
9. `tenants.domain` still has no DB-level unique constraint. Flagged as a DB migration candidate, not acting — gated on Jeff's approval.
10. `cron/tenant-health/route.ts`'s tie-break among 2+ non-primary active `tenant_domains` rows is non-deterministic — low value, flagged not acted on.
11. `src/lib/nycmaid/sms.ts`'s best-effort auto-opt-out tenant-by-phone lookup — deliberately best-effort/non-critical, not escalating without a product call.
12. Stripe webhook's other `.update()` calls (bookings, admin_tasks, team_members, prospects, deals — non-tenant tables) throughout `webhooks/stripe/route.ts` don't check their write's own returned `error` either — broader than tenant *state*, out of this lane's scope. Flagging, not acting.
13. `invoice.paid`/`invoice.payment_failed` resolve by `owner_email` with `.maybeSingle()`, which throws (now loud) if two tenants ever share an `owner_email` — no DB-level unique constraint on that column. Not acting.
14. `customers.retrieve()`'s best-effort swallow in `customer.subscription.deleted` — external Stripe API call, not our DB masking its error. Not touching an existing Stripe-API-resilience decision without a product call.
15. `activateTenant()`'s `ownerPin` field (`activation.ownerPin`) is never read by `admin/sales/LeadsPanel.tsx` — UX-friction, not correctness. Not acting without a product/UX call.
16. HIGH SEVERITY, structural — `webhooks/stripe/route.ts`'s full-loop-signup branch never calls `activateTenant()`, unlike its sibling `webhooks/stripe-platform/route.ts`. Logged to `JEFF-MORNING-QUEUE.md` and flagged to Jeff directly last round — still gated on his product/eng call. Unchanged.

CLOSED this round:
17. ~~Neither tenant-creation path busted its own new tenant's negatively-cached slug~~ — fixed above (1): `createTenantFromLead()` and the Stripe self-serve-signup branch both now call `invalidateSlugCache(slug)` right after a successful tenant insert.

NEW this round: none — (2) confirmed no further action needed once (1) landed.

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward, unchanged:
18. `dashboard/referrals/page.tsx`'s referrals-tab copy overpromises per-referrer rate control that doesn't exist.
19. `admin/sales/LeadsPanel.tsx` `ownerPin` display gap — see #15 above.
20. Full-loop-signup's `activateTenant()` bypass (#16) — as much a missing-feature gap (no team/tasks/domain/ledger seed for self-serve tenants) as a masked-error class bug.

## Verification this round

- `npx tsc --noEmit` clean (repo-wide).
- Fixed 2 call sites: `create-tenant-from-lead.ts`'s tenant insert, and `webhooks/stripe/route.ts`'s Full Loop self-serve-signup tenant insert — both now call `invalidateSlugCache(slug)` on success.
- 2 new test files, 5 new tests total (3 + 2): busts-on-success, wrong-tenant probe (×2), no-op-on-insert-failure.
- Targeted suite (Stripe webhook + stripe-platform webhook + create-tenant-from-lead + tenant-lookup): 18 test files, 65 tests, all passing.
- Full repo suite: run in progress at time of this doc; will confirm 0 failed before the commit lands.

File-only, no push/deploy/DB write from this worker. 1 code commit this round (fix + tests) + 1 docs commit (this file).
