# W4 gap/fluidity checkpoint — 2026-07-18 04:11

## This pass

1. Committed a leftover uncommitted fix (Stripe Connect onboarding
   concurrent-mint race, atomic claim-on-IS-NULL) that matched exactly what
   the 04:05 LEADER order described as already closed — `9975620f`.
2. Fresh-ground surface: `src/app/api/admin/**` mutating-route (POST/PUT/
   DELETE/PATCH) authorization presence sweep, 122 files. Result: **clean**
   — every mutating handler has some form of auth guard (requireAdmin,
   requirePermission, getTenantForRequest, internal-key, bearer monitor-key,
   or admin_token cookie). Closes this named category.
3. Continued: Stripe/payment-provider idempotency-key completeness grep
   across all 11 `stripe.*.create()` call sites in `src/`. Result: **clean**
   — every money-moving call (transfers, instant payouts, refunds) already
   keyed; every checkout-session-creation call is intentionally unkeyed for
   a reasoned, precedented reason (session creation doesn't move money).
   Closes the standing item carried since the 0236 checkpoint.
4. Sampled (not exhaustive) 3 TOCTOU candidates as a taste of the
   never-formally-run race-condition sweep category — all 3 already
   hardened by prior passes. Full writeup:
   `w4-admin-mutating-authz-sweep-plus-stripe-idempotency-audit-clean-2026-07-18-0411.md`.
5. Gap/fluidity checkpoint: this file.

## Verification

- `npx tsc --noEmit` — 2 pre-existing baseline errors only (confirmed
  present before this pass's one code change too).
- `npx vitest run src/app/api/team-members` — 6/6 pass.
- No new code changes this pass beyond committing the leftover fix from
  item 1 (items 2-4 were audits/samples, all clean).

## Aging items still open (re-confirmed present, not re-litigated this pass)

Unchanged from the 0400 checkpoint's list — re-list only, no new status:
`create-tenant-from-lead` atomic-claim migration (PROPOSED, unapplied,
highest real-money blast radius), `referrers.total_earned`/`total_paid`
atomic-bump migrations (PROPOSED), `clients` dedup unique indexes
(PROPOSED), `admin/cleanup-test-bookings` name-collision risk (Jeff's
product-call pending), `comhub_get_or_create_contact_by_email` TOCTOU
hardening (blocked — live body untracked, would need `pg_get_functiondef`
pull before a safe migration can be written; `_by_phone`/`_thread` already
have a PROPOSED fix), `post-labor.ts` entity_id design question,
`categorization_patterns` semantics (open product question), `team-portal/
photo-upload/route.ts` (PROPOSED/unwired), `comhub-email` cron's
`unread_count` bump (low priority), CSRF-on-GET instances (judged not worth
fixing), dead clone `_lib/email-templates.ts` files + `nycmaid/email-
templates.ts` dead functions (cleanup, pending clone-deletion green light),
`nycmaid/sms-templates.ts` dead exports, `post-adjustments.ts`'s
`postCommissionPayment` inert status check, `rate_limit_check_and_record`
atomic RPC (PROPOSED, unapplied), `inbound_emails` dead storage, `notify-
cleaner.ts` dead code, `admin/campaigns/preview` self-XSS (dead code, no
frontend caller), `agreement.ts` dead code, `documents.status='expired'`
unreachable, `threads/[id]` assignee_id (intentional), `voice/cleanup`
unwired, `voice/dial`/`voice/control` target whitelisting, 4 dead
`sendPushToClient` exports, `notify()`'s latent `channel:'push'` no-op,
comhub voice `admin_phone`/transfer-target whitelisting, invoices/quotes/
documents `do_not_service` product question, `sendPushToTeamMember`/
`AllTeamMembers` `do_not_service` applicability, the 0844 indirect-prompt-
injection finding on `agent.ts`/`tools.ts` (architectural, needs Jeff's
call), `/api/yinez` residual unverified-tenant edge + self-reported-phone-
establishes-identity items (both open, both lower-severity than what's
shipped), `cleaners` vs `team_members` ID-space mismatch (`cron/phone-
fixup`), `client/confirm/[token]` dead code, `lead-media/signed-url` 32-bit
path entropy (style note), Jefe's non-refund owner tools' per-tool
idempotency parity (covered by webhook-level dedup already),
`telegram_webhook_events` needs periodic pruning once its migration is
applied, `admin/businesses/[id]` GET returns full raw `tenants` row to an
already-trusted super-admin (zero blast radius, cleanup only).

## New (non-tracked) observations from this pass

None beyond what's in the full writeup — items 1-3 closed clean, item 4 was
explicitly scoped as a sample, not a finding.

## Next-target candidates if continuing fresh-ground hunting

- A genuinely **systematic** (not sampled) TOCTOU/race-condition sweep:
  grep every `.select()...then-conditionally...update()` mutation site
  across `src/app/api/**` for a read-check-write gap without a compare-and-
  swap `.eq()` tied to the read snapshot, methodically file-by-file rather
  than by-inspection-of-likely-candidates. This pass's 3-file sample came
  back clean, which is weak evidence the codebase is broadly hardened by
  now (most obvious races have iteratively been found and fixed across 15+
  prior sessions) — but "sampled clean" isn't the same claim as "swept
  clean," so this category should stay open until someone actually runs the
  systematic version.
- Both of this pass's two named-category audits (admin/** mutating authz,
  Stripe idempotency completeness) are now closed — do not return to either
  without a new call site or route appearing.
- Given how much of the obvious-bug surface is now mined, the next
  highest-signal fresh angle may be less "read more route files" and more
  "verify the PROPOSED migrations list is still accurate" (confirm each of
  the ~8 PROPOSED-but-unapplied migration files still applies cleanly
  against current schema, hasn't been superseded, and is still needed) —
  file-only, no DB write, and directly useful to whoever eventually applies
  them.

No push/deploy/DB this pass.
