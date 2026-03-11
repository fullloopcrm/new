import type { Metadata } from "next";
import Link from "next/link";
import {
  JsonLd,
  webPageSchema,
  breadcrumbSchema,
  faqSchema,
  articleSchema,
  itemListSchema,
  softwareApplicationSchema,
} from "@/lib/schema";

const breadcrumbs = [
  { name: "Home", url: "https://www.fullloopcrm.com" },
  { name: "CRM 101", url: "https://www.fullloopcrm.com/full-loop-crm-101-educational-tips" },
];

const crm101Faqs = [
  {
    question: "Do I actually need a CRM for my home service business?",
    answer:
      "If you have more than 10 customers and you're still using spreadsheets, sticky notes, or your memory — yes. A CRM stops you from losing leads, forgetting follow-ups, and leaving money on the table. If you're a one-person operation doing 5 jobs a week, a free spreadsheet might work. Once you're past that, you're bleeding revenue without one.",
  },
  {
    question: "What's the difference between a CRM and scheduling software?",
    answer:
      "Scheduling software (Jobber, Housecall Pro) manages your calendar and invoices — stages 3 through 5 of a business. A CRM manages the full customer lifecycle: finding leads, converting them, scheduling, performing, collecting payment, earning reviews, and retargeting for repeat business. Scheduling software is a feature inside a CRM. It is not a CRM.",
  },
  {
    question: "Which CRM is best for small home service businesses?",
    answer:
      "It depends on your size and needs. If you just need scheduling, Jobber or Housecall Pro work fine. If you want marketing automation, look at GoHighLevel or ServiceTitan. If you want lead generation, AI sales, and the full cycle handled for you, Full Loop CRM is built specifically for that. There's no universal 'best' — only what fits your stage of growth.",
  },
  {
    question: "Is a $2,500/month CRM worth it?",
    answer:
      "Only if it replaces $2,500+ in other tools and generates enough revenue to justify itself. If a CRM generates 20 new leads per month and you close half at $300 each, that's $3,000 in new revenue — before counting the time you save. If it's just a glorified calendar, it's not worth $50/month.",
  },
  {
    question: "Can I just use HubSpot or Salesforce for my service business?",
    answer:
      "You can, but they weren't built for field service. You'll spend months customizing them, pay for add-ons, and still won't have scheduling, dispatch, GPS tracking, or automated review requests. Enterprise CRMs are built for sales teams at desks, not crews in vans.",
  },
  {
    question: "What should I look for when comparing CRMs?",
    answer:
      "Ask five questions: Does it generate leads or just manage them? Does it automate follow-ups or just log them? Does it handle payments? Does it request reviews automatically? Does it retarget past customers? If the answer to most of these is no, you're looking at a database with a calendar — not a CRM.",
  },
];

/* ── 101 Tips organized by category ── */

type TipCategory = {
  id: string;
  title: string;
  subtitle: string;
  color: { bg: string; text: string; border: string; badge: string };
};

const categories: TipCategory[] = [
  { id: "basics", title: "CRM Basics", subtitle: "What a CRM actually is (and isn't)", color: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200", badge: "bg-slate-700" } },
  { id: "need", title: "Do You Even Need One?", subtitle: "Honest signs you do — and signs you don't", color: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", badge: "bg-emerald-600" } },
  { id: "comparing", title: "Comparing CRMs", subtitle: "What to look for and what to ignore", color: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", badge: "bg-blue-600" } },
  { id: "leads", title: "Lead Generation", subtitle: "Where customers come from and what that costs", color: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", badge: "bg-violet-600" } },
  { id: "sales", title: "Sales & Follow-Up", subtitle: "Why speed wins and most businesses lose", color: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", badge: "bg-amber-600" } },
  { id: "ops", title: "Scheduling & Field Ops", subtitle: "The stuff that actually runs your day", color: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", badge: "bg-rose-600" } },
  { id: "money", title: "Payments & Revenue", subtitle: "Getting paid without chasing people", color: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", badge: "bg-orange-600" } },
  { id: "reviews", title: "Reviews & Reputation", subtitle: "The growth engine most businesses ignore", color: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-300", badge: "bg-yellow-600" } },
  { id: "retention", title: "Retention & Rebooking", subtitle: "The cheapest revenue you'll ever earn", color: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200", badge: "bg-teal-600" } },
  { id: "truth", title: "Hard Truths", subtitle: "What CRM vendors won't tell you", color: { bg: "bg-slate-900", text: "text-white", border: "border-slate-700", badge: "bg-red-600" } },
];

/* Contextual internal links shown after each category section */
const categoryCTAs: Record<string, { text: string; href: string; label: string }> = {
  basics: { text: "See how a full-cycle CRM actually works for service businesses", href: "/full-loop-crm-service-features", label: "Explore Full Loop CRM Features" },
  need: { text: "Find out which industries benefit most from a CRM", href: "/full-loop-crm-service-business-industries", label: "Browse 50+ Industries We Serve" },
  comparing: { text: "Ready to see what makes Full Loop different?", href: "/why-you-should-choose-full-loop-crm-for-your-business", label: "Why Full Loop CRM" },
  leads: { text: "See how Full Loop generates exclusive leads with multi-domain SEO", href: "/full-loop-crm-service-features", label: "See the Lead Generation Engine" },
  sales: { text: "Questions about AI-powered sales and how it works?", href: "/full-loop-crm-frequently-asked-questions", label: "Read the FAQ" },
  ops: { text: "See scheduling, dispatch, and GPS tracking in action", href: "/full-loop-crm-service-features", label: "View Scheduling & Field Ops Features" },
  money: { text: "See how pricing and payments work inside Full Loop", href: "/full-loop-crm-pricing", label: "View Pricing Plans" },
  reviews: { text: "See how automated review requests work inside the platform", href: "/full-loop-crm-service-features", label: "Explore Review Automation" },
  retention: { text: "Want to see the full customer lifecycle in one platform?", href: "/full-loop-crm-service-features", label: "See the Full Loop in Action" },
  truth: { text: "No pressure — just explore what we built and decide for yourself", href: "/crm-partnership-request-form", label: "Apply for Your Territory" },
};

const tips: { num: number; cat: string; text: string }[] = [
  // ── CRM BASICS (1-10) ──
  { num: 1, cat: "basics", text: "CRM stands for Customer Relationship Management. It's software that tracks every interaction between your business and your customers — from first contact through their tenth rebooking." },
  { num: 2, cat: "basics", text: "A CRM is not a calendar. It's not a spreadsheet. It's not your email inbox. If you're using any of those as your \"CRM,\" you don't have one." },
  { num: 3, cat: "basics", text: "The entire point of a CRM is to make sure no customer falls through the cracks. Every lead gets a response. Every job gets followed up. Every past customer gets contacted again." },
  { num: 4, cat: "basics", text: "There are two types of CRMs: ones that manage data and ones that drive revenue. A database with a nice UI is not the same as a system that generates leads and automates sales." },
  { num: 5, cat: "basics", text: "Most CRMs were built for B2B sales teams sitting at desks making phone calls. If you run a field service business, 80% of those features are irrelevant to you." },
  { num: 6, cat: "basics", text: "A home service CRM should handle the full cycle: lead capture, quoting, scheduling, dispatch, job tracking, invoicing, payment, reviews, and rebooking. Anything less is a partial solution." },
  { num: 7, cat: "basics", text: "The CRM market is worth $80 billion. That means there are thousands of options. Most of them are not built for you. Don't get distracted by features you'll never use." },
  { num: 8, cat: "basics", text: "Your CRM should be your single source of truth. If your customer data lives in 5 different apps, you don't have a system — you have a mess." },
  { num: 9, cat: "basics", text: "The best CRM is the one your team actually uses. A $500/month system that nobody opens is worse than a free spreadsheet that gets updated daily." },
  { num: 10, cat: "basics", text: "If your CRM requires a full-time admin to manage it, it's too complex for your business. A good CRM works for you, not the other way around." },

  // ── DO YOU EVEN NEED ONE? (11-20) ──
  { num: 11, cat: "need", text: "If you're a solo operator doing fewer than 5 jobs a week and you remember every customer by name — you probably don't need a CRM yet. A notebook works." },
  { num: 12, cat: "need", text: "The moment you forget to follow up with a lead, miss a callback, or double-book a crew — that's the moment you needed a CRM." },
  { num: 13, cat: "need", text: "If you've ever lost a customer because you took too long to respond, a CRM would have prevented that. Speed-to-lead is the #1 factor in winning service jobs." },
  { num: 14, cat: "need", text: "If your business does more than $100K/year in revenue, the cost of NOT having a CRM is almost certainly higher than the cost of having one." },
  { num: 15, cat: "need", text: "If you have employees or subcontractors, you need a CRM. You can't manage a team's schedule, customer interactions, and job assignments from your phone's text messages." },
  { num: 16, cat: "need", text: "If you're spending money on ads but don't know which leads converted into paying customers, you need a CRM. Otherwise you're burning cash blind." },
  { num: 17, cat: "need", text: "If your repeat customers only come back when they remember to call you — instead of when you proactively reach out — you're leaving money on the table." },
  { num: 18, cat: "need", text: "You don't need a CRM to start a business. You need a CRM to grow one. There's a difference." },
  { num: 19, cat: "need", text: "If you're already drowning in work and booked 3 weeks out, you might think you don't need a CRM. But what happens when the slow season hits? A CRM keeps the pipeline full year-round." },
  { num: 20, cat: "need", text: "The biggest sign you need a CRM: you're working IN the business so hard that you have no time to work ON it. A CRM automates the stuff that eats your day." },

  // ── COMPARING CRMs (21-35) ──
  { num: 21, cat: "comparing", text: "Jobber is solid for scheduling and invoicing. It's popular, affordable, and does what it says. But it doesn't generate leads, automate sales, or request reviews. It's a field ops tool, not a full CRM." },
  { num: 22, cat: "comparing", text: "Housecall Pro is Jobber's main competitor. Similar features, similar price. Good for small to mid-size teams who need scheduling, estimates, and basic invoicing." },
  { num: 23, cat: "comparing", text: "ServiceTitan is the heavyweight. Built for large HVAC, plumbing, and electrical companies. Powerful but expensive ($300+/month per tech). Overkill if you have fewer than 10 employees." },
  { num: 24, cat: "comparing", text: "GoHighLevel is a marketing-first platform. Great for automations, funnels, and follow-up sequences. But it has no native scheduling, dispatch, or GPS tracking. You'll need to bolt those on." },
  { num: 25, cat: "comparing", text: "HubSpot is free to start but gets expensive fast. It's built for SaaS and B2B sales. You can make it work for a service business, but you'll be fighting the product the whole time." },
  { num: 26, cat: "comparing", text: "Salesforce is enterprise software. If you're running a 3-person cleaning crew, Salesforce is like renting a warehouse to store a lunchbox. Don't do it." },
  { num: 27, cat: "comparing", text: "When comparing CRMs, don't look at feature lists. Look at what the software actually does without you touching it. Automation beats features every time." },
  { num: 28, cat: "comparing", text: "Ask any CRM vendor: \"Does your platform generate leads, or just manage them?\" If the answer is manage, you still need to solve your biggest problem — finding customers — somewhere else." },
  { num: 29, cat: "comparing", text: "Free trials are marketing. Every CRM looks good in a 14-day trial when you have 3 test contacts. The real test is 6 months in with 500 customers and 4 employees." },
  { num: 30, cat: "comparing", text: "Beware of per-user pricing. A CRM that costs $50/user/month sounds cheap until you have 8 employees and you're paying $400/month for a calendar." },
  { num: 31, cat: "comparing", text: "Integration count is a vanity metric. \"Connects with 5,000 apps\" means nothing if you need 6 of them to do what one good CRM does natively." },
  { num: 32, cat: "comparing", text: "The hidden cost of cheap CRMs is your time. If you spend 2 hours a day doing things the CRM should automate, that's 500+ hours a year. What's your hourly rate?" },
  { num: 33, cat: "comparing", text: "Full Loop CRM is the only platform that combines lead generation, AI-powered sales, scheduling, GPS field ops, payments, reviews, and retargeting in one system. That's the honest differentiator." },
  { num: 34, cat: "comparing", text: "No CRM is perfect. The question is: which imperfect tool solves the most problems for your specific business at your specific stage?" },
  { num: 35, cat: "comparing", text: "If a CRM salesperson can't explain their product in 60 seconds without using buzzwords, the product is either too complex or the salesperson doesn't understand your business." },

  // ── LEAD GENERATION (36-48) ──
  { num: 36, cat: "leads", text: "Leads are the lifeblood of every service business. Without new customers coming in, your business dies. It's that simple." },
  { num: 37, cat: "leads", text: "There are two kinds of leads: paid and organic. Paid leads (Google Ads, Thumbtack, Angi) cost money every time. Organic leads (SEO, referrals) cost effort upfront and pay forever." },
  { num: 38, cat: "leads", text: "The average home service lead from Google Ads costs $30–$150. At a 20% close rate, you're paying $150–$750 per actual customer. Know your numbers." },
  { num: 39, cat: "leads", text: "Thumbtack and Angi sell the same lead to 3–5 businesses. You're bidding against competitors for the same customer. That model benefits the platform, not you." },
  { num: 40, cat: "leads", text: "SEO takes 3–6 months to kick in but compounds over time. Month 1 gets you nothing. Month 12 gets you consistent free leads. Most businesses quit at month 2." },
  { num: 41, cat: "leads", text: "Your Google Business Profile is free and is the #1 driver of local service leads. If you haven't fully optimized it with photos, services, and posts, stop reading this and go do it now." },
  { num: 42, cat: "leads", text: "Referrals from happy customers are the highest-converting leads in any business. The problem is most businesses never systematically ask for referrals. They just hope." },
  { num: 43, cat: "leads", text: "A multi-domain SEO strategy — where you own multiple websites targeting different keywords in your area — is one of the most powerful lead generation strategies in home services. But it takes real investment to build." },
  { num: 44, cat: "leads", text: "Social media generates almost zero direct leads for home service businesses. It builds brand awareness, which matters — but if you need leads today, social isn't the answer." },
  { num: 45, cat: "leads", text: "Door hangers, flyers, and yard signs still work in local service. They're not sexy. They don't scale. But they cost $0.10 each and your neighbors see them." },
  { num: 46, cat: "leads", text: "The most expensive lead is the one you paid for and never followed up on. 48% of businesses never respond to a web lead. That's not a lead problem — it's a follow-up problem." },
  { num: 47, cat: "leads", text: "Exclusive leads — where only your business receives the customer's info — close at 3–5x the rate of shared leads. If you're buying shared leads, you're in a race to the bottom." },
  { num: 48, cat: "leads", text: "Your CRM should tell you exactly where each lead came from, what it cost, and whether it converted. If you can't see that data, you can't make smart marketing decisions." },

  // ── SALES & FOLLOW-UP (49-60) ──
  { num: 49, cat: "sales", text: "The business that responds first wins 78% of the time. Not the cheapest. Not the most experienced. The fastest. That's been proven across every industry." },
  { num: 50, cat: "sales", text: "The average home service business takes 4+ hours to respond to a new lead. By that time, the customer has already booked with someone else." },
  { num: 51, cat: "sales", text: "Automated text responses are not impersonal — they're expected. Customers don't care if a human or a bot replied. They care that someone replied." },
  { num: 52, cat: "sales", text: "If you're still quoting by phone only, you're losing every lead that comes in after 5 PM or on weekends. That's 40% of all inquiries." },
  { num: 53, cat: "sales", text: "Follow-up is where most businesses fail. 80% of sales require 5+ touchpoints. Most service businesses stop after 1. The second follow-up alone increases your close rate by 25%." },
  { num: 54, cat: "sales", text: "AI-powered sales assistants can qualify leads, answer common questions, provide quotes, and book appointments — 24/7. The technology exists today. It's not science fiction." },
  { num: 55, cat: "sales", text: "A quote without a follow-up is a suggestion. If you send an estimate and never check back, you're training customers to think you don't need their business." },
  { num: 56, cat: "sales", text: "Text message open rates are 98%. Email open rates are 20%. If your CRM only does email follow-ups, you're missing the channel your customers actually read." },
  { num: 57, cat: "sales", text: "Bilingual sales capability isn't a \"nice to have\" in most U.S. metros. If 30% of your market speaks Spanish and your follow-up is English-only, you're leaving 30% of your revenue behind." },
  { num: 58, cat: "sales", text: "The cost of slow follow-up isn't just the one lost lead. That customer tells friends, leaves no review, and never comes back. One lost lead costs you an entire referral chain." },
  { num: 59, cat: "sales", text: "Your close rate matters more than your lead volume. 50 leads at a 40% close rate beats 200 leads at a 10% close rate — and costs less." },
  { num: 60, cat: "sales", text: "The best sales tool isn't a script. It's a system that ensures every lead gets responded to, every quote gets followed up, and no one gets forgotten. That's what a CRM does." },

  // ── SCHEDULING & FIELD OPS (61-72) ──
  { num: 61, cat: "ops", text: "If your scheduling process involves group texts, phone calls, and \"checking the book,\" you're wasting 5–10 hours per week on something software handles in seconds." },
  { num: 62, cat: "ops", text: "Double bookings kill trust. When a customer takes time off work to be home for your crew and no one shows up, that relationship is over. A CRM prevents double bookings." },
  { num: 63, cat: "ops", text: "Route optimization saves fuel, time, and employee frustration. Sending a crew from Brooklyn to the Bronx to Manhattan when all three jobs could run north-to-south is money burned." },
  { num: 64, cat: "ops", text: "Automated appointment reminders reduce no-shows by 30–50%. A text the night before and the morning of costs you nothing and saves you a wasted trip." },
  { num: 65, cat: "ops", text: "Your field team needs a mobile-first tool. Not a desktop app they awkwardly use on their phone. If the crew can't easily check their schedule, clock in, and see job details on mobile, the tool fails." },
  { num: 66, cat: "ops", text: "GPS check-in/check-out solves three problems at once: time theft, proof of service, and customer notification. The crew clocks in at the address, the customer gets notified, and you get honest timesheets." },
  { num: 67, cat: "ops", text: "If your employees speak Spanish and your CRM is English-only, you've created a barrier. A bilingual team portal isn't a luxury — it's basic operational respect." },
  { num: 68, cat: "ops", text: "Recurring job scheduling should be automatic. If a customer books biweekly cleaning, those 26 appointments should populate the calendar without you touching it." },
  { num: 69, cat: "ops", text: "Customer self-service (rescheduling, canceling, adding notes) reduces your phone calls by 30%. A client portal that lets customers manage their own bookings saves you hours." },
  { num: 70, cat: "ops", text: "Real-time visibility into your field operations changes how you run your business. Knowing where every crew is, which jobs are running late, and who's finishing early — that's control." },
  { num: 71, cat: "ops", text: "Job notes and completion photos stored in the CRM protect you. Disputes happen. \"The crew never came\" is hard to argue when you have GPS-stamped check-in times and before/after photos." },
  { num: 72, cat: "ops", text: "The difference between a $200K business and a $1M business usually isn't more leads. It's more efficient operations. Tighter scheduling, less windshield time, fewer missed appointments." },

  // ── PAYMENTS & REVENUE (73-80) ──
  { num: 73, cat: "money", text: "The faster you collect payment, the healthier your cash flow. Auto-charging a card on file when the crew checks out means same-day revenue. No invoicing. No chasing." },
  { num: 74, cat: "money", text: "Outstanding invoices over 30 days old have a 50% chance of never being collected. Every day you wait to follow up on unpaid invoices costs you money." },
  { num: 75, cat: "money", text: "Automated payment reminders aren't awkward — they're professional. The customer expects it. Banks do it. Utilities do it. You should too." },
  { num: 76, cat: "money", text: "If your CRM doesn't handle payments natively, you're using Stripe, Square, Venmo, Zelle, and cash — and none of that data connects to your customer records. That's a mess." },
  { num: 77, cat: "money", text: "Tipping through a digital payment portal generates 15–25% more tips than cash. Customers are more generous when they tap a button than when they count bills." },
  { num: 78, cat: "money", text: "Recurring billing for service agreements (monthly pest control, weekly cleaning) should be automatic. If you're manually invoicing repeat customers, you're doing it wrong." },
  { num: 79, cat: "money", text: "Your CRM should show you exactly how much revenue each customer has generated over their lifetime. Customer lifetime value is the most important number in your business." },
  { num: 80, cat: "money", text: "Separate accounting software and CRM data means manual reconciliation. The less data entry between systems, the fewer errors and the more time you save." },

  // ── REVIEWS & REPUTATION (81-89) ──
  { num: 81, cat: "reviews", text: "93% of customers read online reviews before hiring a service business. If you have 8 reviews and your competitor has 300, you lose. Every time." },
  { num: 82, cat: "reviews", text: "The best time to ask for a review is 1–2 hours after job completion. The house is clean. The lawn looks great. The gratitude is fresh. Wait a week and they've already forgotten." },
  { num: 83, cat: "reviews", text: "Manual review requests don't scale. You'll do it for the first 10 customers, then forget. Automated review requests go out after every single job. Consistency wins." },
  { num: 84, cat: "reviews", text: "Make the review process frictionless. One tap to a Google review form. No app downloads. No account creation. The more steps you add, the fewer reviews you get." },
  { num: 85, cat: "reviews", text: "Google reviews directly impact your local search ranking. More reviews with higher ratings = higher placement in Google Maps results = more organic leads. It's a compounding loop." },
  { num: 86, cat: "reviews", text: "Responding to every review — positive and negative — shows future customers that you care. A thoughtful response to a 3-star review can be more powerful than a 5-star review with no response." },
  { num: 87, cat: "reviews", text: "Don't fear negative reviews. Fear having no reviews. A business with 200 reviews and a 4.7 average is more trusted than a business with 5 reviews and a 5.0 average." },
  { num: 88, cat: "reviews", text: "Your CRM should track which customers have been asked for reviews, who completed them, and your overall review velocity. If you can't measure it, you can't improve it." },
  { num: 89, cat: "reviews", text: "Reviews are the bridge between doing great work and getting credit for it. You can be the best plumber in your city, but if no one says so online, you're invisible." },

  // ── RETENTION & REBOOKING (90-96) ──
  { num: 90, cat: "retention", text: "Acquiring a new customer costs 5–7x more than retaining an existing one. Yet most service businesses spend 90% of their budget on acquisition and 0% on retention." },
  { num: 91, cat: "retention", text: "A customer who rebooks with you costs $0 in marketing spend. The revenue is pure margin minus the service cost. Retention is the highest-ROI activity in your business." },
  { num: 92, cat: "retention", text: "If your customers only rebook when they remember to call you, you're relying on their memory — which competes with everything else in their life. Proactive outreach wins." },
  { num: 93, cat: "retention", text: "Service interval tracking is a CRM superpower. Quarterly gutter cleaning? The CRM should trigger a rebooking message at day 80, not day 120 when they've already hired someone else." },
  { num: 94, cat: "retention", text: "Personalized rebooking messages outperform generic blasts 3:1. \"Hi Sarah, it's been 3 months since your deep clean at your W 72nd apartment\" beats \"Book your next cleaning!\"" },
  { num: 95, cat: "retention", text: "Win-back campaigns for lapsed customers work. A \"We miss you\" message to someone who hasn't booked in 6 months recovers 5–15% of churned customers. That's free revenue." },
  { num: 96, cat: "retention", text: "The value of a retained customer compounds: they spend more per visit, refer more friends, leave more reviews, and require less hand-holding. Your best customers are your repeat customers." },

  // ── HARD TRUTHS (97-101) ──
  { num: 97, cat: "truth", text: "Most CRM vendors are selling you software, not results. They don't care if you use it. They care if you pay for it. Ask any vendor what their average customer retention rate is. If they dodge the question, you have your answer." },
  { num: 98, cat: "truth", text: "No CRM will fix a bad business. If your work is sloppy, your prices are wrong, or your employees don't show up — software won't save you. A CRM amplifies what's already there, good or bad." },
  { num: 99, cat: "truth", text: "The CRM industry thrives on complexity. They want you to need consultants, integrations, and onboarding specialists. A tool built for your industry shouldn't require a 6-week implementation." },
  { num: 100, cat: "truth", text: "If you're switching CRMs every year, the problem might not be the CRM. Define what you actually need before you shop. Most businesses buy features they saw in a demo and never use." },
  { num: 101, cat: "truth", text: "The best time to implement a CRM was when you started your business. The second best time is today. Every day without a system is a day of lost leads, missed follow-ups, and forgotten customers. Pick one and commit." },
];

export const metadata: Metadata = {
  title:
    "CRM 101: 101 Tips for Choosing the Right CRM for Your Service Business | Full Loop CRM",
  description:
    "101 blunt, honest tips for home service businesses comparing CRMs. Learn what a CRM actually does, which platforms work for your business size, and how to stop wasting money on the wrong tools.",
  keywords: [
    "best CRM for home service business",
    "CRM comparison home services",
    "Jobber vs Housecall Pro vs ServiceTitan",
    "do I need a CRM",
    "CRM for small business",
    "home service CRM tips",
    "CRM buying guide service businesses",
    "field service CRM comparison",
    "CRM for contractors",
    "how to choose a CRM",
    "CRM lead generation",
    "service business CRM guide",
    "AI CRM for service companies",
    "CRM vs scheduling software",
    "best CRM for plumbers electricians cleaners",
  ],
  alternates: { canonical: "https://www.fullloopcrm.com/full-loop-crm-101-educational-tips" },
  openGraph: {
    title: "CRM 101: 101 Honest Tips for Choosing the Right CRM",
    description:
      "No fluff. No sales pitch. 101 real tips to help you pick the right CRM for your service business — or decide if you even need one.",
    url: "https://www.fullloopcrm.com/full-loop-crm-101-educational-tips",
    type: "article",
    siteName: "Full Loop CRM",
    images: [
      {
        url: "https://www.fullloopcrm.com/opengraph-image",
        width: 1200,
        height: 630,
        alt: "CRM 101: 101 Tips for Choosing the Right CRM for Your Service Business",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CRM 101: 101 Honest Tips for Choosing the Right CRM",
    description:
      "No fluff. No sales pitch. 101 real tips for home service businesses comparing CRMs.",
    images: ["https://www.fullloopcrm.com/opengraph-image"],
  },
  other: {
    "article:published_time": "2025-01-01",
    "article:modified_time": new Date().toISOString().split("T")[0],
    "article:section": "CRM Education",
    "article:tag": "CRM, Home Service Business, CRM Comparison, Field Service, Lead Generation",
  },
};

export default function CRM101Page() {
  return (
    <>
      <JsonLd
        data={webPageSchema(
          "CRM 101: 101 Tips for Choosing the Right CRM for Your Service Business",
          "101 blunt, honest tips for home service businesses comparing CRMs. Learn what a CRM actually does, which platforms work for your business size, and how to stop wasting money on the wrong tools.",
          "https://www.fullloopcrm.com/full-loop-crm-101-educational-tips",
          breadcrumbs
        )}
      />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={faqSchema(crm101Faqs)} />
      <JsonLd
        data={articleSchema(
          "CRM 101: 101 Honest Tips for Choosing the Right CRM for Your Service Business",
          "101 blunt, honest tips for home service businesses comparing CRMs — from basics to buying decisions.",
          "https://www.fullloopcrm.com/full-loop-crm-101-educational-tips",
          "2025-01-01",
          new Date().toISOString().split("T")[0]
        )}
      />
      <JsonLd data={softwareApplicationSchema()} />
      <JsonLd
        data={itemListSchema(
          "CRM 101: 101 Educational Tips for Service Businesses",
          tips.map((t) => ({
            name: `Tip ${t.num}: ${t.text.substring(0, 80)}...`,
            url: `https://www.fullloopcrm.com/full-loop-crm-101-educational-tips#${t.cat}`,
          }))
        )}
      />

      {/* ── Hero ── */}
      <section className="bg-slate-900 py-24 px-6 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-4xl text-center">
          <p className="font-mono text-sm uppercase tracking-widest text-teal-400 mb-4">
            CRM 101
          </p>
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
            101 Things Every Service Business
            <span className="block text-teal-400 mt-2">Should Know About CRMs</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto mb-4">
            No fluff. No sales pitch. Just 101 honest, blunt, useful tips to help you
            figure out what a CRM is, whether you need one, which one fits your business,
            and how to stop wasting money on tools that don&rsquo;t work.
          </p>
          <p className="text-base text-slate-400 max-w-2xl mx-auto mb-8">
            Written for home service business owners who are tired of being sold to
            and just want straight answers.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/full-loop-crm-service-features"
              className="font-cta inline-block rounded-lg bg-teal-400 px-8 py-4 text-lg font-bold text-slate-900 hover:bg-teal-300 transition-colors"
            >
              See How Full Loop CRM Works
            </Link>
            <Link
              href="/full-loop-crm-frequently-asked-questions"
              className="text-yellow-300 underline underline-offset-2 hover:text-yellow-200 font-cta text-lg"
            >
              Read the FAQ
            </Link>
          </div>
        </div>
      </section>

      {/* ── Category Navigation ── */}
      <nav aria-label="CRM 101 tip categories" className="bg-white border-b border-slate-200 py-6 px-6 sticky top-0 z-30">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {categories.map((cat) => (
              <a
                key={cat.id}
                href={`#${cat.id}`}
                className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${cat.color.badge} text-white hover:opacity-80`}
              >
                {cat.title}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* ── 101 Tips by Category ── */}
      {categories.map((cat) => {
        const catTips = tips.filter((t) => t.cat === cat.id);
        const isDark = cat.id === "truth";

        return (
          <section
            key={cat.id}
            id={cat.id}
            className={`py-16 px-6 sm:px-8 lg:px-12 ${isDark ? "bg-slate-900" : ""}`}
          >
            <div className="mx-auto max-w-4xl">
              {/* Category Header */}
              <div className={`mb-10 ${isDark ? "text-center" : ""}`}>
                <span
                  className={`inline-block rounded-full px-4 py-1 text-xs font-bold uppercase tracking-widest text-white mb-3 ${cat.color.badge}`}
                >
                  Tips {catTips[0].num}–{catTips[catTips.length - 1].num}
                </span>
                <h2
                  className={`font-heading text-2xl sm:text-3xl font-extrabold ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  {cat.title}
                </h2>
                <p
                  className={`mt-2 text-base ${
                    isDark ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  {cat.subtitle}
                </p>
              </div>

              {/* Tips */}
              <ol className="space-y-4">
                {catTips.map((tip) => (
                  <li
                    key={tip.num}
                    className={`flex gap-4 items-start rounded-xl p-4 border ${
                      isDark
                        ? "border-slate-700 bg-slate-800"
                        : `${cat.color.border} ${cat.color.bg}`
                    }`}
                  >
                    <span
                      className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold font-heading text-sm text-white ${cat.color.badge}`}
                    >
                      {tip.num}
                    </span>
                    <p
                      className={`text-base leading-relaxed pt-1.5 ${
                        isDark ? "text-slate-200" : cat.color.text
                      }`}
                    >
                      {tip.text}
                    </p>
                  </li>
                ))}
              </ol>

              {/* Contextual internal link */}
              {categoryCTAs[cat.id] && (
                <div className={`mt-8 rounded-xl p-6 text-center ${isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-slate-200 shadow-sm"}`}>
                  <p className={`text-sm mb-3 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {categoryCTAs[cat.id].text}
                  </p>
                  <Link
                    href={categoryCTAs[cat.id].href}
                    className={`inline-block rounded-lg px-6 py-3 text-sm font-bold transition-colors ${
                      isDark
                        ? "bg-teal-400 text-slate-900 hover:bg-teal-300"
                        : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                  >
                    {categoryCTAs[cat.id].label}
                  </Link>
                </div>
              )}
            </div>
          </section>
        );
      })}

      {/* ── FAQ ── */}
      <section className="bg-white py-20 px-6 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-14">
            <p className="font-mono text-sm uppercase tracking-widest text-teal-600 mb-4">
              FAQ
            </p>
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-slate-900">
              Common Questions About CRMs
            </h2>
          </div>

          <dl className="space-y-6">
            {crm101Faqs.map(({ question, answer }) => (
              <div
                key={question}
                className="rounded-xl border border-slate-200 p-6"
              >
                <dt className="text-base font-semibold font-heading text-slate-900">
                  {question}
                </dt>
                <dd className="mt-3 text-sm leading-relaxed text-slate-600">
                  {answer}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-slate-900 py-24 px-6 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white mb-6">
            Done Researching? Ready to See the Real Thing?
          </h2>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-10">
            Full Loop CRM was built by someone who ran a home service company for
            10+ years. Every feature exists because of a real problem. No fluff. No
            features you&rsquo;ll never use. Just the full cycle — handled.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <Link
              href="/crm-partnership-request-form"
              className="font-cta inline-block rounded-lg bg-teal-400 px-8 py-4 text-lg font-bold text-slate-900 hover:bg-teal-300 transition-colors"
            >
              Apply for Your Territory
            </Link>
            <Link
              href="/full-loop-crm-pricing"
              className="text-yellow-300 underline underline-offset-2 hover:text-yellow-200 font-cta text-lg"
            >
              View Pricing
            </Link>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-slate-400">
            <a
              href="tel:+12122029220"
              className="text-yellow-300 underline underline-offset-2 hover:text-yellow-200"
            >
              Call (212) 202-9220
            </a>
            <span className="hidden sm:inline text-slate-600">|</span>
            <a
              href="sms:+12122029220"
              className="text-yellow-300 underline underline-offset-2 hover:text-yellow-200"
            >
              Text (212) 202-9220
            </a>
          </div>
          <p className="mt-8 text-sm text-slate-500">
            Explore{" "}
            <Link
              href="/full-loop-crm-service-features"
              className="text-yellow-300 underline underline-offset-2 hover:text-yellow-200"
            >
              the platform
            </Link>
            , learn{" "}
            <Link
              href="/why-you-should-choose-full-loop-crm-for-your-business"
              className="text-yellow-300 underline underline-offset-2 hover:text-yellow-200"
            >
              why we built Full Loop
            </Link>
            , or browse{" "}
            <Link
              href="/full-loop-crm-service-business-industries"
              className="text-yellow-300 underline underline-offset-2 hover:text-yellow-200"
            >
              50+ industries we serve
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
