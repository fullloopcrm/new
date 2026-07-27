// Shared content for the tenant Knowledge Panel (floating widget + full-page
// fallback at /dashboard/docs). One source of truth so the two surfaces never
// drift. Written for the business owner, not the engineer — plain language,
// no internal file paths or table names.

export interface DocQA {
  q: string
  a: string
}

export interface DocCategory {
  id: string
  label: string
  items: DocQA[]
}

export function tenantDocCategories(agentName: string): DocCategory[] {
  return [
    {
      id: 'getting-started',
      label: 'Getting Started',
      items: [
        {
          q: `What do I need to do first?`,
          a: `Check Settings → Services for your pricing and durations, add your team under HR with a PIN for each person, and confirm your billing info is on file. Everything else — bookings, clients, ${agentName} — works once those are in place.`,
        },
        {
          q: `How do I turn on ${agentName}?`,
          a: `Go to "AI (Voice | SMS | Web)" in the left nav and activate her there. Once on, she answers incoming texts, web chat, and (if you've set up a voice number) phone calls, booking clients 24/7 without you lifting a finger.`,
        },
        {
          q: `How do I add the web chat widget to my site?`,
          a: `Go to Connect (under ComHub) to grab the embed code, then paste it into your website before the closing body tag. No coding needed beyond that paste.`,
        },
      ],
    },
    {
      id: 'production',
      label: 'Bookings & Production',
      items: [
        {
          q: `What are the stages a booking moves through?`,
          a: `Scheduled → Confirmed → In Progress → Completed → Paid. Every status change is timestamped, so you have a full record of each job.`,
        },
        {
          q: `How does check-in/check-out work?`,
          a: `Your team checks in from their phone when they arrive (GPS-verified) and checks out when the job's done. That gives you confirmed start and end times for every visit, plus your team's hours for payroll.`,
        },
        {
          q: `What is the "Heads Up" (30-minute) button, and when should it be tapped?`,
          a: `Tap it when your team member is confirmed to be about 30 minutes from FINISHING the job — not on the way there. This is the core of getting paid: that single tap sends the client one text with their balance due, your payment link, and a quick "how'd we do, 1-5" rating ask, all at once. Tap it too early or late and the client gets asked to pay at the wrong moment, so timing it to the real 30-minutes-left mark matters.`,
        },
        {
          q: `How are job hours rounded for payroll?`,
          a: `To the nearest half hour, with a 10-minute grace period. A 3-hour job that runs 3:08 still bills as 3 hours; at 3:12 it rounds up to 3.5.`,
        },
        {
          q: `What are before/after walkthrough videos?`,
          a: `Your team can record a quick video before starting and after finishing a job. Both are attached to the booking and visible to the client in their portal — proof of work, and protection if a client ever disputes the job.`,
        },
        {
          q: `How do recurring jobs work?`,
          a: `Set up a weekly, bi-weekly, or monthly schedule for a repeat client under Sales → Schedule (or Production → Schedule). The system generates the next 4 weeks of bookings automatically so your calendar stays full.`,
        },
        {
          q: `Where do I find Crews and Projects?`,
          a: `Under Production: Crews groups team members for jobs that need more than one person; Projects tracks multi-visit jobs as a single unit instead of separate one-off bookings.`,
        },
      ],
    },
    {
      id: 'ai',
      label: `${agentName} — AI Booking Agent`,
      items: [
        {
          q: `What does ${agentName} actually do?`,
          a: `She handles incoming SMS and web chat conversations, collects what she needs (service, date/time, address, contact info), and books the appointment — all without you responding.`,
        },
        {
          q: `What happens with a returning client?`,
          a: `${agentName} recognizes their phone number, greets them by name, and already has their address and preferences on file — so rebooking is faster.`,
        },
        {
          q: `What if she can't handle something?`,
          a: `She tells the client someone from your team will follow up, and sends you a notification immediately so nothing slips through.`,
        },
        {
          q: `Can clients book by phone call too?`,
          a: `If you've set up a dedicated voice number for your business, yes — a voice version of your AI agent answers calls the same way she handles texts, using the exact same booking logic.`,
        },
        {
          q: `Where do I see how she's performing?`,
          a: `Visit the ${agentName} page for conversation stats — bookings handled, escalation rate, and conversion trend over any date range.`,
        },
      ],
    },
    {
      id: 'clients',
      label: 'Clients',
      items: [
        {
          q: `What is the New/Active/At-Risk/Churned tagging?`,
          a: `Clients are automatically categorized based on how recently and often they've booked, so you can spot at a glance who's a regular and who needs a win-back message.`,
        },
        {
          q: `Do I know where each client came from?`,
          a: `Yes — website, referral link, Google, or social media is tracked automatically per client, so you know which channels actually bring in paying customers.`,
        },
        {
          q: `What can clients see in their own portal?`,
          a: `Upcoming and past bookings, before/after walkthrough videos, and their account info. They verify with an SMS code — no password to remember.`,
        },
      ],
    },
    {
      id: 'sales',
      label: 'Sales Pipeline & Catalog',
      items: [
        {
          q: `How does the Sales pipeline work?`,
          a: `Left to right, six steps: Pipeline (overview) → Leads → Qualify → Quotes → Sales → Schedule. Every lead becomes a client automatically and moves through the same stages until it lands on your calendar.`,
        },
        {
          q: `What is the Catalog for?`,
          a: `Your master list of services and products with pricing — it's what you pull from when building a quote, so proposals stay consistent instead of re-typing the same line items every time.`,
        },
        {
          q: `What are Budget Templates?`,
          a: `Reusable estimate templates for common job types — labor and supplies already split out with your usual pricing, so a new quote for a familiar job takes seconds instead of starting from scratch.`,
        },
        {
          q: `How do I send a quote?`,
          a: `Build it on the Quotes tab with line items and an optional deposit — it sends by email and text together, and moves to Sales once the client signs.`,
        },
      ],
    },
    {
      id: 'referrals',
      label: 'Referrals & Sales Partners',
      items: [
        {
          q: `What's the difference between Referrals and Sales Partners?`,
          a: `Referrals is word-of-mouth — any client or contact who sends you business earns a reward through their own referral code and portal. Sales Partners is a formal program for people actively selling on your behalf, with a signed agreement and commission paid automatically via Stripe.`,
        },
        {
          q: `How do referrers/partners get paid?`,
          a: `Through Stripe Connect once they're set up — commission on qualifying bookings is calculated and transferred automatically. If a payout account isn't eligible yet, you'll see that flagged rather than a payment silently failing.`,
        },
      ],
    },
    {
      id: 'hr',
      label: 'HR & Team',
      items: [
        {
          q: `Where do I manage my team?`,
          a: `HR is split three ways: People (the employee record — comp, documents, onboarding), Roster & Schedule (who's working when — this is the Team page), and Ledger & Payroll (what everyone's actually paid).`,
        },
        {
          q: `How do team members log into their portal?`,
          a: `Phone number + 4-digit PIN — no app download, no separate account. It works from any phone browser and can be saved to the home screen.`,
        },
        {
          q: `How do I send an announcement to the whole team?`,
          a: `Post it from Announcements (under Production) — it shows up in every team member's portal feed.`,
        },
      ],
    },
    {
      id: 'finance',
      label: 'Finance',
      items: [
        {
          q: `What are the Finance tabs?`,
          a: `Overview, Transactions, Expenses, Ledger & Payroll, Reconcile, Reports, Close, and Accountant — one page, no page reloads between them.`,
        },
        {
          q: `How is team pay calculated?`,
          a: `Automatically from check-in/check-out time times each person's pay rate, with the same half-hour rounding and 10-minute grace period used for job billing.`,
        },
        {
          q: `Can I track equipment and vendor costs?`,
          a: `Yes — Equipment, Vendors, and Inventory let a job's true cost reflect supply and equipment costs, not just labor, so your margin numbers are real.`,
        },
        {
          q: `What is Ledger & Payroll vs. Books?`,
          a: `Same page — it's reachable both from the Finance hub's tab and directly from HR's Roster & Schedule sub-nav, since payroll touches both teams.`,
        },
      ],
    },
    {
      id: 'connect',
      label: 'Loop Connect (Messages)',
      items: [
        {
          q: `Where did the Messages tab go?`,
          a: `It's now called Loop Connect, under ComHub — your direct line to Full Loop support (pinned at the top), plus your team channels and any group channels you've created, all in one inbox.`,
        },
        {
          q: `Does Full Loop see my texts to clients?`,
          a: `No — Connect is separate from client/team SMS. It's specifically your in-app line to the Full Loop support team, and internal team-to-team messaging.`,
        },
        {
          q: `Is Connect bilingual?`,
          a: `Yes — every message is automatically translated EN/ES at send time, so English- and Spanish-speaking team members can read every thread in their own language.`,
        },
      ],
    },
    {
      id: 'marketing',
      label: 'Marketing & Social',
      items: [
        {
          q: `What shows up under Marketing?`,
          a: `Campaigns (email/SMS), Reviews (Google + manual), Social, Google Business Profile, Websites, and Analytics.`,
        },
        {
          q: `How does the review request flow work?`,
          a: `After a job completes, the system can automatically text/email the client a review request pointing to your Google listing — hands-off reputation building.`,
        },
        {
          q: `Do social posts publish automatically?`,
          a: `Once you've connected an account, yes — scheduled posts go out on their own, and the connection refreshes itself so it doesn't quietly expire.`,
        },
      ],
    },
    {
      id: 'notifications',
      label: 'Notifications',
      items: [
        {
          q: `What will I get notified about?`,
          a: `New bookings, check-ins/check-outs, 30-minute heads-ups, uploaded videos, escalations, new clients, cancellations, and payment updates — the bell icon in your header shows your unread count.`,
        },
        {
          q: `Can I get notified even when the dashboard is closed?`,
          a: `Yes, if you enable browser push notifications when prompted on first visit.`,
        },
      ],
    },
    {
      id: 'settings',
      label: 'Settings',
      items: [
        {
          q: `What can I configure in Settings?`,
          a: `Business info & hours, Services & pricing, Integrations (Telnyx for SMS, Resend for email, Stripe for payments, Google for reviews), and Branding (colors, logo, tagline). Team-facing guidance to your crew is now posted through Announcements as a running feed instead of a single Settings text box, so your whole history of instructions is visible, not just the latest one.`,
        },
        {
          q: `Can I set up my own automated messages or triggers?`,
          a: `Not directly — automations run off a shared, platform-maintained registry, so a brand-new trigger type needs to be built by the Full Loop team. If you want one that doesn't exist yet, ask in Full Loop Support (Loop Connect) and it gets added for everyone.`,
        },
        {
          q: `What is the gear icon on every page?`,
          a: `It opens that specific page's settings drawer — the same gear, same drawer pattern everywhere, so settings for whatever you're looking at are always one click away.`,
        },
      ],
    },
    {
      id: 'support',
      label: 'Need Help?',
      items: [
        {
          q: `How do I reach Full Loop support?`,
          a: `Use the pinned "Full Loop Support" thread inside Loop Connect for account questions, billing, or anything platform-related — replies land right in that thread. For anything urgent, email support@homeservicesbusinesscrm.com.`,
        },
      ],
    },
  ]
}
