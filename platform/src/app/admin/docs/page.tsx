'use client'

import { useState } from 'react'

interface DocSection {
  id: string
  title: string
  content: string
}

const sections: DocSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    content: `Welcome to FullLoop CRM — a multi-tenant SaaS platform for managing businesses, bookings, clients, teams, reviews, communications, and AI-powered scheduling.

**Quick Setup:**
1. Clone the repository and install dependencies with \`npm install\`
2. Copy \`.env.example\` to \`.env.local\` and fill in all required keys (see Environment Variables section)
3. Run \`npm run dev\` to start the development server on \`localhost:3000\`
4. Navigate to \`/admin\` to access the platform admin dashboard

**Key Concepts:**
- **Tenants** — Each business on the platform is a tenant with fully isolated data. All queries filter by \`tenant_id\`.
- **Dashboard** — Tenant-level view at \`/dashboard\` scoped to the logged-in business owner
- **Admin** — Platform-level view at \`/admin\` for cross-tenant management (requires admin PIN or Clerk super-admin)
- **Team Portal** — Separate mobile-first app at \`/team-portal\` for field workers (PIN auth, no Clerk)
- **Client Portal** — Public-facing portal at \`/portal\` for clients to book, message, and manage appointments
- **Selena AI** — AI booking concierge that handles SMS and web chat conversations end-to-end

**Authentication Layers:**
- **Clerk** — Primary auth for dashboard users (business owners). Provides userId linked to tenant.
- **Admin PIN** — Secondary auth for \`/admin\` routes. Validated via \`admin_token\` cookie and \`verifyAdminToken()\`.
- **Team Portal PIN** — Team members authenticate with phone number + 4-digit PIN. JWT issued by \`/api/team-portal/auth\`.
- **Client Portal** — Clients authenticate via phone or email verification codes.
- **Impersonation** — Admins can impersonate any tenant via \`fl_impersonate\` cookie. Supports both Clerk super-admin and PIN-based admin.

**Plans & Feature Gating:**
- Tenants subscribe to plans: Starter, Growth, Pro
- Plan determines available features, team member limits, and integrations`,
  },
  {
    id: 'architecture',
    title: 'Architecture',
    content: `**Tech Stack:**
- **Framework:** Next.js 16 (App Router, Server Components, Route Handlers)
- **Database:** Supabase (PostgreSQL + Storage + Realtime)
- **Auth:** Clerk (dashboard users) + custom JWT (team portal) + verification codes (client portal)
- **AI:** Anthropic Claude API (Selena booking concierge)
- **SMS:** Telnyx (inbound/outbound SMS, webhooks)
- **Email:** Resend (transactional emails, templates)
- **Payments:** Stripe (checkout sessions, payment links, webhooks)
- **Hosting:** Vercel (serverless functions, cron jobs, edge)
- **Styling:** Tailwind CSS

**Directory Structure:**
- \`src/app/admin/\` — Platform admin pages (businesses, bookings, clients, team, finance, etc.)
- \`src/app/dashboard/\` — Tenant dashboard pages (owner-facing)
- \`src/app/team-portal/\` — Team member mobile app (check-in, video, earnings)
- \`src/app/portal/\` — Client-facing portal (booking, messaging)
- \`src/app/api/\` — All API route handlers
- \`src/lib/\` — Shared libraries (supabase, selena, notify, sms, email, tenant-query, etc.)
- \`src/components/\` — Reusable React components

**Multi-Tenant Design:**
- Every database table includes a \`tenant_id\` column
- The \`tenant-query.ts\` module (\`getTenantForRequest()\`) is the central auth + tenant resolution function used by every API route
- It resolves tenant context via: (1) admin impersonation cookie, (2) Clerk auth + user metadata, (3) super-admin override
- Returns \`TenantContext\` with \`userId\`, \`tenantId\`, \`tenant\`, and \`role\`
- All Supabase queries MUST filter by \`tenant_id\` — never query without it

**Admin Auth Flow:**
- Admin routes use \`require-admin.ts\` which checks for admin PIN token
- Super admin is identified by \`SUPER_ADMIN_CLERK_ID\` env var
- Admin can impersonate any tenant via the businesses page`,
  },
  {
    id: 'api-reference',
    title: 'API Reference',
    content: `All API routes live under \`/api/\`. Routes are organized by domain.

**Admin APIs** — Require admin PIN auth via \`admin_token\` cookie

| Route | Method | Description |
|-------|--------|-------------|
| \`/api/admin/businesses\` | GET | List all tenants with stats |
| \`/api/admin/businesses/[id]\` | GET/PUT | Single tenant details and updates |
| \`/api/admin/tenants\` | GET/POST | Tenant CRUD |
| \`/api/admin/tenants/[id]\` | GET/PUT/DELETE | Single tenant management |
| \`/api/admin/bookings\` | GET | Cross-tenant booking list |
| \`/api/admin/clients\` | GET | Cross-tenant client list |
| \`/api/admin/team\` | GET | Cross-tenant team list |
| \`/api/admin/analytics\` | GET | Platform-wide analytics |
| \`/api/admin/finance\` | GET | Platform financial overview |
| \`/api/admin/billing\` | GET | Subscription billing data |
| \`/api/admin/calendar\` | GET | Cross-tenant calendar view |
| \`/api/admin/leads\` | GET | Cross-tenant leads |
| \`/api/admin/referrals\` | GET | Referral program data |
| \`/api/admin/marketing\` | GET | Marketing campaigns overview |
| \`/api/admin/sales\` | GET | Sales pipeline data |
| \`/api/admin/sms\` | GET | SMS conversations across tenants |
| \`/api/admin/email\` | GET/POST | Email management |
| \`/api/admin/notifications\` | GET | Platform notifications |
| \`/api/admin/announcements\` | GET/POST | Platform announcements |
| \`/api/admin/announcements/[id]\` | PUT/DELETE | Manage single announcement |
| \`/api/admin/changelog\` | GET/POST | Platform changelog |
| \`/api/admin/feedback\` | GET | User feedback |
| \`/api/admin/requests\` | GET | Feature requests |
| \`/api/admin/settings\` | GET/PUT | Platform settings |
| \`/api/admin/security\` | GET | Security events |
| \`/api/admin/errors\` | GET | Error log viewer |
| \`/api/admin/impersonate\` | POST | Impersonate a tenant |
| \`/api/admin/invites\` | GET/POST | Tenant invitations |
| \`/api/admin/ai\` | POST | Selena AI admin chat |
| \`/api/admin/system-check\` | GET | System health check |
| \`/api/admin/travel-time\` | GET | Travel time estimates |
| \`/api/admin/websites\` | GET | Tenant website configs |
| \`/api/admin/google/auth\` | GET | Start Google OAuth |
| \`/api/admin/google/callback\` | GET | Google OAuth callback |
| \`/api/admin/google/status\` | GET | Google connection status |
| \`/api/admin-auth\` | POST | Admin PIN login |
| \`/api/admin-auth/logout\` | POST | Admin logout |

**Booking APIs** — Tenant-scoped via \`getTenantForRequest()\`

| Route | Method | Description |
|-------|--------|-------------|
| \`/api/bookings\` | GET/POST | List and create bookings |
| \`/api/bookings/[id]\` | GET/PUT/DELETE | Single booking CRUD |
| \`/api/bookings/[id]/status\` | PUT | Update booking status |
| \`/api/bookings/[id]/payment\` | POST | Process booking payment |
| \`/api/bookings/stats\` | GET | Booking statistics |
| \`/api/bookings/batch-update\` | POST | Bulk update bookings |
| \`/api/bookings/broadcast\` | POST | Send broadcast to booking clients |
| \`/api/bookings/closeout\` | POST | Close out completed bookings |
| \`/api/availability\` | GET | Check time slot availability |
| \`/api/schedules\` | GET/POST | Recurring schedules |
| \`/api/schedules/[id]\` | PUT/DELETE | Manage single schedule |
| \`/api/schedules/[id]/pause\` | POST | Pause/resume a schedule |

**Client APIs** — Tenant-scoped

| Route | Method | Description |
|-------|--------|-------------|
| \`/api/clients\` | GET/POST | List and create clients |
| \`/api/clients/[id]\` | GET/PUT/DELETE | Single client CRUD |
| \`/api/clients/[id]/activity\` | GET | Client activity timeline |
| \`/api/clients/[id]/transcript\` | GET | Client conversation transcript |
| \`/api/clients/stats\` | GET | Client statistics |
| \`/api/clients/import\` | POST | Bulk CSV import |

**Team Portal APIs** — JWT auth via team member PIN login

| Route | Method | Description |
|-------|--------|-------------|
| \`/api/team-portal/auth\` | POST | PIN login, returns JWT |
| \`/api/team-portal/checkin\` | POST | Check in with GPS coordinates |
| \`/api/team-portal/checkout\` | POST | Check out, calculates hours + earnings |
| \`/api/team-portal/video-upload\` | POST | Upload walkthrough/final videos |
| \`/api/team-portal/15min-alert\` | POST | Send 15-minute remaining alert |
| \`/api/team-portal/earnings\` | GET | View earnings history |
| \`/api/team-portal/availability\` | GET/PUT | Manage availability |
| \`/api/team-portal/jobs\` | GET | View assigned jobs |
| \`/api/team-portal/jobs/claim\` | POST | Claim an open job |
| \`/api/team-portal/connect\` | GET/POST | Team messaging |
| \`/api/team-portal/connect/unread\` | GET | Unread message count |
| \`/api/team-portal/notifications\` | GET | Team notifications |
| \`/api/team-portal/preferences\` | GET/PUT | Notification preferences |
| \`/api/team-portal/guidelines\` | GET | Company guidelines |

**Client Portal APIs** — Verification code auth

| Route | Method | Description |
|-------|--------|-------------|
| \`/api/portal/auth\` | POST | Phone/email verification login |
| \`/api/portal/bookings\` | GET/POST | Client's bookings |
| \`/api/portal/bookings/[id]\` | GET/PUT | Single booking details |
| \`/api/portal/availability\` | GET | Available time slots |
| \`/api/portal/services\` | GET | Available services |
| \`/api/portal/connect\` | GET/POST | Client messaging |
| \`/api/portal/connect/unread\` | GET | Unread messages |
| \`/api/portal/feedback\` | POST | Submit feedback |
| \`/api/portal/notes\` | GET/POST | Client notes |

**Selena AI**

| Route | Method | Description |
|-------|--------|-------------|
| \`/api/selena\` | POST | Selena SMS webhook handler (inbound from Telnyx) |
| \`/api/chat\` | POST | Selena web chat (client portal) |
| \`/api/ai/chat\` | POST | AI chat for dashboard users |
| \`/api/ai/assistant\` | POST | AI assistant (admin context) |

**Webhooks** — External service callbacks

| Route | Method | Description |
|-------|--------|-------------|
| \`/api/webhooks/telnyx\` | POST | Inbound SMS and delivery status from Telnyx |
| \`/api/webhooks/stripe\` | POST | Payment events (checkout.session.completed, etc.) |
| \`/api/webhooks/resend\` | POST | Email delivery events (delivered, bounced, complained) |
| \`/api/webhooks/clerk\` | POST | User lifecycle events from Clerk |

**Cron Jobs** — Authenticated via \`CRON_SECRET\` Bearer token

| Route | Schedule | Description |
|-------|----------|-------------|
| \`/api/cron/reminders\` | Hourly | Send booking reminders (day-before + 2-hour) |
| \`/api/cron/confirmations\` | Daily | Send confirmation requests to clients and team |
| \`/api/cron/cleanup-videos\` | Daily | Delete videos older than 30 days (skip \`[DISPUTE]\` flagged) |
| \`/api/cron/daily-summary\` | Daily | Send daily booking summary to owners |
| \`/api/cron/backup\` | Daily | Database backup routine |
| \`/api/cron/health-check\` | Every 5min | System health monitoring |
| \`/api/cron/sync-google-reviews\` | Every 6hr | Pull new Google reviews |
| \`/api/cron/auto-reply-reviews\` | Daily | AI-generated review replies |
| \`/api/cron/follow-up\` | Daily | Post-service follow-up messages |
| \`/api/cron/post-job-followup\` | Daily | Follow-up after job completion |
| \`/api/cron/generate-recurring\` | Daily | Create bookings from recurring schedules |
| \`/api/cron/lifecycle\` | Daily | Client lifecycle stage updates |
| \`/api/cron/retention\` | Weekly | Client retention campaigns |
| \`/api/cron/system-check\` | Hourly | Internal system diagnostics |

**Communications**

| Route | Method | Description |
|-------|--------|-------------|
| \`/api/sms\` | POST | Send outbound SMS via Telnyx |
| \`/api/notifications\` | GET/POST/PUT | Notification CRUD and mark-read |
| \`/api/connect/channels\` | GET | Message channels list |
| \`/api/connect/messages\` | GET/POST | Unified messaging |
| \`/api/connect/unread\` | GET | Unread counts |
| \`/api/settings/notifications\` | GET/PUT | Notification preferences |
| \`/api/push/subscribe\` | POST | Web push subscription |

**Finance**

| Route | Method | Description |
|-------|--------|-------------|
| \`/api/finance/revenue\` | GET | Revenue reporting |
| \`/api/finance/expenses\` | GET/POST | Expense tracking |
| \`/api/finance/expenses/[id]\` | PUT/DELETE | Manage expenses |
| \`/api/finance/payroll\` | GET/POST | Payroll management |
| \`/api/payments/checkout\` | POST | Create Stripe checkout session |
| \`/api/payments/link\` | POST | Generate payment link |

**Other APIs**

| Route | Method | Description |
|-------|--------|-------------|
| \`/api/uploads\` | POST | File upload to Supabase Storage |
| \`/api/reviews\` | GET/POST | Review management |
| \`/api/reviews/[id]\` | PUT/DELETE | Manage single review |
| \`/api/reviews/request\` | POST | Send review request to client |
| \`/api/campaigns\` | GET/POST | Marketing campaigns |
| \`/api/campaigns/[id]\` | GET/PUT/DELETE | Manage campaign |
| \`/api/campaigns/[id]/send\` | POST | Send campaign |
| \`/api/campaigns/send\` | POST | Bulk campaign send |
| \`/api/referrals\` | GET/POST | Referral program |
| \`/api/referrals/[id]\` | PUT | Update referral |
| \`/api/referrals/track\` | POST | Track referral conversion |
| \`/api/referrers\` | GET/POST | Referrer management |
| \`/api/referrers/[code]\` | GET | Lookup referrer by code |
| \`/api/leads\` | GET/POST | Lead management |
| \`/api/leads/attribution\` | GET | Lead source attribution |
| \`/api/leads/domains\` | GET | Lead domain tracking |
| \`/api/leads/visits\` | GET/POST | Website visit tracking |
| \`/api/team\` | GET/POST | Team member management |
| \`/api/team/[id]\` | GET/PUT/DELETE | Single team member |
| \`/api/team-applications\` | GET/POST | Job applications |
| \`/api/team-applications/upload\` | POST | Resume upload |
| \`/api/team-availability\` | GET/PUT | Team availability grid |
| \`/api/settings\` | GET/PUT | Tenant settings |
| \`/api/settings/services\` | GET/POST | Service type config |
| \`/api/settings/services/[id]\` | PUT/DELETE | Manage service type |
| \`/api/settings/team\` | GET/PUT | Team settings |
| \`/api/settings/page-config\` | GET/PUT | Dashboard page config |
| \`/api/setup-checklist\` | GET/PUT | Onboarding checklist |
| \`/api/sidebar-counts\` | GET | Sidebar badge counts |
| \`/api/tenants\` | GET/POST | Tenant management |
| \`/api/tenants/public\` | GET | Public tenant info |
| \`/api/google/auth\` | GET | Google OAuth start |
| \`/api/google/callback\` | GET | Google OAuth callback |
| \`/api/google/status\` | GET | Google connection status |
| \`/api/google/reviews\` | GET | Google reviews |
| \`/api/google/posts\` | GET/POST | Google Business posts |
| \`/api/social/accounts\` | GET | Social media accounts |
| \`/api/social/posts\` | GET/POST | Social media posts |
| \`/api/social/post\` | POST | Publish single post |
| \`/api/social/connect/facebook\` | GET | Facebook OAuth |
| \`/api/social/connect/instagram\` | GET | Instagram OAuth |
| \`/api/feedback\` | GET/POST | User feedback |
| \`/api/requests\` | GET/POST | Feature requests |
| \`/api/errors\` | POST | Client-side error logging |
| \`/api/audit\` | GET | Audit log |
| \`/api/security/events\` | GET | Security events |
| \`/api/changelog\` | GET | Changelog entries |
| \`/api/announcements/unread\` | GET | Unread announcements |
| \`/api/track\` | POST | Analytics event tracking |
| \`/api/unsubscribe\` | GET/POST | Email unsubscribe |
| \`/api/health\` | GET | Health check endpoint |`,
  },
  {
    id: 'selena-ai',
    title: 'Selena AI System',
    content: `Selena is the AI booking concierge powered by Anthropic Claude. She handles SMS and web chat conversations to book appointments end-to-end.

**State Machine Architecture:**
The booking flow is driven by a state machine in \`src/lib/selena.ts\`. States:
- \`greeting\` — Initial state, Selena introduces herself
- \`collecting\` — Gathering booking details one question at a time
- \`recap\` — All info collected, presenting summary for confirmation
- \`confirmed\` — Booking created, asking for rating
- \`rating\` — Client gave a rating, closing
- \`closed\` — Conversation complete

**Booking Checklist:**
The \`BookingChecklist\` JSONB object tracks all collected info:
- \`service_type\` — What service they need
- \`bedrooms\` / \`bathrooms\` — Size details
- \`rate\` — Selected hourly rate
- \`day\` / \`date\` / \`time\` — Scheduling
- \`name\` / \`phone\` / \`address\` / \`email\` — Client contact info
- \`notes\` — Special requests
- \`rating\` — Post-booking chat rating (1-5)
- \`channel\` — \`sms\` or \`web\`
- \`status\` — Current state machine state

**Collection Order:**
\`getNextStep()\` determines what to ask next in strict order:
1. service_type -> 2. bedrooms/bathrooms -> 3. rate -> 4. day -> 5. time -> 6. name -> 7. phone -> 8. address -> 9. email -> 10. notes -> recap

**Tool Definitions:**
Selena uses Claude tool_use to take actions:
- \`save_info\` — Save one or more checklist fields (partial update)
- \`create_client\` — Create a client record in the database
- \`check_availability\` — Check if a time slot is available
- \`create_booking\` — Create the booking and client, transition to confirmed
- \`add_to_waitlist\` — Add client to waitlist if preferred time unavailable

**System Prompt Structure:**
- Dynamic per-tenant: uses business name, active services, rates, hours, and payment methods from \`getSettings()\`
- Personality: warm, welcoming, one question per message, match client energy
- Includes the checklist prompt showing collected vs missing fields
- \`NEXT:\` instruction tells Selena exactly what to ask next

**Key Behaviors:**
- **Empty response fallback:** If Claude returns empty text, Selena generates a contextual fallback based on the next step
- **Recap loop fix:** After recap, if client says "yes", Selena calls \`create_booking\` immediately without re-recapping
- **Conversation reset:** If a conversation has been idle for 24+ hours, the checklist resets to \`greeting\`
- **Web chat returning client:** On web, if phone matches an existing client, Selena greets them by name and pre-fills known info
- **Quick replies:** Context-aware suggested responses shown as buttons (days, times, service types, etc.)

**Error Monitoring:**
- All Selena errors are logged via \`selenaError()\` which creates a notification of type \`selena_error\`
- Includes tenant ID, error context, stack trace snippet, and conversation ID
- Errors are visible in \`/admin/errors\``,
  },
  {
    id: 'database',
    title: 'Database',
    content: `All data lives in Supabase (PostgreSQL). Every table includes \`tenant_id\` for multi-tenant isolation.

**Key Tables:**

| Table | Purpose |
|-------|---------|
| \`tenants\` | Business accounts — name, domain, plan, status, settings, Telnyx/Resend keys |
| \`bookings\` | Appointments — client, team member, service, times, status, video URLs, pay |
| \`clients\` | Customer records — name, phone, email, address, lifecycle stage, tags |
| \`team_members\` | Staff — name, phone, email, PIN, pay_rate, role, availability |
| \`sms_conversations\` | SMS threads — phone, messages array, booking_checklist JSONB, status |
| \`notifications\` | In-app notifications — type, title, message, channel, read status |
| \`campaigns\` | Marketing campaigns — name, type (email/sms), content, recipients, status |
| \`referrals\` | Referral tracking — referrer, client, code, status, reward |
| \`reviews\` | Google/manual reviews — rating, text, source, reply, auto_replied |
| \`expenses\` | Business expenses — amount, category, date, notes |
| \`services\` | Service type definitions — name, duration, rate, active |
| \`schedules\` | Recurring booking schedules — client, day, time, frequency, paused |
| \`leads\` | Lead tracking — source, status, contact info, attribution |
| \`audit_logs\` | Action audit trail — who, what, when, details |
| \`security_events\` | Auth events — login attempts, suspicious activity |
| \`error_logs\` | Runtime errors — message, stack, context |
| \`push_subscriptions\` | Web push endpoints — subscription JSON, user |
| \`google_tokens\` | Google OAuth tokens — access, refresh, expiry per tenant |

**Key Columns on bookings:**
- \`walkthrough_video_url\` — Pre-service video URL (Supabase Storage)
- \`final_video_url\` — Post-service video URL
- \`walkthrough_video_url_uploaded_at\` / \`final_video_url_uploaded_at\` — Upload timestamps (used by cleanup cron)
- \`check_in_time\` / \`check_out_time\` — GPS-verified timestamps
- \`check_in_lat\` / \`check_in_lng\` / \`check_out_lat\` / \`check_out_lng\` — GPS coordinates
- \`actual_hours\` — Computed hours worked
- \`cleaner_pay\` — Calculated earnings for the team member
- \`hourly_rate\` — Client billing rate
- \`pay_rate\` — Team member pay rate
- \`status\` — pending, confirmed, in_progress, completed, cancelled, no_show

**booking_checklist JSONB Structure:**
Stored on \`sms_conversations.booking_checklist\`. Contains all Selena-collected booking data:
\`{ service_type, bedrooms, bathrooms, rate, day, date, time, name, phone, address, email, notes, rating, channel, status }\`

**Migrations:**
Located in \`src/lib/migrations/\`. Run via Supabase SQL editor.
- \`004_portal_auth_codes.sql\` — Client portal verification codes
- \`005_audit_logs.sql\` — Audit log table
- \`006_error_resilience.sql\` — Error tracking tables
- \`007_missing_tables.sql\` — Backfill missing tables
- \`008_missing_tables_and_columns.sql\` — Additional columns
- \`009_closeout_fields.sql\` — Booking closeout fields
- \`010_selena_checklist.sql\` — Selena booking checklist JSONB column`,
  },
  {
    id: 'team-portal',
    title: 'Team Portal',
    content: `The Team Portal is a mobile-first app at \`/team-portal\` for field workers (cleaners, technicians, etc.). It uses its own auth system separate from Clerk.

**PIN Authentication:**
- Team members log in with their phone number + 4-digit PIN
- \`/api/team-portal/auth\` verifies credentials against \`team_members\` table
- Returns a JWT token containing \`{ id, tid (tenant_id), name }\`
- All team-portal API routes verify this JWT via \`verifyToken()\`
- No Clerk dependency — works on any device without app install

**Check-In / Check-Out with GPS:**
- **Check-in:** Team member taps check-in on their assigned booking. Captures GPS coordinates (\`lat\`, \`lng\`) and timestamp. Sets booking status to \`in_progress\`.
- **Check-out:** Captures GPS + timestamp. Calculates hours worked and earnings. Sets booking status to \`completed\`.
- GPS coordinates stored as \`check_in_lat/lng\` and \`check_out_lat/lng\` on the booking record
- Admin can verify location against the client's address

**Video Walkthroughs:**
- Team members record walkthrough videos before starting work (condition documentation)
- Final videos recorded after completion (proof of quality)
- Uploaded via \`/api/team-portal/video-upload\` to Supabase Storage \`uploads\` bucket
- URLs stored as \`walkthrough_video_url\` and \`final_video_url\` on the booking
- Upload timestamps tracked for auto-cleanup

**15-Minute Alert:**
- Team member sends a 15-minute warning to the client via SMS
- Triggered via \`/api/team-portal/15min-alert\`
- Useful for notifying clients the team is arriving soon

**Earnings:**
- \`/api/team-portal/earnings\` returns historical earnings data
- Calculated from completed bookings: hours worked x pay_rate
- Team members can view daily, weekly, and monthly summaries

**Availability:**
- Team members set their weekly availability via the portal
- \`/api/team-portal/availability\` — GET to view, PUT to update
- Used by the scheduling system to match team members to bookings

**Job Board:**
- \`/api/team-portal/jobs\` — View assigned and open jobs
- \`/api/team-portal/jobs/claim\` — Claim an unassigned open job
- Team members can see job details, client address, and special notes

**Bilingual UI:**
- Interface supports English and Spanish
- Language toggle available in the portal header
- All labels, buttons, and instructions are translated

**Mobile Manifest:**
- PWA manifest configured for "Add to Home Screen"
- Works offline for viewing cached job details
- Push notifications for new job assignments`,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    content: `The notification system handles alerts across multiple channels.

**Notification Types:**
\`booking_confirmed\`, \`booking_reminder\`, \`booking_cancelled\`, \`booking_completed\`, \`check_in\`, \`check_out\`, \`payment_received\`, \`review_request\`, \`review_received\`, \`new_client\`, \`new_booking\`, \`schedule_paused\`, \`schedule_resumed\`, \`campaign_sent\`, \`referral_converted\`, \`team_member_added\`, \`daily_summary\`, \`lifecycle_change\`, \`follow_up\`, \`expense_added\`, \`payroll_paid\`, \`sms_received\`, \`sms_opt_out\`, \`sms_opt_in\`, \`team_confirmed\`, \`team_confirm_request\`, \`team_no_confirm_alert\`, \`client_confirm_request\`, \`pending_reminder\`, \`unpaid_team\`, \`payment_due\`, \`daily_ops_recap\`, \`daily_digest\`, \`booking_received\`

**Channels:**
- \`in_app\` — Stored in \`notifications\` table, shown in dashboard/portal notification center
- \`sms\` — Sent via Telnyx using tenant's Telnyx API key and phone number
- \`email\` — Sent via Resend with HTML templates
- \`push\` — Web Push notifications via \`/api/push/subscribe\`

**Core Function — \`notify()\`:**
Located in \`src/lib/notify.ts\`. Accepts \`{ tenantId, type, title, message, ... }\` and:
1. Creates an in-app notification record
2. Optionally sends SMS/email based on notification preferences
3. Uses type-specific email templates from \`email-templates.ts\`

**Email Templates:**
Pre-built HTML templates in \`src/lib/email-templates.ts\`:
- \`bookingReminderEmail\`, \`bookingConfirmationEmail\`, \`bookingReceivedEmail\`
- \`followUpEmail\`, \`dailySummaryEmail\`, \`dailyOpsRecapEmail\`
- \`notificationDigestEmail\`, \`reviewRequestEmail\`, \`paymentReceiptEmail\`

**SMS Templates:**
Located in \`src/lib/sms-templates.ts\`. Pre-formatted messages for common notifications.

**Real-Time Polling:**
- Dashboard uses \`use-poll.ts\` hook to poll for new notifications
- \`/api/sidebar-counts\` provides badge counts for unread items
- Notifications marked as read via PUT to \`/api/notifications\`

**Team Notifications:**
- \`notify-team.ts\` — Send notifications to all team members for a booking
- \`notify-team-member.ts\` — Send to a specific team member
- Used for job assignments, schedule changes, payment confirmations`,
  },
  {
    id: 'video-system',
    title: 'Video System',
    content: `The video system provides documentation of work performed via walkthrough and final videos.

**Upload Flow:**
1. Team member records video on their phone via the team portal
2. Video is uploaded via \`/api/team-portal/video-upload\` as multipart form data
3. File is stored in Supabase Storage \`uploads\` bucket under \`{tenant_id}/videos/{booking_id}/\`
4. The booking record is updated with the video URL and upload timestamp
5. Two video types: \`walkthrough\` (before) and \`final\` (after)

**General File Uploads:**
- \`/api/uploads\` handles general file uploads (images, documents)
- Also uses Supabase Storage \`uploads\` bucket
- Team application resumes uploaded via \`/api/team-applications/upload\`

**Storage:**
- All files stored in the Supabase \`uploads\` storage bucket
- Organized by tenant ID for isolation
- Public URLs generated for viewing

**30-Day Auto-Cleanup Cron:**
- \`/api/cron/cleanup-videos\` runs daily
- Finds all bookings with video URLs where \`uploaded_at\` is older than 30 days
- Deletes the file from Supabase Storage
- Sets the video URL column to null on the booking
- **Dispute protection:** If \`booking.notes\` contains \`[DISPUTE]\`, videos are NOT deleted
- This allows admins to flag disputed bookings to preserve video evidence

**Admin Video Viewer:**
- Admins can view videos from the booking detail page
- Videos are served directly from Supabase Storage public URLs
- Useful for quality checks and dispute resolution`,
  },
  {
    id: 'time-billing',
    title: 'Time & Billing',
    content: `The time tracking and billing system connects team check-in/check-out to payroll and client invoicing.

**Check-In/Check-Out Flow:**
1. Team member checks in via team portal -> \`/api/team-portal/checkin\`
2. System records \`check_in_time\` and GPS coordinates
3. Booking status changes to \`in_progress\`
4. Team member checks out -> \`/api/team-portal/checkout\`
5. System records \`check_out_time\` and GPS coordinates
6. Hours worked calculated: \`(check_out - check_in) / 3600000\`
7. Booking status changes to \`completed\`

**Earnings Calculation:**
- \`hours_worked = (check_out_time - check_in_time) / 3600000\` (milliseconds to hours)
- \`earnings = hours_worked * pay_rate\` (team member's rate)
- Both values rounded to 2 decimal places
- Returned in the checkout API response

**Two Rate System:**
- \`hourly_rate\` — What the client pays (client billing rate)
- \`pay_rate\` — What the team member earns (team member pay rate)
- The difference is the business margin

**Booking Closeout:**
- \`/api/bookings/closeout\` handles end-of-day closeout
- Updates final hours, pay, and billing amounts
- Triggers payment processing if auto-billing is enabled

**Finance Module:**
- \`/api/finance/revenue\` — Revenue reporting by period
- \`/api/finance/expenses\` — Track business expenses
- \`/api/finance/payroll\` — Payroll summaries and payments
- Admin finance page at \`/admin/finance\` shows cross-tenant financials`,
  },
  {
    id: 'onboarding',
    title: 'Onboarding Guide',
    content: `**Adding a New Tenant:**

1. Log in to \`/admin\` with your admin PIN
2. Navigate to \`/admin/businesses\` and click "Add Business"
3. Fill in business name, industry, contact info, and plan (Starter/Growth/Pro)
4. The system creates a tenant record in the \`tenants\` table
5. Optionally generate an onboarding invite link via \`/admin/invites\`

**Tenant Onboarding Flow:**
1. Business owner receives invite link or is set up directly by admin
2. They create a Clerk account (linked to the tenant via user metadata)
3. They land on \`/dashboard\` with the setup checklist
4. Setup checklist tracked via \`/api/setup-checklist\`

**Setup Checklist Steps:**
- Business details (name, address, phone, hours of operation)
- Configure services and pricing (\`/api/settings/services\`)
- Add team members with PINs (\`/api/team\`)
- Connect Google Business Profile (optional — \`/api/google/auth\`)
- Connect social media accounts (optional — \`/api/social/connect/*\`)
- Set up Telnyx for SMS (add API key and phone number to tenant settings)
- Set up Resend for email (add API key to tenant settings)
- Configure notification preferences
- Connect Stripe for payments

**Post-Onboarding Checklist:**
- Verify Google Business Profile is syncing reviews (check \`/api/cron/sync-google-reviews\`)
- Test Selena by sending an SMS to the tenant's Telnyx number
- Confirm booking notifications are sending (SMS + email)
- Check the client portal URL (\`/portal?t={tenant_id}\`)
- Verify team members can log in to team portal with their PINs
- Set up cron jobs in Vercel (reminders, daily-summary, cleanup-videos, etc.)
- Review the \`/admin/system-check\` page for any issues`,
  },
  {
    id: 'environment-variables',
    title: 'Environment Variables',
    content: `All environment variables go in \`.env.local\` (local dev) and Vercel project settings (production).

**Supabase (Required):**
- \`NEXT_PUBLIC_SUPABASE_URL\` — Supabase project URL
- \`NEXT_PUBLIC_SUPABASE_ANON_KEY\` — Supabase anon/public key
- \`SUPABASE_SERVICE_ROLE_KEY\` — Supabase service role key (server-side only, full access)

**Clerk (Required):**
- \`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY\` — Clerk publishable key
- \`CLERK_SECRET_KEY\` — Clerk secret key
- \`SUPER_ADMIN_CLERK_ID\` — Clerk user ID for the super admin account

**Admin Auth:**
- \`ADMIN_PIN\` — PIN code for admin dashboard access
- \`ADMIN_JWT_SECRET\` — Secret for signing admin JWT tokens

**Telnyx (SMS):**
- Per-tenant: \`telnyx_api_key\` and \`telnyx_phone\` stored on the tenant record
- Platform-level Telnyx config not needed — each tenant brings their own

**Resend (Email):**
- Per-tenant: \`resend_api_key\` stored on the tenant record
- Each tenant can have their own Resend API key and sending domain

**Stripe (Payments):**
- \`STRIPE_SECRET_KEY\` — Stripe secret key
- \`STRIPE_WEBHOOK_SECRET\` — Webhook signing secret
- \`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY\` — Client-side Stripe key

**Anthropic (AI):**
- \`ANTHROPIC_API_KEY\` — API key for Claude (Selena AI)

**Cron:**
- \`CRON_SECRET\` — Bearer token for authenticating cron job requests

**Google (Optional):**
- \`GOOGLE_CLIENT_ID\` — Google OAuth client ID
- \`GOOGLE_CLIENT_SECRET\` — Google OAuth client secret
- \`GOOGLE_REDIRECT_URI\` — OAuth callback URL

**Push Notifications (Optional):**
- \`NEXT_PUBLIC_VAPID_PUBLIC_KEY\` — VAPID public key
- \`VAPID_PRIVATE_KEY\` — VAPID private key

**Other:**
- \`NEXT_PUBLIC_APP_URL\` — Base URL of the application
- \`NEXT_PUBLIC_SITE_URL\` — Public-facing site URL`,
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    content: `**Common Issues:**

**"Tenant not found" errors**
- Check that the user has a valid \`tenant_id\` in their Clerk user metadata
- Verify the tenant exists in the \`tenants\` table and has \`status = 'active'\`
- If using admin impersonation, ensure \`fl_impersonate\` cookie is set and \`admin_token\` is valid
- Check \`getTenantForRequest()\` in \`src/lib/tenant-query.ts\` for the full resolution logic

**Selena AI Errors**
- Check \`/admin/errors\` for \`selena_error\` notifications with stack traces
- "Empty response" — Claude returned no text. The fallback handler should generate one based on the next step. If recurring, check the system prompt and checklist state.
- "Recap loop" — Selena keeps recapping instead of creating the booking. The fix is in the \`recap\` state handler: if client says "yes", call \`create_booking\` immediately.
- "Conversation stuck" — Checklist may have invalid state. Check \`sms_conversations.booking_checklist\` in Supabase. Reset status to \`greeting\` to restart.
- "Tool call failed" — Check that the tool result was processed. Look for \`create_booking\` or \`save_info\` errors in the conversation log.
- Selena not responding to SMS — Verify the tenant's \`telnyx_api_key\` and \`telnyx_phone\` are set and the Telnyx webhook URL points to \`/api/webhooks/telnyx\`.

**Video Upload Issues**
- "File too large" — Supabase Storage has a 50MB default limit. Check Supabase dashboard storage settings.
- "Upload failed" — Verify the \`uploads\` bucket exists in Supabase Storage and has the correct policies.
- Videos not appearing — Check that the booking record was updated with the URL. Look at \`walkthrough_video_url\` or \`final_video_url\` columns.
- Videos disappearing — The \`cleanup-videos\` cron deletes videos after 30 days. Add \`[DISPUTE]\` to booking notes to prevent deletion.

**SMS Delivery Issues**
- Verify the tenant's Telnyx API key is valid and has SMS capabilities
- Check that the \`telnyx_phone\` number is provisioned and active
- Look at Telnyx dashboard for delivery errors
- Verify the webhook URL in Telnyx portal points to \`/api/webhooks/telnyx\`
- Check for opt-outs: if a client has opted out, SMS will fail silently
- International numbers may require additional Telnyx configuration

**Email Delivery Issues**
- Verify the tenant's Resend API key is valid
- Check Resend dashboard for bounces and complaints
- Webhook at \`/api/webhooks/resend\` logs delivery events
- Verify the sending domain is verified in Resend

**Team Portal Issues**
- "Invalid PIN" — Check the \`team_members\` table for the correct PIN
- GPS not working — Browser needs location permission. HTTPS required.
- Video recording not working — Browser needs camera/microphone permission. HTTPS required.
- JWT expired — Team portal tokens expire. Member needs to log in again.

**Google Business Profile not syncing**
- Ensure OAuth tokens haven't expired — re-authorize via \`/admin/google-profile\`
- Check that the Google My Business API is enabled in the Cloud Console
- Verify the \`google_tokens\` table has valid refresh tokens
- The \`sync-google-reviews\` cron runs every 6 hours — check its logs

**Booking Notifications not sending**
- Verify Telnyx and Resend credentials on the tenant record
- Check the \`notification_preferences\` for the tenant in settings
- Look at Vercel function logs for errors in the notification handlers
- Verify the \`notify()\` function is being called with the correct \`tenantId\`

**Admin Dashboard showing stale data**
- Most admin views fetch fresh data on page load
- Clear browser cache if you see outdated counts
- Check Supabase dashboard for any database connection issues
- The \`sidebar-counts\` endpoint is polled — check it's returning fresh data

**Deployment Issues**
- Ensure ALL environment variables are set in Vercel (see Environment Variables section)
- Check build logs for TypeScript errors — run \`npm run build\` locally first
- Verify cron jobs are configured in \`vercel.json\` with the correct schedule
- Check that the \`CRON_SECRET\` matches between Vercel env vars and cron config
- After deploying, verify \`/api/health\` returns 200`,
  },
]

export default function AdminDocsPage() {
  const [search, setSearch] = useState('')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['getting-started']))

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const expandAll = () => setExpandedSections(new Set(sections.map(s => s.id)))
  const collapseAll = () => setExpandedSections(new Set())

  const filtered = sections.filter(s => {
    if (!search) return true
    const q = search.toLowerCase()
    return s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q)
  })

  const renderMarkdown = (text: string) => {
    const lines = text.split('\n')
    const elements: React.ReactNode[] = []
    let inTable = false
    let tableHeaders: string[] = []
    let tableRows: string[][] = []

    const processInline = (line: string): React.ReactNode => {
      const parts: React.ReactNode[] = []
      let remaining = line
      let key = 0

      while (remaining) {
        // Code
        const codeMatch = remaining.match(/`([^`]+)`/)
        if (codeMatch && codeMatch.index !== undefined) {
          if (codeMatch.index > 0) {
            parts.push(<span key={key++}>{processBold(remaining.slice(0, codeMatch.index))}</span>)
          }
          parts.push(
            <code key={key++} className="bg-gray-100 text-teal-700 px-1.5 py-0.5 rounded text-xs font-mono">
              {codeMatch[1]}
            </code>
          )
          remaining = remaining.slice(codeMatch.index + codeMatch[0].length)
          continue
        }
        parts.push(<span key={key++}>{processBold(remaining)}</span>)
        break
      }
      return parts
    }

    const processBold = (text: string): React.ReactNode => {
      const parts: React.ReactNode[] = []
      let remaining = text
      let key = 0
      while (remaining) {
        const boldMatch = remaining.match(/\*\*([^*]+)\*\*/)
        if (boldMatch && boldMatch.index !== undefined) {
          if (boldMatch.index > 0) parts.push(remaining.slice(0, boldMatch.index))
          parts.push(<strong key={key++} className="font-semibold text-slate-900">{boldMatch[1]}</strong>)
          remaining = remaining.slice(boldMatch.index + boldMatch[0].length)
          continue
        }
        parts.push(remaining)
        break
      }
      return parts
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()

      // Table detection
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const cells = trimmed.split('|').filter(c => c.trim()).map(c => c.trim())
        if (!inTable) {
          inTable = true
          tableHeaders = cells
          continue
        }
        if (cells.every(c => /^[-:]+$/.test(c))) continue
        tableRows.push(cells)
        continue
      }

      // Flush table
      if (inTable) {
        elements.push(
          <div key={`table-${i}`} className="border border-gray-200 rounded-lg overflow-hidden mb-3 overflow-x-auto">
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-600">
                  {tableHeaders.map((h, j) => (
                    <th key={j} className="px-3 py-2 font-medium text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tableRows.map((row, j) => (
                  <tr key={j} className="hover:bg-gray-50">
                    {row.map((cell, k) => (
                      <td key={k} className="px-3 py-2 text-gray-700">{processInline(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
        inTable = false
        tableHeaders = []
        tableRows = []
      }

      if (!trimmed) {
        elements.push(<div key={i} className="h-2" />)
        continue
      }

      // Numbered list
      const numMatch = trimmed.match(/^(\d+)\.\s+(.+)/)
      if (numMatch) {
        elements.push(
          <div key={i} className="flex gap-2 ml-1 mb-1">
            <span className="text-teal-600 font-semibold text-sm min-w-[1.25rem]">{numMatch[1]}.</span>
            <span className="text-sm text-gray-700">{processInline(numMatch[2])}</span>
          </div>
        )
        continue
      }

      // Bullet list
      if (trimmed.startsWith('- ')) {
        elements.push(
          <div key={i} className="flex gap-2 ml-1 mb-1">
            <span className="text-teal-600 mt-1.5 text-[6px]">&#9679;</span>
            <span className="text-sm text-gray-700">{processInline(trimmed.slice(2))}</span>
          </div>
        )
        continue
      }

      // Regular paragraph
      elements.push(
        <p key={i} className="text-sm text-gray-700 mb-1">{processInline(trimmed)}</p>
      )
    }

    // Flush any remaining table
    if (inTable) {
      elements.push(
        <div key="table-end" className="border border-gray-200 rounded-lg overflow-hidden mb-3 overflow-x-auto">
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-600">
                {tableHeaders.map((h, j) => (
                  <th key={j} className="px-3 py-2 font-medium text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tableRows.map((row, j) => (
                <tr key={j} className="hover:bg-gray-50">
                  {row.map((cell, k) => (
                    <td key={k} className="px-3 py-2 text-gray-700">{processInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    return elements
  }

  return (
    <main className="p-3 md:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Documentation</h1>
        <p className="text-sm text-gray-500 mt-1">Internal knowledge base and reference guides — {sections.length} sections</p>
      </div>

      {/* Search and controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search documentation..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-teal-600 outline-none flex-1"
        />
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Table of contents */}
      <div className="mb-6 bg-gray-50 rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Table of Contents</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1">
          {sections.map((s, i) => (
            <button
              key={s.id}
              onClick={() => {
                setExpandedSections(prev => new Set([...prev, s.id]))
                document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="text-left text-sm text-teal-700 hover:text-teal-900 hover:underline px-2 py-1 rounded"
            >
              {i + 1}. {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* Sections */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No results found</h3>
          <p className="text-gray-400 text-sm">Try a different search term.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(section => {
            const isExpanded = expandedSections.has(section.id)
            return (
              <div key={section.id} id={`section-${section.id}`} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <h2 className="text-base font-semibold text-slate-900">{section.title}</h2>
                  <span className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    &#9660;
                  </span>
                </button>
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                    {renderMarkdown(section.content)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Quick links */}
      <div className="mt-8 bg-teal-50 border border-teal-100 rounded-xl p-5">
        <h3 className="font-semibold text-slate-900 mb-3">Quick Links</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {[
            { label: 'Admin Dashboard', href: '/admin' },
            { label: 'All Businesses', href: '/admin/businesses' },
            { label: 'Bookings', href: '/admin/bookings' },
            { label: 'Clients', href: '/admin/clients' },
            { label: 'Team', href: '/admin/team' },
            { label: 'Finance', href: '/admin/finance' },
            { label: 'Google Profiles', href: '/admin/google-profile' },
            { label: 'Social Media', href: '/admin/social' },
            { label: 'Selena AI', href: '/admin/ai' },
            { label: 'SMS Inbox', href: '/admin/sms' },
            { label: 'Email', href: '/admin/email' },
            { label: 'Leads', href: '/admin/leads' },
            { label: 'Referrals', href: '/admin/referrals' },
            { label: 'Marketing', href: '/admin/marketing' },
            { label: 'Notifications', href: '/admin/notifications' },
            { label: 'Analytics', href: '/admin/analytics' },
            { label: 'Security', href: '/admin/security' },
            { label: 'Platform Settings', href: '/admin/settings' },
            { label: 'System Status', href: '/admin/status' },
            { label: 'Error Log', href: '/admin/feedback' },
            { label: 'Changelog', href: '/admin/changelog' },
          ].map(link => (
            <a
              key={link.href}
              href={link.href}
              className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-teal-100 text-sm text-teal-700 hover:bg-teal-100 transition-colors font-medium"
            >
              <span className="text-teal-600">&#8594;</span>
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </main>
  )
}
