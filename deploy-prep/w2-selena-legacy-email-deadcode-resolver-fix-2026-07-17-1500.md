# W2 gap/fluidity refresh — 2026-07-17 15:00

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-fromemail-bugclass-misdiagnosis-and-correction-2026-07-17-1452.md`.

Leader's fresh 3-deep queue this round (15:04 LEADER->W2): (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1) Fresh-ground — closed a two-round-old carried-forward NOTICED item, eighteenth mirror of the bug class

Re-swept for any remaining raw `tenant.domain` construction site not yet triaged (both the tenant_domains-resolver-precedence list and the `tenantSender()`-bypass list were confirmed fully closed last round). Ruled out several false leads before landing on the real one:

- `lib/team-provisioning.ts`, `app/api/invoices*`, `app/api/quotes*`, `app/api/documents/public/[token]/sign` — all already route through `tenantSiteUrl()` correctly (pass `tenant.domain` as one of three inputs to the resolver, not as the resolved value itself).
- `lib/seo/backlinks.ts` — raw `tenant.domain`-shaped reads, but on `TenantFleetRow`, whose `domain` field is populated by `loadActiveFleet()` from `tenant_domains` first / `tenants.domain` fallback already. Pre-resolved, not a bug.
- `lib/activate-tenant.ts` lines 338/364/415 — raw `tenant.domain` reads, but this is the WRITE path that seeds `tenant_domains` rows during activation itself; reading the legacy column here is correct, not a resolver bug.
- `app/dashboard/users/page.tsx` — reads `t.domain` from `/api/tenant/public`'s response, which is already the resolved value (that route was fixed two rounds ago). Fine.
- `middleware.ts` — confirmed still solid; both subdomain and custom-domain branches route through `getTenantBySlug`/`getTenantByDomain` (both already fixed).

**Real finding:** `lib/selena-legacy-email.ts`'s `formatHtmlReply()` — first flagged as a NOTICED item two rounds ago (`w2-indexnow-domain-fallback-gap...`), carried forward unfixed since because `handleInboundEmail` (its only other export) has zero callers anywhere in the app. Confirmed again this round via repo-wide grep — genuinely orphaned, ported from nycmaid at `f7dd9194` and never wired to a live route. `/api/email/monitor` + its cron trigger (`/api/cron/email-monitor`) handle a different concern entirely (IMAP-parsed Zelle/Venmo payment matching) and never call this module.

Fixed anyway rather than leaving it flagged indefinitely — the leader's last message explicitly offered converting a carried-forward NOTICED item from flagged to fixed as a valid option for this round. `formatHtmlReply()` built the reply-footer site link from `tenant.domain` directly; now routes through `tenantSiteUrl()` (tenant_domains primary first, tenants.domain fallback, then slug subdomain), same precedence every other outbound tenant-branded surface uses. Made `formatHtmlReply` async (was sync) and exported it for direct testing; widened `TenantLike` to include `slug` (needed by `tenantSiteUrl`).

**Important: this does not make the code live.** `handleInboundEmail` still has zero callers. The fix and its tests prove the resolver logic is now correct *if and when* the module is ever wired up — it has no production blast radius today either way.

## Verification this round

- `npx tsc --noEmit` clean.
- New test file `lib/selena-legacy-email.domain-fallback.test.ts` — 5 tests (tenant_domains-primary-wins, tenant_domains-wins-over-stale-legacy-tenants.domain, tenants.domain fallback, slug-subdomain final fallback, wrong-tenant probe). All green in isolation.
- Full suite: **599 files, 2621 tests passed, 37 skipped, 0 failed.**
- File-only, no push/deploy/DB write. Commit `6760d7c0`.

## NOTICED — not fixed, flagging for the leader/Jeff

Carried forward: `tenant-schema.ts`'s SEO-opportunity finding (already ruled out as dead code two rounds ago — zero callers for its JSON-LD structured-data helpers; live question is whether to wire it into `/site/template` for real SEO upside, or delete it — Jeff's product call, not a resolver bug).

Nothing new this round beyond the fix above.

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward unchanged from prior rounds.

## Remaining candidates, not yet fixed (fresh ground for a future round)

Both carried-forward NOTICED items from two rounds ago are now resolved one way or the other: `selena-legacy-email.ts` fixed (this round), `tenant-schema.ts` correctly left as a product/gap question, not a resolver bug. No open resolver-precedence or `tenantSender()`-bypass candidates remain from any prior triage.

Next round should resume fresh-ground grepping from scratch, widened beyond the domain/sender-address call shapes already exhausted — candidate directions noted in-session but not yet investigated: SMS `telnyx_phone`/`telnyx_api_key` fallback precedence (does any caller read a legacy single-key column directly where a per-tenant-key or multi-number resolver already exists?), or a genuinely different resolver concern within the tenant-resolution lane (e.g. `resend_api_key`/`stripe_api_key` per-tenant credential resolution, if any of those have grown a tenant_domains-shaped precedence bug of their own).
