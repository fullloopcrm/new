# W2 gap/fluidity refresh — 2026-07-17 16:33 EDT

## Closed this round

**seo_overrides apply-layer had exactly one reader in the entire app** — the
FL marketing combo pages (`(marketing)/[combo]/page.tsx`), not any real
tenant's site. `applyOverride()` is written by BOTH the admin-review "Apply"
button (`/api/admin/seo/apply`) and autopilot's `runAutopilot()`, for every
tenant property `onboarding.ts`'s `registerSeoProperty()` registers the
moment a tenant activates ("so no site is ever silently untracked"). But
`getSeoOverride()` — the only code path that ever turns an "applied" row
back into a rendered `<title>`/meta description — had zero callers on any
tenant's actual site.

Practical effect (confirmed via full grep, not assumed): an admin reviewing
and approving a Tier-1 title/meta fix for any real tenant — or autopilot
auto-applying one, gated by `SEO_AUTOPILOT_ENABLED` — flips `seo_changes` to
`'applied'`, consumes that property's weekly rate-cap budget (5/week per
`autopilot.ts`), and reports success. The tenant's live page never changes.
4 weeks later `verify-revert.ts` judges that "applied" change against real
GSC ranking data for a page whose actual `<title>`/meta was never touched —
keep/revert decisions made off pure ranking noise, not the change's real
effect. This is the same "declared/reported success, no live effect" shape
as prior finds tonight (Jefe's `create_task`, various declared-status-no-
write-path items), but on a system that auto-applies AND auto-reverts based
on the false premise that its own apply step worked.

Fixed the highest-value single instance: `site/template/page.tsx`'s
homepage `generateMetadata()` now consults `getSeoOverride(siteConfig.
identity.url)` (same precedence `[combo]/page.tsx` already uses), falling
back to the template default title/description (and their OG/twitter
mirrors) when no override exists for that exact url. 4 new tests incl. a
wrong-tenant probe (tenant B's applied override keyed by tenant B's own url
never leaks into tenant A's homepage metadata). RED-confirmed via
`git apply -R` on the `page.tsx` diff alone (not stash, per this session's
shared-stash-stack safety note) — 3/4 tests failed for the right reason
(template default returned instead of the override), GREEN on reapply. tsc
clean, full suite 604/604 files / 2647/2684 tests / 37 pre-existing skips /
0 failures, 0 new eslint warnings (1 pre-existing TrustBadges-unused
warning confirmed present before this change too via before/after diff).

Commit: `752299e2`.

## NOT fixed this round — tracked follow-up, same shape

The homepage is one of ~20 `generateMetadata()` functions across
`site/template/*` (services, blog + blog posts, area/service combo pages,
virtual-assistant + virtual-assistant/[location]/[service], legal pages,
about/contact/careers/faq) that each independently build their own
title/description and none of which consult `seo_overrides`. Each needs its
own canonical-url construction checked against exactly what
`remediate.ts`/`enrich.ts` store as `target_url` for that page type before
wiring the same override check in — verified correct for the homepage
(`siteConfig.identity.url`, confirmed against the `identity.url` resolver
this lane fixed earlier tonight at `f47cacb4`), NOT yet re-derived per page
type for the other ~19. Also untouched: any bespoke non-template tenant
site (`site/wash-and-fold-*`, `site/the-florida-maid`, etc.) has its own
metadata generation, if any, that would need the identical check.
Deliberately not rushed across all of them in one pass — same discipline as
tonight's other large-surface holds (W4's `post-labor.ts`/
`postDepositToLedger`, W1's admin-dashboard notes CAS leg, W3's `'started'`
dispatch trigger) where the fix shape is proven but per-instance
verification is the actual work, not mechanical repetition.

## Also swept, genuinely clean — not touched

- `overrides.ts`'s `getSeoOverride`/`applyOverride`/`revertOverride`
  themselves: correct, single-table, no tenant-scoping defect (keyed by
  full absolute url including domain, not a relative path — confirmed no
  cross-tenant collision risk as long as domains are unique, which
  `tenant_domains`/`tenants.domain` already enforce).
- `safety-gate.ts` (`evaluateSafety`): deterministic claim/competitor/
  shouting/topic-drift rules read correctly, no logic bug found.
- `verify-revert.ts`: baseline/current position comparison, revert
  threshold, and `no_data_kept` verdict all behave as documented — the
  underlying comparison is sound, it was just being fed phantom "applied"
  changes for every property but FL's own.
- Cron-secret timing-safe-equal class already fixed for all 9 `seo-*` cron
  routes (`safeEqual` from `lib/timing-safe-equal`, confirmed present in
  every one) — this was flagged as a NOT-fixed lead in an earlier round
  (23:05) and is already closed.

File-only. No push/deploy/DB.
