# W2 gap/fluidity refresh — 2026-07-17 07:22

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-client-notes-field-wiring-2026-07-17-0710.md`.

Leader's fresh 3-deep queue this round: (1) continue archetype depth, (2) continue fresh-ground hunting, (3) keep gap/fluidity current. All 3 done — see below.

## Fresh ground (real bug) — first instance of this session's field-wiring bug class on the team-member side rather than the client side

The prior three rounds all found the same "wrong `clients` column" shape on client-facing routes. This round widened the hunt off the client side entirely and onto the crew/team-member side, looking for the same underlying pattern (a route reading/writing the wrong storage location for a value that's actually surfaced somewhere else).

**`GET/PUT /api/team-portal/preferences`** (the crew member's own notification/SMS-consent settings, `/team` page) — read and wrote `team_members.notes` (JSON-encoded) instead of the real `team_members.notification_preferences` (JSONB, `migrations/013_full_parity.sql`) and `sms_consent` (boolean, `migrations/011_parity_with_nycmaid.sql`) columns. Those two real columns are exactly what `notifyTeamMember()` (`src/lib/notify-team-member.ts`) — and every other notify-cleaner path in the codebase (`src/lib/notify-team.ts`, `src/lib/nycmaid/notify-cleaner.ts`, all three tenant-specific `_lib/notify-cleaner.ts` files) — actually `.select()`s to decide whether to push/email/text a crew member. This route was the **only** write path in the whole codebase for these two columns, and it never touched them.

Consequence: GET/PUT round-tripped against `notes` internally, so from the crew member's side the settings page looked like it worked (their choice always read back correctly). But the real send-gating path never reads `notes` — it reads the real columns, which this route never updated. So:
1. **Compliance/consent**: a team member explicitly revoking SMS consent, or disabling SMS for one notification type, kept receiving real SMS anyway. This is the same consent-gate bug class this session already fixed repeatedly for clients (missing/broken `sms_consent`/`do_not_service` checks) — here it's not a missing check, it's the crew's own opt-out never reaching the column the check reads.
2. **Silent, indefinite drift**: `team_members.notification_preferences` and `sms_consent` are never written by any code path now that this route is fixed to write them, meaning before this fix, every team member's real preference columns sat exactly at their DB defaults forever, regardless of what the crew member set in their portal.

**Fixed**: both handlers now target `notification_preferences`/`sms_consent` directly (PUT merges onto the existing `notification_preferences` value rather than overwriting it, matching the previous merge-onto-existing-JSON behavior). 6 new tests (1 file): PUT writes the real `sms_consent` column, PUT never touches `notes`, GET reflects a saved value from the real column, a partial `notification_preferences` PUT merges onto the existing column instead of clobbering other notification types, plus 2 wrong-tenant/wrong-member probes (a different member's token cannot read/write another member's row; an invalid token is rejected before any write). Mutation-verified via `git stash`/pop on just the route file — 3 of 6 failed for the right reason on revert (the 2 wrong-tenant/invalid-token auth probes correctly stayed green, since they test auth rejection, not column mapping), restored GREEN.

`npx tsc --noEmit`: clean. `eslint` on all touched files: 0 errors, 0 new warnings. Full suite: 544 files (was 543), 2441 tests total (was 2435) — 2404 passed + 37 skipped, 0 failed, 0 regressions from this round's change.

No DB migration needed — `notification_preferences` and `sms_consent` already exist on `team_members` (migrations 013 and 011).

Did NOT find further siblings: grepped every `.update(` call site against `team_members` across the whole `src` tree for writes to `notification_preferences` or `sms_consent` — this route was the only one. The admin dashboard's own separate notification toggle (see NOTICED #15 below) writes to `notes`, not these columns, so it's a different (already-known-broken) surface, not another instance of this exact fix.

## Archetype depth

Added `sim-all-trades.ts` section 5a-33. Proves against a real tenant/team_members row: (a) `notification_preferences` and `sms_consent` genuinely exist as columns on the live table (the migrations actually landed in prod, not just in the migration files); (b) the fixed GET select shape reads back the real `sms_consent` value, not something parsed out of `notes`; (c) the fixed PUT update shape writes both real columns and leaves an unrelated `notes` value untouched; (d) `notifyTeamMember`'s own `sms_consent` gate now actually observes the crew member's real opt-out. Not yet executed — leader-run-only, writes to live tenant/team_members table. Verified statically: `tsc --noEmit` clean, `eslint` clean (0 new, same 3 pre-existing warnings on untouched lines).

## NOTICED — not fixed, flagging for the leader/Jeff

Carried forward unchanged from the prior round's list (`w2-client-notes-field-wiring-2026-07-17-0710.md`), items 1-14, plus:

15. **New**: the admin dashboard's own `/dashboard/team/[id]` "Notification Preferences" panel (4 toggles: New job assigned / Schedule changes / Daily summary / Payment confirmed) is **fully dead** from a functional standpoint — discovered while investigating the fresh-ground bug above. It writes its state into `notes.notification_prefs` (via `PUT /api/team/[id]`'s plain `pick()`-allowlist update, which still includes `notes`), a key `notifyTeamMember()` never reads (it reads the real `notification_preferences` column, now correctly wired to the crew's own portal settings by this round's fix). The admin's 4 flat booleans also don't map 1:1 onto the real shape (6 categories × 3 channels each, `job_assignment`/`job_reminder`/`daily_summary`/`job_cancelled`/`job_rescheduled`/`broadcast`, each with independent push/email/sms). Not fixing unilaterally: whether Jeff wants this panel (a) removed since crew already self-manage this from their own portal, (b) rebuilt against the real column as an admin-override, or (c) left as-is (it's currently harmless — it doesn't corrupt anything, just doesn't do anything) is a product decision, not something inferable from the code. Flagging in detail now so it isn't rediscovered as a fresh mystery later.

## MISSING-FEATURE GAPS

Carried forward unchanged from the prior round's list, items 1-26.

## UX-FRICTION

Carried forward unchanged from the prior round's list.

File-only, no push/deploy/DB. 3 commits this round (1× `fix`+test, 1× `test(sim)`, 1× `docs`).
