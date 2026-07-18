# W2 gap/fluidity refresh — 2026-07-17 21:30

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-file-upload-storage-plus-csv-export-sweep-clean-2026-07-17-2130.md`.

Leader's fresh 3-deep queue this round (21:18 LEADER->W2): (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

Also verified before starting: leader's 21:18 note credited W2 with closing `finance/upload/route.ts`'s MIME gap. My own 21:13 report explicitly said that gap was confirmed dead code and **not fixed**. Checked the file on disk in this worktree — still no MIME check, confirming my report was accurate. Then found the actual fix on a different branch (`p1-w4`, commit `5af092d2`, dated Jul 15) — another worker's lane already closed it there, just not yet merged into `p1-w2`. Not a discrepancy on my end, no action needed here; flagging only so the leader's cross-branch bookkeeping stays accurate.

## (1) — new fresh-ground surface: comhub-voice-config.ts's fromNumber resolution

Grepped `lib/*.ts` for every `resolveTenant*` helper to find resolvers not yet audited this session. Found `resolveTenantVoiceConfig()` (`lib/comhub-voice-config.ts`) — the ComHub softphone's per-tenant Telnyx config resolver, previously looked at only in passing (15:17 round noted it "does the same platform-fallback pattern but explicitly for the internal softphone, not customer SMS" and moved on without checking its `fromNumber` field's column precedence specifically).

**Real bug found and fixed.** `fromNumber` read `tenants.telnyx_phone` alone:
```
fromNumber: (data.telnyx_phone as string) || ENV.fromNumber,
```
— skipping the `sms_number` legacy-column fallback that `resolveTenantSmsCredentials()` (`lib/sms-credentials.ts`) established as canonical precedence for this exact same physical Telnyx number. A tenant with a fully-configured own Telnyx voice account (own `telnyx_api_key` + `telnyx_voice_connection_id`) but only the legacy `sms_number` column populated would get `apiKey`/`voiceConnectionId` from its OWN account but `fromNumber` from the PLATFORM's shared number — a caller-ID mismatch used directly as the Telnyx `from` field in `admin/comhub/voice/dial/route.ts`'s live outbound call. Likely a hard Telnyx rejection (a connection generally can't originate from a number it doesn't own), not just a cosmetic wrong-number display.

Fixed: `fromNumber: (data.telnyx_phone as string) || (data.sms_number as string) || ENV.fromNumber`. Added `sms_number` to the `.select()` column list.

New test file `comhub-voice-config.test.ts` (8 tests, none existed before in this worktree — a different branch, `p1-w5`, has an unrelated 88-test sweep touching this file that isn't merged here yet). Notable test-infra wrinkle: this module's `ENV` block is a plain `const` captured at import time (unlike `sms-credentials.ts`'s `platformTelnyxApiKey()`/`platformTelnyxPhone()`, which deliberately read `process.env` at call time specifically so tests can stub per-case). A naive `beforeEach(() => vi.stubEnv(...))` silently no-ops against it — caught this via the mutation-verification RED pass showing 5 failures instead of the expected 3 (2 were env-related false failures, not the bug). Fixed by having every test call a `loadResolver()` helper that does `vi.resetModules()` + dynamic `import()` after stubbing, forcing a fresh `ENV` snapshot per test. Mutation-verified: RED (3 failures, all and only on the sms_number-fallback assertions) against pre-fix code, GREEN after. Commit `11a95dbd`.

## (2) — continuation: same bug class in the onboarding-readiness profile field

Grepped every remaining raw `telnyx_phone` read in the repo (not already covered by the sms_number carry-forward closure) to check whether the voice-config gap had siblings. Two candidates surfaced:

- `bookings/[id]/team/route.ts`'s `.select('id, name, telnyx_api_key, telnyx_phone')` — re-verified this is the same "dead select" already confirmed in the 20:33 round: the fetched `tenant` row is only used for `tenant.name` in the SMS message body; actual credential resolution happens inside `notifyTeamMember()`. No new bug.
- `lib/tenant-profile.ts`'s `telnyxPhone` field (`PROFILE_FIELDS`, section `comms`) — **real gap, fixed.** `read: (x) => t(x, 'telnyx_phone')` fed straight into `tenant-readiness.ts`'s completeness %, section fill counts, and the admin profile UI's filled/unfilled indicator (`ProfileForm.tsx`) — same false-diagnostic class already fixed 3x this session on `admin/system-check`, `admin/sms` GET, and `dashboard/sms`. An sms_number-only tenant showed "SMS number" as not-filled in its own onboarding readiness report, dragging down its completeness score for a field that's actually configured everywhere SMS actually sends. Non-blocking (`tier: 'recommended'`, not `'critical'`, so it doesn't block launch per `tenant-readiness.ts`'s own gate logic) but a real visible-to-admin display gap.

Fixed: `read: (x) => t(x, 'telnyx_phone') || t(x, 'sms_number')`. Write path (`col: 'telnyx_phone'`) left untouched — still writes to the canonical column only, matching the established write-canonical/read-with-fallback pattern used everywhere else. New test file `tenant-profile.telnyx-phone.test.ts` (5 tests: field-level unit tests on the `read()` function plus a `getTenantProfile()` wrong-tenant integration probe). Mutation-verified: RED (2 failures, both on the sms_number-fallback assertions), GREEN after. Commit `bd1ab4b3`.

Grepped the rest of the ~60 remaining raw `telnyx_phone` matches repo-wide — all are either: (a) already-fixed call sites confirmed in prior rounds' closure (select both columns, feed `resolveTenantSmsCredentials`/`hasTenantSms`), (b) admin/dashboard settings-editor UI fields (edit the canonical column directly by design, not a gating read), or (c) doc/comment text. No further live gaps found.

## (3) — gap/fluidity kept current

Carried-forward NOTICED items unchanged:
1. `tenant_domains` DELETE/reactivate gap — still open, still gated on Jeff's product call.
2. `lib/tenant-schema.ts` — still confirmed dead code.
3. `platformFallback` compliance question (JEFF-MORNING-QUEUE.md) — still open.
4. `bookings/batch/route.ts`'s platform-fallback anomaly — still gated on #3.
5. `finance/upload/route.ts`'s MIME gap — per the note at the top, already fixed on `p1-w4` (commit `5af092d2`), pending merge into `p1-w2`. Downgrading from "flagged, not fixed" to "fixed elsewhere, awaiting integration" — not an action item for this lane.

NEW this round: none — both findings above were fixed in-round, not deferred.

## MISSING-FEATURE GAPS / UX-FRICTION

Nothing new this round.

Verification for both fixes: `tsc --noEmit` clean, `eslint` 0 new warnings (1 pre-existing unrelated warning confirmed via diff), full suite 666/666 files, 2848/2885 tests (37 pre-existing skips), 0 regressions, run after both fixes together. File-only, no push/deploy/DB. Commits: `11a95dbd` (voice fromNumber fix), `bd1ab4b3` (profile readiness fix), this doc.
