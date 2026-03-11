import type { Metadata } from "next";
import Link from "next/link";
import {
  JsonLd,
  webPageSchema,
  breadcrumbSchema,
  faqSchema,
  localBusinessSchema,
} from "@/lib/schema";

export const metadata: Metadata = {
  title: "FAQ | Full Loop CRM - Home Service CRM Questions Answered",
  description:
    "Frequently asked questions about Full Loop CRM pricing, features, territory exclusivity, ownership, Selenas AI, and getting started. $2,500/mo all-in.",
  keywords: [
    "full loop CRM FAQ",
    "home service CRM questions",
    "CRM pricing FAQ",
    "territory exclusivity CRM",
    "Selenas AI questions",
    "home service CRM cost",
  ],
  openGraph: {
    title: "FAQ | Full Loop CRM",
    description:
      "Get answers to 30+ questions about Full Loop CRM pricing, features, territory, and ownership.",
    url: "https://www.fullloopcrm.com/full-loop-crm-frequently-asked-questions",
    type: "website",
  },
  alternates: {
    canonical: "https://www.fullloopcrm.com/full-loop-crm-frequently-asked-questions",
  },
  twitter: {
    card: "summary_large_image",
    title: "FAQ | Full Loop CRM",
    description:
      "Get answers to 30+ questions about Full Loop CRM pricing, features, territory, and ownership.",
  },
};

const breadcrumbs = [
  { name: "Home", url: "https://www.fullloopcrm.com" },
  { name: "FAQ", url: "https://www.fullloopcrm.com/full-loop-crm-frequently-asked-questions" },
];

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqCategory {
  title: string;
  id: string;
  items: FaqItem[];
}

const faqCategories: FaqCategory[] = [
  {
    title: "Platform & Features",
    id: "platform",
    items: [
      {
        question: "What is Full Loop CRM?",
        answer:
          "Full Loop CRM is the first full-cycle CRM built specifically for home service businesses. It covers every stage of the customer lifecycle: organic lead generation, AI-powered sales automation, scheduling, GPS field operations, payments, review management, and automated retargeting — all in one platform with zero integrations needed.",
      },
      {
        question: "What does 'full loop' mean?",
        answer:
          "Full loop means we handle every step from the moment a lead discovers your business to the moment they rebook. Lead generation, first contact, quoting, scheduling, dispatch, payment collection, review requests, and re-engagement — it all happens inside one system.",
      },
      {
        question: "Do I need any other software?",
        answer:
          "No. Full Loop CRM replaces your website builder, CRM, scheduling tool, invoicing software, review platform, email marketing tool, and phone system. Everything is included in your monthly partnership.",
      },
      {
        question: "What channels does the CRM support?",
        answer:
          "Full Loop CRM manages inbound and outbound communication across phone calls (Telnyx), SMS, email (Resend), web chat, and Google Business Profile messaging — all from a single inbox.",
      },
      {
        question: "Does Full Loop CRM include a website?",
        answer:
          "Yes. Every partner gets a full SEO-optimized website built on Next.js with city and service pages, blog content, schema markup, and local SEO targeting. This site is designed to generate organic leads in your metro.",
      },
      {
        question: "Can I customize my CRM dashboard?",
        answer:
          "Yes. Your dashboard shows your pipeline, upcoming jobs, revenue, reviews, and lead sources. You can filter by date range, service type, and lead status.",
      },
      {
        question: "Does Full Loop CRM work on mobile?",
        answer:
          "Yes. The entire platform is mobile-responsive. Field techs can view schedules, update job status, collect payments, and request reviews from any device.",
      },
      {
        question: "How does the review management work?",
        answer:
          "After every completed job, Selenas AI automatically sends a review request via SMS and email. Positive reviews are directed to Google. Negative feedback is routed privately so you can resolve issues before they go public.",
      },
    ],
  },
  {
    title: "Pricing & Billing",
    id: "pricing",
    items: [
      {
        question: "How much does Full Loop CRM cost?",
        answer:
          "$2,500 per month, billed monthly. This includes your full SEO website, CRM platform, Selenas AI, lead generation, all automations, and ongoing support. No setup fees, no annual contracts.",
      },
      {
        question: "Are there any setup fees?",
        answer:
          "No. There are no setup fees, onboarding fees, or hidden costs. Your first month covers everything needed to get live: website build, CRM configuration, channel setup, and training.",
      },
      {
        question: "What are microsites and how much do they cost?",
        answer:
          "Microsites are standalone landing pages targeting specific services or neighborhoods (e.g., 'Carpet Cleaning in Astoria'). They cost $500 each and you own them outright — they are yours to keep even if you cancel.",
      },
      {
        question: "Is there a long-term contract?",
        answer:
          "No. Full Loop CRM is billed monthly with no long-term commitment. You can cancel at the end of any billing cycle.",
      },
      {
        question: "Do I pay extra for phone, SMS, or email?",
        answer:
          "Telnyx (phone/SMS) and Resend (email) usage is billed at cost through your own accounts. We help you set them up and you pay those providers directly — typically $20-50/month for most partners.",
      },
      {
        question: "Can I pause my subscription?",
        answer:
          "We do not offer pausing. If you cancel, you retain ownership of your Telnyx number, Resend account, business name, and any purchased microsites. You lose access to the CRM platform and the full SEO site.",
      },
    ],
  },
  {
    title: "Ownership & Transparency",
    id: "ownership",
    items: [
      {
        question: "What do I own vs. what does Full Loop own?",
        answer:
          "You own: your Telnyx phone number, your Resend email account, your business name, and any microsites you purchase ($500 each). Full Loop owns: the CRM platform, the full SEO website (until buyout), Google Business Profiles we create, all code, and all templates.",
      },
      {
        question: "Can I buy out my full SEO site?",
        answer:
          "Yes. The site buyout starts at $25,000 plus $10,000 per year of ongoing maintenance and updates. Once purchased, you own the site outright and can host it anywhere.",
      },
      {
        question: "What happens to my site if I cancel?",
        answer:
          "If you cancel without buying out the site, the full SEO website is taken down. You keep your microsites (if purchased), your Telnyx number, your Resend account, and your business name. Your CRM data can be exported before cancellation.",
      },
      {
        question: "Who owns the Google Business Profiles?",
        answer:
          "Google Business Profiles created as part of your Full Loop partnership are owned and managed by Full Loop. If you already have a GMB before joining, we can discuss integration options.",
      },
      {
        question: "Why doesn't Full Loop give away the site for free?",
        answer:
          "Building a high-performance SEO site with 50+ pages, schema markup, local targeting, and ongoing content takes significant investment. The monthly fee covers continuous optimization, content updates, and technical maintenance. The buyout option exists for partners who want full ownership.",
      },
    ],
  },
  {
    title: "Territory & Exclusivity",
    id: "territory",
    items: [
      {
        question: "What does exclusive territory mean?",
        answer:
          "We accept only one partner per trade per metro area. If you are the cleaning services partner in Austin, TX, no other cleaning company can join Full Loop in that metro. This eliminates internal competition and maximizes your ROI.",
      },
      {
        question: "How are metro areas defined?",
        answer:
          "Metro areas follow standard metropolitan statistical areas (MSAs). Major cities and their surrounding suburbs are grouped together. During onboarding, we confirm the exact boundaries of your territory.",
      },
      {
        question: "What if my territory is already taken?",
        answer:
          "If your trade is claimed in your metro, we will add you to a waitlist and notify you if the territory opens up. You can also apply for a different metro or a different trade.",
      },
      {
        question: "Can I expand to multiple metros?",
        answer:
          "Yes. Each additional metro is a separate partnership at $2,500/month. Multi-metro partners get priority support and shared reporting across territories.",
      },
    ],
  },
  {
    title: "Getting Started",
    id: "getting-started",
    items: [
      {
        question: "How do I apply?",
        answer:
          "Submit a partnership request through our website. Include your trade, target metro, and basic business information. We review applications within 48 hours and respond with territory availability.",
      },
      {
        question: "How long does onboarding take?",
        answer:
          "Most partners are fully live within 2-3 weeks. This includes website build, CRM setup, channel configuration, and training. Complex setups with multiple services may take slightly longer.",
      },
      {
        question: "Do I need to be tech-savvy?",
        answer:
          "No. Full Loop CRM is designed for home service professionals, not tech experts. We handle all the technical setup. Your daily workflow is simple: check your dashboard, confirm jobs, and let Selenas handle the rest.",
      },
      {
        question: "What information do I need to get started?",
        answer:
          "Your business name, trade/service type, target metro area, a list of your services with pricing, and photos of your work. We handle everything else including domain setup, content creation, and CRM configuration.",
      },
    ],
  },
  {
    title: "Selenas AI",
    id: "selenas",
    items: [
      {
        question: "What is Selenas AI?",
        answer:
          "Selenas is Full Loop's AI assistant that handles your front office. She answers calls, responds to texts, qualifies leads, books estimates, sends quotes, follows up on open proposals, requests reviews after jobs, and re-engages past customers — 24/7 with no missed calls.",
      },
      {
        question: "Does Selenas replace my receptionist?",
        answer:
          "For most home service businesses, yes. Selenas handles inbound calls, lead qualification, appointment scheduling, follow-ups, and review requests. You focus on the field work while she manages the phone and inbox.",
      },
      {
        question: "Can Selenas handle Spanish-speaking callers?",
        answer:
          "Yes. Selenas supports both English and Spanish communication across phone, SMS, and email channels.",
      },
      {
        question: "What if a caller needs to speak to a real person?",
        answer:
          "Selenas can transfer calls to you or your team when needed. You set the rules for when live transfers happen — emergency calls, high-value leads, existing customers, or any criteria you define.",
      },
    ],
  },
  {
    title: "Technical",
    id: "technical",
    items: [
      {
        question: "What technology stack does Full Loop use?",
        answer:
          "Full Loop CRM is built on Next.js, React, TypeScript, Supabase (PostgreSQL), and Tailwind CSS. Websites are deployed on Vercel with edge caching. Phone/SMS runs on Telnyx. Email runs on Resend. Everything is modern, fast, and secure.",
      },
      {
        question: "Is my data secure?",
        answer:
          "Yes. All data is stored in Supabase with row-level security, encrypted at rest and in transit. We use HTTPS everywhere, and your CRM data is isolated from other partners. You can export your data at any time.",
      },
      {
        question: "What is the uptime guarantee?",
        answer:
          "Full Loop CRM targets 99.9% uptime. Our infrastructure runs on Vercel and Supabase, both backed by enterprise-grade cloud providers with redundancy across multiple regions.",
      },
      {
        question: "Can I integrate Full Loop with other tools?",
        answer:
          "Full Loop is designed to be all-in-one, so most partners do not need integrations. However, we offer webhook support and can discuss custom integrations for partners with specific requirements.",
      },
    ],
  },
];

// Flatten all FAQs for schema markup
const allFaqs = faqCategories.flatMap((cat) => cat.items);

export default function FAQPage() {
  return (
    <>
      <JsonLd
        data={webPageSchema(
          "FAQ | Full Loop CRM",
          "Frequently asked questions about Full Loop CRM pricing, features, territory exclusivity, ownership, and Selenas AI.",
          "https://www.fullloopcrm.com/full-loop-crm-frequently-asked-questions",
          breadcrumbs
        )}
      />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={faqSchema(allFaqs)} />
      <JsonLd data={localBusinessSchema("United States", "Country")} />

      {/* Hero */}
      <section className="bg-slate-900 py-24 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white font-heading mb-6">
            Frequently Asked{" "}
            <span className="text-teal-400">Questions</span>
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Everything you need to know about Full Loop CRM — pricing, features,
            territory, ownership, and more.
          </p>
        </div>
      </section>

      {/* Category Nav */}
      <section className="bg-white border-b border-slate-200 py-4 px-6 sticky top-0 z-10">
        <div className="mx-auto max-w-4xl flex flex-wrap gap-3 justify-center">
          {faqCategories.map((cat) => (
            <a
              key={cat.id}
              href={`#${cat.id}`}
              className="text-sm text-teal-600 underline underline-offset-2 hover:text-teal-700 font-cta"
            >
              {cat.title}
            </a>
          ))}
        </div>
      </section>

      {/* FAQ Categories */}
      <section className="py-16 px-6 bg-white">
        <div className="mx-auto max-w-3xl space-y-16">
          {faqCategories.map((category) => (
            <div key={category.id} id={category.id} className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-slate-900 font-heading mb-6 pb-3 border-b-2 border-teal-600">
                {category.title}
              </h2>
              <div className="space-y-3">
                {category.items.map((faq) => (
                  <details
                    key={faq.question}
                    className="group border border-slate-200 rounded-lg overflow-hidden"
                  >
                    <summary className="cursor-pointer select-none px-6 py-4 text-left font-semibold text-slate-900 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4">
                      <span>{faq.question}</span>
                      <span
                        className="text-teal-600 text-xl font-mono flex-shrink-0 transition-transform group-open:rotate-45"
                        aria-hidden="true"
                      >
                        +
                      </span>
                    </summary>
                    <div className="px-6 pb-5 pt-1 text-slate-600 leading-relaxed">
                      {faq.answer}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Still have questions */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-slate-900 font-heading mb-3">
            Still Have Questions?
          </h2>
          <p className="text-slate-600 mb-6">
            We are happy to walk you through the platform. Text, call, or submit a
            partnership request and we will get back to you within 24 hours.
          </p>
          <p className="text-slate-700 font-mono text-lg mb-8">
            <a
              href="tel:+12122029220"
              className="text-teal-600 underline underline-offset-2 hover:text-teal-700"
            >
              (212) 202-9220
            </a>
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-slate-900 py-20 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white font-heading mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-slate-300 mb-8 text-lg">
            One partner per trade per metro. Lock in your exclusive territory today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/crm-partnership-request-form"
              className="inline-block bg-yellow-300 text-slate-900 font-cta px-8 py-3 rounded-lg hover:bg-yellow-400 transition-colors"
            >
              Request Partnership
            </Link>
            <a
              href="tel:+12122029220"
              className="text-teal-400 underline underline-offset-2 hover:text-teal-300 font-cta"
            >
              Call (212) 202-9220
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
