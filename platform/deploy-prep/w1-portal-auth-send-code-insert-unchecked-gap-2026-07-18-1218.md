# portal/auth send_code's portal_auth_codes insert was never checked — a failed write still reported "sent: true" (2026-07-18 12:18)

## Bug
Continuation of the single-use-code CAS surface fixed earlier this round
(`w1-single-use-auth-code-toctou-race-gap-2026-07-18-1213.md`): while closing
that gap, `POST /api/portal/auth`'s `send_code` action turned out to have a
second, unrelated defect in the same handful of lines —

```ts
await supabaseAdmin.from('portal_auth_codes').insert({ phone, code, ... })
// falls straight through to send SMS/email and return {sent: true}
```

The insert's `error` was never destructured or checked. A failed insert
(RLS denial, transient DB error, anything) still fell through unconditionally
to send the SMS/email and return `{sent: true}` — the client is told a code
was sent, but nothing was ever persisted server-side. The follow-up
`verify_code` call then always 400s with "Code expired or not found," with
zero signal to anyone that the real cause was a silent insert failure, not
an expired/wrong code. Same false-success-on-unchecked-write shape fixed
repeatedly this session (Yinez SMS assistant, document duplicate, referrer
ledger, closeout-summary) — this insert sits one screen away from the
`used=false` CAS bug fixed in the same file this same round and was never
swept.

Sibling check: `pin-reset`'s own `send_code` (`member_pin_reset_codes`
insert) already checks its insert result correctly (`isUndefinedTable` +
generic `ins.error` → 503/500). `client/send-code`'s `verification_codes`
upsert also already checks `dbError`. portal/auth's insert was the only
unchecked one of the three send-side writes.

## Fix (file-only, no push/deploy/DB)
`src/app/api/portal/auth/route.ts` — the insert now destructures `error`;
on failure, logs and returns `500 "Could not send code. Try again."` before
ever calling `sendSMS`/`sendEmail`, instead of sending a code nobody can
redeem.

## Test coverage
New `route.send-code-insert-error.test.ts` — forces the insert to resolve
with an error via a thin wrapper around the fake table, asserts the route
fails closed (500, no SMS/email dispatched) instead of reporting `sent:
true`. RED-confirmed via `git apply -R` (failed 200 instead of 500 against
pre-fix code, SMS mock still called), GREEN after. Positive-control test
(genuinely successful insert) confirms no regression on the working path.

## Verification
- `portal/auth/`: 5 test files, 15 tests, all green.
- `npx tsc --noEmit` clean vs session baseline (same 4 pre-existing
  unrelated errors elsewhere, untouched).
- `npx eslint` on touched files: 0 errors, 0 warnings.
