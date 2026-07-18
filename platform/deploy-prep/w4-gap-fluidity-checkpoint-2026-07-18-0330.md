# W4 gap/fluidity checkpoint — 2026-07-18 03:30

## This pass

1. Ran the 03:19 order's two-surface audit (leader's choice, did both):
   SMS/email cost-abuse rate-limiting sweep, and a full `admin/**` GET/read
   audit (auth presence, tenant-scoping, secret-exposure in responses).
   Both came up clean — no new exploitable gap. Full writeup:
   `w4-broad-hunt-2026-07-18-0330-sms-email-cost-abuse-plus-admin-read-audit-clean.md`.
2. Gap/fluidity checkpoint: this file.

Note: this session could not read back
`deploy-prep/w4-gap-fluidity-checkpoint-2026-07-18-0236.md` from the
working tree even though `git show e9b9360c --stat` shows it added at that
commit and `git show e9b9360c:<path>` can print its blob — `git ls-tree`
at both that commit and HEAD shows the file absent, and the file isn't on
disk. `e9b9360c` is confirmed an ancestor of the current HEAD
(`git merge-base --is-ancestor` true). Flagging as a worktree/repo
oddity worth a look (possibly cross-worker interference in a shared
`.git`, since this worktree is one of several parallel worker lanes) —
not investigated further since it's outside this pass's scope and not
blocking. Carried-forward aging items below are reconstructed from that
commit's blob content (readable via `git show <sha>:<path>` even though
the working-tree file is missing).

## Verification

No code changed this pass (both surfaces above were audit-only, no fix
needed). No tsc/test run performed — nothing to verify.

## Aging items still open (re-confirmed present, not re-litigated this pass)

Unchanged from the 0236 checkpoint's list — re-list only, no new status:
`create-tenant-from-lead` atomic-claim migration (PROPOSED, unapplied,
highest real-money blast radius), `referrers.total_earned`/`total_paid`
atomic-bump migrations (PROPOSED 2026-07-16), `clients` dedup unique
indexes (PROPOSED 2026-07-17), `admin/cleanup-test-bookings`
name-collision risk (Jeff's product-call pending),
`comhub_get_or_create_contact_by_email` TOCTOU hardening (blocked on
pulling its real live body), `post-labor.ts`/`postDepositToLedger`
entity_id design question, `categorization_patterns` recategorization
semantics (open product question), `team-portal/photo-upload/route.ts`
(PROPOSED/unwired), `comhub-email` cron's `unread_count` bump (low
priority), CSRF-on-GET instances (judged not worth fixing), dead clone
`_lib/email-templates.ts` files (4 tenants) + `nycmaid/email-templates.ts`
dead functions (cleanup candidate pending clone-deletion green light),
`nycmaid/sms-templates.ts` dead exports, `post-adjustments.ts`'s
`postCommissionPayment` inert status check,
`rate_limit_check_and_record` atomic RPC (PROPOSED, unapplied — same
migration referenced in this pass's surface-1 writeup), `inbound_emails`
dead storage, `notify-cleaner.ts` dead code, `admin/campaigns/preview`
self-XSS (dead code, no frontend caller), `agreement.ts` dead code,
`documents.status='expired'` unreachable, `threads/[id]` assignee_id
(intentional), `voice/cleanup` unwired, `voice/dial`/`voice/control`
target whitelisting, 4 dead `sendPushToClient` exports, `notify()`'s
latent `channel:'push'` no-op, comhub voice `admin_phone`/transfer-target
whitelisting, invoices/quotes/documents `do_not_service` product
question, `sendPushToTeamMember`/`AllTeamMembers` `do_not_service`
applicability, the 0844 indirect-prompt-injection finding on
`agent.ts`/`tools.ts` (architectural, needs Jeff's call), `/api/yinez`
residual unverified-tenant edge + self-reported-phone-establishes-identity
items (both open, both lower-severity than what's shipped), `cleaners` vs
`team_members` ID-space mismatch (`cron/phone-fixup`),
`client/confirm/[token]` dead code (`client_confirm_token` never
written), `lead-media/signed-url` 32-bit path entropy (style note, not
tracked as a real gap), Jefe's non-refund owner tools' per-tool
idempotency parity (covered by webhook-level dedup already, noted only
for defense-in-depth), `telegram_webhook_events` needs periodic pruning
once its migration is applied.

## New (low-priority, non-tracked) observation from this pass

`admin/businesses/[id]` GET returns the full raw `tenants` row (including
encrypted-at-rest vendor-key ciphertext blobs) to an already-authenticated
platform super-admin, rather than a curated subset. Zero exploitable blast
radius today (single trust tier, ciphertext not plaintext) — not opened as
a tracked gap, just noted in the surface-2 writeup in case a future pass
touches that file for another reason and wants to trim the response then.

## Next-target candidates if continuing fresh-ground hunting

- SMS-body smishing-content sweep (~60 `sendSMS()` call sites) — still the
  one standing open lead from the 0236 checkpoint.
- A final confirming grep for Stripe/payment-provider calls missing an
  `idempotencyKey` beyond the 2 already-covered call sites, per the 0236
  checkpoint's note.
- Outbound-webhook SSRF (tenant-configured webhook URLs, if any exist) —
  unconfirmed whether this codebase even has that surface; worth a first
  grep before committing to it.
- Both surfaces given in this session's order (SMS/email cost-abuse,
  admin/** read) are now closed as named categories — do not return
  without a new signal.

No push/deploy/DB this pass.
