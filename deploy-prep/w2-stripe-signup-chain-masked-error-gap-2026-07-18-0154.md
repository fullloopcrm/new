# W2 gap/fluidity refresh — 2026-07-18 01:54

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-tenant-members-insert-masked-error-gap-2026-07-18-0140.md`.

Leader's instruction this round (01:44 LEADER->W2): "Good closure on the masked-error owner-PIN gap (admin got a dead PIN that looked valid) plus the worse-than-scored accept-invite.ts gap that permanently locked invites with no retry. Fresh 3-deep queue (file-only, no push/deploy/DB each): (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current."

## (1) — new fresh-ground surface: `webhooks/stripe/route.ts`'s self-serve-signup `tenant_invites` insert masked a DB error, sending a paying tenant a dead join link

**Bug found:** Swept every `tenant_invites` write call site repo-wide. `/api/admin/invites` (admin-initiated invite creation) already checks the insert's `error` correctly and returns 500 on failure. The `checkout.session.completed` / full-loop-signup branch in `webhooks/stripe/route.ts` — the ONE OTHER `tenant_invites` insert site — did not: `await supabaseAdmin.from('tenant_invites').insert({...})` with the result entirely discarded, immediately followed by sending a "Welcome — your account is set up and ready" email containing a `joinUrl` for the token that was (or wasn't) just written.

Consequence: a DB-level failure on this one insert (RLS deny, transient blip) is invisible to supabase-js's throw-based catch (it resolves into the returned `error` field, not a thrown exception) — the code fell straight through and sent the welcome email anyway. A brand-new, just-paid tenant owner clicks "Get Started" and lands on `lookupInvite()`'s generic "Invalid Invite — contact your administrator" page, indistinguishable from a bogus token, with zero signal to anyone: the webhook still returned `{received:true, signup_paid:true}`.

**Fixed:** check the insert's `error` and throw, routing into the existing try/catch (previously scoped only to the email-send step) — which already has the correct fallback for this exact situation ("tenant is created, admin can manually resend via /api/admin/invites"). Now that fallback also covers the insert failure, so the misleading email never goes out.

## (2) — continued: tracing this fix's own call chain upward surfaced three more masked errors in the same signup branch, one strictly worse

Re-read the full `checkout.session.completed` / full-loop-signup block end to end (same branch (1)'s fix lives in) looking for the same unchecked-`error` shape upstream of the fix. Found three:

1. **The `prospects` CAS claim update** (status `approved|reviewing|new` → `paid`) — only `data` destructured. `maybeSingle()` legitimately returns `data:null` when another webhook delivery already won the race (the normal case this comparison exists for) — but a genuine DB failure looked identical and silently took the `already_processed:true` early-return. **Worst of the four found this round:** a real Stripe payment vanishes with no tenant ever created, no error surfaced, and no retry (webhook still returns 200, so Stripe never redelivers).
2. **The post-claim prospect re-fetch** (`.select('*').eq('id', prospectId).single()`) — same, only `data` destructured. A failure left `prospect` undefined, silently skipping the entire tenant-creation block below.
3. **The `tenants` insert itself** — same, only `data` destructured. A failure left `tenant` undefined, silently skipping provisioning + the owner invite + the welcome email, with the prospect stuck at `status:'paid'` and no retry path (the CAS guard above only lets one delivery through).

All three now check `error` and throw (uncaught → 500), matching this lane's established idiom (same shape as the `customer.subscription.deleted` / `invoice.paid` fixes from earlier rounds in this file).

Also hardened the `prospects.tenant_id` backfill write just below (previously discarded its result with zero destructure at all) — but **logged, not thrown**: by that point the tenant is already created and fully provisioned, and the CAS guard means there's no retry path that would ever revisit this write — it's a reporting/back-link concern (admin dashboard's prospect→tenant display), not a gate on the paid signup itself. Throwing there would abort the higher-stakes owner-invite send over a lower-stakes linkage write. Proportionate fix: log loudly instead of the old silent discard, let the invite still go out.

**Considered, not touched:**
- The static pay-link ownership-check branch (lines ~78-104, `bookings`/`tenants.payment_link` reads) already checks nothing beyond `maybeSingle()` returning `null` — but these are read-only lookups gating a security check (`linkMatchesTenant`), not writes; a DB failure here fails closed (link doesn't match → booking not linked), which is the safe direction. Not the same masked-error class (no data loss, no false-success). Not acted on.
- The `entities` insert (line ~223) and the `provisionTenant()` call remain unchecked/best-effort. `provisionTenant` is documented as "idempotent — safe to re-run" and seeds non-critical defaults (service types, Selena config, business hours) that the tenant can fix from Settings; `entities` similarly seeds a default entity that `activateTenant`-style logic elsewhere already tolerates being retried/backfilled. Lower severity than the four fixed above (none of these silently claim a payment succeeded when the tenant creation itself failed) — flagging as a possible future round, not acting this round to keep this round's diff reviewable.

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
16. ~~`webhooks/stripe/route.ts`'s self-serve-signup `tenant_invites` insert unchecked error~~ — fixed above (1).
17. ~~Full-loop-signup `prospects` CAS-claim, post-claim fetch, and `tenants` insert unchecked errors~~ — fixed above (2).
18. ~~Full-loop-signup `prospects.tenant_id` backfill unchecked error~~ — fixed above (2), logged not thrown.

NEW this round:
19. `entities` insert and `provisionTenant()` in the same full-loop-signup branch remain best-effort/unchecked — see "Considered, not touched" above. Candidate for a future round; not acted on this round.

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward, unchanged:
20. `dashboard/referrals/page.tsx`'s referrals-tab copy overpromises per-referrer rate control that doesn't exist.
21. `admin/sales/LeadsPanel.tsx` `ownerPin` display gap — see #15 above (filed under this section too — it's UX-friction, not a correctness bug).

## Verification this round

- `npx tsc --noEmit` clean (repo-wide), both commits.
- Fixed 4 unchecked-write call sites across 1 file: `webhooks/stripe/route.ts` (`tenant_invites` insert; `prospects` CAS-claim update; `prospects` re-fetch; `tenants` insert — all throw; `prospects.tenant_id` backfill — logs, doesn't throw).
- 5 new test files, one bug each: `route.invite-insert-error.test.ts`, `route.prospect-claim-error.test.ts`, `route.prospect-fetch-error.test.ts`, `route.tenant-insert-error.test.ts`, `route.prospect-link-error.test.ts` — each drives a real Stripe-payment signup through the full-loop-signup branch with one write mocked to fail, proving the fix throws (or, for the backfill, logs-but-continues) instead of the old silent success/skip.
- Stripe webhook suite: 12 test files, 22 tests, all passing.
- Full repo suite: 698 files, 2977 passed, 37 skipped, 0 failed (the prior round's flaky `finance-export.test.ts` 200k-row pagination timeout did not recur this run).

File-only, no push/deploy/DB write from this worker. 2 code commits this round (2 fixes + their tests, split by the (1)/(2) queue items) + 1 docs commit (this file).
