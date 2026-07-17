# W2 gap/fluidity refresh — 2026-07-17 07:47

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-team-portal-availability-field-wiring-2026-07-17-0736.md`.

Leader's fresh 3-deep queue this round: (1) continue archetype depth, (2) continue fresh-ground hunting, (3) keep gap/fluidity current.

## Fresh ground — honest result: no new live bug found this round

Widened the hunt beyond `team_members`/`clients` (both now confirmed fully wired for the wrong-storage-location class) into every remaining self-service and pick()-allowlist surface I could find, specifically checking each against the two bug classes this session has repeatedly found: (a) a route writing a structured value into `notes`/scratch JSON instead of the real column another engine reads, and (b) a `pick()`-allowlist silently dropping a field the frontend actually sends (the `clients.unit` bug's shape).

Checked and found clean (already correctly wired, several by this session's own prior fixes):
- Remaining `team-portal/*` routes not yet swept: `update-phone`, `rating`, `notifications`, `config`, `guidelines`, `crew/schedule`, `crew/members`, `crew/earnings`, `running-late`, `checkin`, `checkout`, `video-upload`, `connect` (+ `unread`), `15min-alert`, `messages` — all target real columns or real tables, none stash structured data in `notes`/scratch JSON.
- `PUT /api/team/[id]` (admin's own team-member editor) — `pick()`-allowlist (`name, email, phone, role, hourly_rate, pay_rate, working_days, status, preferred_language, notes, avatar_url`) matches exactly what `dashboard/team/[id]/page.tsx`'s basic-profile form sends; no silently-dropped field.
- `PUT /api/clients/[id]`, `PUT /api/bookings/[id]`, `PUT /api/settings/services/[id]/route.ts` (`EDITABLE_SERVICE_FIELDS`) — same check, same result: each `pick()`-allowlist covers every field its own frontend form actually sends.
- `client/preferred-cleaner`, `client/recurring` — both write the real `clients.preferred_team_member_id` / `recurring_schedules`+`bookings` columns directly, both already carry terminated-crew guards from earlier rounds.
- `team-portal/jobs/claim`, `jobs/reassign`, `jobs/release` — all already hardened (atomic claim, check-in-time guard, terminated-crew guard) by prior rounds; no field-wiring issue.
- `unsubscribe` + every campaign-send path (`campaigns/send`, `campaigns/[id]/send`, `cron/outreach`, `admin/send-apology-batch`, `admin/campaigns/preview`) — all correctly gate on `email_marketing_opt_out`/`sms_marketing_opt_out`/`sms_consent`/`do_not_service` before sending. The consent-gate thread really is exhausted, as the prior round's docs already concluded.

Not fabricating a bug to fill this slot. What the sweep did surface:

**New NOTICED (dead column, not a live bug)**: `team_members.working_start`/`working_end` (TIME columns, added by the same `migrations/013_full_parity.sql` statement block as `working_days`/`unavailable_dates`/`schedule` — 5a-34's fix). Two write paths still populate them — the legacy admin shim `PUT /api/cleaners/[id]` and `activate-tenant.ts`'s provisioning defaults (`08:00`/`18:00`) — but grepping every scheduling read path confirms **zero** reads: `src/lib/smart-schedule.ts`, `src/lib/availability.ts`, `src/lib/cleaner-availability.ts`, `cron/generate-recurring`, `cron/schedule-monitor`, `admin/find-cleaner/preview` — none of them `.select()` either column. Unlike 5a-34's bug, there's no live consequence to fix: nothing depends on these columns, so writing (or not writing) them changes zero scheduling outcomes today. Not fixing unilaterally — whether they should become a real daily time-window constraint (distinct from `working_days`' day-of-week gate) or are pure legacy carry-over from the nycmaid port is a product question, not inferable from the code.

## Archetype depth

Added `sim-all-trades.ts` section 5a-35. Proves the dead-column finding empirically rather than just by grep: (a) `working_start`/`working_end` genuinely exist as columns on the live `team_members` table; (b) they genuinely accept the legacy shim's exact write shape and round-trip on read (ruling out a schema-cache mirage or silent write failure — i.e. confirms "dead" as in unread, not "broken" as in write-fails). Not yet executed — leader-run-only, writes to live tenant/team_members table. Verified statically: `tsc --noEmit` clean, `eslint` clean (0 new; same 3 pre-existing warnings on untouched lines as every prior round this session).

## NOTICED — not fixed, flagging for the leader/Jeff

Carried forward unchanged from the prior round's list (`w2-team-portal-availability-field-wiring-2026-07-17-0736.md`), items 1-16, plus:

17. **New** (see above): `team_members.working_start`/`working_end` are written by the legacy admin `/api/cleaners/[id]` shim and defaulted at tenant activation, but never read by any scheduling code path. Zero live consequence either way today — flagging so it isn't rediscovered as a fresh mystery, and so a future "wire up working hours" effort knows these columns already exist rather than adding new ones.

## MISSING-FEATURE GAPS

Carried forward unchanged from the prior round's list, items 1-26.

## UX-FRICTION

Carried forward unchanged from the prior round's list.

File-only, no push/deploy/DB. 2 commits this round (1× `test(sim)` archetype-depth addition, 1× `docs`) — no `fix` commit, since fresh-ground hunting this round did not find a live bug to fix.
