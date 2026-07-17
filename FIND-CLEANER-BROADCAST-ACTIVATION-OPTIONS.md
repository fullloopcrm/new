# Find-cleaner tech-broadcast dispatch — activation options (prep doc, no code changed)

Source: LEADER 21:04 3-deep queue item (3), W3. This is prep only —
file-only, no push/deploy/DB, no behavior change applied. I found this
dormant feature while landing item (10) of
`EMERGENCY-24-7-ARCHETYPE-GAPS-AND-FRICTION-2026-07-16.md` and left it
explicitly unfixed pending Jeff's call. This doc lays out concrete
activation options.

## What already exists, confirmed by reading the code

A complete, tested, RBAC-gated SMS broadcast-dispatch feature —
`src/app/api/admin/find-cleaner/{preview,send,recent}/route.ts` +
`src/app/dashboard/find-cleaner/page.tsx` (145 lines, full UI: date/time/
zone picker, eligible/excluded team-member list with exclusion reasons,
message preview, send confirmation, recent-broadcast history with
per-recipient delivery/reply status). Flow:

1. `GET preview` — given `job_date`/`start_time`/`duration_hours`/
   `job_address`, filters all tenant team members by `working_days`,
   `schedule`, `unavailable_dates`, `service_zones`, and
   `max_jobs_per_day` (`src/lib/day-availability.ts`), returns eligible +
   excluded (with reasons) lists.
2. `POST send` — admin picks recipients from the eligible list, confirms;
   sends each an SMS ("Available {date} {time}{ in zone}? Pay: $X/hr.
   Reply YES to {number} if available.", ES translation included), inserts
   a `cleaner_broadcasts` row + one `cleaner_broadcast_recipients` row per
   recipient.
3. `GET recent` — broadcast history with reply/delivery status per
   recipient.

Gated behind `requirePermission('campaigns.send')`, has dedicated
`.rbac.test.ts` probes on both `send` and `recent` confirming the
permission gate holds. `BROADCAST_CAP=50` recipients per broadcast,
`BUFFER_HOURS=1.5` lead-time buffer baked into the eligibility filter.

## Why it's dormant, both confirmed independently

- **No nav link.** `grep -rn "find-cleaner" src/**/*.{ts,tsx,json}` —
  outside the feature's own 5 files (3 routes, the page, 2 rbac tests),
  zero hits. `dashboard/layout.tsx` has no entry pointing at
  `/dashboard/find-cleaner`. Reachable only by typing the URL.
- **Backing tables not in prod.** `src/lib/migrations/
  008_cleaner_broadcasts.sql:1-2`: *"find-cleaner / cleaner-dispatch
  broadcast tables (ported from standalone nycmaid). Tenant-scoped. NOT
  YET APPLIED to prod — apply explicitly before enabling
  /api/admin/find-cleaner/send."* Two tables: `cleaner_broadcasts`,
  `cleaner_broadcast_recipients` — both tenant-scoped, RLS-enabled,
  additive (no existing table touched). Without this migration, `POST
  send`'s insert into `cleaner_broadcasts` fails outright on any tenant.
- **`TEST_MODE=true` is hard-coded** in `preview/route.ts:8-10`, gated by
  the standing `feedback_no_mass_sms` rule: real sends are hard-filtered
  to only team members whose name contains `"jeff tucker"` until someone
  explicitly flips the constant. This is a deliberate safety gate, not a
  bug — it means even after the migration lands, the feature stays inert
  for real tenants until a second, separate decision is made.

Net effect: two independent gates, both already correctly conservative
by design, are stacked on top of each other. That's likely *why* this
shipped and then sat — normal to build behind a `TEST_MODE` flag pending
verification, but the migration-not-applied half means it was never
actually smoke-tested even in test mode against a real tenant's data.

## This directly closes the open question from item (4)/P11.18

Item (4) of the emergency-archetype report flagged: "no push/SMS to any
tech telling them a job is open to claim... needs a product call on what
the push mechanism should be (SMS blast to all on-call/available techs?
A single most-likely-available tech?)" — this feature already answers
that question (SMS blast to eligible techs, admin-initiated, with
zone/schedule/capacity filtering already built). The remaining gap is
activation, not design.

## Option A (recommended) — apply migration 008, add nav link, leave TEST_MODE on for a smoke-test window

1. Jeff (or leader, post-approval) applies `008_cleaner_broadcasts.sql`
   to prod — additive, two new tables, no existing table touched, no data
   migration needed.
2. Add a nav entry for `/dashboard/find-cleaner` in `dashboard/layout.tsx`
   (small diff, matches existing nav-item pattern).
3. Leave `TEST_MODE=true` for an initial window so real admin usage is
   exercised safely (only "jeff tucker"-named team members receive real
   SMS) before flipping it off tenant-by-tenant or globally.

**Pros:** unblocks the feature with the smallest possible change, keeps
the mass-SMS guard intact per standing rule, lets Jeff verify the UX
against real data before any tenant's techs get a real text.
**Cons:** still requires a second, later decision (flip `TEST_MODE`) before
any tenant actually benefits — this option alone doesn't close the P11.18
gap end-to-end, just unblocks it.

## Option B — apply migration 008 + flip TEST_MODE off in the same pass

Same as Option A, plus immediately setting `TEST_MODE = false` in
`preview/route.ts`.

**Pros:** fully closes the P11.18 dispatch-push gap in one pass — real
techs get real broadcast SMS the first time an admin uses the page.
**Cons:** skips the smoke-test window entirely; first real use is also
the first real mass-SMS send, on a feature that (per the migration
comment) has apparently never been exercised against live data in this
codebase. Higher risk if `day-availability.ts`'s eligibility filter or
the SMS template has an unnoticed bug — the blast radius is real team
members' phones, not a test fixture.

## Option C — leave it dormant, formally mark as not-shipped

Do nothing; optionally delete the dead nav-adjacent dead-end (there isn't
one to delete — it's just unlinked) or add a code comment in
`find-cleaner/page.tsx` noting it's built-but-unshipped so a future pass
doesn't rediscover it as a mystery. Continue relying on the existing pull
model (self-claim open-jobs screen, P11.13) as the only dispatch path.

**Pros:** zero risk, zero migration, zero decision needed now.
**Cons:** leaves the P11.18 gap open indefinitely despite a working fix
already sitting in the codebase — the most expensive option in terms of
opportunity cost, since the hard part (building the feature) is already
done and paid for.

## Recommendation

Option A. It's the minimum-risk path to actually testing a feature that,
per its own migration's comment, appears to have shipped without ever
being run against a real tenant — and it respects both standing rules in
play here (prod-DDL needs Jeff's sign-off; mass-SMS needs an explicit,
separate flip) without leaving real value stranded indefinitely like
Option C does.

Not applied — migration not run, nav link not added, `TEST_MODE` not
touched, awaiting Jeff's sign-off on Option A (or a different pick)
before implementation.
