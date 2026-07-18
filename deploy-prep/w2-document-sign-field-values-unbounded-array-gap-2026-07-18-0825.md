# W2 gap/fluidity refresh — 2026-07-18 08:25

Leader's 08:06 order: fresh 3-deep queue — (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## Resolver lane — not re-swept

Confirmed dry 4 consecutive rounds (`da2244fa`, `f5ad93ff`, `fac94077`, `01f5719d`/`d19747b8`). No resolver-lane work this round; new ground found elsewhere per the established pattern of the last several rounds.

## (1) New fresh-ground surface — public document-sign endpoint had an unbounded caller-supplied array feeding sequential DB writes

This morning's two rounds closed the "single free-text field, no length cap" class across `/api/chat`, `/api/yinez`, and 8 public application/lead forms. Generalized the search one level further: which public unauthenticated write endpoints accept a caller-supplied **array**, not just a scalar field?

Found one: `POST /api/documents/public/[token]/sign` — the heaviest route in the public-document family (PDF generation via `pdf-lib`, storage upload, completion email/SMS) — reads `field_values: Array<{ field_id, value }>` straight off the request body with zero cap on either dimension:

- **Array length** — the route `for`-loops over `fieldValues` and fires one `document_fields` `UPDATE` per entry, sequentially awaited. A single request with an oversized array (the field_id doesn't even need to match a real field — the `.update()` call still runs and still costs a round trip) turns one HTTP request into thousands of sequential Supabase calls. The route's own `rateLimitDb` guard bounds request *count* (10/min/IP) — same request-count-vs-request-size gap as the morning's fixes, just expressed as array cardinality instead of string length.
- **Per-item value length** — `fv.value` is written via `String(fv.value || '')` into `document_fields.value`, a plain `TEXT` column with no DB-level length constraint (confirmed against `migrations/031_documents.sql`). That same value is later stamped onto the finalized PDF via `pdf-lib` in `finalizeDocument()`, so an oversized string also risks bloating/breaking PDF generation on the completion path, not just the DB row.

**Fixed:** added two checks in `route.ts`, positioned with the rest of the route's fail-fast validation (after the `signature_png`/`signature_name` checks, before the `documents` lookup, no DB writes before either check runs):
- `fieldValues.length > 200` → `400 'Too many field values'`
- any `fv.value` longer than 5000 chars → `400 'Field value too long (max 5000 characters)'`

Also hardened the initial destructure from `body.field_values || []` to `Array.isArray(body.field_values) ? body.field_values : []` — the prior form assumed the caller sent an array; a non-array truthy value (e.g. an object) would have thrown inside the `for...of` and surfaced as an unhandled 500 instead of failing closed to an empty list.

200/5000 chosen to match this session's existing precedent (`maxLengthError`'s default max is 5000; other per-item/array caps this lane has added — e.g. `reviews/submit`'s `images.slice(0, 5)` — stay conservative relative to realistic real-world usage). A signable document realistically has well under 200 fields per signer.

## (2) — swept for sibling instances of the same "unbounded caller array on a public write" gap

- Grepped every public (unauthenticated) POST/PUT route for `Array.isArray(body.*)` / `body.* || []` destructuring of a request-body array: only `documents/public/[token]/sign`'s `field_values` matched — every other hit is either a query-result array (safe, DB-controlled) or lives behind `requirePermission`/portal-token auth (dashboard, finance, bookings, routes, crews, etc. — internal/authenticated, out of this lane's public-surface scope, not touched).
- `reviews/submit`'s `images` array is public but already capped (`.slice(0, 5)`, pre-existing).
- `documents/[id]/fields/route.ts` PUT (`body.fields || []`, bulk field-placement replace) has the same unbounded-array shape but is `requirePermission('sales.edit')`-gated (internal staff only, not a public attack surface) — noted, not fixed this round; flagging below as carried-forward if this lane extends to authenticated-but-high-cardinality endpoints later.
- No other public document/quote route (`decline`, `accept`, `consent`) accepts an array field — confirmed by re-reading all four files in the family this round.

## (3) — gap/fluidity kept current

Carried-forward items unchanged: `PATCH /api/admin/websites` destination-tenant-status judgment call, seo-* verify-revert/alerts/health judgment calls, backup-cron retention question, owner/admin Telegram bot status-gate question, `detect.ts` migration (prepared as file, awaiting Jeff's approval), ComHub nav-parity, tenant self-serve domain config, item-33 (3 bespoke tenants' cross-contaminated static domain lists).

New this round:
1. `documents/[id]/fields` PUT's unbounded `body.fields` array (admin-authenticated) — same shape as the fix above, lower priority since it requires `sales.edit` permission (trusted internal user, not a public attacker). Not acted on; flagging in case this lane's scope later extends to authenticated-endpoint hardening.

## Verification this round

- `npx tsc --noEmit` clean (repo-wide).
- 4 new tests in `src/app/api/documents/public/[token]/sign/route.field-values-cap.test.ts`: oversized-array rejection (201 entries → 400, never reaches the `documents` table query), oversized-single-value rejection (5001 chars → 400, same before-`documents`-query assertion), normal-size array passes validation through to the `documents` lookup, and non-array `field_values` is treated as empty rather than throwing.
- RED/GREEN confirmed: reverted just this file's diff (`git stash push` on the route file only), reran the 4 new tests — 2 failed as expected (400 assertions saw 404, i.e. the route proceeded past validation with the old code), restored the fix, all 4 pass.
- Full repo suite: 762 files, 3265/3303 tests passed (37 skipped), 1 pre-existing failure (`cron/payment-followup-daily/route.test.ts`'s CRON_SECRET auth test — a test-harness mock gap, `.not()` not implemented on that file's fake `supabaseAdmin.from().select()` chain, same failure documented in the prior round's gap doc). `git diff --stat` against that file and its test shows zero changes on this branch this round — confirmed unrelated to this round's change.

File-only, no push/deploy/DB write from this worker. 1 code commit this round (fix + new test file, 2 files) + 1 docs commit.
