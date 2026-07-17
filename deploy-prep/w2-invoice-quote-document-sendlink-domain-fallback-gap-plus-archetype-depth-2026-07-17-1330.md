# W2 gap/fluidity refresh — 2026-07-17 13:30

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-site-readiness-domain-fallback-gap-plus-archetype-depth-2026-07-17-1305.md`.

Leader's fresh 3-deep queue this round (13:06 LEADER->W2): (1) continue project archetype depth. (2) continue fresh-ground hunting. (3) keep gap/fluidity current.

## (1) Fresh-ground — fifth mirror of the resolver-precedence bug class, and the widest blast radius yet

Swept every remaining direct `.domain`/`.domain_name`/`website_url` read in `src/lib`/`src/app` that wasn't already covered by this session's fixes (`getPrimaryTenantDomain`, `tenantSiteUrl`, `tenantBrand`, `resolveOrigin`, `buildBrandOverride`/`applyBrandRewrite`). Found a NEW shape of the same class: 6 API routes each hand-rolled their own inline `tenant.domain ? https://${tenant.domain} : appUrl` instead of calling `tenantSiteUrl()` (the resolver already fixed+tested at 5a-49 for exactly this purpose) — legacy `tenants.domain` only, `tenant_domains` never consulted, and **worse than every prior instance**: the fallback was the platform's own generic app URL (`NEXT_PUBLIC_APP_URL`), not even the tenant's slug subdomain.

Affected routes, all live today, all customer-facing:
- `invoices/[id]/send` — the "View & Pay" link mailed/texted to the customer paying an invoice.
- `invoices/public/[token]/checkout` — the Stripe Checkout `success_url`/`cancel_url` a customer lands on after paying.
- `quotes/[id]/send` — the "Review & Accept" proposal link.
- `quotes/public/[token]/deposit-checkout` — the Stripe Checkout `success_url`/`cancel_url` for a proposal deposit.
- `documents/[id]/send` — the "Review & Sign" e-signature invite link.
- `documents/public/[token]/sign` (`sendSigningInviteToSigner`) — the sequential-flow "you're up next" signer notification.

For any tenant whose real domain lives only in `tenant_domains` (added via `admin/websites`, which never writes `tenants.domain`), every one of these customer-facing payment/signing links — and the Stripe redirect after a customer just paid — pointed at the platform's own bare app URL instead of any tenant-branded host. Functionally the links likely still worked (all are public-token-scoped, not host-routed), but every branding signal a paying customer sees was wrong, including immediately after completing a Stripe payment.

**Fixed:** all 6 call sites now call `tenantSiteUrl()` (tenant_domains PRIMARY → tenants.domain → slug subdomain) instead of duplicating ad-hoc resolution — reuses the already-tested resolver rather than inventing new logic (DRY), consistent with this session's established fix shape. `fromEmail` fallback lines in the same files (`invoices@${tenant.domain || 'fullloopcrm.com'}` etc.) were deliberately left untouched — that's the outbound-email-domain concern (tied to Resend/DNS verification), a different question from the customer-facing link, and out of scope for this fix.

18 new vitest cases across 6 files (2 new cases added to each of the 2 existing checkout test files, 4 new dedicated test files for the 4 routes with no prior coverage), each with a domain-fallback case, a slug-subdomain-fallback case (where applicable), and a wrong-tenant probe. All verified against the real route code (not the resolver in isolation) — e.g. the documents/public/[token]/sign test drives the actual sequential-signer branch and asserts the mailed HTML contains the right host. `npx tsc --noEmit` clean throughout, including two real type errors caught and fixed along the way (an untyped mock parameter that collapsed `.mock.calls[0][0]` to a length-0 tuple, and a missing `slug` field on a widened join-select type).

**NOTICED:** none new this round — this was a `tenantSiteUrl()` wiring gap, not a new resolver bug, so no design-decision-shaped side finding surfaced.

## (2) Archetype depth — 5a-54

Added **5a-54** to `platform/scripts/sim-all-trades.ts` (after 5a-53, before `5b. CHANGE ORDER`). Different shape from the prior probes: rather than re-proving `tenantSiteUrl()`'s own precedence (already proven at 5a-49 against the live schema), this probe calls `tenantSiteUrl()` with the exact `{id, domain, slug}` argument shape the 6 newly-fixed routes now pass it, confirming: (a) it falls back to the slug subdomain when nothing else resolves — the worst case these 6 routes used to skip entirely in favor of the platform app URL; (b) an active PRIMARY `tenant_domains` row wins over a null legacy `tenants.domain`; (c) a second real tenant's `tenant_domains` row never leaks into this tenant's resolution. Restores tenant state and deletes the throwaway second tenant afterward.

**Leader: please run `SIM_ONLY=roofing npx tsx scripts/sim-all-trades.ts` (or a full run) to confirm 5a-54 (and the still-pending 5a-35 through 5a-53) pass before relying on them.**

## (3) NOTICED — not fixed, flagging for the leader/Jeff

Carried forward unchanged from the prior round (items 1-30). No new items this round.

## MISSING-FEATURE GAPS

Carried forward unchanged from the prior round's list, items 1-26 (gap #18 stays open on `reviews/request`, unchanged, still Jeff's product call). Item #28 (dead neighborhood-attribution feature) still straddles both tracks per last round's note.

## UX-FRICTION

Carried forward unchanged from the prior round's list.

## Verification this round

- `npx tsc --noEmit` clean (repo-wide, incl. `sim-all-trades.ts`), after fixing 2 real type errors surfaced along the way.
- Full suite run in progress at report time — see follow-up report line for the final tally.
- File-only, no push/deploy/DB write. `sim-all-trades.ts` probe added but not run by me (leader-run-only, per standing convention).

File-only, no push/deploy/DB write from this worker.
