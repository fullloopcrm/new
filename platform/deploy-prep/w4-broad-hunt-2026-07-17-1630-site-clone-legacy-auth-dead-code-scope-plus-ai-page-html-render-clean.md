# W4 broad hunt — 16:30 2026-07-17 — fresh-ground pass per 16:02 LEADER queue

## Scope

Per the 16:02 LEADER->W4 "new fresh-ground surface" order. Started from
`deploy-prep/route-auth-matrix.md`'s open Findings (1-5) to re-verify what's
still live, then expanded the already-tracked "dead-code cross-tenant auth
landmine" item from `JEFF-MORNING-QUEUE.md` (20:58 entry) since that entry
only names 2 of what turned out to be 6 affected files.

## Findings re-verified against current code

- **Finding 1** (`client/properties` `include_history` legacy-admin-session
  bypass + missing tenant filter on `property_changes`): **already fixed**.
  Current `route.ts` uses `requirePermission`/`protectClientAPI` and scopes
  the history read via `tenantDb(auth.tenantId)`. Matches the committed fix
  referenced in `w4-client-properties-legacy-admin-session-cross-tenant-idor-fix.md`.
- **Finding 2** (`/api/auth/me` still on the legacy `admin_session`/
  `getAdminUser()` system): still open, but this is the platform's own
  hardened copy (`src/lib/nycmaid/auth.ts` — uses `signWithSecret`/`safeEqual`,
  fails closed on unset `ADMIN_PASSWORD`). Live and reachable end-to-end
  (`/api/auth/login`'s PIN fallback → `admin_session` cookie → `auth/me`,
  used by 3 site AdminSidebars' `fetch('/api/auth/me')`). Not a new bug —
  same shape as the already-tracked Jeff-decision item (migrate to RBAC or
  leave as documented single-owner "god mode"). No unilateral action taken;
  consistent with the standing decision-gate.
- **Finding 4** (39 hand-rolled cron-secret checks vs 5 using
  `protectCronAPI()`): still true, LOW/consistency only, not touched.
- **Finding 5** (`/api/test/email-selena` prod-shipped test harness): checked
  current code — properly fails closed (`404` when `SELENA_TEST_TOKEN` unset,
  `safeEqual()` on the provided key). No change needed.

## Expanded scope on the tracked "dead-code auth landmine" item

`JEFF-MORNING-QUEUE.md`'s 20:58 entry flags `nycmaid/auth.ts` +
"wash-and-fold clone" as a decision-gated dead-code landmine (shared
`ADMIN_PASSWORD` secret, no tenant binding, currently unreachable). Audited
all 6 site-specific auth-lib copies under `src/app/site/*/_lib/`, not just
the 2 named:

| Site | File | Worst pattern found | Live? |
|---|---|---|---|
| nyc-mobile-salon | `_lib/auth.ts` | `createHmac('sha256', ADMIN_PASSWORD \|\| 'fallback')`, non-constant-time `!==` signature compare | **dead** — zero importers of any admin-session export |
| wash-and-fold-hoboken | `_lib/auth.ts` | same as above | **dead** — same |
| wash-and-fold-nyc | `_lib/auth.ts` | same as above | **dead** — same |
| the-nyc-interior-designer | `_lib/auth.ts` | same as above | **dead** — same |
| the-home-services-company | `_lib/admin-auth.ts` | `isAdminAuthenticated()` checks cookie value `=== "authenticated"` — a static, unsigned string, not derived from any secret at all | **dead** — only `clearAdminSession` (logout) is imported anywhere; `isAdminAuthenticated`/`verifyAdminPassword`/`setAdminSession` have zero live callers |
| the-nyc-exterminator | `_lib/admin-auth.ts` | `crypto.timingSafeEqual`-based, properly constant-time — best of the 6 | **dead** — zero importers anywhere |

Verified "dead" via `grep -rl` for every exported symbol from each file
against its own site subtree, excluding the file itself — zero hits for the
admin-session pieces in all 6. (`client_session`-shaped exports in the
wash-and-fold clones were already confirmed dead in the prior fix's report.)

**Net: no live exploit path today in any of the 6.** The worst pattern
(the-home-services-company's unsigned static-string cookie check) would be a
trivial `curl -H "Cookie: admin_session=authenticated"` full bypass if it
were ever wired to a route — it currently is not. Flagging for LEADER to
decide whether to update the JEFF-MORNING-QUEUE 20:58 entry: scope is 6 files
not 2, and the home-services-company variant is a materially worse landmine
than the HMAC-with-fallback-secret pattern the existing entry describes.
Leaving the entry itself untouched (Jeff-decision-gated, out of scope for a
file-only worker pass; JEFF-MORNING-QUEUE.md is also outside this worktree).

## Reviewed, no issue found (this pass)

- `src/app/dashboard/ai/page.tsx`'s `renderAssistantHtml()` +
  `dangerouslySetInnerHTML` (operator-facing AI assistant chat, distinct
  surface from the already-audited Selena/Yinez public chat). Escapes
  `&`/`<`/`>` **before** applying the `**bold**`/`\n` markdown-style
  transform, so attacker-influenced AI output can't reintroduce live HTML
  tags through the transform step. Correctly ordered, not a bug.

## No code changes this pass

Every route/finding checked either was already fixed, is a known
decision-gated item, or reviewed clean. File-only, no push/deploy/DB.
