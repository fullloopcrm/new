# W2 gap/fluidity refresh — 2026-07-18 08:12

Leader's 07:54 order: fresh 3-deep queue — (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## Resolver lane — not re-swept

Confirmed dry 3 consecutive rounds (`da2244fa`, `f5ad93ff`, `fac94077`). No resolver-lane work this round; new ground found elsewhere per the established pattern of the last several rounds.

## (1) New fresh-ground surface — public-form free-text fields never length-capped

This morning's `3e6dcfd5` closed the message-length gap on `/api/chat` and `/api/yinez` (rate-limited by request COUNT, never bounded by request SIZE). Generalized the check: grepped every public, unauthenticated POST route for free-text fields, cross-referenced against which already have a length cap (`feedback` has one at 5000, `inquiry` at 2000 via `.slice()`).

Found 8 with rate limiting but zero field-size bound: `/api/apply`, `/api/apply-ceo`, `/api/management-applications`, `/api/sales-applications`, `/api/team-applications`, `/api/contact`, `/api/waitlist`, `/api/leads`. Each writes its free-text field(s) straight into a DB row and an admin notification email/SMS (`notify()`/`emailAdmins()`/`smsAdmins()`), so a single call inside the count-based rate limit bucket could still stuff an arbitrarily large string into both.

## (2) — continuation: fixed all 8 in one pass

Same fix shape as `3e6dcfd5`, but `apply-ceo` alone has 7 separate long-form questionnaire fields (not one `message`), so rather than duplicate the same 3-line check 8-14 times across files, added a small shared `maxLengthError(fields, max=5000)` helper to `src/lib/validate.ts` (already the project's home for this kind of field-validation utility — `pick()`/`omit()` live there for the same reason) and called it once per route with the field(s) that actually needed it:

- `apply`: `message`
- `apply-ceo`: `marketplaceBackground`, `otherPlatforms`, `plExperience`, `biggestScale`, `whySweatEquity`, `plan306090`, `anythingElse`
- `management-applications`: `why_this_role`, `notes`, `references`
- `sales-applications`: `sales_background`, `warm_intros`, `why`, `notes`
- `team-applications`: `experience`, `availability`, `notes`, `references`
- `contact`: `message`
- `waitlist`: `notes`
- `leads`: `message`

Every check runs before any DB write or notify call, same ordering as `3e6dcfd5`. Fields that are short/structured (URLs, phone, location, enum-like selects) were left uncapped — only genuine paragraph-style free text got the guard, matching the precedent (`feedback`/`chat`/`yinez` only capped their one prose field, not every field on the form).

`inquiry/route.ts` was re-confirmed already capped (`message.length` sliced to 2000) — not touched.

## (3) — gap/fluidity kept current

Carried-forward items unchanged: `PATCH /api/admin/websites` destination-tenant-status judgment call, seo-* verify-revert/alerts/health judgment calls, backup-cron retention question, owner/admin Telegram bot status-gate question, `detect.ts` migration (prepared as file, awaiting Jeff's approval), ComHub nav-parity, tenant self-serve domain config, item-33 (3 bespoke tenants' cross-contaminated static domain lists).

New this round: none left open — all 8 identified routes were fixed, not deferred.

## Verification this round

1 commit (`01f5719d`, fix+test, 17 files: 8 routes + 8 new test files + `validate.ts`). `npx tsc --noEmit` clean. Full suite: 761 files, 3261/3299 tests passed (37 skipped), 1 pre-existing failure (`cron/payment-followup-daily/route.test.ts` — a test-harness mock gap, `.not()` not implemented on that file's fake `supabaseAdmin.from().select()` chain) confirmed unrelated: `git diff --stat` against that file and its test shows zero changes on this branch, this round or any prior one. File-only, no push/deploy/DB.
