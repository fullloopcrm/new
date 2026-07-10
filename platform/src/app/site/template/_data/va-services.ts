/**
 * The 10 virtual-assistant services that drive the national SEO matrix. Each
 * carries enough seed material (definition, task list, benefits, objections,
 * FAQs) for the content generator to expand into a 5k-word service page and a
 * 3k-word geo×service page without reading thin. Data-only; industry-generic.
 */

export interface VAService {
  slug: string
  /** Full name, e.g. "Call Answering & Reception" */
  name: string
  /** Short label, e.g. "Call Answering" */
  shortName: string
  /** One-line value prop */
  tagline: string
  /** 2–3 sentence definition of the service */
  definition: string
  /** Concrete tasks a VA performs in this service */
  tasks: string[]
  /** Business benefits of delegating this */
  benefits: string[]
  /** Who this service is ideal for */
  idealFor: string[]
  /** The pain of NOT having it / the objection we answer */
  painPoints: string[]
  /** Service-specific FAQs */
  faqs: { q: string; a: string }[]
}

export const VA_SERVICES: VAService[] = [
  {
    slug: 'call-answering',
    name: 'Call Answering & Reception',
    shortName: 'Call Answering',
    tagline: 'A real person answers every call — no robot, no voicemail, no lost lead.',
    definition:
      'Call answering is a live, English-speaking virtual receptionist who picks up your business phone, greets callers in your company name, screens and routes calls, and books appointments — all without an AI voice bot or an overseas call-center script. Your callers reach a real professional who sounds like a member of your team.',
    tasks: [
      'Answering inbound calls live in your business name',
      'Screening and qualifying callers before they reach you',
      'Booking appointments straight into your calendar',
      'Taking detailed messages and routing urgent calls',
      'Handling overflow and after-hours calls 24/7',
      'Following up on missed calls and voicemails',
    ],
    benefits: [
      'Never miss a lead because you were on a job or asleep',
      'Sound bigger and more professional than you are',
      'Convert more callers with an instant, human pickup',
      'Free yourself from the phone to do the actual work',
    ],
    idealFor: ['Home service businesses', 'Law and medical offices', 'Contractors and trades', 'Any business that lives or dies by the phone'],
    painPoints: [
      'Every call that hits voicemail is a lead your competitor answers',
      'AI answering services frustrate callers and get hung up on',
      'A missed call at 6pm is a job booked with someone else by 6:05',
    ],
    faqs: [
      { q: 'Do callers know they are speaking to a virtual assistant?', a: 'No. Your assistant answers in your business name and represents you as part of your team. To the caller, they are simply your receptionist.' },
      { q: 'Can they book appointments during the call?', a: 'Yes. Your assistant works inside your calendar and booking system, so appointments are set in real time while the caller is still on the line.' },
    ],
  },
  {
    slug: 'appointment-setting',
    name: 'Appointment Setting & Scheduling',
    shortName: 'Appointment Setting',
    tagline: 'Your calendar, managed — booked, confirmed, and reminded, so nobody no-shows.',
    definition:
      'Appointment setting is a dedicated assistant who owns your calendar: booking new appointments, confirming them, sending reminders, rescheduling cancellations, and keeping your day organized so you can focus on delivering the work instead of coordinating it.',
    tasks: [
      'Booking and confirming appointments',
      'Sending reminders to cut down no-shows',
      'Rescheduling and filling cancelled slots',
      'Coordinating across time zones',
      'Managing your daily and weekly calendar',
      'Prepping you before each meeting',
    ],
    benefits: [
      'Fewer no-shows and empty slots',
      'A calendar that runs itself',
      'More billable hours, less coordination',
      'Professional follow-through on every booking',
    ],
    idealFor: ['Consultants and coaches', 'Salons and clinics', 'Sales teams', 'Service providers with a full calendar'],
    painPoints: [
      'No-shows quietly bleed revenue every week',
      'Playing phone tag to schedule wastes hours',
      'An empty slot is money you will never get back',
    ],
    faqs: [
      { q: 'Which scheduling tools do you work with?', a: 'Your assistant adapts to your stack — Google Calendar, Calendly, Acuity, and CRM-based scheduling all included. They work in whatever you already use.' },
      { q: 'Can they handle reschedules and cancellations?', a: 'Yes. Your assistant proactively confirms appointments, handles reschedules, and works to fill any slot that opens up.' },
    ],
  },
  {
    slug: 'admin-data-entry',
    name: 'Admin & Data Entry',
    shortName: 'Admin & Data Entry',
    tagline: 'The busywork, done — accurately, on time, and off your plate.',
    definition:
      'Administrative support and data entry is a virtual assistant who handles the repetitive back-office work that eats your day: entering records, organizing files, preparing documents, managing spreadsheets, and keeping your systems clean and current.',
    tasks: [
      'Data entry and database maintenance',
      'Document preparation and formatting',
      'File organization and cloud management',
      'Spreadsheet building and updating',
      'Research and list building',
      'Order and form processing',
    ],
    benefits: [
      'Reclaim hours lost to repetitive tasks',
      'Cleaner, more accurate records',
      'Systems that stay organized without your effort',
      'Lower cost than a part-time in-house admin',
    ],
    idealFor: ['Small businesses', 'E-commerce stores', 'Real estate offices', 'Anyone drowning in back-office work'],
    painPoints: [
      'Every hour on data entry is an hour not spent growing',
      'Messy records cost you deals and hours later',
      'Admin work expands to fill all the time you give it',
    ],
    faqs: [
      { q: 'How do you keep my data secure?', a: 'Your assistant works within your systems under your access controls, and every hour is tracked transparently through Quo so you always know what was touched and when.' },
      { q: 'Can they learn my specific process?', a: 'Yes. Each assistant is given an AI knowledge panel built on your business, so your process, formats, and preferences are documented and followed consistently.' },
    ],
  },
  {
    slug: 'email-inbox-management',
    name: 'Inbox & Email Management',
    shortName: 'Email Management',
    tagline: 'Inbox zero, in your voice — nothing important slips through again.',
    definition:
      'Inbox and email management is a virtual assistant who triages your inbox, replies to routine messages in your voice, flags what needs you, and keeps your email organized — so you open your inbox to a short list of what actually matters instead of a wall of noise.',
    tasks: [
      'Triaging and sorting incoming email',
      'Replying to routine messages in your voice',
      'Flagging and summarizing what needs you',
      'Managing folders, labels, and filters',
      'Following up on unanswered threads',
      'Unsubscribing and cutting the noise',
    ],
    benefits: [
      'Open your inbox to signal, not noise',
      'Faster responses keep clients happy',
      'Nothing important gets buried',
      'Hours of your week handed back',
    ],
    idealFor: ['Founders and executives', 'Busy solopreneurs', 'Client-heavy businesses', 'Anyone buried in email'],
    painPoints: [
      'A buried email is a lost client or a missed deal',
      'Living in your inbox is not the same as running your business',
      'Slow replies quietly train clients to look elsewhere',
    ],
    faqs: [
      { q: 'Will replies actually sound like me?', a: 'Yes. Your assistant is trained on your tone and past emails through their knowledge panel, so routine replies read as if you wrote them.' },
      { q: 'What about sensitive emails?', a: 'You set the rules. Anything sensitive or high-stakes is flagged and summarized for you rather than answered automatically.' },
    ],
  },
  {
    slug: 'crm-management',
    name: 'CRM Management',
    shortName: 'CRM Management',
    tagline: 'Your pipeline, worked — every lead logged, followed up, and moved to close.',
    definition:
      'CRM management is a virtual assistant who runs your customer relationship system day to day: logging every lead, updating deal stages, scheduling follow-ups, and making sure no opportunity goes cold. Ours work directly inside FullLoop CRM, so the work lands where your business already lives.',
    tasks: [
      'Logging and enriching every new lead',
      'Updating deal stages and pipeline status',
      'Scheduling and executing follow-ups',
      'Keeping contact records clean and current',
      'Running reports on pipeline health',
      'Re-engaging cold and dormant leads',
    ],
    benefits: [
      'No lead ever falls through the cracks',
      'A pipeline that is always up to date',
      'Consistent follow-up that closes more deals',
      'Clear visibility into what is working',
    ],
    idealFor: ['Sales-driven businesses', 'Agencies', 'Home service companies', 'Any team running a CRM'],
    painPoints: [
      'A lead with no follow-up is a sale you handed to a competitor',
      'A messy CRM is a pipeline you cannot trust',
      'Deals go cold in the gap between "interested" and "followed up"',
    ],
    faqs: [
      { q: 'Do you only work in FullLoop CRM?', a: 'FullLoop CRM is our home base and where the workflow is tightest, but your assistant can work in whatever CRM you run. The value is the disciplined daily follow-up, in any system.' },
      { q: 'Can they follow up with leads directly?', a: 'Yes. Within your rules, your assistant handles follow-up calls, emails, and texts so every lead gets worked, not just logged.' },
    ],
  },
  {
    slug: 'customer-support',
    name: 'Customer Support & Live Chat',
    shortName: 'Customer Support',
    tagline: 'Happy customers, handled — live chat, tickets, and follow-through, 24/7.',
    definition:
      'Customer support is a virtual assistant who handles your customer questions across live chat, email, and tickets — answering quickly, solving problems, and following through so your customers feel taken care of and stay loyal.',
    tasks: [
      'Answering live chat and support tickets',
      'Resolving common questions and issues',
      'Escalating what needs your attention',
      'Following up until issues are closed',
      'Processing returns, refunds, and orders',
      'Keeping a knowledge base current',
    ],
    benefits: [
      'Faster response times, happier customers',
      'Support coverage without hiring a team',
      'Fewer refunds lost to slow replies',
      'Loyalty built on being taken care of',
    ],
    idealFor: ['E-commerce brands', 'SaaS and app companies', 'Service businesses', 'Any business with customers to keep'],
    painPoints: [
      'A slow support reply is a one-star review waiting to happen',
      'Unanswered chat is a cart abandoned',
      'Customers remember how you handled the problem, not that there was one',
    ],
    faqs: [
      { q: 'Can they cover nights and weekends?', a: 'Yes. 24/7 coverage is available, so your customers get a fast, human response whenever they reach out.' },
      { q: 'Which support tools do you use?', a: 'Your assistant works in your existing help desk and chat tools — Zendesk, Intercom, Gorgias, Freshdesk, and more.' },
    ],
  },
  {
    slug: 'lead-generation',
    name: 'Lead Generation & Cold Outreach',
    shortName: 'Lead Generation',
    tagline: 'A pipeline that fills itself — researched, contacted, and booked.',
    definition:
      'Lead generation is a virtual assistant who builds your prospect lists, runs cold email and outreach campaigns, and books qualified appointments onto your calendar — turning an empty pipeline into a steady flow of conversations.',
    tasks: [
      'Building targeted prospect lists',
      'Researching and enriching contacts',
      'Running cold email and LinkedIn outreach',
      'Following up with prospects persistently',
      'Booking qualified appointments',
      'Tracking campaign performance',
    ],
    benefits: [
      'A pipeline that stays full',
      'Outreach that actually gets followed up',
      'More qualified meetings on your calendar',
      'Growth work that happens without you',
    ],
    idealFor: ['B2B service providers', 'Agencies and consultants', 'Sales teams', 'Anyone who needs more meetings'],
    painPoints: [
      'An empty pipeline today is an empty bank account in 90 days',
      'Outreach without follow-up is just noise',
      'You cannot close deals you never started',
    ],
    faqs: [
      { q: 'Do you guarantee a number of leads?', a: 'We do not sell fake guarantees. Your assistant runs disciplined, consistent outreach and follow-up — the activity that reliably produces meetings over time.' },
      { q: 'Whose tools and accounts are used?', a: 'Your assistant works from your accounts and sending tools so your domain reputation and data stay yours.' },
    ],
  },
  {
    slug: 'social-media-management',
    name: 'Social Media Management',
    shortName: 'Social Media',
    tagline: 'Show up consistently — posted, scheduled, and engaged, without you.',
    definition:
      'Social media management is a virtual assistant who keeps your channels active: scheduling posts, engaging with your audience, responding to comments and DMs, and maintaining a consistent presence so your brand stays visible without eating your time.',
    tasks: [
      'Scheduling and publishing posts',
      'Writing captions in your brand voice',
      'Responding to comments and DMs',
      'Engaging with your target audience',
      'Basic graphics and content sourcing',
      'Tracking engagement and growth',
    ],
    benefits: [
      'A consistent presence that builds trust',
      'Engagement that turns followers into customers',
      'Content that ships on schedule',
      'Your time back from the content treadmill',
    ],
    idealFor: ['Local businesses', 'Personal brands', 'Coaches and creators', 'Any brand that needs to stay visible'],
    painPoints: [
      'An abandoned profile signals an abandoned business',
      'Inconsistent posting kills the momentum you built',
      'DMs left unread are customers left unclaimed',
    ],
    faqs: [
      { q: 'Do they create the content too?', a: 'Your assistant handles scheduling, captions in your voice, sourcing, and light graphics. For heavy design or video, they coordinate with your creative resources.' },
      { q: 'Which platforms are covered?', a: 'Instagram, Facebook, LinkedIn, X, TikTok, and Google Business Profile — wherever your audience is.' },
    ],
  },
  {
    slug: 'bookkeeping-support',
    name: 'Bookkeeping & Invoicing Support',
    shortName: 'Bookkeeping Support',
    tagline: 'Books that stay current — invoiced, reconciled, and chased, on time.',
    definition:
      'Bookkeeping and invoicing support is a virtual assistant who keeps your finances organized: sending invoices, chasing payments, categorizing expenses, reconciling accounts, and prepping clean records so your accountant — and your cash flow — thank you.',
    tasks: [
      'Creating and sending invoices',
      'Following up on unpaid invoices',
      'Categorizing and tracking expenses',
      'Reconciling accounts and statements',
      'Preparing records for your accountant',
      'Building simple financial reports',
    ],
    benefits: [
      'Get paid faster with consistent invoicing',
      'Books that are always current',
      'Less scramble at tax time',
      'Clear visibility into your cash flow',
    ],
    idealFor: ['Freelancers and contractors', 'Small businesses', 'Agencies', 'Anyone behind on their books'],
    painPoints: [
      'An unsent invoice is a paycheck you forgot to collect',
      'Messy books at tax time cost you money and sleep',
      'Late follow-up on invoices is an interest-free loan to your clients',
    ],
    faqs: [
      { q: 'Do you replace my accountant?', a: 'No. Your assistant handles day-to-day bookkeeping and invoicing so your accountant gets clean records and you save on their hours. They complement, not replace, your CPA.' },
      { q: 'Which accounting tools do you use?', a: 'QuickBooks, Xero, FreshBooks, Wave, and Stripe — your assistant works in your existing setup.' },
    ],
  },
  {
    slug: 'executive-assistant',
    name: 'Executive / Personal Assistant',
    shortName: 'Executive Assistant',
    tagline: 'A true right hand — your calendar, inbox, travel, and to-dos, handled.',
    definition:
      'An executive or personal assistant is a dedicated virtual assistant who acts as your right hand: managing your calendar and inbox, booking travel, coordinating your day, handling personal errands, and protecting your time so you operate at the top of your game.',
    tasks: [
      'Managing your calendar and inbox',
      'Booking travel and accommodations',
      'Coordinating meetings and prep',
      'Handling personal tasks and errands',
      'Researching and drafting on your behalf',
      'Protecting and organizing your time',
    ],
    benefits: [
      'Operate at the top of your value',
      'A day that runs without your coordination',
      'Nothing dropped, nothing forgotten',
      'The leverage of an EA at a fraction of the cost',
    ],
    idealFor: ['Founders and executives', 'Busy professionals', 'Investors', 'Anyone whose time is their scarcest asset'],
    painPoints: [
      'Doing $10 tasks keeps you from $1,000 decisions',
      'Coordination is not the same as leadership',
      'Your time is the one thing you can never buy back',
    ],
    faqs: [
      { q: 'Is the assistant dedicated to me?', a: 'Yes. On a part-time or full-time plan your assistant is dedicated to you, learning how you work and becoming a genuine extension of you.' },
      { q: 'Can they handle personal, not just business, tasks?', a: 'Yes. From travel to reservations to errands and research, your assistant handles the personal load that clears your head for the work that matters.' },
    ],
  },
]

const SERVICE_BY_SLUG: Record<string, VAService> = Object.fromEntries(
  VA_SERVICES.map((s) => [s.slug, s]),
)

export function getVAServiceBySlug(slug: string): VAService | null {
  return SERVICE_BY_SLUG[slug] ?? null
}
