# W1 — apply-ceo applicant-confirmation XSS-via-email fix (2026-07-17 16:52)

Fresh-ground surface per 16:47's queue item 1 (repeats 16:16/16:33's "new fresh-ground
surface" boilerplate — same stale-FIFO pattern flagged all session; the actual
standing order is the latest LEADER->W1 timestamp). Picked the docs/ai/admin-chat/
apply/test-emails cluster — zero prior audit trail this session on this branch
(confirmed via `git log --oneline main..HEAD | grep -iE "docs route|ai route|
admin-chat|apply\\b|test-emails"`, all 0 hits before this pass).

## Fixed

**`POST /api/apply-ceo`'s applicant-confirmation email interpolated caller-supplied
`name` raw into HTML, sent to a caller-supplied `email` with zero ownership check.**

Public, unauthenticated founding-CEO application form (tenant resolved from host).
When a tenant opts into `selena_config.lead_confirmation_enabled`, the route built:

```
<h2 ...>Thanks for applying, ${name.split(' ')[0]}!</h2>
```

with `name` taken straight from the request body, no escaping — and sent that HTML
to `body.email`, also caller-supplied, never verified to belong to the same person
submitting the form. An attacker can POST `name=<script>...</script>,
email=victim@example.com` and land raw, unescaped HTML in an arbitrary third
party's inbox — same STORED-XSS-VIA-EMAIL class already closed on this branch for
`/api/leads`, `/api/contact`, `/api/inquiry`, and (this session, commit `327ea8f4`)
`documents/public/[token]/sign`, `admin/requests/[id]/agreement`, etc.

The sibling `/api/contact` route already escapes the identical
`name.split(' ')[0]` greeting pattern (`escapeHtml(name.split(' ')[0])`,
`src/app/api/contact/route.ts:210`) — `apply-ceo` was the one outlier that never
got the same treatment. `/api/apply` (the non-CEO team-application sibling) has no
equivalent bug: it only calls `notify()`, whose HTML-building path was already
escaped in the `327ea8f4` sweep.

Fixed with the existing shared `escapeHtml()` util (`src/lib/escape-html.ts`),
matching `/api/contact`'s exact convention. Left `tenant.name` (used twice in the
same template) unescaped — it's DB-resolved from the host header, not
request-body-controlled, same standing convention as every other template in the
codebase (including `/api/contact`, which doesn't escape `tenant.name` either).

1 new test (`route.xss.test.ts`), mutation-verified via `git apply -R` on the
source fix alone (not stash — shared `.git` dir across all 4 worktrees, stash
collisions have happened this session): failed for the right reason pre-fix (raw
`<script>...</script>` present verbatim in the email HTML sent to `sendEmail`),
GREEN after reapplying. Payload deliberately space-free
(`<script>alert(document.cookie)</script>`) since the route greets by
`name.split(' ')[0]` — a payload with a leading space would only test the first
token, not the full string.

Commit: (pending — see LEADER-CHANNEL for hash).

## Continued surface — swept clean

Rest of the docs/ai/admin-chat/apply/test-emails cluster, all clean, no bug found:

- `/api/docs` — static config metadata (env var *names* only, no values), gated on
  `settings.view`.
- `/api/test-emails` — sends every email template to the tenant's own `t.email`
  (DB-resolved, not caller-controlled), gated on `settings.edit`.
- `/api/admin-chat` — already has the FK-injection guard for caller-supplied
  `sessionId` (verifies `sms_conversations.tenant_id` match before reuse, same
  class as this session's `/api/yinez`/`/api/sms` fixes), `ownerPhone` is
  server-derived not request-body input.
- `/api/ai/assistant`, `/api/ai/chat` — both `requirePermission()`-gated
  dashboard-only tools, no email/HTML-template surface.
- `/api/apply` — no confirmation-email path (only `notify()`, already escaped).
- `/api/apply/signed-url` — rate-limited, tenant-scoped signed-upload path,
  mime/type allow-listed, filename extension sanitized — matches the established
  convention already audited elsewhere this session.

## tenant_domains schema lane

Reconfirmed intact, no drift: 043/055/056/059/068/069 all present, still deferred
by design (Phase-1 landed, Phase-2 consumption deferred per 15:22's accepted-by-
design close-out).

## Verification

- `git apply -R` RED-confirmed the fix on the source diff alone.
- `tsc --noEmit`: clean (same 2 pre-existing baseline errors — admin-auth route
  type quirk + untracked `sunnyside-clean-nyc/_lib/site-nav.ts`, both unrelated).
- `eslint` on both touched files: 1 pre-existing-convention warning
  (`'_args' is defined but never used'` in the test file's `sendEmail` mock —
  identical warning already present in `leads/route.xss.test.ts`, the file this
  test's mock pattern was copied from; not a new warning class).
- Full suite: 579/579 files, 3146/3147 tests (1 pre-existing expected-fail), was
  578/578, 3145/3146 — +1 new test, 0 regressions.
- File-only, no push/deploy/DB.
