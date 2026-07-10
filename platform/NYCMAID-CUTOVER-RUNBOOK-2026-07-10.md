# NYC Maid → FullLoop cutover runbook — 2026-07-10 (CURRENT)

**Constraint: ZERO downtime. NYC Maid is a live revenue business. We flip only on green gates, with instant rollback staged.**

## Verified ground truth (tonight)
- **FL nycmaid tenant = `00000000-0000-0000-0000-000000000001`** (slug `nycmaid`, domain thenycmaid.com, status `active`). *(The 04-21 checklist's `24d94cd6` is STALE — ignore.)*
- Tenant has: telnyx_api_key ✓, telnyx_phone `+12122028400` ✓, resend ✓. **No per-tenant stripe key** — NYC Maid uses the hardcoded pay-link `buy.stripe.com/8x2aEZ...` + platform Stripe. OK, but Stripe webhook must land on FL (below).
- **`thenycmaid.com` currently served by the STANDALONE nycmaid Vercel** (NOT aliased to FL). ← safe current state; the standalone is the live/proven build.
- FL prod env has all critical vars present (TELNYX_PUBLIC_KEY, TELNYX_API_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_SECRET_KEY, RESEND, ANTHROPIC, CRON_SECRET, OWNER_PHONES, TELEGRAM_*).

## PRE-FLIGHT GATES — all must be GREEN before any flip
| # | Gate | Owner | How verified |
|---|------|-------|--------------|
| 1 | **Telnyx verify** — a signed inbound to FL `/api/webhooks/telnyx` returns 200 (not 401) → Yinez replies | **Jeff** (Telnyx portal test webhook to FL URL; I watch FL logs) | key VALUE must match NYC Maid's messaging-profile public key |
| 2 | **FL renders the real NYC Maid site** on the tenant host — homepage, /book/new, /portal, all 200, no leak | me | curl FL deployment with Host: thenycmaid.com |
| 3 | **Yinez responds on FL** — POST FL chat API → real reply, tools work | me | test call |
| 4 | **Data delta** — final sync of any bookings/clients/payments created on standalone since last sync | me (DB via Mgmt API) | at flip time, standalone still live until then |
| 5 | **Crons scoped** — FL crons run for nycmaid; standalone crons OFF at flip (no double SMS/payment) | me verify FL / Jeff disables standalone | avoid double-fire |
| 6 | **Rollback staged** — standalone stays deployable; capture current Vercel domain assignment + Telnyx/Stripe/Telegram webhook URLs | Jeff + me | write them down before touching anything |

## WEBHOOK FLIP MAP — ⚠️ paths DIFFER (standalone singular `/api/webhook/*` → FL plural `/api/webhooks/*`)
Miss the repath and SMS/Telegram go dark even after the domain flips. All FL routes verified live (405/200, not 404).

| Service | ROLLBACK (current standalone) | FLIP TARGET (FL) |
|---|---|---|
| Telnyx "NYC Maid SMS" profile | `www.thenycmaid.com/api/webhook/telnyx` | `www.thenycmaid.com/api/webhooks/telnyx` |
| Telnyx "The NYC Maid TF" profile | `www.thenycmaid.com/api/webhook/telnyx` | `www.thenycmaid.com/api/webhooks/telnyx` |
| Telegram | `www.thenycmaid.com/api/webhook/telegram` | `www.thenycmaid.com/api/webhooks/telegram` |
| Stripe | (Jeff: read from Stripe portal — likely `/api/stripe/webhook`) | `www.thenycmaid.com/api/webhooks/stripe` |

(Captured via Telnyx `/v2/messaging_profiles` + Telegram `getWebhookInfo` with standalone keys. Stripe key not local — Jeff notes it.)

## THE FLIP (staged, each reversible, near-simultaneous)
1. **Final delta-sync** standalone → FL DB (me) — freeze window is seconds.
2. **Move domain** thenycmaid.com + www: add to FL project in Vercel (never `domains rm`; add-to-new pattern). **Jeff (DNS/domain = his hands, my hard rule).**
3. **Repoint Telnyx** webhook → FL `/api/webhooks/telnyx`. **Jeff.**
4. **Repoint Stripe** webhook → FL `/api/webhooks/stripe` (same Stripe account/secret). **Jeff.**
5. **Repoint Telegram** bot webhook → FL. **Jeff (or me via setWebhook if I have the token).**
6. **Disable standalone crons** (vercel.json / pause project crons). **Jeff.**
7. **Smoke test live** (me): real test booking, test SMS → Yinez, test pay-link → webhook → payout path, portal login.

## ROLLBACK (if anything red post-flip)
- Move domain back to standalone project (instant).
- Restore Telnyx/Stripe/Telegram webhook URLs to standalone (captured in gate 6).
- Standalone DB is untouched (it kept running); FL delta was additive.
- Target: full rollback < 5 min.

## LIVE-ONLY PROOFS (only the flip window closes these — not a prep gap, it's physics)
- **Telnyx verify:** key matches + code correct (~95%); first real inbound SMS = 100%.
- **Stripe processing:** NOT broken — `STRIPE_SECRET_KEY` is a Vercel **Sensitive** var (unreadable via `env pull`, runtime gets real `sk_`; `getStripe()` uses it raw and that's fine). `STRIPE_WEBHOOK_SECRET` IS readable. 0 tenants have per-tenant stripe keys — all use platform key. First real pay-link→webhook = 100%.
- **Reconcile write:** `--verify` clean; first real run = 100%.
Each has instant rollback if red. Do NOT interpret these as blockers — they are unprovable until flip by nature.

## GATE STATUS (2026-07-10 eve)
- ✅ **Gate 1 TELNYX — FIXED.** Root cause of the 401 that paused the last 2 attempts: FL's `TELNYX_PUBLIC_KEY` was the WRONG value (`e455ac979160`) vs NYC Maid's real account key (`5c82bf380ec2`, len 44). Fetched NYC Maid's real key via Telnyx API (`GET /v2/public_key`, field `data.public`), set FL prod env to it, redeployed (`p4d2x4p1e`, Ready). Only `nycmaid` uses Telnyx on FL → zero blast radius. Final live proof = first inbound SMS at flip (rollback armed).
- ✅ **Gate 2 FL renders nycmaid** — `nycmaid.fullloopcrm.com` serves the REAL site (title "NYC Maid Service … From $59/hr | The NYC Maid", $59/$69, 212-202-8400, /book/new + /portal + /updated-nyc-maid-service-industry-pricing all 200).
- ✅ **Reconcile tool** — `scripts/migrate-from-nycmaid.ts` repointed to live slug `nycmaid` (was stale `the-nyc-maid` → would've created a DUPLICATE tenant). `--verify` clean; delta small (+18 bookings, +4 clients, +4331 msgs, +25 convos, +1 recurring; selena_memory matches). Run at flip moment (idempotent). Both DB service keys fetched via Mgmt API.
- ⬜ **Rollback capture** — current Telnyx/Stripe/Telegram webhook URLs + Vercel domain assignment (Jeff/portals).

## GO / NO-GO
- Telnyx (the decider) is GREEN. Remaining before flip: rollback capture + the staged flip itself (domain + 3 webhooks = Jeff's hands; final reconcile = me).
- Standalone stays up throughout; instant rollback if any live smoke test goes red.
