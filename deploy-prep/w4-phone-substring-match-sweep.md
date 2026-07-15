# W4 — phone-substring-match sweep (getClientProfile + lead-capture dedupe)

Commit: `56f5df22` (p1-w4), file-only, no push/deploy/DB.

## Finding

12 sites on this branch ilike-substring-matched `clients.phone` with no real
minimum-length floor:

| File | Function/site | Prior floor |
|---|---|---|
| `src/lib/selena-legacy.ts` | `getClientProfile` | none |
| `src/lib/selena/core.ts` | `getClientProfile` | none |
| `src/app/api/chat/route.ts` | new-conversation client link | none |
| `src/app/api/yinez/route.ts` | new-conversation client link | none |
| `src/app/api/contact/route.ts` | lead-branch dedupe | truthy-only |
| `src/app/api/portal/collect/route.ts` | existing-client match | none |
| `src/app/api/client/collect/route.ts` | existing-client match | none |
| `src/app/api/lead/route.ts` | dedupe | 7-digit |
| `src/app/api/ingest/lead/route.ts` | dedupe | 7-digit |
| `src/app/site/{nyc-mobile-salon,wash-and-fold-hoboken,wash-and-fold-nyc}/_lib/selena.ts` | `createOrLinkClient` + `getClientProfile` | 7-digit / none |

All are reachable **unauthenticated** (public web-chat widgets and public
lead-capture forms). A short/garbage phone (e.g. a single digit) would
substring-match an arbitrary client in the tenant:

- `getClientProfile` sites: leaks the matched client's
  name/address/email/notes/do_not_service/booking history/memories into the
  AI chat's system-prompt context — the bot then converses as if that were
  the visitor's own data.
- Every other site: **writes** attacker-supplied name/email/address/notes
  onto the matched client's row (silent cross-client data corruption, not
  just a read), and for chat/yinez also mis-links the conversation's
  `client_id`, so downstream Selena tool writes (e.g. capture-name) land on
  the wrong client.

This is the same bug class other workers found and fixed piecemeal in
several individual routes across p1-w1/w2/w3 (client/check, client/collect,
portal/collect, ingest/lead, chat's own lookup, both Selena engines'
getClientProfile) — but those fixes live on separate branches and were not
present on p1-w4. This sweep closes every instance of the class found on
**this** branch in one pass.

## Fix

Replaced every `ilike('phone', '%...%')` match with the exact
national-number match convention already established in
`/api/client/verify-code`: normalize to digits, drop a leading US "1" via
`nat()`, and only match `cDigits.length >= 10 && cDigits === target`. Below
that floor, treat as "not found" / "new client" rather than searching.

## Verification

- `npx tsc --noEmit` clean across all 12 edited files.
- Full suite: 351/352 files, 1474 passed + 1 pre-existing expected fail
  (Fortress `status-coverage-divergence` baseline, unrelated, untouched) +
  1 skipped. 0 regressions.
- **Mutation-verified** (cp-based backup/restore against real pre-fix code
  via `git show HEAD`, not git stash) for the 3 highest-severity sites:
  - `selena-legacy.ts getClientProfile` — new `selena-legacy-get-client-profile.test.ts`
  - `selena/core.ts getClientProfile` — new `selena/get-client-profile.test.ts`
  - `api/chat/route.ts` new-conversation client link — new `chat/route.phone-match.test.ts`

  All 3 showed real RED against the actual pre-fix code (an attacker-controlled
  short/9-digit phone matched/leaked the seeded "victim" client; for chat's
  test the conversation's `client_id` was silently set to the victim's id),
  GREEN after restoring the fix. Existing test coverage on the correct-match
  path did not need mutation testing (unchanged behavior on a full match).
- Existing test suites for the remaining 9 fixed sites (`route.xss.test.ts`,
  `route.ilike-injection.test.ts` x2, `route.tenantdb.test.ts`, plus
  `yinez/route.test.ts` + `yinez/route.isolation.test.ts`) still pass — no
  new dedicated tests written for these 9; they apply the identical,
  now-proven-correct pattern as the 3 mutation-tested sites.

## Not touched

- 3 per-tenant site clones are documented "known debt" (platform/CLAUDE.md)
  for their *admin/dashboard* duplication — this fix is to their
  customer-facing chat widget backend, which is in-bounds per CLAUDE.md
  ("Customer/cleaner portals... Per-site, customer-facing only").
- Did not introduce a shared `nat()`/phone-match helper — followed the
  established per-file inline convention (matches how prior fixes of this
  same class were done elsewhere in the codebase).
