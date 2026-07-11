import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-seo/_components/CTAGroup";
import { PHONE, SITE_URL } from "@/app/site/the-nyc-seo/_lib/seo";

export const metadata: Metadata = {
  title: "AI Agent Development NYC",
  description:
    "Custom AI agent development for NYC service businesses. Chatbots, voice agents, lead qualification bots, and CRM integration. Built with Full Loop CRM.",
  keywords: [
    "AI agent development NYC",
    "custom AI chatbot New York",
    "voice agent development",
    "lead qualification bot",
    "AI appointment booking agent",
    "FAQ chatbot for business",
    "bilingual AI agent English Spanish",
    "SMS AI agent",
    "AI intake automation",
    "AI sales assistant NYC",
    "custom chatbot development",
    "AI receptionist",
    "voice AI phone agent",
    "AI lead capture",
    "knowledge base chatbot",
    "Telnyx voice agent",
    "AI customer service bot",
    "AI agent for service businesses",
  ],
  openGraph: {
    title: "AI Agent Development NYC",
    description:
      "Custom AI agents for NYC businesses. Chatbots, voice agents, lead qualification bots, and CRM integration. Full Loop CRM.",
    url: `${SITE_URL}/services/ai-agent-development`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/services/ai-agent-development` },
};

const faqs = [
  {
    q: "How much does custom AI agent development cost?",
    a: "Our AI agent projects range from $7,500 to $30,000+ depending on complexity, integrations, and scope. A single-channel chatbot with FAQ handling and lead capture starts around $7,500. A multi-channel system with voice agents, SMS automation, CRM integration, bilingual support, and custom knowledge bases runs $15,000 to $30,000+. Monthly maintenance and optimization plans are available starting at $1,500 per month. Every project includes training, deployment, and 30 days of post-launch support.",
  },
  {
    q: "What is an AI agent and how is it different from a regular chatbot?",
    a: "A regular chatbot follows pre-written scripts — if someone asks something outside the script, it breaks. An AI agent uses large language models to understand context, handle complex conversations, and take real actions — booking appointments, qualifying leads, looking up pricing, transferring calls, and sending follow-up messages. Our AI agents are trained on your actual business data: your services, pricing, service areas, FAQs, and scheduling availability. They do not just answer questions — they close leads.",
  },
  {
    q: "How long does it take to build and deploy a custom AI agent?",
    a: "Most AI agent projects take 3 to 6 weeks from kickoff to deployment. Simple chatbot agents with FAQ handling can be live in 2 weeks. Complex multi-channel systems with voice agents, CRM integration, and custom knowledge bases take 4 to 8 weeks. We handle the entire process — knowledge base creation, conversation flow design, integration setup, testing, and deployment. You do not need any technical expertise on your end.",
  },
  {
    q: "Can AI agents really handle phone calls?",
    a: "Yes. Our voice AI agents use Telnyx telephony infrastructure to answer phone calls with natural-sounding conversation — not robotic IVR menus. They handle common questions, capture caller information, book appointments, provide business hours and pricing, and escalate urgent or complex calls to your team in real-time. Every call is logged, transcribed, and stored in your CRM. Voice agents are particularly valuable for service businesses that miss 40 to 60 percent of incoming calls during busy hours.",
  },
  {
    q: "Do your AI agents work in Spanish?",
    a: "Yes. All of our AI agents are built with full bilingual support — English and Spanish — out of the box. The agent automatically detects the language the customer is using and responds accordingly. This is critical for NYC service businesses where a significant portion of your customer base communicates in Spanish. Our AI agents handle both languages with equal fluency across chat, SMS, and voice channels.",
  },
  {
    q: "How do AI agents use our SEO data?",
    a: "This is what separates our approach from generic chatbot builders. Your SEO strategy already produces structured data about your services, service areas, pricing, FAQs, and competitive positioning. We use that same data to build your AI agent's knowledge base. When a customer asks your chatbot about drain cleaning in Park Slope, the agent pulls from the same structured content that ranks your drain cleaning page in Google. Your SEO and your AI agent reinforce each other — the data that drives rankings also drives conversions.",
  },
  {
    q: "What platforms and channels do your AI agents support?",
    a: "Our AI agents deploy across every channel your customers use: website chat widgets, SMS text messaging via Telnyx, voice phone calls, WhatsApp, Facebook Messenger, Instagram DMs, and email. Most of our service business clients start with website chat plus SMS, then add voice agents as a second phase. All channels feed into a single conversation history so your team always has full context, regardless of how the customer reached you.",
  },
  {
    q: "What is Selenas and how does it relate to your AI agent work?",
    a: "Selenas is the AI sales assistant built into Full Loop CRM — our proprietary CRM platform at homeservicesbusinesscrm.com. Selenas handles approximately 80 percent of receptionist duties: answering questions, qualifying leads, booking appointments, sending follow-ups, and managing customer conversations via SMS, all 24/7 in both English and Spanish. We built Selenas ourselves, and the same team that built it builds custom AI agents for our clients. Selenas is a real-world, production-tested example of exactly what we deliver.",
  },
  {
    q: "Do I need to change my existing website or CRM to use AI agents?",
    a: "No. Our AI agents integrate with your existing systems. We embed chat widgets on any website regardless of the platform. We connect to your existing CRM, calendar, and booking systems via API. If you are using Full Loop CRM, the integration is native and seamless. If you are on another platform — HubSpot, Salesforce, GoHighLevel, or any system with an API — we build custom integrations. You do not need to replace anything.",
  },
  {
    q: "What happens when an AI agent cannot answer a question?",
    a: "Every AI agent we build includes intelligent escalation logic. When a question falls outside the agent's knowledge base, is too complex for automated handling, or when the customer explicitly asks for a human, the agent seamlessly transfers the conversation to your team — via live chat handoff, phone transfer, SMS alert, or email notification, depending on your preference. The agent also logs the question so we can expand the knowledge base to handle it next time. Over time, the agent gets smarter and handles more conversations end-to-end.",
  },
  {
    q: "How do you measure the ROI of an AI agent?",
    a: "We track every metric that matters: total conversations handled, leads captured, appointments booked, after-hours leads that would have been lost, average response time versus your previous response time, qualification accuracy, and escalation rate. Most of our clients see full ROI within 60 to 90 days based on leads captured after hours alone. A single lead for a personal injury lawyer, plumber emergency call, or dental patient is often worth $500 to $5,000+ — one after-hours lead per week pays for the entire system.",
  },
  {
    q: "Are AI agents secure? What about customer data privacy?",
    a: "Security is built into every layer of our AI agent architecture. We use Supabase for data storage — enterprise-grade PostgreSQL with row-level security, encryption at rest, and SOC 2 compliance. All conversations are encrypted in transit via TLS. We never share customer data with third parties or use it to train external models. Our agents run on dedicated infrastructure, not shared public chatbot platforms. For businesses with specific compliance requirements — HIPAA, PCI, or industry-specific regulations — we build custom security configurations.",
  },
  {
    q: "Can AI agents book appointments directly into my calendar?",
    a: "Yes. Our AI agents integrate directly with Google Calendar, Microsoft Outlook, Calendly, Acuity, and custom booking systems. The agent checks real-time availability, offers time slots to the customer, confirms the booking, sends confirmation messages via SMS or email, and adds the appointment to your calendar — all within a single conversation. No human intervention required. For service businesses that rely on appointment scheduling, this alone justifies the investment.",
  },
  {
    q: "Do you offer ongoing maintenance and optimization after launch?",
    a: "Yes. We offer monthly maintenance plans starting at $1,500 per month that include knowledge base updates, conversation flow optimization, performance monitoring, analytics reporting, and priority support. AI agents improve over time — we analyze conversation logs, identify patterns, expand the knowledge base, tune responses, and add new capabilities as your business evolves. Most clients on maintenance plans see a 20 to 30 percent improvement in agent performance within the first 90 days post-launch.",
  },
  {
    q: "What industries benefit most from AI agents?",
    a: "Any service business that handles inbound inquiries benefits from AI agents, but the highest-ROI industries are those with high lead values and high call volumes: personal injury lawyers, dentists, HVAC contractors, plumbers, electricians, medical practices, home remodelers, and real estate professionals. If you receive more than 20 inbound inquiries per week and your average customer value exceeds $500, an AI agent will almost certainly pay for itself within the first quarter.",
  },
  {
    q: "How is The NYC SEO different from other AI agent developers?",
    a: "Three things set us apart. First, we are an SEO agency — we build AI agents powered by the same structured data that drives your search rankings. No other AI developer connects these two systems. Second, we have a production-proven AI platform — Selenas, the AI assistant inside Full Loop CRM, handles thousands of real conversations monthly. We are not experimenting; we are deploying battle-tested technology. Third, we build on real infrastructure — Supabase, Telnyx, Next.js — not drag-and-drop chatbot builders that break under load. Our agents scale.",
  },
];

export default function AIAgentDevelopmentPage() {
  /* ---------- Schema Markup ---------- */
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "The NYC SEO",
    url: SITE_URL,
    telephone: PHONE,
    address: {
      "@type": "PostalAddress",
      streetAddress: "150 W 47th St",
      addressLocality: "New York",
      addressRegion: "NY",
      postalCode: "10036",
      addressCountry: "US",
    },
    email: "hi@consortiumnyc.com",
    sameAs: ["https://www.consortiumnyc.com", "https://homeservicesbusinesscrm.com"],
    parentOrganization: {
      "@type": "Organization",
      name: "Consortium NYC",
      url: "https://www.consortiumnyc.com",
    },
  };

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "The NYC SEO — AI Agent Development",
    url: `${SITE_URL}/services/ai-agent-development`,
    telephone: PHONE,
    priceRange: "$7,500 - $30,000+",
    description:
      "Custom AI agent development for service businesses — chatbots, voice agents, lead qualification bots, appointment booking automation, bilingual AI, SMS-based conversations, and intake automation. Built on Supabase, Telnyx, and structured SEO data.",
    address: {
      "@type": "PostalAddress",
      streetAddress: "150 W 47th St",
      addressLocality: "New York",
      addressRegion: "NY",
      postalCode: "10036",
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: "40.7580",
      longitude: "-73.9855",
    },
    areaServed: [
      { "@type": "City", name: "New York" },
      { "@type": "State", name: "New Jersey" },
      { "@type": "Place", name: "Long Island" },
      { "@type": "Place", name: "Westchester" },
    ],
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "AI Agent Development Services",
    description:
      "Custom AI agent development including chatbots, voice agents, lead qualification bots, appointment booking agents, FAQ handling agents, intake automation, bilingual AI assistants, and SMS-based AI conversations for service businesses in the NYC metro area.",
    url: `${SITE_URL}/services/ai-agent-development`,
    provider: {
      "@type": "Organization",
      name: "The NYC SEO",
      url: SITE_URL,
    },
    areaServed: [
      { "@type": "City", name: "New York" },
      { "@type": "State", name: "New Jersey" },
      { "@type": "Place", name: "Long Island" },
      { "@type": "Place", name: "Westchester" },
    ],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "AI Agent Development Services",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Custom AI Chatbot Development" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Voice AI Phone Agents (Telnyx)" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Lead Qualification Bots" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Appointment Booking Agents" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "FAQ Handling Agents" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Intake Automation" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Bilingual AI (English/Spanish)" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "SMS-Based AI Conversations" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Knowledge Base Development" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "CRM & Calendar Integration" } },
      ],
    },
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How Our AI Agent Development Process Works",
    description: "Our proven 6-step process for building and deploying custom AI agents for NYC service businesses.",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Discovery & Business Analysis",
        text: "We audit your current lead handling, response times, missed calls, after-hours gaps, and customer conversation patterns. We identify every opportunity where an AI agent can capture revenue you are currently losing.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Knowledge Base Construction",
        text: "We build a comprehensive knowledge base from your SEO data, service descriptions, pricing, FAQs, service areas, and business processes. This structured data powers your AI agent's ability to answer questions accurately and qualify leads intelligently.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Conversation Flow Design",
        text: "We design conversation flows for every scenario — lead qualification, appointment booking, FAQ handling, intake processing, escalation to humans, and follow-up sequences. Every flow is optimized for conversion, not just information delivery.",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Integration & Development",
        text: "We build your AI agent on production-grade infrastructure — Supabase for data, Telnyx for voice and SMS, Next.js for the web interface. We integrate with your CRM, calendar, booking system, and any other tools your business relies on.",
      },
      {
        "@type": "HowToStep",
        position: 5,
        name: "Testing & Training",
        text: "We test every conversation path, edge case, and integration point. We run simulated conversations in English and Spanish, test voice quality and latency, verify appointment booking accuracy, and stress-test under load. Nothing goes live until it works flawlessly.",
      },
      {
        "@type": "HowToStep",
        position: 6,
        name: "Deployment & Optimization",
        text: "We deploy your agent, monitor performance in real-time, analyze conversation logs, and continuously optimize responses, knowledge base accuracy, and conversion rates. Your AI agent gets smarter every week it is in production.",
      },
    ],
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };

  const reviewSchema = {
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: {
      "@type": "ProfessionalService",
      name: "The NYC SEO — AI Agent Development",
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: "5",
      bestRating: "5",
    },
    author: { "@type": "Person", name: "Michael T." },
    reviewBody:
      "They built us an AI chatbot and SMS agent that handles after-hours leads for our HVAC company. Within the first month, the agent captured 47 leads that we would have completely lost — calls and texts that came in after 6 PM. Three of those turned into $15K+ jobs. The agent paid for itself in the first week.",
  };

  const breadcrumbItems = [
    { name: "Services", url: "/services" },
    { name: "AI Agent Development", url: "/services/ai-agent-development" },
  ];

  return (
    <div className="text-white">
      {/* Schema Markup */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewSchema) }} />

      {/* ============================================================
          SECTION 1: HERO
          ============================================================ */}
      <section className="bg-[#0A0A0A] pb-20 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={breadcrumbItems} />

          <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Left -- Copy */}
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0080FE]">
                AI Agent Development &middot; 20+ Years Experience
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                AI Agents That
                <br />
                <span className="bg-gradient-to-r from-[#0080FE] to-[#A9A6FA] bg-clip-text text-transparent">
                  Close Leads While You Sleep
                </span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                Your{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO</Link>{" "}
                and{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search optimization</Link>{" "}
                drive traffic. Your{" "}
                <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">website</Link>{" "}
                converts visitors into leads. But what happens when a potential customer hits your site at 11 PM on a Saturday? Or calls your office line during the lunch rush? With custom AI agents built by{" "}
                <a href="https://www.consortiumnyc.com" target="_blank" rel="noopener noreferrer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Consortium NYC</a>, they get answered instantly &mdash; questions handled, leads qualified, appointments booked, intake forms completed. In English and Spanish. Via chat, SMS, or phone. 24 hours a day, 365 days a year. No missed calls. No lost leads. No more revenue slipping through the cracks while your team is busy or offline.
              </p>
              <CTAGroup
                variant="hero"
                title="Build My AI Agent"
                subtitle="Talk to an expert about custom AI agents for your business."
              />
            </div>

            {/* Right -- Feature Checklist */}
            <div className="space-y-4">
              {[
                "Custom AI chatbots trained on your business data",
                "Voice AI phone agents via Telnyx integration",
                "Lead qualification & intelligent routing",
                "Appointment booking directly into your calendar",
                "FAQ handling agents with real-time knowledge",
                "Intake automation for new customers",
                "Bilingual AI — English & Spanish, every channel",
                "SMS-based AI conversations, 24/7",
                "Knowledge bases built from your SEO data",
                "CRM, calendar & booking system integration",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-[#141414] p-4">
                  <span className="text-green-400">&#10003;</span>
                  <span className="text-sm text-zinc-300">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 2: WHAT ARE AI AGENTS & WHY YOUR BUSINESS NEEDS THEM
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            What Are AI Agents and Why Does Your NYC Business Need Them?
          </h2>
          <div className="mt-8 space-y-6 text-zinc-300 leading-relaxed">
            <p>
              An AI agent is a software system powered by large language models that can understand natural language, hold intelligent conversations, and take real actions on behalf of your business &mdash; booking appointments, qualifying leads, answering questions, processing intake forms, sending follow-up messages, and routing urgent requests to your team. Unlike traditional chatbots that follow rigid, pre-written scripts and break the moment a customer says something unexpected, AI agents understand context, handle nuance, and adapt to the conversation in real time.
            </p>
            <p>
              For NYC{" "}
              <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">service businesses</Link>{" "}
              &mdash;{" "}
              <Link href="/plumber" className="text-[#5CB8FF] hover:text-[#8DD0FF]">plumbers</Link>,{" "}
              <Link href="/electrician" className="text-[#5CB8FF] hover:text-[#8DD0FF]">electricians</Link>,{" "}
              <Link href="/personal-injury-lawyer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">lawyers</Link>,{" "}
              <Link href="/dentist" className="text-[#5CB8FF] hover:text-[#8DD0FF]">dentists</Link>,{" "}
              <Link href="/hvac" className="text-[#5CB8FF] hover:text-[#8DD0FF]">HVAC contractors</Link>,{" "}
              <Link href="/house-cleaner" className="text-[#5CB8FF] hover:text-[#8DD0FF]">cleaning services</Link>{" "}
              &mdash; the business case is brutally simple. Research shows that 62 percent of calls to service businesses go unanswered. 78 percent of customers hire the first business that responds. Every missed call, every unanswered chat message, every after-hours website visitor who leaves without making contact is a customer who called your competitor instead. An AI agent eliminates that problem entirely.
            </p>
            <p>
              But our AI agents go far beyond just answering the phone. They qualify leads by asking the right questions &mdash; what service do you need, where are you located, what is your timeline, what is your budget. They book appointments directly into your calendar without any human intervention. They handle your most common FAQs with answers pulled from your own{" "}
              <Link href="/services/content-marketing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">content</Link>{" "}
              and{" "}
              <Link href="/services/on-page-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">on-page SEO</Link>{" "}
              data. They process intake forms for new customers. They send follow-up messages and appointment reminders. They work in English and Spanish. They work across your website, SMS, and phone &mdash; simultaneously. And they never take a day off.
            </p>
            <p>
              This is not theoretical. We built Selenas &mdash; the AI sales assistant inside{" "}
              <a href="https://homeservicesbusinesscrm.com" target="_blank" rel="noopener noreferrer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Full Loop CRM</a>{" "}
              &mdash; and it handles approximately 80 percent of receptionist duties for the businesses that use it. 24/7 bilingual SMS conversations, lead qualification, appointment booking, follow-ups. Selenas is production-tested, battle-hardened, and processing thousands of real conversations every month. The same team that built Selenas builds custom AI agents for our clients. We are not selling you an idea. We are deploying technology we have already proven works.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 3: OUR PROCESS (HowTo)
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Our 6-Step AI Agent Development Process
          </h2>
          <p className="mt-4 text-zinc-400">
            Every AI agent project follows the same proven framework &mdash; adapted to your business, your customers, and your specific conversion goals.
          </p>
          <div className="mt-10 space-y-10">
            {[
              {
                step: "01",
                title: "Discovery & Business Analysis",
                body: "We start by understanding how your business handles leads today. How many calls do you get per day? How many go unanswered? What happens to after-hours inquiries? What questions do customers ask most frequently? How do you currently qualify leads? What does your intake process look like? We audit your call logs, website chat history, Google Business Profile messages, and SMS conversations. We identify every gap where leads are falling through the cracks and calculate the revenue you are losing to slow response times, missed calls, and after-hours dead zones. This analysis becomes the foundation for everything we build.",
              },
              {
                step: "02",
                title: "Knowledge Base Construction",
                body: "Your AI agent is only as good as the data it is trained on. We build a comprehensive knowledge base from every piece of structured data your business has — your service descriptions, pricing, service areas, FAQs, scheduling availability, intake requirements, qualification criteria, and competitive differentiators. If you are already running SEO with us, we pull directly from the same structured data that powers your search rankings. Your on-page content, schema markup, FAQ sections, and location pages all feed into the knowledge base. This is the critical connection most AI developers miss — the same data that makes you rank in Google also makes your AI agent intelligent.",
              },
              {
                step: "03",
                title: "Conversation Flow Design",
                body: "We design every conversation path your agent will handle — from a simple FAQ response to a complex multi-step lead qualification flow. How should the agent greet visitors at different times of day? What qualifying questions should it ask, and in what order? How should it handle pricing questions? When should it offer to book an appointment? When should it escalate to a human? What should it do when it does not know the answer? We map every scenario, design the response logic, and build in personality that matches your brand. This is not template work — every flow is custom-designed for your business.",
              },
              {
                step: "04",
                title: "Integration & Development",
                body: "We build your AI agent on production-grade infrastructure. Supabase for secure data storage and real-time operations. Telnyx for voice calls and SMS messaging. Next.js for the web chat interface. We integrate your agent with your CRM — whether that is Full Loop CRM, HubSpot, Salesforce, GoHighLevel, or any platform with an API. We connect to your calendar for real-time appointment booking. We set up SMS automation through Telnyx for 24/7 text-based conversations. If you need voice AI, we configure Telnyx voice agents with natural-sounding speech and real-time call handling. Every integration is custom-built — we do not use generic chatbot platforms that break under real-world load.",
              },
              {
                step: "05",
                title: "Testing & Training",
                body: "We test every conversation path, every edge case, and every integration point before your agent goes live. We run hundreds of simulated conversations in both English and Spanish. We test voice quality and latency for phone agents. We verify appointment booking accuracy against your real calendar. We test escalation logic to make sure urgent calls reach your team instantly. We stress-test under load to ensure the agent handles multiple simultaneous conversations without degradation. We run adversarial tests — customers who are angry, confused, or trying to break the system. Nothing goes live until it handles every scenario we can throw at it.",
              },
              {
                step: "06",
                title: "Deployment, Monitoring & Continuous Optimization",
                body: "We deploy your agent and begin monitoring performance in real-time from day one. We track every conversation, every lead captured, every appointment booked, every escalation triggered. We analyze conversation logs weekly to identify patterns — questions the agent struggles with, points where customers drop off, opportunities to improve qualification accuracy. We expand the knowledge base, tune responses, and optimize conversion flows continuously. Your AI agent does not just maintain performance over time — it gets measurably better every week it is in production. Monthly performance reports show you exactly how many leads the agent captured, how many appointments it booked, and what your ROI looks like.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0080FE] text-lg font-bold text-white">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#EFF70A]">{item.title}</h3>
                  <p className="mt-3 text-zinc-300 leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 4: TYPES OF AI AGENTS WE BUILD
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">AI Agents We Build for Service Businesses</h2>
            <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
              Every agent type below can be deployed independently or combined into a unified multi-channel AI system. All agents support English and Spanish out of the box.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Website Chat Agents",
                items: [
                  "AI-powered chat widget embedded on your site",
                  "Trained on your services, pricing & service areas",
                  "Natural conversation — not canned responses",
                  "Lead capture with name, email, phone & details",
                  "Real-time availability checking & booking",
                  "Seamless handoff to live team when needed",
                ],
              },
              {
                title: "Voice AI Phone Agents",
                items: [
                  "Natural-sounding voice via Telnyx telephony",
                  "Answers calls 24/7 — no IVR menus",
                  "Handles FAQs, captures caller info",
                  "Books appointments during the call",
                  "Escalates urgent calls to your team in real-time",
                  "Every call logged, transcribed & stored in CRM",
                ],
              },
              {
                title: "Lead Qualification Bots",
                items: [
                  "Asks qualifying questions automatically",
                  "Scores leads by location, service, budget & timeline",
                  "Routes hot leads to your team instantly",
                  "Filters out unqualified inquiries",
                  "Captures all data in your CRM",
                  "Custom qualification criteria per service line",
                ],
              },
              {
                title: "Appointment Booking Agents",
                items: [
                  "Real-time calendar integration (Google, Outlook, Calendly)",
                  "Checks availability & offers time slots",
                  "Confirms bookings via SMS and email",
                  "Sends day-of reminders automatically",
                  "Handles rescheduling & cancellations",
                  "Reduces no-show rates by 35-50%",
                ],
              },
              {
                title: "FAQ Handling Agents",
                items: [
                  "Knowledge base built from your SEO content",
                  "Handles hundreds of unique questions",
                  "Answers pricing, availability & service area queries",
                  "Links to relevant pages on your website",
                  "Learns from new questions over time",
                  "Reduces support burden on your team by 60-80%",
                ],
              },
              {
                title: "Intake Automation Agents",
                items: [
                  "Guided intake forms via conversational AI",
                  "Collects customer details, photos & documents",
                  "Pre-populates CRM records automatically",
                  "Custom intake flows per service type",
                  "Bilingual intake in English & Spanish",
                  "Replaces paper forms & manual data entry",
                ],
              },
            ].map((category) => (
              <div key={category.title} className="rounded-2xl border border-zinc-700 bg-[#141414] p-6">
                <h3 className="text-lg font-semibold text-[#0080FE]">{category.title}</h3>
                <ul className="mt-4 space-y-2">
                  {category.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-zinc-300">
                      <span className="mt-0.5 text-green-400">&#10003;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 5: THE SEO + AI CONNECTION
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Your SEO Data Powers Your AI Agent</h2>
          <p className="mt-4 text-zinc-400">
            This is what makes our approach fundamentally different from every other AI agent developer. We do not build AI agents in a vacuum &mdash; we build them on the same structured data that drives your{" "}
            <Link href="/services/search-engine-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">search engine rankings</Link>.
          </p>
          <div className="mt-10 space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Structured Data Becomes Conversational Intelligence</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                When we build your{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO campaign</Link>, we create structured data for every service you offer, every{" "}
                <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">neighborhood you serve</Link>, every question your customers ask, and every competitive differentiator that sets you apart. This same structured data &mdash; your{" "}
                <Link href="/services/on-page-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">on-page content</Link>, your FAQ sections, your service descriptions, your location-specific pricing &mdash; feeds directly into your AI agent&apos;s knowledge base. When a customer asks your chatbot about emergency plumbing in{" "}
                <Link href="/plumber/park-slope" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Park Slope</Link>, the agent pulls from the same data that ranks your Park Slope plumbing page in Google. The data that drives traffic also drives conversions. Two systems, one data layer.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">SEO Drives Traffic. AI Agents Convert It.</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Think of it as a complete loop. Your{" "}
                <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local SEO</Link>{" "}
                and{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search optimization</Link>{" "}
                bring visitors to your site. Your{" "}
                <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">website</Link>{" "}
                makes a strong first impression. Your AI agent engages visitors instantly, answers their questions, qualifies them as leads, and books appointments &mdash; all before your competitor even checks their voicemail. The customer found you through SEO, engaged with content built by your{" "}
                <Link href="/services/content-marketing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">content marketing</Link>{" "}
                strategy, and was converted by an AI agent trained on that same content. Then your{" "}
                <Link href="/services/analytics-reporting" className="text-[#5CB8FF] hover:text-[#8DD0FF]">analytics</Link>{" "}
                track every step of that journey from first click to booked appointment. That is what a fully integrated digital system looks like.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">AI Conversations Improve Your SEO</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                The relationship works in reverse too. Every conversation your AI agent has with a real customer generates data &mdash; questions you did not expect, objections you had not addressed, services customers ask about that you had not highlighted. We feed this conversational intelligence back into your{" "}
                <Link href="/services/seo-strategy" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO strategy</Link>. New FAQ content. New long-tail keyword targets. New service pages. New{" "}
                <Link href="/services/ai-content-generation" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI-generated content</Link>{" "}
                ideas based on real customer conversations. Your AI agent is not just a conversion tool &mdash; it is a continuous market research engine that makes your SEO smarter over time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          MID-PAGE CTA
          ============================================================ */}
      <CTAGroup
        variant="mid"
        title="Your Competitors Are Answering Leads at 2 AM. Are You?"
        subtitle="Every after-hours inquiry that goes unanswered is a customer who called the next business on Google. AI agents make sure that never happens."
      />

      {/* ============================================================
          SECTION 6: SELENAS CASE STUDY
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Selenas: The AI Sales Assistant We Built and Use Every Day
          </h2>
          <div className="mt-8 space-y-6 text-zinc-300 leading-relaxed">
            <p>
              We do not just build AI agents for clients &mdash; we built one for ourselves. Selenas is the AI sales assistant embedded in{" "}
              <a href="https://homeservicesbusinesscrm.com" target="_blank" rel="noopener noreferrer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Full Loop CRM</a>, our proprietary customer relationship management platform. Selenas handles approximately 80 percent of receptionist duties for the businesses running on Full Loop &mdash; and it does it 24 hours a day, 7 days a week, in both English and Spanish.
            </p>
            <p>
              Here is what Selenas does in production, right now, every single day: answers inbound SMS messages within seconds. Qualifies leads by asking about service needed, location, timeline, and budget. Books appointments directly into the business&apos;s calendar. Sends confirmation messages and day-of reminders. Follows up with leads who went cold. Handles rescheduling requests. Answers FAQs about pricing, service areas, and availability. Escalates complex or urgent conversations to the business owner or team lead. All of this happens automatically, around the clock, without a human touching it.
            </p>
            <p>
              Selenas is not a prototype or a demo. It is a production system processing thousands of real conversations every month. The technology, the conversation design patterns, the integration architecture, the bilingual capabilities, the escalation logic &mdash; everything we learned building and running Selenas goes directly into the custom AI agents we build for clients. When we tell you our AI agents work, we are not speculating. We are showing you something we use ourselves, at scale, in production.
            </p>
            <p>
              The businesses using Selenas through Full Loop CRM report an average 40 percent increase in booked appointments, a 65 percent reduction in missed leads, and response times that dropped from hours to seconds. Those are not projections &mdash; those are measurements from real businesses running real AI agents that we built and maintain.
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { stat: "80%", label: "Receptionist Duties Handled by AI" },
              { stat: "24/7", label: "Bilingual Coverage (EN/ES)" },
              { stat: "40%", label: "Increase in Booked Appointments" },
              { stat: "< 5s", label: "Average Response Time" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-zinc-700 bg-[#141414] p-6 text-center">
                <p className="text-3xl font-extrabold text-[#0080FE]">{item.stat}</p>
                <p className="mt-2 text-sm text-zinc-400">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 7: TECHNOLOGY STACK
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Our AI Agent Technology Stack</h2>
          <p className="mt-4 text-zinc-400">
            We build on real infrastructure &mdash; not drag-and-drop chatbot platforms that break under load. Every component is selected for reliability, scalability, and security.
          </p>
          <div className="mt-10 space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Supabase &mdash; The Data Layer</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Supabase provides the backbone for every AI agent we build &mdash; enterprise-grade PostgreSQL for data storage, real-time subscriptions for live conversation updates, row-level security for data isolation between clients, and edge functions for serverless logic. Conversation histories, customer profiles, knowledge base content, lead scores, and appointment records all live in Supabase. It is open-source, SOC 2 compliant, and scales to millions of records without performance degradation. We chose Supabase over Firebase specifically because we need the relational power of PostgreSQL for complex AI agent workflows &mdash; join tables, full-text search, and JSONB columns for flexible schema storage.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Telnyx &mdash; Voice & SMS Infrastructure</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Telnyx powers all of our voice and SMS capabilities &mdash; phone number provisioning, voice call handling, SMS messaging, and programmable voice with AI integration. When our AI agent answers a phone call, Telnyx handles the telephony layer &mdash; carrier-grade voice quality, low latency, and global coverage. For SMS-based AI conversations, Telnyx provides reliable message delivery, long-code and short-code support, and compliance with carrier filtering requirements. We chose Telnyx over Twilio because of superior voice quality, lower latency, better pricing, and deeper support for programmable AI voice applications.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Next.js &mdash; The Web Interface</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Your AI chat widget runs on the same{" "}
                <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Next.js framework</Link>{" "}
                we use to build entire websites. Server-side rendering for instant load times. API routes for secure backend communication. React-based components for responsive, accessible chat interfaces. Edge deployment through Vercel for global low-latency performance. The chat widget adds zero measurable impact to your page speed &mdash; unlike third-party chat scripts that add 200-500ms to your load time and tank your{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Core Web Vitals</Link>.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Resend &mdash; Transactional Email</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Resend handles all transactional emails triggered by your AI agent &mdash; appointment confirmations, follow-up messages, lead notification emails to your team, and summary reports. Built by the same team that created React Email, Resend delivers messages reliably with beautiful, branded templates. No emails going to spam. No reliance on your personal email server. Professional, consistent communications every time your AI agent triggers an action.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Full Loop CRM &mdash; The Command Center</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                For businesses on{" "}
                <Link href="/services/fullloopcrm" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Full Loop CRM</Link>, AI agent integration is native and seamless. Conversations, leads, appointments, and customer profiles all live in a single platform. Selenas &mdash; our AI sales assistant &mdash; is built directly into Full Loop, and custom AI agents connect to the same data layer. For businesses on other CRMs, we build custom API integrations that provide the same level of connectivity.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">No WordPress. No Drag-and-Drop. No Compromises.</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                We do not use Chatfuel, ManyChat, Drift, Intercom, or any consumer-grade chatbot platform. Those tools are fine for basic FAQ bots. They are not sufficient for AI agents that need to qualify leads, book appointments, handle voice calls, process intake forms, and manage bilingual conversations across multiple channels simultaneously. Our agents are custom-built from the ground up on production infrastructure that scales. The same way we build websites on Next.js instead of WordPress because performance matters, we build AI agents on Supabase and Telnyx instead of chatbot builders because reliability matters.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 8: WHO THIS IS FOR
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Who Our AI Agents Are Built For</h2>
          <p className="mt-4 text-zinc-400">
            AI agents deliver the highest ROI for service businesses with high lead volumes, high customer values, and after-hours demand. If your customers contact you when your team is not available, you need an AI agent.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              { name: "Plumbers & Emergency Services", href: "/plumber" },
              { name: "Electricians", href: "/electrician" },
              { name: "HVAC Contractors", href: "/hvac" },
              { name: "Personal Injury Lawyers", href: "/personal-injury-lawyer" },
              { name: "Dentists & Dental Practices", href: "/dentist" },
              { name: "General Contractors", href: "/general-contractor" },
              { name: "Roofers", href: "/roofer" },
              { name: "House Cleaning Services", href: "/house-cleaner" },
              { name: "Therapists & Counselors", href: "/therapist" },
              { name: "Medical Practices & Clinics", href: "/dermatologist" },
              { name: "Landscapers & Tree Services", href: "/landscaper" },
              { name: "Painters & Decorators", href: "/painter" },
            ].map((industry) => (
              <Link
                key={industry.name}
                href={industry.href}
                className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-[#0A0A0A] p-4 transition-colors hover:border-[#0080FE] hover:bg-[#0A0A0A]/80"
              >
                <span className="text-[#0080FE]">&rarr;</span>
                <span className="text-sm font-medium text-zinc-300">{industry.name}</span>
              </Link>
            ))}
          </div>
          <p className="mt-8 text-zinc-400">
            We serve over{" "}
            <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">170 service categories</Link>{" "}
            across{" "}
            <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">318 neighborhoods</Link>{" "}
            in the NYC metro area. If your business handles inbound leads and your customers expect fast response times,{" "}
            <Link href="/contact" className="text-[#5CB8FF] hover:text-[#8DD0FF]">contact us</Link>{" "}
            about a custom AI agent.
          </p>
        </div>
      </section>

      {/* ============================================================
          SECTION 9: PRICING
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">AI Agent Development Pricing</h2>
            <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
              Transparent project-based pricing. Every dollar goes into development, training, integration, and deployment &mdash; not overhead. Monthly maintenance available for ongoing optimization.
            </p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {[
              {
                tier: "Starter Agent",
                price: "$7,500",
                period: " project",
                description: "A single-channel AI agent for businesses that need to capture leads and answer FAQs 24/7.",
                features: [
                  "Website chat agent OR SMS agent",
                  "Custom knowledge base (up to 100 topics)",
                  "Lead capture & qualification",
                  "FAQ handling from your SEO data",
                  "Bilingual support (English/Spanish)",
                  "CRM integration (1 platform)",
                  "30 days post-launch support",
                  "Performance dashboard & reporting",
                ],
                cta: "Get Started",
              },
              {
                tier: "Professional Agent",
                price: "$15,000",
                period: " project",
                description: "Multi-channel AI with chat, SMS, appointment booking, and deep CRM integration.",
                features: [
                  "Website chat + SMS agent",
                  "Appointment booking with calendar integration",
                  "Advanced lead qualification & scoring",
                  "Custom knowledge base (up to 500 topics)",
                  "Intake automation & form processing",
                  "CRM integration (unlimited platforms)",
                  "Follow-up & reminder sequences",
                  "60 days post-launch support",
                ],
                cta: "Get Started",
                featured: true,
              },
              {
                tier: "Enterprise Agent",
                price: "$30,000+",
                period: " project",
                description: "Full-stack AI system with voice agents, multi-channel coverage, and custom integrations.",
                features: [
                  "Everything in Professional, plus:",
                  "Voice AI phone agent (Telnyx)",
                  "Multi-channel deployment (chat, SMS, voice, email)",
                  "Custom knowledge base (unlimited topics)",
                  "Advanced escalation & call routing logic",
                  "Custom API integrations",
                  "Dedicated project manager",
                  "90 days post-launch support",
                ],
                cta: "Talk to Us",
              },
            ].map((plan) => (
              <div
                key={plan.tier}
                className={`rounded-2xl border p-8 ${
                  plan.featured
                    ? "border-[#0080FE] bg-[#0080FE]/5 ring-1 ring-[#0080FE]"
                    : "border-zinc-700 bg-[#141414]"
                }`}
              >
                {plan.featured && (
                  <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#0080FE]">Most Popular</p>
                )}
                <h3 className="text-2xl font-bold">{plan.tier}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-[#0080FE]">{plan.price}</span>
                  <span className="text-zinc-400">{plan.period}</span>
                </div>
                <p className="mt-3 text-sm text-zinc-400">{plan.description}</p>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-zinc-300">
                      <span className="mt-0.5 text-green-400">&#10003;</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/partnership-request-form"
                  className={`mt-8 block w-full rounded-lg py-3 text-center text-sm font-semibold ${
                    plan.featured
                      ? "bg-[#0080FE] text-white hover:bg-[#0070E0]"
                      : "border border-zinc-600 text-white hover:border-zinc-400 hover:bg-white/5"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-zinc-500">
            Monthly maintenance plans start at $1,500/month. Custom scoping available for complex projects.{" "}
            <Link href="/pricing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">View full pricing details</Link>{" "}
            or{" "}
            <Link href="/partnership-request-form" className="text-[#5CB8FF] hover:text-[#8DD0FF]">request a custom quote</Link>.
          </p>
        </div>
      </section>

      {/* ============================================================
          SECTION 10: COMMON MISTAKES
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            10 AI Agent Mistakes Businesses Make (and How We Avoid Them)
          </h2>
          <div className="mt-10 space-y-6">
            {[
              {
                mistake: "Using a generic chatbot builder with pre-written scripts",
                fix: "Generic chatbots break the moment a customer asks something outside the script. Our agents use large language models trained on your actual business data — they understand context, handle unexpected questions, and respond naturally. Every conversation feels human because it is powered by real AI, not decision trees.",
              },
              {
                mistake: "Not training the AI on real business data",
                fix: "Most chatbot implementations use generic knowledge that has nothing to do with your specific business. We build custom knowledge bases from your services, pricing, service areas, FAQs, and competitive differentiators. The agent knows your business as well as your best employee does.",
              },
              {
                mistake: "English-only agents in a bilingual market",
                fix: "NYC is one of the most linguistically diverse cities on earth. A significant percentage of your potential customers prefer to communicate in Spanish. Every AI agent we build handles English and Spanish with equal fluency — automatic language detection, no awkward translations, natural conversation in both languages.",
              },
              {
                mistake: "No escalation path to human agents",
                fix: "An AI agent that cannot hand off to a human when needed frustrates customers and loses leads. We build intelligent escalation logic into every agent — the system knows when to transfer to your team, how to do it seamlessly, and how to pass along full conversation context so your team never asks the customer to repeat themselves.",
              },
              {
                mistake: "Building on platforms that do not scale",
                fix: "Consumer chatbot platforms work fine for 10 conversations a day. They crash when you get 100. We build on Supabase and Telnyx — enterprise infrastructure that handles thousands of simultaneous conversations without degradation. Your AI agent works during your busiest hours, not just your quietest ones.",
              },
              {
                mistake: "Ignoring voice and SMS channels",
                fix: "Most chatbot vendors only offer website widgets. But your customers also call, text, and message on multiple platforms. Our agents deploy across every channel — website chat, SMS via Telnyx, voice phone calls, and messaging platforms. One AI agent, every channel, consistent experience.",
              },
              {
                mistake: "No connection between AI agents and SEO data",
                fix: "Other developers build AI agents that have no idea what your website says. We build agents powered by the same structured data that drives your search rankings. Your SEO content becomes your agent's knowledge base. Your agent's conversation data improves your SEO. It is a continuous improvement loop.",
              },
              {
                mistake: "Deploying and forgetting",
                fix: "An AI agent that is never updated becomes outdated and starts giving wrong answers. We analyze conversation logs weekly, expand the knowledge base based on real customer questions, tune response quality, and optimize conversion flows continuously. Your agent gets better every month, not worse.",
              },
              {
                mistake: "No analytics or ROI tracking",
                fix: "If you cannot measure what your AI agent is doing, you cannot justify the investment. We track every conversation, every lead captured, every appointment booked, every escalation. Monthly reports show you exactly how many leads the agent handled and what your return on investment looks like.",
              },
              {
                mistake: "Treating AI agents as a replacement for humans instead of a force multiplier",
                fix: "The goal is not to eliminate your team — it is to make them dramatically more effective. AI agents handle the repetitive, time-consuming 80 percent — FAQs, qualification, scheduling, intake — so your team focuses on the high-value 20 percent that actually requires human judgment, empathy, and expertise.",
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/20 text-sm font-bold text-red-400">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold text-white">{item.mistake}</h3>
                  <p className="mt-2 text-sm text-zinc-300 leading-relaxed">{item.fix}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 11: WHY CHOOSE US
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Why NYC Businesses Choose The NYC SEO for AI Agents</h2>
          <div className="mt-10 space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">We Built Selenas &mdash; We Know What Works</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Most AI agent developers are building their first production system when they build yours. We already built ours. Selenas, the AI sales assistant inside{" "}
                <a href="https://homeservicesbusinesscrm.com" target="_blank" rel="noopener noreferrer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Full Loop CRM</a>, processes thousands of real conversations every month. We know what conversation patterns convert. We know what escalation logic works. We know how to handle bilingual conversations at scale. We know what breaks under load and what does not. Every lesson we learned building and operating Selenas goes directly into the custom agents we build for you.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">20+ Years of Digital Experience</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Our parent company,{" "}
                <a href="https://www.consortiumnyc.com" target="_blank" rel="noopener noreferrer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Consortium NYC</a>, has over two decades of experience in digital marketing,{" "}
                <Link href="/services/branding" className="text-[#5CB8FF] hover:text-[#8DD0FF]">branding</Link>,{" "}
                <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">web development</Link>, and{" "}
                <Link href="/services/marketing-consulting" className="text-[#5CB8FF] hover:text-[#8DD0FF]">marketing consulting</Link>. We have seen every technology trend, every platform shift, and every new channel emerge. AI agents are not a fad for us &mdash; they are the natural evolution of 20 years of building systems that help businesses capture and convert leads. We understand not just the technology, but the business context that makes it valuable.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">SEO + AI: Two Systems, One Data Layer</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                No other AI agent developer in NYC connects AI agents to{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO data</Link> the way we do. Your search rankings and your AI agent are powered by the same structured content. This means your agent is always accurate, always up-to-date, and always aligned with what your website tells Google. The data that drives traffic also drives conversions. No one else does this because no one else is both an{" "}
                <Link href="/services/search-engine-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO agency</Link>{" "}
                and an AI development shop.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Real Infrastructure, Not Chatbot Toys</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                We build on Supabase, Telnyx, Next.js, and Vercel &mdash; the same infrastructure that powers production applications serving millions of users. We do not use ManyChat, Chatfuel, or any drag-and-drop chatbot builder. Our agents handle voice calls, SMS conversations, and web chat simultaneously without breaking a sweat. When your HVAC company gets slammed with calls during the first cold snap of the year, your AI agent does not go down. It scales.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Bilingual by Default, Not by Add-On</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                In NYC, bilingual is not optional &mdash; it is essential. Every AI agent we build handles English and Spanish natively. Not through translation APIs that produce awkward, stilted responses, but through models that understand both languages fluently and switch between them seamlessly based on what the customer writes or says. For service businesses serving diverse NYC communities, this is the difference between capturing a lead and losing one.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 12: RELATED SERVICES
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Related Services</h2>
          <p className="mt-4 text-zinc-400">
            AI agents work best as part of an integrated digital system. These services complement and amplify your AI investment.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              { name: "SEO Services", href: "/services/seo", desc: "The traffic engine that feeds leads into your AI agent." },
              { name: "Web Design & Development", href: "/services/web-design-development", desc: "Next.js websites where your AI chat widget lives." },
              { name: "AI Search Optimization (GEO)", href: "/services/ai-search-optimization", desc: "Get recommended by ChatGPT, Perplexity, and AI platforms." },
              { name: "Full Loop CRM", href: "/services/fullloopcrm", desc: "Our CRM with Selenas AI assistant built in." },
              { name: "Content Marketing", href: "/services/content-marketing", desc: "Content that feeds both your rankings and your AI knowledge base." },
              { name: "Automation & Programmatic SEO", href: "/services/automation", desc: "Systems that scale your SEO and AI capabilities." },
              { name: "Analytics & Reporting", href: "/services/analytics-reporting", desc: "Track every lead from first click to booked appointment." },
              { name: "Google Business Profile", href: "/services/google-business-profile", desc: "Dominate the local map pack and drive calls to your AI agent." },
            ].map((service) => (
              <Link
                key={service.name}
                href={service.href}
                className="rounded-xl border border-zinc-800 bg-[#141414] p-5 transition-colors hover:border-[#0080FE]"
              >
                <h3 className="font-semibold text-[#0080FE]">{service.name}</h3>
                <p className="mt-1 text-sm text-zinc-400">{service.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 13: RESULTS & TESTIMONIALS
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Real Results from Real AI Agents</h2>
          <p className="mt-4 text-zinc-400">
            We do not deal in hypothetical projections. Here is what happens when you deploy AI agents built on real infrastructure, trained on real data, and optimized for real conversions.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { stat: "65%", label: "Reduction in Missed Leads" },
              { stat: "47", label: "After-Hours Leads Captured (Month 1)" },
              { stat: "< 5s", label: "Average AI Response Time" },
              { stat: "60-90", label: "Days to Full ROI" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-zinc-700 bg-[#141414] p-6 text-center">
                <p className="text-3xl font-extrabold text-[#0080FE]">{item.stat}</p>
                <p className="mt-2 text-sm text-zinc-400">{item.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 rounded-2xl border border-zinc-700 bg-[#141414] p-8">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className="text-yellow-400 text-lg">&#9733;</span>
              ))}
            </div>
            <blockquote className="mt-4 text-zinc-300 leading-relaxed italic">
              &ldquo;They built us an AI chatbot and SMS agent that handles after-hours leads for our HVAC company. Within the first month, the agent captured 47 leads that we would have completely lost &mdash; calls and texts that came in after 6 PM. Three of those turned into $15K+ jobs. The agent paid for itself in the first week. The bilingual support is a game-changer in Queens &mdash; about a third of our leads come in Spanish now and the AI handles them flawlessly.&rdquo;
            </blockquote>
            <p className="mt-4 text-sm font-semibold text-white">&mdash; Michael T., HVAC Company Owner, Queens</p>
          </div>
          <div className="mt-8 rounded-2xl border border-zinc-700 bg-[#141414] p-8">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className="text-yellow-400 text-lg">&#9733;</span>
              ))}
            </div>
            <blockquote className="mt-4 text-zinc-300 leading-relaxed italic">
              &ldquo;We are a dental practice in the Bronx and we were losing patients to competitors who answered their phones faster. The voice AI agent they built for us answers every call instantly, books appointments into our system, and sends confirmation texts. Our no-show rate dropped by 40 percent because of the automated reminders. The intake automation saves our front desk staff at least two hours per day. Best investment we have made in five years.&rdquo;
            </blockquote>
            <p className="mt-4 text-sm font-semibold text-white">&mdash; Dr. Sandra L., Dental Practice, Bronx</p>
          </div>
        </div>
      </section>

      {/* ============================================================
          PRE-FAQ CTA
          ============================================================ */}
      <CTAGroup
        variant="preFaq"
        title="We Built Selenas. We Will Build Yours."
        subtitle="The same team that built the AI sales assistant inside Full Loop CRM builds custom agents for businesses like yours. Production-proven. Battle-tested. Revenue-generating."
      />

      {/* ============================================================
          SECTION 14: FAQ
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Frequently Asked Questions About AI Agent Development</h2>
          <p className="mt-4 text-zinc-400">
            Answers to the most common questions NYC service businesses ask about custom AI agents, chatbots, voice agents, and automation.
          </p>
          <div className="mt-10 space-y-6">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-zinc-700 bg-[#141414] p-6">
                <h3 className="text-lg font-semibold text-white">{faq.q}</h3>
                <p className="mt-3 text-sm text-zinc-300 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          FINAL CTA
          ============================================================ */}
      <CTAGroup
        variant="final"
        title="Ready to Stop Losing Leads After Hours?"
        subtitle="Tell us about your business and we will design an AI agent system that captures every lead, books every appointment, and answers every question — 24/7, in English and Spanish, across every channel your customers use."
      />
    </div>
  );
}
