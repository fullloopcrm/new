# W2 gap/fluidity refresh — 2026-07-17 22:35

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-businesses-checklist-and-delete-domain-detach-gap-2026-07-17-2224.md`.

Leader's fresh 3-deep queue this round (22:29 LEADER->W2): (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1) — fresh-ground surface: no new resolver-precedence bug found this round

Unlike the last several rounds, this pass did **not** find a new tenant_domains-first / tenants.domain-fallback violation. Reporting that plainly rather than manufacturing one — same precedent as `w2-fresh-ground-sweep-no-new-bug-plus-dead-column-2026-07-17-0747.md` and `w2-tenant-resolution-surface-reaudit-clean-2026-07-17-1524.md`.

Surfaces checked this round, each either already-fixed or confirmed out-of-scope:

- **`admin/businesses/[id]/wizard/page.tsx`** (new client-facing onboarding wizard, never in a prior gap file) — PUTs `domain`/`domain_name` to `/api/admin/businesses/[id]`, the same route whose PUT-handler domain normalization was audited and fixed in an earlier round. Writing the legacy columns from the wizard is the intended fallback-write path, not a bypass — the resolver still checks tenant_domains first. No bug.
- **`admin/businesses/[id]/page.tsx`** (client component) — `custom_domain_live` display is driven entirely by the GET response from the route fixed last round (`ad30920d`). No independent domain logic in the client. No bug.
- **Stripe Connect / prospect redirect URLs** (`team-members/[id]/stripe-onboard/route.ts`, `admin/prospects/[id]/route.ts`) — both build `return_url`/`success_url`/`cancel_url` from `process.env.NEXT_PUBLIC_APP_URL`, not tenant domain. These are platform-dashboard and buyer-funnel pages on the main host by design — correctly outside the tenant_domains pattern, not a gap.
- **`lib/seo/competitors.ts`, `lib/seo/competitor-remediate.ts`** — "domain" here is a competitor's SERP domain (SEO tracking data), an unrelated concept. No bug.
- **`admin/email/page.tsx`** — "domain" here is the Resend sending-domain config (`resend_domain`), a distinct field from tenant custom-domain routing. No bug.
- **`leads/domains/route.ts`, `domain-notes/route.ts`, `leads/block/route.ts`** — read from `domains` / `domain_notes` / `blocked_referrers`, all lead-attribution or admin-notes tables keyed by domain string, none of them the tenant-routing resolver. No bug.
- **`cron/tenant-health/route.ts`** — re-read in full; already unions tenant_domains (source 1) with tenants.domain-only stragglers (source 2), explicit error handling on both queries. Confirmed still correct, no drift.
- **Resolver twins (`lib/tenant.ts` vs `lib/tenant-lookup.ts`)** — re-read both `getTenantByDomain` implementations side by side end-to-end (not just grepped) specifically hunting for drift between the Node-runtime and Edge-runtime copies, since a fix landing in one and not its twin is the highest-value bug class left in this lane. Both carry identical normalization, explicit error checks, dangling-pointer refusal, and the TRANSITION ASSERT-AND-REFUSE divergence guard. In sync.
- **`middleware.ts`** — re-read the full custom-domain and subdomain branches. Every non-serving path (unresolved subdomain, dangling custom domain, static-map fallback) already routes through `applyProtectedRouteGate`. No gap.
- **`lib/tenant-site.ts`'s `tenantSiteUrl()`** and its three untouched callers (`site/legal`, `site/privacy-policy`, `site/terms-conditions/page.tsx`) — all three already call the shared, already-fixed helper directly rather than re-deriving a domain. Correct by construction.
- **`tenant-lookup.test.ts`** — re-read the existing suite rather than assuming coverage. 25 cases already include wrong-tenant probes, the divergence guard (both directions), ambiguous-legacy, malformed-input, and cache-eviction wrong-tenant probes. No coverage gap to close.

**Why fresh ground, not a re-tread:** none of the eleven items above appear in any prior gap file (checked each against `deploy-prep/*.md` before reading). This is the first round to come back clean on the resolver-precedence bug class specifically — the class looks closed, not just this round's sample of it.

No code changed. `tsc --noEmit` / test suite not re-run since nothing was touched.

## (2) — continuation

Nothing opened up: (1) found no new caller-side bug to trace siblings from. No action.

## (3) — gap/fluidity kept current

Carried-forward NOTICED items unchanged from last round:
1. `tenant_domains` DELETE/reactivate gap — still open, still gated on Jeff's product call.
2. `lib/tenant-schema.ts` — still confirmed dead code.
3. `platformFallback` compliance question (JEFF-MORNING-QUEUE.md) — still open.
4. `bookings/batch/route.ts`'s platform-fallback anomaly — still gated on #3.
5. `finance/upload/route.ts`'s MIME gap — fixed elsewhere (`p1-w4`, commit `5af092d2`), pending merge into `p1-w2`. No change.

NEW this round: none — nothing found to defer.

## MISSING-FEATURE GAPS / UX-FRICTION

Nothing new this round.
