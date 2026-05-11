# Post-cutover action plan — immediately after nycmaid → fullloop

The cutover is T-0. This is what you do from T+0 onward. Print this. Have it on your phone.

---

## T+0 to T+5 min — confirm the flip took

- [ ] **T+0 immediately:** open Telnyx dashboard → SMS message logs. Wait for the next inbound SMS to arrive. Confirm it routes to fullloop's URL (not old nycmaid URL).
- [ ] **T+1:** send yourself a test SMS to (212) 202-8400 from your personal phone. Should get a Yinez response within 30 seconds.
- [ ] **T+2:** open Stripe dashboard → webhook events. Confirm last successful delivery went to fullloop's URL.
- [ ] **T+3:** `curl -I https://www.thenycmaid.com/` from your terminal. Verify it's hitting fullloop's Vercel (check the `x-vercel-id` header — should be fullloop project ID, not old nycmaid).
- [ ] **T+5:** if any of the above failed, **ROLLBACK NOW.** Do not push past 5 min without all 4 green.

## T+5 to T+15 — exercise critical paths

- [ ] **T+6:** make a real booking via thenycmaid.com/book. Use a test address. Verify booking appears in Supabase with `tenant_id = '00000000-0000-0000-0000-000000000001'`. Don't actually send the cleaner.
- [ ] **T+8:** Telegram check — send a message to your owner bot. Yinez should respond with a brief summary (Telegram channel = Jeff's private context).
- [ ] **T+10:** check /admin (you'll need to log in fresh on fullloop's deploy). All bookings + clients visible.
- [ ] **T+12:** trigger one cron manually via curl: `curl -H "Authorization: Bearer $CRON_SECRET" https://www.thenycmaid.com/api/cron/email-monitor`. Should respond `{"ok": true}` or similar.
- [ ] **T+15:** check Vercel function logs for fullloop project — no 5xx spikes.

## T+15 to T+60 — monitoring window

Keep these tabs open and refresh every ~5 min:

- [ ] Vercel function logs (fullloop project)
- [ ] Supabase logs (look for slow queries / errors)
- [ ] Telegram (Yinez auto-pings Jeff on errors)
- [ ] Stripe dashboard webhook deliveries
- [ ] Telnyx dashboard SMS message logs
- [ ] One curl loop: `while sleep 60; do curl -s -o /dev/null -w "%{time_total}s %{http_code} %{url_effective}\n" https://www.thenycmaid.com/; done` — uptime ping every minute

**Signals to abort and rollback:**
- 3+ consecutive 5xx errors on root URL → rollback
- Telnyx webhook delivery success rate drops below 95% → rollback
- Stripe webhook delivery success rate drops below 95% → rollback
- Yinez stops responding to SMS for 3+ minutes → rollback
- New booking inserts fail (check Supabase logs) → rollback
- Any error containing "tenant" or "permission" or "RLS" → investigate immediately

## T+60 — clear monitoring window

If everything green:
- [ ] Post "cutover stable T+60" on Telegram for record
- [ ] Set a phone alarm for T+4h to check again
- [ ] Stand down active watch

If anything unclear:
- [ ] Extend monitoring window another 30 min
- [ ] Don't sleep until everything is green

## T+4h to T+24h — sustained monitoring

- [ ] **T+4h:** check Vercel logs for last 4 hours — any 5xx pattern?
- [ ] **T+8h:** check Supabase — recent booking count matches expected hourly average
- [ ] **T+12h:** check Stripe — payments captured? Reconcile against Supabase bookings
- [ ] **T+24h:** check email — any failed transactional emails (Resend dashboard)?

Run a sanity SQL daily for the first week:
```sql
SELECT date(created_at) AS day, count(*) AS rows
FROM bookings
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND created_at > now() - interval '7 days'
GROUP BY day ORDER BY day DESC;
```
Numbers should match nycmaid's historical pattern.

## First week — what to NOT do

- [ ] **Don't delete nycmaid's old Vercel project.** Keep it idle as warm rollback for 30 days minimum.
- [ ] **Don't push code changes** to fullloop's branch without testing on preview first. The branch IS production now.
- [ ] **Don't add new tenants to the Vercel project** until nycmaid runs clean for 7 days.
- [ ] **Don't remove the non-nycmaid Yinez guard** until you've added a second tenant + tested their isolation.

## Rollback procedure (if anything trips alarm)

In order:

1. **Revert Telnyx webhook URL** to nycmaid's old Vercel project URL (Telnyx dashboard, ~1 min)
2. **Revert Stripe webhook URL** to nycmaid's old Vercel project URL (Stripe dashboard, ~1 min)
3. **Revert DNS A/CNAME** at registrar back to nycmaid's old Vercel (5-60 min propagation depending on TTL)
4. **Re-enable nycmaid's old Vercel project crons** if disabled during cutover
5. **Disable fullloop's cron schedule for nycmaid-only crons** so they don't double-fire while DNS propagates back
6. **Post on Telegram:** "rolled back at T+X, investigating"
7. **Do not re-attempt cutover for at least 24 hours.** Investigate root cause first.

## Reconciliation checklist (T+24h to T+48h)

If cutover stable for 24h, run these against Supabase:

- [ ] Booking count last 24h matches pre-cutover daily average (±20%)
- [ ] Payment count last 24h matches pre-cutover daily average
- [ ] SMS sent count last 24h reasonable (rating prompts + confirmations firing)
- [ ] No bookings with `tenant_id IS NULL` — they should all have nycmaid id
- [ ] Yinez response time stable (check `sms_conversation_messages.created_at` deltas)
- [ ] No `yinez_error` notifications in last 24h

## Second-tenant onboarding (T+7d minimum, only after nycmaid stable)

Before adding tenant #2 to the Vercel project:

- [ ] nycmaid running clean for 7+ days
- [ ] No pending bug fixes on the branch
- [ ] Test tenant's brand_config in `tenants` table is populated
- [ ] Test tenant's domain configured in Vercel project (but DNS not flipped yet)
- [ ] Send a test SMS using their phone number — Yinez responds, refuses (still guarded for non-nycmaid)
- [ ] Remove the non-nycmaid guard for THAT tenant specifically (allowlist their tenant_id), OR remove guard entirely if confident
- [ ] Re-test — Yinez responds correctly for that tenant
- [ ] Flip their DNS, monitor like nycmaid cutover

## What success looks like at T+30 days

- nycmaid running on fullloop for 30 days, zero rollbacks, zero data anomalies
- All 30+ env vars proven correct (no "oh we forgot X" surprises)
- Old nycmaid Vercel project safely archived
- Non-nycmaid Yinez guard removed, replaced with proper tenant_id verification in handlers
- 2-3 other tenants migrated successfully
- nycmaid customer-side SMS response time same or better than pre-cutover

## Phone numbers / dashboard URLs to have handy

- Telnyx dashboard: portal.telnyx.com
- Stripe dashboard: dashboard.stripe.com
- Supabase: supabase.com/dashboard/project/ioppmvchszymwswtwsze
- Vercel fullloop project: vercel.com/fullloopcrm/[project]
- Vercel old nycmaid project (for rollback): vercel.com/thenycmaid/[project]
- DNS registrar: wherever thenycmaid.com is registered (Cloudflare? Namecheap?)
- Telegram owner bot: t.me/[bot username]
