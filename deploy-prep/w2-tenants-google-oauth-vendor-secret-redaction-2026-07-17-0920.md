# W2 gap/fluidity refresh — 2026-07-17 09:20

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-bookings-team-member-token-worker-token-redaction-2026-07-17-0905.md`.

Leader confirmed the prior round's NOTICED #19 directly against live prod schema (read-only): `bookings.team_member_token` is the real live column (2049 populated rows), `bookings.worker_token` is dead (0 rows) — matches this session's grep/migration-based reasoning exactly, and the defensive both-names redaction already shipped covers the real target correctly. No further action needed on #19 beyond noting it's now empirically closed.

Leader's fresh 3-deep queue this round: (1) continue archetype depth, (2) continue fresh-ground hunting, (3) keep gap/fluidity current. All 3 done — see below.

## Fresh-ground sweep — 1 more real instance found and fixed (`tenants` vendor-secret / OAuth-token exposure, a FOURTH table in this bug class)

Continued widening the "credential-shaped value shipped to the browser via `select('*')`" thread (pin_hash → clients.pin/team_members.pin → bookings.team_member_token, last 3 rounds) past internal PINs/portal-tokens to the platform's own vendor API keys. `tenants` carries real third-party credentials — `stripe_api_key` (a live Stripe **secret** key), `telnyx_api_key` (SMS), `resend_api_key` (email), `imap_pass`, `anthropic_api_key`, `indexnow_key`, `telegram_bot_token`/`telegram_webhook_secret` (the codebase's own `ENCRYPTED_TENANT_FIELDS` in `secret-crypto.ts` — a single source of truth for "these are vendor secrets, encrypt at rest") — plus `google_tokens`, a live Google OAuth access/refresh-token pair granting long-lived access to the tenant's real Google Business Profile, which is **not** in that encrypted-fields list at all.

Grepped every `.from('tenants')` call in `src/app/api/**` (130+ hits) for `select('*')` combined with a single-tenant detail fetch (the shape that leaks a whole row to one browser tab, as opposed to a list view that already narrows columns) — found 2:

1. **`GET /api/admin/tenants/[id]`** — the platform-admin's read-only tenant summary view. Returned the full `tenants` row (`select('*')`) as `tenant` with zero redaction — every `ENCRYPTED_TENANT_FIELDS` value plus `google_tokens` shipped raw to the admin's browser. Checked every consumer (`admin/tenants/[id]/page.tsx`): it never reads a raw secret back — only two truthy checks (`!!tenant.resend_api_key`, `!!tenant.telnyx_api_key`) to render "connected" badges. Zero legitimate need for the raw values here.
2. **`GET /api/admin/businesses/[id]`** — the onboarding/edit-form route for the same table. Same unredacted `select('*')`, but this consumer (`admin/businesses/[id]/page.tsx`) is different: it legitimately prefills `stripe_api_key`/`telnyx_api_key`/`resend_api_key`/`imap_pass`/`anthropic_api_key`/`indexnow_key`/`telegram_bot_token` into editable inputs so an admin can view/rotate an existing key without retyping it — confirmed real consumers by grep, all present as `set*(b.*_key || '')` prefills feeding password-type inputs that round-trip on save. Stripping those would blank the field and risk wiping the stored key on next save — the exact regression `/api/settings/route.ts`'s own `NEVER_RETURNED_FIELDS` comment documents deliberately avoiding for this same tradeoff on the tenant-owner's own settings surface. Only 2 fields on this route have a genuinely **zero** read-back consumer (grepped this page + its `wizard`/`selena-persona` siblings): `google_tokens` (the one usage site, a "Google OAuth connected" badge, only ever truthy-checks `.refresh_token`) and `telegram_webhook_secret` (unread anywhere).

**Fixed** (2 files, redaction scoped per-route to match each route's real consumer needs, not a blanket one-size-fix):

- `GET /api/admin/tenants/[id]`: redacts the full `ENCRYPTED_TENANT_FIELDS` set + `google_tokens` via `omit()`; replaces the two booleans the page needs with explicit `has_resend_api_key`/`has_telnyx_api_key`. `admin/tenants/[id]/page.tsx` updated to read the new derived fields instead of the raw values.
- `GET /api/admin/businesses/[id]`: redacts only `google_tokens` (replaced with a `google_oauth_connected` boolean) and `telegram_webhook_secret`; every other `ENCRYPTED_TENANT_FIELDS` value is deliberately left raw here — verified by a CONTROL test that this route still returns `telegram_bot_token` raw, so the fix can't silently regress into the same over-redaction trap. `admin/businesses/[id]/page.tsx` updated to consume `google_oauth_connected` instead of `google_tokens?.refresh_token`.

Both fixes redact only the **response copy** built just before `NextResponse.json(...)` — `admin/businesses/[id]`'s onboarding `checklist` object (which internally truthy-checks several of these same fields, e.g. `resend_api_key_saved: !!business.resend_api_key`) is computed from the full, unredacted `business` object earlier in the handler, so redacting only the final response can't blank a checklist item the way redacting `business` itself up front would have.

2 new `route.vendor-secret-redaction.test.ts` files, 8 tests (4 each). Mutation-verified: `git diff` the 2 route fixes into a patch, `git apply -R` it, watched all 6 non-control assertions go RED for the right reason (the seeded secret/token values present in the JSON response body — `git apply -R`'d cleanly since this fix, unlike prior rounds, touches only the 2 route files, not the frontend pages), `git apply` to restore, watched all 8 GREEN again.

`npx tsc --noEmit`: clean. `eslint` on all 6 touched/new files: 0 errors, 0 new warnings (2 pre-existing warnings on untouched lines in `admin/businesses/[id]/page.tsx`, same as before this round). Full suite: 560 files (was 558), 2492 tests (was 2484) — 2455 passed + 37 skipped, 0 failed, 0 regressions. Existing `route.pin-hash-redaction.test.ts` files for both routes re-ran clean (11 files / 39 tests in these two route directories, all green) — confirms this round's fix doesn't collide with the already-shipped `tenant_members.pin_hash` redaction on the same two handlers.

No DB migration needed — no schema change, pure response-shape redaction plus 2 frontend field renames.

## Archetype depth

Added `sim-all-trades.ts` section 5a-40. Unlike 5a-39 (which created its own throwaway `bookings` row), this probe reuses the sim's own already-created throwaway tenant (`SIM <category> <runId>`, created earlier in the same run at P1.3 SELL) rather than writing fake secrets onto a real tenant — grepped, nothing else in the file reads any of these columns on it downstream, so it's safe. Proves, against the real live table rather than static grep alone: (a) `tenants.indexnow_key`/`google_tokens` genuinely round-trip a write (not a schema-cache mirage), (b) the `admin/tenants/[id]`-shaped redaction (`omit()` with the full `ENCRYPTED_TENANT_FIELDS` set + `google_tokens`) strips every one of those keys from a real row while leaving `id`/`name` untouched, and (c) the narrower `admin/businesses/[id]`-shaped redaction strips `google_tokens` but deliberately leaves `indexnow_key` present — a control against silently over-redacting that route. Restores `indexnow_key`/`google_tokens` to their prior (null) values afterward since this tenant is shared by every later phase in the run. Not yet executed — leader-run-only, writes to (and restores) a live sim tenant row. Verified statically: `tsc --noEmit` clean, `eslint` clean (0 new; same 3 pre-existing warnings on untouched lines as every prior round this session).

## NOTICED — not fixed, flagging for the leader/Jeff

Carried forward unchanged from the prior round's list (`w2-bookings-team-member-token-worker-token-redaction-2026-07-17-0905.md`), items 1-19 (all now closed or already flagged), plus:

20. **New — this round's fresh-ground sweep covered only the 2 single-tenant-detail `GET` routes on `tenants` (`admin/tenants/[id]`, `admin/businesses/[id]`), not all ~130 other `.from('tenants')` call sites in `src/app/api/**`.** Most of those are list views or narrow-column selects that looked clean on a first pass (e.g. `admin/tenants/route.ts`'s list query), but I did not individually verify every one the way I did these two. Worth a dedicated follow-up sweep specifically for `select('*')` (or broad column lists that happen to include `ENCRYPTED_TENANT_FIELDS`) on any OTHER admin/cron/webhook route touching `tenants`, rather than assuming this round's fix closed the whole surface.

## MISSING-FEATURE GAPS

Carried forward unchanged from the prior round's list, items 1-26.

## UX-FRICTION

Carried forward unchanged from the prior round's list.

File-only, no push/deploy/DB. 3 commits this round (1× `test(sim)` archetype-depth, 1× `fix`+tests, 1× `docs`).
