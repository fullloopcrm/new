# W2 gap/fluidity refresh — 2026-07-17 14:52

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-tenant-public-loginlink-plus-remaining-candidates-domain-fallback-2026-07-17-1425.md`.

Leader's fresh 3-deep queue this round (14:28 LEADER->W2): (1) fresh-ground grepping, my call on surface — the known resolver-precedence list was already exhausted per last round. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1)+(2) Fresh-ground sweep found 6 fromEmail mirrors — then a misdiagnosis, then a correction

Widened the grep beyond the exhausted `tenant.domain`/`domain_name` resolver-precedence list to the exact pattern flagged (but deliberately not fixed) two rounds ago: inline `docs@`/`invoices@`/`quotes@${tenant.domain || 'fullloopcrm.com'}` sender-address fallbacks. Found and fixed 6:

- `documents/[id]/send/route.ts`, `invoices/[id]/send/route.ts`, `quotes/[id]/send/route.ts` — `fromEmail` fallback (fires when `email_from` unset).
- `dashboard/comms-preview/route.ts` — the `?send=` dev-preview email's `from`.
- `documents/public/[token]/sign/route.ts` — BOTH tenant-domain reads in this file: `sendCompletionCopies`'s final-receipt `fromEmail`, and `sendSigningInviteToSigner`'s `fromEmail` (that function's sign-link `baseUrl` was already fixed in an earlier round — this was its sibling `fromEmail` line, missed at the time).

**First pass (WRONG, commits `7a779ad1` + `39babd17`):** treated this as the same tenant_domains-resolver-precedence bug class as every other mirror this session, and "fixed" it by resolving through `getPrimaryTenantDomain()` before falling to the generic default — same pattern as the baseUrl fixes in these same files. Wrote 18 new tests, all green, `tsc` clean, full-suite green. Committed.

**Caught before reporting up, re-reading the prior round's own doc for context on this exact carried-forward item.** `w2-tenant-public-loginlink-plus-remaining-candidates-domain-fallback-2026-07-17-1425.md`'s NOTICED section says these fallbacks "bypass `tenantSender()`... different bug shape, not blind-fixed" — a helper I hadn't checked. Reading it: `tenantSender()` uses `email_from` when set, else falls back to `"<Tenant Name> <slug@fullloopcrm.com>"` — the PLATFORM's own Resend-verified apex — specifically because a tenant's site domain is never verified with Resend for sending (confirmed via `/api/admin/email`'s PUT handler: `email_from` is only ever set together with `resend_domain` through an explicit admin domain-verification flow, never derived from `tenant.domain`/`tenant_domains`).

**This means my first-pass fix was wrong, not just incomplete.** The original `docs@${tenant.domain || 'fullloopcrm.com'}` was already a bug — but a different one than tenant_domains-resolver-precedence. Resolving it to the tenant's *real* custom domain (via `tenant_domains`) as an unverified sender is worse than the original bug: it actively routes outbound mail through a domain Resend has never verified for that tenant, where the original bug at least degraded to the (usually-verified) `fullloopcrm.com` default more often. Sending from an unverified domain risks outright Resend API rejection or SPF/DKIM failure landing the email in spam — for documents, this is the signed-PDF receipt and the "you're up next" signer notify; for invoices/quotes, the payment link.

**Corrected (commit `50f8ab9f`):** reverted the `getPrimaryTenantDomain()` resolution in all 6 spots, replaced with `tenantSender(tenant)` — the same established helper `contact/route.ts`, `notify.ts`, `notify-team.ts`, and `admin-contacts.ts` already route through. `sendCompletionCopies`'s tenant param type widened to include `name`/`slug` (the caller's query already selects both — this was a typing gap, not a missing DB read). `comms-preview`'s tenant select swapped `domain` for `slug` (the only field this route needs from `tenantSender()` that it wasn't already selecting). Rewrote all 18 tests to assert the correct `tenantSender()`-shaped output (`"Acme <acme@fullloopcrm.com>"` style, or the raw `email_from` when set) instead of the wrong domain-based expectations — used `vi.importActual` for `@/lib/email` in each rewritten test so the REAL `tenantSender()` runs under test rather than re-deriving its logic in a mock. Fixed 3 other pre-existing test files whose `@/lib/email` mocks only exported `sendEmail` and broke once `route.ts` started importing `tenantSender` too (`documents/[id]/send/route.isolation.test.ts`, `quotes/[id]/send/route.rbac.test.ts`, `documents/public/[token]/sign/route.rate-limit.test.ts`).

**Root cause of the misdiagnosis:** pattern-matched the `${tenant.domain || 'fullloopcrm.com'}` shape against the (very real, very common this session) tenant_domains-resolver-precedence bug class without checking whether an existing, more-specific helper already existed for this exact call shape. The prior round's own doc had already named the correct fix and the reason (`tenantSender()`, Resend verification) — available in-repo, not checked before the first pass.

## Verification this round

- First pass: `npx tsc --noEmit` clean, full suite 598 files / 2621 passed / 1 failed (`finance-export.test.ts`'s 200k-row pagination timeout, confirmed pre-existing/flaky — passes standalone in ~3s, only times out under full-suite parallel load, unrelated file never touched).
- Correction pass: `npx tsc --noEmit` clean. Isolated run of all 9 affected test files: 31/31 passed. Full suite re-run clean this time: **598 files, 2616 tests passed, 37 skipped, 0 failed** (the flaky finance-export test happened to pass this run).
- No mutation-verify pass this round (correction commit reverts+replaces the same lines the first-pass mutation-verify already covered structurally; re-ran the full assertions instead, which changed value, not shape).
- File-only, no push/deploy/DB write.

## NOTICED — not fixed, flagging for the leader/Jeff

Carried forward unchanged: `selena-legacy-email.ts`'s dead-code finding (confirmed again this round — its `formatHtmlReply` has the EXACT same raw-`tenant.domain` pattern for a footer site-link, but `handleInboundEmail` has zero callers anywhere in the live app, only referenced in a test's file-scan list). `tenant-schema.ts`'s SEO-opportunity finding.

**New this round:** the `tenantSender()` bypass item from the prior round's carry-forward list is now CLOSED — all 6 known call sites fixed. Grepped for any remaining ad-hoc `${tenant.domain || 'fullloopcrm.com'}`-shaped sender construction repo-wide after the fix: none found outside the 6 now-fixed sites and the ruled-out dead code.

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward unchanged from the prior round's lists.

## Remaining candidates, not yet fixed (fresh ground for a future round)

Both the tenant_domains-resolver-precedence list AND the `tenantSender()`-bypass list are now fully closed. Next round should resume fresh-ground grepping from scratch — expect this to be genuinely exhausted for the domain/sender-address bug shapes; may need to widen to a different call shape entirely (e.g. SMS `telnyx_phone` fallback precedence, or a different resolver concern altogether within the tenant-resolution lane).
