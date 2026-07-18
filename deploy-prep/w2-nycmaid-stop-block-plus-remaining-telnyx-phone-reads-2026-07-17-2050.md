# W2 gap/fluidity refresh — 2026-07-17 20:50

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-sms-number-carry-forward-list-closed-2026-07-17-2032.md`.

Leader's fresh 3-deep queue this round (20:35 LEADER->W2): (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1) — fresh-ground surface: `lib/nycmaid/sms.ts`'s STOP-block tenant-match

Picked up my own prior round's NOTICED-not-fixed #1: `sendSMS()`'s auto-opt-out fallback (fires when a carrier STOP-block error comes back with no `recipientId` supplied) matched the tenant that owns the sending number via `.eq('telnyx_phone', fromNum).single()` only — same shape as the `webhooks/telnyx` bug fixed earlier tonight, just narrower (nycmaid's single-tenant legacy SMS module, rare carrier-error path). An sms_number-only tenant's STOP block never flipped `sms_consent` off, so every retry produced a fresh failure notification instead of the intended one-time silence; `.single()` also meant a mis-seeded duplicate number would error the lookup and no-op the whole opt-out. Fixed with the same `.or('telnyx_phone.eq.<num>,sms_number.eq.<num>')` (sanitized) + `limit(2)` pattern already used in `webhooks/telnyx`. 3 new tests incl. a wrong-tenant probe. Commit `282a0dee` (part of a 4-fix batch, see below).

## (2) — continuing that surface: repo-wide re-sweep for raw `telnyx_phone` reads turned up 3 more real gaps, all committed

Grepped every remaining `telnyx_phone` reference not already routed through the resolver. Most were confirmed as one of the two already-triaged out-of-scope classes (editable-column UI/API allowlists, dead selects) — but 3 were genuine bugs this sweep hadn't reached yet:

- **`email/monitor/route.ts`** — the IMAP-parsed Zelle/Venmo "thank you" client SMS gated directly on `tenant.telnyx_api_key && tenant.telnyx_phone` (the route never even selected `sms_number`). An sms_number-only tenant's payment-confirmation text was silently skipped. Converted to `resolveTenantSmsCredentials()`.
- **`admin/system-check/route.ts`** and **`admin/sms/route.ts`** (GET) — both derived SMS "configured"/phone status via raw `telnyx_phone`-only checks, so sms_number-only tenants showed up as **"not configured"** in the platform-admin diagnostics page and the admin SMS management dashboard, despite SMS actually working. Same false-diagnostic class already fixed on the `cron/system-check`/`cron/health-check` twins earlier tonight — those two crons were converted, these two admin-facing surfaces weren't yet. Converted both to `hasTenantSms()`/`resolveTenantSmsCredentials()`.
- **`dashboard/sms/page.tsx`** — the tenant's OWN SMS inbox page reads `GET /api/settings` (already returns the full raw tenant row, `sms_number` included) but only checked `d.tenant?.telnyx_phone` client-side, so an sms_number-only tenant's own dashboard showed a **false "Not configured" badge and no phone number** on their own SMS integration. This is the observable-status counterpart to the editable-form pages the 20:32 doc correctly left alone — that doc's own reasoning ("converting these would change nothing observable") is exactly why this one, which *is* observable, was worth fixing. One-line client-side `telnyx_phone || sms_number` fallback, no server change needed.

4 commits total this round: `282a0dee` (nycmaid/sms.ts + email/monitor + admin/system-check + admin/sms, one batch — same fix shape, same verification pass) and `b58c6432` (dashboard/sms/page.tsx, separate commit since it's UI-only and has no server-side counterpart).

**Verification:**
- 3 new test files (`sms.stop-block-tenant-match.test.ts`, `route.sms-number-tenant-match.test.ts` ×2 for email/monitor and admin/sms) — each covers the precedence fix plus a wrong-tenant probe, since each is genuinely new/changed query or derivation logic, not a pure call-site swap.
- `admin/system-check/route.ts` — pure call-site swap onto the already-tested `hasTenantSms()`, no dedicated test, same no-new-per-caller-test precedent established earlier this session for pure resolver conversions.
- `dashboard/sms/page.tsx` — no dedicated test; client-fetch wiring in a dashboard page directory with no existing test harness, same precedent W3 used for comparable dashboard client-wiring fixes this session.
- All 4 server-side fixes mutation-verified via `git diff > patch` + `git apply -R` (RED confirmed against pre-fix code for the exact predicted reason — sms_number-only fixture producing `configured:false`/`phone:null`/no-opt-out/no-SMS — then reapplied to GREEN).
- `npx tsc --noEmit` clean (0 new errors).
- `npx eslint` on every touched file: 0 new warnings (the two pre-existing warnings surfaced — `sms.ts:9` unrelated `any` cast, `dashboard/sms/page.tsx:204` an `<a>`-vs-`<Link>` next/next rule — are both on lines untouched by this diff).
- Full repo suite: 663/663 files, 2831/2868 tests passed (37 pre-existing skips) — 0 regressions, run twice (once after the first 3-fix batch, once after the dashboard fix).

## (3) — gap/fluidity kept current

**The raw `telnyx_phone`-without-`sms_number` read surface is now genuinely fully closed** — every remaining reference confirmed as one of the accepted out-of-scope classes below, re-verified this round (not re-litigated from memory):

- Editable-column UI forms/API allowlists (`admin/businesses/[id]/page.tsx`+`wizard`, `admin/tenants/[id]/page.tsx`, `admin/sms/page.tsx`'s PUT-backing form, `dashboard/settings/page.tsx`, `api/settings/route.ts`'s sensitive-field mask list, `api/admin/settings/route.ts`, `api/admin/businesses/[id]/route.ts`, `admin/sms/route.ts`'s `PUT`) — these read/write the raw column as the thing an admin edits, never gate a send. Confirmed again, still correctly untouched.
- Confirmed dead selects (select the column, never read it for anything send-relevant): `team-portal/15min-alert/route.ts` (flagged prior round) and **newly confirmed this round**, `bookings/[id]/team/route.ts` — its `tenant.telnyx_api_key`/`telnyx_phone` select is unused; the actual team-member SMS goes through `notifyTeamMember()` → `notify()`, which resolves its own tenant credentials internally (already resolver-aware). Only `tenant.name` and `tenant`'s truthiness are used from that query.
- `bookings/batch/route.ts` — the one caller that intentionally falls back to the platform Telnyx account, still correctly gated on the open compliance question (#7 below), untouched.
- `cron/outreach/route.ts` — re-checked, already correctly resolver-converted (has `sms_number` in its type + select, calls `resolveTenantSmsCredentials()` twice).
- `lib/comms-prefs.ts`'s `deriveCapabilities()`/`getCapabilities()` — re-checked, already correctly resolver-aware (`hasTenantSms(tenant)`).
- `lib/comhub-voice-config.ts` — voice, not SMS; a sibling resolver with its own already-correct platform-fallback shape, out of this bug class entirely.
- Type-only declarations (`lib/types.ts`, `lib/tenant.ts`, `lib/jefe/actions.ts`, `lib/onboarding-verify.ts`, `lib/comms-prefs.ts`'s interface, `lib/tenant-profile.ts`'s field-registry entry, `email/monitor/route.ts`'s `TenantRow` interface) and prose in `admin/docs/page.tsx` — not code paths, not fixable/unfixable.

## NOTICED — not fixed, flagging for the leader/Jeff

Unchanged from the 20:32 doc, still open:

1. The DELETE/reactivate gap on `tenant_domains` — still open, product-call framing unchanged.
2. `lib/tenant-schema.ts` — still confirmed dead code.
3. The compliance-gated `platformFallback` question (JEFF-MORNING-QUEUE.md, 15:17 2026-07-17) — still open, untouched.
4. `bookings/batch/route.ts`'s platform-fallback anomaly — still untouched, gated on #3.

## MISSING-FEATURE GAPS / UX-FRICTION

- Nothing new this round beyond the `dashboard/sms/page.tsx` false-badge fix above (captured under (2), not a separate item — it's the same resolver-precedence bug class, just user-visible rather than server-side).

## Remaining candidates, not yet fixed (fresh ground for a future round)

- With this sweep, the sms_number/telnyx_phone resolver-precedence bug class appears **exhaustively closed** — every read site in the codebase is now either resolver-aware, a confirmed dead select, a confirmed editable-column allowlist, or gated on the open compliance question. A future round should either point this lane at a genuinely different tenant-resolution surface (domain resolution / `tenant_domains` itself hasn't had a fresh pass in several rounds — worth re-auditing rather than assuming it's still clean) or wait on the two gated product/compliance questions (#1, #3 above).
