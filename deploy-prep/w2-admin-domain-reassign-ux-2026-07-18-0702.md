# W2 gap/fluidity refresh — 2026-07-18 07:02

Continues from `w2-missing-feature-ux-friction-pass-2026-07-18-0649.md`'s deferred item. Leader's 06:51 order: pursue it now — "(1) admin-side domain reassign UX, the deferred item -- go ahead. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current."

## (1) Admin-side domain reassign UX — built

POST `/api/admin/websites`'s own 409/23505 collision error has always promised "remove it there first, or reassign it, before adding it here." No "reassign it" path existed anywhere in this route — an admin's only option was navigating to the OTHER tenant's `admin/businesses` page to manually clear its legacy `domain` field, with no cross-link from the error message that names them, or (once DELETE exists — `p1-w1`, not yet merged here) a DELETE+POST round trip.

Added `PATCH /api/admin/websites`: moves an existing `tenant_domains` row to a different `tenant_id` directly.

- Verified before building: `registerCustomDomain()`/`registerCarryingDomain()` (`vercel-domains.ts`) take a bare domain string, not a tenant — Vercel-side attachment is keyed to the domain only, against one shared Vercel project. Tenant ownership lives entirely in this app's DB (`tenant_domains`/`tenants.domain`), so a reassign never needs a Vercel call — confirmed, not assumed, by reading `registerCustomDomain`'s implementation.
- Legacy-collision guard: checks the same `tenants.domain` collision class POST already guards against, but narrowed to skip the `tenant_domains`-vs-itself half of `findDomainOwner()` — calling the shared helper unmodified would have false-positived on every reassignment (the row being moved IS the existing `tenant_domains` match for that domain, so excluding only the destination tenant would always catch the row under its pre-move tenant_id and reject the very reassignment it's supposed to enable). Caught this in design, not in a failing test.
- Forces `is_primary` false on the destination side rather than carrying the source tenant's flag over — the destination tenant may already have its own primary domain; blindly setting a second `is_primary:true` row would recreate the dual-primary bug the demote-before-set logic in POST exists to prevent.
- No-op guard (reassigning to the tenant that already owns it), destination-tenant-exists check, and cache invalidation on all three fronts that go stale (`invalidateDomainCache` for the domain itself, `invalidateTenantCache` for BOTH the source and destination tenant).
- Admin page: new "Actions" column per domain row with a "Reassign" button opening a picker modal (destination tenant select, excludes the domain's current tenant), wired to the new PATCH.

## (2) Swept what (1) opens up — nothing further

- Confirmed `tenant-lookup.ts` is the ONLY domain-keyed cache in `src/` (`grep -rl domainCache`) — the PATCH's cache-bust is complete, no second cache site missed.
- Confirmed the legacy `tenants.domain` side already has its own working (if UX-clunky, no cross-link) edit path: `admin/businesses/[id]` PUT already allowlists `domain`, already runs the identical `findDomainOwner` collision guard + normalize + cache-bust (an earlier round's fix). Building a unified single-button reassign across BOTH `tenant_domains` and legacy `tenants.domain` in one action would be a real scope expansion beyond the flagged gap ("no direct transfer shortcut" specifically named the `tenant_domains` write site) — not manufacturing that as follow-on work without a product call on whether the two sources should be unified in the UI.
- Not duplicating `p1-w1`'s DELETE handler (`94deba85`) or GET field-shape fix (`425825ac`) — both still unmerged into this branch, both out of this round's lane per the leader's dedupe note.

## (3) Carried-forward items unchanged

Same list as `w2-missing-feature-ux-friction-pass-2026-07-18-0649.md`: item-33 (3 bespoke tenants' cross-contaminated static domain-ownership lists, needs ground-truth owner), the seo-* verify-revert/alerts/health judgment calls, backup-cron retention question, owner/admin Telegram bots status-gate question, `detect.ts` migration (prepared as a file, awaiting Jeff's approval to run), ComHub nav-parity (item 30), tenant self-serve domain config (new item, logged 06:49) — none touched this round.

## Verification this round

- 10 new tests (`route.reassign.test.ts`), RED-confirmed via `git apply -R` against pre-fix `route.ts` (all 10 failed with `PATCH is not a function`), restored GREEN.
- `npx tsc --noEmit` clean.
- `npx eslint` on all 3 touched files: 0 errors, 1 pre-existing warning (unrelated `fetchData`/`useEffect` ordering in `page.tsx` that predates this round's edit).
- Full suite: 745 files, 3219 passed, 37 skipped, 1 failed (`finance-export.test.ts`'s 200k-row pagination test timed out under full-suite parallel load — confirmed pre-existing/unrelated, documented in multiple prior rounds this session, re-ran in isolation and it passed clean: 3/3).
- 1 commit (`78cb4975`, fix+tests). File-only, no push/deploy/DB.
