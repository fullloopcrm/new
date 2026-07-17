# W2 gap/fluidity refresh — 2026-07-17 11:09

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-late-check-in-closeout-plus-3-more-consent-gaps-2026-07-17-1041.md`.

Leader's fresh 3-deep queue this round: (1) continue project archetype depth, (2) continue fresh-ground hunting on a new bug class, (3) keep gap/fluidity current.

## (1) Fresh-ground — a genuinely NEW bug class: tenant email-credential scoping

Last round closed out every live instance of the `team_members.sms_consent` class. This round needed a different class entirely. Swept every `sendEmail(...)` call site across `src/app/api` (32 files) looking for a client-facing send that skips the tenant's own Resend credentials — found one real instance:

**`POST /api/documents/public/[token]/sign`'s `sendCompletionCopies`** — the on-completion "here's your signed copy" receipt (fires once every signer has finished, attaches the fully-signed PDF) called `sendEmail({...})` with no `from`/`resendApiKey` at all. `sendEmail()` (`lib/email.ts`) falls back to the platform's own default Resend client (`process.env.RESEND_API_KEY`) and a hardcoded `"Full Loop CRM <hello@fullloopcrm.com>"` sender when neither is passed. This SAME file's `sendSigningInviteToSigner` (the sequential next-signer notify, ~40 lines below) and `documents/[id]/send/route.ts` (the initial invite) both already decrypt and pass the tenant's own `resend_api_key`/`email_from` for every other email on this document — `sendCompletionCopies` was the one outlier, even though the tenant object (`doc.tenants`) was already loaded and sitting right there at the call site; its function signature just never accepted it.

**Consequence:** the single highest-stakes email in the whole e-sign flow — the final receipt carrying the legally-signed PDF attachment — silently un-white-labeled itself (went out as "Full Loop CRM", not the tenant's own name/domain) and routed its cost/volume through the platform's shared Resend account instead of the tenant's own. If the platform-wide `RESEND_API_KEY` were ever unconfigured in some environment, this specific email would fail outright while every sibling document email kept working.

**Fix:** `sendCompletionCopies` now takes a third param (`doc.tenants`, the same object already loaded earlier in the route) and decrypts/builds `resendApiKey`/`from` exactly like `sendSigningInviteToSigner` does (`tenant.email_from || \`docs@${tenant.domain || 'fullloopcrm.com'}\`` for the sender, `decryptSecret(tenant.resend_api_key)` for the key). One call-site edit + one signature edit, `platform/src/app/api/documents/public/[token]/sign/route.ts`.

**Ruled out as NOT this class (checked, not a fresh find):** `POST /api/reviews/request`'s review-solicitation email was also a candidate (a promotional-style client email with no `email_marketing_opt_out` check) — read its own `route.consent-guard.test.ts` header comment before touching it and found this is a *known, already-flagged, deliberately-deferred* item, not a fresh miss: `sms_marketing_opt_out`/`email_marketing_opt_out`'s applicability to a post-job review ask was explicitly left open as gap #18 (still Jeff's call, "whether a post-job review ask counts as marketing... is a judgment call") back in the 05:18 round. Did not re-fix or re-flag it — would have been redundant rediscovery of an already-tracked item. Also checked and ruled out (transactional, not promotional, no opt-out gap applicable): `settings/request-automation` (internal platform-team notification, not client-facing) and `feedback` (same, internal-only recipient).

**Test:** new `route.completion-copy-sender.test.ts` — mocks `pdf-lib`, storage, and every Supabase table this route touches to drive a full single-signer "all done" completion, then asserts `sendEmail` was called with `from`/`resendApiKey` matching the tenant's own (decrypted) credentials. Mutation-verified: reverted the fix via `git apply -R`, confirmed the test goes RED for the right reason (`from: undefined`, the exact bug), reapplied, confirmed GREEN.

## (2) Archetype depth — 5a-43, proving the fix against a real encrypted key, not a mock

The unit test mocks `decryptSecret` trivially (`(v) => \`decrypted:${v}\``), so it can't prove the fix's actual runtime call — `decryptSecret(tenant.resend_api_key)` — round-trips a REAL encrypted value read back through the live `documents -> tenants` join. Added `sim-all-trades.ts` probe 5a-43: seeds the archetype tenant's `resend_api_key`/`email_from`/`domain` with a real `encryptSecret()`-encrypted key, creates a real `documents`+`document_signers` row pair, runs the exact join-select shape the fixed route uses (`.select('*, tenants(name, domain, telnyx_api_key, telnyx_phone, resend_api_key, email_from)')`), and confirms `decryptSecret()` on the joined value returns the original plaintext. Snapshots and restores the tenant's pre-probe `resend_api_key`/`email_from`/`domain` afterward (shared-tenant convention from 5a-40). **Not run this round** — `sim-all-trades.ts` is leader-run-only (per prior rounds' convention); flagging for a live run.

## Verification this round

- `npx tsc --noEmit` clean (repo-wide, including `sim-all-trades.ts` — confirmed it's in the default `tsconfig.json` `include` glob).
- `route.completion-copy-sender.test.ts`: mutation-verified RED→GREEN as described above.
- Full `src/app/api/documents/**` suite: 12 files, 25 tests, all passing, zero regressions.
- Full repo test suite kicked off; will flag in the next round if anything unexpected surfaces (running long in the background at the time of this doc).
- 2 commits this round (fix + test; archetype-depth probe) + 1 docs commit. File-only, no push/deploy/DB write.

## NOTICED — not fixed, flagging for the leader/Jeff

Carried forward unchanged from the prior round (items 1-23; #22 stays closed).

No new NOTICED items this round.

## MISSING-FEATURE GAPS

Carried forward unchanged from the prior round's list, items 1-26 (gap #18's `email_marketing_opt_out`/`sms_marketing_opt_out` half stays open on `reviews/request`, unchanged, still Jeff's product call — re-confirmed this round, not re-opened).

## UX-FRICTION

Carried forward unchanged from the prior round's list.

File-only, no push/deploy/DB write from this worker.
