# Recurring archetype (cleaning/pest/lawn) — HR onboarding handoff gap + fluidity notes

Scope: 19:11/19:22 queue item (1) archetype HR/onboarding depth + item (3) gap/fluidity list. Analysis-only, grounded in code read this pass (`src/lib/team-provisioning.ts`, `src/app/api/team-applications/*`, `src/app/api/dashboard/hr/*`). Not a full re-audit of the archetype — W2/W4 have already covered HR document-requirement resolution (19:22 report) and onboarding pricing defaults separately; this is what's still open after those.

## Missing-feature gap: approval never initializes the HR record it depends on

`provisionApprovedApplicant()` (`src/lib/team-provisioning.ts:24`), called from both single-approve (`PUT /api/team-applications`) and bulk-approve, does exactly two things on approval: insert a `team_members` row (or reuse one by phone match) and email a PIN. It never touches `hr_employee_profiles` or `hr_document_requirements` — grep confirms zero references to either table anywhere in the provisioning path or the two application routes.

Consequence: the HR system that already exists (`GET/PATCH /api/dashboard/hr/[id]`, `hr_document_requirements`, `hr_documents`) is fully disconnected from the hiring flow that feeds it new team members. A newly-approved applicant becomes a `team_members` row with:
- no `employment_type` set (`contractor_1099` vs `employee_w2`) — the field W2's 19:22 fix uses to resolve which documents (W-9 vs W-4+I-9) the new hire even needs. Undetermined until an admin manually opens the People/HR hub and sets it.
- no `comp_type`/`pay_period` — payroll (`GET /api/finance/payroll`) reads `team_members.pay_rate` directly today so payroll itself isn't blocked, but the HR-side comp fields stay empty indefinitely unless someone remembers to fill them in.
- zero `hr_documents` rows and no document-request act — the compliance requirement (W-9/W-4/I-9/direct-deposit/signed-agreement) never fires. Nothing in the UI tells an admin "this hire's paperwork hasn't started."

The employee is fully provisioned and working (PIN, portal login, schedulable) with a completely empty compliance file. Given W4's 19:22 finding that `payroll-prep`'s 1099 threshold logic is real and consequential, an operator can end up needing to 1099 a contractor who was never actually asked for a W-9.

## Fluidity/UX friction

- **No handoff between the two hubs.** Approving in Team Applications and completing HR onboarding are two unrelated screens with no link between them — an admin who approves an applicant has no on-screen cue that a second, separate HR setup step exists at all. The only way to discover it is to already know the People/HR hub exists and independently think to check it for each new hire.
- **The requirement template branches on a field nobody sets at hire time.** `hr_document_requirements` resolution depends on `employment_type`, but that field defaults to null/unset on a fresh `team_members` row — so the requirement list can't even resolve correctly until an admin manually classifies the hire, which nothing prompts them to do.
- **Bulk-approve compounds this per-hire gap N times with zero batching UI.** Approving 5 applicants in one bulk action produces 5 employees with 5 silently-empty compliance files and no aggregate "onboarding incomplete" view to catch up on afterward.

## Not fixed here — scoping question for leader/Jeff

This is a real product gap, not cosmetic, but the fix touches shared provisioning code (`team-provisioning.ts`) used by both application routes and needs a product decision before implementation:
- Auto-create an empty `hr_employee_profiles` row + seed `employment_type` from an application-form field (would need a new field on the public apply form — currently collects name/email/phone/address/experience/availability/references, nothing about 1099-vs-W2), OR
- Leave `employment_type` for an admin to set, but surface an explicit "Complete HR setup" prompt/badge on the Team Applications approved list and/or the People/HR roster for any hire with a null `employment_type` or zero `hr_documents` rows.

Proposing the second (badge/prompt) as lower-risk — it doesn't require changing the public-facing apply form or guessing 1099-vs-W2 from unverified applicant self-report, and it's additive UI only, no schema/migration required. Flagging for leader/Jeff's call rather than building unilaterally, since it's a new user-facing workflow, not a bug fix.
