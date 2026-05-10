// @ts-nocheck
import {
  JsonLd,
  serviceSchema,
  webPageSchema,
  breadcrumbSchema,
  faqSchema,
} from "@/app/site/consortium-nyc/_lib/schema";
import AIPageClient from "./AIPageClient";

const PHONE = "212.202.9220";

export const metadata = {
  title: "AI Automation for Local Businesses | AI Text Bots, Lead Follow-Up & CRM",
  description: `AI automation built for local businesses. Custom AI text bots, automated lead follow-up, review requests, appointment booking, and CRM — running 24/7 on real infrastructure. Not a plugin. Built by The NYC Marketing Company. Call ${PHONE}.`,
  alternates: { canonical: "https://www.consortiumnyc.com/ai" },
  keywords: [
    "ai automation local business",
    "ai text bot for business",
    "automated lead follow up",
    "ai chatbot nyc",
    "ai appointment booking",
    "review request automation",
    "ai customer service bot",
    "custom crm ai nyc",
    "ai sms bot business",
    "consortium nyc ai",
  ],
  openGraph: {
    title: "AI Automation for Local Businesses | The NYC Marketing Company",
    description: `Custom AI text bots, lead follow-up, review automation, and CRM. Built on real infrastructure. Call ${PHONE}.`,
    url: "https://www.consortiumnyc.com/ai",
    siteName: "The NYC Marketing Company",
    type: "website",
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "AI Automation for Local Businesses | The NYC Marketing Company",
    description: `AI text bots, automated lead follow-up, review requests, and CRM. Call ${PHONE}.`,
  },
};

const breadcrumbs = [
  { name: "Home", url: "https://www.consortiumnyc.com" },
  { name: "AI Automation", url: "https://www.consortiumnyc.com/ai" },
];

const faqs = [
  { question: "What kind of AI bots does The NYC Marketing Company build?", answer: `We build custom SMS-based AI text bots (like Selena), AI chatbots, automated lead follow-up systems, review request automation, and appointment scheduling bots. Everything is built on real infrastructure — Telnyx for SMS/voice, Supabase for data, and Claude AI for intelligence. No third-party plugins or widgets. Call ${PHONE} to learn more.` },
  { question: "How much does AI automation cost?", answer: `AI automation starts at $1,000/month after a $25,000 setup and development cost. Setup includes custom bot development, CRM integration, workflow design, testing, and deployment. The monthly fee covers hosting, AI usage, monitoring, and ongoing improvements. Call ${PHONE} for a custom quote.` },
  { question: "Can the AI bot integrate with my existing systems?", answer: "Yes. We build custom integrations with your CRM, scheduling system, phone system, and communication tools. Everything runs on open APIs — no vendor lock-in. If you already use a CRM like HubSpot or Salesforce, we integrate directly. If you want a custom CRM, we build that too." },
  { question: "What is Selena?", answer: "Selena is our AI customer service bot built on Claude AI, Telnyx SMS, and Supabase. She handles lead qualification, appointment booking, customer questions, review requests, and follow-up — all via text message. She works 24/7, responds in seconds, and never calls in sick. Selena was built in-house and runs on infrastructure we own." },
  { question: "How fast does the AI respond to leads?", answer: "Under 10 seconds. When a potential customer fills out a form, calls your number, or texts you, the AI responds immediately with a personalized message. Speed-to-lead is the #1 factor in conversion — businesses that respond within 5 minutes are 100x more likely to make contact than those that wait 30 minutes." },
  { question: "Is this just ChatGPT with a phone number?", answer: "No. Our AI bots are custom-built systems with business-specific training, CRM integration, appointment scheduling, and multi-step conversation flows. ChatGPT is a general assistant. Selena is a trained sales and customer service agent built specifically for your business, your industry, and your workflow." },
  { question: "What industries does AI automation work for?", answer: "Any service-based business that relies on phone calls, appointments, or lead follow-up. We've built AI systems for home services (plumbers, HVAC, electricians), medical practices, law firms, real estate agents, auto dealers, salons, and more. If customers contact you, AI can handle the first touch." },
  { question: "Do I own the AI bot and data?", answer: "Yes. You own the bot configuration, conversation data, customer information, and all integrations. No proprietary lock-in. If you leave, you take everything. We believe ownership is non-negotiable." },
  { question: "Can the AI book appointments on my calendar?", answer: "Yes. We integrate with Google Calendar, Calendly, Acuity, and custom scheduling systems. The AI checks your availability in real-time and books appointments directly — no human needed. Customers get instant confirmation via text." },
  { question: "What happens if the AI can't answer a question?", answer: "The bot escalates to a human. You set the escalation rules — it can text you, call you, email you, or route to a team member. The AI handles 80-90% of conversations autonomously. The rest get warm-transferred with full context so you never start from scratch." },
];

export default function AIPage() {
  const pageUrl = "https://www.consortiumnyc.com/ai";
  return (
    <>
      <JsonLd data={serviceSchema("AI Automation", "ai-automation-services-in-nyc", "Custom AI text bots, automated lead follow-up, review requests, appointment booking, and CRM for local businesses. Built on Telnyx, Supabase, and Claude AI.")} />
      <JsonLd data={webPageSchema("AI Automation for Local Businesses | The NYC Marketing Company", "Custom AI text bots, lead follow-up automation, review requests, and CRM.", pageUrl, breadcrumbs)} />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={faqSchema(faqs)} />
      <AIPageClient faqs={faqs} />
    </>
  );
}
