# Gap: admin dashboard's team-member schedule/time-off editor still does a client-driven read-then-overwrite on the shared `team_members.notes` blob

**For:** whoever next touches `/dashboard/team/[id]` or `/api/team/[id]`.
**From:** W1, 15:53 order item (1), team-portal deep pass (attendance/availability/messaging).
**Status:** flagging, NOT fixing this leg — fixed the two team-portal-side legs of the same bug (commit a1bc54c5) but this one needs a small route contract change plus a frontend change, not a self-contained backend patch.

## What I found

`team_members.notes` (a single TEXT column) is reused as a JSON blob by THREE
independent features, each doing its own read → merge one key → write the
WHOLE blob back:

1. `src/app/api/team-portal/availability/route.ts` — key `availability` (worker/lead/manager self-service, field portal)
2. `src/app/api/team-portal/preferences/route.ts` — keys `notification_preferences`, `sms_consent` (field portal)
3. `src/app/dashboard/team/[id]/page.tsx` (admin dashboard) — keys `working_hours`, `time_off`, `notification_prefs` — via `PUT /api/team/[id]` with a client-pre-built `notes` string (`pick(body, [...,'notes',...])`, `src/app/api/team/[id]/route.ts:57`)

I fixed the race between (1) and (2) — both are pure server-side read-merge-write, so I extracted a CAS retry helper (`src/lib/team-member-notes.ts`) and switched both onto it. Verified the lost-update via a red/green test (`src/lib/team-member-notes.test.ts`).

(3) is structurally different: the admin dashboard page holds `member` in
React state and builds the ENTIRE `notes` string client-side
(`buildNotesJson`, `[id]/page.tsx:144-148`) before PUTting it as a plain
opaque field. `/api/team/[id]` never parses or merges `notes` itself — it's
just `pick()`ed straight into a blind column UPDATE alongside name/email/etc.
So the admin side races the SAME blob against (1) and (2), but from a REST
contract that has no concept of "merge one key" at all — the whole string is
caller-supplied.

## Reproduction

An admin editing a team member's working-hours schedule while that same
team member (on the field portal, any device) saves a notification
preference or an availability change at roughly the same moment: whichever
write's HTTP response lands second wins, and it silently reverts whatever
the other one just set (no error, no conflict signal, nothing in the UI
indicates data was lost).

## Why I'm not fixing this leg now

Closing it properly needs either:
- **(a)** Give `/api/team/[id]` a dedicated `notes`-merge contract (accept a
  partial patch like `{ notes_patch: { working_hours, time_off } }` instead
  of a full pre-built string) and route it through
  `casUpdateTeamMemberNotes`, or
- **(b)** Give `working_hours`/`time_off` their own real columns instead of
  living in the shared text blob at all (the cleaner long-term fix, given
  three unrelated features already fighting over one column).

Either is a real design call (route contract change + a `dashboard/team/[id]/page.tsx` edit for (a), or a migration + three call-site edits for (b)) — past the size of a same-pass backend patch, and I don't want to change the admin page's save contract unilaterally without a decision on which direction to take.

## Suggested next step

Recommend (b) given there are now 3 independent feature-owners of one blob
and it'll keep growing — but either closes the race. Whoever picks this up:
`src/lib/team-member-notes.ts`'s CAS helper is ready to reuse regardless of
which direction is chosen.
