# W4 broad-hunt — 2026-07-17 13:00 EDT — e-sign decline/sign race fix

Queue (12:54 LEADER order, 3-deep, file-only, no push/deploy/DB):
(1) pivot fresh-ground hunting to a new surface — seo/* reads exhausted
(2) continue whichever surface (1) opens up
(3) keep gap/fluidity current

This report covers (1). New surface: `src/app/api/documents/*` (the
multi-party e-sign module) — not previously touched this session per a
grep across all 275+ prior `deploy-prep/*.md` reports.

## CLOSED: `documents/public/[token]/decline` — unconditional write could
revert a just-completed signature back to declined

`sign/route.ts` claims the pending/sent/viewed → signed transition
atomically: `update(...).eq('id', signer.id).in('status', [...])`, so a
losing concurrent request gets a clean "already signed" instead of
double-writing. `decline/route.ts` had no such guard — it read
`signer.status` once, read the parent `documents.status` once, then wrote
`status: 'declined'` unconditionally on both rows with no WHERE on the
prior status.

Interleaving that broke: decline's reads both land while the signer is
still `pending`/`in_progress` (passes decline's own checks) — then a
concurrent `sign()` request wins the race, atomically flips the signer to
`signed` and (if it was the last signer) finalizes the document to
`completed` — then decline's write executes anyway, silently overwriting
the freshly-signed signer row and the parent document back to `declined`.
The already-finalized signed PDF stays in storage, but the document
record permanently reads "declined" with no recovery path short of manual
DB intervention. This is the same signer-facing public token endpoint as
`sign`, so both requests are equally reachable by a real client (double
tab, back-button resubmit, or a race between the signing widget's
optimistic UI and a stale decline retry).

Fixed by claiming the decline the same way sign claims: `update(...)
.eq('id', signer.id).in('status', ['pending','sent','viewed'])`, returning
`already signed` (400) if 0 rows matched. Also scoped the parent
`documents` update with `.not('status', 'in', '(completed)')` so a
decline that loses the race can never flip a document that finalized to
`completed` back to `declined`, even if the signer-level claim raced
differently than the document-level write.

Ruled out as not worth fixing (scope discipline, not a correctness bug):
`consent/route.ts`'s unconditional write only sets `consent_accepted_at`
+ IP/UA — additive and idempotent, a duplicate write in a race is at most
a harmlessly-overwritten timestamp, not a state-machine violation like
decline's.

## Verification

- New test `route.sign-race.test.ts` (2 tests): confirmed it **fails on
  the pre-fix code** (`git apply -R` on the isolated diff — race test
  asserts 400/no-write, pre-fix code returns 200 and stomps both rows to
  declined) and **passes post-fix** (`git apply` to re-apply). The mock's
  Supabase query-builder chains are thenable (execute on `await` even
  without a trailing `.select()`), matching real supabase-js behavior —
  an earlier draft of this test used a mock that only executed on
  `.select().maybeSingle()`, which silently no-op'd the pre-fix
  unconditional write and made the test pass regardless of the bug. Fixed
  the mock before trusting the result.
- `npx vitest run src/app/api/documents/`: 3 files, 9 tests, green.
- `npx tsc --noEmit`: same pre-existing 2-error baseline as every prior
  report this session (`bookings/broadcast` test mock typing,
  `sunnyside-clean-nyc` site-nav import), none in touched files.
- No push, no deploy, no DB write. 1 source file fixed, 1 new test file,
  1 deploy-prep report (this one).

## Surface survey — documents/* still has open ground

Read but did not find further bugs in: `sign/route.ts` (already atomic +
integrity-hashed), `[id]/void/route.ts` (tenant-scoped, terminal-guarded),
`[id]/duplicate/route.ts` (sequential inserts, no race exposure since it's
an authenticated single-actor create flow), `consent/route.ts` (see
above). Not yet read this pass: `[id]/route.ts`, `[id]/fields/route.ts`
(has its own witness test already), `[id]/signers/route.ts` +
`[id]/signers/[signerId]/route.ts`, `documents/route.ts` (list/create),
`public/[token]/route.ts` (public GET). Reasonable next-pass candidates
if this surface is picked up again.
