# Pre-cutover readiness verification — nycmaid

Run every item BEFORE flipping any webhook or DNS. If anything fails, stop and fix.

## State as of 2026-05-11

- Branch: `feat/multitenant-foundation`
- 32 commits, all local
- `npx next build` green (30,249 pages)
- `npx next start` boots, all 21 tenant homepages 200
- nycmaid prod: live and serving (/, /book, /portal, /admin all 200)
- Schema migration already applied to shared Supabase 2026-05-09 — nycmaid still works against it (proves migration didn't break existing data)

## Layer 1 — current nycmaid prod is healthy

- [ ] `curl -s https://www.thenycmaid.com/ -o /dev/null -w "%{http_code}\n"` → 200
- [ ] Send a real test SMS to (212) 202-8400, confirm Yinez responds via current nycmaid Vercel
- [ ] Make a test booking via thenycmaid.com/book, confirm it lands in nycmaid Supabase
- [ ] Check Telnyx dashboard: webhook URL points at current nycmaid Vercel project
- [ ] Check Stripe dashboard: webhook URL points at current nycmaid Vercel project
- [ ] Check Vercel current nycmaid project: latest deploy green, no recent error spikes

## Layer 2 — fullloop preview matches nycmaid behavior

Before flipping anything, deploy `feat/multitenant-foundation` to a fullloop Vercel preview with REAL env vars (not placeholder), then:

- [ ] Hit preview URL root → 200 (fullloop marketing site)
- [ ] Hit preview URL `/site/the-florida-maid` → 200 (existing fullloop tenant, sanity)
- [ ] Set request `Host: thenycmaid.com` (curl `--header "Host: thenycmaid.com"`), hit preview → renders nycmaid `/site/<nycmaid-slug>/` tree
- [ ] Hit preview `/api/yinez` POST with real ANTHROPIC_API_KEY in env → Yinez responds
- [ ] curl preview `/api/cron/email-monitor` with real CRON_SECRET → runs without error (won't see new emails until live, but should not error)
- [ ] curl preview `/api/cron/rating-prompt` with CRON_SECRET → tenant loop runs, sends zero SMS (no eligible bookings within 30min-24hr window)
- [ ] Send a Telnyx-test-webhook simulated inbound SMS POST to preview `/api/webhooks/telnyx` → routes to Yinez, doesn't crash

## Layer 3 — data integrity verification on shared DB

Run these queries directly on Supabase SQL editor (read-only):

- [ ] `SELECT count(*) FROM bookings WHERE tenant_id IS NULL` → 0
- [ ] `SELECT count(*) FROM clients WHERE tenant_id IS NULL` → 0
- [ ] `SELECT count(*) FROM cleaners WHERE tenant_id IS NULL` → 0
- [ ] `SELECT count(*) FROM sms_conversations WHERE tenant_id IS NULL` → 0
- [ ] `SELECT count(*) FROM tenants WHERE id = '00000000-0000-0000-0000-000000000001'` → 1 (nycmaid)
- [ ] `SELECT count(*), tenant_id FROM bookings GROUP BY tenant_id` → should show one row with nycmaid id and the full count (no rows under any other tenant)
- [ ] `SELECT count(*) FROM clients WHERE tenant_id != '00000000-0000-0000-0000-000000000001'` → 0 (all clients still belong to nycmaid)

## Layer 4 — Yinez handler scoping doesn't break nycmaid

Once on the fullloop preview with real env, exercise the same paths nycmaid uses:

- [ ] Send "hi" via SMS to a Telnyx-test number routed to preview → Yinez does the booking flow correctly
- [ ] Send a payment-related SMS ("paid via zelle") → Yinez handles via core handler (handleConfirmPayment)
- [ ] Send "schedule again" via SMS as a recurring client → handleManageRecurring works
- [ ] Trigger create_booking through web chat at preview URL — booking row appears with `tenant_id = nycmaid_uuid`

## Layer 5 — webhook compatibility

These webhooks change URLs at cutover. Verify each accepts the new URL BEFORE flipping:

- [ ] Telnyx supports per-number webhook URLs — confirm in Telnyx dashboard
- [ ] Stripe supports per-account webhook URLs — confirm in Stripe dashboard  
- [ ] Telegram bot webhook URL can be updated via Bot API — `curl https://api.telegram.org/bot$TOKEN/setWebhook` works

## Layer 6 — rollback rehearsal

Before flipping anything, walk through the rollback:

- [ ] Telnyx webhook URL: note the CURRENT URL (you'll need it for rollback)
- [ ] Stripe webhook URL: note the CURRENT URL
- [ ] DNS A/CNAME for thenycmaid.com: note current values + TTL (capture screenshot)
- [ ] nycmaid Vercel project: confirm it's still deployable (don't delete; idle for 30 days post-cutover)

## Hard go/no-go gate

Before T-0 of the actual cutover window:

- [ ] Every box above checked
- [ ] You're awake, focused, watching
- [ ] At least 1 hour reserved for monitoring post-cutover
- [ ] Telegram is open on your phone (Yinez will alert via Telegram on any error)
- [ ] One backup contact who could pick up if you get stuck — somebody who can revert DNS at the registrar if you can't

## If anything in Layer 1-6 fails

**STOP.** Don't flip. Fix the failed layer first. The fact that the failure surfaced before cutover is the system working.

## What "messes up nycmaid" looks like during cutover (and how to detect it)

| Symptom | Where to look | Rollback action |
|---|---|---|
| Inbound SMS not reaching Yinez | Telnyx dashboard message logs | Revert Telnyx webhook URL |
| Stripe payment not recorded | Stripe webhook deliveries log | Revert Stripe webhook URL |
| thenycmaid.com returning 5xx | New Vercel project logs | Revert DNS to old Vercel |
| Yinez responds with wrong tenant data | Supabase logs + tenant_id check | Toggle the non-nycmaid guard back on; investigate |
| Bookings inserted with wrong tenant_id | Supabase `SELECT tenant_id FROM bookings ORDER BY created_at DESC LIMIT 10` | Code bug — full rollback, don't bandage |
| Crons not firing | Vercel cron logs on new project | Verify CRON_SECRET set; rollback if cron count drops |

## Post-cutover monitoring window (first 60 minutes)

- [ ] T+5: real SMS test from your phone — Yinez responds within 30s
- [ ] T+10: make a real test booking — row in Supabase with tenant_id = nycmaid
- [ ] T+15: trigger /api/cron/email-monitor manually — sees recent payment email if any
- [ ] T+30: Telegram digest — anything weird in Yinez's logs?
- [ ] T+60: clear monitoring window. Either everything's green and you can go to bed, or you've already rolled back.
