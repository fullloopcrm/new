# W4 — 2026-07-16 21:09 queue: HR/payroll/finance depth + fresh ground + gap/fluidity report

File-only, no push/deploy/DB. Both commits on p1-w4. `npx tsc --noEmit` and
the affected vitest suites (`client-delete-guard`, `team-member-delete-guard`,
`api/clients`, `api/team`, `api/cleaners`, `dashboard/clients`) all pass
(21/21 new tests, 181 passed + 1 pre-existing skip across the broader sweep).
The 3 pre-existing `tsc` errors (`bookings/broadcast/route.xss.test.ts`,
`sunnyside-clean-nyc/_lib/site-nav.ts` ×2) are unrelated to this diff —
confirmed present before my changes too.

## (1) Cross-archetype HR/payroll/finance depth

Direct follow-on to gap #2 flagged in the 20:38 report: **`hr_employee_profiles`
still CASCADE-deleted silently** because the delete-guard added last session
(`09ba29d8`) never checked it. Fixed now — but existence alone can't gate
deletion, since `hr.ts`'s `seedHrDefaults` auto-creates a profile row for
*every* team member at HR-default values (`employment_type:
'contractor_1099'`, `comp_type: 'per_job'`, `hr_status: 'active'`). Blocking
on mere existence would make hard-delete impossible for anyone, the same
over-blocking trap already avoided for the other cascade tables.

Instead the guard now checks for real, admin-entered data: `hire_date`,
`termination_date`, `title`, `department`, `pay_rate_cents`,
`emergency_contact_name/phone`, `date_of_birth`, or a non-default
`hr_status` (`on_leave`/`terminated`). Any of those present blocks the
delete with the same steer-to-inactive 409 the other checks use. 4 new
tests (allows-defaults-only, blocks-on-hire-date, blocks-on-non-default-
status, plus the existing 6 pass unchanged) — `src/lib/team-member-delete-
guard.ts` + `.test.ts`.

## (2) Fresh-ground hunting

**`DELETE /api/clients/[id]` had zero guard at all** — no existence check,
no history check, unconditional hard delete. `bookings.client_id` is
`NOT NULL ... ON DELETE CASCADE` (migration 008), and bookings themselves
cascade further into `booking_team_members`/`ratings` (migration 050) and
`referral_commissions` (migration 019). `client_properties`/`property_
changes` also cascade (migration 052). Deleting a client with real booking
history — completed and **paid** jobs included — silently destroyed all of
it, permanently, with a single confirm() dialog as the only friction. This
is a materially bigger blast radius than the team-member gap fixed last
session, since bookings ARE the job/revenue record, not an ancillary table.

`deals.client_id` has no `ON DELETE` action specified (defaults to
`NO ACTION`/restrict) — a client with an open deal would already 500 with a
raw Postgres FK-violation error today instead of cascading; now caught
cleanly as a 409 too.

New `src/lib/client-delete-guard.ts` (`checkClientDeletable`, same shape as
the team-member guard), wired into `DELETE /api/clients/[id]`, blocking on
bookings/deals/client_properties existing, steering to `clients.status =
'inactive'`. 5 new tests, all pass.

Then found + fixed the identical second-order bug my own guard surfaced,
same class as `bd48cf5b`'s team-detail fix: `src/app/dashboard/clients/
[id]/page.tsx`'s `deleteClient()` never checked the DELETE response before
calling `router.push('/dashboard/clients')` — an admin hitting the new 409
would see the page navigate away as if the delete succeeded while the
client (and its bookings) still exist. Fixed to `alert()` the guard's
reason and stay on the page, matching `team/[id]/page.tsx`'s existing
pattern.

**Noticed, not fixed (flagged below in gap report, not guessed at):**
`DELETE /api/deals/[id]` also has zero guard and hard-deletes unconditionally,
cascading `deal_activities` (migration 011). Did not add a guard here — unlike
bookings/HR-profile-edits, `deal_activities` gets an auto-inserted row the
moment ANY deal is created (`deals/route.ts:100`), so gating on mere existence
would block every real deal ever touched, the same over-blocking trap avoided
elsewhere. A real fix needs a threshold that isn't mine to invent (e.g. `stage
!= 'lead'`, `closed_at IS NOT NULL`, or `value_cents > 0` — any of which could
be too loose or too strict without product input on what "a deal worth
protecting" means). Flagging as a structural question below rather than
picking a number.

`invoices/[id]` and `quotes/[id]` DELETE were checked too and are **already
well-guarded** — invoices refuse hard-delete unless `draft` + zero paid, and
soft-void otherwise; quotes refuse deletion once `accepted`/`converted`. No
action needed there.

## (3) Gap/fluidity report

**MISSING-FEATURE / STRUCTURAL GAPS (not fixed — flagging for leader/Jeff):**

1. **`DELETE /api/deals/[id]` has no delete-guard**, per above. Needs a
   product decision on what makes a deal "worth protecting" before a
   threshold can be picked — recommend closed-won/closed-lost deals
   (`closed_at IS NOT NULL`) and deals with `value_cents > 0` past the
   `lead` stage as the likely right bar, but that's a guess, not a
   verified requirement.
2. **Carried from 20:38 report, still open:** two-going-on-three
   tenant-creation doors reimplement activation independently
   (stripe-platform via `activateTenant`, prospects/admin-approve now
   patched to duplicate the finance_hr subset, and an unaudited manual
   admin "create tenant" path). Each new door risks re-introducing the
   same partial-seeding gap class fixed across this and last session.
3. **Carried from 20:38 report, still open:** `hr_document_reminders
   .document_id` is `NOT NULL`, so there's no way to attach a "missing
   required document" reminder until a `hr_documents` row exists for that
   requirement — needs a design call (e.g. auto-creating a `'pending'`
   `hr_documents` row per required `doc_type` at seed time), not a
   worker's call to make unilaterally.
4. **Carried from 20:38 report, still open:** `reviewed_by_name` migration
   (`2026_07_16_hr_documents_reviewed_by_name_PROPOSED.sql`) is drafted but
   not applied to prod, so the live PATCH route still can't record a real
   reviewer name.

**UX-FRICTION:**
1. The client-delete 409 (like the team-member one before it) doesn't offer
   an inline "Set inactive instead?" action — closes the alert, then the
   admin has to separately find the status field. Minor polish, not built
   this round.
2. (Carried, still open) HR onboarding badge/handoff gap
   (`provisionApprovedApplicant` never touches `hr_employee_profiles`/
   `hr_document_requirements`) and finance period-lock enforcement gap —
   both still unbuilt per leader/Jeff's own note that block-vs-override
   policy isn't a worker's call.
