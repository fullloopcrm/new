// Programmatic SEO: one deep, keyword-targeted landing page per Full Loop
// feature. Rendered by src/app/(marketing)/feature/[slug]/page.tsx.
//
// Each entry is authored for MAX on-page SEO: a unique <title> + meta, a
// keyword-rich H1, a distinct intro, a problem framing, capability blocks,
// an outcome/ROI section, 4-6 FAQs (also emitted as FAQPage JSON-LD), and
// inner links to related features. No two pages share body copy — thin,
// duplicated feature pages read as doorway pages and get penalized, which is
// the opposite of what these are for.
//
// Status: "live" = shipped and in production. "in-progress" = actively in
// development, marketed as rolling out (roadmap framing) — never as shipped.

export type FeatureStatus = "live" | "in-progress";

export interface FeatureFAQ {
  question: string;
  answer: string;
}

export interface FeatureBlock {
  heading: string;
  body: string;
}

export interface Feature {
  slug: string;
  /** Grouping label, e.g. "Growth & SEO", "AI & Sales", "Field Operations". */
  category: string;
  /** Short eyebrow, e.g. "Automated · runs daily" or "Stage 4 of 7". */
  eyebrow: string;
  /** Display name used in nav, cards, and inner links. */
  name: string;
  status: FeatureStatus;

  // ── SEO metadata ──
  title: string;
  metaDescription: string;
  keywords: string[];

  // ── Page content ──
  h1: string;
  heroSub: string;
  intro: string;
  problem: FeatureBlock;
  blocks: FeatureBlock[];
  outcome: FeatureBlock;
  faqs: FeatureFAQ[];

  /** Slugs of related features to inner-link. */
  relatedSlugs: string[];
}

import { featuresB } from "./feature-data-b";
import { featuresC } from "./feature-data-c";

const SITE = "https://homeservicesbusinesscrm.com";

const baseFeatures: Feature[] = [
  // ───────────────────────────────────────────────────────────────────────
  {
    slug: "autonomous-seo-engine",
    category: "Growth & SEO",
    eyebrow: "Automated · runs daily",
    name: "Autonomous SEO Engine",
    status: "live",
    title:
      "Autonomous SEO Engine for Home Service Businesses | Automated SEO — Full Loop CRM",
    metaDescription:
      "Full Loop's autonomous SEO engine reads your Google Search Console data every day, finds pages one click from page one, rewrites titles and meta for higher rankings, and freezes pages that already rank. Automated, self-improving SEO for home service businesses — no agency retainer.",
    keywords: [
      "autonomous SEO engine",
      "automated SEO software",
      "AI SEO for home services",
      "self-improving SEO",
      "Google Search Console automation",
      "programmatic SEO for contractors",
      "automated title and meta optimization",
      "home service business SEO software",
    ],
    h1: "The Autonomous SEO Engine That Grows Your Rankings While You Work",
    heroSub:
      "Self-improving SEO for home service businesses — reads Search Console daily, works the highest-value opportunities first, and never touches a page that already ranks.",
    intro:
      "Most home service businesses either pay an SEO agency $1,500+ a month or do nothing and hope. Full Loop does neither. It runs an autonomous SEO engine across your entire domain network that improves your Google rankings on its own — every day, in the background, ranked by the keywords that actually make you money. No retainer, no keyword spreadsheets, no waiting on a monthly report.",
    problem: {
      heading: "Why manual SEO fails service businesses",
      body:
        "Search rankings move constantly, but a contractor running jobs all day has no time to watch them. Agencies are expensive and slow, DIY SEO tools dump data without doing the work, and one careless title change can tank a page that was quietly bringing in leads. The result: most service businesses leave their best organic keywords stranded on page two, where almost nobody clicks.",
    },
    blocks: [
      {
        heading: "Daily Search Console ingestion",
        body:
          "Every morning the engine pulls fresh Google Search Console data for every domain in your network — impressions, clicks, average position, and the exact queries you rank for. It sees your real search performance, not a third-party estimate, so every decision is based on what Google is actually showing users.",
      },
      {
        heading: "Commercial-value opportunity ranking",
        body:
          "Not all rankings are worth the same. The engine scores every opportunity by commercial intent — a query like \"emergency plumber near me\" is weighted far above an informational search — and by how close the page already is to page one. The keywords that convert into booked jobs get worked first, so your effort compounds where the revenue is.",
      },
      {
        heading: "Automated title & meta rewrites",
        body:
          "For each high-value opportunity, the engine drafts sharper, higher-ranking title tags and meta descriptions tuned to the query and search intent. You review and approve, and approved changes apply with instant re-indexing — no developer, no CMS wrangling, no waiting weeks for the next content cycle.",
      },
      {
        heading: "Winner protection (page freeze)",
        body:
          "Any page already ranking in the top positions for a query is automatically frozen — the engine will not rewrite or experiment on it. Your proven winners are untouchable, so you capture upside on the pages that need help without ever risking the pages that already bring in leads.",
      },
    ],
    outcome: {
      heading: "Compounding organic growth, hands-off",
      body:
        "Instead of a one-time SEO project that decays, you get a system that improves a little every day and protects every gain. Your best keywords climb toward the top of page one, your winners stay locked in, and your lead pipeline grows from organic search you own — not ads you rent. It's the same engine Full Loop runs across its own fleet of home service sites.",
    },
    faqs: [
      {
        question: "Do I need to know anything about SEO to use this?",
        answer:
          "No. The engine handles the analysis and drafts the changes. You approve or decline in plain English. There are no keywords to research, no tools to learn, and no reports to interpret.",
      },
      {
        question: "Will it hurt pages that already rank well?",
        answer:
          "No. Winner protection automatically freezes any page ranking in the top positions for a query. The engine only works on pages with room to improve, so a page that's already performing is never touched.",
      },
      {
        question: "How is this different from hiring an SEO agency?",
        answer:
          "An agency bills a monthly retainer and works on a slow cycle. Full Loop's engine runs every day, prioritizes by commercial value automatically, and is included with your platform — no separate contract, no per-hour billing.",
      },
      {
        question: "How fast will I see ranking changes?",
        answer:
          "Approved title and meta changes apply with instant re-indexing requests, but Google decides when to re-crawl and re-rank. Most improvements surface over days to weeks as pages move up from page two toward the top of page one.",
      },
      {
        question: "Does it work across multiple websites?",
        answer:
          "Yes. The engine runs across your entire domain network — your main site and any EMD microsites — reporting all of them into one place, so opportunities are prioritized across your whole portfolio, not one site at a time.",
      },
    ],
    relatedSlugs: ["multi-domain-lead-generation", "ai-receptionist", "review-management"],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    slug: "ai-receptionist",
    category: "AI & Sales",
    eyebrow: "Stage 2 of 7 · AI Sales",
    name: "AI Receptionist",
    status: "live",
    title:
      "AI Receptionist for Home Service Businesses | 24/7 AI Phone & SMS Sales Agent — Full Loop CRM",
    metaDescription:
      "Full Loop's AI receptionist answers, qualifies, quotes, and books every lead by phone, SMS, and web chat in under 60 seconds, 24/7, in English and Spanish. It answers the phone live — never voicemail. Trained on your services, pricing, and availability. Stop losing leads to slow replies and missed calls.",
    keywords: [
      "AI receptionist for home services",
      "AI phone and SMS sales agent",
      "24/7 automated lead response",
      "AI booking agent for contractors",
      "AI answering service for service business",
      "automated appointment booking software",
      "AI that answers the phone for contractors",
      "bilingual AI receptionist",
    ],
    h1: "An AI Receptionist That Answers, Qualifies, and Books Every Lead in Seconds",
    heroSub:
      "Your 24/7 AI-powered phone, SMS, and web-chat sales agent — answers the phone live, never voicemail — trained on your services, pricing, and availability, in English and Spanish.",
    intro:
      "The single biggest leak in a home service business is the lead that texts or calls when you're on a job and waits an hour for a reply — then books your competitor. Full Loop's AI receptionist closes that leak. It responds to every inbound lead in under 60 seconds, any hour of any day, qualifies them, answers their questions, quotes the job, and books it on your calendar — without you touching your phone.",
    problem: {
      heading: "Why speed-to-lead makes or breaks your revenue",
      body:
        "Conversion rates are highest in the first minute after a lead reaches out and collapse fast after that. But a working owner or a busy front desk can't answer instantly at 9 PM on a Sunday. Every missed call and slow text is a booked job handed to whoever replied first — and for most service businesses, that's money walking out the door every single week.",
    },
    blocks: [
      {
        heading: "Trained on your business, not a generic bot",
        body:
          "The AI receptionist knows your specific services, pricing, service areas, and availability. It's not a canned FAQ widget — it holds a real conversation, handles objections, and quotes accurately because it's grounded in your actual business rules.",
      },
      {
        heading: "24/7 bilingual coverage (EN/ES)",
        body:
          "It works around the clock in English and Spanish. A lead at 11 PM on a holiday gets the same fast, professional, correctly-priced response as one at 10 AM on a Tuesday. No missed opportunities, no language barrier, no overtime.",
      },
      {
        heading: "Deterministic booking flow",
        body:
          "The AI follows a structured booking checklist — service type, size, rate, day, time, name, phone, address, email — collecting one field at a time and never re-asking for information it already has. Clients can reply to numbered options with a single digit, so booking is effortless even over SMS.",
      },
      {
        heading: "Returning-client recognition & smart escalation",
        body:
          "When a past client texts in, the AI pulls their full profile — address, history, preferred crew, last rate — greets them by name, and skips questions it already knows. And when someone is upset or has a request outside the normal flow, it escalates to a human with the full transcript, so you step in informed, not cold.",
      },
    ],
    outcome: {
      heading: "Every lead answered, every night, automatically",
      body:
        "You stop losing jobs to slow replies and missed calls, your calendar fills without you playing phone tag, and your response time stays under a minute even while you sleep. It's a full-time bilingual receptionist and sales rep that never clocks out — built into the platform, not bolted on.",
    },
    faqs: [
      {
        question: "Is the AI receptionist a real conversation or just autoresponders?",
        answer:
          "It holds a real, context-aware conversation. It understands questions, handles objections, quotes based on your actual pricing, and books the job — it is not a fixed decision tree of canned replies.",
      },
      {
        question: "What happens if a lead has an unusual or sensitive request?",
        answer:
          "The AI recognizes when a conversation is outside its normal flow — a complaint, a damage report, an odd request — and escalates to you with the full transcript so you can take over with complete context.",
      },
      {
        question: "Does it work on the phone and my website, or only over text?",
        answer:
          "All three. The same AI answers your phone live, powers SMS, and runs a web chat widget on your site — one agent with one memory across every channel. See the dedicated AI voice agent for how it handles live calls and books on the phone.",
      },
      {
        question: "Can it handle Spanish-speaking customers?",
        answer:
          "Yes. It operates fluently in both English and Spanish automatically, with no settings to configure — it responds in the language the customer uses.",
      },
      {
        question: "How fast does it respond to a new lead?",
        answer:
          "Typically within seconds, and consistently under 60 seconds — the window where conversion rates are highest — 24 hours a day.",
      },
    ],
    relatedSlugs: ["ai-voice-agent", "smart-scheduling", "review-management", "autonomous-seo-engine"],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    slug: "ai-voice-agent",
    category: "AI & Sales",
    eyebrow: "Stage 2 of 7 · AI Voice",
    name: "AI Voice Agent",
    status: "live",
    title:
      "AI Voice Agent for Home Service Businesses | 24/7 AI Phone Answering That Books — Full Loop CRM",
    metaDescription:
      "Full Loop's AI voice agent answers your phone live 24/7 — never voicemail. It checks your real calendar and books the job on the call, recognizes returning callers by number, quotes from your real rates, captures every caller as a lead, and escalates the edge cases to you. Every call recorded, transcribed, and threaded.",
    keywords: [
      "AI voice agent for home services",
      "AI phone answering service for contractors",
      "24/7 AI receptionist that answers the phone",
      "AI call answering for service business",
      "AI phone booking agent",
      "automated phone answering for home services",
      "AI that books appointments over the phone",
      "virtual phone receptionist for contractors",
    ],
    h1: "An AI Voice Agent That Answers Your Phone Live and Books the Job on the Call",
    heroSub:
      "A warm, natural 24/7 phone agent that picks up on the first ring, checks your real calendar, and books the job — never voicemail, never dead air, in English and Spanish.",
    intro:
      "The call you can't take is the job you don't get. When you're under a sink or on a ladder, the phone rings out, the caller hits voicemail, and they dial the next company before you ever hear the message. Full Loop's AI voice agent answers that call live — day or night — with a real, natural voice that greets the caller, pulls up your live calendar, quotes from your real rates, and books the job on the spot. It's the same agent that runs your text and web chat, now answering the phone too.",
    problem: {
      heading: "Why missed calls quietly bleed a service business",
      body:
        "Most home service revenue still comes in by phone, and most of those calls come when you physically cannot answer — mid-job, driving, after hours, on a Sunday. Voicemail doesn't save the job; studies of service businesses show the majority of callers who hit voicemail simply hang up and call a competitor. A generic answering service takes a message but can't quote, can't see your calendar, and can't book — so you still call back hours later, after the customer already booked someone else.",
    },
    blocks: [
      {
        heading: "Answers live, 24/7 — never voicemail",
        body:
          "The agent picks up on the first ring with a warm, human-sounding voice, any hour of any day. Callers reach a real conversation, not a menu tree or a mailbox. If the agent is ever unavailable, the call falls back to your normal ring-and-voicemail — so a caller is never met with dead air.",
      },
      {
        heading: "Checks real availability and books on the call",
        body:
          "It reads your live calendar for genuinely open slots, offers real times, and creates the booking during the call — auto-creating or linking the caller's client record. It never fake-books or invents a time it can't honor, and it explains your cancellation policy on every booking so there are no surprises.",
      },
      {
        heading: "Knows your callers and your numbers",
        body:
          "Returning callers are recognized by their phone number: the agent greets them, pulls up their upcoming and past jobs, and can tell them whether a payment landed or what their balance is. It quotes strictly from your real rate book, and it saves notes to the client record — access codes, allergies, preferences — so the next visit already knows them.",
      },
      {
        heading: "Captures every caller and escalates the edge cases",
        body:
          "Every caller is saved as a lead with name and number, even if they don't book — no more numbers lost to a missed call. Genuine edge cases — refund demands, damage, a caller who insists on a manager — are escalated straight to you for a fast callback instead of the agent freelancing an answer it shouldn't.",
      },
      {
        heading: "Every call recorded, transcribed, and threaded",
        body:
          "Each call becomes a recording plus a full transcription in one unified customer thread, alongside that customer's texts and emails. Bookings, notes, escalations, and new-lead events post to the thread live, so your office sees exactly what was said and what happened — without listening back to a single voicemail.",
      },
    ],
    outcome: {
      heading: "Every call answered, every job captured — while you work",
      body:
        "You stop losing jobs to a phone you couldn't reach. Calls turn into booked work at 2 AM and on Sundays, returning customers feel known, every caller is captured as a lead, and the genuine problems reach you fast with the full transcript. It's a full-time bilingual phone receptionist and closer that never clocks out — the same AI agent that already runs your text and chat, now on the line.",
    },
    faqs: [
      {
        question: "Does it really answer the phone, or is it just voicemail transcription?",
        answer:
          "It answers live. A caller reaches a natural, conversational voice agent that talks, quotes, checks the calendar, and books the job on the call — it is not a voicemail box or a message-taker.",
      },
      {
        question: "What happens if the AI can't handle a call?",
        answer:
          "Genuine edge cases — refunds, damage, a demand for a manager — are escalated to you with the call details for a fast callback. And if the voice agent is ever down, the call falls back to your normal ring and voicemail, so no call is ever met with dead air.",
      },
      {
        question: "Will it recognize my existing customers when they call?",
        answer:
          "Yes. Returning callers are identified by their phone number. The agent greets them, pulls up their past and upcoming jobs, and can check their balance or whether a payment landed — then books or updates without making them repeat everything.",
      },
      {
        question: "Can it book appointments over the phone?",
        answer:
          "Yes. It reads your live calendar for real open slots and creates the booking during the call, linking or creating the client record. It never fake-books a time it can't honor and explains your cancellation policy on every booking.",
      },
      {
        question: "Do I get a record of what was said on each call?",
        answer:
          "Every call is recorded and transcribed into one unified customer thread, along with any booking, note, or escalation it created — so your office has full context without listening back to voicemails.",
      },
      {
        question: "Does it speak Spanish?",
        answer:
          "Yes. The voice agent converses in English and Spanish, matching the language the caller uses.",
      },
    ],
    relatedSlugs: ["ai-receptionist", "smart-scheduling", "loop-connect", "review-management"],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    slug: "gps-verified-check-in",
    category: "Field Operations",
    eyebrow: "Stage 4 of 7 · Field Ops",
    name: "GPS-Verified Check-In",
    status: "live",
    title:
      "GPS-Verified Check-In for Field Crews | Stop Time Theft — Full Loop CRM",
    metaDescription:
      "Full Loop's GPS-verified check-in confirms crews are actually on site before the clock starts — within 528 feet of the job address — then auto-calculates billable hours and payroll. Eliminate time theft and get proof of service for every visit.",
    keywords: [
      "GPS check-in app for field service",
      "GPS time tracking for crews",
      "field service check in software",
      "prevent time theft service business",
      "GPS verified employee check in",
      "crew time tracking app",
      "proof of service software",
      "automated payroll from GPS hours",
    ],
    h1: "GPS-Verified Check-In That Ends Time Theft and Proves Every Visit",
    heroSub:
      "Crews check in and out from their phones, verified within 528 feet of the job site — so billable hours and payroll calculate themselves.",
    intro:
      "\"I was there, I swear\" is not a time card. Full Loop's GPS-verified check-in replaces the honor system with a verifiable record of exactly when your crew arrived and left every job — and turns that record straight into accurate billing and payroll. No more padded hours, no more disputes, no more mental math at the end of the week.",
    problem: {
      heading: "The hidden cost of the honor system",
      body:
        "When crews self-report hours, minutes get rounded up, arrivals get fudged, and payroll slowly bleeds money you never see. Worse, when a client disputes whether the job was done or how long it took, you have nothing but your word against theirs. Manual timesheets cost you twice — in inflated payroll and in lost disputes.",
    },
    blocks: [
      {
        heading: "528-foot geofence validation",
        body:
          "A check-in is only accepted when the crew member's phone is within 528 feet — one-tenth of a mile — of the client's address. Remote or early clock-ins simply don't go through, so the clock starts only when your team is genuinely on location.",
      },
      {
        heading: "Automatic billable-hour calculation",
        body:
          "Hours are calculated from GPS check-in and check-out times and billed in half-hour increments with a fair 10-minute grace period. Finish at 3:09 and it bills 3 hours; at 3:10 it rounds to 3.5. Fair for clients, fair for crews, and completely automatic — no timesheets to review.",
      },
      {
        heading: "One-click payroll from verified hours",
        body:
          "Because hours are GPS-verified and pay rates are on file, payroll is a single click. Review each crew member's calculated pay and mark them paid — no spreadsheets, no manual multiplication, no reconciliation.",
      },
      {
        heading: "Proof of service on every booking",
        body:
          "Every check-in and check-out is timestamped and stored on the booking, giving you a defensible record of each visit. Paired with before-and-after video walkthroughs, you have instant proof of both attendance and quality if a client ever disputes the work.",
      },
    ],
    outcome: {
      heading: "Accurate payroll, zero disputes, real accountability",
      body:
        "You stop paying for hours that weren't worked, you settle client disputes with a timestamped record instead of an argument, and your crews know the clock is fair and automatic. Field accountability stops being a management headache and becomes a background fact of how the platform runs.",
    },
    faqs: [
      {
        question: "What stops a crew member from checking in from home?",
        answer:
          "The 528-foot geofence. A check-in is rejected unless the phone's GPS location is within one-tenth of a mile of the job's address, so the clock can't start until the crew is actually on site.",
      },
      {
        question: "Does the crew need to install an app?",
        answer:
          "No app store required. The field portal is a mobile web app (PWA) that works in any phone browser and can be saved to the home screen. Native iOS and Android apps are on the roadmap.",
      },
      {
        question: "How are billable hours calculated from check-in times?",
        answer:
          "Automatically, in half-hour increments with a 10-minute grace period, based on the GPS check-in and check-out timestamps — so billing and payroll match the real time on site.",
      },
      {
        question: "Can I use this to run payroll?",
        answer:
          "Yes. Verified hours multiply by each crew member's pay rate automatically, so payroll becomes a one-click review-and-approve step with no spreadsheets.",
      },
      {
        question: "What if a client says my crew was never there?",
        answer:
          "You have a timestamped, GPS-verified check-in and check-out record on the booking — plus optional before-and-after walkthrough videos — as proof of the visit and the work.",
      },
    ],
    relatedSlugs: ["smart-scheduling", "one-click-payroll", "ai-receptionist"],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    slug: "smart-scheduling",
    category: "Scheduling",
    eyebrow: "Stage 3 of 7 · Scheduling",
    name: "Smart Scheduling",
    status: "live",
    title:
      "Smart Scheduling Software for Home Service Businesses | No Double-Booking — Full Loop CRM",
    metaDescription:
      "Full Loop's scheduling engine checks real-time availability, accounts for travel time between jobs, and supports 7 recurring patterns — so your calendar fills itself without double-bookings. Drag-and-drop rescheduling and client self-booking built in.",
    keywords: [
      "smart scheduling software",
      "home service scheduling software",
      "field service scheduling app",
      "recurring appointment software",
      "prevent double booking",
      "crew dispatch scheduling",
      "route-aware scheduling",
      "client self-booking software",
    ],
    h1: "Smart Scheduling That Fills Your Calendar Without Double-Booking",
    heroSub:
      "Real-time availability, travel-time awareness, seven recurring patterns, and client self-booking — one scheduling engine instead of a spreadsheet and a group text.",
    intro:
      "The calendar is where most service businesses quietly lose money — double-booked crews, no-shows, gaps between jobs, and a standing appointment someone forgot to rebook. Full Loop's scheduling engine handles all of it automatically: it knows who's available, how long the drive is, and which clients are on a recurring cadence, so the right job lands on the right crew at the right time without you refereeing a spreadsheet.",
    problem: {
      heading: "Why manual scheduling leaks revenue",
      body:
        "Managing a calendar by hand means double-bookings when two jobs collide, dead time when back-to-back jobs are across town, and lost recurring revenue every time someone forgets to rebook a standing client. Each mistake is either a refund, an idle crew, or a customer who drifts away — and it compounds every week you grow.",
    },
    blocks: [
      {
        heading: "Real-time availability & no double-booking",
        body:
          "Every booking checks live availability before it's confirmed, so two jobs can never land on the same crew at the same time. The moment a slot fills, it disappears from every other booking path — SMS, web, and admin alike.",
      },
      {
        heading: "Travel-time aware sequencing",
        body:
          "The engine accounts for drive time between job sites, crew assignments, and service duration to build the tightest realistic schedule. Fewer wasted hours crossing town means more billable jobs in the same day.",
      },
      {
        heading: "Seven recurring patterns",
        body:
          "Daily, weekly, bi-weekly, tri-weekly, monthly-by-date, monthly-by-weekday, and custom cadences cover every recurring schedule a service business needs. Set it once and future bookings generate automatically — and you can pause a single occurrence without cancelling the whole series.",
      },
      {
        heading: "Drag-and-drop rescheduling & client self-booking",
        body:
          "Plans change — drag a job to a new slot and everyone is notified. Clients get a branded portal to view appointments, request changes, and book new services themselves, cutting the phone tag that eats your day.",
      },
    ],
    outcome: {
      heading: "A calendar that manages itself",
      body:
        "Your crews stay busy without overlap, your recurring clients rebook on their own cadence, and your day stops revolving around the schedule. You spend less time in the calendar and more time on revenue — with fewer no-shows and zero double-bookings.",
    },
    faqs: [
      {
        question: "How does it prevent double-booking?",
        answer:
          "Every booking path checks live crew availability before confirming. Once a slot is taken it's removed everywhere instantly, so the same crew can't be booked twice for the same time.",
      },
      {
        question: "What recurring schedules are supported?",
        answer:
          "Seven patterns: daily, weekly, bi-weekly, tri-weekly, monthly by date, monthly by weekday, and fully custom — and you can pause a single occurrence without ending the series.",
      },
      {
        question: "Can clients book themselves?",
        answer:
          "Yes. Clients get a branded self-booking portal to view upcoming appointments, request changes, and book new services, which cuts down inbound scheduling calls.",
      },
      {
        question: "Does it consider travel time between jobs?",
        answer:
          "Yes. Scheduling factors in drive time between job sites along with service duration and crew assignments to build an efficient route through the day.",
      },
      {
        question: "What happens when I need to move a job?",
        answer:
          "Drag it to the new slot on the calendar. The system updates the booking and sends the appropriate notifications to the crew and client automatically.",
      },
    ],
    relatedSlugs: ["ai-receptionist", "gps-verified-check-in", "one-click-payroll"],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    slug: "review-management",
    category: "Reputation",
    eyebrow: "Stage 6 of 7 · Reputation",
    name: "Review Management",
    status: "live",
    title:
      "Automated Review Management for Home Service Businesses | Get More 5-Star Reviews — Full Loop CRM",
    metaDescription:
      "Full Loop automatically requests a review after every job, catches unhappy customers before they post publicly with sentiment detection, and includes a rebooking offer in every follow-up. Turn great work into 5-star reviews and repeat revenue.",
    keywords: [
      "automated review management",
      "get more google reviews",
      "review request automation",
      "reputation management for home services",
      "negative review prevention",
      "post-service follow-up software",
      "5-star review software",
      "review generation for contractors",
    ],
    h1: "Automated Review Management That Turns Every Job Into a 5-Star Review",
    heroSub:
      "Automatic post-service follow-up, negative-sentiment detection before reviews go public, and a rebooking offer baked into every message.",
    intro:
      "Your online reputation decides whether the next lead calls you or your competitor — but chasing reviews manually never happens when you're slammed. Full Loop automates the entire post-service loop: it asks every happy client for a review at the perfect moment, quietly flags the unhappy ones before they post something public, and slips a rebooking offer into every follow-up so a single job becomes a review and a repeat customer.",
    problem: {
      heading: "Why review requests never happen manually",
      body:
        "Reviews are the highest-leverage marketing a service business has, yet asking for them is the first thing that falls off when you're busy. Worse, an upset customer will post a one-star review publicly before you even know there was a problem — and a handful of those can outweigh a hundred great jobs in a prospect's eyes.",
    },
    blocks: [
      {
        heading: "Automated post-service follow-up",
        body:
          "After every completed job, the client automatically gets a follow-up asking about their experience, timed while the work is still fresh. Happy clients are guided straight to leave a public review — no manual sending, no forgetting.",
      },
      {
        heading: "Negative-sentiment detection",
        body:
          "The AI reads client responses for dissatisfaction before it becomes a public review. If someone's unhappy, the conversation is flagged immediately so you can make it right privately — prevention instead of damage control.",
      },
      {
        heading: "Rebooking offer in every follow-up",
        body:
          "Each follow-up includes a rebooking incentive, so the same message that earns a review also books the next job. It's the simplest lever for turning one-time work into recurring revenue.",
      },
      {
        heading: "Nightly Google review sync",
        body:
          "New reviews are pulled in automatically every night, so your dashboard reflects your real, current reputation across platforms without you checking each one manually.",
      },
    ],
    outcome: {
      heading: "More 5-star reviews, fewer public surprises",
      body:
        "Your steady stream of great work finally shows up in your star rating, unhappy customers get intercepted before they post, and every follow-up quietly drives a rebooking. Your reputation compounds into more inbound leads — automatically, after every job.",
    },
    faqs: [
      {
        question: "How does it get more reviews without me sending anything?",
        answer:
          "After each completed job, the platform automatically sends a timed follow-up and routes happy clients to leave a public review — so requests go out on every job without any manual effort.",
      },
      {
        question: "Can it stop a bad review before it's posted?",
        answer:
          "It detects negative sentiment in a client's response and flags the conversation immediately, giving you the chance to resolve the issue privately before it becomes a public review.",
      },
      {
        question: "Does asking for a review also help rebooking?",
        answer:
          "Yes. Every follow-up includes a rebooking offer, so the same message that generates a review also drives the next booking.",
      },
      {
        question: "Do new reviews show up automatically?",
        answer:
          "Yes. Google reviews sync nightly so your dashboard always reflects your current reputation without manual checking.",
      },
      {
        question: "When is the review request sent?",
        answer:
          "Shortly after the job is marked complete, while the experience is still fresh — the window where clients are most likely to leave a positive review.",
      },
    ],
    relatedSlugs: ["ai-receptionist", "autonomous-seo-engine", "gps-verified-check-in"],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    slug: "one-click-payroll",
    category: "Payments",
    eyebrow: "Stage 5 of 7 · Payments",
    name: "One-Click Payroll",
    status: "live",
    title:
      "One-Click Payroll from GPS Hours | Automated Crew Pay — Full Loop CRM",
    metaDescription:
      "Full Loop calculates crew pay automatically from GPS-verified hours and each worker's rate, then pays out with a single click. No spreadsheets, no manual math — plus 1099-ready tracking and Stripe Connect payouts on job completion.",
    keywords: [
      "one-click payroll software",
      "automated payroll for crews",
      "GPS hours to payroll",
      "field service payroll software",
      "contractor payout software",
      "1099 payroll tracking",
      "crew earnings tracking",
      "payroll for cleaning business",
    ],
    h1: "One-Click Payroll That Pays Your Crew Straight From GPS Hours",
    heroSub:
      "Verified hours times each worker's rate, calculated automatically — review and pay in a single click, with 1099-ready tracking built in.",
    intro:
      "Payroll is the Sunday-night chore no owner wants: exporting timesheets, multiplying hours by rates, second-guessing whether the numbers are honest. Full Loop erases it. Because hours come from GPS-verified check-ins and pay rates are already on file, payroll is calculated the moment a job ends — so paying your whole crew is a review-and-click, not an evening of spreadsheets.",
    problem: {
      heading: "Why manual payroll costs you time and money",
      body:
        "Hand-calculated payroll is slow, error-prone, and easy to game. Padded timesheets quietly inflate your labor cost, math mistakes create disputes, and tracking who crossed the 1099 threshold is a year-end scramble. Every pay period you're either overpaying or arguing about it.",
    },
    blocks: [
      {
        heading: "Pay calculated from verified hours",
        body:
          "Hours flow directly from GPS-verified check-in and check-out times, billed in fair half-hour increments, then multiplied by each crew member's pay rate. The number is right before you ever look at it — no timesheet entry, no manual math.",
      },
      {
        heading: "Review and pay in one click",
        body:
          "See each worker's calculated pay for the period, confirm it, and mark them paid with a single click. What used to be an hour of spreadsheet work becomes a thirty-second review.",
      },
      {
        heading: "Automatic Stripe Connect payouts",
        body:
          "Crews onboard through Stripe Connect, and payouts can run automatically on job completion — so your team gets paid promptly without you cutting checks or moving money by hand.",
      },
      {
        heading: "1099-ready contractor tracking",
        body:
          "Every payout is tracked with year-to-date totals and flagged the moment a contractor crosses the $600 1099 threshold. At tax time you export a clean, pre-formatted report instead of reconciling a year of payments.",
      },
    ],
    outcome: {
      heading: "Payroll that takes seconds and stays honest",
      body:
        "You stop paying for hours that weren't worked, you close out each pay period in a click, and your crew always knows their earnings are accurate. Come tax season, the 1099 tracking is already done — no scramble, no surprises.",
    },
    faqs: [
      {
        question: "How is crew pay calculated?",
        answer:
          "Automatically, from GPS-verified check-in and check-out times billed in half-hour increments, multiplied by each worker's pay rate — so the amount is correct before you review it.",
      },
      {
        question: "Do I still need a spreadsheet?",
        answer:
          "No. Hours, rates, and totals are handled in the platform. Payroll becomes a one-click review-and-approve step with no manual calculation.",
      },
      {
        question: "How do crew members actually get paid?",
        answer:
          "Through Stripe Connect. Crews onboard once, and payouts can run automatically on job completion so you don't have to cut checks or transfer money manually.",
      },
      {
        question: "Does it help with 1099s?",
        answer:
          "Yes. Each contractor's payouts are tracked year-to-date and flagged at the $600 threshold, and you can export a pre-formatted report at tax time.",
      },
      {
        question: "Can crew members see their own earnings?",
        answer:
          "Yes. Weekly, monthly, and yearly earnings are visible in each crew member's portal, so your team always knows where they stand.",
      },
    ],
    relatedSlugs: ["gps-verified-check-in", "smart-scheduling", "autonomous-seo-engine"],
  },
];

export const features: Feature[] = [...baseFeatures, ...featuresB, ...featuresC];

// ── Lookups ──
export function getFeature(slug: string): Feature | undefined {
  return features.find((f) => f.slug === slug);
}

export function featureUrl(slug: string): string {
  return `${SITE}/feature/${slug}`;
}

export function getRelatedFeatures(feature: Feature): Feature[] {
  return feature.relatedSlugs
    .map((slug) => getFeature(slug))
    .filter((f): f is Feature => Boolean(f));
}
