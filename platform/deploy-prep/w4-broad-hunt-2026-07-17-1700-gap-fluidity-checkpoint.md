# W4 gap/fluidity — 2026-07-17 17:00

Queue (16:30 LEADER order, 3-deep, file-only, no push/deploy/DB):
(1) new fresh-ground surface
(2) continue whichever surface (1) opens up
(3) keep gap/fluidity current

This file is (3). Full detail in
`w4-broad-hunt-2026-07-17-1655-comhub-softphone-call-id-collision-hijack-fix.md`.

## This pass — 1 closed, one full surface exhausted

**Surface selection**: prior checkpoint flagged `src/components/**`
(163 files) as untouched. Walked it for direct client-side Supabase calls
per that checkpoint's hypothesis — dead end, only 4 hits and none were a
real client-side Supabase key usage (`VideoUpload.tsx` uses a server-
issued signed URL; the other 3 are marketing copy naming "Supabase" as a
tech-stack item). Pivoted to the admin `comhub/voice/**` route group that
those components call into — the 05:00 IDOR sweep only explicitly named
`voice/token`; the other six routes (`dial`, `active`, `cleanup`,
`presence`, `settings`, `log-softphone-call`) had never been individually
read.

**CLOSED**: `log-softphone-call`'s `'started'` branch upserted
`onConflict: 'customer_call_id'` against `comhub_active_calls`, whose
`customer_call_id` column is `UNIQUE` table-wide (not compound with
`tenant_id`). The upsert value came straight from the client-supplied
`telnyx_call_id` in the POST body. Any authenticated admin of any tenant
submitting a `telnyx_call_id` colliding with another tenant's live call
row would silently overwrite that row's `tenant_id`/`thread_id`/
`contact_id`/`customer_phone`, hijacking the other tenant's in-progress
call thread. Fixed by checking for a cross-tenant collision before the
upsert and rejecting with 409. `aba41390`.

## Continuation on the same surface (item 2)

Read the remaining 5 `comhub/voice/*` routes. All clean:
- `dial`, `active` — properly tenant-scoped on every read/write.
- `cleanup` — confirmed dead code (no caller anywhere in the repo; the
  `control` route's own comment already flagged this).
- `presence`, `settings` — both use the same `onConflict: 'admin_id'`
  shape against a table whose primary key is `admin_id` alone (not
  compound with `tenant_id`) — same shape as the bug that was just fixed,
  but safe here because `admin_id` is resolved server-side via
  `getActiveAdminMemberId(tenantId)` from the caller's own session, never
  taken from the request body. Worth remembering this distinction
  (client-supplied vs. server-derived collision key) as a pattern to
  check anywhere else an `onConflict` targets a column that isn't
  compound-unique with `tenant_id`.

`comhub/voice/**` is now fully swept.

## Verification (this pass)

- New `route.test.ts` (3 tests), RED/GREEN via `git apply -R` on the one
  changed file. `npx vitest run src/app/api/admin/comhub`: 6 files / 20
  tests green. `npx tsc --noEmit`: same 2 pre-existing unrelated errors
  as every prior report this session.

## Surfaces exhausted or near-exhausted this session (do not re-pick without a new angle)

Everything from the 16:50 checkpoint, plus: `src/components/**` client-
Supabase-call hypothesis (checked, dead end), `comhub/voice/**` (fully
swept this pass).

## Untouched, plausible next targets

- `platform/scripts/**` (54 files, incl. `.py`/`.mjs`/`.sh`) — ops/admin
  CLI scripts. Never referenced in any deploy-prep title this session.
  Not web-facing (lower priority) but unchecked for hardcoded credentials
  or unsafe input handling. Good candidate for the next fresh-ground pick.
- `src/lib/` broadly (259 files) — still only sampled opportunistically
  (SSRF sweep, secret-fallback grep, `.or()`/`.ilike()` grep, the Jefe
  agent files this session). No file-by-file walk has happened. The
  `onConflict`-on-non-tenant-scoped-column pattern found this pass
  (`comhub_active_calls`, `comhub_admin_presence`,
  `comhub_admin_voice_settings`) is worth a targeted repo-wide grep
  (`onConflict:`) as a fast next angle rather than a blind file walk —
  cheap, and this pass shows the pattern is real elsewhere in the schema.
- `src/components/**` — the Supabase-call angle is closed, but the
  checkpoint's other stated hypothesis ("client-side-only auth
  assumptions") is still unchecked systematically.
- `src/app/site/nyc-classifieds/**` — confirmed scaffold-only / dead
  (every interactive call target 404s), not re-flagging as live.

No push/deploy/DB. File-only.
