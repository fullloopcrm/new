# Proposal (not applied): resolving the `hr_employee_profiles.comp_type` / `pay_rate_cents` ambiguity

Status: DRAFT for Jeff's decision. No code changed. No real payroll math touched.

## The situation, verified by reading the actual code

Two separate, unsynced pay-rate fields exist today:

| Field | Table | Set from | Consumed by |
|---|---|---|---|
| `pay_rate` / `hourly_rate` | `team_members` | Dashboard → Team → member edit ("Pay Rate ($/hr)") — `src/app/dashboard/team/[id]/page.tsx:398` | `payment-processor.ts:257`, `finance/payroll/route.ts:48`, `finance/payroll-prep` (via `bookings.team_member_pay`, itself derived from this at payout time) — i.e. **every live money-moving path** |
| `comp_type` + `pay_rate_cents` + `pay_period` | `hr_employee_profiles` | Dashboard → HR → employee edit ("Compensation of record") — `src/app/dashboard/hr/[id]/page.tsx:268` | **Nothing.** `src/lib/hr.ts` only reads/displays it. No payroll, payout, or invoicing code path selects these columns for computation. Confirmed via repo-wide grep — `comp_type`/`pay_rate_cents` appear only in the HR route, HR pages, `hr.ts`, and the migration itself. |

Migration 053's own comment (`053_hr_foundation.sql:24-26`) frames this as intentional:
> "team_members.hourly_rate/pay_rate stay as the scheduling/job-costing rate; this is the HR-of-record rate + cadence."

So the schema was designed with the split in mind. But the UI doesn't make the practical consequence obvious: **an admin who edits "Compensation of record" in the HR tab is editing a field with zero effect on what the worker is actually paid.** The team-edit page and the HR page are different surfaces, weeks or months apart in typical usage, with no cross-reference either direction.

## Reading A — this is correct as designed; the gap is UX/labeling, not architecture

HR-of-record data (comp type, rate, cadence) is legitimately a compliance/tax/audit artifact — what you'd show a labor auditor or put on an offer letter — and is allowed to diverge briefly from the live operational rate (e.g. a raise takes effect HR-side on a future date, ops rate updates separately on the effective date). Under this reading:
- No sync is correct; keeping them decoupled prevents an HR edit from silently changing live pay before the effective date.
- The only real problem is that the HR page doesn't warn the admin that this field is cosmetic to payroll. Fix: add a one-line notice on the HR comp section ("This is the HR record of pay for compliance/audit purposes. Live pay rate is set on the team member's profile.") and/or a read-only display of the current `team_members.pay_rate` alongside it for comparison.
- Effort: trivial, UI-only, no payroll math touched.

## Reading B — this is a real gap; HR should be the source of truth (or at least sync)

If `hr_employee_profiles` is meant to be the "canonical HR pay definition" (per the migration's own language), then having it silently disconnected from every computation path is a data-integrity bug waiting to surface: an admin sets a new hourly rate in HR (the page that *sounds* authoritative — "Compensation of record"), reasonably believes payroll will reflect it, and it doesn't. Under this reading:
- On HR PATCH, when `comp_type`/`pay_rate_cents` change, also write through to `team_members.pay_rate`/`hourly_rate` (one-directional sync, HR → ops), OR
- Have `finance/payroll` and `payment-processor.ts` prefer `hr_employee_profiles.pay_rate_cents` when present, falling back to `team_members.pay_rate` — inverting today's precedence.
- This touches real payroll math and needs explicit sign-off before implementation; it also raises the comp_type=`per_job` question (HR's per-job rate has no natural per-booking hook the way `bookings.team_member_pay` does — per-job dollar amounts vary by job, not a fixed rate, so straight sync wouldn't fully work for that comp_type without more design).
- Effort: real feature work, cross-cutting (payroll, payroll-prep, payment-processor, possibly HR PATCH route), needs its own test pass.

## What I'd recommend if asked (not acting on this without sign-off)

Reading A is cheaper and lower-risk, and matches what the migration comment already says was intended — I'd lean toward it plus the UX notice. Reading B is the "do it right" answer if the HR module is meant to become the actual system of record for pay, but it's a bigger, riskier lift that touches live money paths and deserves its own scoped plan rather than a drive-by fix.

## Open question for Jeff

Which reading matches your intent for the HR module — audit/compliance record only (A), or eventual source of truth for live pay (B)? Once you pick, I can scope and implement the corresponding fix as its own change.
