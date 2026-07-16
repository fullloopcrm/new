# Broad-hunt — W4, 2026-07-16 07:09 order

File-only, no push/deploy/DB.

## Fresh surface audited this pass

Cross-checked the actual API route tree against `deploy-prep/route-auth-matrix.md`
(normalizing dynamic segments) to find anything genuinely undocumented. Only
two routes were missing: `cron/seo-health` and `cron/seo-improve` (both new
this session) — read both, both correctly gate on `CRON_SECRET` via
`safeEqual`. No gap.

Since the route-auth-matrix is otherwise exhaustive, pivoted to a
pattern-search: the codebase has repeatedly had (and fixed) one specific bug
class this session — free-text `*_url` fields accepted from request bodies
and stored without validating the URL scheme, later rendered somewhere that
executes `javascript:`/`data:`/`vbscript:` URIs (management-applications,
sales-applications, team_members photo/avatar, admin notes, reviews
images/video). Grepped for any remaining unvalidated `_url` writes.

## Finding fixed: `dashboard/onboarding/profile` POST stored unvalidated URLs

`platform/src/app/api/dashboard/onboarding/profile/route.ts` POST wrote
`websiteUrl`, `logoUrl`, and five social-link fields + `googleReviewLink`
straight from the request body via a plain `str()` trim-only helper — no
scheme check.

Traced the render side and found a real sink:
`platform/src/app/dashboard/websites/page.tsx:100` renders
`settings.website_url` directly as `<a href={settings.website_url}>`. A
`javascript:` value stored here executes in the **dashboard's own origin**
when clicked — not the public marketing site.

Trust-boundary check (`platform/src/lib/rbac.ts`): this route is gated by
`requirePermission('settings.edit')`, which is granted by default to both
`owner` **and** `admin` tenant roles (not just the trusted owner). So a
lower-trust `admin`-role team member could plant a `javascript:` URL that
executes in the `owner`'s authenticated dashboard session the next time they
click "visit site" on the Websites page — a real stored-XSS / cross-role
privilege-escalation path within a single tenant, not just a hypothetical.

`logo_url` renders only via `next/image`'s `<Image src>` (not `<a href>`),
so it isn't independently exploitable today, but it's the same field class
and gets the same treatment for defense-in-depth given this codebase's
established pattern of validating every stored URL. Social links and
`google_review_link` aren't currently rendered as clickable `<a href>`
anywhere I found (google_review_link is sent as a plain-text SMS string via
`cron/post-job-followup`, not HTML), but locked down the same way since nothing
stops a future render path from doing so, matching the existing precedent.

### Fix

Added a `strUrl()` helper (wraps the existing `str()` trim + requires
`^https?:\/\//i`) and applied it to `websiteUrl`, `logoUrl`, `facebookUrl`,
`instagramUrl`, `tiktokUrl`, `linkedinUrl`, `youtubeUrl`, `xUrl`, and
`googleReviewLink` before they're written to `tenants`/`selena_config`.
Non-http(s) values are silently dropped (matches the file's existing
`str(d.x) && {...}` pattern for optional fields — same behavior as every
other optional field in this route when validation fails).

`npx tsc --noEmit`: clean except one pre-existing, unrelated failure
(`src/app/api/bookings/broadcast/route.xss.test.ts:52`, a mock-typing issue)
confirmed present on `HEAD` before this change via `git stash` — not
introduced by this fix.

### Noticed, not fixed (out of scope this pass)

Admin-only routes (`admin/settings`, `admin/businesses`, `admin/businesses/[id]`,
`admin/tenants/[id]`) also write `website_url`/`logo_url` without scheme
validation. Left alone — those are platform-staff-gated (`requireAdmin`),
a different/higher trust tier than the tenant-facing route fixed here, and
this codebase's prior audits have treated admin surface as a separate trust
boundary. Flagging in case the leader wants the same hardening applied there
for defense-in-depth.

## Result

One real gap found and fixed: unvalidated URL-scheme storage in the tenant
onboarding-profile route, with a confirmed stored-XSS sink
(`dashboard/websites/page.tsx`) exploitable by a lower-trust `admin`-role
tenant member against the `owner`'s dashboard session. File-only, no
push/deploy/DB.
