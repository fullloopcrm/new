# W4 broad hunt — 2026-07-17 17:55

Queue (17:53 LEADER order, 3-deep, file-only, no push/deploy/DB): (1) new
fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep
gap/fluidity current.

**No code changes this pass.** Two systematic sweeps, both came back clean
or already-covered — genuine review, not padding.

## Item 1 — fresh ground: routes added since the 07-12 auth matrix

`route-auth-matrix.md` (2026-07-12) exhaustively classified all 499
`/api/**/route.ts` files at the time and found 0 unexplained guard gaps.
Route count is now 505 — diffed `git log --diff-filter=A` against that
commit (`8662d83e`) to find exactly which 6 are new, then read each
directly rather than trusting any prior summary:

- `cron/hr-document-reminders/route.ts`, `dashboard/hr/requirements/route.ts`,
  `dashboard/hr/requirements/[id]/route.ts` — verified directly (not just
  cited from commit messages): the two dashboard routes are
  `requirePermission('team.view'/'team.edit')`-gated and tenant-scoped via
  `.eq('tenant_id', tenant.tenantId)` on every query; the cron route
  fail-closes on unset `CRON_SECRET`. Clean.
- `cron/seo-health/route.ts`, `cron/seo-improve/route.ts` — both fail-closed
  on unset `CRON_SECRET` via `safeEqual`, matching the
  `cron-secret-fail-open-on-unset-fix` pattern already established this
  session. Clean.
- `team-portal/photo-upload/route.ts` — re-verified the 12:21 report's
  finding is still accurate (not stale): still explicitly commented
  `PROPOSED / NOT WIRED`, companion to an unapplied migration, no frontend
  caller. Clean, nothing changed since.

All 6 clean. Auth-matrix coverage gap closed — matrix is current again as
of 505/505 routes.

## Item 2 — continue: JS-side counter-bump surface, one level deeper

The 17:50 checkpoint flagged this as spot-checked, not exhaustive. Grepped
`src/lib` (not just `app/api`) for `+ 1`-shaped writes to
count/total/balance-named fields and read every hit not already accounted
for:

- `src/lib/selena/tools.ts` `handleRecordSkillUse` — `yinez_skills.hit_count`
  read-then-write (`.update({ hit_count: (row.hit_count || 0) + 1 })`,
  targeted by PK `id`). Same *lost-update-under-concurrency* shape as
  `categorization_patterns.hit_count`, but a different bug class: the
  categorization bug was a 100%-reproducible correctness failure from a
  3-column lookup racing a 2-column unique index — this one has no
  key-mismatch, targets a real PK, and only loses an increment under actual
  concurrent hits on the *same* skill name for the *same* tenant (Selena/
  Yinez processes one conversation turn at a time; this table's only
  consumer is `order('hit_count', desc)` for skill-priority display).
  Non-monetary, cosmetic-severity, same accepted-risk class already
  established this session for `view_count`/`unread_count`. Not fixed —
  judgment call, not an oversight.
  - Soft observation, not fixed: the update's result isn't checked at all
    (no `{ error }` destructured), so a failed write is silently invisible
    — but the response `hit_count` value returned to the LLM caller is
    computed optimistically either way. Minor inaccuracy at most (Jeff's
    Telegram bot reporting a wrong-by-one usage count), not worth touching
    given the low ceiling of the whole surface.
  - `invoice.ts`/`quote.ts`'s `(count || 0) + 1` numbering, `categorize-ai.ts`'s
    `+ 1` (a tolerance-band arithmetic comparison, not a counter write at
    all), `import-staging.ts`/`selena/core.ts`'s in-memory tallies (never
    persisted) — all read/checked, all false leads.
- `referrers.total_earned` / `total_paid` (`referral-commissions/route.ts`
  POST + PUT) — re-traced both call sites directly rather than trusting the
  checkpoint's summary. Confirmed both are the exact surface already
  covered by the 19:12 (2026-07-16) report: atomic-bump RPC migrations
  proposed for both columns
  (`2026_07_16_referrer_total_earned_atomic_bump_PROPOSED.sql`,
  `2026_07_16_referrer_total_paid_atomic_bump_PROPOSED.sql`), correctly
  left unwired pending Jeff's DDL approval. Not a new finding, re-confirmed
  current.

Also spot-checked open-redirect surface (a bug class not yet named in any
report this session) while in the area: every `NextResponse.redirect()`
call site in `app/api` (`google/callback`, `admin/google/*`, `social/
connect/{facebook,instagram}/callback`, `unsubscribe`) builds its redirect
target from a fixed server-side `baseUrl` + hardcoded path; the only
user-influenced piece is an `error=` query-string value echoed back onto
that same fixed origin, never the redirect destination itself. No open
redirect anywhere in this set. Clean.

Re-read `webhooks/telegram/route.ts`, `webhooks/telegram/[tenant]/route.ts`,
and `webhooks/telnyx/route.ts` (SMS, not voice — voice was covered in the
14:45 payments/webhooks pass) end-to-end since neither had a dedicated
citation in any prior report. Both Telegram routes: HMAC-verified
(`verifyTelegramWebhook`, tenant-scoped secret on the per-tenant route),
chat-id allowlisted against the registered owner, tenant_id stamped
explicitly on every message insert. `telnyx/route.ts` (inbound SMS): already
carries this session's own fix history inline (STOP/START team-member sync,
atomic booking-confirm claim, naive-ET boundary fix, dashboard-status
blind-spot fix) — read the full 836-line file, no new gap found. Clean.

## Sweep status

**Auth-matrix surface: closed the drift, now current at 505/505.**
**JS-side counter-bump surface: now believed exhaustive** for the
`+ 1`-on-a-named-count-field shape across both `src/lib` and `app/api` —
every hit from two independent grep passes (17:45 and this one) has been
read and accounted for. Open redirect surface: swept, clean, closing as a
checked bug class. Telegram/Telnyx-SMS webhooks: read end-to-end, clean.

## Next-target candidates if continuing fresh-ground hunting

`src/lib/` still has no full file-by-file walk (360 files now, up from 259
at the last count — carried forward, still true, but the counter-bump
*pattern* within it is now believed exhausted). Untouched bug classes not
yet swept this session: CSRF on state-changing GET routes (if any exist),
SSRF via user-supplied outbound URLs outside the already-covered cookie/XFF
sweep, and prototype-pollution-shaped `Object.assign`/spread-merge patterns
on user input.

No push/deploy/DB this pass.
