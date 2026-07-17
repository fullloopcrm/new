# W2 gap/fluidity refresh — 2026-07-17 06:53

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-portal-notes-special-instructions-field-wiring-2026-07-17-0643.md`.

Leader's fresh 3-deep queue this round: (1) continue archetype depth, (2) sweep for other routes with the same pick()-allowlist gap flagged as only checked on one route (item 12, prior round), (3) keep gap/fluidity current. All 3 done — see below.

## Fresh ground (real bug) — second instance of this session's field-wiring bug class, found via the sweep

Grepped every `pick(body, [...])` allowlist call site in `src/app/api` (5 total: `clients/[id]`, `settings/services/[id]`, `bookings/[id]`, `bookings/batch-update`, `team/[id]`, `campaigns/[id]`) and checked each against its live edit form/caller for a form field the allowlist silently drops.

Found a sibling on the SAME route the prior round fixed: **`PUT /api/clients/[id]`'s allowlist never included `unit`**, even though the admin client-edit form (`dashboard/clients/[id]/page.tsx`) has had a "Unit/Apt" input bound to `form.unit` all along, and the same page's read-only view already renders `client.unit` next to the address (`{client.address}{client.unit ? \`, ${client.unit}\` : ''}`). `unit` is a real, standalone column on `clients` (`supabase/schema.sql:102`) — distinct from `client_properties.unit`, a different column on a different table added later for multi-address support (`052_client_properties.sql`). Every admin edit of Unit/Apt looked like it saved (200, no error) and silently no-opped.

**Fixed**: added `unit` to the allowlist. 2 new tests (1 file): saves-and-persists + a wrong-tenant probe (PUT of a foreign-tenant client id never sets `unit` on that row), mirroring the isolation test's existing pattern for this route. Mutation-verified via `git apply -R`/`git apply` — failed for the right reason on revert (`unit` stayed `null`), restored GREEN.

The other 4 pick() sites were checked and are clean:
- `settings/services/[id]` (`EDITABLE_SERVICE_FIELDS`) — matches every field the services edit form in `dashboard/settings/page.tsx` sends (`buildServicePayload`).
- `team/[id]` — matches every field the team edit page sends across its 6 separate PUT call sites (profile save, schedule/notes JSON blob, photo upload, notification-pref toggles).
- `bookings/[id]` / `bookings/batch-update` — already fixed in an earlier round (their own comments reference the exact bug class); re-checked, still correct.
- `campaigns/[id]` — **not a live bug**: grepped every caller of `/api/campaigns/${id}` and found zero PUT calls anywhere in the app (`dashboard/campaigns/page.tsx` and `dashboard/campaigns/[id]/page.tsx` only call GET/DELETE/`/send`). The PUT handler and its allowlist are dead code with no wired-up edit UI — flagging in NOTICED rather than fixing, since there's no live caller to drop a field from and no way to know the allowlist is "right" without a form to check it against.

`npx tsc --noEmit`: clean. `eslint` on all touched files: 0 errors (same 1 pre-existing unused-import warning on `clients/[id]/route.ts`, predates this round). Full suite: 542 files (was 541), 2429 tests total (was 2427) — 2392 passed + 37 skipped, 0 failed, 0 regressions.

No DB migration needed — `unit` already exists on `clients` (confirmed live via `supabase/schema.sql`'s `CREATE TABLE`, not a new column).

## Archetype depth

Added `sim-all-trades.ts` section 5a-31. Proves against a real tenant/clients row: (a) the route's own fixed allowlist, imported for real (not re-typed), lets `unit` survive `pick()` where it used to be silently stripped; (b) the picked fields actually persist through a live `update()` + re-read, not just in memory; (c) fixing `clients.unit` creates zero `client_properties` rows — the two `unit` columns are genuinely distinct with no cross-write, closing the ambiguity the schema sweep surfaced. Not yet executed — leader-run-only, writes to live tenant/clients table. Verified statically: `tsc --noEmit` clean, `eslint` clean (0 new, same 3 pre-existing warnings on untouched lines).

## NOTICED — not fixed, flagging for the leader/Jeff

Carried forward unchanged from the prior round's list (`w2-portal-notes-special-instructions-field-wiring-2026-07-17-0643.md`), items 1-12, plus:

13. **New**: `PUT /api/campaigns/[id]` has a `pick()` allowlist (`name, type, subject, body, recipient_filter, status, scheduled_at`) but zero live callers — no page in `dashboard/campaigns/*` sends a PUT to this route. Either it's dead code left over from a removed/never-built campaign-edit UI, or a campaign-edit feature was planned and the frontend was never wired up. Not fixing/removing unilaterally since it's ambiguous which; flagging so it's not mistaken for a "checked and correct" route later — its allowlist has never actually been exercised by a real form, so no one has verified it's the right field set.

## MISSING-FEATURE GAPS

Carried forward unchanged from the prior round's list, items 1-26 (see prior doc for full detail — this round's finding was a bug, not a missing feature).

## UX-FRICTION

Carried forward unchanged from the prior round's list.

File-only, no push/deploy/DB. 3 commits this round (1× `fix`+test, 1× `test(sim)`, 1× `docs`).
