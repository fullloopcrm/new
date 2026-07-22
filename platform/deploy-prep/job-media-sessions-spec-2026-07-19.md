# Job Media Sessions — Execution Spec

Status: DRAFT — not started. Written from the codebase as of `main@f1c243c2` (2026-07-19).
Worktree: `~/flwork-media-sessions` (branch `plan/job-media-sessions-2026-07-19`, planning only, nothing pushed).

---

## 0. Read this before building anything

Three things in the original spec don't match the current codebase. A worker who starts from
the original spec as literally written will build the wrong thing or collide with in-flight work.

### 0.1 "Raul" doesn't exist

There is no AI wrapper called Raul anywhere in `fullloopcrm/platform`. The real per-tenant AI
infrastructure is:

- `src/lib/anthropic-client.ts` — `resolveAnthropic(tenantId)` / `anthropicFromStoredKey()`.
  Resolves the tenant's own Anthropic key if they've set one, else the platform key. **This is
  the function to call**, not a new client construction.
- `src/lib/selena/agent.ts` + `src/lib/selena/core.ts` — the per-tenant AI agent ("Selena",
  branded "Yinez" for nycmaid per `[[nycmaid_yinez_cutover]]`). Conversational, not a fit for a
  one-shot structured-JSON extraction job — don't route through it.
- `src/lib/jefe/agent.ts` — platform-internal ops agent, not tenant-scoped. Not a fit either.

For this feature, the right shape is a plain `resolveAnthropic(tenantId)` call with a
`tool_choice`-forced structured-output call (see §4), same pattern as other one-shot AI JSON
extraction in this codebase. No new AI wrapper needed.

### 0.2 This overlaps ~50% with an unmerged branch: `feat/job-photos-loopcam`

There's a nearly-complete, unmerged, **never-migrated, never-run** branch
(`~/flwork-loopcam-photos`, 4 commits, 2026-07-18) that already built:

- `job_photos` table — tenant-scoped, anchored on `job_id` OR `booking_id`, `photo_type`
  (before/after/progress), `pair_id` for before/after pairing, `source` (crew/client), `tags`,
  `annotations` jsonb (SVG overlay, percentage coordinates), lat/lng, `taken_at`.
- `job_checklist_items` table.
- Three capture surfaces wired into the *existing* job/booking model: office dashboard, crew
  team-portal (`team/checkin`, `team/checkout`), client portal.
- `jobs.public_token` (mirrors `quotes.public_token`) + `/photos/[token]` public share view,
  registered in the middleware allowlist.
- PDF report export via `pdf-lib` (already a dependency) at `/api/jobs/[id]/report`.
- A shared helper, `src/lib/job-photos.ts` (`saveJobPhoto()`), that all three capture surfaces
  call — storage write + row insert + `logJobEvent()` audit trail in one place.

**Building `job_media_stills` as a brand-new parallel table, as the original spec describes,
creates two competing photo systems bolted onto the same job.** Two gallery UIs, two tag
systems, two share-link mechanisms, two PDF exports. That's not a hypothetical risk — it's what
happens if a worker takes the original spec literally without reading this branch first.

**Decision needed from Jeff before a worker starts** (see §7, Q1): merge/finish
`feat/job-photos-loopcam` first and extend it, or treat Job Media Sessions as the
supersede-and-replace path and shelve the photos branch. This spec assumes **extend**, because
~80% of the still-photo, tagging, and share-link plumbing already exists and works with the
existing job model — rebuilding it is waste. If Jeff picks supersede instead, §1–§3 below need
a rewrite.

### 0.3 "AI overview within 30-60 seconds" is not achievable with this repo's cron pattern

The original spec says "Background job (Vercel cron or Supabase Edge Function) picks up
processing." This repo's `vercel.json` cron entries run no tighter than hourly
(`0 * * * *` is the tightest interval in use). A cron poll cannot deliver a 30-60 second
turnaround — worst case is a ~60 minute wait. This needs a push-triggered pipeline, not a poll
loop. See §4 for the actual design.

---

## 1. Revised data model

Extends the (currently unmerged) `job_photos` table instead of duplicating it. If Jeff wants
"supersede" instead of "extend" (§7 Q1), swap `job_media_stills` back to a standalone table —
everything else in this spec is unaffected.

```sql
-- New: the video + transcript + AI-overview layer. Stills are NOT part of this table.
CREATE TABLE IF NOT EXISTS job_media_sessions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id                  UUID REFERENCES jobs(id) ON DELETE CASCADE,
  booking_id              UUID REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT job_media_sessions_anchor_required CHECK (job_id IS NOT NULL OR booking_id IS NOT NULL),

  created_by_team_member  UUID REFERENCES team_members(id) ON DELETE SET NULL,
  session_type            TEXT NOT NULL DEFAULT 'walkthrough'
    CHECK (session_type IN ('walkthrough', 'before', 'during', 'after', 'issue-flag')),

  video_url               TEXT,               -- null until upload completes
  video_storage_path      TEXT,               -- for deletion, mirrors job_photos.storage_path
  video_duration_seconds  INT,
  video_size_bytes        BIGINT,

  transcript_json         JSONB,              -- [{start, end, text, speaker}], Deepgram output
  ai_overview_json        JSONB,              -- structured output, see §4 schema
  ai_summary_text         TEXT,

  status                  TEXT NOT NULL DEFAULT 'recording'
    CHECK (status IN ('recording', 'uploading', 'uploaded', 'transcribing', 'summarizing', 'complete', 'failed')),
  failure_reason          TEXT,               -- set when status='failed', for retry/support
  processing_attempts     INT NOT NULL DEFAULT 0,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_media_sessions_job     ON job_media_sessions(job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_media_sessions_booking ON job_media_sessions(booking_id);
CREATE INDEX IF NOT EXISTS idx_job_media_sessions_tenant  ON job_media_sessions(tenant_id, status);
-- Recovery query for a stuck-processing sweep (see §4.4)
CREATE INDEX IF NOT EXISTS idx_job_media_sessions_stuck   ON job_media_sessions(status, updated_at)
  WHERE status IN ('uploaded', 'transcribing', 'summarizing');

-- Extend job_photos (assumes feat/job-photos-loopcam lands first) so a still captured
-- mid-recording is just a job_photos row with a session_id and a video timestamp, and shows
-- up in the SAME gallery/tag/share/PDF-report system stills already have.
ALTER TABLE job_photos ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES job_media_sessions(id) ON DELETE SET NULL;
ALTER TABLE job_photos ADD COLUMN IF NOT EXISTS timestamp_in_video_seconds INT;
ALTER TABLE job_photos ADD COLUMN IF NOT EXISTS ai_caption TEXT;
-- photo_type CHECK already allows 'before'/'after'/'progress'; a still captured during a
-- walkthrough with no explicit before/after intent defaults to 'progress' — no new enum value.

CREATE INDEX IF NOT EXISTS idx_job_photos_session ON job_photos(session_id) WHERE session_id IS NOT NULL;
```

Notes:
- `annotations_json` from the original spec's `job_media_stills` is dropped — `job_photos`
  already has `annotations JSONB` doing the exact same job (SVG overlay, percentage coords).
- No new `RLS` claim beyond what's true today: this codebase's real tenant-isolation guard is
  the app-layer `tenantDb(tenantId)` wrapper (`src/lib/tenant-db.ts`), not DB-level RLS — DB RLS
  is a separate, partially-rolled-out effort (`platform/docs/tenant-isolation-rls-plan.md`,
  `[[fullloop_leader_orchestration_2026_07_11]]`: "RLS on 15 gap tables"). Every route this
  feature adds MUST use `tenantDb(tenantId)` for reads/writes — don't write raw
  `supabaseAdmin.from(...)` queries the way `/api/uploads/route.ts` does for non-tenant-table
  cases. Add `job_media_sessions` to whatever gap-table RLS sweep is currently running.

---

## 2. Capture UI — what to actually reuse

Route: `/dashboard/jobs/[id]/media/record` (as specced) is correct — global dashboard path per
`platform/CLAUDE.md`'s GLOBAL RULE. Do **not** build a per-tenant version under `src/app/site/*`.

But note: the original spec's flow ("Field crew... opens Full Loop app... taps Start Media
Session on the job page") implies this is a **crew/team-portal** flow, not an office-dashboard
flow. The existing `job_photos` crew capture points are `team/checkin/[bookingId]` and
`team/checkout/[bookingId]` (bearer-token auth, not dashboard session auth). Decide which auth
surface this actually lives under before building — `/dashboard/jobs/[id]/media/record` (office
session auth) can't be the route a cleaner opens on their own phone mid-job. Likely correct
route: `/team/media/[bookingId]` or a new step inside checkin/checkout, auth'd the same way
`VideoUpload.tsx` already does it (bearer token, see below). **This is a real open question, not
a nit — flag to Jeff (§7 Q2).**

### 2.1 Recording + stills capture

`MediaRecorder` + `getUserMedia({video, audio})` + canvas-grab-still is right. Two real gaps the
original spec doesn't mention:

- **iOS backgrounding kills the recording.** PWA camera capture is not backgroundable on iOS —
  if the crew member switches apps, gets a phone call, or the screen locks mid-walkthrough, the
  `MediaRecorder` session is gone, not paused. This is the single most likely field failure mode
  for this feature (a 5-10 minute continuous recording with a phone in someone's pocket). Spec
  needs an explicit answer: auto-save partial recording on `visibilitychange`/`pagehide` (chunk
  via `ondataavailable` with a `timeslice`, upload chunks as they're produced instead of one
  blob at the end), not just a fallback for "older devices."
- **Chunked capture solves the upload-size problem too.** A single `MediaRecorder.start()` with
  no timeslice buffers the whole video in memory until `stop()` — bad on a phone for anything
  past a couple minutes, and produces one large blob to upload over bad job-site bandwidth (the
  spec's own words) with no partial-progress resilience. Use `MediaRecorder.start(1000)` (1s
  timeslices), stream chunks into IndexedDB as they arrive (spec already has stills in
  IndexedDB — put video chunks there too), and background-upload chunks opportunistically
  instead of one big PUT at the end.

### 2.2 Upload — reuse the real analog, not `/api/uploads`

`/api/uploads/route.ts` (5MB cap, multipart-through-serverless) is the wrong route — spec
correctly avoids it but doesn't name what to use instead. Two existing signed-URL patterns
exist; neither is an exact fit, both are close:

- `src/app/api/upload/signed-url/route.ts` — public/unauthenticated, tenant resolved from Host
  header, `media` type already allows mp4/quicktime/webm/x-m4v up to 100MB. Built for
  customer-facing forms (we-pay-you-junk booking), not staff auth.
- `src/app/api/team-portal/video-upload/route.ts` + `src/components/VideoUpload.tsx` —
  **this is the closer analog**: bearer-token team-portal auth, booking-scoped, signed-URL PUT
  direct to Supabase storage (bypasses Vercel's 4.5MB body limit the same way), XHR progress
  events, 150MB client-side cap. Port this pattern for job media sessions rather than the public
  one — auth model matches (crew, not anonymous customer).

Storage path convention (matches `job-photos.ts`'s `storagePath` pattern):
`tenant_{tenant_id}/jobs/{job_id}/media/{session_id}.webm` for video,
`tenant_{tenant_id}/jobs/{job_id}/media/{session_id}/still_{index}.jpg` for stills going into
the extended `job_photos` row (`source='crew'`, `session_id` set).

150MB cap from `VideoUpload.tsx` is reasonable for the "average 5-min session" the cost model
assumes, but a longer walkthrough at 1080p could exceed it — either enforce a client-side max
recording duration (show a countdown, auto-stop) or raise the cap and accept the storage-cost
model needs adjusting. Pick one explicitly; don't leave it implicit.

---

## 3. Playback UI

Reuses the section already being added to `src/app/dashboard/jobs/[id]/page.tsx` by the photos
branch (144/188/122 lines added across its three commits) rather than a brand-new "Media
Sessions tab" — that page currently has no tab system, it's sectioned. Add a "Media Sessions"
section alongside the photos section that branch adds, sharing the same gallery/lightbox
components where the still images overlap (they're now the same `job_photos` rows, just
`session_id`-tagged).

Sticky video player + synced transcript click-to-seek is genuinely net-new — nothing in the
codebase does synced transcript playback today. Build as its own component
(`src/components/MediaSessionPlayer.tsx`), not a modification of `PhotoCapture.tsx`.

Customer share view: reuse the `jobs.public_token` + `/photos/[token]` pattern the branch
already built (`/api/jobs/public/[token]/route.ts`) rather than a new
`/media/[session_share_token]` route with its own token column. One share link per job, showing
both photos and media sessions, is a better customer experience than two separate links anyway
— extend `/photos/[token]/photos-view.tsx` (or rename the route to `/share/[token]` if scope now
includes video) to also render sessions, instead of building a second, near-duplicate
public/token/auth code path.

---

## 4. Background processing — actual design

### 4.1 Trigger: direct call, not cron poll

On upload completion (client confirms the signed-URL PUT succeeded), the client calls
`POST /api/jobs/[id]/media/[sessionId]/process` directly. That route:

1. Sets `status = 'transcribing'`.
2. Calls Deepgram (pre-recorded audio API, given the uploaded video URL — Deepgram can pull
   audio directly from a video URL, no separate ffmpeg extraction step needed for MVP).
3. On transcript success: `status = 'summarizing'`, stores `transcript_json`, calls
   `resolveAnthropic(tenantId)` with the transcript + still-capture timestamps + job metadata,
   forced structured output (tool-use forcing, not "hope it returns JSON" prompting).
4. Stores `ai_overview_json` + `ai_summary_text`, `status = 'complete'`.
5. On any failure: `status = 'failed'`, `failure_reason` set, `processing_attempts` incremented.

This needs `export const maxDuration = 120` (or higher — this repo already uses up to 300 on
Pro plan elsewhere, e.g. `admin/comhub/yinez/send`) on the route, since Deepgram + Claude
chained synchronously for a 5-10 min video is a real multi-second-to-tens-of-seconds wait, not
instant. That's how the 30-60s target is actually hit — not by cron polling, by keeping the
whole pipeline in one route invocation with enough `maxDuration` headroom.

### 4.2 Failure recovery — the spec doesn't have one, needs one

`status='failed'` with no retry path just leaves a session stuck forever if Deepgram or
Anthropic hiccups. Add:
- A manual "Retry processing" button in the office UI (calls the same `/process` route again,
  idempotent — it just re-runs from whatever `status` it's currently in).
- One hourly cron (`/api/cron/media-session-recovery`, reusing the real cron pattern this repo
  already has) that finds sessions stuck in `uploaded`/`transcribing`/`summarizing` for over,
  say, 15 minutes (`idx_job_media_sessions_stuck` index above) and retries them automatically,
  capped at 3 `processing_attempts` before giving up and surfacing `failed` for a human.

### 4.3 Structured output schema

Same as the original spec's `ai_overview_json` shape — it's reasonable, keep it. One addition:
`still_id` references in `issues_flagged` should point at the *extended `job_photos.id`*, not a
separate stills table, per §1.

### 4.4 Cost estimates — verify before Jeff budgets against them

Deepgram Nova-3 and Claude per-session pricing in the original spec are plausible ballpark
numbers but I have not verified them against current published pricing — API prices change.
Confirm both against the live pricing pages before this becomes a line item anyone budgets
around, don't take the $0.02/session and $0.05-0.15/session figures as verified.

Storage cost model math: $0.021/GB/mo × 1,800GB ≈ $37.80/mo checks out arithmetically, but it's
presented as if that's the month-one bill — it's actually the bill **after a full year of
accumulation**, since video volume grows monthly and 90-day cold-archival doesn't delete
anything, just changes tier. Month one at 150GB is closer to $3/mo, ramping toward ~$40/mo by
month twelve. Worth correcting so Jeff doesn't think this feature costs $40/mo starting week one.

---

## 5. Legal/consent — not in the original spec, should be a named decision

A crew member recording audio+video inside a customer's home, potentially without the customer
being told, is a real consent surface — this platform already did real compliance work here
(TCPA/CCPA/CAN-SPAM for SMS/email, `[[fullloop_legal_compliance_2026_07_10]]`, not yet lawyer-
certified per that note). NY is one-party-consent for audio recording (the crew member
recording themselves narrating satisfies that), but if the recording captures a customer's
voice or a recognizable interior of their home and that later gets shared via the public
share-link, states differ on expectation-of-privacy grounds for video/image, not just audio
consent law. This isn't a blocker to spec out or build against, but it should be a named open
question before this ships to real customers, not silently absent. **Flagging, not deciding —
this needs a call from Jeff, possibly with actual legal input, not an engineering judgment
call.**

---

## 6. Build order + local test/verify plan (no push, build locally only)

Phased so each phase is independently testable before the next starts — matches this repo's
existing `route.test.ts` / `route.isolation.test.ts` convention (see
`video-upload/route.isolation.test.ts` for the tenant-isolation test shape to copy).

**Phase 1 — schema + storage plumbing (no UI)**
- Migration file, applied to a local/dev Supabase project only — never against prod from this
  worktree. `job_media_sessions` table, `job_photos` extension columns.
- `src/lib/job-media.ts` — `saveMediaSession()`, `finalizeMediaUpload()`, mirroring
  `job-photos.ts`'s shape (validate → storage write → row insert → `logJobEvent()`).
- Verify: unit tests for `job-media.ts` against a local Supabase instance (or the existing test
  double this repo's other `lib/*.test.ts` files use — check `job-photos.ts` for a sibling test
  file once that branch lands, copy its harness). Run `pnpm tsc --noEmit` — non-negotiable per
  `[[feedback_typecheck_before_push]]`.

**Phase 2 — signed-URL upload route + processing route**
- `/api/team-portal/media-session/route.ts` (or wherever §2's auth-surface decision lands),
  ported from `video-upload/route.ts`.
- `/api/jobs/[id]/media/[sessionId]/process/route.ts` per §4.
- Verify: `route.test.ts` + `route.isolation.test.ts` per-route (this repo's real test bar —
  it's currently ~0.5% coverage overall per `[[fullloop_session_close_2026_07_10_pm]]`, don't
  add to that debt on a customer-facing feature). Manually hit the process route with a real
  short test video against Deepgram/Anthropic in dev mode — confirm actual transcript +
  structured JSON, not just "the route returns 200."

**Phase 3 — capture UI**
- `MediaRecorder` + canvas-still component, chunked upload per §2.1/§2.2.
- Verify: this cannot be meaningfully unit-tested. Local verification path:
  1. `pnpm dev`, access via HTTPS on the local network (camera/mic require secure context —
     `localhost` works for desktop Chrome dev, but testing the actual PWA-on-phone flow needs
     either `ngrok`/similar tunnel or a real deploy preview — decide which before Phase 3 starts,
     don't discover this mid-build).
  2. Playwright with `--use-fake-device-for-media-stream` for an automated smoke test of the
     record/stop/upload flow (fake camera feed, real MediaRecorder codepath) — catches
     regressions, does NOT catch real-device iOS-backgrounding failure modes.
  3. Manual test on an actual iPhone and Android device on a real job-site-like network
     (throttle to 3G in dev tools at minimum) — explicitly test backgrounding mid-recording,
     since §2.1 flags that as the most likely real failure.

**Phase 4 — playback UI + share link**
- Extend `jobs/[id]/page.tsx` media section, `MediaSessionPlayer.tsx`, extend
  `/photos/[token]/photos-view.tsx` (or `/share/[token]` per §3).
- Verify: Playwright E2E per `[[web/testing.md]]` conventions — screenshot at 320/768/1024/1440,
  test the transcript-click-seeks-video interaction, test the public share view renders with no
  auth and does NOT leak `internal_notes`/`transcript_json` (this is a real data-leak risk if
  the API route that serves `/photos/[token]` isn't explicitly stripping internal fields — check
  the existing `/api/jobs/public/[token]/route.ts` for how it already does this for photos,
  match that pattern exactly).

**Phase 5 — recovery cron + cost guardrails**
- `/api/cron/media-session-recovery`, registered in `vercel.json`.
- Verify: manually force a session into `transcribing` with a stale `updated_at`, run the cron
  route locally, confirm it retries and respects the 3-attempt cap.

**Throughout:** `pnpm build` locally before calling any phase done (per this repo's Stop-hook
convention, `[[feedback_full_build_not_grep_tsc]]` — full build, not just `tsc`/grep). Nothing
in this plan pushes or deploys — that's explicitly out of scope per your instruction, and is a
separate, later decision once local build+test is green and Jeff has answered §7.

---

## 7. Open questions — need a decision before a worker starts

1. **Extend `feat/job-photos-loopcam` (this spec's assumption) or supersede it?** If
   supersede, someone needs to explicitly kill that branch (it's unmerged, unmigrated, never
   run — cheap to abandon) and §1/§3 get rewritten for a standalone `job_media_stills` table.
2. **What auth surface does the crew capture UI actually live under** — office dashboard session
   auth (`/dashboard/jobs/[id]/media/record` as literally specced) or team-portal bearer-token
   auth (`/team/...`, matching where `job_photos` crew capture and `VideoUpload.tsx` already
   live)? These are different login systems; the route can't serve both without picking one.
3. **Legal/consent posture for recording inside customer homes** (§5) — needs a call, not an
   engineering default.
4. **Max recording duration / storage cap** (§2.2) — hard client-side cap with auto-stop, or
   raise the 150MB ceiling and accept the storage-cost model needs redoing.
5. **Local dev tunnel for phone-camera testing** (§6 Phase 3) — ngrok, a Vercel preview deploy,
   or something else. Decide before Phase 3, not during it.

---

## 8. Full production-surface wiring map

Traced the actual job/production data spine and every surface that touches it, so this feature
wires into the real system instead of just the job detail page.

### 8.1 Data spine (confirmed from `2026_07_02_jobs_projects.sql` + `src/lib/jobs.ts`)

`jobs` (status/money/dates) → `bookings.job_id` (each work session) → `job_payments`
(deposit/progress/final money) → `job_events` (append-only timeline — "what Jefe / the operator
read to see a project's history at a glance," per that migration's own comment).

**This feature must write to `job_events`, not just its own tables.** `job_photos` already does
this (`logJobEvent()` call, `event_type: 'photo_added'`) — LoopCam media sessions need the same:
`event_type: 'media_session_added'` on upload-complete, `'media_session_processed'` when the AI
overview lands. Skipping this makes a media session invisible on the job timeline every other
job activity shows up on.

### 8.2 Dashboard surfaces

- `dashboard/jobs/page.tsx` (job list) — no change required for MVP. Optional follow-on: a media
  indicator/thumbnail column, same tier as a "nice to have," not core.
- `dashboard/jobs/[id]/page.tsx` (job detail) — confirmed existing sections include a Stats row
  and a Payments section (`<section>` at line ~414, "Payments" heading); the LoopCam photos
  branch already adds its own section here. Media Sessions slots in as a sibling section, per §3.
- `dashboard/calendar/RichMonthView.tsx` + `dashboard/calendar/ProjectsView.tsx` — this is
  "Production" / "Project Central" (per `RESUME-POINT.md`'s 2026-07-18 session notes: Calendar
  was renamed to Production/Project Central, and the Projects tab's primary view is real `jobs`
  rows linking to this same job detail page). No required change — cards already link through to
  the job detail page where the new section lives — but confirms this feature's home is the
  `jobs` table's existing detail page, not a standalone surface.
- **Known unresolved fork, not this feature's problem to fix:** that same resume doc flags two
  competing "project" primitives — the rich `jobs` table this feature builds on, and a separate
  lightweight calendar `projects` table — as an open call for Jeff, not yet decided. Worth
  knowing this exists so a worker doesn't accidentally build against the wrong one.

### 8.3 Crew surface — confirmed, not `team/jobs`

Crew capture lives at `team/checkin/[bookingId]` and `team/checkout/[bookingId]` (bearer-token
auth) — same place `job_photos` crew capture already lives, confirming §7 Q2's likely answer.
**Not** `team/jobs` — that route is the open-pool "claim an unassigned job" listing
(`/api/team-portal/jobs?available=true`), unrelated to active-job media capture.

### 8.4 Customer-facing surfaces

- `portal/bookings/[id]` — client portal, if the job has a customer-visible booking.
- Public share link — per §3, extend the photos branch's `jobs.public_token` +
  `/photos/[token]` (or renamed `/share/[token]`) rather than a new token column.
- **Delivery mechanism not yet specified**: the original spec says "customer receives text
  link" — that means firing a real SMS to a real customer phone number.
  [[feedback_no_client_sms]] and [[feedback_no_mass_sms]] are standing hard rules on this
  account: never SMS real clients without explicit per-send authorization. This isn't a reason
  to drop the feature — it's a build/test gate. Wire the send through the existing tenant SMS
  rail (`src/lib/notify.ts` / the tenant's Telnyx sender, same as other customer notifications),
  but **local/dev verification of this specific step must use a test number or a mocked
  send — never fire it at a real customer during Phase 3/4 testing.** Call this out explicitly
  to whoever executes this phase.

### 8.5 Notifications (internal)

`src/lib/notify-team.ts` / `notify-team-member.ts` for crew-facing pushes, `src/lib/push.ts` for
web push. Office-side "AI overview ready" notification (so staff don't have to poll the job page
waiting on processing) should reuse whichever of these already pushes to the dashboard for other
async events — needs a quick check of which one job_photos/job_events use today, if any, before
adding a new notification path.

### 8.6 Admin — confirmed no wiring needed

No `admin/jobs` or `admin/production` directory exists. Individual jobs have no cross-tenant
admin oversight surface today, and this feature doesn't need to add one — it stays entirely
inside the per-tenant dashboard/team/portal surfaces already mapped above.

### 8.7 Billing — not wired, flagged as a possible future idea only

`job_payments` (deposit/progress/final) has no relationship to media documentation in the
original spec, and I'm not proposing one for MVP (scope creep). Naming it because it's an
obvious next question once this ships: "require an after-walkthrough session before releasing
the final payment milestone" is a real product idea, but it's a decision for Jeff, not something
to build speculatively now.
