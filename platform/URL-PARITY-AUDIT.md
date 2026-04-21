# URL Parity Audit: nycmaid → fullloop CRM

**Audit Date:** 2026-04-21  
**Status:** ⚠️ NOT SAFE TO CUTOVER — Critical mismatches require fixes first

---

## Executive Summary

| Metric | Count |
|---|---|
| Nycmaid Routes | 224 |
| Fullloop Routes | 505 |
| Missing from Fullloop | 83 |
| Extra in Fullloop | 364 |
| Critical Issues Found | 3 (webhooks + portal auth) |

**Verdict:** Cutover will cause **immediate 404s** on:
- All Stripe/Telnyx/Resend webhooks (URL format changed)
- Client login flow (`/api/client/*` endpoints missing)
- Public booking APIs (`/api/client/book`, `/api/client/verify-code`)

---

## 1. PUBLIC PAGES

### Critical Pages Status

| Page Type | Nycmaid URL | Fullloop URL | Status | Impact |
|---|---|---|---|---|
| **Portal Home** | `/portal` | `/portal` | ✓ MATCH | Low |
| **Team Hub** | `/team` | `/team` | ✓ MATCH | Low |
| **Team Invite** | `/team/[token]` | ❌ MISSING | 🔴 HIGH | Team onboarding breaks |
| **Booking** | `/book` | ❌ MISSING | 🔴 HIGH | Public cannot book |
| **New Booking** | `/book/new` | ❌ MISSING | 🔴 HIGH | Booking flow breaks |
| **Booking Dashboard** | `/book/dashboard` | ❌ MISSING | 🔴 MED | Booking history unavailable |
| **Collect Payment** | `/book/collect` | ❌ MISSING | 🔴 HIGH | Payment collection fails |
| **Review Submit** | `/reviews/submit` | `/reviews/submit` | ✓ MATCH | Low |
| **Referral Page** | `/referral` | `/referral` | ✓ MATCH | Low |
| **Unsubscribe** | `/unsubscribe` | `/unsubscribe` | ✓ MATCH | Low |

### SEO/Marketing Pages

| Content Type | Nycmaid URL | Status | Fullloop Equivalent |
|---|---|---|---|
| Homepage | `/` | ✓ MATCH | `/` |
| About Us | `/about-the-nyc-maid-service-company` | ❌ MISSING | `/about-full-loop-crm` or `/site/about` |
| Services | `/nyc-maid-service-services-offered-by-the-nyc-maid` | ❌ MISSING | `/site/services/[slug]` |
| Service Areas | `/service-areas-served-by-the-nyc-maid` | ❌ MISSING | `/site/areas/[slug]` |
| FAQ | `/nyc-cleaning-service-frequently-asked-questions-in-2025` | ❌ MISSING | `/full-loop-crm-frequently-asked-questions` |
| Blog | `/nyc-maid-service-blog` | ❌ MISSING | `/site/nyc-maid-service-blog` |
| Careers | `/available-nyc-maid-jobs` | ❌ MISSING | `/site/careers` |
| Chat with Selena | `/chat-with-selena` | ❌ MISSING | `/site/chat-with-selena` |
| Contact | `/contact-the-nyc-maid-service-today` | ❌ MISSING | `/contact` or `/site/contact` |
| Privacy | `/privacy-policy` | ✓ MATCH | `/privacy-policy` |
| Terms | `/terms-conditions` | ✓ MATCH | `/terms` |
| Refund Policy | `/refund-policy` | ✓ MATCH | `/refund-policy` |

---

## 2. ADMIN PAGES

**Status:** Most admin routes present in fullloop with similar structure.

| Nycmaid URL | Fullloop URL | Status | Notes |
|---|---|---|---|
| `/admin` | `/admin` | ✓ MATCH | Both have main admin dashboard |
| `/admin/analytics` | `/admin/analytics` | ✓ MATCH | |
| `/admin/bookings` | `/admin/bookings` | ✓ MATCH | |
| `/admin/calendar` | `/admin/calendar` | ✓ MATCH | |
| `/admin/clients` | `/admin/clients` | ✓ MATCH | |
| `/admin/finance` | `/admin/finance` | ✓ MATCH | |
| `/admin/leads` | `/admin/leads` | ✓ MATCH | |
| `/admin/marketing` | `/admin/marketing` | ✓ MATCH | |
| `/admin/reviews` | `/admin/reviews` | ✓ MATCH | |
| `/admin/sales` | `/admin/sales` | ✓ MATCH | |
| `/admin/settings` | `/admin/settings` | ✓ MATCH | |
| `/admin/team` | `/admin/team` | ✓ MATCH | But see `/admin/team/page.tsx` vs `/admin/tenants` |
| `/admin/selena` | ✓ PARTIAL | Selena is split across pages | `/admin/social`, `/admin/sms` in fullloop |
| `/admin/websites` | `/admin/websites` | ✓ MATCH | |

**Admin Gap:** nycmaid has `/admin/google`, `/admin/referrals` — confirm fullloop equivalents exist or port logic.

---

## 3. API ROUTES

### 🔴 CRITICAL: Webhook URLs Changed

**THE ISSUE:** Nycmaid uses `/api/webhook/*` (singular). Fullloop uses `/api/webhooks/*` (plural).

| Provider | Nycmaid URL | Fullloop URL | Status | Action |
|---|---|---|---|---|
| **Stripe** | `/api/stripe/webhook` | `/api/webhooks/stripe` | 🔴 CHANGED | **UPDATE Stripe Dashboard** |
| **Telnyx** | `/api/webhook/telnyx` | `/api/webhooks/telnyx` | 🔴 CHANGED | **UPDATE Telnyx Dashboard** |
| **Resend** | `/api/webhook/resend` | `/api/webhooks/resend` | 🔴 CHANGED | **UPDATE Resend Dashboard** |
| **Clerk** | ❌ MISSING | `/api/webhooks/clerk` | N/A | Fullloop-only |

**DEADLINE:** Before domain flip, update these webhook URLs in:
1. Stripe Dashboard → Settings → Webhooks → Endpoint URL
2. Telnyx Console → Messaging → Webhooks
3. Resend Dashboard → Webhooks → Endpoint

If not updated, all payment confirmations, SMS delivery statuses, and emails will fail silently.

---

### 🔴 CRITICAL: Portal/Client Auth APIs Missing

| Purpose | Nycmaid URL | Fullloop URL | Status | Breaks |
|---|---|---|---|---|
| Client Login | `/api/client/login` | `/api/portal/auth` | 🔴 RENAMED | Client cannot login |
| Send Code | `/api/client/send-code` | ❌ Check `/api/portal/auth` | ❌ MISSING | SMS code delivery broken |
| Verify Code | `/api/client/verify-code` | ❌ MISSING | ❌ MISSING | Client auth fails |
| Book Appointment | `/api/client/book` | `/api/portal/bookings` (POST) | 🟡 RENAMED | Public booking breaks |
| Get Bookings | `/api/client/bookings` | `/api/portal/bookings` (GET) | 🟡 RENAMED | Booking history unavailable |
| Reschedule | `/api/client/reschedule/[id]` | ❌ MISSING | ❌ MISSING | Client cannot reschedule |

**The Mismatch:**
- Nycmaid: `POST /api/client/book` to create booking
- Fullloop: `POST /api/portal/bookings` to create booking

Frontend must be updated to hit correct endpoint.

---

### Other Critical APIs

| Purpose | Nycmaid | Fullloop | Status | Priority |
|---|---|---|---|---|
| **Public Reviews** | `/api/reviews/submit` | `/api/reviews/submit` | ✓ MATCH | Low |
| **Team Check-in** | `/api/team/[token]/check-in` | `/api/team-portal/checkin` | 🟡 RENAMED | MED |
| **Team Check-out** | `/api/team/[token]/check-out` | `/api/team-portal/checkout` | 🟡 RENAMED | MED |
| **Auth (Admin)** | `/api/auth/*` | `/api/admin-auth/*` | 🟡 RENAMED | MED |
| **Referral Track** | `/api/referral-commissions` | `/api/referral-commissions` | ✓ MATCH | Low |
| **Unsubscribe** | `/api/unsubscribe` | `/api/unsubscribe` | ✓ MATCH | Low |

---

## 4. CRITICAL MISMATCHES & ACTION ITEMS

### A. 🔴 BLOCKING: Webhook URL Format

**What breaks:** Payment processing, SMS delivery, email bounces — all external service callbacks.

**When it breaks:** The moment domain flips, webhooks start 404ing on external services.

**Priority:** CRITICAL (must fix before cutover)

**Fix Steps:**
1. Confirm fullloop `/api/webhooks/[provider]` routes are live and receiving payloads
2. In **Stripe Dashboard** → Settings → Webhooks → Update endpoint from `nycmaid.com/api/stripe/webhook` to `nycmaid.com/api/webhooks/stripe`
3. In **Telnyx Console** → Messaging → Webhooks → Update URL to `nycmaid.com/api/webhooks/telnyx`
4. In **Resend Dashboard** → Webhooks → Update to `nycmaid.com/api/webhooks/resend`
5. Test with a small test transaction (send SMS, create Stripe charge) before full cutover

---

### B. 🔴 BLOCKING: Client Booking API Renamed

**What breaks:** Public customers cannot book appointments via the web portal.

**Why:** Nycmaid frontend calls `POST /api/client/book` and `GET /api/client/bookings`. Fullloop routes are `/api/portal/bookings`.

**Priority:** CRITICAL (public revenue)

**Fix Steps:**
1. Verify fullloop's `/api/portal/bookings` POST handler creates bookings the same way
2. Audit frontend code in nycmaid for hardcoded `/api/client/*` calls
3. Either:
   - **Option A:** Create NextJS redirect in fullloop: `GET /api/client/book → /api/portal/bookings`
   - **Option B:** Update frontend to call `/api/portal/bookings` directly (requires FE rebuild)
4. Test full booking flow end-to-end (select date → pay → confirmation) 

---

### C. 🟡 HIGH: Team Invite Link Missing

**What breaks:** New team members cannot accept invites.

**Why:** Nycmaid route `/team/[token]/page.tsx` (team member sign-up) not found in fullloop.

**Priority:** HIGH (onboarding blocker)

**Fix:** Search fullloop for equivalent — likely renamed to `/site/[slug]/[service]` pattern. Port or add redirect.

---

### D. 🟡 HIGH: Public Booking Pages Missing

**What breaks:** Clients clicking "Book Now" get 404 for `/book`, `/book/new`.

**Why:** Fullloop may have restructured into `/portal/book` or `/site/book`.

**Priority:** HIGH (conversion funnel)

**Fix Steps:**
1. Confirm fullloop's public booking entry point URL
2. If different, add 301 redirect: `nycmaid.com/book → nycmaid.com/[fullloop-book-path]`
3. Or, copy nycmaid's `/book/page.tsx` into fullloop tree if not present

---

### E. 🟡 MED: Team Member APIs Renamed

**What breaks:** Team member check-in/check-out and job claiming breaks after cutover.

**Why:** Nycmaid uses `/api/team/[token]/check-in`; fullloop uses `/api/team-portal/checkin`.

**Priority:** MED (team productivity)

**Fix:** Update team member frontend to call correct endpoint or add proxies.

---

### F. 🟡 MED: SEO Landing Pages Not Ported

**What breaks:** Google organic traffic lands on 404. SEO rankings tank.

**Why:** Nycmaid has long-tail neighborhood pages, service pages, blog — fullloop may have different slug structure.

**Priority:** MED (SEO, not immediate revenue)

**Examples missing in fullloop:**
- `/about-the-nyc-maid-service-company`
- `/service-areas-served-by-the-nyc-maid`
- `/nyc-cleaning-service-frequently-asked-questions-in-2025`
- `/chat-with-selena` (exists in fullloop as `/site/chat-with-selena` — confirm)

**Fix:** Add 301 redirects for any high-traffic pages identified in Google Analytics.

---

## 5. BOTTOM LINE

**Is the cutover safe as-is?** NO.

**What will break immediately (within 1 hour of domain flip):**
1. All Stripe, Telnyx, Resend webhooks → external services get 404
2. Clients trying to book via `/book` → 404
3. Clients logging in at `/api/client/login` → endpoint not found

**What will break within 24 hours:**
- Team check-in/check-out system stops working
- Organic search traffic lands on 404s
- Referral tracking may fail if endpoint structure changed

**MUST DO before cutover:**
1. ✅ **Update webhook URLs in Stripe, Telnyx, Resend dashboards** (singular → plural)
2. ✅ **Verify `/api/portal/bookings` handles all client booking flows**
3. ✅ **Confirm `/api/portal/auth` is the new client login endpoint**
4. ✅ **Port or redirect `/book`, `/book/new`, `/book/collect` pages**
5. ✅ **Port or redirect `/team/[token]` invite acceptance**
6. ✅ **Add 301 redirects for top 10 nycmaid URLs (check Analytics)**
7. ✅ **Smoke test: booking flow, team check-in, SMS delivery, Stripe charge**

**Estimated time to safe cutover:** 4–8 hours (assuming no structural changes needed).

---

## 6. RISK MATRIX

| Issue | Likelihood | Severity | Priority | Time to Fix |
|---|---|---|---|---|
| Webhooks 404 | 100% | CRITICAL | P0 | 30 min |
| Client login fails | 100% | CRITICAL | P0 | 1–2 hr |
| Public booking breaks | 100% | CRITICAL | P0 | 1–2 hr |
| Team onboarding broken | High | HIGH | P1 | 1–2 hr |
| SEO traffic 404s | High | MED | P2 | 2–4 hr |
| Team check-in fails | MED | HIGH | P1 | 1 hr |

---

**Next Step:** Schedule pre-cutover validation window. Minimal changes needed if fullloop structure is confirmed to match nycmaid above.
