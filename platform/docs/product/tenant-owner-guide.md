# FullLoop CRM — Tenant Owner Guide

**What this is:** a standalone walkthrough of how FullLoop actually works today for a
business owner running their operation on the platform — traced against the real
`/dashboard` navigation and code, not a feature wishlist.

**Honest note on what already exists:** the in-app **Knowledge Panel** (help icon on
every dashboard page, or `/dashboard/docs`) already has a solid tenant-facing Q&A
covering most of this ground — see `src/lib/tenant-docs-content.ts`. This guide is a
companion, not a replacement: the Knowledge Panel is the always-current in-app
reference (owned by the product, ships with it); this document is the walkthrough a
salesperson or onboarding specialist can hand a prospect **before** they've ever
logged in, and a longer-form version organized by workflow instead of Q&A. If the two
ever disagree, `tenant-docs-content.ts` is the source of truth — update this file to
match, not the other way around.

---

## 1. What you're running

FullLoop is your business's CRM, booking engine, and AI front desk in one dashboard —
one login, no separate tools for scheduling, invoicing, team pay, marketing, and
customer messaging. Your business gets its own subdomain (`<yourname>.fullloopcrm.com`)
or your own custom domain, a public-facing site, and a private `/dashboard` only you
and your team can reach.

Everything in this guide maps to the left-hand navigation inside `/dashboard`:

| Nav section | What it's for |
|---|---|
| **The Loop** (home) | Your daily overview — today's jobs, alerts, quick stats |
| **Clients** | Every customer, tagged New/Active/At-Risk/Churned automatically, plus their own self-serve portal |
| **ComHub** | All customer/team communication — Loop Connect (your line to Full Loop support + team chat) lives here |
| **Sales** | Leads → Qualify → Quotes → Sales → Schedule, plus your Catalog and Sales Partners/Referrals |
| **Production** | Bookings, Projects, the Schedule/Calendar, Crews, and Announcements to your team |
| **Finance** | Overview, Transactions, Expenses, Ledger & Payroll, Reconcile, Reports, Close, Accountant handoff |
| **HR** | Your team roster, PINs, documents, and payroll |
| **Marketing** | Campaigns, Reviews, Social, Google Business Profile, your Websites, and Analytics |
| **Settings / Users / AI / Legal** | Business config, staff logins, your AI agent, and legal docs |

## 2. Getting live — the first things to set up

Before your AI agent or booking flow can do anything useful:

1. **Settings → Services** — your service list, pricing, and durations. This is what
   your AI agent quotes from, and what shows on booking forms.
2. **HR → add your team** — each person gets a 4-digit PIN and logs into the mobile
   team portal with their phone number, no app download required.
3. **Settings → Integrations → billing** — confirm your payment/billing info is on
   file so charges (yours to the platform, and yours from clients) process cleanly.
4. **Turn on your AI agent** — nav item "AI (Voice | SMS | Web)". Once activated it
   answers incoming texts and web chat 24/7 and books appointments without you
   touching a keyboard. If you've set up a dedicated voice number, it answers phone
   calls with the same logic.
5. **Add the web chat widget to your site** — ComHub → Loop Connect has the embed
   snippet; paste it before your site's closing `</body>` tag.

## 3. Running a job: the booking lifecycle

A booking moves through five stages, each timestamped:
**Scheduled → Confirmed → In Progress → Completed → Paid.**

- **Check-in / check-out**: your team member checks in on arrival (GPS-verified) and
  checks out when done — that's your record of real start/end times, and it feeds
  payroll automatically.
- **The "Heads Up" (30-minute) button**: tap it when your team is about 30 minutes
  from *finishing* — not from arriving. That single tap sends the client one text
  with their balance due, a payment link, and a 1–5 rating ask, all at once. This is
  the core of getting paid on time; tapping it at the wrong moment asks the client to
  pay before (or long after) the job's actually done.
- **Hours rounding for payroll**: nearest half hour, with a 10-minute grace period —
  a job running 3:08 still bills 3 hours; 3:12 rounds to 3.5.
- **Before/after videos**: your team can record a quick walkthrough before starting
  and after finishing. Both attach to the booking and are visible to the client in
  their portal — proof of work, and your protection if a job is ever disputed.
- **Recurring jobs**: set a weekly/bi-weekly/monthly schedule under Sales → Schedule
  (or Production → Schedule) and the system keeps generating the next several weeks
  of bookings automatically.
- **Crews vs. Projects**: Crews group team members for jobs needing more than one
  person; Projects track a multi-visit job as one unit instead of a string of
  separate bookings.

## 4. Selling: the pipeline

Left to right, six steps: **Pipeline (overview) → Leads → Qualify → Quotes → Sales →
Schedule.** Every lead becomes a client record automatically and rides that same
pipeline until it lands on your calendar.

- **Catalog** is your master service/product price list — quotes pull from it so
  proposals stay consistent instead of re-typed line items every time.
- **Budget Templates** are reusable cost breakdowns (labor/supplies already split,
  your usual pricing) for common job types — a new quote for a familiar job takes
  seconds.
- A **quote** sends by email and text together from the Quotes tab, with an optional
  deposit, and moves to Sales the moment the client signs.

## 5. Clients

- **New / Active / At-Risk / Churned** tags are computed automatically from booking
  recency and frequency — a glance tells you who needs a win-back message.
- **Lead source** (website, referral, Google, social) is tracked per client, so you
  know which channels actually convert to paying customers.
- Clients get their **own portal** — upcoming/past bookings, before/after videos,
  account info — verified by SMS code, no password to manage.

## 6. Getting paid, and paying your team

Finance is one page with tabs: Overview, Transactions, Expenses, Ledger & Payroll,
Reconcile, Reports, Close, Accountant.

- **Team pay** is computed automatically from check-in/check-out time × each
  person's pay rate, using the same half-hour rounding/grace period as job billing.
- **Equipment, Vendors, Inventory** let a job's true cost reflect supplies and
  equipment, not just labor, so your margin numbers are real.
- **Referrals vs. Sales Partners**: Referrals is word-of-mouth — any client or
  contact earns a reward through their own referral code/portal. Sales Partners is a
  formal, signed-agreement program with commission paid automatically via Stripe
  Connect once their payout account is set up (you'll see a flag if it isn't
  eligible yet, rather than a payment silently failing).

## 7. Marketing & reputation

Campaigns (email/SMS), Reviews (Google + manual), Social, Google Business Profile,
Websites, and Analytics all live under Marketing. After a job completes, the system
can automatically text/email the client a review request pointing at your Google
listing — hands-off reputation building. Once a social account is connected, posts go
out on schedule and the connection self-refreshes instead of quietly expiring.

## 8. Talking to Full Loop support

**ComHub → Loop Connect** has a pinned "Full Loop Support" thread — that's your
direct line for account, billing, or platform questions; replies land right there.
It's separate from your client/team SMS — Full Loop doesn't see your customer texts
through this channel. Every Connect message is auto-translated EN/ES at send time, so
bilingual teams can each read in their own language. For anything urgent, email
support@homeservicesbusinesscrm.com.

## 9. What you can't self-serve (yet)

Automations run off a shared, platform-maintained trigger registry — you can't wire
up a brand-new automated message type yourself. If you want one that doesn't exist,
ask in Loop Connect and it gets built for everyone, not just your account. Team-facing
instructions to your crew post through Announcements as a running feed (not a single
editable text box), so your whole history of guidance stays visible.

---

**Cross-references:** in-app source of truth is `src/lib/tenant-docs-content.ts`
(Knowledge Panel). For the platform-side view of how a tenant gets created and
activated in the first place, see `docs/product/admin-guide.md` § Tenant Lifecycle.
