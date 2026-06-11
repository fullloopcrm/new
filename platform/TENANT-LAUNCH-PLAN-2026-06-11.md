# Tenant Launch Plan — 2026-06-11

**Goal (Jeff's strategy):** Get **all tenants EXCEPT NYC Maid** live on FullLoop first
(domains moved, each a full operating tenant) → prove the CRM is fully operational
matching the NYC Maid build → **then cut NYC Maid over LAST** (it's live revenue, so it
moves only after the platform is proven on everything else).

**First tenant / template:** The NYC Exterminator. Stand it up end-to-end, lock the
repeatable checklist, then repeat for the other 18.

---

## Current state — platform DB snapshot (pulled 2026-06-11)

21 tenant rows, all `status=active`. Site marketing content is built per tenant under
`src/app/site/<slug>/` (its own `_data`/`_components`/`_lib`). Operational config
(agent, comms, payments, domain) lives on the `tenants` DB row.

| Readiness signal | Reality across 21 tenants |
|---|---|
| `selena_config` (agent) | ✅ present on **all 21** |
| `dns_configured` / `website_published` flags | `false` on all — **unused columns, not reliable**; DNS must be checked live |
| Resend key + verified email domain | only **the-florida-maid**, **the-nyc-exterminator** |
| Telnyx phone | nycmaid `+18883164019` (888); FL maid `+12122028400` (**shared** nycmaid number) |
| Stripe account / per-tenant Anthropic key | **none** (Anthropic likely platform-level — fine) |

**Implication:** tenant rows exist with agent config, but "live" is real per-tenant work:
no phone numbers, no DNS pointed, comms creds missing on 19/21.

**The NYC Exterminator specifically:** site built; Resend + verified email domain ✅;
**no Telnyx phone**; DNS not confirmed; booking/lead/agent flows not yet verified e2e.

---

## The per-tenant "FULLY LIVE" checklist (8 gates)

A tenant is "fully a tenant" when ALL pass:

1. **Content** — `site/<slug>/_data` has real services, areas, pricing, brand (not placeholder). Homepage + service + area + pricing pages render real copy.
2. **Domain moved** — domain added to the FullLoop Vercel project; DNS at registrar points to Vercel; `https://<domain>` resolves to the tenant site (not the marketing host, not 404).
3. **Email (Resend)** — verified sending domain + key on the row; a test transactional email sends and lands.
4. **Phone (Telnyx)** — a number provisioned (or an explicit shared-number decision) with webhook → `/api/webhooks/telnyx`; inbound SMS reaches the agent; outbound sends.
5. **Payments (Stripe)** — only if the tenant takes payment online: Stripe account/Connect wired; a test booking can pay.
6. **Agent** — `selena_config` tuned (services, pricing, persona, hours) + a real test conversation (web chat AND SMS) returns correct answers.
7. **Team portal** — owner + any team members exist with PINs; `/team/login` works on the tenant domain.
8. **Smoke test** — homepage 200, booking flow creates a booking, lead capture fires, agent replies, SEO (sitemap/robots/JobPosting/OG) per-tenant correct.

---

## PHASE A — CRM platform parity with NYC Maid (do once, benefits all tenants)

From `NYCMAID-PARITY-AUDIT-2026-06-06.md`, verified 2026-06-11. Platform is ~90–95%
parity. **Phase A done 2026-06-11** (uncommitted at time of writing):

- [x] **`team/messages` cleaner UI page** — built `src/app/team/messages/page.tsx` consuming the already-ported `team-portal/messages` API; added "Office" item to the shared team-portal nav. 0 TS errors. Not yet runtime-verified (needs a live tenant + team member).
- [x] **`admin/recurring-schedules` management** — built 3 routes (`route.ts` GET/POST, `[id]/route.ts` GET/PUT/DELETE, `[id]/pause/route.ts` POST/DELETE). Tenant-scoped, ADMIN-ONLY (client SMS/email/push suppressed per Jeff). Request/response contract verified against the live `wash-and-fold-nyc`/`hoboken` admin UIs that were hitting a 404 until now. Column mapping cleaner_id→team_member_id, cleaner_pay_rate→pay_rate, cleaner_token→team_member_token. Schema verified. **No admin UI built on the dashboard side** — the wash-and-fold embedded admin consumes it; `dashboard/schedules` uses a different source.
- [x] **`find-cleaner`** — verified COVERED by `bookings/broadcast` + `admin/smart-schedule`. Not a gap; nothing built.
- [SKIP] **`admin/trigger-reminders`** — Jeff's call: skip. `cron/reminders` already covers it; manual trigger is a fan-out risk for little gain.
- [x] ~~`clients/[id]/sms`~~ — covered by `comhub/send` (accepts contact_id/phone).
- [x] ~~`cleaner-colors` lib~~ — fullloop has its own color impl in booking/calendar UIs; not a feature gap.

**Phone model decision (2026-06-11):** one Telnyx number per tenant (for Phase B/C).

## PHASE B — Stand up The NYC Exterminator (template tenant)

- [ ] Audit exterminator `site/the-nyc-exterminator/_data` for real vs placeholder content.
- [ ] Provision Telnyx number (or decide shared) + wire webhook; test inbound/outbound SMS.
- [ ] Confirm Resend domain verified end-to-end (send a real test email).
- [ ] Tune + test `selena_config` agent (web + SMS), pest-control pricing/services correct.
- [ ] Move domain: add `thenycexterminator.com` to Vercel project + point DNS; confirm it resolves to the tenant site.
- [ ] Seed owner/team member(s) + PIN; verify `/team/login`.
- [ ] Full smoke test (8 gates). Capture the exact step list as the reusable runbook.

## PHASE C — Roll out remaining 18 non-NYC-Maid tenants

Apply the locked checklist to each. Candidate order (cleaning-adjacent first, simplest sites):
the-florida-maid (already closest), sunnyside-clean-nyc, wash-and-fold-nyc,
wash-and-fold-hoboken, nyc-mobile-salon, landscaping-in-nyc, nyc-tow, we-pay-you-junk,
toll-trucks-near-me, fla-dumpster-rentals, the-home-services-company,
the-nyc-interior-designer, the-nyc-marketing-company, the-nyc-seo, consortium-nyc,
debt-service-ratio-loan, nyc-classifieds, stretch-ny, stretch-service.

(Note: some of these have standalone hosting today — wepayyoujunk, toll-trucks,
nyc-classifieds, washandfoldhoboken — those are migrations, not just DNS flips.)

## PHASE D — NYC Maid cutover (LAST)

Use existing playbook: `NYCMAID-CUTOVER-PLAN-2026-05-09.md` + `CUTOVER-CHECKLIST.md` +
`POST-CUTOVER-ACTION-PLAN.md`. Webhook flip + final data re-sync + domain move. Only
after Phases A–C are proven. NYC Maid is live revenue — no changes to its side until
Jeff says "cutover."

---

## Open decisions (need Jeff)

1. **Telnyx per tenant**: one number each, or a shared pool? (19 tenants need numbers.) Cost + provisioning differ.
2. **Which tenants actually take online payment** (need Stripe) vs lead-gen only?
3. **Persist/iterate this plan here**, or track in session todos only?
