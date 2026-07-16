# Broad-hunt — W4, 2026-07-16 07:16 order

File-only, no push/deploy/DB.

## Approach this pass

Given how exhaustively RBAC/IDOR/tenant-scoping/CSV/webhook surfaces have
already been swept across ~90+ prior W4 passes, cross-referenced
`route-auth-matrix.md` against the live route tree for anything genuinely
undocumented, then pivoted to the codebase's established
unvalidated-URL-storage bug class (already fixed 6+ times this session:
management-applications, apply-ceo, sales-applications, team_members
photo/avatar, admin notes, onboarding-profile) and grepped for remaining
`*_url` fields written from a request body with no scheme check.

Also checked, clean, no code changed:
- `team-portal/crew/{earnings,members,schedule}` — scope is entirely
  server-derived from the verified portal token via `scopedMemberIds()`
  (worker→self, lead→shared-crew peers, manager→all); zero caller-supplied
  ID ever reaches the scope computation, so there's no IDOR surface to
  begin with.
- `finance/bank-connect/session` (Stripe Financial Connections) and
  `finance/bank-transactions/[id]/match` — tenant resolved via
  `requirePermission`, every FK target (invoice/booking/expense) re-fetched
  with `.eq('tenant_id', tenantId)` before use; no cross-tenant match
  possible.
- `admin/google/reply` — reviewId scoped to tenant's own `location_name` +
  OAuth token; DB update scoped `.eq('tenant_id', tenantId)`.
- `documents/[id]/{fields,signers,signers/[signerId],duplicate,void,send}`
  — all already defend the caller-supplied `signer_id` FK-doesn't-imply-
  tenant-scope trap with explicit ownership checks (visible in the code's
  own comments, committed back in `d9dc03fc`); nothing new here.
- `deals/*` and `quotes/*` full RBAC gap flagged in
  `w4-hr-pin-exposure-and-deals-quotes-rbac-gap-audit.md` — re-verified
  fixed (`requirePermission('sales.view'|'sales.edit')` present on every
  handler incl. `stage`, `activities`, `send`, `convert`,
  `convert-to-job`), and the `team_members.pin` leak from the same report
  is also fixed (multiple commits: `8291be5b`, `052a3f21`, `e5d39092`,
  `52e5a3fc`, `eeaf7286`, `866f49c2`). Neither finding from that report is
  still open.

## Fixed this pass

`POST`/`PATCH /api/dashboard/hr/[id]/documents` stored `file_url` verbatim
from the request body (gated on `team.edit` — owner/admin/manager-tier
internal role, not public) with zero scheme validation, same shape as every
other instance of this bug class. Traced the render side
(`dashboard/hr/[id]/page.tsx`): `file_url` is typed on `DocRow` but never
actually rendered as a link anywhere in the UI today — no upload endpoint
in the codebase writes this field either, confirming it's a genuine
free-text field, not a signed-URL-only slot. Not live-exploitable currently
(no sink), but matches this codebase's own established precedent of fixing
this class defense-in-depth even pre-sink (see `c221f634`,
`7f2d8d38`'s stated rationale). Added a same-pattern `isHttpUrl()` check
(`^https?:\/\//i`) to both handlers, rejecting non-http(s) values with 400
rather than silently dropping them (this route already 400s on other
invalid-enum inputs, so matching that existing convention here rather than
the silent-drop convention used in `onboarding-profile`, which is optional-
field-heavy).

`npx tsc --noEmit`: clean except the one pre-existing, unrelated
`bookings/broadcast/route.xss.test.ts:52` mock-typing failure — confirmed
present on `HEAD` via `git stash`/`git stash pop` before committing this
change.

No dedicated test file added (matches convention of the other same-class
URL-validation-only fixes this session — `c221f634`, `7f2d8d38`,
`110cf2be` — none added tests either; this field currently has zero
render sink so there's no behavior regression risk to guard against).

## Result

One low-severity defense-in-depth gap found and closed (internal-role-only,
no live render sink), consistent with an established codebase pattern.
Broader sweep this pass (crew-portal scoping, bank-connect/match FK
handling, Google review reply, e-sign document family, deals/quotes RBAC)
found nothing new. File-only, no push/deploy/DB.
