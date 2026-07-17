# W2 gap/fluidity refresh — 2026-07-17 08:43

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-pin-hash-redaction-bug-class-pivot-2026-07-17-0824.md`.

Leader's fresh 3-deep queue this round: (1) continue archetype depth, (2) sweep for other unredacted `select('*')` sensitive-column exposures beyond the pin_hash fix, same new bug class, (3) keep gap/fluidity current. All 3 done — see below.

## Fresh-ground sweep — 3 more real instances found and fixed (clients.pin / team_members.pin, plaintext this time, not a hash)

Widened last round's sweep beyond `tenant_members.pin_hash` to every other plaintext credential column on the schema. Two more exist: `team_members.pin` (crew's team-portal login PIN, base `schema.sql`) and `clients.pin` (client-portal login PIN, added by `011_parity_with_nycmaid.sql`). Grepped every `select('*')` and every `clients(*)`/`team_members(*)` join-embed in `src/app/api` (98 `select('*')` hits, plus a separate set of `*(*)` embeds) and checked each against the same invariant the pin_hash fix established: does a plaintext/hashed credential column reach a browser response with no legitimate reader?

**`team_members.pin` on admin surfaces (GET /api/team, admin/find-cleaner/recent, etc.) — already ruled on, not re-litigated.** The leader's own framing of this round's queue referenced "the earlier team_members.pin exposure gap Jeff already ruled on" — and it's easy to see why that one was a deliberate call, not drift: `admin/broadcast-guidelines/route.ts` explicitly texts `PIN: ${m.pin}` to crew members on request. Admins are meant to see this value. Not touching it.

**`clients.pin` has no equivalent admin-visible design** — grepped `dashboard/clients/[id]/page.tsx` and `client-drawer.tsx`, zero `.pin` reads. Found 3 real instances of the wrong-shape drift:

1. **`GET`/`PUT /api/clients/[id]`** (admin client detail) — `select('*')`/`.select().single()` on `clients`, returned wholesale as `{ client: data }`. Zero admin UI consumer.
2. **`POST /api/client/verify-code`** — same shape, returned wholesale as `{ client, do_not_service: false }`. Its own sibling, `POST /api/client/login`, already deliberately narrows to `id, do_not_service` specifically to avoid this — this OTP-flow route drifted from that established invariant. No frontend caller found (the actual portal login page, `portal/login/page.tsx`, calls `/api/portal/auth`, not this route) — same "zero live consumer, still a live response body" situation as the pin_hash fix.
3. **`PUT /api/client/reschedule/[id]`** — the most severe instance this round. The read-back embeds `clients(*)` AND `team_members(*)` (both genuinely needed by the async notification fan-out for `.name`/`.phone`/`.sms_consent`), then returns the whole object verbatim to the client's browser. This ships the **assigned crew member's** `team_members.pin` — their own team-portal login credential — to an authenticated *customer* with zero employee/admin access, on every reschedule of a booking with an assigned crew member. Unlike the pin_hash finding (admin-to-admin visibility question) or the other two clients.pin instances (client seeing their own pin), this crosses a real customer→employee credential boundary: a client could read their cleaner's PIN from a normal reschedule response and use it to log into `team-portal/auth` as that employee.

**Ruled out, explicitly not fixed — checked, not assumed:** `POST /api/client/book` also returns `clients.pin` in its response (`select('*, clients(*), client_properties(*))` → `NextResponse.json({ ...data, is_new_client: isNewClient })`). Grepped for `.pin` in the site-facing booking forms before touching it — this one is genuinely load-bearing: `site/nycmaid/book/new/page.tsx`, `site/template/book/standard/StandardBookForm.tsx`, `site/template/book/new/BookFormClient.tsx`, and `site/the-florida-maid/book-now/page.tsx` all do `if (data.clients?.pin) setPin(data.clients.pin)` — the deliberate "show a brand-new client their freshly-generated PIN once, right after signup" pattern (the client-side equivalent of showing a temp password once). I initially wrote the same redaction here as the other 3, ran the frontend grep as a sanity check before committing, found the live consumer, and reverted it. Would have been the exact "silently drop a field the frontend actually needs" bug class this session has repeatedly found elsewhere — just inverted (redacting instead of dropping).

**Fixed** (3 files): added a small `omit()` helper to `src/lib/validate.ts` (the redaction counterpart to the existing `pick()` allowlist helper — 3 call sites needed the identical "strip a field from a row before it returns" shape, same pattern `settings/route.ts`'s `NEVER_RETURNED_FIELDS` loop already established, made reusable instead of copy-pasted 3x). `clients/[id]/route.ts` now redacts via a `NEVER_RETURNED_CLIENT_FIELDS` constant on both GET and PUT; `client/verify-code/route.ts` and `client/reschedule/[id]/route.ts` redact inline at the return statement (the reschedule route specifically builds a fresh redacted copy rather than mutating `updated`, since the async notification closure above the return already captured that same `const` by reference and still needs the un-redacted `.clients.phone`/`.team_members` fields).

3 new `route.pin-redaction.test.ts` files, 8 tests. Mutation-verified per file: `git apply -R` the route's diff, watched the redaction assertions go RED for the right reason (the seeded secret PIN value present in the JSON response body), watched the control assertions (fields the route legitimately returns — name, email, id) stay green throughout, `git apply` to restore, watched GREEN again.

`npx tsc --noEmit`: clean. `eslint` on all touched files: 0 errors, 0 new warnings (1 pre-existing `no-unused-vars` warning on an untouched line in `clients/[id]/route.ts`, confirmed pre-existing via `git stash`). Full suite: 554 files (was 551), 2467 tests (was 2459) — 2430 passed + 37 skipped, 0 failed, 0 regressions.

No DB migration needed — no schema change, `clients.pin`/`team_members.pin` already exist.

## Archetype depth

Added `sim-all-trades.ts` section 5a-38. Proves against real fetched rows, not mocks: (a) `clients.pin` and `team_members.pin` genuinely exist as columns on the live tables and genuinely round-trip on write/read; (b) the fix's `omit()` helper, exercised against those real rows (not a fixture object), strips exactly `pin` and leaves every other real column untouched — a schema-accuracy check the vitest mocks can't provide, since the shared `omit()` helper is a pure function that doesn't touch the DB at all and could in principle diverge from the live column set in ways a hand-built mock wouldn't catch. Not yet executed — leader-run-only, writes to live tenant/clients/team_members tables. Verified statically: `tsc --noEmit` clean, `eslint` clean (0 new, same 3 pre-existing warnings on untouched lines as every prior round this session).

## NOTICED — not fixed, flagging for the leader/Jeff

Carried forward unchanged from the prior round's list (`w2-pin-hash-redaction-bug-class-pivot-2026-07-17-0824.md`), items 1-17, plus:

18. **New, systemic, deliberately not fixed in bulk this round**: the `clients(*)`/`team_members(*)` embed pattern this round found on `client/reschedule/[id]` also appears on several **admin-authenticated** routes — `dashboard/route.ts` (3 hits), `bookings/batch/route.ts`, `bookings/[id]/team/route.ts` — all doing `select('*, clients(*), team_members!bookings_team_member_id_fkey(*))` or equivalent and returning the embed wholesale to the admin dashboard. Since these are admin-authenticated (not client-facing), they fall into the same bucket as `team_members.pin` admin-visibility — plausibly fine by the same logic that already cleared `GET /api/team`, or plausibly the same `clients.pin`-has-no-consumer drift found on `clients/[id]/route.ts` this round, just via a join instead of a direct `select('*')`. Did not sweep and fix all of these in one shot: the surface is wide (booking-list/detail admin routes generally), redacting a *joined* sub-object's `pin` at every call site is a different, larger diff shape than this round's 3 direct-table fixes, and — most importantly — whether `clients.pin` should be admin-visible via booking embeds is the same product question NOTICED #16 already flagged for `team_members` `notes` scratch space: a decision Jeff should make once (extend the `clients.pin` redaction to every admin embed site, or explicitly rule it acceptable like `team_members.pin` already is), not something to infer route-by-route. Flagging the full grep result so a future round (or Jeff directly) doesn't have to rediscover it: `dashboard/route.ts:41,70,83`, `bookings/batch/route.ts:162`, `bookings/[id]/team/route.ts:144`.

## MISSING-FEATURE GAPS

Carried forward unchanged from the prior round's list, items 1-26.

## UX-FRICTION

Carried forward unchanged from the prior round's list.

File-only, no push/deploy/DB. 3 commits this round (1× `test(sim)` archetype-depth, 1× `fix`+tests, 1× `docs`).
