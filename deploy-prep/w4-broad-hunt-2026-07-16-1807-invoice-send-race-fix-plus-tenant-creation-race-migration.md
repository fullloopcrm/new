# W4 — 17:58 queue: invoice-send race fix, Job-model archetype re-audit, tenant-creation duplication race

Per 17:58 LEADER order: (1) continue sweeping remaining send/notify routes for
double-submit races, (2) continue archetype depth, (3) continue hunting fresh ground.

## 1. FIXED — invoices/[id]/send double-submit race (commit f31cf359)

`POST /api/invoices/[id]/send` had the exact same unguarded shape already fixed this
session on quotes/documents/team-portal: it read `invoice.status` from a plain SELECT
snapshot, dispatched customer email/SMS, then flipped `status` to `'sent'` with an
unconditional UPDATE. Two near-simultaneous calls on a still-draft invoice (double-click
"Send", a client retry) both read `'draft'` and both dispatched to the customer — this
was previously flagged (17:54 report) as lower-severity than quotes since invoices has no
first-send-only pipeline side effect to duplicate, just a real duplicate customer email/SMS.

Fixed by mirroring the exact quotes/[id]/send pattern (aed1247b): atomic claim on the
draft→sent transition (`eq('status','draft')` in the WHERE) done *before* dispatch — only
the winner sends, the loser gets a clean 409. Total dispatch failure (every channel
errors) releases the claim back to `'draft'` so the existing "retry after fixing config"
behavior still works. Resends of an already-`'sent'` invoice intentionally skip the claim
(deliberate repeatable action — unchanged from before).

New test file `route.double-send-race.test.ts`, 4/4 pass. Mutation-verified: reverted the
fix via `git diff > patch && git apply -R patch`, confirmed the concurrent-race test fails
for the right reason (`[200, 200]` instead of `[200, 409]`, i.e. both calls dispatched),
restored the fix, confirmed green again. Full `src/app/api/invoices` suite: 8 files/23
tests pass. `npx tsc --noEmit`: clean on this file (3 pre-existing unrelated errors
elsewhere, same count as every report this session — bookings/broadcast xss test mock
typing + 2 sunnyside-clean-nyc marketing-nav import errors, confirmed not mine, untouched).

## 2. Archetype depth — re-audited the Job multi-touch model end-to-end, no new bug

Re-traced `createJobFromQuote` (jobs.ts:104), the sessions POST/PATCH/DELETE routes
(`api/jobs/[id]/sessions*`), and `convertSaleToJob`. All already fully hardened from
prior sessions:
- `createJobFromQuote`'s own conversion claim (`converted_at`/`converted_job_id` gate,
  with rollback-on-failure vs. best-effort-relink-if-job-already-created) is correct and
  matches the exact pattern I'm about to recommend for finding #3 below.
- Session PATCH's `status → 'completed'` transition already has the atomic
  `neq('status','completed')` claim from a prior fix this session.
- Session POST's `price_cents` handling stores raw cents into `bookings.price` with no
  `/100` division — this is the *correct* convention (matches the cents-bug fix earlier
  today, 795abe47) — false-alarmed on this myself, verified no live caller even sends
  `price_cents` to this endpoint today, so it's dormant-correct, not a bug.
- Session DELETE has no payment cleanup, but `job_payments` rows are intentionally not
  linked to a specific session (per the multi-milestone design note already in the code),
  so there's no orphan-payment risk from deleting a session.

No new fix landed here — verified-clean is the finding, matching the pattern from the
17:00 report ("re-audited Job model multi-touch path... already fully atomic-claimed
from prior fixes, nothing new to fix").

## 3. Fresh ground — FOUND, not fixed (migration-only): duplicate-tenant-creation race in createTenantFromLead()

While looking for un-swept areas, traced the platform's own sales→tenant pipeline
(`src/lib/create-tenant-from-lead.ts`), shared by BOTH the paid-proposal Stripe webhook
(`webhooks/stripe-platform/route.ts`, `checkout.session.completed`) and the manual admin
"Convert" comp override (`admin/requests/convert/route.ts`). This is a **new area this
session hasn't audited** — distinct from the quote/job/invoice/booking money-race class
already swept repeatedly.

The function's docstring claims "Idempotent: a lead already converted returns its
existing tenant," but the check is a plain check-then-act on a SELECT snapshot
(`if (lead.converted_tenant_id) return {...alreadyConverted:true}`), with the real
`converted_tenant_id` write happening only at the very end via an unconditional UPDATE —
no claim guard. Two concurrent calls for the same lead (Stripe webhook redelivery racing
a manual admin click, or literally a double-click on "Convert") both pass the check and
both run the full multi-step pipeline: territory reservation, tenant INSERT,
`provisionTenant`, `seedOnboardingTasks`, owner PIN creation. This is the same
webhook-redelivery shape already found+fixed multiple times this session (Resend,
Telnyx voice/inbound) — Stripe retries `checkout.session.completed` on any non-2xx or
timeout, and this handler's own multi-step pipeline is a plausible cause of the very
timeout that triggers the retry.

Worse than the earlier webhook dup-inserts: `territory_claims`'s
`UNIQUE(territory_id, category_id)` constraint only stops one of the two concurrent
callers from *reserving* the territory — but both callers' `23505`-recovery branch can
independently conclude they're the rightful claimant (`existing.tenant_id == null`) and
each write `territory_claims.tenant_id` for the *same* reservation row, second write
wins. Net effect: **two live, fully-provisioned tenants created for one paying
customer**, one of them silently holding no territory-exclusivity record at all, and
`partner_requests.converted_tenant_id` (last-write-wins) possibly pointing at the wrong
one.

**Not fixed live** — deliberately, for the same reason telnyx-inbound's dedup table and
the referrer-total-earned RPC were proposed rather than shipped: this repo's tracked
migrations never define `partner_requests.converted_tenant_id` or the `territory_claims`
table at all (added out-of-band), so I can't verify their real constraints (FK on
`converted_tenant_id`? unique index shape on `territory_claims`?) from this worktree, and
guessing wrong on a platform-critical tenant-provisioning path is exactly the kind of
blast radius this standing rule exists to avoid. Prepared
`2026_07_16_partner_requests_conversion_claim_column_PROPOSED.sql` — a purely additive,
nullable `conversion_claimed_at` timestamp column (no FK, no CHECK, zero collision risk
with existing status/reviewed_at semantics, which are read/written by unrelated lead
lifecycle code elsewhere and are NOT safe to repurpose as a claim marker — confirmed via
grep that `reviewed_at`/`reviewed_by` are already touched by ordinary status-change
admin actions in `admin/requests/route.ts` and `admin/prospects/[id]/route.ts`). Exact
code fix for `create-tenant-from-lead.ts` is written out in the migration file's header
comment, ready to apply once the column exists — mirrors `createJobFromQuote`'s own
claim-before-work pattern already proven correct elsewhere in this codebase.

**Recommend prioritizing this migration** — of the several PROPOSED-but-unapplied
migrations from this session, this is the one with the highest real-money blast radius
(duplicate live tenant + duplicate billing signup vs. duplicate log rows/emails on the
others).

## Scope

File-only, no push/deploy/DB. Item 1 committed (f31cf359). Item 3 is docs-only
(migration proposal, no code changed) per the standing DDL-approval rule.
