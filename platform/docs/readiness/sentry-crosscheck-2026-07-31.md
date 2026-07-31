# Sentry/error-data cross-check — 2026-07-31

First pass under the new standing evidence-source rule in `PROCESS.md`
("Standing evidence source: live Sentry error data"). Run same session
Sentry went live in prod, by a session with no prior involvement in the
ledger's existing scores — satisfies the independent-re-check bar.

## Constraint up front

Sentry (org `full-loop-crm`, project `javascript-nextjs`) went live in prod
this session, roughly 2026-07-31 10:22am–10:44am ET. There is **no
multi-day Sentry history to query** — "pull the last 7 days of Sentry
errors" isn't possible yet; 7 days of history don't exist. Also, the only
Sentry token obtained this session (via the standard wizard login
handshake) is `org:ci`-scoped and cannot read issues back (every read
endpoint tried returned 403 — see PROCESS.md addendum for the full list).

Given both constraints, this pass queried `error_logs` instead —
`trackError()` (`src/lib/error-tracking.ts`) writes to `error_logs` and
calls `Sentry.captureException` in the same call, on every real call site
in the app, so it's the same underlying event stream, several days deeper
than Sentry currently has, minus Sentry's stack-trace grouping. This is a
one-time single-connection, ~25-row, time-scoped read, not a bulk export.

## What was checked

Pulled the 25 most recent `error_logs` rows (all of 2026-07-30 into
2026-07-31) and cross-referenced routes/messages against every checkpoint
in `ledger.json` whose `depends_on_files` covers production code.

## Findings

### 1. Recurring unresolved HIGH-severity error: notification delivery rate

`error_logs` has a recurring `severity: high` entry, `message: "System
check failed: Notifications (24h)"`, `route: cron/system-check`,
`resolved: false` on every occurrence — sampled 10 occurrences spanning
2026-07-25 through 2026-07-30, roughly daily. Source:
`src/app/api/cron/system-check/route.ts`'s "Notifications (24h)" check,
which fails when the `notifications` table's 24h sent/failed rate over the
prior 24h drops below 80%.

**This is not a direct contradiction of any existing checkpoint's specific
evidence claim** — I checked. `sec-11` and `sec-12` both cite
`src/app/api/admin/system-check/route.ts` in their `depends_on_files` (the
admin-facing *viewer* for check status), not
`src/app/api/cron/system-check/route.ts` (the cron that *runs* the check
and is the actual source of this error). Both checkpoints are scored
purely on RBAC/access-gating correctness for the admin viewer, which this
finding says nothing about either way.

**What it does reveal: a real ledger coverage gap.** No checkpoint in the
current taxonomy measures "is the notification-delivery pipeline actually
healthy" as a substantive check — only "is access to the status view
correctly gated" (sec-11/sec-12) and "does Telegram alerting reliably
surface failures" (ai-03, already scored low, 25, for unrelated reasons).
A `high`-severity, unresolved, ~week-recurring production issue currently
has zero representation in the scoring system. Recommend either a new
checkpoint (`ai-06` or similar, e.g. "notification delivery pipeline
health") or folding this explicitly into ai-03's scope with a note.

Did not pull the actual sent/failed counts behind the <80% threshold (the
per-check detail lives in a `notifications` table row, not
`error_logs.metadata`; a follow-up query for that came back empty — table
may not retain it long enough, or the `like` filter needs correcting).
Flagging as unresolved investigation, not a dead end.

### 2. Recurring client-side error, ambiguous origin (not scored against anything)

`TypeError: undefined is not an object (evaluating 'r["@context"].toLowerCase')`,
`route: client/js-error`, 3 occurrences across 2 different tenant_ids,
2026-07-30 into 2026-07-31. Stack trace (`@https://www.thenycmaid.com/hunters-point-maid-service/move-in-move-out-cleaning:3:185`,
`global code@...:3:362`) points at line 3 of the raw page response — not a
bundled/hashed app JS file, which is where genuine app-code errors show up
in this Next.js build. That shape is much more consistent with an inline
third-party script (a marketing pixel, or a browser extension's content
script scanning page JSON-LD) than with the app's own schema.org code
(`src/lib/schema.tsx`, `tenant-schema.ts`, `src/lib/seo/schema.ts`, widely
used across marketing pages) — but this pass could not confirm which,
given the minified/inline stack.

Not tied with confidence to any checkpoint. Worth a look at that specific
page's rendered JSON-LD if someone wants to rule out a real malformed
schema block, but reporting this as ambiguous rather than a confirmed
finding — per PROCESS.md, "looks right" and its inverse both require
actually checking, not asserting.

### 3. Noise, not findings

Repeated `Error: Invalid call to runtime.sendMessage(). Tab not found.`
(4 occurrences, `client/unhandled-rejection`) is a Chrome extension
messaging-API error signature, not app code — visitor-side browser
extension noise. Repeated low-severity `Failed login on
team-portal/auth`/`portal/auth`/`admin-auth` entries are expected
by-design noise (`logAuthFailure`), not lockouts, and don't contradict
`sec-10`'s rate-limiting claims.

## What held up

No checkpoint scored above the `manual_code_read` cap (50) — i.e. nothing
claiming `live_query`/`live_http_check`/`test_run`-level confidence — was
contradicted by this pass. `sec-10` through `sec-13`, `fin-07` through
`fin-09` (all `manual_code_read`, capped at their stated confidence
already) are consistent with what error_logs shows for their
`depends_on_files`. `ai-03`'s already-low score (25) is, if anything,
reinforced rather than undermined by finding #1 above.

## Recommended follow-up (not done this session — out of scope for this pass)

- Get a `project:read`/`event:read`/`org:read`-scoped Sentry token stored
  somewhere durable so a future pass can query Sentry directly instead of
  falling back to `error_logs`.
- Re-run this cross-check once Sentry has a few days of real production
  history.
- Decide whether the notification-delivery-rate gap (finding #1) becomes
  its own checkpoint or folds into `ai-03`.
