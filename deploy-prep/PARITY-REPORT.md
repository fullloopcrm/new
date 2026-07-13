# nycmaid → FL PARITY-REPORT

**Source (read-only, rollback net):** `~/Desktop/nycmaid` (repo `thenycmaid/nycmaid` @ `15837e3`)
**Target:** FL platform, nycmaid tenant `...001`
**Reference:** Jeff's `~/Desktop/nycmaid-cutover-CHECKLIST.md` + `nycmaid-cutover-plan-2026-07-07.md` — this report closes those docs' open items; it does not invent new scope.

Each worker appends its own lane as a `## WN — <lane>` section. Do not edit another worker's section.

---

## W6 — INTEGRATIONS/WEBHOOKS + 3 FLAGGED DRIFTS + TELNYX-401 ROOT-CAUSE

**Scope:** CHECKLIST §I (every integration/webhook row) + the 3 intentional drifts flagged in §D/§E/§L + root-causing the 2026-07-07 Telnyx 401. Code-side only — no cutover, no webhook repoint, no DNS, no deploy, no prod DB write, no writes to `~/Desktop/nycmaid`.

**Commits this session:** `webhook-verify.test.ts` — added one witness test (see §3). No route/behavior changes; the 3 flagged drifts are diff-only per instruction, and every CHECKLIST §I code gap turned out to be already closed by prior work (mainly `10546d9`, `2ed14ad5`). See §4 for exactly what that means and doesn't mean.

---

### 1. The 3 flagged drifts — exact diff, restore-vs-keep, **FLAG for Jeff, not auto-reverted**

#### 1a. Review-flow: $25 video / Zelle wording / review link

**Restore-vs-keep is narrower than the checklist implies.** The *ask* text (`smsReviewRequest` in both `src/lib/nycmaid/sms-templates.ts:65-66` (FL) and `~/Desktop/nycmaid/src/lib/sms-templates.ts:69-71` (source)) is **byte-identical** — same $10/$25 video offer, same `g.page/r/CSX9IqciUG9SEAE/review` link, same referral P.S. The drift is entirely in what happens **after** the client replies, and it's a behavioral drift, not a copy drift:

| | nycmaid (`webhook/telnyx/route.ts:759-774`) | FL (`lib/nycmaid/review-engine.ts:60-84`) |
|---|---|---|
| Video detection | `looksLikeVideo` regex on the reply text/link (`.mp4/.mov/.m4v`, youtu, tiktok, ig reel + "video"/"selfie") → `type: 'video'`, `credit: 25` | **None** — always inserts `type: 'text'`, `credit_amount: 10`, comment: `"$10 written review only ($25 video removed)"` |
| Ack SMS | `"Got it — we'll verify and Zelle you $${credit} as soon as we confirm."` | `"We've logged your review; your $10 credit will be applied."` — no Zelle mention, no video amount |
| Review link | `g.page/r/CSX9IqciUG9SEAE/review` (hardcoded) | same link (via shared `smsReviewRequest`) — **not actually different**, contrary to the checklist note |

FL's own code comment (`review-engine.ts:17-18`) says this was intentional: *"the $25 video-review option was removed per Jeff (2026-07-05)."* So this isn't drift-by-accident — it's a **prior decision that the checklist (written 2026-07-07) may not have caught up to**, OR a decision Jeff wants revisited before cutover. Either way:

- **Restore nycmaid exactly** = add back `looksLikeVideo` detection, `credit=25` for video, and the Zelle-wording ack.
- **Keep FL simpler** = client who submits a video still only gets a $10 credit and a non-Zelle ack (functionally: a promise broken — the ask text still offers $25 for video, but the fulfillment never honors it since 2026-07-05).

**Not reverted.** Whichever way Jeff decides, note the ask text and fulfillment are currently **inconsistent with each other** in FL today — the ask promises $25/video, the code never pays it. That inconsistency exists independent of which nycmaid/FL behavior Jeff picks, and is worth fixing regardless (either stop offering $25/video in the text, or start honoring it).

#### 1b. `rateOf` fallback: 79 → 69

`src/lib/messaging/sms-cleaning.ts:37-39`:
```ts
function rateOf(b: BookingLike): number {
  return b.hourly_rate || 79
}
```
nycmaid's equivalent fallback is `69` everywhere it appears: `~/Desktop/nycmaid/src/lib/sms-templates.ts:19,33`, `src/app/api/webhook/telnyx/route.ts:454,1156`, `src/lib/payment-processor.ts:56` — all `booking.hourly_rate || 69`. FL's own `payment-processor.ts:56` (checked this session) already uses `|| 69`, matching nycmaid — so the drift is isolated to this one `rateOf()` helper in `sms-cleaning.ts`, used only for the **client SMS copy**, not the money math. Only fires when `booking.hourly_rate` is null (synced/live bookings have it set — checklist §5 already noted this is non-critical for synced data). **Not reverted** — one-line fix (`79` → `69`) if Jeff wants it; flagging per lane instruction rather than applying it.

#### 1c. Email copy

Full diff: `diff ~/Desktop/nycmaid/src/lib/email-templates.ts platform/src/lib/nycmaid/email-templates.ts` (1142 vs 1138 lines). The checklist's original claims ("Time not arrival window", "different review link", "stripe pay-button removed", "$10 promo/discount rows removed") are **stale** — commit `10546d9` ("email/SMS review+pay parity to nycmaid") already closed those: the port is near-verbatim, same $10/Zelle wording in the email body ("we'll send your Zelle payment straight away" — `nycmaid/email-templates.ts:212`), same review link, same promo language. Two **real, current** drifts remain, neither previously called out:

1. **Support phone number changed platform-wide in the email templates:** every `(212) 202-8400` → `(646) 490-0130` (11 occurrences). `212-202-8400` is nycmaid's live number wired to the tenant's Telnyx account (`tenant.telnyx_phone`, checklist §B) — the one Selena/the review-engine actually reads inbound SMS on. `646-490-0130` is FL's own platform-wide "Text Support" line (same number used in `MarketingNav.tsx`, `MarketingFooter.tsx`, and every other FL site, including non-nycmaid tenants — this is FL's number, not a nycmaid-specific typo). **Functional risk, not cosmetic:** if a client follows the email's "text us at (646) 490-0130" / "reply DONE... at (646) 490-0130" instructions, that message goes to FL's generic support line, not the Telnyx number the review-engine listens on — the automated review/DONE-reply flow silently never fires. Restore = put `212-202-8400` back in the nycmaid email templates specifically (it's the number the automation actually reads); keep = leave `646-490-0130` (breaks the automated text-back flow described in the same email).
2. **`ARRIVAL_WINDOW_NOTE` dropped (3 usages removed):** nycmaid's `time-window.ts:28-29` exports `"We can't give an exact arrival time, even day-of — cleaners usually arrive within the first 30 minutes, but please plan for the full 2-hour window."`, included in the booking-confirmation and reminder emails. FL's shared `src/lib/time-window.ts` never got this string ported, so the import was dropped from `nycmaid/email-templates.ts` along with its 3 call sites (confirmation email, reminder email, another reminder variant). This is a real content loss — the disclaimer is both a client-expectations line and light legal CYA against "you said you'd be here at X."

**Not reverted** — both are diff-only per lane instruction; restoring #2 is likely uncontroversial (pure addition, no decision needed) but I did not add it because "email copy" is explicitly one of the 3 items the lane order says to flag, not fix.

---

### 2. CHECKLIST §I — every integration/webhook row

| Row | nycmaid | FL code | Verdict |
|---|---|---|---|
| Telnyx SMS | inline verify (see §3) + rating/review flow in `webhook/telnyx/route.ts` | `/api/webhooks/telnyx/route.ts` — tenant resolved by `telnyx_phone` (route.ts:112-120, dedupe-safe `limit(2)` not `.single()`), `handleNycMaidReview` ported, `isNycMaid` gate present | ✅ **MATCH** (code). Repoint itself is the outstanding item (infra, not code — out of this lane's scope) — see §3 for a code-visible reason a real repoint attempt already 401'd. |
| Telnyx Voice | wired (telnyx-voice + comhub) | `has_voice=false`, unwired | — Jeff's call per plan doc R3, explicitly "skip", not a code gap to close. |
| Resend (send) | key + domain | `tenant.resend_api_key`/`resend_domain` set, `email.ts` doesn't gate sends on stale flag (confirmed prior session) | ✅ MATCH (already closed). |
| Resend inbound | *(no equivalent in nycmaid — grepped `~/Desktop/nycmaid/src` for `email.received`/`inbound_emails`: zero hits)* | `/api/webhooks/resend/route.ts:30-45` — `email.received` → `inbound_emails` table | N/A — FL-net-new capability, nothing to port. Uses `verifySvix(..., process.env.RESEND_WEBHOOK_SECRET)` — same global-secret-vs-per-tenant-account shape as the Telnyx issue in §3, currently untested against nycmaid traffic since it's never been repointed (checklist still `⬜`). Flagging, not fixing — see §3's generalization. |
| Telegram bot | webhook → nycmaid | `/api/webhooks/telegram/[tenant]/route.ts` — loads `tenant.telegram_bot_token`/`telegram_chat_id` by slug (line 39-46), decrypts token, auth-gates on `chat_id` match (line 72-75), tenant-scoped conversation keyed `tg-${tenant.id}-${chatId}` | ✅ MATCH (code ready). URL for nycmaid would be `/api/webhooks/telegram/nycmaid` — matches checklist's expected target exactly. |
| Stripe pay link | `buy.stripe.com/8x2aEZ…` | `tenant.payment_link` — already noted ✅ in checklist | ✅ MATCH (no code change; already closed). |
| Stripe webhook | nycmaid's own Stripe account | `/api/webhooks/stripe/route.ts` — tenant resolved via `session.metadata?.tenant_id` **or**, when absent (nycmaid's payment link predates FL and carries no metadata), via `client_reference_id` → booking → `booking.tenant_id` (route.ts:58-68, comment explicitly says `"Static pay-link path (NYC Maid parity)"`) | ✅ MATCH (code ready — tenant-resolution fallback for exactly nycmaid's link shape already exists and is intentional). The outstanding blocker is infra (register the endpoint in nycmaid's Stripe dashboard + the secret value) **plus** the same global-secret pattern flagged in §3 — flagging, not fixing. |
| Anthropic (Selena) | env key | `tenant.anthropic_api_key` set | ✅ MATCH (already closed). |
| Google reviews | n/a in nycmaid (no equivalent file) | `lib/google-reviews.ts` — OAuth-based Google Business Profile sync/auto-reply, keyed by `getValidAccessToken(tenantId)`, not a hardcoded link | N/A for code diff — FL-net-new; nycmaid has no comparable feature to port. The checklist's "verify review LINK matches" concern is really "is the correct Google Business location OAuth-connected for this tenant" — a **data/connection** check, not something a code diff can answer. Flagging as unresolved-by-code, needs a live OAuth/connection check outside this lane. |

---

### 3. Root-cause: 2026-07-07 Telnyx 401 (CODE-SIDE ONLY — no prod/webhook changes made)

**What actually happened, per the checklist's own live-state log:** webhook repointed to FL, FL received 0 `sms_logs`, request rejected at `verifyTelnyx()` with 401 before any logging.

**Step 1 — is FL's crypto correct?** Verified `src/lib/webhook-verify.ts:77-115` (`verifyTelnyx`) byte-for-byte against Telnyx's own official Ruby SDK reference implementation (`team-telnyx/telnyx-ruby`, `lib/telnyx/lib/webhook_verification.rb`, fetched live via `gh api` this session):

| | Telnyx official SDK | FL `verifyTelnyx()` |
|---|---|---|
| Signed payload | `"#{timestamp_header}|#{payload}"` | `` `${timestamp}\|${rawBody}` `` |
| Public key decode | base64 → must be 32 raw bytes | `Buffer.from(publicKey, 'base64')` |
| SPKI DER wrap | `30 2a 30 05 06 03 2b 65 70 03 21 00` + raw key | `0x30,0x2a,0x30,0x05,0x06,0x03,0x2b,0x65,0x70,0x03,0x21,0x00` + `keyBytes` — **identical bytes** |
| Signature decode | base64 → 64 bytes | `Buffer.from(signature, 'base64')` |
| Timestamp tolerance | 300s | 300s (`FIVE_MIN_MS`) |
| Verify call | `OpenSSL::PKey.read(der_key).verify(nil, sig, signed_payload)` | `cryptoVerify(null, signedPayload, key, sigBytes)` — same primitive (raw Ed25519, no prehash) |

**Conclusion: FL's signed-payload construction and DER-wrapping are provably correct, not the bug.** This also rules out "rawBody bytes mismatch" as a *code* defect — the route reads `await request.text()` before any JSON parsing (`telnyx/route.ts:15-19`), which is the correct order to preserve exact bytes; there's no middleware in `src/middleware.ts` that touches the request body (it only reads `req.nextUrl`/`req.headers` for tenant-routing rewrites) and the route declares no `edge` runtime, so Vercel serves it as a standard Node function with no body-transform layer in between.

**Also worth noting: nycmaid never had working code to "diff" here.** `~/Desktop/nycmaid/src/app/api/webhook/telnyx/route.ts:21-29` only checks that the signature/timestamp *headers are present* and the timestamp isn't stale — it **never verifies the Ed25519 signature against the public key at all**. So "port nycmaid's exact behavior" doesn't apply to this row: nycmaid's real behavior is *no cryptographic check*, which is why it never 401'd — not because its verification is more correct, but because it doesn't verify. FL's `verifyTelnyx()` is a genuine net-new security improvement with no prior production traffic to validate it against, which is exactly why the first real attempt surfaced a problem nycmaid's code could never have surfaced.

**Step 2 — what's actually wrong, then.** The public key is per-**Telnyx-account** (Telnyx support docs, confirmed via WebSearch this session: "The public key is available to you in the Mission Control Portal under account settings... Keys & Credentials"). FL reads it from **one global env var**: `process.env.TELNYX_PUBLIC_KEY` (`telnyx/route.ts:19`, also used identically in `telnyx-voice/route.ts:390`). But `tenant.telnyx_api_key` and `tenant.telnyx_phone` are **per-tenant columns** (`telnyx/route.ts:114`) — the whole comms-config model (checklist §B) is built around each tenant potentially running its **own separate Telnyx account** (nycmaid's `+12122028400` number/account predates FL and was never migrated into a shared platform account). A single global `TELNYX_PUBLIC_KEY` cannot simultaneously verify signatures from N different Telnyx accounts' private keys. The checklist's own log ("TELNYX_PUBLIC_KEY set... from `/v2/public_key` data.public = `ZmBznW…wFUM=`") shows this was set to *some* account's key manually — if it was fetched using anything other than nycmaid's own `tenant.telnyx_api_key` (e.g. the platform's default/other-tenant Telnyx credential, or a copy-paste/whitespace error going into the Vercel env UI — a common gotcha), every genuinely-valid, unmodified, correctly-timed request from nycmaid's real account will 401, indistinguishable from a forged one. **This exact mechanism is now proven, not just theorized** — see the new witness test below.

**The same shape of bug is latent in two other webhooks, both currently untested against nycmaid traffic:**
- Resend inbound: `verifySvix(..., process.env.RESEND_WEBHOOK_SECRET)` (global) vs `tenant.resend_api_key` (per-tenant) — same asymmetry.
- Stripe webhook: `process.env.STRIPE_WEBHOOK_SECRET` (global, `stripe/route.ts:31`) is explicitly meant for FL's Connect model (one platform Stripe account, N connected sub-accounts share one signing secret — that's normal and correct for Connect). nycmaid is **not** a Connect sub-account; it's a foreign/standalone Stripe account with its own payment link (`buy.stripe.com/8x2aEZ…`, predates FL). The checklist's own plan ("set FL `STRIPE_WEBHOOK_SECRET` to its secret") would fix nycmaid's events but is a **global overwrite** — anything else currently relying on the existing value of that one env var for its own (Connect) events would break the moment nycmaid's secret replaces it. (FL does have a *separate* `/api/webhooks/stripe-platform` + `STRIPE_PLATFORM_WEBHOOK_SECRET` for its own billing — that one's fine, uninvolved here — but the tenant/Connect endpoint nycmaid needs is the shared one.)

**Proof (added this session, code-only, zero behavior change):** `src/lib/webhook-verify.test.ts` — new test *"WITNESS: a genuinely valid signature from a DIFFERENT account (key mismatch, no tampering) still 401s"*. It signs a correctly-formed, freshly-timestamped, untampered payload with one Ed25519 keypair and verifies it against a **different** (but equally valid-looking) public key — reproducing the exact `signature mismatch` rejection the checklist observed, with no forgery involved. 10/10 tests pass (`npx vitest run src/lib/webhook-verify.test.ts`); `npx tsc --noEmit` clean.

**Proposed cause (not fixed — flagging for Jeff/leader, this is a judgment call, not a bug with one obviously-correct fix):** `TELNYX_PUBLIC_KEY` almost certainly holds the wrong Telnyx account's public key relative to nycmaid's `tenant.telnyx_api_key` account — either sourced from the wrong account when fetched, or corrupted in transcription into Vercel (trailing whitespace/newline is a common paste artifact and would silently change the base64 decode). Two remediation shapes, for Jeff to pick — **not implemented here**, since both are security-sensitive and the second touches other live tenants:
1. **Re-verify and re-paste** the exact `/v2/public_key` value using nycmaid's own `tenant.telnyx_api_key` credential, byte-for-byte, no surrounding whitespace — cheapest, but only fixes nycmaid and re-breaks if any other tenant ever needs the same global slot.
2. **Make the secret tenant-resolvable**: add a nullable per-tenant column (e.g. `telnyx_public_key`) alongside `telnyx_api_key`, have the route try the tenant-specific value first and fall back to the current global env var when absent — backward-compatible (every existing tenant keeps today's behavior until Jeff populates the column), and the same shape would apply to Resend/Stripe. This is a schema change; per standing rule I'd prepare it as a migration **file** only, never run it — did not write one without Jeff/leader sign-off since it's a real architecture decision, not a mechanical port.

---

### 4. Honest accounting — what "CLOSE ⚠️/❌" produced this session

Every CHECKLIST §I row that had an actual **code** gap relative to nycmaid was already closed by prior commits (`10546d9`, `2ed14ad5`, and the XSS-escape passes) before this session started — confirmed by diffing current FL source against the nycmaid source directly, not by trusting the checklist's dates. What remains open in §I is either (a) infra-only (webhook URL repoints, Stripe dashboard endpoint registration — explicitly out of this lane's scope), (b) one of the 3 intentionally-flagged drifts (§1, diff-only per instruction), or (c) the global-secret architecture risk in §3 (a judgment call flagged for Jeff, not a mechanical nycmaid-behavior port — there is no nycmaid behavior to port here, since nycmaid never verified signatures at all). So this session's only code change is the one additive witness test in §3 — no "port nycmaid's exact behavior" commits were needed because there was no exact behavior left un-ported in this lane's rows.
