# W2 gap/fluidity refresh — 2026-07-18 07:09

Leader's 07:04 order: fresh 3-deep queue — (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1) New fresh-ground surface — 0 code fixes this round, genuinely re-swept clean

Targeted my own owned lane (resolver: middleware + callers) plus the domain-reassignment feature I built last round (`PATCH /api/admin/websites`, `78cb4975`), since that's the newest write path into `tenant_domains` and hadn't had a second independent look yet.

Checked, all clean (no new bug found):

- **`middleware.ts`, full re-read end-to-end**: canonical www redirect (correctly excludes `/api/`, carrying-domain subdomains, `APEX_CANONICAL_DOMAINS`), `STATIC_TENANT_MAP` branch (already correctly consults the real resolver first — the wrong-tenant guard fixed in an earlier round, `w2-static-tenant-map-domain-reassignment-bypass-2026-07-18-0300.md`, still in place and correct), custom-domain + subdomain branches, `applyProtectedRouteGate`. No new gap.
- **`domains.ts`, full re-read**: `getTenantDomains`, `getOwnedDomainSet`, `getPrimaryTenantDomain`, `reconcilePrimaryDomain`, `findDomainOwner` — all consistent with the documented precedence (tenant_domains first, tenants.domain fallback) and already-fixed single-primary invariant.
- **`tenant-lookup.ts`'s `getTenantByDomain`**: re-confirmed the TRANSITION divergence guard, the www-strip-before-lookup normalization (so a domain can never be registered with a `www.` prefix that would silently dead-end — POST already strips it), and the maybeSingle()/explicit-error-check pattern throughout.
- **Every remaining `tenant_domains` caller repo-wide** (`grep -rln`, 19 files in `src/lib` + `src/app/api`) not yet individually checked this session: `admin/businesses/[id]/site-export`, `admin/broadcast-guidelines`, `admin/campaigns/generate`, `cron/phone-fixup`, `cron/post-job-followup`, `seo/backlinks.ts`'s `loadActiveFleet`, `seo/ingest.ts`'s `linkTenant`, `tenant.ts`'s `getTenantByDomain` twin, `tenant-sitemap`, `tenant/public`, `indexnow` — all already follow the tenant_domains-first/tenants.domain-fallback precedence correctly (most are prior rounds' own fixes), all `supabaseAdmin`-only (no anon-key/RLS exposure path for this table — confirmed zero non-admin-client callers exist).
- **`admin/businesses/[id]` DELETE's Vercel-detach + cache-invalidation**: confirmed `invalidateTenantCache(id)` already cascades through BOTH `slugCache` and `domainCache` (iterates and deletes any entry whose cached tenant matches the id), so the delete path doesn't need a separate `invalidateDomainCache` call per owned domain — the one call already covers it. Not a gap.
- **My own PATCH reassign route + its test file** (`route.reassign.test.ts`, 10 tests including an explicit `WRONG-TENANT PROBE` and a `LEGACY-COLLISION PROBE`): re-read in full, logic holds up — is_primary demote-before-set-false is correct, cache-bust covers all three stale fronts, legacy-collision guard is correctly narrowed to exclude the row-being-moved false-positive.

## Noticed but NOT fixed — flagged as a judgment call, not a bug

`PATCH /api/admin/websites` never checks the **destination** tenant's `status` before moving a domain onto it — an admin could reassign a live domain onto a suspended/cancelled/deleted tenant with zero warning, which (per `tenantServesSite()`) would immediately stop that domain from serving its site. Considered fixing this with the same soft-block pattern as the route's existing no-op guard and legacy-collision guard, but did NOT: `POST /api/admin/websites` (the sibling write path, same file) has never validated the tenant_id it writes against for existence OR status either — so this isn't a regression or an inconsistency against an established sibling pattern (the strongest class of finding this session), it would be introducing a brand-new validation rule based on a guess about intended admin workflow (reassigning to a paused/decommissioned tenant as a deliberate parking action is a plausible legitimate use, not obviously a mistake). Flagging to the queue rather than guessing.

## (2) — nothing opens up

(1) found no code bug, so there's no follow-on surface to continue into this round.

## (3) — gap/fluidity kept current

Carried-forward items unchanged from `w2-admin-domain-reassign-ux-2026-07-18-0702.md`: item-33 (3 bespoke tenants' cross-contaminated static domain lists), seo-* verify-revert/alerts/health judgment calls, backup-cron retention question, owner/admin Telegram bots status-gate question, `detect.ts` migration (prepared as file, awaiting Jeff's approval to run), ComHub nav-parity (item 30), tenant self-serve domain config (product-scope item).

New this round (logged above, not yet in JEFF-MORNING-QUEUE.md): PATCH /api/admin/websites destination-tenant-status judgment call.

## Verification this round

Read-only investigation, zero code changes — `git status` on `platform/src` confirms clean, no `tsc` run needed (nothing to typecheck). File-only, no push/deploy/DB.
