// Feature landing-page data (batch B). Assembled in ./features.ts.
// Type-only import — no runtime cycle with features.ts.
import type { Feature } from "./features";

export const featuresB: Feature[] = [
  {
    slug: "multi-domain-lead-generation",
    category: "Growth & SEO",
    eyebrow: "Stage 1 of 7 · Lead Gen",
    name: "Multi-Domain Lead Generation",
    status: "live",
    title:
      "Multi-Domain SEO Lead Generation for Home Service Businesses | Own Your Leads — Full Loop CRM",
    metaDescription:
      "Full Loop builds a network of SEO sites and optional exact-match-domain microsites that generate organic leads you own — no paid ads, no resold leads. Every domain reports into one attribution dashboard so you know exactly which page booked the job.",
    keywords: [
      "multi-domain SEO",
      "lead generation for home services",
      "organic lead generation contractors",
      "EMD microsites",
      "own your leads",
      "SEO website network",
      "home service lead attribution",
      "no paid ads lead gen",
    ],
    h1: "A Domain Network That Generates Leads You Actually Own",
    heroSub:
      "Your main site plus optional exact-match-domain microsites — an organic lead engine with one attribution dashboard and no ad spend.",
    intro:
      "Buying leads means renting your pipeline from a platform that also sells to your competitors. Full Loop flips that: it builds a network of SEO-optimized sites — your main site plus optional exact-match-domain microsites in your name — that generate organic leads you own outright. Every domain reports into one dashboard, so you see exactly which page, query, and domain produced each booking.",
    problem: {
      heading: "Why bought leads are a losing game",
      body:
        "Paid leads are expensive, often resold to three competitors, and vanish the moment you stop paying. You're renting demand instead of building an asset. When the ad budget dries up, so does the phone — and you have nothing to show for the spend.",
    },
    blocks: [
      {
        heading: "Your main site, built to rank",
        body:
          "Your primary site ships with auto-generated services, service-area, neighborhood, and careers pages, each with structured data on every URL — engineered to rank in local search from day one, included in your subscription.",
      },
      {
        heading: "Optional EMD microsite network",
        body:
          "Add exact-match-domain microsites — domains in your name targeting specific services and areas — to cast a wider net than any single site can. It's a multi-domain footprint that captures searches your main site alone would miss.",
      },
      {
        heading: "One attribution dashboard",
        body:
          "Every domain in your portfolio reports into a single dashboard. Each lead is tagged with its source domain, landing page, search query, and referrer, so you know precisely which property earned the booking.",
      },
      {
        heading: "Leads you own forever",
        body:
          "The traffic, the domains, and the leads are yours — not rented from an ad platform. The network keeps producing whether or not you're spending, compounding into an asset that grows with your business.",
      },
    ],
    outcome: {
      heading: "An owned pipeline that compounds",
      body:
        "Instead of a rented lead feed that stops when the budget does, you build a growing network of organic-ranking properties that generate bookings you own. Paired with the autonomous SEO engine, that network improves on its own over time.",
    },
    faqs: [
      {
        question: "What's the difference from buying leads?",
        answer:
          "Bought leads are rented and often resold to competitors. These leads come from sites and domains you own, so the pipeline is an asset you keep — not a subscription that ends the moment you stop paying.",
      },
      {
        question: "What are EMD microsites?",
        answer:
          "Exact-match-domain microsites are additional websites on domains in your name that target specific services or areas, expanding your search footprint beyond a single site. They're optional and shared with waitlist members.",
      },
      {
        question: "How do I know which site generated a lead?",
        answer:
          "Every lead is tagged with its source domain, landing page, and search query in one attribution dashboard, so you can trace each booking back to the exact property that produced it.",
      },
      {
        question: "Do I need to run ads?",
        answer:
          "No. The network is built for organic search, so it generates leads without ad spend — though the model is compatible with ads if you choose to add them.",
      },
    ],
    relatedSlugs: ["autonomous-seo-engine", "ai-receptionist", "web-chat-booking"],
  },

  {
    slug: "web-chat-booking",
    category: "AI & Sales",
    eyebrow: "Stage 2 of 7 · AI Sales",
    name: "Web Chat Booking",
    status: "live",
    title:
      "AI Web Chat Booking for Home Service Websites | Book Without a Phone Call — Full Loop CRM",
    metaDescription:
      "Full Loop's AI web chat lets website visitors get a quote and book a job without ever calling. The same AI that answers your phone and runs SMS powers your site, recognizes returning clients by phone number, and pulls their full history instantly.",
    keywords: [
      "AI web chat booking",
      "website chat for home services",
      "book without phone call",
      "AI chat widget contractors",
      "online booking chatbot",
      "web chat sales agent",
      "instant online quote chat",
      "returning client recognition",
    ],
    h1: "Web Chat That Quotes and Books Visitors Without a Phone Call",
    heroSub:
      "The same AI that runs your SMS lives on your website — quoting, answering, and booking visitors who'd never pick up the phone.",
    intro:
      "A big share of your website visitors want to book but will never call — they'll bounce if the only options are a phone number and a contact form. Full Loop's AI web chat captures them. Visitors get real answers, an accurate quote, and a confirmed booking right on your site, and returning clients just enter their phone number to have their whole history pulled up instantly.",
    problem: {
      heading: "Why contact forms lose ready-to-book visitors",
      body:
        "A static contact form is a dead end: the visitor types into a void and waits hours for a callback that often never comes. Ready-to-book customers don't wait — they hit the next result. Every form submission that sits unanswered is a booking your competitor closed first.",
    },
    blocks: [
      {
        heading: "Same AI across web and SMS",
        body:
          "The web chat is powered by the exact AI that runs your text conversations — trained on your services, pricing, and availability — so a visitor gets the same fast, accurate, on-brand experience on your site as they would over SMS.",
      },
      {
        heading: "New or returning, in one tap",
        body:
          "Visitors choose new or returning client at the start. New clients are walked through booking; returning clients enter their phone number and the AI instantly loads their address, history, and preferences.",
      },
      {
        heading: "Real quotes, real bookings",
        body:
          "The chat doesn't just collect a name and email — it qualifies the job, quotes it from your actual pricing, and books it onto your calendar, all without the visitor leaving the page.",
      },
      {
        heading: "24/7, no missed windows",
        body:
          "Because it's AI, the chat books at 2 AM as reliably as at 2 PM. You capture the visitor at the exact moment they're ready, instead of hoping they're still around when someone gets to the form.",
      },
    ],
    outcome: {
      heading: "More of your traffic turns into bookings",
      body:
        "Visitors who'd never call now book themselves in a chat window, returning clients rebook in seconds, and your site works as a 24/7 salesperson instead of a brochure. The traffic your SEO earns finally converts.",
    },
    faqs: [
      {
        question: "Is the web chat different from the SMS AI?",
        answer:
          "It's the same AI, trained on the same business rules, just meeting visitors on your website instead of over text — so the experience and accuracy are identical across both channels.",
      },
      {
        question: "Can returning clients book faster?",
        answer:
          "Yes. A returning client enters their phone number and the AI instantly pulls their address, history, and preferences, skipping questions it already has answers to.",
      },
      {
        question: "Does it actually book, or just collect info?",
        answer:
          "It books. The chat qualifies the job, quotes from your real pricing, and places the booking on your calendar without the visitor ever leaving the page.",
      },
      {
        question: "Does it work after hours?",
        answer:
          "Yes, 24/7. Visitors can get quoted and booked at any hour, so you never lose a ready-to-book customer to a closed office.",
      },
    ],
    relatedSlugs: ["ai-receptionist", "smart-scheduling", "autonomous-seo-engine"],
  },

  {
    slug: "recurring-scheduling",
    category: "Scheduling",
    eyebrow: "Stage 3 of 7 · Scheduling",
    name: "Recurring Scheduling",
    status: "live",
    title:
      "Recurring Appointment Scheduling for Service Businesses | 7 Patterns — Full Loop CRM",
    metaDescription:
      "Full Loop supports seven recurring appointment patterns — daily, weekly, bi-weekly, tri-weekly, monthly by date, monthly by weekday, and custom. Set a cadence once and future bookings generate automatically; pause one occurrence without cancelling the series.",
    keywords: [
      "recurring appointment scheduling",
      "recurring booking software",
      "recurring service scheduling",
      "cleaning recurring schedule software",
      "automatic rebooking",
      "recurring revenue scheduling",
      "standing appointment software",
      "subscription service scheduling",
    ],
    h1: "Recurring Scheduling That Rebooks Your Standing Clients Automatically",
    heroSub:
      "Seven cadences, set once — future appointments generate on their own, and you can pause a single visit without touching the series.",
    intro:
      "Recurring clients are the most profitable revenue a service business has, and the easiest to lose to a forgotten rebooking. Full Loop's recurring scheduling locks in that revenue: choose from seven cadences, set it once, and every future appointment generates automatically — so standing clients stay on the calendar without anyone remembering to put them there.",
    problem: {
      heading: "Why forgotten rebookings quietly kill recurring revenue",
      body:
        "When rebooking a standing client depends on someone remembering, it eventually doesn't happen — and a lapsed recurring client rarely comes back on their own. Each missed rebooking isn't one lost job; it's every future job in that cadence, gone.",
    },
    blocks: [
      {
        heading: "Seven recurring patterns",
        body:
          "Daily, weekly, bi-weekly, tri-weekly, monthly by date, monthly by weekday, and fully custom — covering every cadence from a weekly office clean to a quarterly deep service.",
      },
      {
        heading: "Set once, generates forever",
        body:
          "Define the cadence when you book the client, and the system generates future appointments automatically. The standing schedule maintains itself without manual re-entry.",
      },
      {
        heading: "Pause one without cancelling all",
        body:
          "A client going on vacation? Skip a single occurrence without disturbing the rest of the series. The cadence resumes automatically after the paused visit.",
      },
      {
        heading: "Feeds automatic rebooking outreach",
        body:
          "Recurring cadences work hand in hand with automated rebooking and reminders, so standing clients are confirmed and reminded without you lifting a finger.",
      },
    ],
    outcome: {
      heading: "Recurring revenue that never falls through the cracks",
      body:
        "Your standing clients stay booked on their cadence indefinitely, one-time jobs convert into ongoing revenue, and you stop losing recurring customers to a forgotten rebooking. Predictable revenue becomes the default, not the exception.",
    },
    faqs: [
      {
        question: "What recurring cadences can I set?",
        answer:
          "Seven: daily, weekly, bi-weekly, tri-weekly, monthly by date, monthly by weekday, and custom — enough to match any standing-client schedule.",
      },
      {
        question: "Do I have to rebook recurring clients manually?",
        answer:
          "No. You set the cadence once and future appointments generate automatically, so standing clients stay on the calendar without manual rebooking.",
      },
      {
        question: "Can I skip one appointment in a series?",
        answer:
          "Yes. You can pause a single occurrence — for a vacation or holiday, say — without cancelling the rest of the series, which resumes automatically.",
      },
      {
        question: "Does it remind clients about recurring visits?",
        answer:
          "Yes. Recurring appointments feed into automated confirmations and reminders, so standing clients are notified ahead of each visit without extra effort.",
      },
    ],
    relatedSlugs: ["smart-scheduling", "client-booking-portal", "one-click-payroll"],
  },

  {
    slug: "client-booking-portal",
    category: "Scheduling",
    eyebrow: "Stage 3 of 7 · Scheduling",
    name: "Client Booking Portal",
    status: "live",
    title:
      "Client Booking Portal for Home Service Businesses | Self-Service Scheduling — Full Loop CRM",
    metaDescription:
      "Give clients a branded portal to view appointments, request changes, and book new services themselves — cutting inbound scheduling calls and giving customers the self-service experience they expect.",
    keywords: [
      "client booking portal",
      "customer self-booking software",
      "self-service scheduling",
      "branded client portal",
      "online appointment portal",
      "reduce scheduling phone calls",
      "customer booking app",
      "home service client portal",
    ],
    h1: "A Branded Client Portal That Cuts Your Scheduling Calls",
    heroSub:
      "Clients view appointments, request changes, and book new services themselves — the self-service experience they already expect.",
    intro:
      "Every scheduling phone call is an interruption that pulls you off a job. Full Loop's client booking portal hands that work to the customer: they get a branded portal to see upcoming appointments, request changes, and book new services on their own time — so your phone stops ringing for things a screen can handle.",
    problem: {
      heading: "Why phone-only scheduling doesn't scale",
      body:
        "When every booking, reschedule, and question has to go through a call, your day fragments and clients play phone tag to reach you. Customers increasingly expect to self-serve, and a business that can only be reached by phone feels dated — and caps how much you can grow.",
    },
    blocks: [
      {
        heading: "See every upcoming appointment",
        body:
          "Clients log into a branded portal and see their scheduled services at a glance — no calling to ask when their next visit is.",
      },
      {
        heading: "Request changes without calling",
        body:
          "Need to move a visit? Clients request the change from the portal, and it flows into your scheduling engine for confirmation — no voicemail tag.",
      },
      {
        heading: "Book new services on their own time",
        body:
          "Clients can book additional services directly from the portal, day or night, capturing demand you'd miss if the only path were a business-hours phone call.",
      },
      {
        heading: "Fully branded to your business",
        body:
          "The portal carries your brand, so the self-service experience feels like part of your company, not a third-party tool bolted on.",
      },
    ],
    outcome: {
      heading: "Fewer calls, happier clients, more bookings",
      body:
        "Your phone stops ringing for routine scheduling, clients get the modern self-service they expect, and after-hours booking demand gets captured instead of lost. You reclaim hours and look like a bigger, more polished operation.",
    },
    faqs: [
      {
        question: "What can clients do in the portal?",
        answer:
          "View their upcoming appointments, request reschedules, and book new services — the routine tasks that would otherwise be phone calls.",
      },
      {
        question: "Is the portal branded to my business?",
        answer:
          "Yes. It carries your branding so it feels like a native part of your company rather than a generic third-party scheduler.",
      },
      {
        question: "Does self-booking risk double-booking?",
        answer:
          "No. Portal bookings run through the same real-time availability checks as every other path, so clients can only book genuinely open slots.",
      },
      {
        question: "Will this reduce my phone calls?",
        answer:
          "Yes. By letting clients handle routine scheduling themselves, the portal cuts the inbound calls that fragment your day.",
      },
    ],
    relatedSlugs: ["smart-scheduling", "recurring-scheduling", "ai-receptionist"],
  },

  {
    slug: "every-payment-method",
    category: "Payments",
    eyebrow: "Stage 5 of 7 · Payments",
    name: "Every Payment Method",
    status: "live",
    title:
      "Track Every Payment Method in One Place | Zelle, Venmo, Cash, Card — Full Loop CRM",
    metaDescription:
      "Full Loop tracks payments the way home service clients actually pay — Zelle, Apple Pay, Venmo, cash, check, and credit card — all in one place, so your books reflect reality instead of just the card processor.",
    keywords: [
      "track all payment methods",
      "Zelle Venmo cash tracking",
      "home service payment tracking",
      "multi-method payment software",
      "cash and check tracking",
      "payment reconciliation contractors",
      "service business payments",
      "record client payments",
    ],
    h1: "Track Every Way Your Clients Actually Pay — In One Place",
    heroSub:
      "Zelle, Apple Pay, Venmo, cash, check, and credit card, all recorded together — because real home service clients don't only swipe cards.",
    intro:
      "Card-only payment tools ignore how home service clients really pay — half of it comes in as Zelle, Venmo, cash, or a check on the counter. Full Loop tracks every method in one place, so your revenue records match reality and nothing slips through just because it wasn't a card charge.",
    problem: {
      heading: "Why card-only tools misrepresent your revenue",
      body:
        "When your software only sees card payments, everything paid by Zelle, Venmo, cash, or check lives in your head or on scraps of paper. Your books understate revenue, balances get lost, and reconciliation becomes guesswork at month-end.",
    },
    blocks: [
      {
        heading: "Every method, one ledger",
        body:
          "Record payments via Zelle, Apple Pay, Venmo, cash, check, and credit card in the same place, so every dollar collected shows up in one accurate view.",
      },
      {
        heading: "Balances that reflect reality",
        body:
          "Because all methods are tracked, outstanding balances are correct no matter how a client chose to pay — no more chasing money you already received but didn't log.",
      },
      {
        heading: "Automated payment follow-ups",
        body:
          "Unpaid balances trigger automatic reminder sequences until they're settled, across every payment type, so collections don't depend on you remembering.",
      },
      {
        heading: "Feeds invoices and finance",
        body:
          "Each recorded payment flows into invoicing and your finance dashboard, keeping receipts, revenue, and profit accurate in real time.",
      },
    ],
    outcome: {
      heading: "Books that match what actually hit your account",
      body:
        "Every payment — however it came in — is captured, balances stay accurate, and month-end reconciliation stops being a guessing game. You see true revenue, not just the slice your card processor saw.",
    },
    faqs: [
      {
        question: "Which payment methods can I track?",
        answer:
          "Zelle, Apple Pay, Venmo, cash, check, and credit card — the ways home service clients actually pay — all recorded in one place.",
      },
      {
        question: "Does it chase unpaid balances automatically?",
        answer:
          "Yes. Outstanding balances trigger automatic follow-up reminders until they're paid, regardless of the payment method.",
      },
      {
        question: "Do these payments show up in my financials?",
        answer:
          "Yes. Every recorded payment feeds invoicing and the finance dashboard, so revenue and profit reflect all methods in real time.",
      },
      {
        question: "Do I have to use a specific card processor?",
        answer:
          "No. You can track cash, check, and app-based payments alongside card charges, so the platform fits how you already collect money.",
      },
    ],
    relatedSlugs: ["auto-invoicing", "one-click-payroll", "finance-dashboard"],
  },

  {
    slug: "auto-invoicing",
    category: "Payments",
    eyebrow: "Stage 5 of 7 · Payments",
    name: "Automatic Invoicing",
    status: "live",
    title:
      "Automatic Invoicing for Home Service Businesses | Invoices That Send Themselves — Full Loop CRM",
    metaDescription:
      "Full Loop generates an accurate invoice automatically after every job — correct amount, payment method, and service details — and sends it by SMS or email in one click. Stop writing invoices by hand.",
    keywords: [
      "automatic invoicing software",
      "auto-generated invoices",
      "home service invoicing",
      "field service invoice software",
      "invoice by SMS",
      "invoice automation contractors",
      "instant invoicing",
      "service business invoicing",
    ],
    h1: "Invoices That Generate Themselves After Every Job",
    heroSub:
      "Correct amount, payment method, and service details — created automatically when the job ends, sent by SMS or email in one click.",
    intro:
      "Writing invoices by hand is late-night busywork that also delays your pay. Full Loop removes it: the moment a job is done, an accurate invoice is generated — right amount, right service details, right payment method — ready to send by text or email in a single click. Faster invoices mean faster payment.",
    problem: {
      heading: "Why manual invoicing slows down your cash",
      body:
        "When invoices are written by hand after hours, they go out late — or not at all — and every day of delay is a day you're not paid. Manual entry also invites errors that spark disputes and push payment back even further.",
    },
    blocks: [
      {
        heading: "Auto-generated on job completion",
        body:
          "As soon as a job is marked complete, an invoice is created with the correct amount, service details, and payment method pulled straight from the booking — no manual entry, no math.",
      },
      {
        heading: "One-click send by SMS or email",
        body:
          "Deliver the invoice to the client the way they prefer, by text or email, with a single tap. It reaches them while the service is still top of mind.",
      },
      {
        heading: "Accurate every time",
        body:
          "Because invoices draw from the booking and payment records, the numbers are right by default — cutting the disputes and back-and-forth that delay payment.",
      },
      {
        heading: "Connected to payments and finance",
        body:
          "Sent invoices tie into payment tracking and the finance dashboard, so paid and outstanding balances update automatically without separate bookkeeping.",
      },
    ],
    outcome: {
      heading: "Get paid faster with zero invoice busywork",
      body:
        "Invoices go out the instant a job ends, they're accurate, and payment lands sooner. You reclaim your evenings and shorten the gap between finishing work and getting paid.",
    },
    faqs: [
      {
        question: "When is the invoice created?",
        answer:
          "Automatically, as soon as the job is marked complete — with the correct amount, service details, and payment method already filled in from the booking.",
      },
      {
        question: "How do clients receive invoices?",
        answer:
          "You send them by SMS or email in one click, so they reach the client quickly through the channel they prefer.",
      },
      {
        question: "Will the amounts be correct?",
        answer:
          "Yes. Invoices pull from the booking and payment records, so the totals are accurate by default, reducing disputes and payment delays.",
      },
      {
        question: "Do invoices update my financials?",
        answer:
          "Yes. Invoicing connects to payment tracking and the finance dashboard, so outstanding and paid balances stay current automatically.",
      },
    ],
    relatedSlugs: ["every-payment-method", "finance-dashboard", "one-click-payroll"],
  },

  {
    slug: "contractor-1099-cpa-portal",
    category: "Payments",
    eyebrow: "Stage 5 of 7 · Payments",
    name: "1099 & CPA Portal",
    status: "live",
    title:
      "1099-Ready Contractor Reports & CPA Portal | Painless Tax Season — Full Loop CRM",
    metaDescription:
      "Full Loop tracks every contractor payout with year-to-date totals, flags the $600 1099 threshold automatically, and exports a clean, pre-formatted year-end package your CPA can access directly. No spreadsheet reconciliation at tax time.",
    keywords: [
      "1099 contractor reports",
      "1099 threshold tracking",
      "CPA portal software",
      "contractor payout tracking",
      "year-end tax export",
      "1099-ready payroll",
      "accountant access software",
      "tax season for contractors",
    ],
    h1: "1099-Ready Reports and a CPA Portal That Kill Tax-Season Panic",
    heroSub:
      "Every payout tracked year-to-date, the $600 threshold flagged automatically, and a clean export your accountant can open directly.",
    intro:
      "Tax season punishes service businesses that track contractor pay in a shoebox. Full Loop keeps it ready all year: every crew payout is tracked with running year-to-date totals, the $600 1099 threshold is flagged the moment it's crossed, and your CPA gets a pre-formatted year-end package through a dedicated portal — no last-minute reconciliation.",
    problem: {
      heading: "Why 1099 season is a scramble",
      body:
        "If contractor payouts aren't tracked as they happen, January becomes a frantic reconstruction of a year's payments — who was paid what, and who crossed the threshold. Mistakes here mean filing errors, penalties, and an accountant billing you to untangle it.",
    },
    blocks: [
      {
        heading: "Year-to-date payout tracking",
        body:
          "Every payout is tracked with running year-to-date totals per contractor, so you always know exactly what each person has been paid — no reconstruction required.",
      },
      {
        heading: "Automatic $600 threshold flagging",
        body:
          "The moment a contractor crosses the $600 1099 reporting threshold, they're flagged automatically, so you never miss a required filing.",
      },
      {
        heading: "Clean year-end export",
        body:
          "At tax time, export a pre-formatted package with the contractor-payout section ready for filing — no spreadsheet cleanup, no manual reconciliation.",
      },
      {
        heading: "Direct CPA portal access",
        body:
          "Your accountant gets read-only access to the year-end package through a dedicated CPA portal, so you're not emailing files back and forth.",
      },
    ],
    outcome: {
      heading: "A tax season that's already done",
      body:
        "Your contractor records are accurate and current all year, required filings are flagged before you'd ever miss them, and your CPA pulls what they need directly. Tax season becomes a non-event instead of a scramble.",
    },
    faqs: [
      {
        question: "How does it handle the 1099 threshold?",
        answer:
          "It tracks each contractor's year-to-date payouts and flags them automatically the moment they cross the $600 reporting threshold, so no required filing is missed.",
      },
      {
        question: "What does my accountant get?",
        answer:
          "Read-only access to a pre-formatted year-end package through a dedicated CPA portal, so you don't have to assemble and email files.",
      },
      {
        question: "Do I still need to reconcile spreadsheets?",
        answer:
          "No. Because payouts are tracked as they happen, the year-end export is already clean and formatted for filing.",
      },
      {
        question: "Is contractor pay tracked automatically?",
        answer:
          "Yes. Payouts tie into the one-click payroll and payment system, so year-to-date totals stay current without separate bookkeeping.",
      },
    ],
    relatedSlugs: ["one-click-payroll", "automated-bookkeeping", "finance-dashboard"],
  },
];
