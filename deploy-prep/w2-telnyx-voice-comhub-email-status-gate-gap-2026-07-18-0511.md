# W2 gap/fluidity refresh — 2026-07-18 05:11

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-telegram-telnyx-webhook-status-gate-gap-2026-07-18-0500.md`.

Leader's instruction this round (04:59 LEADER->W2): fresh 3-deep queue — (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1) — new fresh-ground surface: the Telnyx voice webhook never gated on `tenantServesSite()`

**Bug found and fixed.** `src/app/api/webhooks/telnyx-voice/route.ts` is hardcoded to `NYCMAID_TENANT_ID` (single-tenant Call Control app — the file's own header comment already documents this constraint) and drives the entire inbound call lifecycle: answer → ring admin list (SIP softphones + PSTN cells) → bridge → record → transcribe, falling back to voicemail + a missed-call SMS on no-answer. It never checked that hardcoded tenant's `status` anywhere in the file. Same bug class as the Telegram/Telnyx-SMS fixes closed last round: inbound voice delivery has no dependency on the tenant's site/dashboard being reachable, so a suspended/cancelled/deleted nycmaid tenant kept ringing admins, writing `comhub_active_calls`/`comhub_messages` rows, and sending missed-call SMS indefinitely.

**Fixed:** added a `tenantServesSite()` check right after payload parsing, before any event branch runs — fetches the hardcoded tenant's `status` and returns `{ ok: true, skip: 'tenant_not_active' }` for a non-serving tenant, matching the established skip-response shape from every other status-gate fix this session. Added `route.status-gate.test.ts`: parametrized probe over all 3 non-serving statuses (confirms skip, zero `rpc` calls — no contact/thread ever created) plus all 3 serving statuses (confirms the inbound-call flow still proceeds).

## (2) — continued: same class found and fixed in the comhub-email cron, broader blast radius

Swept for other siblings in the same comhub-channel family (voice, SMS, Telegram all now fixed) and other places hardcoding `NYCMAID_TENANT_ID`. Found one more, same root cause, but **not scoped to a single tenant** — this one is genuinely multi-tenant:

**`src/app/api/cron/comhub-email/route.ts`'s `collectAccounts()`** selects *every* tenant with saved IMAP profile creds (`imap_host`/`imap_user`/`imap_pass` all non-null) with no status filter, then `pollAccount()` polls each one's mailbox, mirrors new mail into `comhub_messages`, and runs the Yinez/Selena email auto-reply against live tenant data. A suspended/cancelled/deleted tenant with IMAP creds still configured kept having its mailbox polled and auto-replied to on every cron tick, with zero dependency on the tenant's site/dashboard being reachable — same "still transacting after being cut off everywhere else" bug class, but this one affects any tenant with saved IMAP creds, not just nycmaid. The nycmaid env-var fallback path (used when nycmaid's IMAP profile fields aren't set) had the identical gap.

**Fixed:** added `status` to the per-tenant IMAP-accounts select and skip any non-serving tenant before it's pushed into the accounts list; added a separate status lookup for the nycmaid-env-fallback branch (that path doesn't come from the per-tenant query) gating it the same way. Added `route.status-gate.test.ts`: parametrized probe over all 3 non-serving statuses (mailbox excluded entirely, zero `askSelena` calls, verified alongside a co-existing active tenant that still polls normally) plus all 3 serving statuses (still polls + auto-replies), plus a dedicated case confirming the nycmaid env-fallback path is also gated.

Checked for a third instance before stopping: `telegram/route.ts` (Jeff's private owner bot) and `telegram/jefe/route.ts` (the platform GM bot) are also hardcoded off `NYCMAID_TENANT_ID` / not tenant-scoped at all, and neither checks tenant status. Not fixed — flagged below (3), same "needs Jeff's call" treatment as the ComHub `requireAdmin()` item, since these are access-controlled by an explicit chat-ID allowlist (owner/admin-only), not open inbound customer surfaces, and it's a product question whether an owner/admin should be locked out of their own management channel when their business tenant is suspended.

## (3) — gap/fluidity kept current

Carried-forward NOTICED items 1–29, 31–32, 34–35, unchanged (see prior rounds' docs, most recently restated in `w2-telegram-telnyx-webhook-status-gate-gap-2026-07-18-0500.md`).

Carried forward, still flagged not fixed (product/rollout/data calls, unchanged):
- `webhooks/stripe` never calling `activateTenant()` (HIGH SEVERITY, flagged 2026-07-18 ~02:10, in `JEFF-MORNING-QUEUE.md`).
- Item 30: ComHub `requireAdmin()` vs. nav-parity (20 route files gated Jeff-only while nav exposes ComHub to every operator; needs Jeff's rollout-gating call).
- Item 33: three bespoke-site tenants' dead, cross-tenant-contaminated `_lib/domains.ts` + `_lib/lead-filters.ts` (needs Jeff's call on delete-vs-provide-correct-data; confirmed dead/no live impact).

NEW this round:

36. Telnyx voice webhook (`webhooks/telnyx-voice/route.ts`) never gated the inbound call lifecycle (ring/bridge/record/voicemail/missed-call-SMS) on `tenantServesSite()` for its hardcoded nycmaid tenant — fixed above (1).
37. comhub-email cron (`cron/comhub-email/route.ts`) never gated per-tenant IMAP mailbox polling + Yinez auto-reply on `tenantServesSite()` — affects any tenant with saved IMAP creds, not just nycmaid — fixed above (2).
38. Owner/admin Telegram bots (`webhooks/telegram/route.ts`, `webhooks/telegram/jefe/route.ts`) are hardcoded off nycmaid / not tenant-scoped and never check tenant status, but are access-controlled by an explicit chat-ID allowlist (owner/admin-only, not an open customer surface) — flagged, not fixed; needs Jeff's call on whether an admin should be locked out of their own management channel for a suspended tenant, same treatment as item 30.

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward, unchanged: items 18–20.

## Verification this round

- `npx tsc --noEmit`: clean.
- `npx vitest run "src/app/api/webhooks/telnyx-voice"`: 2 files, 6/6 pass (all new).
- `npx vitest run "src/app/api/cron/comhub-email"`: 2 files, 11/11 pass (4 pre-existing + 7 new).
- Full repo suite: 710 files, 3058 passed, 37 skipped, 0 failed.

File-only, no push/deploy/DB write from this worker. 2 code commits this round (Telnyx-voice status-gate fix + test, comhub-email cron status-gate fix + test) + 1 docs commit.
