# "Complete HR setup" badge/prompt — concrete additive proposal

Follow-on to `w1-recurring-archetype-hr-onboarding-gap-2026-07-16.md` (the gap analysis). That doc proposed the badge/prompt at a high level and flagged it for leader/Jeff scoping. This doc makes it concrete: exact signal, exact surfaces, exact diff. **Doc only — nothing below is built.** New-workflow territory per the leader's call, not mine to build unilaterally.

## The signal already exists — zero schema change

`listEmployees()` (`src/lib/hr.ts:194`) already returns `profile_id: string | null` per employee, sourced from a left-join against `hr_employee_profiles`. Today the UI throws this away — `HrPeoplePage` never reads `profile_id`, and `listEmployees` itself papers over the null with defaults (`employment_type ?? 'contractor_1099'`, `hr_status ?? 'active'`) so a profile-less hire renders identically to a fully-set-up one.

`profile_id === null` is exactly "HR setup was never initialized for this hire" — the condition `provisionApprovedApplicant()` creates and never resolves. No new column, no migration. The only "schema-adjacent" gap is that `provisionApprovedApplicant()` (`src/lib/team-provisioning.ts:24`) returns `void`, so the approve routes can't currently hand the UI the new `team_member_id` to link to. That's a return-type change, not a schema change (see "Minimal touch" below).

## Badge/prompt shape

**Surface A — People/HR hub row badge (primary, persistent).** `src/app/dashboard/hr/page.tsx`:
- New `Onboarding` column in the roster table (after `Payouts`). Pill: amber `Setup needed` when `profile_id === null`, else no badge (quiet default — don't add a green pill nobody needs to see).
- New stat tile in the existing 5-tile stat row: `Setup needed` count (`employees.filter(e => e.profile_id === null).length`), same style as `Payouts connected`, so it's visible without opening the table.
- Both are pure client-side derivations of data already in the `GET /api/dashboard/hr` response — no API change.

**Surface B — Team Applications post-approve handoff (secondary, momentary).** `src/app/dashboard/team/page.tsx`, in `updateApplication()`/`bulkApproveAll()`:
- On a successful single approve, replace the current silent success with an inline confirmation that includes a direct link: `"{name} approved — complete their HR setup"` linking to `/dashboard/hr/{team_member_id}`.
- On bulk-approve, the existing summary line (`Approved N. Emailed/provisioned M.`) gets one clause appended: `"N need HR setup — see People hub."` linking to `/dashboard/hr` (not worth deep-linking N rows).
- This is the actual fix for the "two unrelated screens, no handoff" friction the analysis doc flagged — it's the only place a hiring admin is guaranteed to be looking at the moment the gap is created.

Not proposing a third surface (e.g., a dashboard-wide notification/toast) — the two above cover the moment of creation (B) and the ongoing backlog (A) without adding a new notification channel.

## Minimal schema/UI touch (what would actually change, if approved)

1. `src/lib/team-provisioning.ts`: `provisionApprovedApplicant()` return type changes from `Promise<void>` to `Promise<{ teamMemberId: string }>` — both the fresh-insert (`newMemberId`) and dedup-reuse (`existing.id`) paths already compute this value internally, just discarded today.
2. `src/app/api/team-applications/route.ts` (`PUT`) and `src/app/api/team-applications/bulk-approve/route.ts`: thread that return value into the JSON response (`{ application: data, team_member_id }` / per-item in the bulk summary).
3. `src/app/dashboard/team/page.tsx`: consume the new field for Surface B's link; no new fetch.
4. `src/app/dashboard/hr/page.tsx`: add the `Onboarding` column + stat tile for Surface A, reading `profile_id` already present in `Employee`.
5. `src/lib/hr.ts`: no change required — `profile_id` is already returned, just currently unused by the page.

No migration file, no new table/column, no RLS change. Everything is additive UI + one return-type widening on an internal helper.

## Open question for leader/Jeff

"HR setup complete" is being defined here as **"a profile row exists"** (`profile_id !== null`), not "all required documents are uploaded" — the latter would need the requirement/document join per row (`hr_document_requirements` × `hr_documents`), which is a heavier query and arguably a different, longer-running signal ("compliance incomplete" vs "never started"). Proposing the cheaper "never started" signal for this pass since it directly targets the gap in the analysis doc (an admin who never opens the HR hub at all); document-completeness tracking already exists inside the individual employee's HR page (`src/app/dashboard/hr/[id]/page.tsx`) once they get there. If Jeff wants the roster-level badge to reflect full compliance instead of just "started," that's a scope change to this proposal, not an extension of it.
