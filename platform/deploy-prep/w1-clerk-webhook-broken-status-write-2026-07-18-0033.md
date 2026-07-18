# Fixed: Clerk webhook's user.deleted handler silently no-op'd on every delivery since it was written — writes to a tenant_members column that has never existed

**From:** W1, 00:23 order item (1) (fresh-ground surface) + item (2) (continuation).
**Scope:** last round's doc (`w1-telegram-resend-webhook-redelivery-dedup-2026-07-18-0020.md`)
ruled `webhooks/clerk/route.ts` "read-only-idempotent-by-design... not
re-checked this round" and called the webhook redelivery-dedup sweep
complete. **That claim was wrong** — I hadn't actually read the handler
bodies against the real schema. This round does that read and finds a live,
confirmed bug plus two smaller ones opened up by digging into the same file.

## Fixed (item 1) — user.deleted wrote to a column that doesn't exist

`webhooks/clerk/route.ts`'s `user.deleted` case has read, since it was
written:

```ts
await supabaseAdmin.from('tenant_members').update({ status: 'inactive' }).eq('clerk_user_id', data.id)
```

`tenant_members` has **never had a `status` column** — confirmed three ways:
`supabase/schema.sql`'s `CREATE TABLE tenant_members` (id, tenant_id,
clerk_user_id, role, name, email, phone, created_at — no status), every
migration touching the table (`024_tenant_members_clerk_optional.sql`,
`047_user_preferences.sql`, `2026_07_11_rls_tenant_tables.sql`,
`2026_07_16_client_team_pin_hash.sql` — none add one), and
`admin/businesses/[id]/users/route.ts`'s GET handler, which computes a
`status` field for the API response *in application code* (`(m.clerk_user_id
|| m.pin_hash) ? 'active' : 'pending'`) precisely because there's no real
column to read. The update had no `{ error }` destructured and no
`.then()`/`.catch()` — a PostgREST "column does not exist" error was
silently swallowed on every single Clerk-side user deletion since this
handler existed.

I also checked whether anything reads `tenant_members.status` to enforce the
deactivation even if the column existed — it doesn't. Both membership
resolution paths (`getCurrentTenant()` in `src/lib/tenant.ts`,
`tenantAuth()`/`requireTenant` in `src/lib/tenant-query.ts`) look up
`tenant_members` by `clerk_user_id` alone, no status filter at all. So this
wasn't a partially-working safety net — it was fully inert end-to-end, and
the actual live risk is narrower than "deactivation is broken": a Clerk user
deleted **directly from Clerk's own dashboard** (not through our
`/api/admin/users/:id` or `/api/admin/businesses/:id/users` DELETE
endpoints, which already hard-delete the local `tenant_members` row and are
unaffected by this) left an orphaned `tenant_members` row behind forever —
stale data (wrong member count/list in the admin UI), not an auth bypass,
since Clerk itself still gates the actual session.

**Fix:** changed `user.deleted` to `.delete()` the `tenant_members` row(s)
for that `clerk_user_id`, matching the exact removal semantics the app's own
admin DELETE endpoints already use. Checked for FK fallout first — only one
FK references `tenant_members.id` (`user_preferences.tenant_member_id`,
`047_user_preferences.sql`), and it's `ON DELETE CASCADE`, so deleting is
safe. Added `{ error }` handling with a `console.error` on both this and the
`user.updated` write (neither checked errors before).

## Fixed (item 2, continuation — same file) — user.updated could sync the wrong email address

Digging into the same handler for the fix above, `user.updated` took
`data.email_addresses?.[0]?.email_address` as "the" email to sync onto
`tenant_members.email`. Verified against Clerk's own docs (WebFetch,
`clerk.com/docs/references/backend/types/backend-user`) rather than
guessing: `email_addresses` "includes the primary" but **does not guarantee
it's at index 0** — `primary_email_address_id` is the field that identifies
which entry is actually primary, and a user can reorder/add addresses
freely. Taking index 0 blindly could sync a secondary, possibly-unverified
address into the field the admin UI and any future email-based lookup treats
as this member's email.

**Fix:** match `data.email_addresses` against `data.primary_email_address_id`
first, falling back to index 0 only when `primary_email_address_id` is
absent from the payload (defensive — Clerk's docs don't guarantee it's
always present on every historical event shape).

## Fixed (item 2, continuation) — no Svix redelivery dedup

Same class already fixed on Telnyx/Telegram/Resend this session: Clerk
delivers via Svix (confirmed by this route's own `verifySvix()` call and
`svix-id`/`svix-timestamp`/`svix-signature` headers), which retries on any
non-2xx or slow response. `user.updated`/`user.deleted` are UPDATE/DELETE to
a fixed target state, so an *exact* redelivery is naturally idempotent — but
an *out-of-order* retry isn't: if an earlier `user.updated` is delayed
(queued for retry after a slow/failed first attempt) past a later
`user.updated` that already landed, the stale retry re-applies last and
silently reverts the newer email/name. Proved this exact scenario with a
dedicated test (`msg_stale` landing, then `msg_fresh` landing, then
`msg_stale` redelivered — asserts the redelivery is rejected and the fresh
state survives).

**Fix:** insert-first-claim on new `clerk_webhook_events(event_id text
PRIMARY KEY)`, keyed on `svix-id`, same shape as
`resend_webhook_events`/`telnyx_webhook_events`. `23505` short-circuits as a
duplicate before any branch runs; any other claim error falls through so an
infra hiccup on the dedup table doesn't drop a real event. Migration
`2026_07_18_clerk_webhook_events_dedup.sql`, file-only, not applied. No
backfill — brand-new table.

## Verification

9 new tests, first-ever test file for this route
(`route.test.ts` — it had zero prior coverage). Covers: `user.deleted`
actually removes the row (and only that user's row, leaving other tenant
members intact); `user.updated` picks the `primary_email_address_id` match
over index 0, with a fallback case when that field is absent; the
out-of-order-redelivery scenario above; two-different-svix-ids both process
normally; no-svix-id-header still processes (best-effort, not a hard
requirement, matching the other 3 fixed surfaces); `user.created` no-op;
signature rejection still returns 401 when verification is on. Mutation-
checked the core claim: reverted the `user.deleted` fix locally and reran —
the row-removal tests failed with the row still present (proving they
actually exercise the DELETE, not a false-positive from fake-supabase
defaults).

tsc clean on touched files (`npx tsc --noEmit` — 5 pre-existing unrelated
errors remain, none touching `webhooks/clerk` or this test file: stale
`.next` admin-auth types, `cron/outreach`+`cron/payment-reminder`
pre-existing test-signature mismatches, untracked
`sunnyside-clean-nyc/site-nav.ts` — same baseline noted in every doc this
session). Full suite: 621/621 files, 3317 passed + 1 pre-existing
expected-fail, zero regressions (net +9 tests).

## Not yet independently swept / flagged, not fixed

**"Zero owners" edge case, flagged not fixed:** if a tenant's *last* owner
has their Clerk account deleted directly in Clerk (bypassing our app), this
fix now hard-deletes their `tenant_members` row same as any other member —
correct per the existing removal semantics — but leaves the tenant with zero
`role='owner'` members and nothing auto-promotes a replacement. The app's own
`/api/admin/users/:id` DELETE already guards this exact invariant for
*app-initiated* removal ("Cannot remove the last owner"), but there's no
equivalent guard (or auto-promotion policy) for this externally-triggered
path, and deciding what should happen — block the delete and leave a
tombstone row instead, auto-promote the next-oldest member, notify platform
admin — is a product decision, not a restore-intended-behavior fix like the
three above. Not touched.

`webhooks/stripe`/`stripe-platform` — already hardened with their own
dedicated idempotency tests (confirmed again by exclusion, no change
needed). Every route under `src/app/api/webhooks/*` now has either a fix or
an explicit clean-ruling for the redelivery-dedup class, and — new this
round — `clerk/route.ts` specifically now also has real behavioral test
coverage where it previously had none at all.

## tenant_domains schema lane

Reconfirmed intact, untouched this round — this round's fix is a
webhook-layer dedup table (`clerk_webhook_events`) plus an application-code
fix in the Clerk webhook handler, outside `tenant_domains`.

File-only, no push/deploy/DB run this round.
