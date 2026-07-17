# W2 gap/fluidity refresh — 2026-07-17 16:10

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-tenant-resolution-surface-reaudit-clean-2026-07-17-1524.md`.

Leader's fresh 3-deep queue this round (15:53 LEADER->W2, post usage-limit-reset redispatch): (1) genuinely new feature surface per my own 15:25 recommendation — SEO/content generation routes (blog, service pages, sitemap beyond indexnow) or scheduling/dispatch algorithms, my call. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1) Fresh-ground hunt — picked scheduling/dispatch over SEO/content-gen

Scoped SEO/content-gen first (`src/lib/seo/*`, ~30 files): the domain-fallback resolver-precedence class already exhausted there too — `auto-verify.ts` and `backlinks.ts` both already carry explicit comments citing "matches tenant-lookup.ts's tenant_domains-first / tenants.domain-fallback precedence," proving that surface already got the same treatment as the rest of tonight's resolver rounds. Rather than re-confirm already-hardened code a second time, pivoted to scheduling/dispatch, which nobody swept tonight.

**Real bug found and fixed**: `cron/schedule-monitor/route.ts` detects 13+ schedule-issue types (day_off, zone_mismatch, no_car, time_conflict, over_max_jobs, no_show, etc.) but never checked `hr_status`. HR termination (`dashboard/hr/[id]` PATCH → `hr_status='terminated'`) only writes the status field — it never touches the employee's existing FUTURE `bookings`/`recurring_schedules` rows. Team-portal login is already blocked for terminated staff (`team-portal-auth.ts`'s own `getTerminatedTeamMemberIds` guard), so the practical effect: fire someone with future jobs on the books, and those jobs silently have nobody who can show up — but the admin dashboard keeps reading them as healthily "assigned," with zero automated warning. The only prior detection was the NYC-Maid-only `no_show` check, which only fires *after* the job's `end_time` has already passed with no check-in — too late to reassign in advance for every other tenant, and even for NYC Maid it's a same-day discovery, not an early warning.

This is the read/detect-side twin of the write-side "terminated-crew-guard" class already applied to ~35 files tonight and in prior sessions (`getTerminatedTeamMemberIds` blocking *new* assignment) — but nothing previously checked whether an *existing* assignment had gone stale after the fact.

**Fix**: added a `terminated_assigned` issue type (severity `critical`) to `schedule-monitor`, batch-checking every distinct `team_member_id` on the 14-day booking window against `getTerminatedTeamMemberIds` (one call per tenant per run, not N+1). Wired the existing "Resolve" flow (`admin/schedule-issues/fix/route.ts`'s `buildFixPlan`) to unassign + flip the booking back to `pending`, same remedy already used for `day_off`. Added the type to the dashboard's `ISSUE_GROUP`/`ISSUE_ACTION` maps (`ScheduleIssues.tsx`) so it lands in "Fix now" / "Reassign" alongside its sibling issue types instead of falling into the generic "verify" bucket.

## (2) Continued: swept the adjacent crew-assignment surfaces for the same gap

Checked whether the same "stale assignment after termination" gap exists anywhere else in the scheduling/dispatch surface:

- **`cron/generate-recurring/route.ts`** — already guards this correctly. Has its own `memberTerminated` check (comment explicitly cites this exact scenario: "a fired member's schedule.team_member_id would otherwise..."); falls back to `smart-schedule` re-scoring or leaves the new occurrence unassigned. Newly-generated future occurrences never inherit a terminated assignee in the first place.
- **`routes/[id]/publish/route.ts`** — already guards this correctly at the final gate: blocks publishing a route to a terminated team member even if it was built from stale booking data.
- **`routes/auto-build/route.ts`** — does NOT check termination when grouping bookings into draft routes by their existing `team_member_id`. Investigated as a candidate second bug, but it's not exploitable: auto-build only builds an internal *draft* grouping from bookings.team_member_id (never assigns new); the actual "make it live" step is `routes/[id]/publish`, which already blocks a terminated assignee. No fix needed here — confirmed clean, not rubber-stamped.
- **`admin/recurring-schedules/route.ts` (GET/PUT), `/[id]/regenerate`, `/[id]/exception`** — all already have the write-side `getTerminatedTeamMemberIds` guard preventing a *new* pattern edit from reassigning onto a terminated worker.

No second bug found in the continue pass — the write-side of this surface (assignment/generation/publish) was already fully guarded from prior sessions; the one real gap was specifically the read-side detection/surfacing layer, which is now closed.

## NOTICED — not fixed, flagged as a question

`recurring_schedules.team_member_id` (the pattern *rule* itself, not its generated bookings) is never cleared or flagged when its assignee is terminated — the rule row keeps displaying the fired employee's name on `admin/recurring-schedules`' list/detail views indefinitely, even though `generate-recurring` already silently reassigns or unassigns every *new* occurrence going forward. This is cosmetic/informational only (no operational booking ever inherits the stale assignee, per the generate-recurring guard above), not a second instance of tonight's bug — but an admin scanning that list has no visual signal that "this client's recurring cleaner" is actually a departed employee until they open the schedule and check HR separately. Did not build a second issue type for this to avoid scope creep / redundant issue-spam against the same underlying booking-level flags. Flagging for a dedicated pass if Jeff wants it addressed.

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward unchanged from prior rounds (telnyx ~35-file carry-forward still paused on Jeff's compliance answer). Nothing new this round beyond the NOTICED item above.

## Verification this round

- 2 new tests (`cron/schedule-monitor/route.terminated-crew-guard.test.ts`), including a wrong-tenant probe: a team member terminated under a *different* tenant with the same id value must not false-positive this tenant's booking — proves `getTerminatedTeamMemberIds`' `tenant_id` scope isn't accidentally dropped.
- RED-confirmed via `git apply -R` on the `route.ts` diff alone (not `git stash`, per this session's shared-stash-stack safety note) — failed for the right reason (0 `terminated_assigned` issues inserted instead of 1) — then GREEN on reapply.
- `npx tsc --noEmit`: 0 errors.
- Full suite: 601/602 test files, 2637/2675 tests passed, 37 skipped. The 1 failure (`finance-export.test.ts`'s 200k-row pagination test, a `testTimeout`) is pre-existing and unrelated — untouched by this change, confirmed by file scope alone (finance-export.ts was never read or edited this round).
- `eslint` on all 4 touched files: 9 pre-existing warnings (unused-var/`any`/react-hooks on lines I never touched), 0 new — confirmed by line-number cross-reference against the diff.
- Commit `0b5f56dd`. File-only, no push/deploy/DB.
