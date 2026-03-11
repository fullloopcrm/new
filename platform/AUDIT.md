# FullLoop CRM — Exhaustive Platform Audit

**Date:** 2026-03-11
**Scope:** Every file in the platform — API routes, frontend pages, lib utilities, schema, config, portals, cron jobs, webhooks, AI, billing, marketing

---

## CATEGORY 1: AUTHENTICATION & SESSION MANAGEMENT (1-60)

1. **Middleware auth bypass** — checks cookie PRESENCE but doesn't verify `admin_token` signature/expiry (`src/middleware.ts`)
2. **In-memory rate limiting resets on deploy** — admin PIN login uses Map that clears on serverless cold start (`src/app/api/admin-auth/route.ts`)
3. **In-memory rate limiting resets on deploy** — portal auth uses Map that clears on cold start (`src/app/api/portal/auth/route.ts`)
4. **In-memory rate limiting resets on deploy** — team portal auth uses Map that clears on cold start (`src/app/api/team-portal/auth/route.ts`)
5. **Single shared admin PIN** — `ADMIN_PIN=020179` is shared across all admins, no per-admin credentials (`src/app/api/admin-auth/route.ts`)
6. **Admin PIN only 6 digits** — 1 million combinations, brute-forceable with IP rotation (`src/app/api/admin-auth/route.ts`)
7. **Team member PIN only 4 digits** — 9000 combinations, trivially brute-forceable (`src/app/api/team-portal/auth/route.ts`)
8. **Portal auth code uses Math.random()** — not cryptographically secure (`src/app/api/portal/auth/route.ts:23`)
9. **Team PIN auto-generated with Math.random()** — not cryptographically secure (`src/app/api/team/route.ts:52`)
10. **No PIN uniqueness per tenant** — two team members can have same PIN (`src/app/api/team/route.ts`)
11. **Portal token valid 24 hours** — too long for client portal, should be 1-4 hours (`src/app/api/portal/auth/route.ts:27`)
12. **Team portal token valid 24 hours** — too long for team portal (`src/app/api/team-portal/auth/route.ts:22`)
13. **Admin token valid 24 hours** — excessive for sensitive operations (`src/app/api/admin-auth/route.ts:34`)
14. **Portal token contains plaintext tenant_id and client_id** — base64 decodable, reveals UUIDs (`src/app/api/portal/auth/route.ts:26-29`)
15. **Team portal token contains pay_rate** — wage info exposed in base64 token (`src/app/api/team-portal/auth/route.ts:22`)
16. **No session invalidation endpoint** — portal/team tokens can't be revoked until expiry
17. **No idle timeout** — abandoned browsers stay logged in until cookie expires
18. **Admin logout doesn't clear impersonation cookie** — `fl_impersonate` persists after admin logout (`src/app/api/admin-auth/logout/route.ts`)
19. **Impersonation cookie not bound to admin session** — cookie is just tenantId, not cryptographically linked to admin_token (`src/app/api/admin/impersonate/route.ts`)
20. **Impersonation grants owner role always** — all impersonating admins get full owner permissions (`src/lib/tenant-query.ts:35`)
21. **Impersonation cookie has no HttpOnly flag** — accessible to JavaScript if XSS exists (`src/middleware.ts:55`)
22. **Impersonation not rate limited** — can rapidly switch tenants (`src/middleware.ts:54-67`)
23. **No IP binding on admin token** — stolen token usable from any IP
24. **No IP binding on portal/team tokens** — stolen token usable from any IP
25. **Cookie secure flag only in production** — admin_token sent over HTTP in development (`src/app/api/admin-auth/route.ts:79`)
26. **SameSite=lax instead of strict** — vulnerable to some CSRF scenarios on sensitive operations
27. **No CSRF token validation on any endpoint** — all POST/PUT/DELETE lack CSRF protection
28. **No CSRF on portal auth** — cross-site form submission possible (`src/app/api/portal/auth/route.ts`)
29. **No CSRF on team portal auth** — cross-site form submission possible (`src/app/api/team-portal/auth/route.ts`)
30. **Account enumeration on portal** — "No account found with this phone number" reveals registered phones (`src/app/api/portal/auth/route.ts:83`)
31. **Account enumeration on team portal** — "Invalid PIN" reveals valid slug/phone combos (`src/app/api/team-portal/auth/route.ts:74`)
32. **Account enumeration on invites** — "An active invite already exists" reveals pending invites (`src/app/api/admin/invites/route.ts:41`)
33. **SMS code not rate limited per phone** — attacker can flood phones with codes (`src/app/api/portal/auth/route.ts:58`)
34. **No SMS delivery verification** — if SMS fails, API still returns success (`src/app/api/portal/auth/route.ts:119`)
35. **Portal code expiration not enforced server-side** — expired codes stay in portal_auth_codes table (`src/app/api/portal/auth/route.ts:101`)
36. **No login attempt logging** — failed auth attempts not recorded for forensics
37. **No failed PIN attempt logging** — brute force attacks undetectable
38. **Portal auth stores localStorage** — XSS can steal auth token (`src/app/portal/layout.tsx`)
39. **Team auth stores localStorage** — XSS can steal auth token (`src/app/team/layout.tsx`)
40. **Client phone normalization inconsistent** — `+1-234` vs `1234` may not match (`src/app/api/portal/auth/route.ts:79`)
41. **No code complexity validation** — codes like 111111 or 123456 are allowed (`src/app/api/portal/auth/route.ts:23`)
42. **Multiple active codes per phone** — user can request unlimited codes (`src/app/api/portal/auth/route.ts`)
43. **Google OAuth state parameter is just tenantId** — no CSRF token, predictable (`src/app/api/google/auth/route.ts:26`)
44. **Google OAuth callback doesn't validate state** — CSRF attack possible (`src/app/api/google/callback/route.ts:8`)
45. **Google OAuth redirect_uri not validated** — if baseUrl is compromised, token captured (`src/app/api/google/callback/route.ts:25`)
46. **Google tokens stored unencrypted** — plaintext refresh tokens in Supabase (`src/app/api/admin/google/callback/route.ts:45-52`)
47. **Invite acceptance doesn't verify email** — Bob can accept Alice's invite (`src/app/join/[token]/page.tsx:60-76`)
48. **Invite role not validated** — arbitrary role string accepted (`src/app/api/admin/invites/route.ts:13-53`)
49. **Join token race condition** — two simultaneous requests both accept same invite (`src/app/join/[token]/accept/page.tsx:48-51`)
50. **No duplicate invite check across tenants** — same person invited to unlimited tenants
51. **Email case normalization inconsistent** — lowercase in some places, not others (`src/app/api/admin/invites/route.ts:35`)
52. **Clerk webhook no signature verification** — accepts forged events (`src/app/api/webhooks/clerk/route.ts`)
53. **Resend webhook signature not enforced** — checks headers but doesn't verify (`src/app/api/webhooks/resend/route.ts`)
54. **Telnyx webhook no HMAC verification** — accepts any POST (`src/app/api/webhooks/telnyx/route.ts`)
55. **No rate limiting on Clerk webhook** — attacker can spam user.deleted events
56. **RBAC silently fails on invalid role** — returns false instead of alerting (`src/lib/rbac.ts`)
57. **No RBAC on impersonation** — all admins can impersonate any tenant (`src/app/api/admin/impersonate/route.ts`)
58. **Admin session doesn't validate tenant ownership** — any admin accesses any tenant (`src/lib/tenant-query.ts`)
59. **Default admin email hardcoded** — fallback to `jeff@consortiumnyc.com` (`src/app/dashboard/layout.tsx:10`)
60. **No secrets rotation policy** — no documented process for rotating any keys

---

## CATEGORY 2: BOOKING & SCHEDULING (61-120)

61. **Double-booking race condition** — check-then-insert without transaction/locking (`src/app/api/bookings/route.ts:82-121`)
62. **No pessimistic locking on conflict check** — concurrent requests all see "no conflicts" (`src/app/api/bookings/route.ts:86-94`)
63. **No database unique constraint on team_member+time** — DB-level double-booking prevention missing (`supabase/schema.sql`)
64. **Calendar post-save conflict check too late** — confirms conflicts after booking already created (`src/app/dashboard/calendar/page.tsx:184-211`)
65. **Batch-update bypasses conflict detection** — series reschedule creates overlaps (`src/app/api/bookings/batch-update/route.ts:28-39`)
66. **Edit endpoint bypasses status transitions** — PUT allows any status via pick() (`src/app/api/bookings/[id]/route.ts:47`)
67. **Payment API bypasses status machine** — sets 'paid' directly without transition check (`src/app/api/bookings/[id]/payment/route.ts:20`)
68. **No start_time < end_time validation** — invalid time ranges possible (`src/app/api/bookings/route.ts:58-66`)
69. **No past booking validation** — can create bookings in the past (`src/app/api/bookings/route.ts:70-80`)
70. **No negative price validation** — bookings with negative prices possible
71. **No pay_rate <= hourly_rate check** — money-losing bookings possible
72. **Calendar resize has no duration limits** — absurdly long bookings possible (`src/app/dashboard/calendar/page.tsx:287-302`)
73. **Buffer only in availability, not booking creation** — 90-min buffer in availability.ts but not enforced at booking time
74. **End time defaults to 3 hours** — ignores service type duration (`src/app/api/bookings/route.ts:84`)
75. **Pending bookings block availability** — unconfirmed bookings unnecessarily block slots (`src/lib/availability.ts:88`)
76. **Conflict check string syntax fragile** — `.not('status','in','("cancelled","no_show")')` is brittle (`src/app/api/bookings/route.ts:91`)
77. **Business hours hardcoded 9-5** — doesn't read tenant config (`src/lib/availability.ts:21-22`)
78. **Tenant timezone never used** — all times treated as UTC (`src/app/api/team-availability/route.ts`)
79. **Timezone-naive date comparisons** — `toLocaleDateString` vs UTC causes mismatches (`src/lib/availability.ts:137-140`)
80. **Stats endpoint timezone bug** — monthly stats mix local and UTC dates (`src/app/api/bookings/stats/route.ts:9-11`)
81. **Portal availability ignores tenant timezone** — client sees wrong times (`src/app/api/portal/availability/route.ts:42-44`)
82. **Availability slots don't respect service duration** — late afternoon slots incorrectly blocked (`src/app/api/portal/availability/route.ts:36-40`)
83. **Same-day bookings rejected entirely** — should allow with manual confirmation (`src/lib/availability.ts:137-140`)
84. **No booking confirmation notification** — client/team not notified on create (`src/app/api/bookings/route.ts`)
85. **Batch reschedule only notifies admin** — clients/team unaware of changes (`src/app/api/bookings/batch-update/route.ts:49-67`)
86. **Payment marked paid without receipt** — no notification to client (`src/app/api/bookings/[id]/payment/route.ts:18-21`)
87. **Status change notification lacks user attribution** — audit log doesn't record WHO changed status (`src/app/api/bookings/[id]/status/route.ts:58`)
88. **No 'no_show' date validation** — can mark future bookings as no-show
89. **Cancelled bookings can't be recovered** — no outbound transitions from cancelled
90. **Pending->Scheduled naming mismatch** — UI says "Confirm" but code sets 'scheduled'
91. **Price calculation missing on create** — price defaults to 0, not calculated from service type (`src/app/api/bookings/route.ts:107-115`)
92. **Price not updated on resize** — hourly_rate not recalculated when duration changes
93. **Tip amount not validated** — no reasonable upper bound (`src/app/api/bookings/[id]/payment/route.ts:17`)
94. **Payment link created but no webhook sync** — admin must manually mark paid
95. **Portal creates bookings without team assignment** — hangs in pending without admin action (`src/app/api/portal/bookings/route.ts:50-65`)
96. **Portal doesn't check availability** — client can book unavailable times (`src/app/api/portal/bookings/route.ts`)
97. **Portal reschedule lacks conflict check** — can create double-bookings (`src/app/api/portal/bookings/[id]/route.ts:60-78`)
98. **Portal doesn't check do_not_service flag** — blocked clients can book via API (`src/app/api/portal/bookings/route.ts`)
99. **No booking frequency limits** — same client can book 100 times per day
100. **No end_time validation when provided** — doesn't check end_time > start_time
101. **Missing reschedule window validation** — allows rescheduling to any date without notice rules
102. **Missing cancellation eligibility check** — allows cancel on any booking type
103. **Recurring bookings only 4 weeks ahead** — no auto-generation job for future bookings (`src/app/api/schedules/route.ts:79`)
104. **No pause for individual recurring instances** — can't skip one week without cancelling series
105. **Schedule deletion orphans past bookings** — historical link broken
106. **Recurring display name mismatch** — `monthly_day` vs `monthly_weekday` type mismatch (`src/lib/recurring.ts:112`)
107. **Force override undocumented** — `force: true` bypasses availability without audit (`src/app/api/bookings/route.ts:71`)
108. **Inactive team members appear in queries** — not filtered by status in availability (`src/app/api/team-availability/route.ts`)
109. **Preferred member hidden if conflicted** — not suggested even though override possible
110. **No CHECK constraint on booking times** — DB allows end_time before start_time (`supabase/schema.sql`)
111. **schedule_id orphaned if schedule deleted** — foreign key without cascade
112. **start_time/end_time use TIMESTAMP not TIMESTAMPTZ** — timezone context lost (`supabase/schema.sql`)
113. **Booking status transition on status change sends zero notifications** — status changes are silent
114. **Portal reschedule notification logic fragile** — same-day time changes confusing
115. **Batch update doesn't validate new team member** — reassignment creates conflicts
116. **Portal date format not validated** — accepts any string for date (`src/app/api/portal/availability/route.ts:12`)
117. **Portal past date accepted** — allows checking availability for past dates
118. **Portal duration bounds not validated** — accepts any duration value
119. **Portal services endpoint no error handling** — silent failure if query fails (`src/app/api/portal/services/route.ts`)
120. **No database constraint booking price >= 0** — allows negative prices at DB level

---

## CATEGORY 3: PAYMENTS & BILLING (121-170)

121. **No webhook idempotency** — Stripe events processed multiple times on retransmit (`src/app/api/webhooks/stripe/route.ts:24-51`)
122. **No error handling in webhook DB updates** — silent failures, webhook returns success (`src/app/api/webhooks/stripe/route.ts:30-49`)
123. **Concurrent payment sessions** — clicking "Pay" twice creates two sessions (`src/app/api/payments/checkout/route.ts:38-53`)
124. **Missing refund handling** — `charge.refunded` webhook not handled, booking stays "paid" forever
125. **Missing dispute/chargeback handling** — `charge.dispute.created` not handled
126. **Missing checkout.session.expired handling** — abandoned checkouts not tracked
127. **Price validation missing** — only checks amount > 0, not against booking price (`src/app/api/payments/checkout/route.ts:35-36`)
128. **Amount consistency check missing** — webhook marks paid without checking amount matches booking
129. **Stripe API keys stored plaintext** — no encryption in tenants table (`src/app/api/payments/checkout/route.ts:31`)
130. **Resend API keys stored plaintext** — no encryption (`src/app/api/admin/email/route.ts`)
131. **Telnyx API keys stored plaintext** — no encryption (`src/lib/sms.ts`)
132. **No Stripe Connect verification** — unverified accounts can create payment links
133. **Payment link no expiry** — 3-year-old links still active
134. **Webhook doesn't validate tenant ownership** — trusts metadata.tenant_id blindly
135. **New Stripe Product+Price every payment** — creates thousands of unused products (`src/lib/stripe.ts:74-87`)
136. **No idempotency keys in Stripe API calls** — network retries create duplicates (`src/lib/stripe.ts`)
137. **Stripe error handling missing** — API errors propagate uncaught to 500 (`src/lib/stripe.ts:32-55`)
138. **Payment method not validated** — accepts any string for payment_method
139. **No audit trail for payment updates** — cannot trace who changed payment status
140. **Notification insert in webhook no error handling** — silent notification failures
141. **Stripe session metadata not validated** — invalid UUIDs pass through
142. **Revenue calculation division bug** — `/100` applied but unclear if price is cents or dollars (`src/app/api/admin/finance/route.ts:93`)
143. **Manual payment override no Stripe verification** — admin marks paid without actual charge
144. **No booking price snapshot at payment time** — price changes after charge are untracked
145. **Notification hard-coded to in_app** — tenant misses payment alerts if in_app disabled
146. **No rate limiting on payment endpoints** — spam payment link creation possible
147. **Stripe session status not re-verified** — trusts webhook event type alone
148. **payment_intent.payment_failed handler is dead code** — no payment intents created with metadata
149. **No payment link status tracking** — link expires silently
150. **Billing admin calculates MRR from hardcoded prices** — doesn't match actual Stripe subscriptions
151. **No Stripe webhook endpoint monitoring** — misconfigured secret fails silently for days
152. **Stripe account ID not format-validated** — any string accepted (`src/app/admin/businesses/[id]/page.tsx`)
153. **Billing status transitions not validated** — admin can set any plan without verification
154. **Billing changes lack audit trail** — no logging of who changed plans (`src/app/api/admin/billing/route.ts`)
155. **No payment logging** — no debug/info logs of amounts, booking IDs, session IDs
156. **Tip amount allows negative values** — no validation (`src/app/api/bookings/[id]/payment/route.ts:12-17`)
157. **No reconciliation system** — Stripe state and DB state can diverge permanently
158. **API key changes no notification to tenant** — admin changes keys without tenant knowing
159. **API key changes no dual-admin approval** — single admin can change all keys
160. **SMS config change without verification** — Telnyx phone can be changed to intercept SMS
161. **No payment receipt email** — client never gets confirmation of payment
162. **No refund workflow** — no endpoint to initiate refunds from platform
163. **Stripe webhook secret `sig!` non-null assertion** — crashes if header missing
164. **No subscription lifecycle management** — no upgrade/downgrade flow for tenants
165. **Platform doesn't charge tenants** — billing page exists but no actual Stripe billing integration
166. **No invoice generation** — no PDF invoice for bookings
167. **No payment retry for failed charges** — failed payments stuck forever
168. **No financial reporting export** — no CSV/PDF export for revenue reports
169. **Currency hardcoded to USD** — no multi-currency support in Stripe calls
170. **No Stripe test vs live mode detection** — test keys could be used in production

---

## CATEGORY 4: CLIENT MANAGEMENT (171-210)

171. **No unique constraint on client email per tenant** — duplicates possible at DB level (`supabase/schema.sql`)
172. **No unique constraint on client phone per tenant** — duplicates possible at DB level
173. **Duplicate detection race condition (TOCTOU)** — concurrent requests bypass check (`src/app/api/clients/route.ts:66-102`)
174. **Client notes field no max length** — unlimited data insertion possible
175. **sms_consent vs sms_opt_in column mismatch** — API uses wrong field name (`src/app/api/clients/[id]/route.ts:46`)
176. **No audit logging on client deletion** — GDPR requires deletion audit trail (`src/app/api/clients/[id]/route.ts`)
177. **Orphaned bookings on client deletion** — no CASCADE DELETE (`supabase/schema.sql:104-107`)
178. **No GDPR data export endpoint** — no way for clients to export their data
179. **No GDPR right to be forgotten** — no anonymization workflow
180. **No cascading deletion of related data** — bookings, reviews, activity orphaned on delete
181. **ilike search wildcards not escaped** — `%` in search matches everything (`src/app/api/clients/route.ts:26`)
182. **Import phone normalization inconsistent** — `(555) 123-4567` stored but `5551234567` compared
183. **Import batch errors silent** — user doesn't know which rows failed (`src/app/api/clients/import/route.ts:170-174`)
184. **Import batch size hardcoded to 200** — no parallelization, slow for large imports
185. **Admin client endpoint no pagination in frontend** — fetches default 50, not all clients
186. **Bulk delete client-side loop no retry** — partial failures undetectable (`src/app/dashboard/clients/page.tsx:314-326`)
187. **No client merge functionality** — duplicate clients can't be merged
188. **No client data retention policy** — data kept forever
189. **No client contact info validation** — email/phone format not enforced at DB level
190. **Client status values not validated on GET** — accepts any status string
191. **preferred_team_member_id not validated on POST** — only validated on PUT
192. **No client lifecycle automation beyond cron** — no event-driven status changes
193. **Client search N+1 potential** — wildcard search on name+email+phone
194. **Pagination offset not capped** — page=999999999 creates huge offset
195. **Client special_instructions not validated on POST** — no size limit
196. **Email marketing opt-out columns missing** — `sms_marketing_opt_out` not in schema
197. **email_marketing_opted_out_at not in schema** — referenced in code but doesn't exist
198. **sms_marketing_opted_out_at not in schema** — referenced in code but doesn't exist
199. **preferred_team_member_id not in schema** — referenced in code but may not exist
200. **No client activity pagination** — returns all bookings for a client
201. **Transcript endpoint returns [] instead of error** — inconsistent error format
202. **SELECT * used for client queries** — fragile, should list needed columns
203. **No client import duplicate strategy option** — no skip/merge/overwrite choice
204. **No client photo/avatar support** — no profile image upload
205. **Client notes rendered in email templates without escaping** — XSS risk in emails
206. **No client communication preference center** — can't choose email vs SMS preference
207. **Client lifecycle cron has N+1 potential** — queries per tenant then per client batch
208. **No client tag/label system** — mentioned in UI but not implemented
209. **No client custom fields** — no extensible data model
210. **No client birthday/anniversary tracking** — common CRM feature missing

---

## CATEGORY 5: PORTAL & TEAM PORTAL (211-300)

211. **Portal auth token in localStorage vulnerable to XSS** — (`src/app/portal/layout.tsx`)
212. **Team auth token in localStorage vulnerable to XSS** — (`src/app/team/layout.tsx`)
213. **Missing Content Security Policy in portal** — no CSP meta tags
214. **Auth state deserialized without schema validation** — malicious JSON crashes app
215. **Missing error boundary in portal layout** — localStorage parse failures unhandled
216. **Missing date validation on booking inputs** — accepts any string (`src/app/portal/page.tsx:162-165`)
217. **Missing loading state for initial bookings fetch** — shows stale data briefly
218. **Missing error handling on all portal fetch calls** — no user feedback on failure
219. **Missing API response structure validation** — assumes `data.bookings` exists
220. **N+1 on service type selection** — each change triggers new API call
221. **12h to 24h time parsing brittle** — edge cases at 12:00 AM (`src/app/portal/page.tsx:192-197`)
222. **Missing accessibility on portal buttons** — no aria-expanded, aria-selected
223. **Race condition on notes save** — inline and form saves conflict
224. **do_not_service not checked client-side** — blocked clients can submit booking form
225. **Portal book page missing minimum date validation** — should require tomorrow+
226. **Portal book page missing error feedback** — no error message shown on failure
227. **Portal booking success state lost on reload** — `bookingSuccess` state not persisted
228. **Portal booking allows any datetime** — not validated against available slots
229. **Portal reschedule missing future date validation** — allows past dates
230. **Portal cancel no confirmation for business rules** — no validation booking is cancellable
231. **Portal cancel/reschedule simultaneous race** — no request deduplication
232. **Portal ISO date not validated** — malformed datetime causes backend errors
233. **Portal rating not validated 1-5** — any number accepted (`src/app/portal/feedback/page.tsx`)
234. **Portal feedback comment no sanitization** — stored as-is
235. **Portal feedback no error feedback** — user doesn't know if submission failed
236. **Portal feedback no comment length limit** — unlimited text accepted
237. **Team notification count polling no caching** — fetches every 60s without cache
238. **Team page multiple fetch chains no error handling** — loadTodayJobs etc. fail silently
239. **Team job status transitions not validated** — can go from completed back to scheduled
240. **Team job claim no concurrent protection** — two members claim same job simultaneously (`src/app/api/team-portal/jobs/claim/route.ts`)
241. **Team job notes rendered without sanitization** — HTML injection possible
242. **Team login PIN format not enforced client-side** — only length check
243. **Team login no retry button** — connection error with no recovery
244. **Team job list fetch error silent** — empty list shown on error
245. **Team job claim response not validated** — assumes res.ok means success
246. **Team jobs-map no rate limiting on geocoding** — unlimited Nominatim API calls
247. **Team jobs-map no geocoding caching** — same address geocoded repeatedly
248. **Team jobs-map empty results crash** — tries to center on NaN coordinates
249. **Team availability no date validation** — accepts past dates for blocked dates
250. **Team availability no save feedback** — user doesn't know if save succeeded
251. **Team earnings fetch error silent** — only logged, no user feedback
252. **Team earnings data not validated** — crashes if API returns null
253. **Team notifications fetch error silent** — empty array shown on error
254. **Team notifications mark-read no loading state** — double-click possible
255. **Team checkin no geolocation permission recovery** — no retry button after denied
256. **Team checkin no booking ownership validation** — no check booking belongs to member
257. **Team checkin no coordinate validation** — accepts any lat/lng without bounds check
258. **Team checkout no check-in validation** — allows checkout without prior check-in
259. **Team checkout duplicate protection missing** — called twice recalculates earnings differently
260. **Team checkout no geolocation distance validation** — checkout from anywhere accepted
261. **Team checkout earnings zero without error** — if check_in_time null, silently returns 0
262. **Team checkout pay_rate null handling missing** — earnings=0 without notification
263. **Team rules guidelines no HTML escaping** — rendered with whitespace-pre-line
264. **Portal auth rate limit on phone not IP** — attacker enumerates from same IP
265. **Portal auth code regenerated each time** — should rate limit code generation separately
266. **Portal booking no service availability check** — doesn't validate service active for tenant
267. **Portal booking no date range limits** — can book years in advance
268. **Portal booking null service lookup continues** — code proceeds with null serviceType
269. **Portal booking no tenant subscription check** — doesn't verify tenant is active
270. **Portal booking no booking frequency limits** — 100 bookings per day possible
271. **Portal reschedule no access validation in PUT** — doesn't verify correct tenant/client
272. **Portal reschedule no idempotency** — same PUT creates duplicate notifications
273. **Portal reschedule no concurrent update protection** — simultaneous reschedule+cancel race
274. **Portal feedback rating not validated server-side** — any number accepted (`src/app/api/portal/feedback/route.ts:20`)
275. **Portal feedback XSS in comment** — stored without sanitization
276. **Portal feedback booking_id ownership not validated** — doesn't verify booking belongs to client
277. **Portal notes GET error returns empty** — should return error
278. **Portal notes concurrent write no protection** — simultaneous PUTs race
279. **Portal availability timezone not handled** — doesn't consider client timezone
280. **Portal availability buffer time missing** — doesn't account for travel/prep time
281. **Team auth rate limit resets on deploy** — in-memory Map
282. **Team auth no PIN complexity validation** — sequential PINs allowed
283. **Team auth no PIN rotation tracking** — no forced rotation
284. **Team auth no team member status verification** — doesn't check member is approved
285. **Team auth token pay_rate staleness** — could change since token creation
286. **Team jobs no pagination** — returns all matching jobs, could be thousands
287. **Team job claim no max jobs check** — member can claim unlimited jobs
288. **Team job claim no availability check** — doesn't validate blocked dates
289. **Team job claim no booking status validation** — doesn't handle pending status
290. **Team checkin duplicate protection missing** — called twice updates booking twice
291. **Team checkin no status transition validation** — doesn't check status is scheduled/confirmed
292. **Team checkout no status transition validation** — doesn't check status is in_progress
293. **Team availability working_days not validated** — accepts any array values
294. **Team availability blocked_dates format not validated** — any string accepted
295. **Team availability notes JSON injection** — no try/catch on JSON parse
296. **Team earnings N+1 queries** — 4 separate queries for today/week/month/year
297. **Team earnings timezone handling** — uses server timezone not member timezone
298. **Team earnings includes future jobs** — todayJobs counts not-yet-started bookings
299. **Team notifications or clause too permissive** — shows notifications beyond this member
300. **Team guidelines settings JSON validation missing** — assumes valid JSON structure

---

## CATEGORY 6: AI CHATBOT & CAMPAIGNS (301-370)

301. **Prompt injection via review comments** — comments interpolated directly into Claude prompts (`src/lib/google-reviews.ts:27-29`)
302. **Prompt injection via reviewer name** — name embedded in prompt without sanitization (`src/lib/google-reviews.ts:28`)
303. **Campaign body sent as raw HTML** — no XSS protection in email (`src/app/api/campaigns/[id]/send/route.ts:59`)
304. **No API cost controls for AI calls** — no per-tenant rate limiting or budget
305. **Selena conversation limit bypassable** — 5-loop limit but user can start new conversation
306. **No tenant-level AI token budget** — unlimited spend per tenant
307. **Missing unsubscribe link in campaigns** — CAN-SPAM violation
308. **No bounce/hard failure tracking** — invalid emails sent to repeatedly
309. **No recipient deduplication in campaign send** — duplicates in client_ids
310. **No campaign sending concurrency control** — two sends of same campaign possible
311. **Recipient filter logic incomplete** — 'at_risk', 'churned' filters have no backend logic
312. **Campaign body no XSS validation on create** — 10,000 char HTML accepted without sanitization
313. **Selena tool inputs not validated** — name/phone/email from Claude passed without checks (`src/lib/selena.ts:235-350`)
314. **Selena booking race condition** — client check then insert is non-atomic (`src/lib/selena.ts:300-337`)
315. **Selena hardcoded 2-hour duration** — all AI bookings get 2 hours regardless of service
316. **SMS campaign no 160-char enforcement** — Telnyx will reject/split long messages
317. **Auto-reply reviews without owner approval** — AI responses posted publicly immediately
318. **Cron secret validation timing-unsafe** — simple string comparison, no constant-time
319. **Review sync stores untrusted data** — Google API response inserted without sanitization
320. **Campaign recipient_filter no enum validation** — arbitrary string accepted
321. **Review request message not HTML-escaped** — client name in email without escaping
322. **Campaign status transition incomplete** — 'sending' status not prevented from re-send
323. **Selena tool definitions no required fields** — Claude can call tools with empty input
324. **No rate limiting on review request endpoint** — unlimited review requests
325. **Campaign scheduling not implemented** — scheduled_at saved but never executed
326. **Selena timeout partial tool execution** — tool results partially saved on abort
327. **No campaign send audit trail** — no logging of who sent what when
328. **Email API key stored plaintext** — Resend key in tenants table
329. **Telnyx API key stored plaintext** — in tenants table
330. **Campaign body size limit arbitrary** — 10,000 chars may be too low for newsletters
331. **Selena system prompt hardcoded** — can't update behavior without deploy
332. **Selena doesn't log conversations** — no audit trail for AI interactions
333. **Campaign email fallback to SMS loses formatting** — truncated to 320 chars
334. **No test coverage for campaign sending** — no test files found
335. **Selena checkAvailability not audited** — function called but not reviewed
336. **Review rating allows out-of-range** — validation exists but edge cases possible
337. **Auto-reply reviews limited to 10 per run** — slow catchup for high-volume
338. **No campaign analytics dashboard** — open rates, click rates not tracked
339. **No campaign A/B testing** — no variant testing capability
340. **No campaign template system** — every campaign written from scratch
341. **No SMS campaign opt-out handling** — STOP replies not linked to campaign system
342. **Campaign send no progress tracking** — no real-time progress for large campaigns
343. **No email preview before campaign send** — no test send functionality
344. **Selena can create clients without validation** — no email/phone format check
345. **Selena booking notification missing** — AI-created bookings have no confirmation email
346. **Google review sync pagination cursor not stored** — re-fetches all reviews each sync
347. **Google review sync not registered in vercel.json** — cron won't run
348. **Health-check cron not registered in vercel.json** — cron won't run
349. **Auto-reply reviews not registered in vercel.json** — cron won't run
350. **No campaign unsubscribe link implementation** — toggle exists but not functional
351. **Campaign merge tags recursive injection possible** — {name} replacement not sanitized
352. **No campaign throttling** — 10k emails sent simultaneously, IP reputation risk
353. **Selena no conversation history storage** — can't review past AI interactions
354. **No AI content moderation** — Selena responses not checked for inappropriate content
355. **Review response no length limit** — AI can generate very long replies
356. **No campaign bounce webhook handler** — bounced emails not tracked
357. **Campaign email from address not validated** — any string accepted
358. **No campaign scheduling timezone** — scheduled_at doesn't specify timezone
359. **No campaign cancellation after send starts** — can't stop mid-send
360. **Selena error messages expose internal details** — error responses leak system info
361. **No campaign re-send prevention** — sent campaign can be sent again if status reset
362. **AI chat endpoint no rate limiting** — unlimited requests (`src/app/api/ai/chat/route.ts`)
363. **No AI usage tracking per tenant** — can't bill for AI usage
364. **No AI response caching** — same question asked twice makes two API calls
365. **Campaign recipient count mismatch** — total_recipients may not match actual sends
366. **No campaign delivery report** — no post-send summary
367. **SMS campaign no delivery confirmation** — Telnyx delivery status not tracked
368. **No email template system** — all emails built inline
369. **Email templates missing unsubscribe links** — ALL templates violate CAN-SPAM (`src/lib/email-templates.ts`)
370. **SMS templates TCPA compliant** — all have STOP text (this is GOOD, noting for completeness)

---

## CATEGORY 7: DATA MODEL & SCHEMA (371-450)

371. **RLS enabled but no policies defined** — all RLS is bypassed by service role key (`supabase/schema.sql`)
372. **Missing table: sms_conversations** — referenced in selena.ts and telnyx webhook
373. **Missing table: sms_conversation_messages** — referenced in transcript endpoint
374. **Missing table: campaign_recipients** — referenced in webhooks and campaign send
375. **Missing table: team_applications** — referenced in team-applications API
376. **Missing table: platform_feedback** — referenced in feedback API
377. **Missing table: tenant_settings** — referenced in settings lib
378. **Missing table: push_subscriptions** — referenced in push.ts
379. **Missing table: social_accounts** — referenced in social.ts
380. **Missing table: social_posts** — referenced in social.ts
381. **Missing table: google_posts** — referenced in google-posts.ts
382. **Missing table: team_notifications** — referenced in notify-team.ts
383. **Missing table: marketing_opt_out_log** — referenced in unsubscribe API
384. **Missing table: tenant_domains** — referenced in domains.ts
385. **Missing table: referral_commissions** — referenced in codebase
386. **Missing table: partner_requests** — referenced in requests API
387. **Missing column: clients.sms_marketing_opt_out** — used in campaign send
388. **Missing column: clients.email_marketing_opt_out** — used in campaign send
389. **Missing column: campaigns.delivered_count** — used in Resend webhook
390. **Missing column: campaigns.opened_count** — used in Resend webhook
391. **Missing column: campaigns.failed_count** — used in Resend webhook
392. **Missing column: campaigns.sent_count** — used in admin marketing page
393. **Missing column: campaigns.total_recipients** — used in campaign send
394. **Missing column: campaigns.recipient_filter** — used in campaign send
395. **TIMESTAMP vs TIMESTAMPTZ inconsistency** — bookings.start_time/end_time use TIMESTAMP, everything else uses TIMESTAMPTZ
396. **No ENUM types used** — all status/role fields are TEXT without constraints
397. **bookings.client_id missing ON DELETE** — no CASCADE or SET NULL defined
398. **bookings.team_member_id missing ON DELETE** — behavior undefined
399. **reviews.client_id missing ON DELETE clause** — behavior undefined
400. **reviews.booking_id missing ON DELETE clause** — behavior undefined
401. **reviews.team_member_id missing ON DELETE clause** — behavior undefined
402. **referrals foreign keys missing ON DELETE** — behavior undefined
403. **No CHECK constraint: bookings end_time > start_time** — invalid ranges possible
404. **No CHECK constraint: bookings price >= 0** — negative prices allowed
405. **No CHECK constraint: bookings tip_amount >= 0** — negative tips allowed
406. **No CHECK constraint: team_members hourly_rate >= 0** — negative rates allowed
407. **No CHECK constraint: team_members pay_rate >= 0** — negative rates allowed
408. **No CHECK constraint: clients status is valid enum** — any string accepted
409. **Missing composite index: bookings(tenant_id, status)** — frequent query pattern
410. **Missing composite index: bookings(team_member_id, start_time)** — schedule lookups
411. **Missing composite index: bookings(client_id, status)** — client history
412. **Missing index: campaigns(status)** — filtering by draft/sending/sent
413. **Missing composite index: team_members(tenant_id, status)** — active member lookups
414. **Missing unique: tenants(domain)** — custom domains not uniquely constrained
415. **team_members.hourly_rate missing default** — should default to 0
416. **team_members.pay_rate missing default** — should default to 0
417. **clients.email should be NOT NULL** — required for marketing
418. **clients.phone should be NOT NULL** — required for SMS
419. **team_members.phone should be NOT NULL** — required for job notifications
420. **team_members.email should be NOT NULL** — required for notifications
421. **No email format CHECK constraint** — any string accepted in email fields
422. **No phone format CHECK constraint** — any string accepted in phone fields
423. **No URL validation CHECK constraint** — logo_url, website_url accept any string
424. **No automatic updated_at trigger** — must be set manually in application code
425. **No automatic audit trail trigger** — no capture of changes to sensitive tables
426. **Service type denormalization** — `bookings.service_type` TEXT duplicates `service_types.name`
427. **Ambiguous payment_status** — unclear if "partial" means partial payment or partial refund
428. **Inconsistent soft delete** — some tables use status field, some use hard delete
429. **No deleted_at column** — no soft delete timestamp on any table
430. **No data retention policy at DB level** — no automated cleanup
431. **Missing unique: team_members(tenant_id, pin)** — duplicate PINs possible
432. **Missing unique: team_members(tenant_id, phone)** — duplicate phone numbers possible
433. **campaigns.type should be NOT NULL** — campaign type required
434. **campaigns.subject should be NOT NULL for email** — email campaigns need subject
435. **No JSONB validation** — metadata fields accept any structure
436. **No row-level security policies** — RLS enabled but no policies created
437. **booking_supplies table not defined** — referenced but doesn't exist
438. **Missing table: client_sms_messages** — referenced in transcript endpoint
439. **Missing table: platform_settings** — referenced for global config
440. **Missing table: portal_auth_codes** — referenced in portal auth
441. **No foreign key: bookings.service_type_id** — constraint definition missing
442. **No foreign key: recurring_schedules.service_type_id** — constraint missing
443. **Cascading delete issues on tenant deletion** — order-dependent cleanup
444. **No database backup automation** — cron exists but relies on Supabase's own backup
445. **No read replica configuration** — all queries hit primary
446. **No connection pooling configured** — supabaseAdmin creates new connections
447. **No query timeout configuration** — long queries can block
448. **No database migration versioning** — manual SQL files, no migration tool
449. **No seed data for testing** — no test fixtures
450. **No database monitoring/alerting** — no slow query alerts

---

## CATEGORY 8: SECURITY HEADERS & CONFIG (451-530)

451. **No Content-Security-Policy header** — XSS can load external scripts (`next.config.ts`)
452. **No X-XSS-Protection header** — missing for legacy browser protection
453. **No X-Permitted-Cross-Domain-Policies header** — missing
454. **No Cross-Origin-Embedder-Policy header** — missing
455. **No Cross-Origin-Opener-Policy header** — missing
456. **X-Powered-By not removed** — exposes Next.js version
457. **Wildcard CORS on tracking endpoint** — any domain can submit tracking data (`src/app/api/track/route.ts:5`)
458. **Wildcard CORS on leads/visits** — any domain can submit visit data (`src/app/api/leads/visits/route.ts:198`)
459. **No rate limiting on /api/leads** — unlimited lead submission
460. **No rate limiting on /api/track** — unlimited tracking events
461. **No rate limiting on /api/leads/visits** — unlimited visit tracking
462. **Rate limit library acknowledges it needs Redis** — comment on line 7 says so
463. **CRON_SECRET is "placeholder"** — all cron endpoints publicly accessible
464. **RESEND_API_KEY is "re_placeholder"** — email sending will fail silently
465. **ADMIN_TOKEN_SECRET missing from .env.local** — admin token signing will fail
466. **PORTAL_SECRET missing from .env.local** — portal token signing will fail
467. **TEAM_PORTAL_SECRET missing from .env.local** — team portal token signing will fail
468. **RESEND_WEBHOOK_SECRET missing from .env.local** — webhook verification impossible
469. **GOOGLE_CLIENT_SECRET missing from .env.local** — OAuth will fail
470. **FACEBOOK_APP_SECRET missing from .env.local** — social features broken
471. **STRIPE_SECRET_KEY missing from .env.local** — payments will fail
472. **STRIPE_WEBHOOK_SECRET missing from .env.local** — payment webhooks unverified
473. **VAPID keys missing from .env.local** — push notifications broken
474. **NEXT_PUBLIC_APP_URL missing from .env.local** — URL generation broken
475. **SUPER_ADMIN_CLERK_ID missing from .env.local** — super admin detection broken
476. **No env validation at startup** — app starts with missing critical vars
477. **No .env.example file** — new developers don't know required vars
478. **Tawk chat widget via dangerouslySetInnerHTML** — no SRI hash (`src/app/(marketing)/layout.tsx:43-59`)
479. **No CSP nonce for Tawk script** — will break if CSP added later
480. **Geolocation permission too permissive** — enabled on marketing pages unnecessarily
481. **No HSTS preload list submission** — header says preload but not submitted
482. **Referrer-Policy could be stricter on admin pages** — uses strict-origin-when-cross-origin
483. **No security.txt** — no vulnerability reporting path for researchers
484. **No dependency pinning strategy** — uses caret ranges, versions can drift
485. **No lock file visible** — package versions may differ between installs
486. **No dependency security scanning** — no npm audit in CI
487. **Missing Vercel function limits** — no timeout/memory configuration in vercel.json
488. **Cron jobs no monitoring** — no alerting if crons fail
489. **No Lighthouse/Core Web Vitals baseline** — performance unknown
490. **Tracking script hardcoded fallback URL** — `https://app.fullloopcrm.com/api/leads/visits` (`public/t.js:8`)
491. **Track endpoint returns success on error** — errors invisible in production
492. **Redirect validation missing in OAuth** — open redirect vulnerability possible
493. **Middleware matcher regex complex** — edge cases possible
494. **No Helmet.js equivalent** — no additional HTTP header hardening
495. **Admin PIN exposed in .env.local** — `020179` in plaintext
496. **Supabase keys exposed in .env.local** — service role key in plaintext
497. **Clerk keys exposed in .env.local** — secret key in plaintext
498. **IP address stored without GDPR handling** — no retention/deletion policy (`src/app/api/track/route.ts`)
499. **No tracking consent banner** — GDPR/CCPA violation (`public/t.js`)
500. **No cookie consent mechanism** — tracking fires immediately
501. **Referrer leaked cross-domain** — full referrer URL sent to tracking endpoint
502. **Tracking pixel fallback exposes data in URL** — JSON in query string visible in logs
503. **No data retention policy for tracking data** — kept forever
504. **No robots exclusion for AI crawlers** — no GPTBot/ChatGPT-User rules (`src/app/robots.ts`)
505. **Missing canonical tags on paginated content** — 20K+ combo pages with no prev/next
506. **Missing noindex on thin combo pages** — Google may see as doorway pages
507. **Sitemap ignores dynamic page staleness** — stale entries for ISR pages
508. **No font loading strategy** — no next/font optimization
509. **Lazy-loaded components no fallback UI** — CLS on page load (`src/app/(marketing)/page.tsx`)
510. **OG image not responsive** — hardcoded 1200x630 size
511. **Environment variables not validated at build time** — broken in production
512. **No HSTS enforcement on first visit** — vulnerable before header kicks in
513. **Hardcoded phone number in schema/pages** — no i18n for non-US
514. **Missing alt text on logo images** — accessibility violation (`src/app/portal/layout.tsx:72`)
515. **Missing required indicators on forms** — no asterisk or required attribute
516. **No prefetch for external resources** — slower performance
517. **Missing structured data for breadcrumbs** — no FAQ schema on combo pages
518. **Missing noarchive on client content** — archived images persist after removal
519. **Unvalidated file uploads** — relies on client-side MIME type, no magic number check
520. **Public analytics API** — GET requires auth but POST is public (`src/app/api/leads/visits/route.ts`)
521. **Missing mobile viewport meta tag** — not explicitly set
522. **No partner request form rate limiting** — spam submissions possible
523. **Dynamic color injection without validation** — CSS injection possible in portal
524. **Tenant logo URL no validation** — potential XSS via malicious image URL
525. **JSON-LD via dangerouslySetInnerHTML** — safe now but fragile pattern
526. **Industry/metro data rendered without sanitization** — XSS if data source compromised
527. **Dynamic metadata from potentially untrusted input** — SEO poisoning possible
528. **Missing analytics retention schedule** — GDPR Article 5 violation
529. **No PageSpeed monitoring** — Core Web Vitals unknown
530. **Missing error handling on public form submissions** — silent failures

---

## CATEGORY 9: ADMIN & SETTINGS (531-580)

531. **Mass assignment in announcements API** — entire body passed to update (`src/app/api/admin/announcements/[id]/route.ts:17`)
532. **Admin settings accepts arbitrary keys** — no validation on key format (`src/app/api/admin/settings/route.ts`)
533. **Tenant settings accepts arbitrary fields** — no allowlist on PUT body
534. **No permission check for tenant settings query** — admin can view any tenant's settings
535. **Business detail allows editing all API keys** — no separate secured endpoint
536. **Missing audit trail for tenant creation** — no logSecurityEvent on business create
537. **No validation of tenant status transitions** — can go directly to 'deleted'
538. **Impersonation not logged with IP** — can't track which IP impersonated
539. **Invite role not validated against enum** — arbitrary role string accepted
540. **Join token can create duplicate members** — no race condition protection
541. **No CSRF protection on admin state-changing requests** — PUT/DELETE vulnerable
542. **No rate limiting on admin API endpoints** — DoS attacks possible
543. **Business soft delete not enforced** — slug can be reused after deletion
544. **No audit trail for settings deletions** — removed settings not logged
545. **Platform announcements can target invalid tenants** — no existence check
546. **Admin token expiration not validated consistently** — potential clock skew issues
547. **No admin activity dashboard** — no visibility into admin actions
548. **No admin role separation** — all admins have same permissions
549. **No admin 2FA** — PIN-only authentication
550. **Admin impersonation banner not tamper-evident** — XSS could hide it
551. **No tenant onboarding checklist API** — onboarding state not tracked
552. **No tenant health dashboard** — no aggregate view of tenant issues
553. **No tenant usage metering** — can't track API calls, storage, etc.
554. **No tenant suspension workflow** — no grace period before deletion
555. **No tenant data export for offboarding** — no way to export all tenant data
556. **No admin notification preferences** — all admins get all notifications
557. **No admin session management** — can't view/revoke active sessions
558. **No admin access log** — no history of what was viewed/changed
559. **Settings page saves via client-side loop** — partial failures possible
560. **No settings validation before save** — invalid values accepted
561. **No settings rollback** — can't revert to previous settings
562. **No tenant plan enforcement** — features not gated by plan level
563. **No usage quotas per plan** — free tier has same limits as pro
564. **No tenant custom domain management UI** — domain setup manual
565. **No admin bulk operations** — can't bulk update/delete tenants
566. **No admin search across tenants** — can't find specific tenant quickly
567. **No admin impersonation time limit** — stays impersonated until manually stopped
568. **Admin email endpoint returns masked keys** — but PUT accepts plaintext
569. **SMS config change no notification to tenant** — keys changed silently
570. **No API key rotation workflow** — no guided key rotation process
571. **No admin changelog** — no record of platform changes
572. **No admin API documentation** — endpoints undocumented
573. **No admin error dashboard link** — errors page exists but not linked
574. **No tenant billing history** — no invoice/payment history view
575. **No tenant usage alerts** — no warning when approaching limits
576. **No admin backup verification** — backup cron runs but never verified
577. **No disaster recovery plan** — no documented recovery process
578. **No admin health check page** — system status not visible
579. **No multi-admin collaboration** — no commenting/notes on tenants
580. **No admin dark mode** — UI consistency issue

---

## CATEGORY 10: FRONTEND UX & ERROR HANDLING (581-700)

581. **Toast notification system never used** — provider exists but never called in any page
582. **Dashboard bookings page silent failure** — fetch error not shown to user
583. **Dashboard clients page silent failure** — fetch error not shown
584. **Dashboard calendar page silent failure** — events load silently fails
585. **Dashboard reviews page silent failure** — reviews load error hidden
586. **Dashboard campaigns page silent failure** — campaign list error hidden
587. **Dashboard settings page silent failure** — settings load error hidden
588. **Dashboard analytics page silent failure** — stats error hidden
589. **Dashboard team page silent failure** — team list error hidden
590. **No loading skeletons** — all pages show blank then content (CLS)
591. **No empty state illustrations** — blank screens when no data
592. **No error boundary components** — React errors crash whole page
593. **No retry buttons on failed fetches** — user must manually reload
594. **No optimistic updates** — all actions wait for server response
595. **No offline detection** — no banner when connection lost
596. **No form dirty state warning** — navigating away loses unsaved changes
597. **No keyboard navigation support** — modal dialogs not keyboard-accessible
598. **No screen reader support** — aria-labels missing throughout
599. **No focus management** — focus not trapped in modals
600. **No color contrast verification** — text may be unreadable for low vision
601. **Calendar drag-and-drop no undo** — accidental moves can't be reversed
602. **Calendar no print view** — can't print schedule
603. **Calendar no multi-day view** — only day/week/month
604. **Calendar timezone display missing** — doesn't show which timezone is displayed
605. **Booking form no address autocomplete** — manual address entry only
606. **Booking form no recurring preview** — can't see future dates before creating
607. **Client form no duplicate warning** — only shown after submit
608. **Client form no email validation feedback** — invalid format accepted silently
609. **Client form no phone formatting** — inconsistent phone display
610. **Client import no preview** — can't review data before importing
611. **Client import no column mapping** — assumes fixed CSV format
612. **Client import no progress bar** — no feedback during long imports
613. **Team member form no skill matching** — no service type assignment
614. **Team member form no schedule preview** — can't see availability before saving
615. **Campaign editor no rich text** — plain text or raw HTML only
616. **Campaign editor no preview** — can't see rendered email
617. **Campaign editor no test send** — can't send test to own email
618. **Campaign analytics missing** — no open/click/bounce rates displayed
619. **Review response no approval workflow UI** — auto-posted without review
620. **Review response no edit before post** — AI response used as-is
621. **Settings no save confirmation** — saved silently
622. **Settings no validation feedback** — invalid values accepted
623. **Settings no reset to defaults** — can't undo all changes
624. **Dashboard no global search** — can't search across entities
625. **Dashboard no keyboard shortcuts** — no hotkeys for common actions
626. **Dashboard no breadcrumbs** — navigation context unclear
627. **Dashboard no recent activity feed** — no "what happened today" view
628. **Dashboard no notification center** — notifications not aggregated
629. **Dashboard no quick actions** — no "create booking" shortcut
630. **Dashboard charts no interactivity** — can't drill down into data
631. **Dashboard no date range picker** — fixed time periods only
632. **Dashboard no export functionality** — can't export charts/reports
633. **Dashboard no mobile responsive layout** — not optimized for mobile admin
634. **Dashboard sidebar no collapse** — can't minimize navigation
635. **Booking detail no payment history** — can't see payment attempts
636. **Booking detail no communication log** — can't see sent notifications
637. **Booking detail no activity timeline** — no chronological event history
638. **Client detail no booking history chart** — no visual booking frequency
639. **Client detail no revenue attribution** — can't see lifetime value
640. **Client detail no communication preferences** — can't set per-client prefs
641. **Team member detail no earnings chart** — no visual earnings trend
642. **Team member detail no performance metrics** — no completion rate, ratings
643. **Team member detail no schedule view** — can't see member's calendar
644. **Reports page missing** — no dedicated reporting section
645. **Reports no custom date ranges** — fixed periods only
646. **Reports no revenue by service type** — can't break down revenue
647. **Reports no client acquisition funnel** — no lead-to-client tracking
648. **Reports no team utilization** — can't see member capacity
649. **Reports no cancellation reasons** — can't track why bookings cancel
650. **Reports no no-show tracking** — can't identify problem clients
651. **Reports no customer satisfaction trends** — no NPS/rating trends
652. **Onboarding flow missing** — no guided setup for new tenants
653. **Onboarding no checklist** — no progress tracking
654. **Onboarding no integration wizard** — manual API key entry
655. **Onboarding no sample data** — new tenants start empty
656. **Onboarding no service type templates** — must create from scratch
657. **Onboarding no email template setup** — no guided email config
658. **Onboarding no SMS setup wizard** — manual Telnyx config
659. **Onboarding no Stripe setup wizard** — manual Stripe config
660. **Onboarding no team invite flow** — no way to invite team during setup
661. **No help center integration** — no in-app help
662. **No tooltips on complex features** — no contextual help
663. **No feature announcements** — platform_announcements exist but no in-app display
664. **No user feedback mechanism** — no in-app bug reporting
665. **No system status page** — no uptime/incident visibility
666. **No changelog in-app** — users don't know about new features
667. **No notification preferences page** — can't configure notification channels
668. **No booking confirmation page** — no post-booking success screen
669. **No payment confirmation page** — no post-payment receipt screen
670. **Dashboard home page no KPI cards** — no at-a-glance metrics
671. **Dashboard no real-time updates** — must refresh for new data
672. **Dashboard no drag-and-drop file upload** — manual file selection only
673. **No image optimization** — uploaded images not compressed/resized
674. **No avatar/photo cropping** — uploaded as-is
675. **No PDF generation** — no invoice/receipt PDF creation
676. **No email signature setup** — emails have no business signature
677. **No business hours display** — portal doesn't show business hours
678. **No holiday management** — no way to block holidays
679. **No service area definition** — no geographic boundaries
680. **No travel time calculation** — no driving time between bookings
681. **No supply tracking** — no inventory for cleaning supplies etc.
682. **No vehicle/equipment tracking** — no asset management
683. **No multi-language support** — English only
684. **No right-to-left (RTL) support** — no Arabic/Hebrew layout
685. **No accessibility statement** — no a11y documentation
686. **No privacy policy generator** — must write manually
687. **No terms of service generator** — must write manually
688. **No cookie policy** — no documentation of cookie usage
689. **No data processing agreement** — no DPA for GDPR
690. **No SOC 2 compliance documentation** — no security documentation
691. **Portal no appointment history pagination** — loads all bookings
692. **Portal no receipt download** — no payment receipt
693. **Portal no booking modification limits** — can reschedule unlimited times
694. **Portal no cancellation fee warning** — no cancellation policy display
695. **Portal no service description** — service types shown without details
696. **Portal no team member profile** — can't see who's assigned
697. **Portal no estimated arrival time** — no ETA for team member
698. **Portal no real-time tracking** — no live location of team member
699. **Portal no chat support** — no in-portal messaging
700. **Portal no FAQ section** — no self-service help

---

## CATEGORY 11: OPERATIONAL & SCALE (701-800)

701. **Lifecycle cron processes 1000 tenants max** — hardcoded limit
702. **Reminders cron processes 1000 tenants** — may miss tenants beyond limit
703. **Confirmations cron processes 1000 tenants** — same limit issue
704. **Daily summary cron processes 1000 tenants** — same limit issue
705. **No cron job overlap prevention** — long-running cron can overlap with next run
706. **No cron job progress tracking** — can't tell if cron is stuck
707. **No cron job retry on failure** — failed crons don't retry until next schedule
708. **No cron job alerting** — silent failures
709. **No database connection limits** — supabaseAdmin opens unlimited connections
710. **No query result size limits** — large result sets can OOM serverless function
711. **No request body size limits** — large POST bodies accepted
712. **No file upload size limits enforced** — large files can exhaust memory
713. **No CDN configuration** — static assets served directly from Vercel
714. **No image CDN** — uploaded images not optimized/cached
715. **No edge caching strategy** — no cache headers on API responses
716. **No stale-while-revalidate** — no SWR pattern for data fetching
717. **No database query optimization** — no EXPLAIN ANALYZE on critical paths
718. **No N+1 query detection** — silent performance degradation
719. **No performance monitoring** — no APM tool configured
720. **No error monitoring service** — no Sentry/Datadog/etc.
721. **No uptime monitoring** — no external health checks
722. **No log aggregation** — logs only in Vercel dashboard
723. **No structured logging** — console.log/error used throughout
724. **No request tracing** — no correlation IDs across services
725. **No metrics collection** — no business metrics pipeline
726. **No A/B testing framework** — no feature flagging
727. **No canary deployments** — all-or-nothing deploys
728. **No rollback automation** — manual rollback if deploy fails
729. **No staging environment documented** — no pre-production testing
730. **No load testing** — unknown breaking point
731. **No chaos engineering** — no failure simulation
732. **No disaster recovery drills** — no tested recovery process
733. **No multi-region deployment** — single region only
734. **No database read replicas** — all reads hit primary
735. **No caching layer** — no Redis/Memcached for hot data
736. **No message queue** — all processing synchronous
737. **No background job system** — crons only mechanism for async work
738. **No webhook retry queue** — failed webhooks not retried systematically
739. **No email queue** — emails sent synchronously in request
740. **No SMS queue** — SMS sent synchronously in request
741. **No bulk operation queue** — large imports block request
742. **Email sending timeout 15s** — may not be enough for large campaigns
743. **SMS sending timeout 15s** — may not be enough
744. **No circuit breaker for external APIs** — Stripe/Telnyx/Resend failures cascade
745. **No health check endpoint for load balancer** — no /healthz route
746. **No graceful shutdown handling** — in-progress requests may be lost
747. **No request timeout configuration** — long requests block serverless function
748. **No memory leak detection** — no heap monitoring
749. **No CPU profiling** — no performance profiling capability
750. **No database migration rollback** — no down migrations
751. **No feature flags** — all features always on
752. **No gradual rollout capability** — features enabled for all at once
753. **No tenant-specific feature flags** — can't enable features per tenant
754. **No API versioning** — breaking changes affect all clients
755. **No API documentation** — no OpenAPI/Swagger spec
756. **No API client SDK** — no generated client for third-party integrations
757. **No webhook sending system** — can't notify external systems of events
758. **No event bus** — no internal event-driven architecture
759. **No audit log retention policy** — audit logs grow forever
760. **No log rotation** — console logs accumulate
761. **No backup verification** — backup cron runs but never tested
762. **No data migration tooling** — manual SQL for schema changes
763. **No database schema documentation** — no ERD or data dictionary
764. **No API changelog** — no documentation of API changes
765. **No SLA definitions** — no uptime commitments documented
766. **No incident response plan** — no documented response process
767. **No runbook for common issues** — no operational documentation
768. **No on-call rotation** — no escalation process
769. **No status page** — no public status visibility
770. **No capacity planning** — no growth projections
771. **Supabase free tier limits** — may hit row/storage limits at scale
772. **Vercel free tier limits** — serverless function limits
773. **No cost monitoring** — no alerts on Supabase/Vercel/API spend
774. **No tenant isolation at infrastructure level** — all tenants share same DB
775. **No tenant data locality** — no region selection for GDPR
776. **No data encryption at rest** — relies on Supabase defaults
777. **No field-level encryption** — PII stored in plaintext
778. **No data masking in logs** — sensitive data may appear in console
779. **No PII detection** — no automated PII scanning
780. **No data classification** — no labeling of sensitive vs. non-sensitive data
781. **No penetration test schedule** — no regular security testing
782. **No vulnerability disclosure program** — no bug bounty or responsible disclosure
783. **No security awareness documentation** — no developer security guidelines
784. **No dependency vulnerability scanning** — no automated CVE checks
785. **No container scanning** — if containers used, no image scanning
786. **No secrets scanning in CI** — no detection of committed secrets
787. **No branch protection rules** — no required reviews or checks
788. **No CI/CD pipeline documentation** — deployment process undocumented
789. **No test suite** — no automated tests found
790. **No integration tests** — no end-to-end testing
791. **No API tests** — no route-level testing
792. **No visual regression tests** — no screenshot comparison
793. **No accessibility tests** — no automated a11y testing
794. **No performance tests** — no response time benchmarks
795. **No security tests** — no automated security scanning
796. **No code coverage tracking** — unknown test coverage
797. **No code quality tools** — no ESLint strict rules
798. **No type coverage tracking** — TypeScript strict but unchecked areas
799. **No dead code detection** — unused exports/functions accumulate
800. **No bundle size monitoring** — no tracking of client bundle growth

---

## CATEGORY 12: MISSING FEATURES FOR 1000-TENANT SCALE (801-1000)

801. **No tenant provisioning API** — manual setup for each tenant
802. **No self-service tenant signup** — admin must create each business
803. **No tenant onboarding automation** — no automated setup flow
804. **No tenant trial period management** — no free trial tracking
805. **No tenant billing metering** — can't track per-tenant usage
806. **No tenant usage dashboard** — no visibility into per-tenant costs
807. **No tenant resource quotas** — unlimited usage per tenant
808. **No tenant rate limiting** — one tenant can consume all resources
809. **No tenant data isolation verification** — no automated cross-tenant leak testing
810. **No tenant migration tooling** — can't move tenants between environments
811. **No tenant backup/restore per tenant** — only full database backup
812. **No tenant deactivation automation** — manual suspension process
813. **No tenant reactivation workflow** — no guided reactivation
814. **No tenant data export on offboarding** — no standard export format
815. **No tenant SLA tracking** — no uptime per tenant
816. **No multi-tenant search index** — search doesn't scale to 1000+ tenants
817. **No tenant-specific rate limits** — all tenants share same limits
818. **No tenant communication dashboard** — no view of all tenant notifications
819. **No tenant health score** — no aggregate health metric per tenant
820. **No tenant engagement tracking** — don't know if tenants are active
821. **No churn prediction** — no early warning for at-risk tenants
822. **No tenant NPS/satisfaction tracking** — no feedback collection from tenants
823. **No white-label configuration** — all tenants see FullLoop branding
824. **No custom email domain per tenant** — all emails from shared domain
825. **No custom SMS number per tenant** — shared Telnyx number
826. **No tenant-specific webhook endpoints** — can't notify tenant systems
827. **No tenant API keys** — tenants can't integrate via API
828. **No tenant SSO support** — no SAML/OIDC for enterprise tenants
829. **No tenant role customization** — fixed role set
830. **No tenant permission customization** — fixed permission set
831. **No multi-location support** — one business = one location
832. **No franchise management** — no parent/child tenant relationships
833. **No tenant groups/tags** — can't categorize tenants
834. **No tenant notes/CRM for internal tracking** — no admin notes on tenants
835. **No automated welcome email to new tenants** — manual welcome process
836. **No tenant documentation portal** — no self-service help per tenant
837. **No tenant support ticket system** — no in-app support
838. **No tenant announcement targeting** — basic targeting only
839. **No tenant feature request tracking** — no product feedback loop
840. **No tenant changelog notifications** — tenants don't know about updates
841. **No bulk SMS sending optimization** — sequential sends, not batched
842. **No email warming strategy** — new domains may hit spam filters
843. **No email deliverability monitoring** — no inbox placement tracking
844. **No SMS deliverability monitoring** — no delivery rate tracking
845. **No communication analytics per tenant** — no email/SMS performance metrics
846. **No automated SMS conversation threading** — inbound SMS not threaded
847. **No chatbot training per tenant** — Selena uses same prompt for all
848. **No chatbot conversation handoff** — no human takeover from AI
849. **No chatbot analytics** — no tracking of AI conversation outcomes
850. **No chatbot satisfaction rating** — no feedback on AI quality
851. **No payment split/commission** — no platform fee extraction
852. **No payment installments** — no pay-in-parts for large bookings
853. **No payment deposits** — no deposit collection before service
854. **No payment recurring billing** — no subscription billing for recurring services
855. **No payment invoice generation** — no professional invoices
856. **No payment tax calculation** — no sales tax/VAT handling
857. **No payment multi-currency** — USD only
858. **No payment reporting per tenant** — no financial summaries
859. **No payment reconciliation reports** — no matching of payments to bookings
860. **No payment dispute management UI** — no chargeback handling interface
861. **No GPS-verified service area** — no geofencing for service boundaries
862. **No route optimization** — no optimal job ordering for team members
863. **No drive time estimation** — no travel time between jobs
864. **No mileage tracking** — no distance logging for team
865. **No before/after photo documentation** — no service proof photos
866. **No digital signature capture** — no client sign-off on completion
867. **No service checklist system** — no task list per service type
868. **No quality assurance scoring** — no service quality metrics
869. **No inventory management** — no supply/product tracking
870. **No equipment maintenance tracking** — no asset lifecycle management
871. **No client satisfaction survey automation** — manual follow-up only
872. **No referral program management** — referral tracking basic
873. **No loyalty program** — no reward points system
874. **No gift card/voucher system** — no prepaid credits
875. **No package/bundle pricing** — can't bundle services
876. **No seasonal pricing** — no time-based price adjustments
877. **No dynamic pricing** — no demand-based pricing
878. **No discount/promo code system** — no coupon management
879. **No membership/subscription plans for clients** — no recurring client plans
880. **No client portal customization** — same portal for all tenants
881. **No booking widget for external websites** — no embeddable booking
882. **No Zapier/Make integration** — no third-party automation
883. **No QuickBooks/Xero integration** — no accounting sync
884. **No Google Calendar sync** — no bidirectional calendar integration
885. **No Apple Calendar sync** — no iCal support
886. **No Outlook Calendar sync** — no Microsoft integration
887. **No Slack integration** — no team communication integration
888. **No WhatsApp Business integration** — no WhatsApp messaging
889. **No Facebook Messenger integration** — no Meta messaging
890. **No Instagram integration** — no social posting
891. **No TikTok integration** — no short-form video posting
892. **No Yelp integration** — no Yelp review management
893. **No Thumbtack integration** — no lead source integration
894. **No Angi/HomeAdvisor integration** — no lead source integration
895. **No Nextdoor integration** — no neighborhood marketing
896. **No email marketing platform integration** — no Mailchimp/Constant Contact
897. **No CRM import from competitors** — no Jobber/Housecall Pro import
898. **No data API for custom integrations** — no REST/GraphQL API
899. **No webhook subscriptions for events** — can't push events to external systems
900. **No SSO with Google Workspace** — no Google sign-in for team
901. **No automated contract generation** — no service agreement documents
902. **No e-signature integration** — no DocuSign/HelloSign
903. **No document management** — no file storage per client/booking
904. **No photo gallery per client** — no visual history
905. **No time tracking beyond check-in/out** — no detailed time logging
906. **No payroll integration** — no ADP/Gusto export
907. **No tax form generation** — no 1099 generation for contractors
908. **No worker classification management** — no employee vs contractor tracking
909. **No insurance verification** — no proof of insurance tracking
910. **No license/certification tracking** — no credential management
911. **No background check integration** — no Checkr/GoodHire integration
912. **No training/onboarding system for team** — no LMS
913. **No team communication channel** — no in-app team chat
914. **No team scheduling preferences** — no preferred hours system
915. **No team performance reviews** — no structured feedback
916. **No team incentive tracking** — no bonus/commission tracking
917. **No territory management** — no geographic assignment
918. **No lead scoring** — no automated lead prioritization
919. **No lead nurture automation** — no drip campaign system
920. **No pipeline management** — no sales pipeline view
921. **No estimate/quote system** — no pre-booking pricing
922. **No proposal generation** — no professional proposals
923. **No competitor tracking** — no market intelligence
924. **No SEO management per tenant** — no per-tenant SEO tools
925. **No review generation automation** — basic request but no follow-up
926. **No review monitoring across platforms** — Google only
927. **No social proof widgets** — no embeddable review displays
928. **No branded mobile app** — web-only platform
929. **No push notification system working** — push.ts exists but not functional
930. **No in-app messaging system** — no client-tenant messaging
931. **No appointment reminders via WhatsApp** — SMS/email only
932. **No voice calling integration** — no click-to-call
933. **No IVR system** — no automated phone menu
934. **No call recording** — no phone call documentation
935. **No call transcription** — no automatic call notes
936. **No AI receptionist** — no automated phone answering
937. **No predictive scheduling** — no AI-based scheduling optimization
938. **No demand forecasting** — no booking volume prediction
939. **No weather-based scheduling** — no weather API integration
940. **No traffic-based scheduling** — no driving time adjustment
941. **No client preference learning** — no ML-based personalization
942. **No automated rebooking** — no "book again" automation
943. **No waitlist management** — no standby list for cancelled slots
944. **No overbooking management** — no planned overbooking strategy
945. **No no-show prediction** — no ML model for cancellation risk
946. **No dynamic availability** — no real-time slot adjustment
947. **No multi-service booking** — can't book multiple services at once
948. **No package booking** — can't book recurring + one-time together
949. **No group booking** — can't book for multiple locations
950. **No marketplace/directory** — no public listing of all businesses
951. **No client mobile app** — web portal only
952. **No team mobile app** — web portal only
953. **No Apple Watch integration** — no wearable notifications
954. **No Android widget** — no home screen booking widget
955. **No smart home integration** — no Alexa/Google Home booking
956. **No QR code check-in** — no contactless arrival
957. **No NFC tap check-in** — no physical card check-in
958. **No biometric verification** — no fingerprint/face ID for team
959. **No fleet management** — no vehicle tracking
960. **No fuel cost tracking** — no operating expense management
961. **No environmental impact tracking** — no sustainability metrics
962. **No carbon offset calculations** — no environmental responsibility
963. **No accessibility compliance audit** — WCAG 2.1 AA not verified
964. **No multi-timezone display** — only UTC/local shown
965. **No date format localization** — US format only (MM/DD)
966. **No number format localization** — US currency format only
967. **No email localization** — English templates only
968. **No SMS localization** — English messages only
969. **No right-to-left portal** — no RTL language support
970. **No automated testing pipeline** — no CI/CD tests
971. **No code review automation** — no automated PR reviews
972. **No documentation generation** — no auto-generated docs
973. **No API playground** — no interactive API testing
974. **No sandbox environment** — no safe testing space
975. **No data seeding for demos** — no demo data generation
976. **No demo mode** — no way to show platform without real data
977. **No competitor comparison pages** — no vs. Jobber/Housecall Pro
978. **No ROI calculator** — no value proposition tool
979. **No case study system** — no customer success stories
980. **No partner program management** — basic partner form only
981. **No affiliate tracking** — no referral commission for partners
982. **No reseller portal** — no white-label reselling
983. **No marketplace for add-ons** — no app store for integrations
984. **No developer portal** — no third-party developer resources
985. **No community forum** — no user community
986. **No knowledge base** — no searchable help articles
987. **No video tutorials** — no onboarding videos
988. **No webinar management** — no training event system
989. **No certification program** — no user certification
990. **No gamification** — no engagement mechanics
991. **No tenant benchmarking** — can't compare against industry averages
992. **No AI-powered insights** — no automated business recommendations
993. **No predictive analytics** — no forecast dashboards
994. **No custom report builder** — no user-defined reports
995. **No dashboard customization** — fixed widget layout
996. **No data export scheduling** — no automated report delivery
997. **No email digest customization** — fixed daily summary format
998. **No SMS marketing automation** — no drip SMS campaigns
999. **No cross-tenant analytics** — no platform-wide metrics for admin
1000. **No platform revenue dashboard** — no aggregate MRR/churn/LTV for admin

---

## SEVERITY BREAKDOWN

| Severity | Count | Range |
|----------|-------|-------|
| **CRITICAL (fix before launch)** | ~50 | Auth bypass, double-booking, no webhook verification, GDPR violations, plaintext API keys |
| **HIGH (fix this sprint)** | ~120 | Race conditions, missing validations, silent failures, timezone bugs, missing notifications |
| **MEDIUM (fix this month)** | ~200 | Missing error handling, UX issues, performance concerns, missing audit trails |
| **LOW/ENHANCEMENT** | ~630 | Missing features, scale concerns, integrations, operational tooling |

---

*Generated by exhaustive automated audit of every file in the FullLoop CRM platform codebase.*
