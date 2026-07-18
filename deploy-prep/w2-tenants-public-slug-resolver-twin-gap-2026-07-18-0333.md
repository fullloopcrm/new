# W2 gap/fluidity refresh — 2026-07-18 03:33

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-settings-domain-and-slug-blocklist-gap-2026-07-18-0327.md`.

Leader's instruction this round (03:26 LEADER->W2): "Real one -- self-service PUT /api/settings never collision-checked a tenant-supplied domain, unlike the 3 admin allowlist routes... Also closed the unblocked slug write in the same route. Fresh 3-deep queue (file-only, no push/deploy/DB each): (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current."

## (1) — new fresh-ground surface: `GET /api/tenants/public` was the 7th tenant_slug resolver-twin, missed in the prior sweep of 6

**Bug found:** a prior round (see `w2-tenants-slug-resolver-twins-...` history, referenced in carried-forward items) found and fixed 6 routes that hand-rolled their own `tenants.slug` lookup instead of going through the shared resolver (`getTenantBySlug` in `tenant.ts`/`tenant-lookup.ts`): `portal/auth`, `team-portal/auth`, `sales-applications`, `team-applications`, `tenant-sitemap`, `webhooks/telegram/[tenant]`. That sweep's grep pattern (`from('tenants')` + `.eq('slug'`) missed a 7th site this round found by re-running the same search: `app/api/tenants/public/route.ts`. It did `.eq('slug', slug).single()` — no `.toLowerCase()`, and `.single()` instead of `.maybeSingle()`.

**Concrete failure mode:** this route has exactly one caller — `app/apply/[slug]/page.tsx`, the PUBLIC job-application page, reading `slug` straight from the URL path param with zero client-side normalization. A mixed-case link (shared verbatim from an email/social post/QR code, or typed by hand) 404'd "Business not found" for a real, active tenant — the applicant never sees the tenant's name/logo and the page renders as if the business doesn't exist. Separately, `.single()` collapses a genuine DB failure into the exact same "Business not found" response as an unknown slug (the same masked-error class already fixed on the canonical resolver and its other twins), hiding a real outage as if it were a bad link.

**Fixed:** `.toLowerCase()` the slug before the query, switch to `.maybeSingle()` with an explicit error check that returns 500 (not 404) on a genuine DB failure — same pattern as the other 4 twins that still hand-roll their own query (portal/auth, team-portal/auth, sales-applications, team-applications; tenant-sitemap and webhooks/telegram/[tenant] were fixed via a different route in the prior round's file).

## (2) — continuing the surface (1) opened up: traced the full `/apply/[slug]` flow, nothing further to fix

Followed the chain downstream of this fix: the page's submit handler POSTs to `/api/team-applications` with `tenant_slug: slug` (the same raw, possibly-mixed-case URL param) — but that route was already one of the 6 originally-fixed twins (`cleanSlug = tenant_slug.toLowerCase()` + `maybeSingle()`, confirmed by reading it this round), so the submission path was never actually at risk — only this round's branding-lookup GET was. The page's photo-upload call (`/api/team-applications/upload`) does no tenant resolution at all (tenant-agnostic file storage, already hardened for path traversal per its own comment). Nothing further opens up in this flow.

**Swept for further siblings:** re-ran the repo-wide `from('tenants')` + `.eq('slug'` grep. Two other sites remain: `lib/jefe/actions.ts`'s `findTenant()` (an internal admin fuzzy-match tool used only by Jeff via Jefe — exact-slug-first then name-contains fallback already self-heals a case mismatch for a human operator, and never uses `.single()`) and `lib/create-tenant-from-lead.ts`'s slug-uniqueness-check loop (checks its own freshly-`slugify()`'d — always-lowercase — candidate against existing rows, not a request-time resolution). Neither is the same public-facing resolver-twin bug class; not touched.

## (3) — gap/fluidity kept current

Carried-forward NOTICED items 1–16, 21, 23, unchanged (see prior rounds' docs for full list, most recently restated in `w2-tenant-health-cron-status-gate-gap-2026-07-18-0306.md`).

CLOSED this round:
28. ~~`GET /api/tenants/public` hand-rolled its own `tenants.slug` lookup, missing both the resolver's lowercase normalization and its masked-error fix — the 7th resolver-twin, missed in the prior sweep of 6~~ — fixed above (1): now lowercases + uses `maybeSingle()` with explicit error handling, matching the other hand-rolled twins.

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward, unchanged: items 18–20.

## Verification this round

- `npx tsc --noEmit` clean (repo-wide).
- `npx eslint src/app/api/tenants/public/route.ts src/app/api/tenants/public/route.slug-normalization.test.ts` — 0 errors, 0 warnings.
- New `route.slug-normalization.test.ts` — 4 tests: mixed-case slug resolves to the same tenant, an unknown (case-correct) slug still 404s as a control, a genuine DB failure returns 500 instead of masquerading as "Business not found", and a wrong-tenant probe confirming the response never carries a different tenant's name/slug.
- Full repo suite: 706 files, 3007 passed, 37 skipped (pre-existing), 0 failed — no regressions. (Prior round's `finance-export.test.ts` timeout flake did not recur this run.)

File-only, no push/deploy/DB write from this worker. 1 code+tests commit (`2851c3de`) + 1 docs commit (this file).
