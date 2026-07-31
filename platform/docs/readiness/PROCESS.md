# Readiness Ledger — Process Rules

These govern how `ledger.json`, `taxonomy.json`, and the coverage docs in
this directory get updated. They are binding on any session (human or
agent) that touches this system, not suggestions.

## Mandatory: independent adversarial re-check

**No scoring or verification work committed to this ledger is considered
trustworthy until it has been independently re-checked by a separate
session with no prior involvement in that work.**

This is not optional and does not need to be re-requested each time it
applies. "Separate session" means a session that did not write the
checkpoint, evidence, or fix being reviewed — the same self-marking-your-
-own-homework problem code review exists to catch applies here.

Why this exists: on 2026-07-30, the session that built this readiness
system scored 7 checkpoints (`lss-01/02/03/04/06/07`, `bsr-01`) against
commits that only existed on a separate, unmerged, PR-less branch
(`fix/sales-pipeline-leaks-2026-07-30`) — the ledger claimed real,
already-verified work before it was actually present in the branch/commit
the ledger itself was committed against. Every ledger-writing script
(`validate-ledger-evidence.mjs`, `check-ledger-sync.mjs`,
`check-taxonomy-signoff.mjs`) passed cleanly the whole time — none of them
check whether cited evidence is still *true*, only whether it's
*internally consistent*. It took an independent second session, with no
stake in the original scoring, re-running the actual checks (live queries,
test runs, `git merge-base --is-ancestor` on every cited commit) to find
it. `scripts/check-commit-ancestry.mjs` (added the same day) now catches
the specific branch-mismatch failure mode mechanically, but it cannot
catch a wrong live-query result, a misread file, or a misclassified route
— only an independent human or agent re-check can.

Minimum bar for "independently re-checked":
- Spot-check a meaningful sample of checkpoints scored above the
  `manual_code_read` cap (50) by re-running their actual evidence_type
  check (re-run the test, re-hit the live DB/endpoint, re-read the file) —
  not by re-reading the evidence text and agreeing with it.
- Verify every non-null `last_verified_commit` is a real ancestor of the
  branch/commit the ledger is committed against (mechanically enforced by
  `check-commit-ancestry.mjs`, but re-confirm it actually ran and passed).
- State explicitly which checkpoints held up and which didn't. "Looks
  right" is not a re-check result.

## Known-fragile pieces (as of 2026-07-30)

- `docs/readiness/per-domain-coverage-*.json` is **hand-maintained**. No
  script in `scripts/` generates, regenerates, or validates it, and
  `compute-readiness.mjs` does not read it — it only ever produces one
  blended overall coverage number. This file was already silently
  overwritten mid-audit once with no diff surfaced anywhere. Do not treat
  its numbers as pipeline-verified until a real regeneration script exists
  and is wired into CI the way the ledger checks are.
- Route/table domain classification (`full_classification` inside that
  same file) mixes genuinely code-informed judgment (real `.from(table)`
  extraction, real doc-comment reads) with earlier heuristic/path-based
  guesses, and even the code-informed portion has a real, sampled error
  rate — it is not filename pattern-matching, but it is also not reliable
  at the individual-route level without spot-checking.

## CI gates that exist today

- `validate-ledger-evidence.mjs` — score can't exceed its evidence_type's cap.
- `check-ledger-sync.mjs` — a checkpoint's depends_on_files changing in a PR
  requires that checkpoint's ledger entry to change in the same PR.
- `check-commit-ancestry.mjs` — every cited `last_verified_commit` must be a
  real ancestor of the commit being built.
- `check-taxonomy-signoff.mjs` — taxonomy.json (what's measured, severities,
  weights) can't change without a new `approved_note`.

None of these verify that evidence is *true* — only that it's internally
consistent with its own stated rules. That gap is exactly what the
adversarial re-check rule above exists to cover.

## Standing evidence source: live Sentry error data (added 2026-07-31)

Sentry (org `full-loop-crm`, project `javascript-nextjs`) went live in prod
on 2026-07-31 — real DSN + auth token wired (previously scaffolded code with
no credentials, a functional no-op; see commit history around this date).
It dual-writes alongside `error_logs` via `src/lib/error-tracking.ts`'s
`trackError()` — same call sites, same events, two destinations.

**Rule:** for any checkpoint whose `depends_on_files` includes code that
runs in production (a route, a lib called from a route, a cron job), a
re-scoring or re-verification pass must cross-check live error data for
those files/routes before accepting or repeating the existing score:

- If Sentry (or `error_logs`, its same-pipeline sibling — see below) shows
  an **active, unresolved** error whose route/file overlaps that
  checkpoint's `depends_on_files`, the checkpoint must not be left at its
  current score silently. Either lower confidence explicitly in the
  `evidence` text (state what was found and why it changes the read), or
  re-open the checkpoint for a real fix pass. "Looks right in the code"
  does not outrank "is actively erroring in prod."
- A clean Sentry query is *supporting* evidence, not sufficient evidence on
  its own — absence of a captured error only means nothing has both (a)
  occurred and (b) gone through a code path wired to call
  `Sentry.captureException`/`captureMessage`. Silent failures (caught and
  swallowed without a `trackError`/Sentry call) are invisible to this
  check by construction. Treat a clean query as "no worse than before,"
  not as new positive evidence for a score increase.
- Evidence type for a check driven by real Sentry API queries is
  `live_query` (cap 100), same as any other live production query — it is
  not a new type, just a new source. A check that only skimmed the
  dashboard visually (no query, no reproducible command) does not meet the
  `live_query` bar; record it as `manual_code_read` instead if that's what
  actually happened.

**Known gap (2026-07-31):** the token obtained via the standard
`sentry-wizard`/`api/0/wizard/` login handshake only carries `org:ci`
scope (source-map upload / release creation) — it cannot read issues,
events, or org stats back (confirmed: every `GET` against
`/api/0/organizations/{org}/...` and `/api/0/projects/{org}/{project}/...`
read endpoints returns 403 with that token). A session that needs to query
Sentry programmatically needs a separately-issued auth token with
`project:read`/`event:read`/`org:read` scopes (Settings → Auth Tokens in
the Sentry UI) — that is not something the wizard flow or this token can
provide. Until a properly-scoped token is stored somewhere durable (not
yet done — none exists as of this addendum), a session without one falls
back to querying `error_logs` directly (same underlying events, minus
Sentry's stack-trace grouping/fingerprinting) as the practical stand-in for
this rule, and should say so explicitly rather than silently substituting
one for the other.

**Also note:** Sentry has only been live for a few hours as of this
addendum — there is no multi-day error history to mine yet. The first real
pass under this rule (same session, see ledger/commit history around
2026-07-31) necessarily used `error_logs`' longer existing history instead,
for exactly the reason above. A true Sentry-sourced pass should be re-run
once both (a) Sentry has accumulated a representative window of production
traffic (days, not hours) and (b) a read-scoped token exists.
