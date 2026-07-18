# W2 gap/fluidity refresh — 2026-07-18 01:25

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-telnyx-stripe-tenant-resolver-masked-error-gap-2026-07-18-0114.md`.

Leader's instruction this round (01:20 LEADER->W2): "Good closure -- masked DB errors silently dropping inbound SMS (incl. TCPA STOP/START) and skipping billing-status flips with zero error, now fails loud." Fresh 3-deep queue -- (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1) — new fresh-ground surface: `customer.subscription.deleted`'s billing_status write was the one Stripe billing-status flip NOT fixed last round

**Bug found:** Last round fixed `invoice.paid`/`invoice.payment_failed`'s tenant-*lookup* masked-error gap in `src/app/api/webhooks/stripe/route.ts`. Sweeping the same file's remaining `tenants.billing_status` write (`customer.subscription.deleted`, the 3rd and only other billing-status-flipping case in this switch) found it has an even worse version of the same class: no tenant lookup step at all (it updates directly `.eq('owner_email', email)`), so `error` was never even destructured from the `.update()` call — not "discarded after checking," never checked at all. Worse, the whole branch was wrapped in a try/catch scoped for the Stripe API `customers.retrieve()` call, so even if the write's error had been checked and thrown, that same catch would have silently swallowed it via `console.error` and `break`.

Consequence: a genuine DB failure on this write meant a real subscription cancellation never flipped `billing_status` to `'cancelled'` — the tenant keeps full dashboard access and billing keeps treating them as active/past_due indefinitely, with zero signal and no chance for Stripe's own retry policy to redeliver once the DB recovers (the handler still returns 200 `received: true`).

**Fixed:** isolated the DB write from the `customers.retrieve()` try/catch (that Stripe-API-call catch stays best-effort, unchanged — considered, not touched, see below) and check the write's own `error` explicitly, throwing outside that catch so it actually propagates (uncaught -> 500 -> Stripe redelivers). Same pattern as every other resolver/write fix this session.

## (2) — continued: swept for the same masked-write-error shape elsewhere in tenant-status-flip code and found `accept-invite.ts`

Searched for other tenant `status`/`billing_status` writes across the repo. Found and ruled out several already-hardened ones (`dashboard/onboarding/activate/route.ts`, `admin/sales/route.ts`, `lib/activate-tenant.ts` all already check the write's error correctly). One genuine gap: `src/lib/accept-invite.ts`'s `acceptInviteForAdmin()` — the invite-accepted write (`tenant_invites.update({accepted:true})`) AND the tenant-activation write (`tenants.update({status:'active'}).eq('status','setup')`) both had zero error destructuring, and the function unconditionally returned `{status:'accepted', tenantId}` regardless of whether either write actually succeeded. The one caller (`src/app/join/[token]/accept/page.tsx`) redirects straight to `/dashboard` on that return — so a DB blip on either write meant an admin who thought they'd accepted their invite either got a replayable invite token, or a tenant stuck in `status:'setup'` forever (never resolves as serving — `tenantServesSite`), both indistinguishable from success at the call site.

**Fixed:** check both writes' `error` explicitly and throw (`TENANT_INVITE_ACCEPT_UPDATE_ERROR` / `TENANT_INVITE_ACTIVATE_ERROR`). The one caller is a Next.js server component page with no try/catch, so a thrown error correctly surfaces via Next's error boundary instead of a silent "success" redirect.

**Considered, not touched:**
- `customers.retrieve()`'s own try/catch in the `customer.subscription.deleted` branch stays best-effort/swallowed, unchanged from existing behavior — that's an external Stripe API call resolving the lookup key, not our own DB masking its error. Different risk profile from the DB write; not escalating an existing product decision about Stripe-API-call resilience without a product call.
- Swept all other `tenants.status`/`billing_status` `.update()` call sites repo-wide (grep for every `.from('tenants')` immediately followed by `.update(`) — `dashboard/onboarding/activate/route.ts`, `admin/sales/route.ts`, `admin/tenants/[id]/route.ts`, `admin/businesses/[id]/route.ts`, `lib/activate-tenant.ts` (both status-flip sites) all already check the write's error correctly (prior rounds' hardening). No further siblings found.

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
13. `invoice.paid`/`invoice.payment_failed` resolve by `owner_email` with `.maybeSingle()`, which throws (now loud) if two tenants ever share an `owner_email` — no DB-level unique constraint on that column. Same class as `tenants.domain`'s missing constraint (#9). Not acting.

NEW this round:
14. `customers.retrieve()`'s best-effort swallow in `customer.subscription.deleted` (see above) — if the Stripe API call itself fails, the whole branch silently no-ops with the same "no signal, no Stripe redelivery" consequence as the DB-write bug just fixed, just one layer up (an external API failure, not our DB). Flagging as the same underlying "must reach the DB write to have any chance of correctness" pattern; not touching an existing Stripe-API-resilience decision without a product call.
15. `accept-invite.ts`'s `tenant_members` insert (the one un-gated by an `if (!existingMember)` branch) still doesn't check its own insert error — lower severity than the two writes fixed this round (a failed insert here just means the admin isn't a member yet, caught on next login attempt via `getCurrentTenant()`'s own membership lookup, rather than a false "success"). Flagging, not acting — would need its own pass if elevated.

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward, unchanged:
16. `dashboard/referrals/page.tsx`'s referrals-tab copy overpromises per-referrer rate control that doesn't exist.

## Verification this round

- `npx tsc --noEmit` clean (repo-wide).
- Fixed 2 tenant-state write call sites across 2 files: `webhooks/stripe/route.ts` (`customer.subscription.deleted` billing_status write), `lib/accept-invite.ts` (`tenant_invites.accepted` write + `tenants.status=active` write).
- 3 new test cases across 2 new/updated test files: `webhooks/stripe/route.subscription-deleted-update-error.test.ts` (new file), `lib/accept-invite.test.ts` (2 new MASKED-ERROR PROBE cases added to the existing file) — each proves a genuine DB failure on the write now throws (surfaces loud) instead of the old silent "success" return.
- Full repo suite: 692 files, 2969 passed, 37 skipped, 0 failed.

File-only, no push/deploy/DB write from this worker. 2 code commits this round (2 fixes + their tests, split across 2 commits matching the 2 files touched) + 1 docs commit (this file).
