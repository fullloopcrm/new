# Missing-RPC call-site error-handling audit (FOR-JEFF-REVIEW, docs only)

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-13
**Status:** read-only code review. No DB commands run, no code changed.

**Follows up on:** `rpc-security-definer-review.md` §5b, which established that
`comhub_get_or_create_contact_by_email` and `seo_refresh_rollup` have zero in-repo definition and are
called from 5 live (non-test) code paths, framing the open question as "is a cron job and 3 live routes
currently broken?" — resolvable only by the live `pg_proc` query in `rpc-remaining-names-live-check.sql`,
which this worker cannot run (file-only lane). **This note does not answer whether the functions exist in
prod.** It answers the next question down: *if* either function is missing or errors, what actually
happens at each call site — does it fail loud (visible, actionable) or fail silent (invisible, data-loss
risk)? That part is knowable from the code alone and had not been checked call-by-call before.

---

## Severity ranking — same failure, five very different blast radii

| # | Call site | On `.rpc()` returning an error | Visible to anyone? | Severity |
|---|---|---|---|---|
| 1 | `platform/src/lib/seo/ingest.ts:131` — `await supabaseAdmin.rpc('seo_refresh_rollup')` | **Return value not captured at all** — neither `data` nor `error` destructured. A Postgres "function does not exist" error is a normal `{data:null, error:{...}}` response from PostgREST, not a thrown exception, so this line **swallows it completely** with zero trace. | **No.** No log line, no metric, no thrown error to bubble up to the caller of `runIngest()`. | **Highest — silent, total, no counter at all.** |
| 2 | `platform/src/app/api/cron/comhub-email/route.ts:162` — `comhub_get_or_create_contact_by_email` | `cErr` is captured; on error, `skipped++; continue` — the message is dropped and only counted in a `skipped` tally. | **Only if someone reads the cron's own log/response body**, which nothing alerts on. Runs unattended per its own file comment. | **High — every inbound email silently dropped, forever, until someone notices comhub is empty.** |
| 3 | `platform/src/app/api/admin/comhub/email/backfill/route.ts:74` — same RPC, same pattern | Same `skipped++; continue`. | Slightly better than #2 — this is an **admin-triggered** backfill, so a human is at least looking at the response when they run it (skip count is in the JSON response), but nothing forces them to read it. | **Medium-high — human-triggered, but skip count is easy to ignore.** |
| 4 | `platform/src/app/api/portal/messages/route.ts:31` (inside `getClientThreadId`) — same RPC, email branch | **`error` is not destructured at all** (`const { data } = await supabaseAdmin.rpc(...)`) — same silent-swallow shape as #1. `contactId` stays `null`, function returns `{contactId: null, threadId: null}`, caller (`GET`) just renders an empty thread. | **No.** A client-portal user with only an email on file (no phone) sees an empty message thread with no error, indistinguishable from "no messages yet." | **High — customer-facing silent failure, looks like normal empty state, not a bug report anyone would file.** |
| 5 | `platform/src/app/api/admin/comhub/send/route.ts:209` — same RPC, admin-initiated send | `error` **is** checked: `if (error \|\| !data) return NextResponse.json({ error: ... }, { status: 500 })`. | **Yes.** An admin trying to email a client with no existing contact record gets an explicit 500 with the Postgres error message in the response body. | **Lowest of the 5 — the one call site that actually surfaces the failure.** |

## Why this ranking matters beyond "some error handling is inconsistent"

The two most severe cases (#1 `seo_refresh_rollup`, #4 the portal-messages email path) are not just
missing a `console.error` — the destructuring itself (`const { data } = ...` instead of
`const { data, error } = ...`) means **there is no code path left to add logging to without first fixing
the destructure**. This is a step beyond "add a log line"; it requires touching the call signature.

Ranked by who would notice first if either RPC is actually broken in prod today:
1. Nobody, ever, for `seo_refresh_rollup` (#1) — the SEO rollup would just silently stop refreshing.
2. Nobody, until a customer complains their SMS/email history looks wrong, for the cron (#2) and
   portal path (#4).
3. An admin, but only if they read the response body, for the backfill (#3).
4. An admin, immediately, only for the one send-message path (#5).

This means **4 of 5 call sites for the two functions `rpc-security-definer-review.md` already flagged as
"unauditable without a live query" would give zero operational signal if they started failing** — the
live-query ask in that doc isn't just closing a paperwork gap, it's the only way to know whether 4 silent
failure modes are active right now.

## Recommendation (not applied — file-only per lane rules)

Once the live-introspection query confirms either function's actual status:
- If both exist and work: no code change needed, this note is moot except as documentation of blast
  radius if that ever changes (e.g., a future migration accidentally drops/renames either function).
- If either is missing or erroring: the two silent-swallow call sites (#1, #4) need their destructuring
  fixed to capture `error` and log it, at minimum, before any other fix — right now a fix to the missing
  function itself would leave these two paths just as blind to the *next* failure as they are to this one.
  Not scoped/implemented here — this is a proposal for whoever picks this up after the live query, not a
  patch.

**Nothing wired, no code changed by this commit.**
