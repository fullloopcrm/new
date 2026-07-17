# W4 gap/fluidity — 2026-07-17 16:50

Queue (16:20 LEADER order, 3-deep, file-only, no push/deploy/DB):
(1) new fresh-ground surface
(2) continue whichever surface (1) opens up
(3) keep gap/fluidity current

This file is (3). Full detail in
`w4-broad-hunt-2026-07-17-1645-jefe-agent-confirm-gate-fix.md`.

## This pass — 1 closed, one full surface exhausted

**Surface selection**: previous fresh-ground passes had converged almost
entirely on API routes (`src/app/api/**`) — hundreds of instances by now.
Widened the lens to `platform/src` as a whole and cross-checked directory
names against all 304 session `deploy-prep/*.md` titles. `src/lib/jefe/*`
(the platform-level "GM" AI agent — cross-tenant, Telegram-driven,
distinct from the tenant-scoped Selena agent that got its own
indirect-prompt-injection pass at 08:44) had zero prior mentions.

**CLOSED**: `askJefe()`'s tool loop let the model call a CONFIRM-GATED
tool (`notify_tenant_owner`, `rerun_cron`, `send_tenant_message`) with
`confirm=false` and then `confirm=true` back-to-back inside one incoming
Telegram message — the "wait for Jeff to say yes" rule was system-prompt
text, not code. Real risk: `read_tenant_thread` pulls tenant-owner
-authored (untrusted — anyone with dashboard login can write there) text
into the same reasoning context that decides whether to fire the outbound
tool, an indirect-prompt-injection-to-self-confirmation path. Fixed by
hard-stopping the turn (forced `tool_choice:'none'` wrap-up) the instant
any confirm-gated tool fires — a real execution now always needs a fresh
`askJefe()` call, i.e. a new Telegram message from Jeff. `138d7e5e`.

## Continuation on the same surface (item 2)

Checked the other 3 files in `src/lib/jefe/`: `health.ts` (341 lines,
platform health aggregation) confirmed fully read-only (grepped for
`.insert(`/`.update(`/`.delete(`/`.upsert(` — zero hits, matches its
stated purpose). `heartbeat.ts` (cron-only push loop, dedups against
`jefe_snapshots`, messages Jeff's own owner chat) has no user-input surface
at all — no finding. The webhook entry point
(`src/app/api/webhooks/telegram/jefe/route.ts`) was already solid before
this pass: fail-closed HMAC secret-token check + hard owner-chat-id gate
ahead of any body content reaching `askJefe`. Jefe surface is now fully
swept; the one real gap (same-turn confirm chain) is closed.

## Verification

- New `src/lib/jefe/agent.confirm-gate.test.ts` (2 tests): RED-confirmed
  via `git apply -R` on `agent.ts` only (mock simulating the same-turn
  chain attack got `notifyTenantOwner` called 4x including `confirm:true`
  — proving the gap was real) → GREEN after `git apply` restored the fix.
- `npx vitest run src/lib/jefe src/app/api/webhooks/telegram/jefe`: 1
  file/2 tests green. Full suite: 593/594 files, 2132/2135 tests, 1
  expected pre-existing fail (`cron/tenant-health/status-coverage-
  divergence.test.ts` — confirmed via `git log` it predates this session's
  diff, an intentionally-red gap-documenting test unrelated to this fix).
- `npx tsc --noEmit`: same 2 pre-existing unrelated errors as every prior
  report this session (`bookings/broadcast/route.xss.test.ts` — passes in
  isolation, a known ordering-flake; `sunnyside-clean-nyc/_lib/site-nav.ts`).

## Surfaces exhausted or near-exhausted this session (do not re-pick without a new angle)

`src/app/api/**` (hundreds of routes across every functional area),
PostgREST filter-grammar injection (fully closed + branch-audit stale-
confirmed), RLS (owned by other workers per `rls-pass*`/`rls-top10*`
docs), referrer OTP/portal auth, site-clone dead-code auth.ts (6 files,
tracked in JEFF-MORNING-QUEUE), Stripe/webhook payment-forgery class,
naive-ET-vs-UTC boundary class, `postJournalEntry`/`entity_id` threading,
Selena agent (prompt injection + booking/manage-recurring authz).

## Untouched, plausible next targets

- `src/components/**` (163 files) — spot-checked `dangerouslySetInnerHTML`
  sites (all JSON-LD, properly `<`-escaped) but not systematically walked
  for anything else (client-side-only auth assumptions, direct
  browser-side Supabase calls bypassing expected server checks).
- `src/app/site/nyc-classifieds/**` — large classifieds/forum sub-site
  (porch board, business profiles, listings, messaging). Checked this pass
  and found almost the entire interactive layer (porch, listings,
  business claims, messaging, saved-searches, account edit) calls `/api/*`
  paths that **do not exist anywhere in the repo** (confirmed via
  targeted `find`) — scaffold-only, matches the `// Stub: scaffold-only.`
  comment already in `_lib/blog-posts.ts`. Not a live exploit path (every
  call 404s) so not written up as its own doc; flagging here so a future
  pass doesn't re-discover the same dead scaffolding from scratch.
- `platform/scripts/**` — ops/admin CLI scripts, never referenced in any
  deploy-prep title this session. Not web-facing (lower priority) but
  unchecked for hardcoded credentials or unsafe input handling.
- `src/lib/` broadly (259 files) — this pass and several priors have only
  sampled it opportunistically (SSRF sweep, secret-fallback grep, `.or()`/
  `.ilike()` grep). No file-by-file walk has happened.

No push/deploy/DB. File-only.
