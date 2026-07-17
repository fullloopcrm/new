# W2 gap/fluidity refresh — 2026-07-17 06:43

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-repo-wide-sms-email-consent-crosscheck-2026-07-17-0629.md`.

Leader's fresh 3-deep queue this round: (1) continue archetype depth, (2) pivot fresh-ground hunting to a genuinely different bug class — the 18-instance missing-consent-check thread closed last round, (3) keep gap/fluidity current. All 3 done — see below.

## Fresh ground (real bug) — NEW bug class this round: client-portal writes landing in the wrong `clients` column

The consent-check thread (18 instances, closed last round) is done; this is a different bug shape entirely — not a missing gate, a **wrong-column write**.

`GET/PUT /api/portal/notes` — the client-portal feature labeled "Notes for your team member" (`src/app/portal/page.tsx`, placeholder text "Door codes, parking info, special instructions...") — read and wrote `clients.notes`. That is the wrong column, with two live consequences:

1. **Functional**: nothing that renders a job to a team member selects `clients.notes` at all — `src/app/team/page.tsx` and `src/app/api/team-portal/jobs/route.ts` both read `clients.special_instructions` (confirmed via `.select('*, clients(name, phone, address, special_instructions)')`, two call sites). Whatever a client typed into "Notes for your team member" silently never reached the cleaner — gate codes, parking info, dog-in-yard warnings, all dropped on the floor since this route shipped.
2. **Confidentiality + integrity**: `clients.notes` is the admin dashboard's plain, unlabeled "Notes" field (`src/app/dashboard/clients/[id]/page.tsx` — a bare `<textarea placeholder="Notes">` next to Name/Email/Phone/Address, no privacy indicator). An admin filling that in has every reasonable expectation it's operator-only — corroborated by `client-drawer.tsx` (a newer, not-yet-wired client-detail panel) explicitly labeling the equivalent field's tab "Operator" alongside separate "Cleaner" and "Selena" tabs. `GET /api/portal/notes` pre-filled the client's own portal textarea with that column's live contents on every page load, and `PUT` let the client silently overwrite it. Any internal note an admin ever wrote there was live-readable by, and destructible by, that exact client.

**Fixed**: both handlers now target `clients.special_instructions` — the column actually surfaced to the cleaner — and leave `clients.notes` untouched. Sibling bug found and fixed alongside: `PUT /api/clients/[id]`'s `pick()` allowlist never included `special_instructions`, even though the admin edit form has had a "Special Instructions" textarea the whole time — every admin edit of that field looked like it saved (200, no error) and silently no-opped. Added to the allowlist.

5 new tests across 2 files, mutation-verified via `git apply -R`/`git apply` — all 5 failed for the right reason on revert (GET returned the operator-private string verbatim, PUT wrote to the wrong column), restored green.

`npx tsc --noEmit`: clean. `eslint` on all touched files: 0 errors (1 pre-existing unused-import warning on `clients/[id]/route.ts`, predates this round, unrelated to the touched line). Full suite: 541 files (was 539), 2427 tests total (was 2422) — 2390 passed + 37 skipped, 0 failed, 0 regressions.

No DB migration needed — `special_instructions` already exists on `clients` (confirmed live via `team-portal/jobs/route.ts`'s existing production query, not a new column).

## Archetype depth

Added `sim-all-trades.ts` section 5a-30. Proves against a real tenant/clients/bookings row: (a) `notes` and `special_instructions` are genuinely distinct, independently-writable columns on a live `clients` row; (b) `portal/notes`' fixed select returns the `special_instructions` value and never the operator-private `notes` value; (c) `team-portal/jobs`' exact join shape surfaces `special_instructions` to the cleaner and never selects `notes` at all (asserts `undefined`, not just "different value", since the join genuinely never requests that column). Not yet executed — leader-run-only, writes to live tenant/clients/bookings tables. Verified statically: `tsc --noEmit` clean, `eslint` clean (0 new, same 3 pre-existing warnings on untouched lines).

## NOTICED — not fixed, flagging for the leader/Jeff

Carried forward unchanged from the prior round's list, items 1-10, plus:

11. **New**: `src/app/dashboard/clients/client-drawer.tsx` (a newer client-detail side panel, wired into `clients/page.tsx` but distinct from the fully-functional `clients/[id]/page.tsx` edit page) references `client.cleaner_notes` and `client.selena_notes` — neither column exists in any migration in this repo. Its Notes textarea (cleaner/operator/selena tabs) has no save handler at all (`onChange` only updates local state), and its "Move to DNS"/"Book Next" footer buttons have no `onClick`. Reads as unfinished/aspirational UI, not live functionality — the `notes`→`special_instructions` fix in this round doesn't touch it, and it can't currently do any damage (no persistence path), but if this drawer gets wired up later, `cleaner_notes` as a THIRD notes column (distinct from both `notes` and `special_instructions`) would need a real design decision, not just adding the column. Flagging now so it's not "discovered" again as a fresh confusion later — the 3-way split this drawer implies (cleaner/operator/selena) is arguably the right end state; this round's fix is a 2-way stopgap (client-facing `special_instructions` vs `notes` as everything-else) using the columns that actually exist today.
12. **New**: only `clients.special_instructions` was audited for the "form field exists but API `pick()`-allowlist silently drops it" pattern this round (found once, on the same route). Did not sweep other admin edit routes for the same shape — flagging as a plausible next fresh-ground candidate if this round's finding turns out to have siblings, but not claiming it does without checking.

## MISSING-FEATURE GAPS

Carried forward unchanged from the prior round's list, items 1-26 (see prior doc for full detail, unchanged this round — this round's finding was a bug, not a missing feature).

## UX-FRICTION

Carried forward unchanged from the prior round's list.

File-only, no push/deploy/DB. 3 commits this round (1× `fix`+test, 1× `test(sim)`, 1× `docs`).
