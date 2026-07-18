# Gap/fluidity checkpoint — W4, 2026-07-18 01:04

Per the 00:50 LEADER order item 3. File-only, no push/deploy/DB.

## This pass

1. Fresh ground (order item 1): the SEO autopilot/override engine
   (`src/lib/seo/*`) had zero prior test coverage or security-pass attention
   on this branch (confirmed: no `*.test.ts` existed anywhere under
   `src/lib/seo/` before this pass) despite `autopilot.ts`, `competitors.ts`,
   `competitor-remediate.ts`, `technical.ts`, `enrich.ts`, `health.ts` all
   being modified as recently as 2026-07-17 12:38-12:49 — the newest code in
   the repo. A 2026-07-16 05:33 doc of mine had assessed the seomgr lane as
   "build-out exhausted," which was true for *feature* work but had never
   been read as a security-surface claim; this pass treated it as fresh
   ground on that basis and found a real bug.
2. Found + fixed (order item 1 continued into item 2, same root cause, two
   sites): `seo_overrides` is keyed by `url` alone — one active row per URL,
   `change_id` pointing at whichever `seo_changes` row applied last. Two
   independent writers can legitimately target the same url: autopilot's
   deterministic recipe (`title_meta_deterministic`, code-gated, no human)
   and the AI-drafted recipes (`title_meta` / `competitor_title_meta` from
   `remediate.ts`/`competitor-remediate.ts`, human-approved via
   `/api/admin/seo/apply`) — both scan for the same class of weak
   title/meta pages, so a collision on one url is plausible, not
   theoretical.
   - **Revert side** (`verify-revert.ts`): `runVerifyRevert()` judges
     autopilot's OLD change against live search position and, on a
     regression, called `revertOverride(url)` unconditionally. If a human
     had since approved a different, newer change on that same url, the
     stale verdict silently deactivated the human's live content based on
     data about a change it had already replaced. Fixed with an ownership
     check (`overrideStillOwnedBy`) — only reverts the live override if it's
     still the change being judged; otherwise marks the old `seo_changes`
     row `rolled_back`/`reverted_superseded` without touching the
     (someone-else's) live override.
   - **Apply side** (`autopilot.ts`): mirror-image gap. `runAutopilot()`'s
     candidates are always never-yet-applied `status:'proposed'` rows, so an
     ACTIVE override already on that url can only belong to a different,
     human-reviewed apply (a prior autopilot success flips its own row to
     `'applied'` and drops out of the query). Autopilot applied over it
     anyway with zero check — silently replacing reviewed, live copy with
     unreviewed automated content, the exact failure mode the safety gate
     exists to prevent, just approached from the write side instead of the
     read side. Fixed with `hasForeignActiveOverride()` — skips the url
     (leaves the proposal `'proposed'` for a human to see/dismiss) instead
     of overwriting.
3. Gap/fluidity checkpoint: this file.

## Verification

RED/GREEN mutation-verified independently per fix (`git diff > patch && git
apply -R patch`, reran, reapplied) — `verify-revert`: 2/3 new assertions
failed pre-fix for the exact predicted reason (live override wrongly
deactivated / wrong verdict label), 3/3 pass post-fix. `autopilot`: 2/3
failed pre-fix (autopilot applied over the human's override instead of
skipping), 3/3 pass post-fix. Both are first-ever test files for their
respective modules. `tsc --noEmit`: clean except the 2 documented
pre-existing baseline errors in `sunnyside-clean-nyc/_lib/site-nav.ts`
(untracked, unrelated, noted every checkpoint this session). Full repo
suite: 653/655 files, 2288 passed + 1 expected-fail + 1 skipped, 2 failed —
same 2 documented pre-existing failures every checkpoint this session
(`cron/tenant-health` RED-until-fixed invariant, `cron/generate-recurring`
known flaky race). Zero regressions. Commits: `8b363022` (verify-revert
fix), `d26c8e53` (autopilot fix).

## Aging items still open (re-confirmed present, not re-litigated this pass)

Unchanged from the 21:34 through 00:10 checkpoints — re-list only, no new
status. See `w4-gap-fluidity-checkpoint-2026-07-18-0010.md` for the full
list (create-tenant-from-lead atomic-claim migration, referrers atomic-bump
migrations, clients dedup unique indexes, admin/cleanup-test-bookings
name-collision, comhub_get_or_create_contact_by_email TOCTOU, post-labor.ts
entity_id design question, categorization_patterns semantics, team-portal
photo-upload unwired, comhub-email cron unread_count, CSRF-on-GET, 4 dead
clone email-templates files, nycmaid sms-templates dead exports,
post-adjustments.ts inert check, rate_limit_check_and_record atomic RPC,
inbound_emails dead storage, notify-cleaner.ts dead code, campaigns/preview
self-XSS, agreement.ts dead code, documents.status='expired' unreachable,
threads/[id] assignee_id (intentional), voice/cleanup unwired, voice/dial +
voice/control target whitelisting, 4 dead sendPushToClient exports in
site-clone `_lib/push.ts` × 3 + `nycmaid/push.ts`, notify()'s latent
`channel:'push'` no-op, comhub voice admin_phone/transfer-target
whitelisting, invoices/quotes/documents do_not_service product question,
sendPushToTeamMember/AllTeamMembers do_not_service applicability, ~50
unvetted sendSMS/sendEmail files).

## New this pass

- **Noticed, not touched:** `src/lib/seo/tenants/` (6 files:
  `nyc-tow.ts`, `nycroadsideemergencyassistance.ts`,
  `sunnyside-clean-nyc.ts`, `the-home-services-company.ts`,
  `theroadsidehelper.ts`, `we-pay-you-junk.ts`) is untracked in this
  worktree but live-referenced (`app/site/the-florida-maid/sitemap.ts`,
  `lib/seo/tenant-seo.ts`) — someone's uncommitted in-progress work, not
  mine. Left alone per the standing rule on unfamiliar state; flagging so
  it isn't lost to a worktree reset.
- `applyOverride()`'s `source` column is always hard-coded `'signal'`
  regardless of the `appliedBy` param passed in (`'admin'` vs
  `'autopilot'`) — the fixes this pass didn't need to touch it (used
  `change_id` + a fresh lookup of the owning `seo_changes.applied_by`
  instead), but it means `seo_overrides.source` is currently a dead/always-
  same-value column. Not fixed — cosmetic, no behavior depends on it today.
- Confirmed clean, not fixed further: `/api/admin/seo/apply` (the human
  approval endpoint) trusts `title`/`description` from the request body
  rather than re-reading `after_value` off the referenced `changeIds`, and
  runs no `evaluateSafety()` check of its own — by design (human review IS
  the gate for that path, matching the AI-drafted-recipes' documented
  human-gated-only status) and only reachable via `requireAdmin()`
  (FullLoop's own super-admin token) or `CRON_SECRET`, whose `admin_token`
  cookie is `sameSite:'lax'` (blocks cross-site POST, so no CSRF path). Not
  forced — matches this session's established precedent for low-value
  findings against an already-fully-trusted actor (comhub voice
  admin_phone, above).

## Next-target candidates if continuing fresh-ground hunting

- `src/lib/seo/*` had zero test coverage before this pass and is now at
  2 files / 6 tests — the rest of the engine (`recipes.ts`, `remediate.ts`,
  `competitor-remediate.ts`, `technical.ts`, `enrich.ts`, `ingest.ts`,
  `detect.ts`, `gsc-write.ts`, `health.ts`) is still unaudited for this
  same class (and others) and is the newest, least-reviewed code in the
  repo — a strong next pick if continuing this exact surface.
- The `seo_overrides.source` dead-column cleanup (above) — low priority,
  cosmetic only.
- The `~50 unvetted sendSMS/sendEmail files` item (carried forward several
  checkpoints now) remains the largest still-open volume item outside SEO.

No push/deploy/DB this pass.
