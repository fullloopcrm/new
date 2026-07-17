# W2 gap/fluidity refresh — 2026-07-17 08:13

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-documents-void-bank-match-write-scope-hardening-2026-07-17-0801.md`.

Leader's fresh 3-deep queue this round: (1) continue the write-side tenant-scope sweep against the remaining ~70 hits, (2) continue fresh-ground hunting, (3) keep gap/fluidity current. All 3 done — see below.

## Write-side tenant-scope sweep — continued (3 more real instances, still NOT live bugs)

Re-ran the same grep shape from last round (bare `supabaseAdmin….update(…).eq('id', …)` with no `tenant_id` anywhere in the same statement) fresh against current `main` state: 67 raw hits (down from last round's ~80 raw count — some overlap in how the two passes windowed multi-line chains, not a claim that 13 were fixed).

Built a table→tenant_id map from every `CREATE TABLE`/`ALTER TABLE … ADD COLUMN` across `migrations/*.sql`, `src/lib/migrations/*.sql`, and `supabase/*.sql` (137 tables seen, 126 carry `tenant_id`) to stop hand-checking schema per hit. Cross-referenced each of the 67 against that map plus whether the route has a `tenantId`-shaped authenticated context in scope:

- **7 hits**: target table has no `tenant_id` at all — genuinely platform-wide by design (`admin_users`, `platform_announcements`, `platform_feedback`, `crm_notes`). Correct as-is.
- **19 hits**: table has `tenant_id`, but no per-request `tenantId` variable in the file — mostly the `tenants` table's own self-referencing update (`id` IS the tenant, e.g. `admin/tenants`, `dashboard/onboarding/profile`, `finance/bank-connect/session`), admin routes managing arbitrary tenants/prospects cross-tenant by design, or cron jobs (`cron/post-job-followup`, `cron/recurring-expenses`) that intentionally iterate every tenant's rows. Correct as-is.
- **40 hits**: table has `tenant_id` AND a `tenantId` variable exists in the file. Spot-checked every one of these individually (not just grep-matched) — most are `tenants`-table admin management, cron jobs, or webhook handlers (`telnyx`, `telnyx-voice`, `resend`, `stripe`) keyed off signature-verified external ids with no caller-asserted tenant context to redundantly filter on (confirmed by reading `webhooks/telnyx/route.ts` and `webhooks/stripe/route.ts` directly — `msgId`/`recipient.id`/`prospectId` all come from the verified webhook payload, not a request the caller controls). **3 matched the exact bug class from last round** (a preceding tenant-scoped SELECT immediately followed by an UPDATE on the same id that dropped the redundant filter):
  - `POST /api/team-portal/running-late` — booking lookup chains `.eq('id', bookingId).eq('tenant_id', auth.tid).eq('team_member_id', auth.id)`; the `running_late_at` UPDATE right after only filtered `.eq('id', bookingId)`, unlike this same file's `notify()`/`sendPushToTenantAdmins()` calls two lines down.
  - `POST /api/portal/collect` (Selena conversation handoff) — `sms_conversations` lookup chains `.eq('id', convo_id).eq('tenant_id', tenant.id).is('completed_at', null)`; the state-transition UPDATE right after only filtered `.eq('id', convo_id)`, unlike the `clients` UPDATE earlier in the same file.
  - `POST /api/admin-auth` (tenant-admin PIN login) — member lookup chains `.eq('tenant_id', headerTenantId).eq('pin_hash', …)`; the `pin_last_login` UPDATE right after only filtered `.eq('id', member.id)`. Highest-sensitivity instance found in this bug class so far — it's the tenant-admin PIN auth path itself.
- **1 hit** (`pin-reset/member_pin_reset_codes`): table has no `tenant_id` column (reset codes aren't tenant-owned rows, they're keyed by their own token) but a `tenantId` var exists elsewhere in the file for an unrelated purpose. Correct as-is — not this bug class.

**Also swept `.delete(` calls for the identical shape (bare `.eq('id', …)` with no `tenant_id` anywhere in the statement): 0 hits.** Every DELETE in the codebase already carries tenant scope.

**Honest assessment, same as last round**: none of the 3 are exploitable on the real schema. `bookings.id`, `sms_conversations.id`, and `tenant_members.id` are all globally-unique UUID PKs, and in every case the UPDATE only runs after the preceding SELECT already proved the id belongs to the caller's own tenant (and, for running-late, the caller's own team-member record too). Defense-in-depth drift, not a live leak — fixed for the same reason as last round: a future refactor that loosens the guard would silently reopen a cross-tenant write with nothing to catch it.

**Fixed**: all 3 UPDATEs now carry the redundant `tenant_id` filter. 2 new dedicated `route.tenant-scope.test.ts` files (running-late, portal/collect) using the same synthetic same-id-across-tenants harness pattern as last round's documents/void fix. admin-auth's existing `route.fails-closed.test.ts` positive-control test gained an `updatedMemberTenantIds` assertion instead of a new file (it already had a wrong-tenant-probe test class); its hand-rolled mock query builder needed a second chainable `.eq()` to match the route's new two-filter UPDATE. Mutation-verified all 3: reverted each fix individually, watched RED, restored, watched GREEN.

`npx tsc --noEmit`: clean. `eslint` on all touched files: 0 errors, 0 new warnings. Full suite: 549 files (was 547), 2455 tests total (was 2453) — 2418 passed + 37 skipped, 0 failed, 0 regressions.

No DB migration needed — `tenant_id` already exists on `bookings`, `sms_conversations`, and `tenant_members`.

**Scope note, thread status**: ~64 of the ~67 raw hits are now accounted for as correct-by-design (platform-wide table, tenants-self-update, admin/cron/webhook cross-tenant-by-design). A handful of `comhub_threads`/`comhub_active_calls` updates (`team-portal/messages`, `portal/messages`, `webhooks/telnyx-voice`) use ids derived server-side through tenant-scoped RPC calls rather than directly from request input — same "safe by construction" shape as `client/confirm/[token]`'s booking updates, not the same bug class. Calling this thread **closed** — the remaining unaccounted-for handful are a different, lower-priority shape (server-derived id, not user-input-tainted) that doesn't fit the "SELECT scoped it, WRITE dropped it" pattern this thread was hunting.

## Fresh-ground hunting — two candidate bug classes swept, both clean

With the tenant-scope UPDATE-drift thread closed, hunted two adjacent classes this round:

1. **DELETE-drift** (same shape as the UPDATE bug, but for `.delete()` calls): 0 hits, reported above.
2. **INSERT missing `tenant_id` on a tenant-owned table**: scanned every `supabaseAdmin.from(<tenant-owned table>).insert(...)` call for whether the inserted payload sets `tenant_id` anywhere in the object literal. 0 hits — every insert onto a tenant-owned table in `src/app/api` sets `tenant_id` explicitly (or goes through `tenantDb`, which auto-stamps it).

Also spot-checked the codebase's 3 batch/bulk-mutation routes (`bookings/batch-update`, `team-applications/bulk-approve`, `finance/bank-transactions/accept-suggestions`) by hand, since batch operations are a classic place for scope bugs to hide — all 3 correctly chain `.eq('tenant_id', tenantId)` on every update, and `accept-suggestions` explicitly routes through `tenantDb` with an inline comment noting it was hardened for exactly this reason previously.

No new bug this round. Static verification only (no code changed by this section): `npx tsc --noEmit` clean (same run as above, no files touched here).

## NOTICED — not fixed, flagging for the leader/Jeff

Carried forward unchanged from `w2-fresh-ground-sweep-no-new-bug-plus-dead-column-2026-07-17-0747.md`, items 1-17. No new items this round.

## MISSING-FEATURE GAPS

Carried forward unchanged from the prior round's list, items 1-26.

## UX-FRICTION

Carried forward unchanged from the prior round's list.

File-only, no push/deploy/DB. 2 commits this round (1× `fix`+tests, 1× `docs`).
