# W2 gap/fluidity refresh — 2026-07-18 07:33

Leader's 07:10 order: fresh 3-deep queue — (1) new fresh-ground surface (different surface entirely, resolver lane genuinely dry twice). (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1) New fresh-ground surface — public unauthenticated form/upload rate limiting

Resolver lane confirmed dry twice in a row (`da2244fa`), so this round deliberately picked an unrelated bug class: **which public, unauthenticated endpoints are missing rate limiting**, cross-checked against the established `rateLimitDb` convention already used by every comparable public form this session (`contact`, `waitlist`, `apply`, `apply-ceo`, `lead`, `errors`, `track`, `cleaners/upload`, `public-upload`).

Found and fixed 3 platform-level (non-tenant) public forms with zero rate limiting, all previously untested (`05c7b8ea`):

- **`POST /api/inquiry`** — marketing-site contact/acquisition form. Worst of the three: an "Acquirer" + "$1M+" submission fires a real Telnyx SMS to the owner's phone with zero volume gating on top of the usual admin-email + DB writes — a scripted flood both spams the owner's phone and racks up real per-message SMS cost.
- **`POST /api/feedback`** — anonymous in-app feedback widget. Unbounded `platform_feedback` writes + admin-email spam.
- **`POST /api/leads`** — onboarding-page lead capture. Unbounded `leads`/`partner_requests` writes + admin-email spam.

All three were missed because the established `rateLimitDb` convention always keys on `tenant.id:ip` and these three routes have no tenant (platform-level, not tenant-scoped) — the same convention already exists for that shape too (`errors:${ip}`, `track:${ip}`), it just hadn't been applied here yet. Fixed with `rateLimitDb(`<name>:${ip}`, N, 10min)` matching that sibling pattern.

## (2) Continuation — same surface, found one more

Swept the rest of the public-facing endpoint list for the same gap. Found and fixed one more (`30751fa4`):

- **`POST /api/reviews/upload`** — public, unauthenticated review photo/video upload, videos accepted up to 100MB, zero rate limit. Sibling `cleaners/upload` already enforces `rateLimitDb('upload:${tenantId}:${ip}', 3, 10min)`; this one was missed. Worse cost shape than the form endpoints — a flood of repeated 100MB uploads runs up real storage cost with no gate at all. Fixed with the same convention, keyed `reviews-upload:${tenantId}:${ip}`.

Checked and ruled out (no fix needed, not the same bug or already covered):

- **`POST /api/public-upload`** — already correctly rate-limited (`public_upload:${tenantId}:${ip}`, 60/10min) — the actual reference implementation this fix pattern is modeled on.
- **`POST /api/referrals/track`** — public, no rate limit, but no side effects (doesn't send email/SMS, doesn't even write a click record yet per its own comment — looks like unfinished/dead functionality) and no financial-write path. Lower severity than the fixed set; not the same class.
- **`POST /api/client/confirm/[token]`** — public one-tap token link that does trigger SMS/notify on acceptance, but is self-limiting: `client_terms_accepted_at` gates the notify block, so once accepted, every repeat call returns early before any side effect. A single valid token can only trigger the notification once regardless of repeat calls; rate limiting wouldn't change that.
- **`POST /api/unsubscribe`** — requires a signed, verified token (`verifyUnsubscribeToken`); no side effects beyond an idempotent opt-out flag. Not brute-forceable without the signing key.
- **`POST /api/portal/messages`** — gated behind `protectClientAPI()` (authenticated client session), not actually public; my initial broad grep flagged it as a false positive (auth helper name didn't match the grep pattern).

All 4 fixes (3 forms + 1 upload): RED/GREEN-verified per route (reverted each fix, confirmed the predicted 429→200/201 regression for exactly the stated reason, restored). Also had to add a `rateLimitDb` mock to a pre-existing test (`leads/route.xss.test.ts`) that broke once the real `rateLimitDb` call landed in that file — required for the fix to land clean, not scope creep.

tsc clean both rounds. Full suite 749/749 files, 3228/3265 tests passed (37 skipped), 0 failed. One flaky test (`finance-export.test.ts`, a 5000ms timeout under full-parallel-suite load) reproduced once in the full run but passed cleanly in isolation both before and after my changes — pre-existing timing flake, not caused by this round's changes, not fixed (out of scope).

## (3) — gap/fluidity kept current

No new resolver-lane items this round (none touched). Carried-forward items from prior rounds unchanged (destination-tenant-status judgment call on `PATCH /api/admin/websites`, seo-* verify-revert/alerts/health judgment calls, backup-cron retention question, owner/admin Telegram bots status-gate question, `detect.ts` migration prepared as file awaiting approval, ComHub nav-parity, tenant self-serve domain config).

New this round, not yet fixed, flagged for the queue: none — the 3 ruled-out candidates above (`referrals/track`, `client/confirm/[token]`, `unsubscribe`) were judged correctly-scoped or lower-severity, not left as open gaps.

## Verification this round

2 commits (`05c7b8ea` fix+test, `30751fa4` fix+test). File-only, no push/deploy/DB.
