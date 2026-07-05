// Feature landing-page data (batch C). Assembled in ./features.ts.
// Includes the roadmap trio (status: "in-progress") — marketed as rolling out.
import type { Feature } from "./features";

export const featuresC: Feature[] = [
  {
    slug: "finance-dashboard",
    category: "Finance",
    eyebrow: "Section 05 · Finance",
    name: "Real-Time Finance Dashboard",
    status: "live",
    title:
      "Real-Time Finance Dashboard for Home Service Businesses | Know Your Numbers — Full Loop CRM",
    metaDescription:
      "Full Loop's finance dashboard shows revenue, outstanding invoices, payroll costs, and profit/loss in real time — the financial clarity most service owners never had, without hiring a bookkeeper.",
    keywords: [
      "real-time finance dashboard",
      "profit and loss for contractors",
      "home service financial software",
      "revenue tracking service business",
      "AR aging dashboard",
      "cash flow tracking",
      "financial clarity small business",
      "service business P&L",
    ],
    h1: "A Real-Time Finance Dashboard That Shows Exactly Where You Stand",
    heroSub:
      "Revenue, outstanding invoices, payroll costs, and profit/loss — live, in one view, without a bookkeeper.",
    intro:
      "Most service owners fly blind on their finances until the accountant tells them how last year went. Full Loop's finance dashboard puts the numbers in front of you now: revenue, receivables, payroll costs, and profit/loss update in real time as jobs complete and payments land — so you make decisions on facts instead of gut feel.",
    problem: {
      heading: "Why running blind on finances is dangerous",
      body:
        "When you can't see revenue, receivables, and profit until a quarterly bookkeeping catch-up, you make pricing, hiring, and spending decisions on instinct. By the time a problem shows up in the books, it's already months old and expensive to fix.",
    },
    blocks: [
      {
        heading: "Live revenue and profit/loss",
        body:
          "See real-time revenue and profit/loss as jobs complete and payments come in, so you always know whether the month is actually working.",
      },
      {
        heading: "Receivables and AR aging",
        body:
          "Track outstanding invoices and how long they've been unpaid, so you can chase the money that's actually overdue instead of guessing.",
      },
      {
        heading: "Payroll cost visibility",
        body:
          "Labor is usually the biggest cost in a service business. The dashboard surfaces payroll costs against revenue so your margins are never a mystery.",
      },
      {
        heading: "Fed by the whole platform",
        body:
          "Because payments, invoices, and payroll all live in Full Loop, the dashboard reflects your real numbers automatically — no manual data entry, no stale spreadsheet.",
      },
    ],
    outcome: {
      heading: "Decisions grounded in real numbers",
      body:
        "You always know your revenue, what's owed to you, what labor is costing, and whether you're profitable — right now, not next quarter. It's the financial clarity that usually requires a bookkeeper, built into the platform.",
    },
    faqs: [
      {
        question: "What does the finance dashboard show?",
        answer:
          "Real-time revenue, outstanding invoices and AR aging, payroll costs, and profit/loss — the core numbers that tell you how the business is actually doing.",
      },
      {
        question: "Do I need a bookkeeper to use it?",
        answer:
          "No. Because payments, invoices, and payroll flow through the platform, the dashboard populates automatically without manual bookkeeping.",
      },
      {
        question: "Is the data actually real-time?",
        answer:
          "Yes. Figures update as jobs complete and payments are recorded, so you're looking at current numbers, not last month's.",
      },
      {
        question: "Can I see what clients still owe me?",
        answer:
          "Yes. Outstanding invoices and AR aging are shown directly, so you can see and chase overdue balances at a glance.",
      },
    ],
    relatedSlugs: ["auto-invoicing", "one-click-payroll", "automated-bookkeeping"],
  },

  {
    slug: "win-back-campaigns",
    category: "Retention",
    eyebrow: "Stage 7 of 7 · Retention",
    name: "Win-Back Campaigns",
    status: "live",
    title:
      "Automated Win-Back Campaigns for Home Service Businesses | Recover Lapsed Clients — Full Loop CRM",
    metaDescription:
      "Full Loop automatically targets clients who haven't booked in a set period with personalized SMS and email offers — bringing lapsed customers back without you lifting a finger.",
    keywords: [
      "win-back campaigns",
      "lapsed client recovery",
      "customer reactivation software",
      "automated retention campaigns",
      "re-engage past customers",
      "churn recovery home services",
      "SMS win-back",
      "client reactivation",
    ],
    h1: "Win-Back Campaigns That Recover Lapsed Clients Automatically",
    heroSub:
      "Clients who've gone quiet get personalized offers by SMS and email on their own schedule — reactivation without you lifting a finger.",
    intro:
      "The cheapest customer to win is one you already served. Full Loop's win-back campaigns automatically find clients who've stopped booking and re-engage them with personalized offers by SMS and email — so lapsed revenue comes back on autopilot instead of quietly disappearing.",
    problem: {
      heading: "Why lapsed clients silently drain revenue",
      body:
        "Customers rarely announce they're leaving — they just stop booking. Without a system watching for it, you don't notice until the revenue's already gone, and manually tracking who's gone quiet across your whole client list never happens.",
    },
    blocks: [
      {
        heading: "Automatic lapsed-client detection",
        body:
          "The system watches for clients who haven't booked within a set period and targets them for re-engagement — no manual list-building required.",
      },
      {
        heading: "Personalized multi-channel offers",
        body:
          "Lapsed clients receive personalized messages with special offers by SMS and email, tuned to bring them back rather than a generic blast.",
      },
      {
        heading: "Runs hands-free",
        body:
          "Once configured, campaigns run automatically in the background, recovering revenue without you managing each outreach.",
      },
      {
        heading: "Works with reviews and referrals",
        body:
          "Win-back sits alongside review requests and referral tracking, so retention, reputation, and word-of-mouth reinforce each other.",
      },
    ],
    outcome: {
      heading: "Recovered revenue, on autopilot",
      body:
        "Clients who drifted away get pulled back automatically, lapsed revenue is recaptured instead of lost, and retention stops depending on you remembering to reach out. Your customer base compounds instead of leaking.",
    },
    faqs: [
      {
        question: "How does it know a client has lapsed?",
        answer:
          "It automatically detects clients who haven't booked within a set period and targets them for win-back outreach, without you building lists by hand.",
      },
      {
        question: "What channels does it use?",
        answer:
          "Personalized SMS and email offers, so lapsed clients are re-engaged through the channels they respond to.",
      },
      {
        question: "Do I have to run the campaigns manually?",
        answer:
          "No. Once set up, win-back campaigns run automatically in the background, recovering revenue without ongoing effort from you.",
      },
      {
        question: "How is this different from a mass blast?",
        answer:
          "Win-back specifically targets lapsed clients with personalized offers, rather than blasting your whole list, so the outreach is relevant and more likely to convert.",
      },
    ],
    relatedSlugs: ["review-management", "referral-program", "ai-receptionist"],
  },

  {
    slug: "referral-program",
    category: "Retention",
    eyebrow: "Stage 7 of 7 · Retention",
    name: "Referral Program",
    status: "live",
    title:
      "Built-In Referral Program for Home Service Businesses | Turn Clients Into Salespeople — Full Loop CRM",
    metaDescription:
      "Full Loop includes referral tracking with commission management — it tracks the referral source, credits the commission, and manages payouts, turning your happiest clients into your best salespeople.",
    keywords: [
      "referral program software",
      "referral tracking",
      "customer referral commissions",
      "word of mouth marketing software",
      "referral rewards home services",
      "built-in referral program",
      "client referral tracking",
      "referral payout management",
    ],
    h1: "A Built-In Referral Program That Turns Clients Into Salespeople",
    heroSub:
      "Track the referral source, credit the commission, and manage payouts automatically — word-of-mouth you can actually measure.",
    intro:
      "Word of mouth is the best lead source a service business has, and the one almost nobody systematizes. Full Loop's built-in referral program makes it measurable: it tracks who referred whom, credits the commission automatically, and manages the payout — turning your happiest clients into a sales force you don't have to hire.",
    problem: {
      heading: "Why most referral programs never happen",
      body:
        "Referrals get promised and forgotten because tracking them by hand is a mess — who sent whom, whether they booked, and what reward is owed. Without a system, the most valuable lead channel you have runs on luck instead of design.",
    },
    blocks: [
      {
        heading: "Automatic referral-source tracking",
        body:
          "When a client refers a friend, the platform tracks the referral source through to the booking, so you always know where new business came from.",
      },
      {
        heading: "Commission crediting",
        body:
          "The referrer's reward is credited automatically once the referral converts, with no manual bookkeeping to remember or reconcile.",
      },
      {
        heading: "Payout management",
        body:
          "Full Loop manages referral payouts, so rewards actually get paid — the part that, when it fails, quietly kills a referral program's momentum.",
      },
      {
        heading: "Fuels your owned pipeline",
        body:
          "Referrals feed the same owned lead pipeline as your SEO network, compounding word-of-mouth on top of organic search.",
      },
    ],
    outcome: {
      heading: "Word-of-mouth that runs like a system",
      body:
        "Your best clients bring you more clients, every referral is tracked and rewarded, and a channel that used to run on luck now runs on design. Referral revenue becomes repeatable instead of accidental.",
    },
    faqs: [
      {
        question: "How are referrals tracked?",
        answer:
          "The platform tracks the referral source from the referred client through to the booking, so you know exactly who drove each new customer.",
      },
      {
        question: "Do commissions get calculated automatically?",
        answer:
          "Yes. When a referral converts, the referrer's commission is credited automatically, with no manual tracking or reconciliation.",
      },
      {
        question: "Does it handle paying out rewards?",
        answer:
          "Yes. Full Loop manages referral payouts so rewards are actually delivered, which is what keeps a referral program working over time.",
      },
      {
        question: "Is the referral program an add-on?",
        answer:
          "No. Referral tracking and commission management are built into the platform, not a separate tool you have to integrate.",
      },
    ],
    relatedSlugs: ["win-back-campaigns", "review-management", "client-booking-portal"],
  },

  {
    slug: "loop-connect",
    category: "Platform",
    eyebrow: "Platform · Messaging",
    name: "Loop Connect",
    status: "live",
    title:
      "Loop Connect — Built-In Team & Client Messaging | One Platform, No Group Texts — Full Loop CRM",
    metaDescription:
      "Loop Connect gives you Slack-style channels across your whole operation — your team, each client, and each crew member — so messaging lives inside the platform instead of scattered across personal phones and group texts.",
    keywords: [
      "team messaging software",
      "field crew communication app",
      "built-in business messaging",
      "client messaging platform",
      "internal team chat home services",
      "crew communication software",
      "operations messaging",
      "no more group texts",
    ],
    h1: "Loop Connect: All Your Team and Client Messaging in One Place",
    heroSub:
      "Slack-style channels for your team, each client, and each crew member — messaging inside the platform, not scattered across personal phones.",
    intro:
      "When team coordination lives in personal text threads and group chats, context gets lost, messages get missed, and nothing ties back to the actual job. Loop Connect pulls it all into the platform: direct, channel-based messaging across your team, your clients, and your crews — so every conversation sits next to the work it's about.",
    problem: {
      heading: "Why group texts break down as you grow",
      body:
        "Personal-phone group texts don't scale: important messages scroll away, no one owns the thread, and when someone leaves, the history walks out the door with them. Coordination that lives outside your business system is coordination you can't see or control.",
    },
    blocks: [
      {
        heading: "Channels across the whole operation",
        body:
          "Slack-style channels connect your team internally, each client, and each crew member — so the right people are in the right conversation without a tangle of separate group texts.",
      },
      {
        heading: "Messaging tied to the work",
        body:
          "Because it lives in the platform, conversations sit alongside the clients, jobs, and crews they're about — no jumping between a texting app and your CRM to get context.",
      },
      {
        heading: "Direct messaging built in",
        body:
          "Reach any team member, crew, or client directly inside Full Loop, keeping business communication on the business system instead of personal phones.",
      },
      {
        heading: "History that stays with the business",
        body:
          "Conversations are retained in the platform, so context doesn't vanish when someone changes their number or leaves the team.",
      },
    ],
    outcome: {
      heading: "Coordination that finally lives in one place",
      body:
        "Your team, clients, and crews communicate inside the platform, messages stay tied to the work, and conversation history belongs to the business — not a personal phone. Coordination stops leaking out of systems you can't control.",
    },
    faqs: [
      {
        question: "What is Loop Connect?",
        answer:
          "Built-in, Slack-style messaging across your whole operation — channels and direct messages connecting your team, each client, and each crew member inside the platform.",
      },
      {
        question: "How is it better than group texts?",
        answer:
          "Messages stay organized in channels tied to the work, don't scroll away in a personal thread, and remain with the business even when someone leaves or changes numbers.",
      },
      {
        question: "Can I message clients through it?",
        answer:
          "Yes. Loop Connect includes client channels, so client communication lives alongside their bookings and history rather than in a separate app.",
      },
      {
        question: "Is it a separate app to install?",
        answer:
          "No. Loop Connect is part of the Full Loop platform, so messaging happens right next to the rest of your operation.",
      },
    ],
    relatedSlugs: ["ai-receptionist", "smart-scheduling", "gps-verified-check-in"],
  },

  {
    slug: "hr-automation",
    category: "Back Office",
    eyebrow: "Roadmap · Rolling out",
    name: "HR Automation",
    status: "in-progress",
    title:
      "HR Automation for Home Service Businesses | Hire and Onboard Without the Admin — Full Loop CRM",
    metaDescription:
      "Full Loop's HR automation (in development) handles hiring, onboarding, and compliance for your field team end to end — application-to-payroll onboarding, portal provisioning, time-off tracking, and document collection — so growing your crew never means growing your admin load.",
    keywords: [
      "HR automation for home services",
      "field team onboarding software",
      "crew hiring software",
      "employee onboarding automation",
      "HR software for contractors",
      "time-off tracking",
      "team compliance software",
      "small business HR automation",
    ],
    h1: "HR Automation That Lets You Grow Your Crew Without Growing the Admin",
    heroSub:
      "Application-to-payroll onboarding, portal provisioning, time-off tracking, and document collection — automated end to end. In development, rolling out to partner accounts.",
    intro:
      "Hiring should mean more capacity, not more paperwork. Full Loop's HR automation — actively in development — takes the last manual corner of a growing service business and puts it on autopilot: from application to payroll-ready in a single flow, with portal access, documents, and compliance handled automatically. It rolls out to partner accounts as it ships, included in your subscription.",
    problem: {
      heading: "Why hiring gets harder as you grow",
      body:
        "Every new crew member today means manual onboarding — collecting documents, setting up access, tracking time off, and staying compliant. That admin load grows with your headcount, so scaling your team quietly turns into a second job you never signed up for.",
    },
    blocks: [
      {
        heading: "Application-to-payroll onboarding",
        body:
          "New hires move from application to payroll-ready in one guided flow, so onboarding a crew member doesn't mean a stack of manual steps.",
      },
      {
        heading: "Automatic portal & PIN provisioning",
        body:
          "New team members are provisioned with field-portal access and secure PIN login automatically, so they're ready to work without IT setup.",
      },
      {
        heading: "Time-off and document tracking",
        body:
          "Time-off requests and required documents are tracked in one place, keeping your team organized and compliant as it grows.",
      },
      {
        heading: "Compliance-ready records",
        body:
          "Onboarding feeds into 1099/W-2-ready records, connecting hiring directly to the payroll and tax tracking already in the platform.",
      },
    ],
    outcome: {
      heading: "Scale your team without scaling the paperwork",
      body:
        "Growing your crew becomes adding capacity, not adding admin — onboarding is automatic, records stay compliant, and the back office keeps up on its own. This capability is rolling out to partner accounts as it ships.",
    },
    faqs: [
      {
        question: "Is HR automation available now?",
        answer:
          "It's actively in development and rolling out to partner accounts as it ships, included in your subscription. Today's platform already handles applications, PIN provisioning, and payroll — HR automation extends that into full onboarding and compliance.",
      },
      {
        question: "What will HR automation cover?",
        answer:
          "Application-to-payroll onboarding, automatic portal and PIN provisioning, time-off tracking, document collection, and 1099/W-2-ready records for your field team.",
      },
      {
        question: "Will it connect to payroll?",
        answer:
          "Yes. HR automation is designed to feed directly into the existing payroll and tax tracking, so hiring and paying your team live in one system.",
      },
      {
        question: "Do I pay extra for it?",
        answer:
          "No. It's included in your Full Loop subscription and becomes available to your account as it rolls out.",
      },
    ],
    relatedSlugs: ["gps-verified-check-in", "one-click-payroll", "contractor-1099-cpa-portal"],
  },

  {
    slug: "automated-bookkeeping",
    category: "Back Office",
    eyebrow: "Roadmap · Rolling out",
    name: "Automated Bookkeeping",
    status: "in-progress",
    title:
      "Automated Bookkeeping for Home Service Businesses | Books That Write Themselves — Full Loop CRM",
    metaDescription:
      "Full Loop's automated bookkeeping (in development) categorizes transactions, reconciles your bank feed, and keeps a CPA-ready monthly close current in real time — because every payment and payout already flows through the platform.",
    keywords: [
      "automated bookkeeping software",
      "bookkeeping automation home services",
      "auto transaction categorization",
      "bank reconciliation software",
      "monthly close automation",
      "bookkeeping for contractors",
      "real-time books",
      "CPA-ready bookkeeping",
    ],
    h1: "Automated Bookkeeping That Writes Your Books As You Work",
    heroSub:
      "Transaction categorization, bank reconciliation, and a CPA-ready monthly close — kept current in real time. In development, rolling out to partner accounts.",
    intro:
      "Because every payment, payout, and expense already flows through Full Loop, the ledger can write itself. Automated bookkeeping — actively in development — categorizes transactions, reconciles your bank feed, and keeps a CPA-ready monthly close current in real time, so your books stay done instead of piling up for tax season.",
    problem: {
      heading: "Why bookkeeping falls behind",
      body:
        "Manual bookkeeping is the chore that always slips — transactions go uncategorized, reconciliation waits until quarter-end, and by tax time you're paying someone to reconstruct months of activity. Books that are always behind mean decisions made on stale numbers.",
    },
    blocks: [
      {
        heading: "Automatic transaction categorization",
        body:
          "Payments, payouts, and expenses flowing through the platform are categorized automatically, so your ledger builds itself as you operate.",
      },
      {
        heading: "Bank reconciliation",
        body:
          "Your bank feed is reconciled against platform activity, catching discrepancies without a manual line-by-line match.",
      },
      {
        heading: "Real-time monthly close",
        body:
          "The monthly close stays current instead of being a scramble, so your books reflect this month — not last quarter.",
      },
      {
        heading: "CPA-ready by default",
        body:
          "Records stay formatted for your accountant, connecting to the CPA portal and 1099 tracking already in the platform.",
      },
    ],
    outcome: {
      heading: "Books that stay done, not piled up",
      body:
        "Your ledger is current in real time, reconciliation happens continuously, and tax season starts with clean books instead of a reconstruction project. This capability is rolling out to partner accounts as it ships.",
    },
    faqs: [
      {
        question: "Is automated bookkeeping available now?",
        answer:
          "It's in development and rolling out to partner accounts as it ships, included in your subscription. The platform already tracks every payment and payout, which is what makes automated bookkeeping possible.",
      },
      {
        question: "What will it automate?",
        answer:
          "Transaction categorization, bank reconciliation, and a real-time monthly close, all kept CPA-ready without manual bookkeeping.",
      },
      {
        question: "Why can Full Loop automate my books?",
        answer:
          "Because payments, payouts, and expenses already flow through the platform, the data needed to write the ledger is already there — so the books can build themselves.",
      },
      {
        question: "Does it work with my accountant?",
        answer:
          "Yes. It's designed to keep records CPA-ready and connect to the existing CPA portal and 1099 tracking.",
      },
    ],
    relatedSlugs: ["finance-dashboard", "contractor-1099-cpa-portal", "finance-automation"],
  },

  {
    slug: "finance-automation",
    category: "Back Office",
    eyebrow: "Roadmap · Rolling out",
    name: "Finance Automation",
    status: "in-progress",
    title:
      "Finance Automation for Home Service Businesses | Cash Flow on Autopilot — Full Loop CRM",
    metaDescription:
      "Full Loop's finance automation (in development) goes beyond the real-time dashboard with automated P&L, cash-flow forecasting, AR follow-up sequences, and tax set-aside — so you always know what you made, what's coming, and what to keep on hand.",
    keywords: [
      "finance automation software",
      "cash flow forecasting",
      "automated P&L",
      "AR follow-up automation",
      "tax set-aside automation",
      "financial automation contractors",
      "small business cash flow",
      "automated financial management",
    ],
    h1: "Finance Automation That Puts Your Cash Flow on Autopilot",
    heroSub:
      "Automated P&L, cash-flow forecasting, AR follow-up, and tax set-aside — beyond the dashboard. In development, rolling out to partner accounts.",
    intro:
      "Seeing your numbers is step one; acting on them is where owners run out of time. Full Loop's finance automation — actively in development — builds on the real-time dashboard with automated P&L, cash-flow forecasting, AR follow-up sequences, and tax set-aside, so your finances don't just report themselves, they manage themselves.",
    problem: {
      heading: "Why a dashboard alone isn't enough",
      body:
        "Knowing you have unpaid invoices or a tax bill coming doesn't help if you don't have time to act on it. Owners get surprised by cash crunches and tax bills not because the data was hidden, but because nothing was automatically doing something about it.",
    },
    blocks: [
      {
        heading: "Automated P&L",
        body:
          "Your profit-and-loss statement is generated and kept current automatically, so you always know what you actually made without assembling reports.",
      },
      {
        heading: "Cash-flow forecasting",
        body:
          "Projected cash flow shows what's coming based on scheduled jobs and outstanding balances, so you can see a crunch before it arrives.",
      },
      {
        heading: "AR follow-up sequences",
        body:
          "Overdue receivables trigger automated follow-up sequences until they're paid, turning collections from a chore into a background process.",
      },
      {
        heading: "Tax set-aside",
        body:
          "The system helps set aside what you'll owe as revenue comes in, so tax time doesn't blindside your bank account.",
      },
    ],
    outcome: {
      heading: "Finances that manage themselves",
      body:
        "You always know what you made, what's coming, and what to keep on hand — without a bookkeeper or a second app. Your finances move from reporting to running themselves. This capability is rolling out to partner accounts as it ships.",
    },
    faqs: [
      {
        question: "Is finance automation available now?",
        answer:
          "It's in development and rolling out to partner accounts as it ships, included in your subscription. Today you already get the real-time finance dashboard; finance automation extends it into forecasting, follow-up, and tax set-aside.",
      },
      {
        question: "What will finance automation do?",
        answer:
          "Automated P&L, cash-flow forecasting, automated AR follow-up sequences, and tax set-aside — so your finances act, not just report.",
      },
      {
        question: "How is it different from the finance dashboard?",
        answer:
          "The dashboard shows you the numbers in real time; finance automation acts on them — forecasting cash, chasing receivables, and setting aside taxes automatically.",
      },
      {
        question: "Do I need a separate accounting app?",
        answer:
          "No. Finance automation is designed to run inside Full Loop alongside payments, invoicing, and bookkeeping, so you don't need a second system.",
      },
    ],
    relatedSlugs: ["finance-dashboard", "automated-bookkeeping", "one-click-payroll"],
  },
];
