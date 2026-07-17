# W4 broad hunt — booking-notes image_urls injection (2026-07-17 12:26)

File-only, no push/deploy/DB. Continuing the leader's 3-deep queue from the
12:06 order: item (1) fresh-ground hunting.

## Context

Checked the previously-flagged `referrers.total_earned`/`total_paid`
lost-update race (`referral-commissions/route.ts`) as a candidate first —
confirmed it's not fresh ground: already found and file-only proposed on
2026-07-16 (`platform/deploy-prep/w4-broad-hunt-2026-07-16-1637-*` and
`w4-broad-hunt-2026-07-16-1912-*`), migrations sitting in
`src/lib/migrations/2026_07_16_referrer_total_{earned,paid}_atomic_bump_PROPOSED.sql`
blocked on Jeff approving the prod DDL. Also checked `cron/recurring-expenses`
for a double-post race — already comprehensively closed by the
`journal_entries` unique-index migration + `postJournalEntry()`'s NULL-return
handling (`2026_07_13_journal_entries_dedup_constraint_PROPOSED.sql`). Moved
to genuinely uncovered surfaces: `recurring-expenses`, `team-availability`,
`booking-notes` — the last one had a real gap.

## Finding

`POST /api/booking-notes/upload` MODE 1 (`src/app/api/booking-notes/upload/route.ts`)
took a client-supplied `image_urls` JSON array and inserted it verbatim into
`booking_notes.images` with **zero validation** — no type check, no prefix
check, nothing:

```ts
if (imageUrlsRaw) {
  const imageUrls = JSON.parse(imageUrlsRaw) as string[]
  ... .insert({ ..., images: imageUrls }) ...
}
```

`booking_notes.images` renders directly as `<img src={url}>` in
`components/BookingNotes.tsx` (`images.map((url, i) => <img src={url} ...>)`),
which is mounted in **two** places:
- `dashboard/bookings/BookingsAdmin.tsx` — admin/staff view, `mode="admin"`.
- `site/{book,wash-and-fold-nyc,wash-and-fold-hoboken,the-florida-maid}/.../book/dashboard/page.tsx`
  — customer-facing client portal, `mode="client"`.

Same unvalidated-URL-storage bug class already fixed this session for
`team_applications.photo_url` and `reviews.images`/`reviews.video_url`
(`deploy-prep/w4-broad-hunt-2026-07-16-0157-*`) — booking-notes was simply
never swept.

**Reachability**: the endpoint is gated by `requirePermission('bookings.edit')`,
and `getTenantForRequest()` (`lib/tenant-query.ts`) only ever resolves a role
from admin PIN, tenant-member PIN, or Clerk `tenant_members` sessions — there
is no client-portal auth path that produces a role here. So today a real
customer hitting the client-dashboard `BookingNotes` component in `mode="client"`
gets a 401 from this endpoint (same "wired to an admin-only endpoint, dormant
for its stated client-facing use" pattern already noted in the reviews fix).
The live exposure right now is staff-to-staff: any of the 3+ roles that carry
`bookings.edit` (owner/admin/staff — see `lib/rbac.ts`) can POST directly to
this endpoint (bypassing MODE 2's real upload entirely) with an arbitrary
`image_urls` array, and the planted URL renders in every other admin/staff
user's browser who opens that booking's notes thread. If the client-portal
401 is ever fixed independently (plausible — the component and page are
clearly built for it), this becomes reachable from genuinely external client
sessions with no other change required, same as the reviews case.

## Fix

`platform/src/app/api/booking-notes/upload/route.ts` — MODE 1 now requires
every URL in `image_urls` to start with this route's own `uploads` bucket
`booking-notes/` public prefix (computed via
`supabaseAdmin.storage.from('uploads').getPublicUrl('booking-notes/')`), the
same prefix MODE 2's own upload actually writes to
(`booking-notes/${bookingId}/${...}`). Any non-string entry or any URL
outside that prefix rejects the **whole** request with 400 (no partial
accept), matching the established pattern from the reviews/team-applications
fixes. This route's storage path isn't tenant-scoped (MODE 2 never included
`tenantId` in the path), so the check is bucket/folder-level like the prior
`team-applications` fix, not per-tenant — that's a pre-existing design gap,
not something introduced or fixed here.

New regression test:
`platform/src/app/api/booking-notes/upload/route.image-url-injection.test.ts`
— 3 cases: rejects a fully-foreign URL (400, no write), rejects a mixed
legit+foreign batch (400, no write), accepts an all-legit batch (200, note
written with exactly the submitted URLs).

## Verification

- `npx vitest run .../route.image-url-injection.test.ts` — 3/3 passing.
- `npx tsc --noEmit` — clean except the two pre-existing unrelated failures
  already flagged in prior W4 reports (`bookings/broadcast/route.xss.test.ts`
  mock-typing issue, `sunnyside-clean-nyc/_lib/site-nav.ts` import-name
  mismatch) — neither touched by this change.

## Noticed, not fixed (out of scope)

- The client-portal `BookingNotes` `mode="client"` usage 401s today because
  no client-portal session resolves a role via `getTenantForRequest()` —
  same dormant-feature pattern flagged for reviews. Not fixing (product
  decision, not a security gap) but flagging again since it's now the second
  instance of the same shape.
- MODE 2's storage path (`booking-notes/${bookingId}/...`) isn't tenant-
  scoped. Consistent with several other upload routes already accepted as-is
  in this codebase; not a new gap.
