# W2 gap/fluidity refresh — 2026-07-18 05:00

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-dead-cross-tenant-owned-domains-lead-filters-gap-2026-07-18-0443.md`.

Leader's instruction this round (04:52 LEADER->W2): fresh 3-deep queue — (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1) — new fresh-ground surface: the per-tenant Telegram webhook never gated on `tenantServesSite()`

**Bug found and fixed.** `src/app/api/webhooks/telegram/[tenant]/route.ts`'s `loadTenantBot()` resolves the tenant by `tenants.slug` with its own hand-rolled query — the file's own comment already flagged that it "hand-rolls its own tenants.slug lookup instead of going through the shared resolver" (for a prior case-normalization fix) — but never checked `tenantServesSite(tenant.status)`. Telegram delivery has no dependency on the tenant's site/dashboard being reachable, so a suspended/cancelled/deleted tenant's bot kept answering inbound Telegram messages and running the full Selena AI agent (with live tool calls against that tenant's data) indefinitely — the exact "still transacting after being cut off everywhere else" bug class this session has repeatedly found and closed across every other slug/host/phone-resolved entry point (PIN-login, portal/team-portal auth tokens, public site header resolver).

**Fixed:** added `status` to the `loadTenantBot()` select, gated on `tenantServesSite(tenant.status)` immediately after tenant resolution (before the bot-token check), returning `{ ok: true, skip: 'tenant_not_active' }` — consistent with the route's existing soft-no-op pattern for `unknown_tenant` / `no_bot_token`. Added `route.status-gate.test.ts`: parametrized probe over all 3 non-serving statuses (confirms skip, zero `askSelena` calls, zero `sendTelegram` calls) plus all 3 serving statuses (confirms normal processing continues).

## (2) — continued: same class found and fixed in the Telnyx inbound-SMS webhook

Swept every other webhook/route that resolves a tenant by an untrusted external identifier (phone, slug, domain) instead of going through the shared resolver, to see if the Telegram bug was an isolated miss or a pattern. Found one more, same class, higher severity:

**`src/app/api/webhooks/telnyx/route.ts`'s inbound-SMS tenant lookup** (`.or('telnyx_phone.eq.<to>,sms_number.eq.<to>')`) also never checked `tenantServesSite()`. This is the resolver behind STOP/START TCPA-consent handling, YES/CONFIRM auto-booking-confirmation, and the full Selena/Yinez AI conversation for inbound client texts (`askSelena(tenantId, 'sms', text, convo.id)`) — a suspended/cancelled/deleted tenant kept auto-confirming bookings and running live AI tool calls against that tenant's data from inbound SMS alone, with no dependency on any other part of the platform being reachable. Same root cause as (1): a resolver-twin that looks up a tenant by an external identifier without going through the shared, status-gated resolver contract.

**Fixed:** added `status` to the tenant-match select, gated on `tenantServesSite(tenant.status)` immediately after the (already-existing) "no tenant matched" check and before any of the STOP/START/confirmation/Selena logic runs — same placement precedent as every other status-gate fix this session, no special-cased carve-out for the compliance-reply paths (consistent with how this session has always treated "not serving" as fully dark, not partially dark). Added `route.status-gate.test.ts` following the existing `sms-number-tenant-match.test.ts` mock harness: parametrized probe over all 3 non-serving statuses (confirms skip, zero `sendSMS` calls) plus all 3 serving statuses (confirms STOP handling still works normally).

Checked for a third instance before stopping: the Resend inbound-email webhook (`webhooks/resend/route.ts`) also resolves a tenant from an untrusted identifier (`getTenantByDomain(domain)`), but it goes through the shared `tenant-lookup.ts` resolver (already status-aware, confirmed at `tenant-lookup.ts:131,245,330`), and only tags a `tenant_id` column for later admin triage — no live agent/booking action follows from that resolution. Not the same bug class; left as-is.

## (3) — gap/fluidity kept current

Carried-forward NOTICED items 1–29, 31–32, unchanged (see prior rounds' docs, most recently restated in `w2-dead-cross-tenant-owned-domains-lead-filters-gap-2026-07-18-0443.md`).

Carried forward, still flagged not fixed (product/rollout/data calls, unchanged):
- `webhooks/stripe` never calling `activateTenant()` (HIGH SEVERITY, flagged 2026-07-18 ~02:10, in `JEFF-MORNING-QUEUE.md`).
- Item 30: ComHub `requireAdmin()` vs. nav-parity (20 route files gated Jeff-only while nav exposes ComHub to every operator; needs Jeff's rollout-gating call).
- Item 33: three bespoke-site tenants' dead, cross-tenant-contaminated `_lib/domains.ts` + `_lib/lead-filters.ts` (needs Jeff's call on delete-vs-provide-correct-data; confirmed dead/no live impact).

NEW this round:

34. Per-tenant Telegram webhook (`webhooks/telegram/[tenant]/route.ts`) never gated inbound message processing on `tenantServesSite()` — fixed above (1).
35. Telnyx inbound-SMS webhook (`webhooks/telnyx/route.ts`) never gated STOP/START/confirmation/Selena-AI processing on `tenantServesSite()` — fixed above (2).

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward, unchanged: items 18–20.

## Verification this round

- `npx tsc --noEmit`: clean.
- `npx vitest run "src/app/api/webhooks/telegram"`: 6 files, 22/22 pass (16 pre-existing + 6 new).
- `npx vitest run "src/app/api/webhooks/telnyx"`: 6 files, 22/22 pass (16 pre-existing + 6 new).
- Full repo suite: 707 files, 3039 passed, 37 skipped, 0 failed.

File-only, no push/deploy/DB write from this worker. 2 code commits this round (Telegram status-gate fix + test, Telnyx status-gate fix + test — to follow) + 1 docs commit.
