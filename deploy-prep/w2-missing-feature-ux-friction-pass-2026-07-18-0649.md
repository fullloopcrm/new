# W2 gap/fluidity refresh — 2026-07-18 06:49

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues directly from `w2-telnyx-voice-comhub-email-status-gate-gap-2026-07-18-0511.md` and the exhaustive-sweep close-out logged in the last two `docs(P1/W2)` commits.

Leader's 06:42 order: pivot per W2's own recommendation to a fresh track — (1) missing-feature/UX-friction backlog pass, new track, real gaps not just bugs. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1) Missing-feature/UX-friction pass on the resolver lane (tenant_domains / tenants.domain + their UI surfaces)

Landed on one real, verified, unclaimed finding, after ruling out three adjacent leads that turned out to already be covered — ruled out by actually checking, not assumed:

- **Admin/websites domain-management UX (add-only, no remove/reassign)** — looked broken on this branch (no DELETE handler, no action column in the admin table, and the GET response didn't even match the fields the frontend page read: `data.websites`/`data.tenants` vs. the API returning `domains`/`stats`/`tenantStats`). Before building a fix, checked sibling worker branches first (`git log p1-w1 -- <these files>`) — **already found and fixed on `p1-w1`** (commits `1b81484c`, `94deba85`; the field-shape mismatch fix's own comment confirms it was the same bug I'd independently spotted). Not yet merged into this branch, but real duplicate work avoided. No action taken here.
- **Admin onboarding checklist's manual "DNS propagated & verified" toggle** (`admin/businesses/[id]/page.tsx:500`) — looked like a bypass of the real automated DNS check (`verify-checklist/route.ts` does a genuine `dns_a`/`dns_cname_www` lookup). Confirmed this is intentional: it's a human ops checklist for the manual onboarding workflow (buy domain, point DNS by hand, check the box), a separate concept from the automated verifier. Not a gap.
- **`TENANT_DIVERGENCE` divergence-guard darkening a tenant with no operator alert** (only `console.error`, no admin_tasks/Slack/Telegram) — checked whether anything would actually catch this in production. It would: `cron/tenant-health` ("the Fortress cron... the live tenant-darkening detector") already checks that each tenant's live domain serves its own site (not the template) with no redirect loop, and Telegram-alerts the owner on failure — a divergence-caused dark tenant is exactly the failure mode this cron exists to catch. Not a gap.

**Real finding, logged to `JEFF-MORNING-QUEUE.md` (06:49 entry), not code-fixed:** tenant owners have **zero self-serve domain configuration**. `dashboard/websites/page.tsx` tells every owner to "contact your admin" — verified this is accurate, not stale copy: grepped `dashboard/settings/page.tsx` for `domain`/`domain_name` inputs and found none (only an unrelated `resend_domain` field for email sending). Notable detail: `PUT /api/settings` (the tenant's own settings route, gated on `settings.edit` only — no platform-admin check) already has a fully collision-guarded `domain` write path (normalize + `findDomainOwner` + cache-bust, added in an earlier round) that would work today if any UI ever sent it — it's currently reachable only via direct API call, same "hardened code with zero live UI caller" shape as the `isOwnedReferrer` finding logged earlier this session.

This is a product-scope decision, not a quick fix: self-serve domain config needs a DNS-instructions UI, a verification flow, and a call on whether `PUT /api/settings` should also drive Vercel's domain-attach API from the tenant's own (non-admin) session — a real abuse-surface question, not a UI-only change. Flagged, not built.

## (2) Nothing to continue — (1) landed on a judgment call, not an open code surface

The one real finding is a product decision (build self-serve or keep it admin-mediated), not a bug with a clear fix direction. Not manufacturing follow-on code work to fill this slot — same discipline as the 17-July re-audit round when (1) came back clean.

## NOTICED — none new this round

## MISSING-FEATURE GAPS / UX-FRICTION

- **NEW:** tenant self-serve domain configuration absent (see above, logged to `JEFF-MORNING-QUEUE.md` 06:49).
- Carried forward unchanged: item-33 (3 bespoke tenants' cross-contaminated static domain-ownership lists, needs ground-truth owner), the seo-* verify-revert/alerts/health judgment calls, backup-cron retention question, owner/admin Telegram bots status-gate question — all still open in `JEFF-MORNING-QUEUE.md`, none touched this round.

## Remaining candidates, not yet fixed (fresh ground for a future round)

Admin-side domain "reassign" UX (the `findDomainOwner` collision error's own promise — "remove it there first, or reassign it" — currently only resolvable by manually clearing the OTHER tenant's `domain` field on ITS OWN admin page, no direct transfer shortcut or cross-link) is a real, smaller UX-friction candidate, but `p1-w1` is actively and heavily mining this exact file/area (5+ recent commits touching `tenant_domains` write paths) — deferring to avoid collision until branches reconcile. If the leader wants this pursued now anyway, say so and I'll take it.

## Verification this round

- Zero code changes — this was a read-only investigation + doc/queue writes only. `git status` on `platform/src` confirms no working-tree changes.
- File-only, no push/deploy/DB write.
