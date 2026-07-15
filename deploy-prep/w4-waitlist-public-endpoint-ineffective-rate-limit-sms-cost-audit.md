# W4 broad-hunt: `/api/waitlist` POST uses an in-memory rate limiter — ineffective on serverless, and every unthrottled hit fires a real SMS to the tenant admin

**Severity: MEDIUM-HIGH (real money — SMS spend — + admin-phone harassment vector on an unauthenticated, uncaptcha'd public endpoint).** File-only per LEADER order (broad-hunt continuation after the reassign fix is file-only); no code changed.

## Where

`platform/src/app/api/waitlist/route.ts:90-103` (`POST`, public — tenant resolved from the signed middleware header via `getTenantFromHeaders()`, no auth, called from `/book/new` when no slot fits).

```ts
const rl = new Map<string, { count: number; resetAt: number }>()
const RL_WINDOW_MS = 10 * 60 * 1000
const RL_MAX = 5
function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const e = rl.get(ip)
  if (!e || now > e.resetAt) {
    rl.set(ip, { count: 1, resetAt: now + RL_WINDOW_MS })
    return false
  }
  e.count++
  return e.count > RL_MAX
}
```

## Why this is the same bug class already fixed this session

The codebase has a purpose-built persistent limiter for exactly this reason —
`src/lib/rate-limit-db.ts`'s own docstring says it plainly:

> "Persistent rate limiter backed by the `rate_limit_events` table. **Survives
> serverless cold starts (unlike the in-memory Map in rate-limit.ts).**"

`rateLimitDb()` is already the standard for this class of public endpoint —
the sibling `src/app/api/lead-media/signed-url/route.ts` (also
`getTenantFromHeaders()`, also public, also on the booking-form path) uses it
correctly:
```ts
const rl = await rateLimitDb(`lead_media_signed:${tenant.id}:${ip}`, 60, 10 * 60 * 1000)
if (!rl.allowed) return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 })
```
This session already fixed two instances of this exact defect class per the
leader's log: "rate-limit anonymous public-upload + reviews/upload storage
abuse" and "cap anonymous email-bombing via /api/track lead notifications."
`waitlist` is a third, un-audited instance — a plain module-scope `Map` that
resets every cold start and is **not shared across concurrent serverless
instances**, so an attacker sending concurrent requests (trivial to do) never
converges on a shared counter; each new/parallel Lambda invocation gets its
own empty `Map` and its own fresh 5-request budget.

## Impact — this one has a direct money/harassment cost, unlike a pure compute-DoS

Every successful POST (i.e., every request that doesn't hit the — largely
ineffective — in-memory cap) does:
1. An insert into `waitlist` (or a fallback path if the table's missing).
2. `notify({ tenantId, type: 'waitlist', ... })` — default `channel: 'email'`
   per `src/lib/notify.ts:77`, so this can also send an email per hit.
3. **`smsAdmins(tenant.id, ...)`** — a real outbound SMS to the tenant's
   admin phone, unconditionally, on every accepted submission.

Only `name` and `phone` are required and neither is validated for realism
(no phone-format check, no CAPTCHA, no email verification) — an attacker can
script concurrent POSTs with garbage names/phones straight from the public
marketing site and: (a) rack up real SMS spend on the tenant's
Telnyx/Twilio-style account, (b) spam the tenant owner's phone with junk
alerts (denial-of-service against their actual lead flow — a real waitlist
request could get lost in the noise), and (c) fill the `waitlist` table and
admin notification feed with garbage.

## What I checked

- Confirmed via `grep` that `RL_WINDOW_MS`/`new Map<string, { count ...`
  in-memory rate-limiter pattern appears in six route files total:
  `waitlist/route.ts` (this finding), `leads/feed/route.ts` (false
  positive — that `Map` is a dedupe/aggregation structure, not a rate
  limiter), `team-applications/route.ts` and `sales-applications/route.ts`
  (explicitly commented as an accepted tradeoff — "Acceptable here since
  it's a spam defense layer, not a security boundary" — and neither
  triggers an SMS send on submission, only DB insert + in-app `notify`),
  `team-applications/upload/route.ts` (same accepted-tradeoff family, photo
  upload only, no SMS), and `client/smart-schedule/route.ts` (read-only
  slot-scoring GET, no DB write, no SMS/email — a compute-cost concern at
  worst, not a money-spend one).
- `waitlist` is the only one of the six that (a) has no documented rationale
  for accepting an in-memory limiter and (b) fires a real SMS on every hit —
  it's the standout, not a pattern shared with the accepted cases above.
- Did not check `referrers/route.ts` (also matched the grep) — out of scope
  per LEADER order (referrers excluded this pass).
- Confirmed `rateLimitDb()` signature/behavior (`src/lib/rate-limit-db.ts`)
  is a drop-in replacement already used the same way by the sibling
  `lead-media/signed-url` route on the same public booking-form surface.

## Suggested fix (not applied — file-only per lane rules)

Swap the module-scope `Map` limiter for `rateLimitDb('waitlist:<tenant>:<ip>', 5, 10 * 60 * 1000)`,
matching the `lead-media/signed-url` call shape exactly. No schema change
needed — `rate_limit_events` already exists and is shared by every other
`rateLimitDb()` caller.
