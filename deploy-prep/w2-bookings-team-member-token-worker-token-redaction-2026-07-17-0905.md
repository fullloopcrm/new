# W2 gap/fluidity refresh — 2026-07-17 09:05

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-clients-pin-team-members-pin-redaction-2026-07-17-0843.md`.

Leader's fresh 3-deep queue this round: (1) continue archetype depth, (2) continue fresh-ground hunting, (3) keep gap/fluidity current. All 3 done — see below.

## Fresh-ground sweep — 1 more real instance found and fixed (bookings.team_member_token / worker_token, a THIRD table in this bug class)

Continued widening the pin_hash/clients.pin/team_members.pin thread (last 3 rounds) to every other credential-shaped column on the schema. Found one: `bookings.team_member_token` — a fresh crypto-random token (`generateCleanerToken()`, `randomBytes(24).toString('base64url')`) that `client/book` generates and stores via `create_booking_atomic` on **every new booking**, plus `client/recurring`, `admin/recurring-schedules`, `admin/recurring-schedules/[id]/regenerate`, `bookings/batch`, and `src/lib/sale-to-recurring.ts` — all actively write it too. `supabase/schema.sql`'s comment on the column ("Team member token (for portal access)") makes the intent obvious even though nothing in the repo currently reads or validates it — same "written but never consumed for its apparent purpose" shape as the already-fixed `pin_hash`/`pin` findings, but this one is actively generated on every booking today, not legacy-only.

**A real schema-naming wrinkle surfaced mid-investigation, not assumed away:** `supabase/schema.sql` declares this column as `worker_token`, but `migrations/2026_07_13_client_book_dedupe_atomic.sql`'s `create_booking_atomic` function inserts into a column literally named `team_member_token` — a name that does not appear in any `CREATE TABLE`/`ALTER TABLE` in the entire `migrations/` folder. Nearly assumed `worker_token` was simply dead (only `scripts/migrate-from-nycmaid.ts` writes that literal name) and shipped a fix that redacted the wrong key — would have left the real, actively-written secret leaking under a different key name entirely. Caught it by reading `admin/recurring-schedules/route.ts`'s own doc comment: "Column mapping vs nycmaid: cleaner_id -> team_member_id, cleaner_pay_rate -> pay_rate, cleaner_token -> team_member_token" — confirming the live FullLoop column is `team_member_token` (nycmaid's `cleaner_token`, renamed on port) and `schema.sql`'s `worker_token` is the stale pre-rename bootstrap name, the same schema/migrations-vs-prod drift this session has found before (e.g. `payroll_payments.status`). Rather than bet the whole fix on that inference, redacted **both** possible names (a no-cost inclusion — omitting a key that doesn't exist on the live row is a harmless no-op) and added a live-schema drift probe (see Archetype depth) so the leader gets an empirical answer, not just my reasoning, before this is fully closed.

Grepped every client-facing route doing `select('*')`/`select('*, ...)` on `bookings` (7 hits across `src/app/api/client/*`): 3 already narrow their column list (`confirm/[token]`, `recurring`'s final response, `preferred-cleaner`) and were already clean. **4 real instances of the wrong-shape drift, all fixed:**

1. **`PUT /api/client/reschedule/[id]`** — top-level `{ ...updated, ... }` spread (the same route whose `clients.pin`/`team_members.pin` embeds were fixed last round); the top-level bookings row itself was still unredacted.
2. **`GET /api/client/booking/[id]`** — `return NextResponse.json(data)`, the client's own single-booking detail endpoint, consumed by `site/*/book/dashboard` and `book/reschedule/[id]` pages across every tenant site.
3. **`GET /api/client/bookings`** — both `upcoming`/`past` arrays returned raw, same consumer surface.
4. **`POST /api/client/book`** — `{ ...data, is_new_client }`; this route is the one that *generates* the token in the first place, so it was shipping a token to the client's browser in the exact same response that just created it.

**Fixed** (4 files): each route now redacts `team_member_token`, `worker_token`, and `token_expires_at` via the existing `omit()` helper (same one used for the pin/pin_hash fixes) before returning — a local `NEVER_RETURNED_BOOKING_FIELDS` constant per route, matching the `clients/[id]` route's established naming convention. `client/bookings`'s list responses map `omit()` over both arrays. `clients.pin` on `client/book` is deliberately **not** touched — that's the prior round's confirmed by-design "show a new client their PIN once" echo; this fix is a different field on a different (outer) object, orthogonal to that finding.

4 new `route.team-member-token-redaction.test.ts` files, 17 tests. Mutation-verified per file: `git diff > patch`, `git apply -R` the 4 route diffs together, watched all 13 non-control assertions go RED for the right reason (the seeded secret token values present in the JSON response body), `git apply` to restore, watched all 17 GREEN again.

`npx tsc --noEmit`: clean. `eslint` on all 8 touched files: 0 errors, 0 new warnings. Full suite: 558 files (was 554), 2484 tests (was 2467) — 2447 passed + 37 skipped, 0 failed, 0 regressions.

No DB migration needed — no schema change, both possible column names already exist (or the stale one is simply unselectable, which the new archetype probe will confirm empirically).

## Archetype depth

Added `sim-all-trades.ts` section 5a-39. Creates its own throwaway `bookings` row (tenant_id/start_time/end_time are the only NOT NULL columns — no client fixture needed) and proves, against the real live table rather than static grep alone: (a) whether `bookings.team_member_token` is selectable, (b) whether the stale `worker_token` name is *also* selectable (informational — resolves the schema-naming ambiguity above empirically instead of leaving it as an assumption), (c) the token genuinely round-trips a write (not a schema-cache mirage), and (d) the fix's `omit()` call, exercised against that real row, strips exactly the 3 redacted fields and leaves everything else untouched. Not yet executed — leader-run-only, writes to (and cleans up) a live tenant `bookings` row. Verified statically: `tsc --noEmit` clean, `eslint` clean (0 new; same 3 pre-existing warnings on untouched lines as every prior round this session).

## NOTICED — not fixed, flagging for the leader/Jeff

Carried forward unchanged from the prior round's list (`w2-clients-pin-team-members-pin-redaction-2026-07-17-0843.md`), items 1-18, plus:

19. **New — schema-naming drift, worth a direct prod check, not just this round's probe.** `supabase/schema.sql` documents `bookings.worker_token`; the live `create_booking_atomic` function (and every app-code write site) uses `bookings.team_member_token`. I'm confident in the read (`admin/recurring-schedules/route.ts`'s own doc comment states the rename explicitly, and bookings are created successfully in production today, which wouldn't be true if the RPC's INSERT referenced a genuinely nonexistent column) — but I have not run a live query myself to confirm column-for-column, only grep/migration analysis plus the new sim probe that the leader will execute. Worth a 30-second prod check (`\d bookings` or the sim run) before treating `schema.sql` as authoritative anywhere else in this codebase — if this rename happened once outside tracked migrations, it may not be the only one.

## MISSING-FEATURE GAPS

Carried forward unchanged from the prior round's list, items 1-26.

## UX-FRICTION

Carried forward unchanged from the prior round's list.

File-only, no push/deploy/DB. 3 commits this round (1× `test(sim)` archetype-depth, 1× `fix`+tests, 1× `docs`).
