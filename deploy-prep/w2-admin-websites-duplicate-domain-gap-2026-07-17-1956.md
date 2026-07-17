# W2 gap/fluidity refresh — 2026-07-17 19:56

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-client-facing-sms-number-fallback-gap-2026-07-17-1941.md`.

Leader's fresh 3-deep queue this round (19:47 LEADER->W2): (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1) this round — new fresh-ground surface: admin/websites duplicate-domain UX (bug)

The sms_number carry-forward list (SMS credential resolver bypass) has been the last several rounds' fresh ground; before picking the next slice off that list, swept for un-mined ground within my actual lane (tenant domain resolution — middleware + callers). Most of the tenant_domains-first/tenants.domain-fallback precedence bug class is now closed: `tenantSiteUrl()`, `tenantBrand()`, `getAgentConfig()`, `resolveOrigin()` and ~30 call sites across site-readiness/selena/onboarding/documents/invoices/quotes/etc. already route through the fixed precedence (confirmed by reading tenant.ts, tenant-lookup.ts, domains.ts, tenant-site.ts, messaging/brand.ts, selena/agent*.ts and grepping every remaining raw `tenant.domain`/`.eq('domain'` site — each one either already fixed or genuinely out of scope, see NOTICED #1 below for the one exception).

Found a live bug instead in the write path: **`POST /api/admin/websites`** (the tenant_domains admin-add endpoint) let the DB's `UNIQUE(domain)` constraint (migrations/043_tenant_domains.sql) do the cross-tenant-safety enforcement — correct, no domain can ever silently coexist under two tenants — but on collision it forwarded the raw Postgres error (`duplicate key value violates unique constraint "tenant_domains_domain_key"`) straight to the admin's `alert()`. The admin sees a cryptic DB string with no indication of which tenant already owns the domain or what to do about it.

Fix: catch `error.code === '23505'` (same pattern already established for `comhub_threads.slug` in `admin/comhub/channels/route.ts`) and look up the actual owning tenant to name it in the response — `"<domain> is already registered to <Tenant Name>."` A collision against the caller's OWN tenant gets a distinct, non-alarming message (`"already registered to this tenant"`) instead of implying a conflict. A dangling/unresolvable owner (tenant row missing) falls back to a generic-but-still-clear message.

**Verification:**
- `npx tsc --noEmit` clean.
- `npx eslint` on both touched files: 0 warnings.
- Full repo suite: 651/651 files, 2800/2837 tests passed (37 pre-existing skips, identical count to prior rounds) — confirms no regressions.
- New `route.duplicate-domain.test.ts`, 3 cases incl. a **WRONG-TENANT PROBE**: claiming a domain already owned by tenant B while authenticated as tenant A returns 409 naming tenant B by name, contains no raw DB error text, and — critically — the unique constraint actually held (still exactly 1 `tenant_domains` row for that domain afterward, not a silently-coexisting second one). Used `fake-supabase.ts`'s `_addUniqueConstraint()` (not the `tenant-isolation-harness.ts` used by the existing `route.normalization.test.ts`, which the existing test's own comment notes has no unique-constraint enforcement) so the probe exercises a REAL 23505 collision, not a simulated one.
- 1 commit this round: `a46e8698`.

## (2) — what (1) opened up: NOT built, flagging for Jeff/leader

While tracing this, found there is **no DELETE/PATCH endpoint for `tenant_domains` anywhere in the app** — grepped every `api/**/*.ts` file that touches the table; only `POST` (add) and the various read paths exist. An admin who mistakenly claims a domain for the wrong tenant (exactly the scenario this round's fix now surfaces clearly) has no in-app way to undo it — the row is stuck, and because `domain` is unique across ALL tenants regardless of `active` status, nobody (not even the correct tenant) can claim that domain until someone edits the DB directly.

Deliberately NOT building this now — it's a real gap, but closing it means product judgment calls I shouldn't make unilaterally in a file-only round: hard delete vs. soft-deactivate (soft leaves the unique-constraint block in place unless reactivation is also built), whether removal should be reversible/audited, and whether the admin UI (`admin/websites/page.tsx`, which currently has no delete affordance at all) should gain a confirm-gated remove action. Recommend this as the next slice if Jeff wants it — scoped small (soft-deactivate + a reactivate path, so the unique constraint doesn't create a permanent domain-lockout) plus a minimal UI action, same incremental-cadence precedent as every other round this session.

## (3) — gap/fluidity kept current

Nothing else new to report against the existing carry-forward lists. The SMS credential carry-forward list (~22 files, per the 19:41 doc) is untouched this round — this round's ground was the domain-resolution lane instead, per the leader's "new fresh-ground surface" framing.

## NOTICED — not fixed, flagging for the leader/Jeff

1. **`lib/tenant-schema.ts` confirmed dead code** — its three exported schema.org generators (`tenantLocalBusinessSchema`, `tenantServiceSchema`, `tenantJobPostingSchema`) build a `url` field from `tenant.website_url || <slug>.homeservicesbusinesscrm.com` — the exact legacy-only pattern already fixed everywhere else via `tenantSiteUrl()`. Grepped every import site: **nothing in the app imports `tenant-schema.ts`.** Not fixed, per the same precedent as `blog-data.ts` (58e35c1a) — fixing dead code delivers no behavior change and risks being mistaken for live coverage. Flagging in case it's meant to be wired up somewhere (JSON-LD schema markup on tenant site pages would be a legitimate SEO win if it were actually rendered).
2. The DELETE/PATCH gap above (item (2)).
3. The compliance-gated `platformFallback` question (JEFF-MORNING-QUEUE.md, 15:17 2026-07-17) is still open, untouched again this round.
4. `bookings/batch/route.ts`'s pre-existing platform-fallback anomaly — still untouched.
5. SMS credential carry-forward list still sits at ~22 files (send/document flows next per the 19:41 doc) — untouched this round, ground for a future round.

## MISSING-FEATURE GAPS / UX-FRICTION

- This round's fix (admin/websites duplicate-domain message) IS the UX-friction item.
- New: item (2) above — no way to remove/reassign a `tenant_domains` row in-app (missing-feature gap).

## Remaining candidates, not yet fixed (fresh ground for a future round)

- The DELETE/reactivate feature from item (2), if Jeff wants it scoped and built.
- SMS credential carry-forward: send/document flows (7 files, per the 19:41 doc) — still open.
