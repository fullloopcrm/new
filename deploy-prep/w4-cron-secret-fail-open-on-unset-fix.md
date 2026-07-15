# CRON_SECRET fail-open-on-unset bug — 2 sites fixed — W4, 2026-07-15

## Finding

Continuing the broad-hunt (lower-risk surface, per 17:52 leader order), swept
every site in the codebase that authorizes a request by comparing the
`Authorization` header against the template literal
`` `Bearer ${process.env.CRON_SECRET}` ``. There are ~39 such sites.

37 of them guard the compare with `!process.env.CRON_SECRET ||` (fail closed
— matches `protectCronAPI()` in `src/lib/nycmaid/auth.ts:191-194`, which
explicitly 500s "CRON_SECRET not configured" rather than let the compare run
unset). Two did not:

- `src/app/api/admin/seo/apply/route.ts:15` — `authorize()`, the sole gate on
  applying/reverting a live SEO title/meta-description override and
  triggering `revalidatePath` on a public marketing page.
- `src/app/api/email/monitor/route.ts:47` — `authorize()`, the sole primary
  gate on the IMAP Zelle/Venmo payment-matching trigger (also accepts
  `ELCHAPO_MONITOR_KEY` via header or body as alternate auth, both of which
  were already correctly guarded).

**Why this is exploitable, not just theoretical:** if `CRON_SECRET` is ever
unset, `` `Bearer ${process.env.CRON_SECRET}` `` stringifies to the literal
`"Bearer undefined"` in JS. Any caller who knows to send
`Authorization: Bearer undefined` would pass the compare — a known, guessable
bypass string, not a secret-dependent one. Worse, unlike the other 37 sites
(which loudly 500 the instant `CRON_SECRET` is missing, immediately breaking
~40 crons and surfacing in the fortress health dashboard per
`fortress-health-coverage-audit.md`), these two routes would accept the
literal string *silently* — no loud failure to tip anyone off that the
misconfiguration exists.

`admin/seo/apply`'s `authorize()` is `bearer-match OR requireAdmin()` — the
bug let the bearer branch short-circuit past the admin-session check
entirely, not just add a redundant path. `email/monitor`'s bearer check is
one of its only auth paths with no session fallback.

Precondition is `CRON_SECRET` unset in prod, which per
`deploy-prep/env-var-inventory.md` is a documented pre-req that's supposed to
always be set — so this is a defense-in-depth gap for a misconfiguration
scenario, not an unconditional live bypass today. Fixing anyway because (a)
it's a real, verifiable deviation from the codebase's own consistent
established convention, (b) the fix is a one-line, zero-ambiguity change that
exactly matches the pattern already used at the other 37 sites, and (c) it
removes a case where misconfiguration would fail silently instead of loudly.

## Fix

Added the same `process.env.CRON_SECRET &&` truthiness guard used
everywhere else in the codebase, at both sites:

- `admin/seo/apply/route.ts`: `if (bearer && process.env.CRON_SECRET && bearer === ...)`.
- `email/monitor/route.ts`: `if (auth && process.env.CRON_SECRET && auth === ...)`.

Confirmed no other site has the unguarded pattern
(`grep -rn "=== process.env\.\|!== process.env\." src/app/api` returns
nothing outside the already-guarded `if (!expected ...)` style; grep for the
bare `` `Bearer ${process.env.` `` template across `src/app/api` + `src/lib`
enumerated all ~39 sites, all now guarded).

## Verification

- `npx tsc --noEmit` — clean, no errors.
- File-only change, no DB/deploy/push. Both routes' primary auth paths
  (admin session cookie on `admin/seo/apply`, `ELCHAPO_MONITOR_KEY` on
  `email/monitor`) are untouched and still work exactly as before — only the
  secondary Bearer-CRON_SECRET path gained the missing guard.

## Also checked this pass, clean (no changes)

- OAuth `error=` query param reflected into `NextResponse.redirect` Location
  headers (`google/callback`, `admin/google/callback`, social connect
  callbacks): CRLF injection not possible — Node's `Headers`/`fetch`
  implementation throws on invalid header characters before the redirect can
  be issued; not user-triggerable HTML context so not XSS either.
- `internal/deploy-hook`: HMAC-SHA1 signature verified with
  `timingSafeEqual` before any use — correct.
- `admin/payments/finalize-match`, `admin/selena/monitor`: internal-key /
  bearer-key gated, same non-constant-time compare pattern already flagged
  as an established low-severity convention in the 19:38 sweep — not a new
  finding.
- `seo/verify-file/[file]`: regex-anchored to `google[\w-]+\.html`, only
  echoes tokens it minted itself (DB lookup by `meta->>verify_token`) — no
  path traversal, no third-party domain-verification abuse.
- `ingest/lead`, `ingest/application`: `INGEST_SECRET` compared with
  `timingSafeEqual`, tenant resolved by slug lookup, not user-supplied ID —
  correct.
- `webhooks/telegram/[tenant]`: uses `verifyTelegramWebhook()` scoped to
  `tenant:<id>` — my initial broad grep flagged it as a false positive
  (different helper name than the grep pattern), confirmed correct on read.
- `team-portal/*` routes: use `verifyToken()` (local HMAC portal token) or
  `requirePortalPermission()` — both already-established, correct patterns;
  broad grep false-positived these too (different helper names).
- Math.random()-derived storage filenames (`uploads`, `public-upload`,
  `cleaners/upload`, `booking-notes/upload`, `team-applications/upload`,
  `team-portal/video-upload`, `admin/notes/upload`, `referrers` referral
  suffix, `referrals` referral code): non-cryptographic RNG for filename/code
  uniqueness, not used as the sole access-control secret anywhere checked —
  same class as the already-flagged, established, low-severity pattern from
  prior sweeps, not a new finding worth a one-off patch.
