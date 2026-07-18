# W2 gap/fluidity refresh — 2026-07-18 02:10

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-stripe-signup-chain-masked-error-gap-2026-07-18-0154.md`.

Leader's instruction this round (02:00 LEADER->W2): "Real one -- the full-loop-signup webhook chain had 4 unchecked writes, worst being the prospects CAS-claim update where a real Stripe payment could vanish silently with no tenant created and no retry path. All now throw loud. Fresh 3-deep queue (file-only, no push/deploy/DB each): (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current."

## (1) — new fresh-ground surface: full-loop-signup's default-entity insert masked a DB error AND duplicated the canonical `ensureDefaultEntity()` helper

**Bug found:** Last round's "Considered, not touched" list flagged the `entities` insert in the same `checkout.session.completed` / full-loop-signup branch as "unchecked/best-effort" but deferred it. Picked it up this round. It's worse than scored: `await supabaseAdmin.from('entities').insert({...})` didn't destructure the result AT ALL (not even `data`) — a genuine DB failure (RLS deny, transient blip) was completely invisible. Separately, it duplicated — without the idempotency guard or error check — the canonical `ensureDefaultEntity()` helper (`lib/entity-provision.ts`) that `activateTenant()` already uses via its own doc comment: "the ONE path every creation door should ultimately funnel through." A tenant with no default entity has nowhere for finance rows (`entity_id`) or legal identity fields (legal_name/EIN/fiscal-year) to land, with zero signal to anyone that seeding failed.

**Fixed:** call `ensureDefaultEntity(tenant.id, prospect.business_name)` instead of hand-rolling the duplicate. Left unwrapped so a genuine failure throws uncaught → 500 → Stripe retry, matching the claim/fetch/tenant-insert idiom already hardened in this branch. 1 new test (`route.entity-insert-error.test.ts`) + updated the 2 existing tests that mocked the raw `entities` table insert to mock the shared helper module instead (matching this codebase's convention for `provisionTenant()`).

## (2) — continued: tracing why this branch hand-rolls provisioning at all surfaced a much bigger structural gap — full-loop-signup never calls `activateTenant()`, unlike its own sibling webhook

**Finding, not acted on — flagging HIGH SEVERITY, needs a product/eng call before touching:**

`webhooks/stripe/route.ts`'s Full Loop self-serve signup branch (Stripe Checkout, `prospects`-based) creates the tenant, seeds a default entity + `provisionTenant()`'s settings, then goes straight to a `tenant_invites` insert + welcome email. It never calls `activateTenant()`.

Its sibling webhook, `webhooks/stripe-platform/route.ts` (a *different* paid-signup path — proposal-based lead conversion via `createTenantFromLead()`), DOES call `activateTenant()` right after tenant creation, with exactly the pattern you'd want here: best-effort, wrapped in try/catch, "an activation failure must NOT fail the webhook — the paid tenant already exists and an admin can re-run activation from the board."

Two parallel paid-tenant-creation flows, only one of which drives the tenant to actually-live. Concretely, a Stripe Checkout self-serve signup (the `webhooks/stripe/route.ts` path) never gets:
- A founding team member (the schedule spine needs ≥1 active team member — `activateTenant()` step 4).
- Onboarding tasks seeded (step 3).
- Chart of accounts / HR defaults (step 3b, alongside the entity — my fix above only picked up the entity half of this step).
- A review destination default (step "Review destination").
- **A `tenant_domains` row or an actual Vercel carrying-domain registration** (step 7-8) — this is the one squarely in my lane (tenant resolution owns `tenant_domains`). Without it, this tenant has no live URL anywhere and can never be found by domain-based resolution; the owner's only way in is the invite-email join link on the main app host.
- The onboarding-gate smoke test before flipping status — this branch sets `status: 'active'` directly at tenant-insert time, unconditionally, unlike `activateTenant()` which only flips active when the spine (gate + owner login + a domain that actually serves) genuinely passes.

**Why I didn't just wire in `activateTenant()` to match the sibling:** traced the interaction and found a real, unverified conflict risk, not a purely mechanical fix:

- `activateTenant()`'s "Owner login" step (5) creates an owner `tenant_members` row **immediately**, keyed on a PIN (`pin_hash`/`pin_set_at`, no `clerk_user_id`), the moment it runs — i.e. before the invite is ever accepted.
- This branch's own owner path is a *token-based invite* (`tenant_invites` insert + join-link email) — the owner is meant to accept via Clerk sign-in, at which point `accept-invite.ts`'s `acceptInviteForAdmin()` looks up an existing member by `(tenant_id, clerk_user_id)` and inserts a **second**, Clerk-keyed `tenant_members` row (`role: invite.role || 'owner'`) if none matches.
- Calling `activateTenant()` before the invite is accepted would create the PIN-based owner row first; the Clerk-based row would land later as a second insert with `clerk_user_id` filled in and the PIN-based one otherwise unmatched by that lookup (which only checks `clerk_user_id`). Whether that ends up as a harmless dead PIN row (same class already fixed in `createTenantFromLead()` earlier this lane) or actually breaks the invite-accept insert depends on constraints I could not verify — `supabase/schema.sql`'s `tenant_members` definition on disk doesn't even list the `pin_hash`/`pin_set_at` columns the code writes, so that file is stale relative to the live schema and isn't a safe source of truth for this check without live DB access, which I don't have.
- `activateTenant()` also makes real external Vercel API calls (`registerCarryingDomain`/`registerCustomDomain`) — cost- and infra-affecting side effects I should not wire into a live payment webhook's code path without sign-off, even though the code itself doesn't execute until deployed.

Recommendation: either (a) make `webhooks/stripe/route.ts`'s full-loop-signup branch call `activateTenant()` the same way `stripe-platform` does, after auditing/adjusting the owner-login step so it doesn't race the invite-accept path (e.g. skip step 5 when a `tenant_invites` row for an owner is about to be sent), or (b) keep the two paths intentionally separate but backfill the missing pieces (team member, onboarding tasks, chart of accounts/HR, domain registration, gate-gated status flip) explicitly. Either is a real behavior change to the paid-signup path that deserves a product/eng decision, not a same-round mechanical fix. Filing as new NOTICED item below.

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

CLOSED this round:
16. ~~`entities` insert in full-loop-signup unchecked/best-effort~~ — fixed above (1): now uses `ensureDefaultEntity()`.

NEW this round:
17. **HIGH SEVERITY, structural — full-loop-signup (`webhooks/stripe/route.ts`) never calls `activateTenant()`, unlike its sibling `webhooks/stripe-platform/route.ts`** — see (2) above. Self-serve Stripe Checkout tenants get no team member, no onboarding tasks, no chart of accounts/HR, no domain registration (`tenant_domains` row + Vercel carrying domain — my own lane), no review destination, and no gate-checked activation before `status` is set to `'active'` unconditionally at insert time. Real, unverified conflict risk between `activateTenant()`'s immediate PIN-based owner-login step and this branch's Clerk-based invite-accept flow — needs investigation with live-schema access and a product/eng decision before wiring in, not a same-round mechanical fix.
18. `provisionTenant()` in the same signup branch is unwrapped in a try/catch — it DOES throw loud on its own internal failures (verified: it's already fully hardened, checks every write's `error`, and rolls back partial seeding before rethrowing), so an uncaught throw here still correctly surfaces as 500 → Stripe retry. Re-scored from last round's "remains unchecked/best-effort" — that description was inaccurate; `provisionTenant()` was never actually a masked-error site. No action needed.
19. Related structural note: even with every write in this branch now properly throwing, the CAS claim (`prospects.status: 'paid'`) happens *before* the tenant insert — so a genuine failure anywhere after the claim (tenant insert, entity seed, `provisionTenant()`) still has no retry path, because a Stripe-redelivered webhook sees the prospect already claimed and takes the `already_processed` early-return. This is a pre-existing structural property of the CAS design (not something this round's fixes introduced or could fix in isolation) — flagging as a carried-forward architecture question, not acting.

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward, unchanged:
20. `dashboard/referrals/page.tsx`'s referrals-tab copy overpromises per-referrer rate control that doesn't exist.
21. `admin/sales/LeadsPanel.tsx` `ownerPin` display gap — see #15 above (filed under this section too — it's UX-friction, not a correctness bug).

New this round:
22. Full-loop-signup's activateTenant() bypass (#17) is filed here too — it's as much a missing-feature gap (no team/tasks/domain/ledger seed for self-serve tenants) as a masked-error class bug.

## Verification this round

- `npx tsc --noEmit` clean (repo-wide).
- Fixed 1 unchecked-write call site: `webhooks/stripe/route.ts`'s `entities` insert, replaced with the shared `ensureDefaultEntity()` helper.
- 1 new test file (`route.entity-insert-error.test.ts`, real DB-failure probe through the actual `ensureDefaultEntity()` code path, not mocked) + 2 existing tests updated to mock the shared helper module instead of the raw table.
- Stripe webhook suite: 13 test files, 23 tests, all passing.
- Full repo suite: 699 files, 2978 passed, 37 skipped, 0 failed.

File-only, no push/deploy/DB write from this worker. 1 code commit this round (fix + tests) + 1 docs commit (this file).
