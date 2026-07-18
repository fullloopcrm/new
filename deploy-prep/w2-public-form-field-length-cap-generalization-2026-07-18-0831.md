# W2 gap/fluidity refresh — 2026-07-18 08:31

Leader's 08:16 order: fresh 3-deep queue — (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## Resolver lane — not re-swept

Confirmed dry 4 consecutive rounds (`da2244fa`, `f5ad93ff`, `fac94077`, `01f5719d`/`d19747b8`). Leader's 08:16 order explicitly says resolver lane is fully done, no need to keep checking. No resolver-lane work this round.

## (1) New fresh-ground surface — the prior round's "free-text length cap" fix was incomplete on every route it touched

`01f5719d` (8 public forms) and `d19747b8` added `maxLengthError()` to guard public-form free-text fields against request-count-vs-request-size abuse, but re-reading each of those 8 routes closely this round: **every one of them only capped a single field** (usually `message`/`notes`), while each route has *several other* optional string fields that flow into the exact same DB row and admin notification email, still completely unbounded:

| Route | Previously capped | Newly capped this round |
|---|---|---|
| `/api/apply` | `message` | `specialty, position, borough, driversLicense, instagram, experience, availability, website, portfolioUrl, resumeUrl, portfolioFileUrl, videoUrl` |
| `/api/apply-ceo` | 7 questionnaire fields | `linkedinUrl, location, currentRole, currentCompany, yearsExperience, teamSize, website, videoUrl, resumeUrl` |
| `/api/contact` | `message` | `subject, pestType, propertyType, location, urgency, address, position, experience, license, availability` |
| `/api/leads` | `message` | `industry, business_name` |
| `/api/management-applications` | `why_this_role, notes, references` | `location, current_role, years_experience, management_experience, availability_start, referral_source, position, resume_url, photo_url, video_url` |
| `/api/sales-applications` | `sales_background, warm_intros, why, notes` | `location, lane, referral_source, linkedin_url` (+ `target_segments` array, see below) |
| `/api/team-applications` | `experience, availability, notes, references` | `address, referral_source` |
| `/api/waitlist` | `notes` | `service_type, address` |
| `/api/inquiry` | `message` (inline `.slice(0, 2000)`) | `company, heardFrom` (new `maxLengthError()` import — this route never got a length-cap pass at all beyond the one inline slice) |

Each of these fields is either concatenated into a `notes`/free-text DB column (via `buildNotes()`/`buildJobNotes()`/`buildLeadNotes()`), written directly to its own DB column, or both — and echoed into the admin notification email/SMS built from the row. A single request inside every route's existing rate limit could still stuff an arbitrarily large string into any of these, same class as the fixes already landed, just not exhaustively applied to each route's full field set.

All new checks use the same `maxLengthError()` helper (default 5000 chars), positioned identically to the existing checks — after required-field validation, before any DB write.

### Also fixed — a second instance of the "unbounded caller array" class

`/api/sales-applications`' `target_segments` is a caller-supplied array (`Array.isArray(target_segments) ? target_segments : [String(target_segments)]`) with **zero validation on either the array or its entries** — same shape as the `documents/public/[token]/sign` `field_values` fix (`35669d92`) two rounds ago, just missed in that round's sweep because that sweep only grepped for `Array.isArray(body.*)` at the top-level destructure and this one destructures the array before the coercion, not directly off `body`. Capped at 50 entries / 200 chars per entry, and also closed the non-array string-coercion fallback (a giant single string would otherwise have become an unbounded one-item array, bypassing an array-only cap).

## (2) Continuation — swept every other public rate-limited form for the same incompleteness

Checked every remaining `rateLimitDb`/in-memory-rate-limited public route not already covered by the 9 above:

- **`/api/referrers` POST (signup)** — same gap. `name` is bounded via `isValidName()` (2-50 chars), but `email`/`phone`/`preferred_payout` are written straight to the `referrers` row unbounded. Fixed with the same `maxLengthError()` pattern. (`zelle_email`/`apple_cash_phone` are destructured from the body but never actually written to the insert — dead fields, not a gap, not touched.)
- **`/api/prospects`** — already fully covered by its own `cap()` helper (2000-char truncate-not-reject on every free-text field). No gap.
- **`/api/feedback`** — already caps `message` at 5000 inline, `category` is enum-validated. No gap.
- **`/api/errors`** — `message`/`stack` are caller-supplied and look uncapped in the route itself, but `trackError()` (`src/lib/error-tracking.ts`) slices `message` to 1000 and `stack` to 2000 before every DB insert downstream — already protected at the shared layer. No gap.
- **`/api/track`** — writes are query-param/analytics shaped (ip, tenant_id, action, cta_type), no free-text narrative field of this class.
- Public document-family routes (`decline`, `accept`, `consent`, `sign`) — already covered in the prior two rounds.

## (3) — gap/fluidity kept current

Carried-forward items unchanged: `PATCH /api/admin/websites` destination-tenant-status judgment call, seo-* verify-revert/alerts/health judgment calls, backup-cron retention question, owner/admin Telegram bot status-gate question, `detect.ts` migration (prepared as file, awaiting Jeff's approval), ComHub nav-parity, tenant self-serve domain config, item-33 (3 bespoke tenants' cross-contaminated static domain lists), `documents/[id]/fields` PUT's unbounded `body.fields` array (admin-authenticated, `sales.edit`-gated — lower priority, not touched).

No new carried-forward items this round — the two new gaps found (generalized field-length caps + referrers signup) were both fixed, not deferred.

## Verification this round

- `npx tsc --noEmit` clean (repo-wide), twice (once after the 9-route fix, once after the referrers fix).
- 22 new tests across 10 route test files: one rejection case per newly-covered field (9 files) + 4 sales-applications `target_segments` array cases + 4 referrers cases.
- RED/GREEN confirmed for both commits:
  - 9-route fix: reverted all 9 route diffs via `git stash` (before the block-worker-git-stash hook was tripped by a later single-file check), reran the new tests — 14 failed exactly as expected (200/201 instead of 400), restored, all pass.
  - referrers fix: `git stash` is disabled in this worktree (shared `.git` dir across worker worktrees — collision risk per the PreToolUse hook) — used `git diff > patch && git apply -R patch` instead. 2 of 4 new tests failed as expected pre-fix, all 4 pass post-fix.
- Full repo suite: 764 files, 3286/3324 tests passed (37 skipped), 1 pre-existing failure (`cron/payment-followup-daily/route.test.ts`'s CRON_SECRET auth test — same test-harness mock gap documented in the last two rounds' gap docs, `git diff --stat` against that file shows zero changes on this branch this round).

File-only, no push/deploy/DB write from this worker. 2 code commits this round (`d42fcaf7`: 9-route field-length generalization + target_segments array cap; `463d1181`: referrers continuation) + this docs commit.
