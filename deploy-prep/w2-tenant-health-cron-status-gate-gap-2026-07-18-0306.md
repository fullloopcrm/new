# W2 gap/fluidity refresh — 2026-07-18 03:06

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-static-tenant-map-domain-reassignment-bypass-2026-07-18-0300.md`.

Leader's instruction this round (03:03 LEADER->W2): "Good closure and good self-correction on the STATIC_TENANT_MAP fix. Fresh 3-deep queue (file-only, no push/deploy/DB each): (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current."

## (1) — new fresh-ground surface: `cron/tenant-health/route.ts`'s two domain-discovery sources gated tenant status inconsistently instead of sharing `tenantServesSite()` — the same single source of truth every other resolver caller uses

**Bug found:** this cron unions two sources of "which domain does this tenant serve from" — `tenant_domains` (source 1, matches the resolver's own precedence) and the legacy `tenants.domain` fallback (source 2) — then health-checks every resulting host and Telegram-alerts on any failure. Each source filtered tenant status its own ad-hoc way instead of importing `tenantServesSite()` (`tenant-status.ts`), the gate middleware, `tenant.ts`, and `tenant-site.ts` all already share:
- **Source 1 applied no status filter at all.** A `tenant_domains` row is not deactivated when its tenant is suspended/cancelled/deleted — nothing in the schema ties the two together — so a tenant in any status with an active `tenant_domains` row got queued for health-checking regardless.
- **Source 2 filtered with a hardcoded, wrong list**: `.in('status', ['active', 'live', 'setup'])`. `'live'` is not a real status anywhere else in the platform (`KNOWN_TENANT_STATUSES` in `tenant-status.ts` has no such value — dead entry). `'pending'` — a real serving status per `tenantServesSite` (new tenants must be checkable before full activation completes) — was omitted entirely.

**Concrete failure mode (source 1):** an admin suspends or cancels a tenant that had already migrated to `tenant_domains`. Middleware correctly darkens the tenant's site the moment that write lands — every request now redirects to `/sign-in` (`applyProtectedRouteGate`), exactly as designed. This cron, unaware of that status, still queues the tenant's domain every run. `checkTenant()` follows the redirect, sees a page that doesn't match `/site/<slug>` (or the template), and marks `routing: false` → overall `status: 'fail'`. Every subsequent cron run (this fires on a schedule) fires a `🚨 Fortress: N tenant site(s) FAILING` Telegram alert for a tenant that is behaving exactly as intended — false-alarm noise that never clears (the tenant stays suspended, the domain stays in `tenant_domains`), which is exactly the kind of signal that trains an operator to stop trusting/reading Fortress alerts, undermining the one cron this codebase's own comments call "the check that would have caught the 2026-07-08 cutover in minutes instead of by eye."

**Concrete failure mode (source 2):** a brand-new tenant is in `status='pending'` (pre-activation) with a custom domain set only in legacy `tenants.domain` (not yet migrated to `tenant_domains` — activation hasn't run yet). The old hardcoded list excluded `'pending'`, so this tenant's domain was never discovered by either source and silently dropped from every cron run's coverage — zero alerting if its early site is actually broken, discovered (if ever) as a support ticket instead of a Fortress page, the exact silent-darkening failure mode this cron exists to catch, reached through its own target-discovery status filter rather than a tenant's live site.

**Fixed:** both sources now call `tenantServesSite(status)` — source 1 fetches `status` alongside `id, slug` for the `tenant_domains`-referenced tenants and filters on it before a domain is queued; source 2 drops its DB-level `.in('status', [...])` filter and applies the same JS-level `tenantServesSite()` check instead, so a `pending` tenant is included and no phantom `'live'` status lingers.

## (2) — swept for sibling instances — confirmed this was the only ad-hoc tenant-status filter outside the shared gate

- Grepped every `.from('tenants')` query in `src/` for a `.eq('status', ...)` / `.in('status', ...)` / `.neq('status', ...)` filter. All the others (`portal/auth`, `admin/announcements`, `cron/schedule-monitor`, `cron/reminders`, `cron/confirmations`, `cron/outreach`, `cron/daily-summary`, `cron/health-check`, `cron/payment-reminder`, `cron/payment-followup-daily`, `cron/late-check-in`, `cron/backup`, `cron/rating-prompt`, `cron/post-job-followup`, `cron/phone-fixup`, `cron/confirmation-reminder`, `cron/finance-post`, `cron/lifecycle`, `cron/retention`, `tenant-sitemap`, `team-portal/auth`, `admin/system-check`, `cron/system-check`, `jefe/health.ts`) deliberately filter to `status = 'active'` only (a narrower, intentional business decision — e.g. "don't send automated SMS reminders for a tenant still mid-onboarding") or `!= 'deleted'` (jefe/health.ts's own admin-facing health dashboard, a different and already-correct semantic). None of these claim resolver parity or are involved in host→tenant routing; they're out of this lane's resolver-consistency scope, not sibling instances of this bug.
- Grepped for the literal string `'live'` across `src/` as a status value — the only occurrence was the one just fixed. Not a copy-pasted pattern elsewhere.
- `tenant.ts`, `tenant-lookup.ts`, `tenant-site.ts`, `activate-tenant.ts`, `domains.ts` (all previously audited resolver/resolver-adjacent files) already use `tenantServesSite()` or an equivalent explicit `NON_SERVING_STATUSES` check — confirmed clean, no drift.

Nothing else "opens up" from this surface — it was a single self-contained inconsistency between two status filters in one file, not a shared helper with other call sites.

## (3) — gap/fluidity kept current

Carried-forward NOTICED items 1–21 and 23, unchanged (see prior rounds' docs for full list, most recently restated in `w2-static-tenant-map-domain-reassignment-bypass-2026-07-18-0300.md` and `w2-admin-websites-legacy-collision-guard-gap-2026-07-18-0245.md`).

CLOSED this round:
25. ~~`cron/tenant-health/route.ts`'s two domain-discovery sources gated tenant status inconsistently — source 1 had no status filter (false-alerted on suspended/cancelled tenants' intentionally-darkened sites), source 2 used a hardcoded list with a phantom `'live'` status and a missing `'pending'` (silently dropped pending tenants from coverage)~~ — fixed above (1): both sources now gate on `tenantServesSite()`, the same shared status source every other resolver caller uses.

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward, unchanged: items 18–20.

## Verification this round

- `npx tsc --noEmit` clean (repo-wide).
- `npx eslint src/app/api/cron/tenant-health/route.ts src/app/api/cron/tenant-health/route.status-gate.test.ts` — 0 errors, 0 warnings.
- New `src/app/api/cron/tenant-health/route.status-gate.test.ts` — 5 tests: source-1 skips a SUSPENDED tenant (previously false-alerted), source-1 skips a CANCELLED tenant, source-1 still checks an ACTIVE tenant (no regression), source-2 now checks a PENDING tenant (previously silently dropped by the hardcoded list), source-2 skips a DELETED tenant.
- Ran the full `cron/tenant-health` suite together with the pre-existing `route.precedence.test.ts` and `route.masked-error.test.ts` — 3 files, 11 tests, all passed; the new status gate is additive and doesn't alter the previously-tested source-precedence or masked-error behavior.
- Full repo suite: 703 files, 2995 passed, 37 skipped (pre-existing), 0 failed — net +5 vs. the prior round's 2990, matching the 5 new tests added.

File-only, no push/deploy/DB write from this worker. 1 code commit this round (fix + tests) + 1 docs commit (this file).
