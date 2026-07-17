# W4 broad-hunt — 2026-07-17 17:29 — sales-contacts get-or-create race fix

Queue (17:17 LEADER order, 3-deep, file-only, no push/deploy/DB):
(1) new fresh-ground surface. (2) continue whichever surface (1) opens up.
(3) keep gap/fluidity current.

## (1) Fresh ground: TS-level get-or-create helpers, as a set, for the same TOCTOU shape already closed in Postgres RPCs

The 17:15/17:30 checkpoints flagged `src/lib/` broadly (226 top-level files,
360 total) as untouched this session, specifically calling out "other
shared helpers... plausible siblings to both bug classes found this
session." Rather than a blind file-by-file walk of 226 files, searched for
the TS-level equivalent of the `comhub_get_or_create_*` bug class: grepped
`src/lib` for `getOrCreate|findOrCreate|upsert` (13 files), then checked
each hit for the specific SELECT-then-INSERT shape (as opposed to a real
`.upsert()`/`ON CONFLICT` call, which is already atomic).

## (2) Finding: `upsertSalesContact` (`src/lib/sales-contacts.ts`)

Despite its name, this is not a real upsert — it's a manual SELECT-then-INSERT:

```
const { data: existing } = await supabaseAdmin.from('contacts').select('id').eq('email', email).maybeSingle()
if (existing?.id) { ...update...; return existing.id }
const { data, error } = await supabaseAdmin.from('contacts').insert({...}).select('id').single()
if (error) { console.error(...); return null }   // <- silently drops the id
return data.id
```

`contacts` has a real unique index backing the dedup key —
`contacts_email_unique on contacts (lower(email)) where email is not null
and email <> ''` (`migrations/2026_07_08_sales_contacts.sql`). Same shape
as this session's `comhub_get_or_create_contact_by_phone` finding: the
`maybeSingle()` check is a fast path, not a guard. Two concurrent calls for
the same email can both pass the SELECT before either INSERT commits; the
loser's INSERT raises `23505`, which lands in the generic `if (error)`
branch and returns `null` — silently, by design (the function's own comment
says "Returns null... if the write fails, so lead creation is never
blocked"). The caller (`admin/requests` POST, manual lead entry) writes
that `null` straight into `partner_requests.contact_id` with no retry and
no user-visible error. The lead itself is never lost — only its link to
the canonical contact record, permanently, with no signal that it happened.

Confirmed this is real (not theoretical): `email` is lowercased before both
the SELECT and the INSERT (`const email = (input.email || '').trim().toLowerCase()`),
matching the index's `lower(email)` expression exactly, so a same-email
race is a guaranteed `23505` on the loser, not a maybe.

Blast radius is lower than the comhub race (single call site,
`admin/requests` manual entry — an admin action, not a public high-traffic
endpoint), but the failure mode is identical in kind and the fix is cheap,
so closed it rather than leaving it as a lower-priority note.

## The fix

`src/lib/sales-contacts.ts`: on `23505` from the INSERT, re-SELECT by email
and return the winner's id instead of falling through to the generic
error-log-and-return-null path. Matches the existing house idiom for this
exact situation (`clients/import`, `finance/bank-import`,
`webhooks/telnyx-voice` all catch `23505` and recover rather than treating
it as a hard failure) — just applied to a `.select()`-and-fetch-existing
recovery instead of those routes' "report duplicate" recovery, since this
function's contract is "always return a usable contact id."

**Verification.**
- `npx tsc --noEmit --pretty false`: same 2 pre-existing unrelated errors as
  every prior report this session (`bookings/broadcast/route.xss.test.ts`,
  `sunnyside-clean-nyc/_lib/site-nav.ts`) — no new TS diff.
- No existing test file for `sales-contacts.ts` (checked
  `src/lib/*.test.ts` — none reference it) — not adding new test coverage
  in this pass; flagging as a gap rather than silently leaving it
  unmentioned.
- Did not attempt a live concurrency repro (no DB access from this
  worktree, consistent with every other race fix this session). Reasoning
  from the confirmed unique index + confirmed lowercase-before-both-reads,
  same class as the already-shipped comhub fix.
- No push/deploy/DB. Pure `.ts` change, no migration needed — the fix is
  entirely in application code since the guarding unique index already
  exists in prod.

## (3) Gap/fluidity

**Surfaces exhausted or near-exhausted this session:** comhub
get-or-create family (closed), rate-limit-db (closed), onConflict-vs-non-compound-unique
sweep (clean), sales-contacts get-or-create (closed, this pass).

**Untouched, plausible next targets (carried forward + narrowed):**
- The other 12 `getOrCreate/findOrCreate/upsert`-named files in `src/lib`
  not yet checked individually: `activate-tenant.ts`, `selena/tools.ts`,
  `seo/overrides.ts`, `seo/health.ts`, `ledger.ts` (already largely
  hardened via the journal_entries dedup work), `tenant-db.ts`,
  `supabase.ts`, `social.ts`, `seo/competitors.ts`, `seo/onboarding.ts`,
  `seo/technical.ts`, `seo/ingest.ts` — same grep, not yet read line-by-line
  each.
- `seo_run_detection()` (`migrations/2026_07_05_seo_competitors.sql`): a
  DELETE-then-INSERT bulk classifier with no unique constraint on
  `seo_issues` preventing duplicate open issues if it's ever invoked
  concurrently (cron `+` the standalone `scripts/seo-monitor.ts` debug
  script). Lower-priority — data-integrity duplication, not a security or
  money-correctness bug, and the two call sites are unlikely to overlap in
  practice (cron vs. manual debug run). Noting rather than fixing this
  pass; deprioritized in favor of the higher-signal sales-contacts finding.
- `src/lib/` broadly still has ~213 files with no targeted-shape hit yet
  (not the 259 count from the 17:15 checkpoint — recount at 226 top-level
  post-comhub-fix; the delta is the new `_PROPOSED.sql` migration file
  living outside `src/lib/*.ts`, not a file count regression).

No push/deploy/DB. File-only.
