# Broad hunt — W4, 2026-07-17 18:10

Per 17:57 order item 1 (new fresh-ground surface). Closes the three
next-target candidates named in the 17:55 checkpoint: CSRF on state-changing
GET routes, SSRF via user-supplied outbound URLs beyond the already-covered
cookie/XFF sweep, and prototype-pollution-shaped Object.assign/spread-merge
on user input. File-only, no code changes this pass — genuinely clean, not
manufactured.

## 1. CSRF on state-changing GET routes

Enumerated every `GET` handler across `platform/src/app/api` (304 routes)
that performs an `.insert/.update/.upsert/.delete` in its body (34 hits).
Almost all are cron routes gated by `CRON_SECRET` bearer auth (not
cookie-authenticated, not CSRF-reachable). The user-facing subset:

- `portal/messages` GET — resets `comhub_threads.unread_count` to 0 as a
  side effect of loading the thread. Cookie-auth (`protectClientAPI`,
  `nycmaid/auth.ts`).
- `notifications` GET `?mark_read=true` — marks all admin notifications
  read. Cookie-auth (`requirePermission` → session).
- `admin/tenant-chats` GET `?tenant_id=` — marks inbound owner messages
  read. Cookie-auth (`requireAdmin`, `admin_token` cookie).
- `admin/comhub/contacts/[id]/context` GET — auto-links `comhub_contacts`
  to a matching `client`/`team_member` by phone/email as a side effect of
  loading the contact panel. Cookie-auth (`requireAdmin`).

All four are read-triggered side effects (mark-as-read, auto-link), not
money movement, privilege escalation, or data exfiltration — same severity
class as `view_count`/`unread_count`/`yinez_skills.hit_count` this session
already judged not worth fixing. Checked the actual cookie attributes
behind `requireAdmin`: the auth-matrix's real admin cookie is `admin_token`
(`admin-auth/route.ts`), `sameSite: 'lax'` — Lax blocks the classic
`<img>`/subresource CSRF vector entirely (cookie isn't attached), only a
top-level navigation (a clicked link / phishing redirect) would carry it,
and even then the payload is "mark this contact/thread read," which the
admin's own normal browsing already triggers identically. (Separately,
`auth_session`/`admin_session` in `auth/login/route.ts` is `sameSite:
'strict'`, fully immune — two parallel admin cookie schemes exist but that's
pre-existing, not a new finding.) `portal/connect` and `team-portal/connect`
GETs (also write a read-cursor) use `Authorization: Bearer` tokens, not
cookies at all — zero CSRF surface, browsers won't auto-attach a bearer
header cross-site.

Verdict: real GET-triggers-write shape confirmed, but every instance is
low-value (read-cursor/badge-count/auto-link, all things the same click that
would organically load in the UI already does) and one is already
non-cookie-authed. Consistent with this session's established bar — not
fixed. Closing as a checked bug class.

## 2. SSRF via user-supplied outbound URLs

Enumerated every `await fetch(` in `platform/src/app/api` and `platform/src/lib`
whose target isn't an inline literal (120+ call sites, narrowed to ~40
server-side ones). `lib/ssrf.ts`'s `safeFetch()`/`assertPublicUrl()` (blocks
loopback/RFC-1918/link-local/cloud-metadata, re-validates every redirect hop)
is already adopted across every genuine tenant/user-supplied-URL surface:
`onboarding-verify.ts`, `seo/remediate.ts`, `seo/technical.ts`, `seo/enrich.ts`,
`seo/health.ts`, `seo/gsc-write.ts`, `tenant-health.ts`, `site-readiness.ts`,
`site-export.ts`.

Everything else checked has a fixed, hardcoded host (Telnyx, Google APIs,
Facebook Graph, Radar, Nominatim, Vercel API, GSC) with only path segments or
query params built from variables — not SSRF (can't redirect the request to
an attacker-chosen host). Two near-misses, neither a bug:

- `postToFacebook`/`postToInstagram` (`lib/social.ts`, called from
  `social/post/route.ts`) forward a tenant-admin-supplied `photoUrl`/
  `imageUrl` to Meta's Graph API as a JSON field — Meta's servers fetch it,
  not ours. Auth-gated to `campaigns.send` permission (tenant admin only,
  not an anonymous/cross-tenant caller), and the SSRF-relevant fetch happens
  on Meta's infrastructure, not this app's trust boundary.
- `selena/tools.ts`'s `handleTriggerCron` builds a URL from a hardcoded
  `NEXT_PUBLIC_SITE_URL` base + an enum-checked cron name (11-item
  allowlist) — not attacker-controllable. Confirmed neither Selena nor Jefe
  expose a generic fetch/browse/scrape tool an AI agent (or injected
  tenant-owner text) could point at an arbitrary URL.

Verdict: no gap found. `lib/ssrf.ts` genuinely covers the live attack
surface. Closing as exhausted.

## 3. Prototype-pollution-shaped merge on user input

Grepped for `Object.assign(` (1 hit, `audit-context.ts`, internal fields
only, not user input) and any deep/recursive merge (`lodash.merge`,
`deepmerge`, hand-rolled `deepMerge`/`mergeDeep` function) anywhere in
`platform/src` — zero hits. No library or custom code in this codebase
performs a *recursive* merge of attacker JSON into a long-lived object,
which is the actual precondition for `__proto__`/`constructor.prototype`
pollution (shallow `{...body.setup_progress}`-style spreads, the only
pattern present, don't reach the prototype chain via spread/object-literal
semantics). Verdict: the bug class doesn't apply to this codebase's
architecture — closing, not a false negative.

## Sweep status

All three 17:55-checkpoint next-target candidates now closed (2 exhausted
clean, 1 found-but-judged-not-worth-fixing per established precedent).

No push/deploy/DB this pass. No code changes.
