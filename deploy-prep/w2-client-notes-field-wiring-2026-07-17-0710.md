# W2 gap/fluidity refresh — 2026-07-17 07:10

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-clients-unit-field-wiring-2026-07-17-0653.md`.

Leader's fresh 3-deep queue this round: (1) continue archetype depth, (2) continue fresh-ground hunting, (3) keep gap/fluidity current. All 3 done — see below.

## Fresh ground (real bug) — third instance of this session's field-wiring bug class, in a route the prior sweep's scope never reached

The prior round's pick()-allowlist sweep covered every `pick(body, [...])` call site in `src/app/api`, closing the field-wiring thread as far as that specific shape goes. This round widened the hunt to the SAME underlying bug class (client-facing writes landing in the wrong `clients` column, first found and fixed on `portal/notes` two rounds ago) but a different code path: the per-tenant client dashboards.

**`GET/PUT /api/client/notes`** — called by `wash-and-fold-hoboken/(app)/book/dashboard`, `wash-and-fold-nyc/(app)/book/dashboard`, `the-florida-maid/clients/dashboard`, and the generic `site/book/dashboard` (placeholder text "Door codes, pet info, special instructions..." — same client-facing intent as the already-fixed `portal/notes`) — read and wrote `clients.notes` instead of `clients.special_instructions`. This is a **sibling of the `portal/notes` bug in a completely different route** (`client/notes` uses `@/lib/client-auth`'s tenant-bound cookie session; `portal/notes` uses `verifyPortalToken`'s Bearer-token session — different auth module entirely, same wrong-column mistake). The prior two field-wiring rounds only checked `portal/notes` and the `pick()`-allowlist routes; this route uses neither pattern (a plain `.select()`/`.update()`, no `pick()`), which is exactly why it survived both sweeps unaudited until now.

Same two live consequences as the original `portal/notes` bug:
1. **Functional**: `team-portal/jobs/route.ts` (global, shared by every tenant per the GLOBAL RULE) selects `clients(name, phone, address, special_instructions)` — never `notes`. Whatever a client typed into these dashboards' notes field never reached the cleaner.
2. **Confidentiality/integrity**: `clients.notes` is the admin dashboard's private operator-only field. `GET` pre-filled the client's own textarea with that column's live contents, and `PUT` let the client silently overwrite it.

**Fixed**: both handlers now target `clients.special_instructions`. 6 new tests (1 file): the same 4-test witness pattern as `portal/notes`' fix (GET returns the right value + never leaks the private one, PUT writes the right column + never mutates the private one) plus 2 wrong-tenant probes (a session bound to tenant B cannot read/write notes on a tenant-A client id — the route's existing `tenant.id` scoping already handled this correctly; the probes lock it in). Mutation-verified via `git apply -R`/`git apply` — 4 of 6 failed for the right reason on revert (the 2 tenant-scope probes correctly stayed green, since they don't depend on column mapping), restored GREEN.

`npx tsc --noEmit`: clean. `eslint` on all touched files: 0 errors, 0 new warnings. Full suite: 543 files (was 542), 2435 tests total (was 2429) — 2397 passed + 37 skipped, 1 failed (a pre-existing 5s-timeout flake on `finance-export.test.ts`'s 200k-row pagination test, unrelated to this change — confirmed by re-running that file alone: 3/3 pass in 3.9s, well under the timeout; it only trips under full-suite parallel load), 0 regressions from this round's change.

No DB migration needed — `special_instructions` already exists on `clients`.

Did NOT find further siblings: grepped every `.notes`/`select('notes')`/`update({ notes` call site across `src/app/api/client` and `src/app/api/portal` — the only other hits are `bookings.notes` (`client/confirm/[token]`, `client/book`, `portal/bookings`) and `deals.notes` (`portal/request`), which are different columns on different tables serving their own correct purpose, not instances of this bug class.

## Archetype depth

Added `sim-all-trades.ts` section 5a-32. Proves against a real tenant/clients row: (a) `notes` and `special_instructions` are genuinely distinct, independently-writable columns; (b) `client/notes`' fixed GET select returns `special_instructions` and never `notes`; (c) `client/notes`' fixed PUT writes `special_instructions` and never mutates `notes`. Not yet executed — leader-run-only, writes to live tenant/clients table. Verified statically: `tsc --noEmit` clean, `eslint` clean (0 new, same 3 pre-existing warnings on untouched lines).

## NOTICED — not fixed, flagging for the leader/Jeff

Carried forward unchanged from the prior round's list (`w2-clients-unit-field-wiring-2026-07-17-0653.md`), items 1-13, plus:

14. **New, and a substantial one**: `src/app/portal/messages/page.tsx` + `GET/POST /api/portal/messages` appear to be an **orphaned, fully broken predecessor** of the live `src/app/portal/connect/page.tsx` ("Chat" in the portal nav) feature. Evidence: (a) `portal/messages/page.tsx` is the only page under `src/app/portal/*` that does NOT use the `usePortalAuth()` context (every other portal page does) — it does bare unauthenticated `fetch('/api/portal/messages')` calls with no token attached at all; (b) its API route calls `protectClientAPI()` imported from the LEGACY `@/lib/nycmaid/auth` (a pre-multi-tenant, cookie-based, zero-tenant-binding auth system — the same class of stale auth already migrated away from on `client/properties` per that route's own comment), not the modern Bearer-token `verifyPortalToken` every other portal route (including `portal/notes`, `portal/connect`) actually uses; (c) the real portal login flow (`POST /api/portal/auth`, action `verify_code`) returns a JSON `token` for Bearer-auth and never sets the `client_session` cookie `nycmaid/auth.ts` expects — so `protectClientAPI()` here will **always** return 401 for every real client, for any client who somehow reaches this URL directly (it has no nav link — the portal's own `navItems` list is Home/Book/Feedback/Chat, and "Chat" points at `/portal/connect`, not `/portal/messages`); (d) the two features write to entirely separate tables (`portal/messages` → `comhub_messages`/`comhub_threads`, the same system `/admin/comhub` and `team-portal/messages` use; `portal/connect` → `connect_messages`/`connect_channels`, read by `/dashboard/connect`) — both are fully wired end-to-end on their own respective admin sides, so this isn't a case of one being "the real backend" and the other orphaned on the frontend; it looks like `portal/connect` superseded `portal/messages` as the client-facing channel and the older page/route pair was simply never deleted. Not fixing/removing unilaterally: whether Jeff wants this deleted (dead, superseded), or genuinely revived and reconnected to `/admin/comhub` (giving admins a THIRD inbox alongside team-comhub and dashboard-connect) is a product decision, not something inferable from the code — the same reasoning campaigns/[id] PUT's dead-code call got in the prior round. Flagging in detail now so it isn't rediscovered as a fresh mystery later.

## MISSING-FEATURE GAPS

Carried forward unchanged from the prior round's list, items 1-26.

## UX-FRICTION

Carried forward unchanged from the prior round's list.

File-only, no push/deploy/DB. 3 commits this round (1× `fix`+test, 1× `test(sim)`, 1× `docs`).
