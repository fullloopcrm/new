# W4 broad-hunt: client portal PIN generated with Math.random() instead of CSPRNG

Date: 2026-07-15 19:14 ET
Branch: p1-w4
Commit: 039af227

## Finding

`clients.pin` is the client's login credential for the customer portal
(`/api/client/login` does `.eq('pin', pin)`; a match issues a session
cookie granting access to the client's booking history, PII, and — per
the earlier P46/getClientProfile findings — a fair amount of sensitive
account data via Selena/Yinez chat context too).

7 sites generated this PIN with `Math.floor(100000 + Math.random() * 900000)`:

- `src/lib/selena/core.ts` (3 sites: new-client-from-SMS, agent
  auto-create-client tool, pin-regeneration-on-invalid-pin)
- `src/lib/selena/tools.ts` (1 site: owner-facing add-client tool)
- `src/app/site/nyc-mobile-salon/_lib/selena.ts` (1 site, tenant clone)
- `src/app/site/wash-and-fold-hoboken/_lib/selena.ts` (1 site, tenant clone)
- `src/app/site/wash-and-fold-nyc/_lib/selena.ts` (1 site, tenant clone)

`Math.random()` is not cryptographically secure (V8 uses xorshift128+,
whose internal state is recoverable from a run of outputs). The
codebase already has the correct fix pattern in two places:
- `src/app/api/referrers/auth/request/route.ts:63` — explicit comment
  "Crypto RNG — Math.random() is predictable and unsafe for a login OTP"
- `src/lib/selena-legacy-handlers.ts:158-159` — regenerates an invalid
  PIN via `nodeCrypto.randomInt(0, 900000)`

The 7 sites above are copies of the same client-creation logic that
never got the same treatment.

## Severity

Defense-in-depth, not an open exploit: `/api/client/login` already
rate-limits fail-closed (5/10min per-IP + 100/10min per-tenant,
`src/app/api/client/login/route.ts:25-26`), so brute-forcing the
6-digit PIN space is already blocked regardless of RNG quality. This
closes the same class of gap the earlier ELCHAPO_MONITOR_KEY /
admin-PIN timing-compare fixes did — hardening a credential-generation
path that shouldn't rely on a non-cryptographic RNG even where a
second control also protects it.

## Fix

Replaced all 7 sites with `String(100000 + randomInt(0, 900000))` using
`randomInt` imported from Node's `crypto` module — matching the exact
pattern already used in `referrers/auth/request` and
`selena-legacy-handlers.ts`.

## Verification

- `npx tsc --noEmit`: clean
- Targeted: `client/login` (pin-spray-lockout, rate-limit-failclosed,
  tenantdb) + `selena-legacy-get-client-profile.test.ts` — 4 files,
  13/13 passed
- Broader: all selena/yinez suites (`admin/selena`, `api/selena`,
  `api/yinez`, `lib/selena/*`) — 16 files, 83/83 passed
- 0 regressions

## Not touched

- `admin_users` password hashing, admin PIN, referrer OTP, portal OTP —
  already on crypto RNG or bcrypt (prior passes).
- Upload-path random suffixes (`Math.random().toString(36)` in
  `uploads/route.ts`, `public-upload/route.ts`, etc.) — these are
  filename collision-avoidance, not security credentials; not in scope.

File-only, no push/deploy/DB.
