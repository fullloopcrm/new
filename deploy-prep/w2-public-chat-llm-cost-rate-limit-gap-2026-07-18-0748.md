# W2 gap/fluidity refresh — 2026-07-18 07:48

Leader's 07:33 order: fresh 3-deep queue — (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1) New fresh-ground surface — public web-chat endpoints never rate-limited, real LLM spend per message

Resolver lane checked first (per standing ownership) — swept `tenant-lookup.ts`, `tenant.ts`'s `getTenantByDomain`/`getTenantBySlug`, `domains.ts`, `tenant-site.ts`, `seo/ingest.ts`'s `linkTenant`, and the custom-domain branch in `middleware.ts` (including the hardcoded `STATIC_TENANT_MAP` cross-check). All already reconciled to tenant_domains-first/tenants.domain-fallback with the TRANSITION divergence guard from prior rounds — zero new findings, resolver lane confirmed dry a third time.

Picked up last round's still-open thread (public endpoint rate-limiting) instead. Found two the prior sweep missed — both worse in kind than any prior finding in this class, because the cost isn't DB writes or SMS, it's a real per-message **Anthropic API call**:

- **`POST /api/chat`** — public web-chat widget embedded on every tenant site. Tenant is scoped only by the middleware-signed header (no login), so any visitor to any tenant's site can hit it. Every message calls `askSelena`/`askYinez` (`lib/selena-legacy.ts` / `lib/selena/agent.ts`), which invokes `anthropic.messages.create` against **the tenant's own Anthropic key when set** (`resolveAnthropic(tenantId)`), platform key otherwise. Zero rate limit — a scripted flood of messages runs up real per-tenant LLM spend with no cap, on top of unbounded `sms_conversations`/notification writes.
- **`POST /api/yinez`** — same shape, nycmaid's dedicated Yinez chat endpoint. Same `askSelena` (agent.ts) call, same zero rate limit.

Fixed both with the same `rateLimitDb` bucket convention (`chat:${tenantId}:${ip}`, `yinez-chat:${tenantId}:${ip}`), but tuned the limit up from the 3-5/10min used on one-shot forms to **20/10min** — a legitimate multi-turn conversation is many requests by design (a real booking flow can run a dozen+ exchanges), so a form-sized limit would throttle real users. 20/10min still bounds a scripted flood to a small, bounded number of LLM calls.

## (2) Continuation — same surface, rest of the candidate list checked and ruled out

Swept every other endpoint that could plausibly trigger a real paid API call (Anthropic/Telnyx/Resend) unauthenticated:

- **`POST /api/team-applications`** (and its `/api/cleaner-applications` alias) — already rate-limited, just via an older in-memory `Map`-based limiter (3/10min/IP) predating the `rateLimitDb` convention, with its own documented rationale ("spam defense layer, not a security boundary"). Not a gap — a different, already-covered mechanism, not zero coverage. Left as-is; swapping it to `rateLimitDb` would be a convention-consistency nice-to-have, not a fix, and wasn't asked for.
- **`PUT /api/client/reschedule/[id]`** — sends client SMS + email + admin notify per call, but gated behind `protectClientAPI()` (authenticated client session), same class as the already-ruled-out `portal/messages` from last round. Not public/unauthenticated; lower severity, not fixed.
- **`GET /api/territories/options`** — public, no auth, but GET-only, `revalidate: 3600` (edge-cached), no PII, no write, no paid-API call. Not the same class.
- **`GET /api/leads/visits`**, **`GET /api/client-analytics`** — both gated behind `requirePermission()` (admin/owner auth). Not public.
- **`POST /api/unsubscribe`** — re-checked, still token-gated per last round's ruling; no change.
- Every `/api/webhooks/*` route (Telnyx, Resend, Telegram, Stripe) — signature-verified, not unauthenticated-public in the same sense; out of scope for this class.

No other public+unauthenticated+real-cost-API endpoint found. Surface closed for this round.

All 2 fixes: RED/GREEN-verified per route (reverted each fix, confirmed the predicted 429→200 regression for exactly the stated reason on new dedicated `route.rate-limit.test.ts` files, restored). tsc clean. Full suite 751/751 files, 3231/3269 tests passed (37 skipped), 1 flaky timeout (`finance-export.test.ts`, 5000ms cap under concurrent multi-worktree test-run CPU load — reproduced once in the full run, passed cleanly in isolation; pre-existing timing flake, not caused by this round's changes, not fixed — out of scope, same flake class noted in the prior round's doc).

## (3) — gap/fluidity kept current

Resolver lane: dry a third consecutive round (see above) — no new tenant_domains/tenants.domain findings. Carried-forward judgment calls from prior rounds unchanged and still open (destination-tenant-status question on `PATCH /api/admin/websites`, seo-* verify-revert/alerts/health judgment calls, backup-cron retention question, owner/admin Telegram bot status-gate question, `detect.ts` migration prepared as a file awaiting approval, ComHub nav-parity, tenant self-serve domain config).

New this round, not yet fixed, flagged for the queue: none — the ruled-out candidates above (`team-applications`, `client/reschedule`, `territories/options`, `leads/visits`, `client-analytics`, `unsubscribe`, webhooks) were judged correctly-scoped, already-covered, or out of class, not left as open gaps.

## Verification this round

1 commit (`6475d923` fix+test, both routes). File-only, no push/deploy/DB.
