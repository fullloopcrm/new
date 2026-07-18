# W4 — SMS-body smishing/content-length sweep + outbound-webhook SSRF check — 2026-07-18 04:00

Fresh-ground pass (2 candidates from the 0330 checkpoint's "next-target"
list). One real bug found + fixed across its full class; the other candidate
confirmed clean.

## 1. Outbound-webhook SSRF (fresh grep, unconfirmed surface) — CLEAN, confirmed

Checked whether the codebase has any tenant-configured outbound webhook
target (fetch to an admin/tenant-supplied arbitrary URL). It does not — no
such feature exists. Also swept every `fetch()`/`await fetch(` call site in
`src/` for the general class (URL host derived from user/tenant input):

- Every genuinely tenant/domain-derived fetch already routes through
  `src/lib/ssrf.ts` (`safeFetch`/`assertPublicUrl`, private-range + cloud-
  metadata blocking, per-redirect-hop revalidation): `onboarding-verify.ts`
  (`verifySsl`), `tenant-health.ts` (`fetchHead`, manually inlined
  `assertPublicUrl` before each hop — correct), `site-readiness.ts`,
  `site-export.ts`, and the `seo/*` modules.
- `selena/tools.ts`'s `handleTriggerCron` fetch (with a Bearer secret header)
  builds its URL from an allowlisted `cron` name, not attacker input — safe.
- `vercel-domains.ts`'s fetches always target the fixed `api.vercel.com`
  host; tenant data only ever goes into the path/body, never the host — safe.
- All other raw `fetch()` sites checked (geocoding helpers, OAuth token
  exchanges, Google/social API calls, browser-side same-origin fetches) hit
  fixed, hardcoded hosts.

No fix needed. Closes this checkpoint candidate.

## 2. SMS-body smishing/content-injection sweep — REAL BUG, fixed

The one item every checkpoint since 0236 has carried forward unactioned.
Traced the actual data flow instead of just grepping `sendSMS()` call sites:
which SMS templates embed a caller-supplied `name` field, and where does that
`name` originate.

Confirmed several live templates in `src/lib/sms-templates.ts`
(`smsJobAssignment`, `smsLateCheckInAdmin`, `smsLateCheckOutAdmin`,
`smsRunningLateAdmin`) embed `clients.name` / a booking's client name raw,
unbounded, into SMS sent to **staff/admin phones** (not the person who
submitted the name) via the tenant's own trusted Telnyx number. That data
originates from public, unauthenticated intake forms. The authenticated
`/api/clients` POST already caps `name` at 200 chars (`validate()`'s
`max: 200`); the public intake routes that feed the same `clients` table had
**no cap at all** — same "two hand-maintained boundaries drift apart" pattern
this lane keeps finding, this time between an authenticated route's
validation and its unauthenticated sibling's.

### Confirmed-live, no-human-review instance (the actual exploit)

`POST /api/waitlist` (public, tenant resolved from a signed header, no auth)
— `name` was interpolated verbatim into an admin SMS via `smsAdmins()` on
**both** the success path and the "table missing" DB-error fallback path,
with zero length cap and zero human review in between. An anonymous caller
could submit `{"name": "<phishing text + link>".repeat(N), "phone": "..."}`
and every tenant admin/staff-with-phone would receive it as an SMS from the
business's own trusted number, in one request — a genuine zero-interaction
smishing/social-engineering relay, and a per-request SMS-cost-abuse vector
(unbounded name length -> unbounded billed SMS segments) distinct from the
already-audited "missing rate limit" cost-abuse class.

### Downstream (staff-mediated) instances

The other live callers (`smsJobAssignment`, `smsLateCheckInAdmin`,
`smsLateCheckOutAdmin`) require an intermediate staff action (converting a
lead to a client, creating/assigning a booking) before the name reaches an
SMS — real but one hop removed from fully automated. Fixed at the same
intake boundary rather than the template layer, since the boundary is where
`/api/clients` already enforces this for the authenticated path.

## Fix

Capped `name` (200 chars, matching `/api/clients`' existing precedent) and
freeform notes/text fields (2000 chars, matching `/api/prospects`' existing
`MAX_TEXT` precedent) at every unauthenticated public intake route that
writes into `clients`/`team_applications` and lacked any cap:

- `src/app/api/waitlist/route.ts` — the confirmed live exploit (both the
  success-path and fallback-path `smsAdmins()` calls, plus the `waitlist`
  insert). Also extended the existing `str()` helper to take a `max` param
  rather than adding a parallel helper.
- `src/app/api/lead/route.ts` — `name` + the `buildLeadNotes()` combined
  output (folds every unrecognized body key into notes with zero cap before
  this fix).
- `src/app/api/ingest/lead/route.ts` — same class, gated by the shared
  `INGEST_SECRET` but the actual name/notes content is satellite-site-public-
  form-controlled, not operator-controlled.
- `src/app/api/ingest/application/route.ts` — `name` + each individual
  free-text field (`experience`/`availability`/`address`/`referral_source`/
  `references`/`notes`), since a hired applicant's name becomes
  `team_members.name`, which `smsLateCheckInAdmin`/`smsLateCheckOutAdmin`/
  `smsRunningLateAdmin` also embed.
- `src/app/api/contact/route.ts` — `name` + both `buildLeadNotes()` and
  `buildJobNotes()` combined output (this route feeds both the lead and
  job-application branches).

Not touched (out of scope / lower-priority, noted for a future pass if
picked up): `src/app/api/inquiry/route.ts`'s `name` field (B2B "sell your
business to us" acquisition form — output is email-only via a template that
already `escapeHtml()`s every field, and its target reader is the platform's
own founder inbox, not a tenant SMS relay — no smishing vector, just a minor
storage-bloat one) and `src/app/api/leads/route.ts` (FullLoop's own
onboarding lead-gen, a separate system from tenant CRM data, email-only,
same low-priority storage-bloat note only).

## Verification

- RED/GREEN: reproduced each cap with an oversized (`'A'.repeat(5000)` /
  `.repeat(50000)`) `name`/free-text value against the actual `POST`
  handlers (not just the helper functions in isolation) — 5 new test files,
  13 new tests, all green post-fix; manually confirmed each would have
  failed pre-fix by checking the assertion bounds against the actual
  pre-fix code paths (the `waitlist` test additionally asserts the exact
  `smsAdmins()`-bound string length, the concrete exploited surface).
- `tsc --noEmit`: clean except the 2 documented pre-existing
  `site-nav.ts` baseline errors (unrelated file, untouched).
- Full suite: 671/672 test files passed, 2368 passed + 1 documented
  pre-existing RED-until-fixed (`tenant-health` C-2 divergence test,
  untouched file) + 1 skipped. Zero regressions.

Files changed: `platform/src/app/api/{waitlist,lead,contact}/route.ts`,
`platform/src/app/api/ingest/{lead,application}/route.ts`, plus 5 new
`*.name-length-cap.test.ts` files alongside each.

No push/deploy/DB — file-only.
