// @ts-nocheck
"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import TipBlurb from "@/app/site/consortium-nyc/_components/TipBlurb";

/* ── Inner link helper ───────────────────────────────────────── */
const L = ({ href, children }: { href: string; children: ReactNode }) => (
  <Link href={href} className="text-teal-600 underline underline-offset-2 hover:text-teal-700">{children}</Link>
);

/* ── Phase defs ──────────────────────────────────────────────── */
const phases = [
  { id: "foundation", label: "Foundation", range: "1–20", desc: "You just opened your doors. You need customers yesterday." },
  { id: "traction", label: "Getting Traction", range: "21–40", desc: "You have some customers. Now you need a system." },
  { id: "growth", label: "Growth Mode", range: "41–60", desc: "It's working. Time to pour fuel on the fire." },
  { id: "scale", label: "Scaling Up", range: "61–80", desc: "You're busy. Now build the machine that runs without you." },
  { id: "mastery", label: "Mastery", range: "81–101", desc: "25 years of lessons distilled into the moves that separate the best from the rest." },
];

/* ── Lesson type ─────────────────────────────────────────────── */
type Lesson = {
  phase: string;
  step: string;
  issue: ReactNode;
  advice: ReactNode;
  secret: ReactNode;
};

/* ── 101 Lessons ─────────────────────────────────────────────── */
const lessons: Lesson[] = [
  // ═══════════════════════════════════════════════════════════
  // PHASE 1: FOUNDATION (1–20)
  // ═══════════════════════════════════════════════════════════
  {
    phase: "foundation",
    step: "Register Your Google Business Profile",
    issue: <span>You don&apos;t exist on Google. Customers search &ldquo;near me&rdquo; and find your competitor instead. You&apos;re invisible.</span>,
    advice: <span>Claim your <L href="/nyc-marketing-company-services-list">Google Business Profile</L> immediately — it&apos;s free. Fill out every single field: business name, address, phone, hours, categories, description, photos. This is the single highest-ROI marketing action a new business can take.</span>,
    secret: <span>Your primary category is the #1 ranking factor for Google Maps. Most businesses pick wrong. A plumber should use &ldquo;Plumber&rdquo; not &ldquo;Plumbing Service.&rdquo; Research what your top-ranking competitors use and mirror it.</span>,
  },
  {
    phase: "foundation",
    step: "Buy Your Domain Name",
    issue: <span>You&apos;re using a free Wix URL or don&apos;t have a website at all. Customers can&apos;t find you and don&apos;t trust you.</span>,
    advice: <span>Buy yourbusinessname.com. Keep it short, memorable, and spelled exactly like your business. Avoid hyphens, numbers, and creative spellings. This is your digital storefront — it matters.</span>,
    secret: <span>If your exact business name .com is taken, add your city: &ldquo;businessnameNYC.com.&rdquo; Google gives a small relevance boost to domains with location signals, and customers immediately know you&apos;re local.</span>,
  },
  {
    phase: "foundation",
    step: "Build a Real Website",
    issue: <span>You have no website, a terrible DIY site, or a WordPress template that loads in 6 seconds. You&apos;re losing every customer who checks you out online.</span>,
    advice: <span>Invest in a <L href="/nyc-marketing-company-services-list">custom website</L> built for speed and conversion. Starting at <L href="/nyc-marketing-pricing-guide">$4,600</L>, a professional site pays for itself in weeks. It needs to load in under 2 seconds, look great on phones, and have clear calls to action on every page.</span>,
    secret: <span>Your website&apos;s #1 job isn&apos;t to look pretty — it&apos;s to make the phone ring. Put your phone number in the top right of every page, make it click-to-call on mobile, and add a contact form above the fold. Beauty without conversion is an expensive brochure.</span>,
  },
  {
    phase: "foundation",
    step: "Get Your NAP Consistent Everywhere",
    issue: <span>Your business name, address, and phone number are different on Google, Yelp, Facebook, and your website. Google doesn&apos;t know which version is real.</span>,
    advice: <span>Pick one exact format for your Name, Address, and Phone (NAP) and use it identically everywhere — your <L href="/nyc-marketing-company-services-list">website</L>, Google Business Profile, social profiles, and every directory listing. Even &ldquo;St.&rdquo; vs &ldquo;Street&rdquo; matters.</span>,
    secret: <span>Create a text file with your exact NAP and copy-paste it every time. Never type it from memory. One inconsistency across 80 directories dilutes your local authority and costs you map pack rankings.</span>,
  },
  {
    phase: "foundation",
    step: "Set Up Google Analytics and Search Console",
    issue: <span>You have no idea how people find you, how many visit your site, or what they do when they get there. You&apos;re flying blind.</span>,
    advice: <span>Install Google Analytics 4 and Google Search Console on day one. These are free and tell you exactly where your traffic comes from, which pages perform, and which <L href="/services-areas-we-offer-marketing-services-in">neighborhoods</L> your visitors are in. You can&apos;t improve what you don&apos;t measure.</span>,
    secret: <span>Set up &ldquo;Events&rdquo; for phone clicks, form submissions, and direction requests from day one — even if you get zero traffic. When traffic starts flowing, you&apos;ll have clean data instead of scrambling to set up tracking retroactively.</span>,
  },
  {
    phase: "foundation",
    step: "Create Service Pages for Every Service You Offer",
    issue: <span>Your entire website is one page that says &ldquo;We do plumbing, heating, and AC.&rdquo; Google can&apos;t rank you for any of those services specifically.</span>,
    advice: <span>Build a dedicated page for every service: drain cleaning, water heater repair, AC installation — each with its own URL, title, description, and content. This is how <L href="/nyc-marketing-company-services-list">SEO architecture</L> works. One page per service. No exceptions.</span>,
    secret: <span>Each service page should target one primary keyword and 2–3 secondary keywords. &ldquo;Emergency Plumber Brooklyn&rdquo; is a different page than &ldquo;Drain Cleaning Brooklyn.&rdquo; The business that has the most relevant page for a search wins the click.</span>,
  },
  {
    phase: "foundation",
    step: "Add Your Business to the Top 20 Directories",
    issue: <span>You only exist on Google. Yelp, BBB, Angi, Thumbtack, and industry directories don&apos;t know you exist. Your local SEO foundation is paper-thin.</span>,
    advice: <span>Submit your business (with identical NAP) to the top 20 directories for your <L href="/industries-we-offer-marketing-services-for">industry</L>: Google, Yelp, Bing Places, Apple Maps, BBB, Facebook, Angi, Thumbtack, Nextdoor, and industry-specific directories. This builds your citation foundation.</span>,
    secret: <span>The directories that matter most are the ones Google already trusts for your industry. For <L href="/industries-we-offer-marketing-services-for/plumber-marketing">plumbers</L>, that&apos;s Angi and HomeAdvisor. For <L href="/industries-we-offer-marketing-services-for/restaurant-food-service-marketing">restaurants</L>, it&apos;s Yelp and TripAdvisor. For <L href="/industries-we-offer-marketing-services-for/law-firm-marketing">lawyers</L>, it&apos;s Avvo and FindLaw. Industry-specific citations carry 3x the weight of general ones.</span>,
  },
  {
    phase: "foundation",
    step: "Ask Your First 10 Customers for Google Reviews",
    issue: <span>You have zero reviews. Customers see your competitor with 87 reviews and pick them instead. No reviews = no trust = no calls.</span>,
    advice: <span>Personally ask your first 10 satisfied customers to leave a Google review. Make it easy — text them a direct link to your review page. Don&apos;t be shy. People want to help businesses they like, they just need to be asked.</span>,
    secret: <span>The first 10 reviews matter more than any other 10 you&apos;ll ever get. Google gives new profiles a &ldquo;honeymoon&rdquo; boost when reviews start coming in. Front-load your review requests in the first month. Going from 0 to 10 reviews can move you from invisible to page one in the <L href="/services-areas-we-offer-marketing-services-in">map pack</L>.</span>,
  },
  {
    phase: "foundation",
    step: "Write Your Homepage Like a Sales Letter",
    issue: <span>Your homepage says &ldquo;Welcome to our website&rdquo; and has stock photos of handshakes. It says nothing about what you do, who you serve, or why anyone should call.</span>,
    advice: <span>Your homepage needs: what you do (in 10 words or less), who you serve (<L href="/services-areas-we-offer-marketing-services-in">neighborhoods</L> + <L href="/industries-we-offer-marketing-services-for">industries</L>), why you&apos;re different, social proof (reviews, numbers), and a clear call-to-action above the fold. Every element earns its space or gets cut.</span>,
    secret: <span>The first 5 seconds decide if someone stays or bounces. Your headline should answer the question in the customer&apos;s head: &ldquo;Can this business solve my problem?&rdquo; Not &ldquo;Welcome&rdquo; — that answers nothing. Lead with the outcome they want.</span>,
  },
  {
    phase: "foundation",
    step: "Set Up a Business Phone Number",
    issue: <span>You&apos;re using your personal cell for business. You miss calls when you&apos;re busy, there&apos;s no professional voicemail, and you can&apos;t track marketing leads.</span>,
    advice: <span>Get a dedicated business number. Use it on your <L href="/nyc-marketing-company-services-list">website</L>, Google Business Profile, and every listing. A professional voicemail with your business name and hours tells callers you&apos;re real and you&apos;ll call back.</span>,
    secret: <span>Use a call tracking number so you can see exactly which marketing channels generate phone calls — Google organic, Google Maps, Yelp, your website. When you know that <L href="/nyc-marketing-company-services-list">SEO</L> generates 30 calls/month and Yelp generates 3, you know where to invest.</span>,
  },
  {
    phase: "foundation",
    step: "Take Real Photos of Your Work",
    issue: <span>Your website and Google profile use stock photos. Customers know. It screams &ldquo;I don&apos;t have real work to show.&rdquo;</span>,
    advice: <span>Take photos of every job, every project, every happy customer (with permission). Before/after shots are gold. Upload them to your <L href="/nyc-marketing-company-services-list">Google Business Profile</L> weekly and feature them on your website. Real photos build trust that stock photos destroy.</span>,
    secret: <span>Businesses with 100+ Google photos get 520% more calls than those with fewer than 10. Make it a habit: every job, 3 photos minimum. This single habit will outperform most marketing tactics combined.</span>,
  },
  {
    phase: "foundation",
    step: "Know Your One Target Customer",
    issue: <span>You say you serve &ldquo;everyone.&rdquo; So your marketing speaks to no one. You&apos;re a generalist in a market that rewards specialists.</span>,
    advice: <span>Define your ideal customer: What <L href="/industries-we-offer-marketing-services-for">industry</L> or situation are they in? What <L href="/services-areas-we-offer-marketing-services-in">neighborhood</L>? What problem do they have at 2 AM that makes them search Google? Build every page, every ad, every word around that person.</span>,
    secret: <span>The riches are in the niches. A &ldquo;<L href="/industries-we-offer-marketing-services-for/plumber-marketing">plumber in Park Slope who specializes in brownstone pipe repair</L>&rdquo; will outrank, outconvert, and outprice a &ldquo;plumber who does everything everywhere.&rdquo; Specialization is a marketing superpower.</span>,
  },
  {
    phase: "foundation",
    step: "Learn What Your Competitors Are Doing",
    issue: <span>You have no idea who ranks above you on Google, what their website looks like, or what they charge. You&apos;re competing with blindfolds on.</span>,
    advice: <span>Search every keyword a customer would use to find your business. Note the top 5 results. Study their websites, Google Business Profiles, reviews, and content. This is your competitive landscape. You need to be better than each of them at something specific.</span>,
    secret: <span>Your competitors&apos; weaknesses are your fastest path to page one. If the top-ranked <L href="/industries-we-offer-marketing-services-for/dental-practice-marketing">dentist in Astoria</L> has a slow website and 20 reviews, you can beat them with a fast site and 50 reviews in 3 months. Find the gap and exploit it.</span>,
  },
  {
    phase: "foundation",
    step: "Create a Google Ads Account (But Don't Spend Yet)",
    issue: <span>You think Google Ads is the answer to getting customers fast. You&apos;re about to waste $2,000 learning what doesn&apos;t work.</span>,
    advice: <span>Set up a Google Ads account to access the Keyword Planner — a free tool that shows you exactly what people search for, how often, and how competitive each term is. Use this data to inform your <L href="/nyc-marketing-company-services-list">SEO strategy</L> before spending a dollar on ads.</span>,
    secret: <span>The keywords with the highest search volume aren&apos;t always the best targets. A term with 50 searches/month and low competition will get you on page one faster than a term with 5,000 searches and brutal competition. Target the wins you can actually get.</span>,
  },
  {
    phase: "foundation",
    step: "Write a Killer Business Description",
    issue: <span>Your Google Business Profile description says &ldquo;Best plumber in NYC&rdquo; and nothing else. It doesn&apos;t tell Google or customers what you actually do or where.</span>,
    advice: <span>Write a 750-character description that includes: your services, your <L href="/services-areas-we-offer-marketing-services-in">service areas</L>, your experience, and what makes you different. Use natural language with your target keywords woven in. This description appears in Google search results.</span>,
    secret: <span>Front-load your description with your most important keywords and location. Google weighs the first 250 characters most heavily. &ldquo;Licensed plumber serving <L href="/services-areas-we-offer-marketing-services-in/brooklyn-marketing-company">Brooklyn</L>, <L href="/services-areas-we-offer-marketing-services-in/queens-marketing-company">Queens</L>, and <L href="/services-areas-we-offer-marketing-services-in/manhattan-marketing-company">Manhattan</L> for 15 years — specializing in emergency repairs, drain cleaning, and water heater installation&rdquo; beats &ldquo;We are the best plumber in NYC&rdquo; every time.</span>,
  },
  {
    phase: "foundation",
    step: "Make Your Website Mobile-First",
    issue: <span>Your website looks great on a desktop that nobody uses to search for local businesses. On a phone it&apos;s unreadable, slow, and impossible to navigate.</span>,
    advice: <span>70%+ of local searches happen on phones. Your <L href="/nyc-marketing-company-services-list">website</L> must load in under 3 seconds on mobile, have tap-friendly buttons, readable text without zooming, and a click-to-call button visible at all times. Test it yourself — if you struggle, your customers gave up.</span>,
    secret: <span>Google uses mobile-first indexing — meaning it judges your website based on the mobile version, not desktop. If your mobile site is slow or broken, you&apos;re penalized for every device. A perfect desktop site with a bad mobile version will rank below a mediocre site with great mobile performance.</span>,
  },
  {
    phase: "foundation",
    step: "Set Your Pricing and Put It on Your Website",
    issue: <span>You hide your pricing because you&apos;re afraid of scaring people off. Instead, you attract price shoppers who waste your time and hire the transparent competitor.</span>,
    advice: <span>Publish starting prices or price ranges on your <L href="/nyc-marketing-company-services-list">website</L>. &ldquo;Drain cleaning starting at $150&rdquo; or &ldquo;Consultations from $200/hr.&rdquo; Transparency builds trust. See how we do it at our <L href="/nyc-marketing-pricing-guide">pricing page</L> — it&apos;s our most-visited page.</span>,
    secret: <span>Businesses with pricing on their website convert 2–3x higher than those without. The people scared off by your prices were never going to hire you anyway. Pricing pages also rank incredibly well for searches like &ldquo;how much does [service] cost in NYC.&rdquo;</span>,
  },
  {
    phase: "foundation",
    step: "Get on Social Media (But Pick One)",
    issue: <span>You created accounts on Facebook, Instagram, Twitter, TikTok, LinkedIn, and Pinterest. You posted twice on each and abandoned them all. Now they look dead.</span>,
    advice: <span>Pick ONE platform where your customers actually are. <L href="/industries-we-offer-marketing-services-for/restaurant-food-service-marketing">Restaurants</L>: Instagram. <L href="/industries-we-offer-marketing-services-for/contractor-marketing">Contractors</L>: Facebook. <L href="/industries-we-offer-marketing-services-for/law-firm-marketing">Lawyers</L>: LinkedIn. Post 3x/week on that one platform. Consistency on one beats absence on five.</span>,
    secret: <span>Social media is a trust signal, not a lead channel for most <L href="/industries-we-offer-marketing-services-for">local businesses</L>. Customers check your social profiles to see if you&apos;re active and legitimate. An Instagram with weekly project photos says &ldquo;we&apos;re busy and doing good work.&rdquo; An abandoned account says &ldquo;we might be out of business.&rdquo;</span>,
  },
  {
    phase: "foundation",
    step: "Learn the Difference Between SEO and Paid Ads",
    issue: <span>You think you have to pay Google to show up. Or you think SEO is some magic trick. You don&apos;t understand either well enough to make smart decisions.</span>,
    advice: <span>Paid ads (Google Ads) get you to the top immediately — but stop the moment you stop paying. <L href="/nyc-marketing-company-services-list">SEO</L> takes 3–6 months but compounds over time and generates leads at near-zero marginal cost. The right strategy uses both, but if you can only afford one, invest in SEO. It&apos;s the asset that appreciates.</span>,
    secret: <span>Every dollar you spend on <L href="/nyc-marketing-pricing-guide">SEO</L> builds equity. In year one, SEO costs money. By year three, your cost per lead drops below every other channel. By year five, it&apos;s practically free traffic. That&apos;s why 25-year businesses spend a fraction of revenue on marketing — they invested early and it compounded.</span>,
  },
  {
    phase: "foundation",
    step: "Don't Try to Do Everything Yourself",
    issue: <span>You&apos;re the plumber, the bookkeeper, the marketer, the customer service rep, and the CEO. Your marketing gets 30 minutes on Sunday night when you&apos;re exhausted.</span>,
    advice: <span>Marketing is a full-time discipline, not a side project. Either hire someone or <L href="/contact-nyc-marketing-company-consortium-nyc">partner with an agency</L> that specializes in <L href="/industries-we-offer-marketing-services-for">your industry</L>. The cost of professional marketing is always less than the cost of missed opportunities from bad DIY marketing.</span>,
    secret: <span>The math is simple: if your average job is worth $500 and professional <L href="/nyc-marketing-pricing-guide">SEO costs $950/month</L>, you need 2 extra jobs per month to break even. Most clients get 20–30 additional leads per month. That&apos;s not an expense — it&apos;s the best investment in your business.</span>,
  },

  // ═══════════════════════════════════════════════════════════
  // PHASE 2: GETTING TRACTION (21–40)
  // ═══════════════════════════════════════════════════════════
  {
    phase: "traction",
    step: "Build Location-Specific Landing Pages",
    issue: <span>You serve 10 neighborhoods but only have one homepage. Google shows you for searches in your immediate area and nowhere else.</span>,
    advice: <span>Create a dedicated landing page for every <L href="/services-areas-we-offer-marketing-services-in">neighborhood</L> you serve. &ldquo;Plumber in Park Slope&rdquo; needs its own page with Park Slope-specific content, not a generic &ldquo;We serve Brooklyn&rdquo; mention. Each page = each ranking opportunity.</span>,
    secret: <span>Don&apos;t just swap the city name and copy-paste content. Google catches thin, duplicate pages and penalizes them. Each neighborhood page needs unique content: local landmarks, specific challenges in that area, testimonials from local customers. We build <L href="/services-areas-we-offer-marketing-services-in">80+ area pages</L> this way.</span>,
  },
  {
    phase: "traction",
    step: "Start a Review Generation System",
    issue: <span>You got your first 10 reviews and stopped asking. Your competitor adds 5 reviews/month while yours stays frozen. Momentum is dying.</span>,
    advice: <span>Systematize review requests. After every job or appointment, an automated text or email asks for a review with a direct link. Make it frictionless — one tap, one click. Use <L href="/artificial-intelligence-marketing-services-offered">automation tools</L> to trigger these without you lifting a finger.</span>,
    secret: <span>Timing matters more than the ask. Send the review request 1–2 hours after service completion — the customer is happy, the experience is fresh, and they&apos;re on their phone. Wait a week and the response rate drops 80%. Automate the timing and you&apos;ll never miss the window.</span>,
  },
  {
    phase: "traction",
    step: "Optimize Your Website for Conversions",
    issue: <span>You&apos;re getting some traffic but it&apos;s not turning into calls. People visit and leave. Your bounce rate is 70%+ and you don&apos;t know why.</span>,
    advice: <span>Add clear CTAs on every page: click-to-call buttons, contact forms above the fold, live chat or <L href="/artificial-intelligence-marketing-services-offered">AI chatbot</L>. Remove distractions. Make the path from &ldquo;I found you&rdquo; to &ldquo;I&apos;m calling you&rdquo; as short as possible. Every click between landing and converting loses 20% of visitors.</span>,
    secret: <span>The highest-converting element on any local business website is a phone number in the header that&apos;s click-to-call on mobile. Second highest: a contact form with 3 fields or fewer (name, phone, message). Everything else is optimization on top of these two fundamentals.</span>,
  },
  {
    phase: "traction",
    step: "Start Building Backlinks",
    issue: <span>Your website has zero external links pointing to it. Google sees you as a brand-new, untrustworthy site — because no one is vouching for you.</span>,
    advice: <span>Start with easy wins: your local chamber of commerce, business associations, supplier websites that list partners, local sponsorships, and industry directories. Each backlink is a vote of confidence that tells Google you&apos;re a real, authoritative business in your <L href="/services-areas-we-offer-marketing-services-in">area</L>.</span>,
    secret: <span>One link from a local news site or your city&apos;s .gov page is worth more than 50 links from random blogs. Focus on relevance and authority over quantity. A <L href="/services-areas-we-offer-marketing-services-in/brooklyn-marketing-company">Brooklyn</L> business getting linked from Brooklyn Daily Eagle is worth 10x a generic directory listing.</span>,
  },
  {
    phase: "traction",
    step: "Create a Content Calendar",
    issue: <span>You published two blog posts six months ago and haven&apos;t touched your blog since. Inconsistency tells Google your site is stale.</span>,
    advice: <span>Plan 4 pieces of content per month: 2 service-focused pages, 1 local/neighborhood piece, 1 educational blog post. Map each piece to a target keyword. Consistency beats volume — 4 quality pieces/month for 12 months beats 20 posts in January and nothing for the rest of the year.</span>,
    secret: <span>Write content that answers the exact question a customer types into Google at 11 PM when their pipe bursts or their tooth hurts. &ldquo;How much does emergency plumbing cost in <L href="/services-areas-we-offer-marketing-services-in/brooklyn-marketing-company">Brooklyn</L>?&rdquo; That&apos;s a blog post that generates calls for years. Check <L href="/whats-working-in-marketing">what&apos;s working in marketing</L> right now.</span>,
  },
  {
    phase: "traction",
    step: "Track Every Lead Source",
    issue: <span>A customer calls and you ask &ldquo;How did you find us?&rdquo; They say &ldquo;Google.&rdquo; That tells you nothing. You have no idea which marketing efforts are working.</span>,
    advice: <span>Use call tracking numbers, UTM parameters on links, and form source tracking. Know exactly how many leads come from <L href="/nyc-marketing-company-services-list">organic SEO</L>, Google Maps, Yelp, referrals, and every other channel. This data determines where you invest next.</span>,
    secret: <span>Most businesses overestimate referrals and underestimate SEO. When you actually track sources, you&apos;ll discover that &ldquo;Google&rdquo; isn&apos;t one channel — it&apos;s three: organic search, maps/local pack, and Google Ads. Organic + maps typically generate 70% of local business leads.</span>,
  },
  {
    phase: "traction",
    step: "Respond to Every Review — Good and Bad",
    issue: <span>You have 40 reviews and haven&apos;t responded to a single one. Google notices. Customers notice. It looks like you don&apos;t care.</span>,
    advice: <span>Respond to every review within 24 hours. Thank positive reviewers by name and mention specifics. For negative reviews, acknowledge the issue, apologize, and offer to make it right offline. This shows future customers you care and signals activity to Google.</span>,
    secret: <span>Your response to a negative review is marketing to every future customer who reads it. A professional, empathetic response can actually convert more customers than a 5-star review with no response. People don&apos;t expect perfection — they expect accountability.</span>,
  },
  {
    phase: "traction",
    step: "Build an Email List",
    issue: <span>Every customer you&apos;ve ever served is a one-and-done transaction. You have no way to reach them again without paying for ads.</span>,
    advice: <span>Collect emails from every customer and website visitor. Add a simple opt-in on your <L href="/nyc-marketing-company-services-list">website</L>: &ldquo;Get seasonal maintenance tips&rdquo; or &ldquo;Join our VIP list for 10% off.&rdquo; An email list is the only marketing asset you own outright — Google can&apos;t take it away.</span>,
    secret: <span>Email marketing generates $36 for every $1 spent — the highest ROI of any channel. But only if your list is real customers, not purchased junk. A list of 500 past customers who know and trust you is worth more than 50,000 random emails. Quality always wins.</span>,
  },
  {
    phase: "traction",
    step: "Optimize Your Site Speed",
    issue: <span>Your website takes 5 seconds to load. 53% of mobile users leave if a site takes longer than 3 seconds. You&apos;re losing half your traffic before they see anything.</span>,
    advice: <span>Compress images, eliminate render-blocking scripts, use a CDN, and minify your code. If you&apos;re on WordPress, switch to a modern stack. Our <L href="/nyc-marketing-company-services-list">Next.js websites</L> load in under 2 seconds because speed is engineered in, not patched on.</span>,
    secret: <span>Google&apos;s Core Web Vitals are now a ranking factor. A site that scores 90+ on PageSpeed Insights gets a meaningful ranking boost over competitors scoring 50. This isn&apos;t theoretical — we&apos;ve seen clients jump 5–10 positions just from speed improvements with zero content changes.</span>,
  },
  {
    phase: "traction",
    step: "Add Schema Markup to Your Website",
    issue: <span>Your search results show a plain blue link while your competitor has star ratings, pricing, FAQs, and business hours displayed right in Google. They get the click, you don&apos;t.</span>,
    advice: <span>Add structured data (schema markup) to your website: LocalBusiness, Service, FAQ, Review, and BreadcrumbList schemas. This tells Google exactly what your business is and enables rich results that dramatically increase click-through rates.</span>,
    secret: <span>FAQ schema is the easiest quick win. Add 5 common questions and answers to your service pages with FAQ schema, and Google may display them directly in search results — doubling the space your listing takes up. More space = more clicks = more leads. Every <L href="/nyc-marketing-company-services-list">site we build</L> includes this.</span>,
  },
  {
    phase: "traction",
    step: "Master Your Google Business Profile Posts",
    issue: <span>Your GBP looks like a ghost town. Last post: 8 months ago. Last photo: your logo from 2019. Google thinks you might be closed.</span>,
    advice: <span>Post 2–4 times per week on your Google Business Profile. Share job photos, tips, promotions, and updates. Use images on every post. This signals to Google that your business is active and engaged, and gives searchers more reasons to click.</span>,
    secret: <span>GBP posts expire after 7 days, but the engagement signals persist. A business posting 4x/week for 6 months will have a measurably stronger local presence than one that never posts. It&apos;s like compound interest for your <L href="/services-areas-we-offer-marketing-services-in">local visibility</L>.</span>,
  },
  {
    phase: "traction",
    step: "Add Service-Specific Photos to Your GBP",
    issue: <span>Your Google Business Profile has 3 photos: your logo, your building, and a blurry team photo. Customers can&apos;t visualize your work.</span>,
    advice: <span>Upload photos tagged to specific services. Drain cleaning: show the before/after. Kitchen remodel: show the transformation. Dental work: show the smile. Upload 5+ photos per week minimum and categorize them properly.</span>,
    secret: <span>Google uses image recognition to understand your photos. A photo of actual plumbing work signals to Google &ldquo;this business does plumbing.&rdquo; Stock photos signal nothing. Real work photos can improve your relevance for service-specific searches you haven&apos;t even targeted yet.</span>,
  },
  {
    phase: "traction",
    step: "Build Your First Referral System",
    issue: <span>You get occasional referrals by luck. But you have no system. Happy customers forget to recommend you. Referrals are random, not reliable.</span>,
    advice: <span>Create a simple referral program: &ldquo;Refer a friend, you both get $50 off.&rdquo; Tell every customer at the end of every job. Print cards. Add it to your follow-up emails. Referrals have the highest close rate of any lead source — you just need to systematize the ask.</span>,
    secret: <span>The best time to ask for a referral is immediately after you&apos;ve delivered great service — the customer is at peak satisfaction. Script it: &ldquo;If you know anyone who needs [service], we&apos;d love to help them too. Here&apos;s a card with $50 off for both of you.&rdquo; Simple, direct, effective.</span>,
  },
  {
    phase: "traction",
    step: "Learn to Read Your SEO Reports",
    issue: <span>Your agency sends monthly reports full of charts and jargon. You nod and say &ldquo;looks good&rdquo; without understanding a single number. You&apos;re paying for something you can&apos;t evaluate.</span>,
    advice: <span>Focus on three metrics: keyword rankings (are you moving up?), organic traffic (are more people finding you?), and leads (are you getting more calls/forms?). Everything else is supporting data. If all three are trending up, your <L href="/nyc-marketing-pricing-guide">$950/month</L> is working.</span>,
    secret: <span>The metric most agencies hide: cost per lead. Take your monthly <L href="/nyc-marketing-company-services-list">SEO</L> spend and divide by the number of leads generated. If you&apos;re spending $950/month and getting 30 leads, that&apos;s $31/lead. Compare that to Google Ads at $50–$150/lead. That&apos;s the ROI story in one number.</span>,
  },
  {
    phase: "traction",
    step: "Create a FAQ Page",
    issue: <span>Customers call with the same 10 questions. You answer them manually every time. Google could be sending you traffic for those questions — but you don&apos;t have the content.</span>,
    advice: <span>Build a dedicated <L href="/nyc-marketing-company-faqs">FAQ page</L> with your 20–30 most common customer questions. Each answer should be thorough, include internal links, and target a long-tail keyword. This page will rank for dozens of question-based searches and reduce support calls.</span>,
    secret: <span>FAQ pages with proper FAQ schema get featured in Google&apos;s &ldquo;People Also Ask&rdquo; boxes — free visibility at the top of search results. Our <L href="/nyc-marketing-company-faqs">FAQ page has 100 questions</L> targeting long-tail keywords across every service and area we cover. It ranks for hundreds of searches.</span>,
  },
  {
    phase: "traction",
    step: "Claim and Optimize Your Yelp Profile",
    issue: <span>You have a Yelp page you didn&apos;t create with outdated info and a 3-star rating from someone who wasn&apos;t even your customer. It&apos;s costing you business.</span>,
    advice: <span>Claim your Yelp business page, update all information, add 20+ photos, respond to every review, and keep it current. For <L href="/industries-we-offer-marketing-services-for/restaurant-food-service-marketing">restaurants</L>, <L href="/industries-we-offer-marketing-services-for/home-service-business-marketing">home services</L>, and <L href="/industries-we-offer-marketing-services-for/dental-practice-marketing">healthcare providers</L>, Yelp is still a significant lead source in NYC. Don&apos;t ignore it.</span>,
    secret: <span>Yelp&apos;s filter algorithm hides reviews it considers &ldquo;suspicious&rdquo; — especially from new accounts or infrequent reviewers. You can&apos;t control the filter, but you can increase the volume of reviews so more make it through. The filter favors established businesses with steady review flow over time.</span>,
  },
  {
    phase: "traction",
    step: "Implement Click-to-Call on Everything",
    issue: <span>Your phone number on mobile is plain text. Customers have to memorize it, switch to their dialer, and type it in. Most don&apos;t bother.</span>,
    advice: <span>Make every phone number on your <L href="/nyc-marketing-company-services-list">website</L>, Google Business Profile, and directory listings clickable on mobile. Use the tel: link format. Add a floating call button on mobile that follows the user as they scroll.</span>,
    secret: <span>A sticky mobile call button can increase phone conversions by 30–40%. It&apos;s one line of code and it&apos;s the highest-converting element on any <L href="/industries-we-offer-marketing-services-for">local business</L> mobile site. If you implement one thing from this list today, make it this.</span>,
  },
  {
    phase: "traction",
    step: "Set Up Google Business Profile Messaging",
    issue: <span>Customers want to text you a question before calling. Your GBP has messaging disabled. They move on to the competitor who responds in 30 seconds.</span>,
    advice: <span>Enable messaging on your Google Business Profile and respond within 5 minutes. If you can&apos;t monitor it yourself, set up an <L href="/artificial-intelligence-marketing-services-offered">AI chatbot</L> to handle initial responses. Speed to response directly correlates with conversion rate.</span>,
    secret: <span>Businesses that respond to GBP messages within 5 minutes are 21x more likely to convert than those who respond in 30 minutes. An <L href="/artificial-intelligence-marketing-services-offered">AI automation system</L> that instantly responds, qualifies the lead, and books an appointment while you&apos;re on a job site is the unfair advantage busy owners need.</span>,
  },
  {
    phase: "traction",
    step: "Start Tracking Your Competitors Monthly",
    issue: <span>You checked competitors once when you started. That was a year ago. They&apos;ve added 50 reviews, launched a new website, and are now outranking you for everything.</span>,
    advice: <span>Set a monthly reminder to check your top 5 competitors: their Google rankings, review count, website changes, new content, and GBP activity. This isn&apos;t paranoia — it&apos;s intelligence. Markets shift, and the business that adapts fastest wins.</span>,
    secret: <span>When a competitor suddenly drops in rankings, that&apos;s your window. They may have been hit by an algorithm update, lost backlinks, or made site changes that hurt their SEO. Monitor their positions alongside yours. Their loss is your fastest path to their spot.</span>,
  },

  // ═══════════════════════════════════════════════════════════
  // PHASE 3: GROWTH MODE (41–60)
  // ═══════════════════════════════════════════════════════════
  {
    phase: "growth",
    step: "Build Service + Location Pages at Scale",
    issue: <span>You rank in your home neighborhood but nowhere else. Customers in 10 other neighborhoods can&apos;t find you. You&apos;re leaving money on the table.</span>,
    advice: <span>Build a page for every service + neighborhood combination: &ldquo;drain cleaning <L href="/services-areas-we-offer-marketing-services-in/park-slope-marketing-company">Park Slope</L>,&rdquo; &ldquo;drain cleaning <L href="/services-areas-we-offer-marketing-services-in/williamsburg-marketing-company">Williamsburg</L>,&rdquo; &ldquo;water heater repair <L href="/services-areas-we-offer-marketing-services-in/astoria-marketing-company">Astoria</L>.&rdquo; This is <L href="/nyc-marketing-company-services-list">programmatic SEO</L> — and it&apos;s how you dominate entire markets.</span>,
    secret: <span>The magic number is unique content. Each page needs at least 40% unique text to avoid duplicate content penalties. Reference local landmarks, neighborhood-specific challenges, and area demographics. &ldquo;Park Slope brownstones have 100-year-old cast iron pipes&rdquo; is local content that ranks and converts.</span>,
  },
  {
    phase: "growth",
    step: "Invest in Professional Photography",
    issue: <span>Your phone photos served you well at the start. But now you&apos;re competing with businesses that look like they belong on Architectural Digest. Your DIY photos look amateur.</span>,
    advice: <span>Hire a professional photographer for a half-day shoot: your team, your workspace, your best projects, and headshots. These photos will be used across your <L href="/nyc-marketing-company-services-list">website</L>, Google profile, social media, and print materials for 2+ years. It&apos;s one of the highest-ROI investments at this stage.</span>,
    secret: <span>Have the photographer shoot &ldquo;in-action&rdquo; photos — you working, your team collaborating, real interactions with customers (with permission). Action shots convert 3x better than posed photos. People want to see the human behind the business, not a corporate headshot.</span>,
  },
  {
    phase: "growth",
    step: "Build a Lead Follow-Up Sequence",
    issue: <span>Someone fills out your contact form and you call them back 4 hours later. They already hired your competitor who called in 10 minutes. You&apos;re losing leads you already earned.</span>,
    advice: <span>Set up <L href="/artificial-intelligence-marketing-services-offered">automated follow-up</L>: instant confirmation email/text when a form is submitted, notification to your phone within seconds, and a 3-part follow-up sequence if they don&apos;t respond. Speed to lead wins 78% of jobs.</span>,
    secret: <span>The business that responds first gets the job 78% of the time — regardless of price, reviews, or reputation. An <L href="/artificial-intelligence-marketing-services-offered">AI agent</L> that responds to inquiries in 30 seconds while you&apos;re on a job site isn&apos;t a luxury. It&apos;s the difference between winning and losing every lead your <L href="/nyc-marketing-company-services-list">SEO</L> generates.</span>,
  },
  {
    phase: "growth",
    step: "Create Video Content",
    issue: <span>Your competitors are posting project walkthroughs and tip videos on YouTube. You have zero videos. You&apos;re missing the second-largest search engine entirely.</span>,
    advice: <span>Start with 5 simple videos: introduce yourself, show a project from start to finish, answer your top FAQ, tour your workspace, and share a customer success story. You don&apos;t need Hollywood production — authenticity beats polish for <L href="/industries-we-offer-marketing-services-for">local businesses</L>.</span>,
    secret: <span>Embed YouTube videos on your <L href="/nyc-marketing-company-services-list">website</L> service pages. Google owns YouTube and rewards websites that include video content with higher engagement metrics. A 2-minute video of a kitchen remodel on your &ldquo;Kitchen Remodeling <L href="/services-areas-we-offer-marketing-services-in/brooklyn-marketing-company">Brooklyn</L>&rdquo; page dramatically increases time-on-page and conversion rates.</span>,
  },
  {
    phase: "growth",
    step: "Implement Structured Internal Linking",
    issue: <span>Your website pages are islands — no links between them. Google can&apos;t understand your site structure, and visitors can&apos;t navigate to related content.</span>,
    advice: <span>Link every service page to related services, relevant <L href="/services-areas-we-offer-marketing-services-in">area pages</L>, your <L href="/nyc-marketing-pricing-guide">pricing page</L>, and <L href="/nyc-marketing-company-portfolio">portfolio</L>. Link area pages to the services available there. Create a web of connections that tells Google your topical authority and keeps visitors engaged longer.</span>,
    secret: <span>Internal link anchor text is a powerful ranking signal that most businesses ignore. Linking &ldquo;plumber in Brooklyn&rdquo; to your Brooklyn plumbing page tells Google exactly what that page is about. We build 50–100 internal links across every site — it&apos;s one of the highest-leverage SEO tactics that costs nothing.</span>,
  },
  {
    phase: "growth",
    step: "Build a Testimonials and Case Studies Page",
    issue: <span>You have great reviews on Google but your website says nothing about your results. Visitors who don&apos;t check Google reviews see zero social proof.</span>,
    advice: <span>Create a dedicated <L href="/nyc-marketing-company-portfolio">portfolio/results page</L> with detailed case studies: the problem, your solution, and the measurable outcome. Include real numbers, real photos, and real customer names (with permission). This page is your most powerful sales tool.</span>,
    secret: <span>Case studies with specific numbers outperform generic testimonials by 4x. &ldquo;We helped a Brooklyn plumber go from 5 calls/month to 45 calls/month in 6 months&rdquo; is infinitely more compelling than &ldquo;Great service, highly recommend!&rdquo; Show the transformation, not just the praise.</span>,
  },
  {
    phase: "growth",
    step: "Segment Your Services Into Categories",
    issue: <span>You offer 15 services but they&apos;re all dumped on one page. Google doesn&apos;t know if you&apos;re a plumber, HVAC tech, or electrician. Neither do customers.</span>,
    advice: <span>Organize services into logical categories on your <L href="/nyc-marketing-company-services-list">website</L>: Emergency Services, Maintenance, Installation, Remodeling. Each category gets a hub page, and each service gets a detailed page underneath. This creates a topical hierarchy Google loves.</span>,
    secret: <span>This is called &ldquo;content siloing&rdquo; and it&apos;s how major brands dominate search. When Google sees a well-organized site about plumbing with 20 interlinked pages covering every subtopic, it knows you&apos;re the authority. A site with 3 random pages about plumbing, HVAC, and electrical confuses the algorithm.</span>,
  },
  {
    phase: "growth",
    step: "Start A/B Testing Your Website",
    issue: <span>You built your website once and never changed it. You don&apos;t know if your headline, button color, or form length is costing you leads.</span>,
    advice: <span>Test one element at a time: your headline, your CTA button text, your form fields, your hero image. Run each test for 2–4 weeks with enough traffic to reach statistical significance. Small changes can yield 20–50% conversion improvements.</span>,
    secret: <span>The #1 A/B test that wins almost universally for <L href="/industries-we-offer-marketing-services-for">local business</L> websites: changing the CTA from &ldquo;Contact Us&rdquo; to something specific like &ldquo;Get a Free Quote&rdquo; or &ldquo;Schedule My Free Inspection.&rdquo; Specificity beats generality every time. Test it — you&apos;ll see.</span>,
  },
  {
    phase: "growth",
    step: "Master Google Search Console",
    issue: <span>You&apos;re ranked #14 for 30 keywords — page 2, invisible. You don&apos;t know you&apos;re that close to breaking through.</span>,
    advice: <span>Google Search Console shows you every keyword your site appears for, your average position, click-through rate, and impressions. Filter for positions 8–20 — these are your &ldquo;striking distance&rdquo; keywords. A small content or link building push moves them to page 1.</span>,
    secret: <span>The fastest SEO wins come from keywords where you&apos;re already on page 2. Updating the content on those pages — adding 300 words, improving the title tag, building 2–3 backlinks — can move you to page 1 in weeks. This is the first thing we do for new <L href="/nyc-marketing-pricing-guide">SEO clients</L> — it delivers results while the larger strategy builds.</span>,
  },
  {
    phase: "growth",
    step: "Build Relationships with Local Media",
    issue: <span>Your competitors get mentioned in local news sites, neighborhood blogs, and community publications. You don&apos;t. Those mentions are backlinks that boost their rankings.</span>,
    advice: <span>Pitch local journalists and bloggers with genuine stories: a community project you completed, advice for homeowners, or a trend in your <L href="/industries-we-offer-marketing-services-for">industry</L>. Local publications are always looking for content from local experts. Be helpful, not promotional.</span>,
    secret: <span>One link from a local .edu, .gov, or news site is worth 50+ directory links. A mention in Brooklyn Daily Eagle, Gothamist, or your local Patch.com creates permanent authority that compounds forever. These links can&apos;t be bought — they must be earned through genuine local engagement.</span>,
  },
  {
    phase: "growth",
    step: "Implement Seasonal Marketing Campaigns",
    issue: <span>Your marketing is the same year-round. You miss seasonal surges — AC demand in June, heating in November, tax prep in March. Your competitors plan ahead and capture the surge.</span>,
    advice: <span>Map your seasonal demand cycles and create content 2–3 months before each peak. Publish &ldquo;AC tune-up checklist&rdquo; in April to rank by June. Publish &ldquo;holiday catering guide&rdquo; in September to rank by November. <L href="/nyc-marketing-company-services-list">SEO</L> needs lead time to rank.</span>,
    secret: <span>Google Search Trends shows you the exact week each seasonal search peaks in your area. Build your content calendar around these dates — not industry assumptions. NYC seasonal patterns are different from national patterns. AC searches in NYC spike 2 weeks later than in Texas.</span>,
  },
  {
    phase: "growth",
    step: "Create a Resource That Earns Links Naturally",
    issue: <span>You&apos;re struggling to build backlinks because you have nothing worth linking to. Your site is just service pages and a contact form.</span>,
    advice: <span>Create a genuinely useful resource for your community: a &ldquo;NYC Homeowner&apos;s Maintenance Guide,&rdquo; a &ldquo;Cost of Living by Neighborhood Calculator,&rdquo; or a comprehensive <L href="/nyc-marketing-101-guide">marketing guide like this one</L>. Resources that provide real value get shared and linked to naturally.</span>,
    secret: <span>The best link-earning content answers a question that gets asked repeatedly but has no great answer online. Use Google&apos;s &ldquo;People Also Ask&rdquo; and Reddit/Quora to find these gaps. A comprehensive answer that becomes the definitive resource on a topic can earn hundreds of backlinks organically.</span>,
  },
  {
    phase: "growth",
    step: "Set Up Retargeting",
    issue: <span>97% of website visitors leave without converting. They saw you once, forgot you, and hired someone else. That traffic is wasted.</span>,
    advice: <span>Install retargeting pixels (Meta, Google) on your <L href="/nyc-marketing-company-services-list">website</L>. When visitors leave, your ads follow them across the internet — reminding them you exist. It&apos;s the most cost-effective advertising because you&apos;re targeting people who already showed interest.</span>,
    secret: <span>Retargeting ads with a specific offer (&ldquo;Still need a plumber? 10% off this week&rdquo;) convert 10x better than generic brand awareness ads. The visitor already knows who you are — now give them a reason to come back. Keep the landing page identical to what they originally visited.</span>,
  },
  {
    phase: "growth",
    step: "Build an Email Nurture Sequence",
    issue: <span>You have 500 email subscribers and send them nothing. Or you blast one generic newsletter quarterly that nobody reads. Your list is rotting.</span>,
    advice: <span>Create a 5-email welcome sequence for new subscribers: introduce your business, share your best content, showcase a case study, offer a seasonal tip, and present a soft CTA. Then send monthly value emails — tips, local updates, and one promotion per month maximum.</span>,
    secret: <span>Segmented emails generate 760% more revenue than generic blasts. Segment by service interest, neighborhood, or customer type. A <L href="/services-areas-we-offer-marketing-services-in/westchester-marketing-company">Westchester</L> homeowner gets different emails than a <L href="/services-areas-we-offer-marketing-services-in/brooklyn-marketing-company">Brooklyn</L> renter. Relevance is the difference between 2% open rates and 35%.</span>,
  },
  {
    phase: "growth",
    step: "Audit Your Website Accessibility",
    issue: <span>Your website doesn&apos;t work for people using screen readers, keyboard navigation, or with visual impairments. You&apos;re excluding customers AND risking ADA lawsuits.</span>,
    advice: <span>Run your site through an accessibility checker (WAVE, axe). Fix contrast ratios, add alt text to images, ensure keyboard navigation works, and use proper heading hierarchy. Accessibility isn&apos;t optional — it&apos;s legal compliance and smart business.</span>,
    secret: <span>Accessible websites tend to rank better because accessibility best practices (semantic HTML, alt text, proper headings, fast load times) overlap heavily with <L href="/nyc-marketing-company-services-list">SEO</L> best practices. Fixing accessibility issues often improves your rankings as a side effect.</span>,
  },
  {
    phase: "growth",
    step: "Diversify Your Lead Sources",
    issue: <span>100% of your leads come from Google. If Google changes its algorithm tomorrow and your rankings drop, your business stops overnight.</span>,
    advice: <span>Build multiple lead channels: <L href="/nyc-marketing-company-services-list">organic SEO</L>, Google Maps, Yelp, referral program, email marketing, direct mail to <L href="/services-areas-we-offer-marketing-services-in">target neighborhoods</L>, and community partnerships. No single channel should represent more than 40% of your leads.</span>,
    secret: <span>The most resilient businesses have 4–5 reliable lead sources. When one dips, others compensate. But here&apos;s the hierarchy: <L href="/nyc-marketing-company-services-list">SEO</L> first (lowest cost per lead long-term), referrals second (highest close rate), then everything else. Build the foundation before diversifying.</span>,
  },
  {
    phase: "growth",
    step: "Create Before-and-After Content",
    issue: <span>You tell people you do great work. They don&apos;t believe you because every business says that. You have no visual proof.</span>,
    advice: <span>Document every transformation: before/after photos, problem/solution narratives, and measurable outcomes. A <L href="/industries-we-offer-marketing-services-for/contractor-marketing">contractor&apos;s</L> before/after gallery is the most-visited page on their site. A <L href="/industries-we-offer-marketing-services-for/dental-practice-marketing">dentist&apos;s</L> smile gallery converts higher than any testimonial.</span>,
    secret: <span>Before/after content ranks exceptionally well in Google Image Search — an overlooked traffic source for <L href="/industries-we-offer-marketing-services-for">local businesses</L>. Tag every image with descriptive alt text: &ldquo;Kitchen remodel before and after in <L href="/services-areas-we-offer-marketing-services-in/park-slope-marketing-company">Park Slope</L> Brooklyn.&rdquo; Image search sends qualified traffic that converts at 2x the rate of regular search.</span>,
  },
  {
    phase: "growth",
    step: "Implement Live Chat or AI Chat",
    issue: <span>It&apos;s 9 PM and a customer is on your website ready to book. Your office is closed. No one answers the phone. They go to the competitor who responds instantly.</span>,
    advice: <span>Add <L href="/artificial-intelligence-marketing-services-offered">AI-powered chat</L> to your website. It answers common questions, qualifies leads, and books appointments 24/7. For <L href="/industries-we-offer-marketing-services-for/home-service-business-marketing">service businesses</L> that can&apos;t be by their phone all day, this captures leads that would otherwise be lost to competitors.</span>,
    secret: <span>Websites with live chat or AI chat convert 45% more visitors into leads. The key is the first response — it must be instant (under 30 seconds) and helpful (not &ldquo;Please hold while we connect you&rdquo;). An <L href="/artificial-intelligence-marketing-services-offered">AI agent</L> that immediately engages with the visitor&apos;s specific question wins the lead.</span>,
  },
  {
    phase: "growth",
    step: "Build Strategic Partnerships",
    issue: <span>You&apos;re competing for every customer individually. You have no referral network, no partnerships, no system for warm leads.</span>,
    advice: <span>Partner with complementary businesses: a <L href="/industries-we-offer-marketing-services-for/plumber-marketing">plumber</L> partners with electricians and GCs. A <L href="/industries-we-offer-marketing-services-for/dental-practice-marketing">dentist</L> partners with orthodontists and oral surgeons. A <L href="/industries-we-offer-marketing-services-for/real-estate-agent-marketing">real estate agent</L> partners with mortgage brokers and inspectors. Cross-refer customers and build a network that feeds everyone.</span>,
    secret: <span>Formalize partnerships with a written referral agreement, not a handshake. Track referrals in both directions. The businesses that build structured referral networks with 3–5 complementary partners in their <L href="/services-areas-we-offer-marketing-services-in">area</L> generate 30–50% of their leads from warm referrals at zero acquisition cost.</span>,
  },

  // ═══════════════════════════════════════════════════════════
  // PHASE 4: SCALING UP (61–80)
  // ═══════════════════════════════════════════════════════════
  {
    phase: "scale",
    step: "Hire a Marketing Professional",
    issue: <span>You&apos;ve been handling marketing yourself or with a cheap freelancer. Growth has plateaued because marketing quality and consistency are limited by your time and expertise.</span>,
    advice: <span><L href="/contact-nyc-marketing-company-consortium-nyc">Partner with specialists</L> who do this every day. A dedicated <L href="/nyc-marketing-company-services-list">marketing partner</L> brings strategy, execution, tools, and experience you don&apos;t have time to develop. The cost of a professional is always less than the cost of amateur marketing that doesn&apos;t work.</span>,
    secret: <span>The ROI inflection point for most local businesses is around $5,000/month in revenue from marketing channels. Below that, DIY makes sense. Above that, every dollar spent on professional <L href="/nyc-marketing-pricing-guide">SEO and marketing</L> returns 5–15x. The businesses that scale are the ones that stop trying to do it themselves at the right time.</span>,
  },
  {
    phase: "scale",
    step: "Build a Content Machine",
    issue: <span>You publish content sporadically. Some months 5 posts, some months zero. Inconsistency undermines your authority and confuses Google.</span>,
    advice: <span>Systematize content production: 8 pieces/month minimum. 4 service/location pages, 2 blog posts, 2 GBP posts per week. Map every piece to a target keyword and <L href="/services-areas-we-offer-marketing-services-in">area</L>. Batch produce content monthly so you&apos;re never scrambling for topics.</span>,
    secret: <span>Content velocity — the rate at which you publish quality content — is a measurable ranking signal. Sites that publish consistently rank faster and higher than sites that publish in bursts. Google trusts active, growing sites. A steady 8 posts/month for 12 months (96 pieces) builds a moat no competitor can match overnight.</span>,
  },
  {
    phase: "scale",
    step: "Automate Everything That Doesn't Require You",
    issue: <span>You&apos;re still manually sending review requests, following up with leads, scheduling posts, and managing email campaigns. These hours could be spent on revenue-generating work.</span>,
    advice: <span>Implement <L href="/artificial-intelligence-marketing-services-offered">AI automation</L> for: lead follow-up (instant), review requests (automated), appointment reminders (scheduled), social media posting (batched), and email sequences (triggered). Free up 15–20 hours/week of manual work.</span>,
    secret: <span>The businesses that scale past $500K aren&apos;t working harder — they&apos;re automating everything that doesn&apos;t require human judgment. <L href="/artificial-intelligence-marketing-services-offered">AI automation</L> handles the 80% of tasks that are repetitive so you and your team can focus on the 20% that actually requires expertise and personal touch.</span>,
  },
  {
    phase: "scale",
    step: "Expand to Adjacent Service Areas",
    issue: <span>You dominate your home neighborhood but haven&apos;t expanded. There are 10 surrounding areas with customers searching for your services and finding competitors instead.</span>,
    advice: <span>Build landing pages for each new target <L href="/services-areas-we-offer-marketing-services-in">area</L>, get listed in those areas&apos; local directories, and create locally-relevant content. Expand in concentric circles — neighboring areas first, then broader geography. Each new area is a new revenue stream.</span>,
    secret: <span>When expanding to a new area, start with the neighborhoods that have the weakest competition, not the biggest population. A <L href="/services-areas-we-offer-marketing-services-in/great-kills-marketing-company">Great Kills</L> page might rank in 2 weeks while a <L href="/services-areas-we-offer-marketing-services-in/manhattan-marketing-company">Manhattan</L> page takes 6 months. Stack quick wins across multiple low-competition areas while the bigger plays build momentum.</span>,
  },
  {
    phase: "scale",
    step: "Build a Dashboard That Shows Everything",
    issue: <span>Your data is scattered across Google Analytics, Search Console, your CRM, call tracking, and review platforms. You have no single view of how your marketing is performing.</span>,
    advice: <span>Build a unified marketing dashboard that shows: leads by source, keyword rankings, organic traffic, review count, conversion rates, and cost per lead — all in one view. Check it weekly. Make decisions based on data, not gut feelings.</span>,
    secret: <span>The single most important number on your dashboard: trailing 90-day cost per lead by channel. This one metric tells you where to invest more, where to cut, and whether your marketing is getting better or worse over time. Every other metric is a supporting actor.</span>,
  },
  {
    phase: "scale",
    step: "Create a Customer Retention Program",
    issue: <span>You focus 100% on acquiring new customers. Meanwhile, past customers who already know and trust you are hiring your competitors for their next job because you never followed up.</span>,
    advice: <span>Build a retention system: seasonal maintenance reminders, annual check-up emails, loyalty discounts, and a quarterly newsletter with tips. Acquiring a new customer costs 5–7x more than retaining an existing one. Your past customers are your most profitable audience.</span>,
    secret: <span>A simple &ldquo;It&apos;s been 12 months since your last service — time for a checkup?&rdquo; email generates a 15–25% response rate when automated with proper timing. For <L href="/industries-we-offer-marketing-services-for/hvac-company-marketing">HVAC companies</L>, <L href="/industries-we-offer-marketing-services-for/dental-practice-marketing">dentists</L>, and <L href="/industries-we-offer-marketing-services-for/auto-repair-shop-marketing">auto shops</L>, this single automation can generate 20%+ of annual revenue from existing customers at near-zero cost.</span>,
  },
  {
    phase: "scale",
    step: "Dominate Long-Tail Keywords",
    issue: <span>You&apos;re fighting over head terms like &ldquo;plumber NYC&rdquo; against 500 competitors. The competition is fierce and you&apos;re stuck on page 2.</span>,
    advice: <span>Target long-tail keywords: &ldquo;emergency gas leak repair <L href="/services-areas-we-offer-marketing-services-in/park-slope-marketing-company">Park Slope</L> Brooklyn,&rdquo; &ldquo;tankless water heater installation <L href="/services-areas-we-offer-marketing-services-in/astoria-marketing-company">Astoria</L> Queens.&rdquo; These have lower search volume but much higher conversion rates. A customer searching a 6-word phrase knows exactly what they want.</span>,
    secret: <span>Long-tail keywords collectively drive more traffic than head terms. A site with 200 pages ranking for 200 specific long-tail keywords will generate more leads than one page trying to rank for &ldquo;plumber NYC.&rdquo; This is the foundation of <L href="/nyc-marketing-company-services-list">programmatic SEO</L> — and it&apos;s how we build marketing systems that scale.</span>,
  },
  {
    phase: "scale",
    step: "Invest in Your Brand Identity",
    issue: <span>Your business has grown but your brand still looks like you designed it yourself in 2015. Your truck, website, business cards, and uniform don&apos;t match. Customers perceive you as smaller than you are.</span>,
    advice: <span>Invest in professional <L href="/nyc-marketing-company-services-list">brand identity</L>: logo, color system, typography, brand guidelines, vehicle wraps, signage, and unified digital presence. A cohesive brand communicates professionalism, builds trust, and commands higher prices.</span>,
    secret: <span>Businesses with strong, consistent branding charge 20–30% higher prices than competitors with generic or inconsistent branding. Customers pay a premium for perceived quality and trustworthiness. A <L href="/nyc-marketing-company-services-list">$2,000 branding investment</L> that lets you charge $50 more per job pays for itself in 40 jobs. After that, it&apos;s pure margin.</span>,
  },
  {
    phase: "scale",
    step: "Build a Sales Process for Inbound Leads",
    issue: <span>You generate 40 leads/month but only close 8. Your close rate is 20% because you don&apos;t have a follow-up process — leads go stale.</span>,
    advice: <span>Create a defined process: respond within 5 minutes (or use <L href="/artificial-intelligence-marketing-services-offered">AI automation</L>), qualify the lead (budget, timeline, location), follow up 3x if no response (day 1, day 3, day 7), and track everything in a CRM. A structured process can double your close rate without increasing lead volume.</span>,
    secret: <span>80% of sales happen between the 5th and 12th contact. Most businesses give up after 1–2 attempts. An automated follow-up sequence that persists politely over 2 weeks captures the 60% of leads that weren&apos;t ready on first contact. This single system can double revenue from the same traffic.</span>,
  },
  {
    phase: "scale",
    step: "Expand Into Adjacent Services",
    issue: <span>You&apos;ve maxed out your primary service. Growth requires either more geography or more services. You&apos;re ready to expand your offering.</span>,
    advice: <span>Add services your existing customers already ask for. A plumber adds water heater installation. A <L href="/industries-we-offer-marketing-services-for/landscaping-company-marketing">landscaper</L> adds hardscaping. A <L href="/industries-we-offer-marketing-services-for/dental-practice-marketing">dentist</L> adds cosmetic services. Build dedicated pages, target keywords, and leverage your existing authority to rank faster.</span>,
    secret: <span>Expanding services on an established domain with existing authority is 5x easier than starting from scratch. Google already trusts your site for your primary topic. Adding a related service page inherits that trust immediately. This is why established businesses can rank new service pages in weeks while new businesses take months.</span>,
  },
  {
    phase: "scale",
    step: "Build a Training System for Your Team",
    issue: <span>Only you know how to handle leads, respond to reviews, and manage the GBP. If you&apos;re sick for a week, marketing stops.</span>,
    advice: <span>Document every marketing process: how to respond to reviews, how to post on GBP, how to handle inbound calls, lead qualification script, and CRM usage. Create simple SOPs so any team member can maintain marketing continuity.</span>,
    secret: <span>The businesses that scale past $1M have systems that run without the owner. If your marketing requires your daily involvement, you have a job, not a business. Build the system, document it, train your team, and your marketing becomes an asset that generates revenue whether you&apos;re there or not.</span>,
  },
  {
    phase: "scale",
    step: "Test Paid Advertising Strategically",
    issue: <span>Your organic channels are strong, but you&apos;re leaving money on the table during peak seasons. You could accelerate growth with paid traffic but don&apos;t want to waste money.</span>,
    advice: <span>Use paid ads to amplify what&apos;s already working organically. If &ldquo;emergency plumber Brooklyn&rdquo; is your top organic keyword, run ads on it too — dominate both paid and organic. Start with Google Local Service Ads for <L href="/industries-we-offer-marketing-services-for/home-service-business-marketing">home services</L> — you only pay per qualified lead.</span>,
    secret: <span>The best paid ad strategy for <L href="/industries-we-offer-marketing-services-for">local businesses</L>: run ads only on keywords where you rank positions 4–10 organically. You already have organic credibility, and the ad gives you double visibility. This &ldquo;stacking&rdquo; strategy generates more clicks than either paid or organic alone, at a lower cost per click.</span>,
  },
  {
    phase: "scale",
    step: "Monitor Your Online Reputation Proactively",
    issue: <span>A negative review appears on Yelp and you don&apos;t see it for 3 weeks. By then, 500 potential customers have seen it unanswered.</span>,
    advice: <span>Set up Google Alerts for your business name and monitor review platforms weekly. Use reputation management tools that notify you instantly when a new review appears anywhere. Respond within 24 hours — positive or negative.</span>,
    secret: <span>Proactively generating positive reviews is the best defense against negative ones. A business with 200 positive reviews and 5 negative ones (97.5% positive) is perceived much better than a business with 10 positive and 1 negative (91%). Volume dilutes the impact of any single negative review.</span>,
  },
  {
    phase: "scale",
    step: "Create Industry-Specific Content Hubs",
    issue: <span>You serve 5 different customer types but your website treats them all the same. A homeowner and a property manager have completely different needs and search behaviors.</span>,
    advice: <span>Build dedicated <L href="/industries-we-offer-marketing-services-for">industry pages</L> for each customer segment: residential, commercial, property management, new construction. Each hub speaks directly to that audience&apos;s pain points, uses their language, and showcases relevant case studies.</span>,
    secret: <span>Industry-specific pages rank for commercial-intent keywords that generic pages miss. &ldquo;Commercial HVAC maintenance contract <L href="/services-areas-we-offer-marketing-services-in/manhattan-marketing-company">Manhattan</L>&rdquo; is a search that&apos;s worth $10,000+ per conversion. These pages attract high-value clients who aren&apos;t comparing your $150 service call against a competitor&apos;s $125 — they&apos;re evaluating capability and trust.</span>,
  },
  {
    phase: "scale",
    step: "Negotiate for Premium Directory Placements",
    issue: <span>You&apos;re listed on 80 directories but buried on page 5 of each one. Visibility within the directory is almost as important as being listed at all.</span>,
    advice: <span>Contact your top-performing directories (based on lead tracking data) and explore premium placements. Some offer enhanced listings, featured spots, or sponsored placements that dramatically increase visibility within the platform.</span>,
    secret: <span>Before paying for any premium listing, check the directory&apos;s domain authority and whether Google is actually showing their pages in search results for your keywords. An expensive premium listing on a directory that Google doesn&apos;t rank is money wasted. Track leads from each directory for 90 days before upgrading.</span>,
  },
  {
    phase: "scale",
    step: "Implement Advanced Analytics",
    issue: <span>You know how many leads you get but you don&apos;t know which specific pages, blog posts, or keywords generate the most revenue — not just the most traffic.</span>,
    advice: <span>Set up end-to-end attribution: connect your <L href="/nyc-marketing-company-services-list">website analytics</L> to your CRM so you can see which keyword → which page → which lead → which job → which revenue. This lets you calculate true ROI by marketing action, not just by channel.</span>,
    secret: <span>When you can trace a specific blog post to a specific customer to a specific revenue amount, your marketing becomes a science, not an art. We&apos;ve seen clients discover that one blog post generates $40K/year in attributable revenue. That insight changes everything about how you allocate budget.</span>,
  },
  {
    phase: "scale",
    step: "Build a Referral Pipeline with Real Estate Agents",
    issue: <span>New homeowners are the highest-value <L href="/industries-we-offer-marketing-services-for/home-service-business-marketing">home service</L> customers — they need everything: plumbing, electrical, HVAC, painting, landscaping. But you have no pipeline to reach them at the moment they move in.</span>,
    advice: <span>Partner with <L href="/industries-we-offer-marketing-services-for/real-estate-agent-marketing">real estate agents</L> in your <L href="/services-areas-we-offer-marketing-services-in">service area</L>. Offer their clients a new-homeowner discount. In exchange, the agent looks like a hero who connects their buyer with trusted local pros. Win-win-win.</span>,
    secret: <span>A single productive real estate agent relationship can generate 5–10 referrals per year at zero acquisition cost. Build relationships with 5 agents across your service area and you have 25–50 warm leads annually — customers who already trust you because someone they trust recommended you.</span>,
  },
  {
    phase: "scale",
    step: "Protect Your Brand Online",
    issue: <span>Someone registered a domain similar to yours. A competitor is bidding on your brand name in Google Ads. Fake reviews are appearing on your profile.</span>,
    advice: <span>Register common misspellings of your domain, bid on your own brand name in Google Ads (it&apos;s cheap and prevents competitors from stealing your traffic), and report fake reviews through Google&apos;s dispute process. Brand protection is an ongoing task, not a one-time setup.</span>,
    secret: <span>Bidding on your own brand name in Google Ads costs $0.10–$0.50 per click and prevents competitors from occupying the top ad slot when someone searches for you by name. The alternative is a competitor paying $5/click to intercept customers who are actively looking for YOUR business. Protect what you&apos;ve built.</span>,
  },

  // ═══════════════════════════════════════════════════════════
  // PHASE 5: MASTERY (81–101)
  // ═══════════════════════════════════════════════════════════
  {
    phase: "mastery",
    step: "Think in Systems, Not Tactics",
    issue: <span>You&apos;ve tried dozens of marketing tactics over the years. Some worked, some didn&apos;t. But nothing connects. Your marketing is a collection of experiments, not a machine.</span>,
    advice: <span>Build a marketing system where every piece amplifies every other piece: <L href="/nyc-marketing-company-services-list">SEO</L> drives traffic → your website converts visitors → <L href="/artificial-intelligence-marketing-services-offered">automation</L> follows up → reviews build authority → authority improves rankings → the cycle repeats. This is how you build a marketing machine that runs without you.</span>,
    secret: <span>The difference between businesses that grow 5% per year and businesses that grow 50% is systems thinking. Individual tactics plateau. Integrated systems compound. That&apos;s the <L href="/about-digital-marketing-agency-consortium-nyc">The NYC Marketing Company philosophy</L> — every service we offer is designed to amplify every other service.</span>,
  },
  {
    phase: "mastery",
    step: "Master the Art of Saying No",
    issue: <span>You take every customer who calls, even the ones who waste your time, negotiate on price, and leave bad reviews. Not every customer is a good customer.</span>,
    advice: <span>Define your ideal customer profile and build your marketing to attract only them. Higher <L href="/nyc-marketing-pricing-guide">prices</L>, stronger messaging, and niche positioning naturally filter out tire-kickers. The best businesses say no more than they say yes.</span>,
    secret: <span>When you fire your worst 10% of customers and raise prices 15%, your revenue stays the same and your profit increases 30%+. Your team is happier, your reviews are better, and you have capacity for better customers. Marketing isn&apos;t about getting more customers — it&apos;s about getting the right ones.</span>,
  },
  {
    phase: "mastery",
    step: "Build Your Personal Authority",
    issue: <span>Your business is known, but you&apos;re not. If you left, the brand would lose its credibility. Personal authority amplifies business authority and survives any algorithm change.</span>,
    advice: <span>Publish expert content under your name: LinkedIn articles, local publication columns, speaking at industry events, podcast appearances, and YouTube videos. Your personal expertise becomes a backlink magnet, a trust signal, and an unassailable competitive advantage.</span>,
    secret: <span>Google&apos;s E-E-A-T framework (Experience, Expertise, Authoritativeness, Trustworthiness) increasingly rewards content from recognized experts. An <L href="/about-digital-marketing-agency-consortium-nyc">author with 25 years of verifiable experience</L> outranks anonymous AI content every time. Build your author authority now — it&apos;s becoming the most important ranking factor.</span>,
  },
  {
    phase: "mastery",
    step: "Create Proprietary Data and Research",
    issue: <span>You share the same generic industry stats as everyone else. Nothing positions you as uniquely authoritative. Your content is interchangeable with any competitor&apos;s.</span>,
    advice: <span>Conduct original research from your own data: &ldquo;We analyzed 500 plumbing calls in <L href="/services-areas-we-offer-marketing-services-in/brooklyn-marketing-company">Brooklyn</L> — here&apos;s what homeowners actually need most.&rdquo; Proprietary data can&apos;t be replicated, earns backlinks naturally, and positions you as the definitive source.</span>,
    secret: <span>Original data gets shared by journalists, bloggers, and industry publications because it&apos;s unique and citable. A single original data piece can earn 50+ high-authority backlinks that would cost $10,000+ to acquire through traditional link building. Your business data is a gold mine — mine it.</span>,
  },
  {
    phase: "mastery",
    step: "Build Multiple Revenue Streams from Content",
    issue: <span>Your content only serves one purpose: SEO rankings. But the same content can generate revenue in 5 different ways if you think bigger.</span>,
    advice: <span>Repurpose every piece of content: blog post → YouTube video → Instagram carousel → email newsletter → podcast episode → lead magnet. One piece of content, distributed across 6 channels, reaches 10x the audience at 10% the creation cost.</span>,
    secret: <span>The highest-value content format for <L href="/industries-we-offer-marketing-services-for">local businesses</L> in 2026 is short-form video repurposed from long-form content. A 10-minute YouTube tutorial becomes 15 Instagram Reels, 15 TikToks, and 15 YouTube Shorts. That&apos;s 45 pieces of content from one recording session. Distribution beats creation.</span>,
  },
  {
    phase: "mastery",
    step: "Develop a Moat Your Competitors Can't Cross",
    issue: <span>Everything you do in marketing can be copied. Your competitor can build a similar website, target the same keywords, and match your pricing. Where&apos;s your moat?</span>,
    advice: <span>Your moat is the compound effect of time + consistency: 500 reviews, 200 indexed pages, 100 backlinks, 5 years of content, and deep relationships across <L href="/services-areas-we-offer-marketing-services-in">80+ neighborhoods</L>. These take years to build and can&apos;t be bought overnight. Start building today.</span>,
    secret: <span>The ultimate moat is brand recognition. When customers search for &ldquo;plumber Brooklyn&rdquo; and recognize YOUR name in the results, they click you even if you&apos;re not #1. Brand + SEO = the highest click-through rates possible. This is why <L href="/nyc-marketing-company-services-list">branding</L> and SEO are inseparable at the mastery level.</span>,
  },
  {
    phase: "mastery",
    step: "Anticipate Google's Next Move",
    issue: <span>You react to algorithm updates after they happen. By the time you adjust, you&apos;ve lost 3 months of rankings. Reactive marketing is expensive marketing.</span>,
    advice: <span>Study Google&apos;s public statements, patent filings, and Search Quality Rater Guidelines. The direction is clear: EEAT, helpful content, page experience, and AI-generated content policies. Build for where Google is going, not where it was. Read <L href="/whats-working-in-marketing">what&apos;s working right now</L>.</span>,
    secret: <span>Every major Google update in the last 5 years has moved in the same direction: rewarding genuine expertise and penalizing shortcuts. The businesses that never took shortcuts don&apos;t fear updates — they benefit from them. Build real authority with real content from real experts and you&apos;ll gain traffic every time Google raises the bar.</span>,
  },
  {
    phase: "mastery",
    step: "Build a Marketing Budget That Scales",
    issue: <span>You spend a flat dollar amount on marketing regardless of revenue. When revenue grows, marketing stays flat and growth stalls. When revenue dips, you cut marketing — making it worse.</span>,
    advice: <span>Allocate 5–10% of revenue to marketing as a baseline. In growth phases, push to 12–15%. Never cut to zero — that&apos;s pulling the engine out of a moving car. The businesses that grow consistently treat marketing as a percentage, not a fixed cost.</span>,
    secret: <span>The most successful <L href="/industries-we-offer-marketing-services-for">local businesses</L> we work with spend 8% of revenue on marketing in years 1–3, then 5% from year 4 on — because <L href="/nyc-marketing-company-services-list">SEO</L> compounds. By year 5, your cost per lead is a fraction of year 1. The investment decreases as a percentage while the return increases. That&apos;s the power of compound marketing.</span>,
  },
  {
    phase: "mastery",
    step: "Mentor and Give Back to Your Community",
    issue: <span>You&apos;ve built a successful business but you&apos;re not giving back. Community engagement feels like a distraction from running your business.</span>,
    advice: <span>Sponsor local events, mentor young entrepreneurs, host workshops, and share your expertise freely. Community engagement builds brand love, earns local press (and backlinks), and creates a network of advocates who refer business your way without being asked.</span>,
    secret: <span>Local businesses that are actively involved in their <L href="/services-areas-we-offer-marketing-services-in">community</L> get mentioned in local press 3x more often than those that aren&apos;t. Each mention is a backlink. Each backlink strengthens your SEO. Giving back isn&apos;t just good ethics — it&apos;s the most authentic link-building strategy that exists.</span>,
  },
  {
    phase: "mastery",
    step: "Build a Succession Plan for Your Marketing",
    issue: <span>Your entire marketing knowledge lives in your head. If you step back, get sick, or sell the business, the marketing dies with your involvement.</span>,
    advice: <span>Document everything: strategies, SOPs, vendor relationships, login credentials, content calendars, brand guidelines, and analytics access. Your marketing system should be transferable. A business worth buying has marketing that works without the founder.</span>,
    secret: <span>Businesses with documented, systematized marketing sell for 2–3x higher multiples than businesses where marketing depends on the owner. If exit planning is ever in your future, the time to systematize is now — not when you&apos;re ready to sell. The buyer pays for the system, not your hustle.</span>,
  },
  {
    phase: "mastery",
    step: "Master the Balance of Art and Science",
    issue: <span>You&apos;ve become so data-driven that your marketing has lost its humanity. Everything is optimized for algorithms. Nothing feels genuine anymore.</span>,
    advice: <span>Data tells you where. Creativity tells you how. The best marketing combines rigorous analytics with authentic storytelling, genuine customer relationships, and a <L href="/nyc-marketing-company-services-list">brand</L> that people actually feel something about. Never let the spreadsheet kill the soul of your business.</span>,
    secret: <span>The most successful businesses we&apos;ve worked with over 25 years share one trait: their marketing feels human. Real stories, real photos, real people picking up real phones. In an age of AI and automation, humanity is the ultimate differentiator. Use <L href="/artificial-intelligence-marketing-services-offered">technology</L> to remove friction, not to remove yourself.</span>,
  },
  {
    phase: "mastery",
    step: "Know When Good Enough Is Perfect",
    issue: <span>You spend weeks perfecting a blog post. Your website redesign is 6 months behind because you keep changing the homepage. Perfectionism is killing your momentum.</span>,
    advice: <span>Done beats perfect. A published page that&apos;s 80% perfect generates leads today. A page sitting in drafts at 95% generates nothing. Ship fast, measure results, iterate based on data. The market decides what&apos;s good — not your internal critic.</span>,
    secret: <span>Google rewards pages that are published and improved over time more than pages published once as &ldquo;perfect.&rdquo; Publish today, update monthly based on performance data, and your page improves in rankings continuously. The businesses that publish 100 good pages beat the business that publishes 10 perfect ones. Every time.</span>,
  },
  {
    phase: "mastery",
    step: "Invest in Relationships, Not Just Rankings",
    issue: <span>You&apos;ve spent years building rankings. But rankings change. Algorithms change. Platforms change. The only thing that doesn&apos;t change is human relationships.</span>,
    advice: <span>Build real relationships with customers, partners, vendors, local media, and your <L href="/services-areas-we-offer-marketing-services-in">community</L>. These relationships generate referrals, earn press coverage, create partnership opportunities, and build a brand reputation that survives any algorithm update.</span>,
    secret: <span>After 25 years, the pattern is clear: businesses that invest in relationships outlast businesses that invest only in tactics. Your Google ranking might fluctuate. Your ad costs will rise. Platforms will come and go. But a customer who trusts you will recommend you for life, and that&apos;s marketing money can&apos;t buy.</span>,
  },
  {
    phase: "mastery",
    step: "Play the Long Game",
    issue: <span>Everyone wants results yesterday. You&apos;ve seen enough to know that the businesses that win aren&apos;t the ones that move fastest — they&apos;re the ones that never stop.</span>,
    advice: <span>Marketing is a marathon, not a sprint. The businesses that dominate their <L href="/services-areas-we-offer-marketing-services-in">local market</L> after 10+ years didn&apos;t find a silver bullet — they showed up consistently, invested steadily, and compounded small advantages into an insurmountable lead. Start today. <L href="/contact-nyc-marketing-company-consortium-nyc">Let&apos;s talk about your next move.</L></span>,
    secret: <span>Here&apos;s the truth after 25 years: there is no secret. No hack, no shortcut, no trick that replaces doing the work. The businesses that win are the ones that build the right foundation, hire the right <L href="/about-digital-marketing-agency-consortium-nyc">partners</L>, stay consistent for years, and treat marketing as an investment — not an expense. That&apos;s the only lesson that matters. Everything else is details.</span>,
  },
  {
    phase: "mastery",
    step: "Start Now",
    issue: <span>You just read 100 lessons and feel overwhelmed. There&apos;s too much to do. You don&apos;t know where to begin. So you close this tab and do nothing.</span>,
    advice: <span>Pick ONE lesson from this list that you haven&apos;t done yet. Do it today. Tomorrow, pick another. In 101 days, you&apos;ll have transformed your marketing. Or <L href="/contact-nyc-marketing-company-consortium-nyc">call us at (212) 202-9220</L> and we&apos;ll do it for you — starting with a free strategy session that covers everything on this list for your specific business, <L href="/industries-we-offer-marketing-services-for">industry</L>, and <L href="/services-areas-we-offer-marketing-services-in">market</L>.</span>,
    secret: <span>The real secret? You already know what to do. You&apos;ve known for a while. The only thing separating you from the <L href="/nyc-marketing-company-portfolio">businesses that are winning</L> is execution. Not knowledge. Not budget. Not luck. Execution. So close this tab and go execute. Or better yet — <L href="/contact-nyc-marketing-company-consortium-nyc">let&apos;s execute together</L>.</span>,
  },
];

export default function Marketing101Client() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [activePhase, setActivePhase] = useState<string | null>(null);

  const filtered = activePhase
    ? lessons.filter((l) => l.phase === activePhase)
    : lessons;

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative bg-slate-900 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-teal-400/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <span className="inline-block px-4 py-1.5 text-xs font-bold tracking-[0.2em] uppercase text-teal-300 bg-teal-900/40 rounded-full mb-6 font-cta">
              From Startup to 25-Year Veteran
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-6 font-heading leading-tight">
              Marketing 101:{" "}
              <span className="text-teal-400">101 Lessons</span>
              <br className="hidden sm:block" />
              Every Business Owner Needs
            </h1>
            <p className="text-slate-300 text-lg sm:text-xl max-w-3xl mx-auto mb-4">
              The complete marketing playbook — from your first Google listing to building a machine that runs without you. 25 years of experience distilled into 101 actionable lessons. Each one gives you the step, the issue, the advice, and the secret tip.
            </p>
            <p className="text-slate-400 text-sm max-w-2xl mx-auto mb-8">
              Covers <L href="/nyc-marketing-company-services-list">SEO</L>, <L href="/nyc-marketing-company-services-list">web design</L>, <L href="/nyc-marketing-company-services-list">branding</L>, <L href="/artificial-intelligence-marketing-services-offered">AI automation</L>, <L href="/services-areas-we-offer-marketing-services-in">local marketing</L>, <L href="/nyc-marketing-pricing-guide">pricing</L>, and everything in between for <L href="/industries-we-offer-marketing-services-for">100+ industries</L> across <L href="/services-areas-we-offer-marketing-services-in">NYC, Long Island &amp; Westchester</L>.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/contact-nyc-marketing-company-consortium-nyc"
                className="inline-block px-8 py-4 text-base font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors shadow-lg font-cta"
              >
                Skip Ahead — Talk to an Expert
              </Link>
              <Link
                href="/nyc-marketing-pricing-guide"
                className="inline-block px-8 py-4 text-base font-bold text-white/80 rounded-lg border border-white/20 hover:bg-white/5 transition-colors font-cta"
              >
                See What This Costs
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <TipBlurb
        tip={<>If you&apos;re <strong>new to marketing</strong> or feel like you&apos;ve been burned before, start here. No jargon, no fluff. Just the stuff that <strong>actually works</strong> for real businesses in New York City.</>}
      />

      {/* ── PHASE FILTER ────────────────────────────────────── */}
      <section className="py-6 bg-slate-50 border-b border-slate-100 sticky top-[72px] z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => { setActivePhase(null); setOpenIndex(null); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all font-cta ${
                !activePhase
                  ? "bg-teal-600 text-white border-teal-600"
                  : "text-slate-600 hover:text-teal-600 hover:bg-teal-50 border-slate-200 hover:border-teal-300"
              }`}
            >
              All 101
            </button>
            {phases.map((phase) => {
              const count = lessons.filter((l) => l.phase === phase.id).length;
              return (
                <button
                  key={phase.id}
                  onClick={() => { setActivePhase(phase.id === activePhase ? null : phase.id); setOpenIndex(null); }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all font-cta ${
                    activePhase === phase.id
                      ? "bg-teal-600 text-white border-teal-600"
                      : "text-slate-600 hover:text-teal-600 hover:bg-teal-50 border-slate-200 hover:border-teal-300"
                  }`}
                >
                  {phase.label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── LESSONS ─────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Phase intros when filtered */}
          {activePhase && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-3 font-heading">
                Phase: {phases.find((p) => p.id === activePhase)?.label}
              </h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                {phases.find((p) => p.id === activePhase)?.desc}
              </p>
            </motion.div>
          )}

          {/* Two-column layout */}
          <div className="grid lg:grid-cols-2 gap-4">
            {filtered.map((lesson, i) => {
              const globalIndex = lessons.indexOf(lesson);
              const lessonNumber = globalIndex + 1;
              const isOpen = openIndex === globalIndex;
              const phaseObj = phases.find((p) => p.id === lesson.phase);

              return (
                <motion.div
                  key={globalIndex}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: (i % 6) * 0.03 }}
                  className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden"
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : globalIndex)}
                    className="w-full flex items-start justify-between px-5 py-4 text-left gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="text-teal-600 font-extrabold font-mono text-lg leading-tight shrink-0 w-8 text-right">
                        {lessonNumber}
                      </span>
                      <div className="min-w-0">
                        <span className="text-slate-900 font-semibold text-sm font-heading block">
                          {lesson.step}
                        </span>
                        {!activePhase && (
                          <span className="text-slate-400 text-[10px] font-cta uppercase tracking-wider">
                            {phaseObj?.label}
                          </span>
                        )}
                      </div>
                    </div>
                    <motion.span
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-teal-600 text-xl flex-shrink-0 mt-0.5"
                    >
                      +
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                      >
                        <div className="px-5 pb-5 space-y-4">
                          {/* The Issue */}
                          <div className="rounded-lg bg-red-50 border border-red-100 p-4">
                            <p className="text-red-800 text-[10px] font-bold uppercase tracking-wider mb-1 font-cta">The Issue</p>
                            <p className="text-red-700 text-sm leading-relaxed">{lesson.issue}</p>
                          </div>

                          {/* The Advice */}
                          <div className="rounded-lg bg-teal-50 border border-teal-100 p-4">
                            <p className="text-teal-800 text-[10px] font-bold uppercase tracking-wider mb-1 font-cta">The Advice</p>
                            <p className="text-slate-700 text-sm leading-relaxed">{lesson.advice}</p>
                          </div>

                          {/* The Secret */}
                          <div className="rounded-lg bg-slate-900 p-4">
                            <p className="text-teal-400 text-[10px] font-bold uppercase tracking-wider mb-1 font-cta">The Secret Tip</p>
                            <p className="text-white/80 text-sm leading-relaxed">{lesson.secret}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CROSS-LINKS ─────────────────────────────────────── */}
      <section className="py-16 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-bold text-white mb-4 font-heading">Services</h3>
              <div className="space-y-2">
                {[
                  { label: "SEO Services", href: "/services/search-engine-optimization-seo-nyc" },
                  { label: "Web Design", href: "/services/web-design-nyc" },
                  { label: "Brand Strategy", href: "/services/brand-strategy-identity-in-nyc" },
                  { label: "AI Automation", href: "/services/analytics-technology-in-nyc" },
                  { label: "All Services", href: "/nyc-marketing-company-services-list" },
                ].map((link) => (
                  <Link key={link.href} href={link.href} className="block text-teal-400 text-sm font-medium hover:text-teal-300 transition-colors">
                    {link.label} &rarr;
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-4 font-heading">Resources</h3>
              <div className="space-y-2">
                {[
                  { label: "Pricing Guide", href: "/nyc-marketing-pricing-guide" },
                  { label: "100 FAQs Answered", href: "/nyc-marketing-company-faqs" },
                  { label: "What's Working Now", href: "/whats-working-in-marketing" },
                  { label: "Portfolio & Results", href: "/nyc-marketing-company-portfolio" },
                  { label: "Marketing Checklist", href: "/master-marketing-checklist-last-updated-2026" },
                ].map((link) => (
                  <Link key={link.href} href={link.href} className="block text-teal-400 text-sm font-medium hover:text-teal-300 transition-colors">
                    {link.label} &rarr;
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-4 font-heading">Explore</h3>
              <div className="space-y-2">
                {[
                  { label: "100+ Industries", href: "/industries-we-offer-marketing-services-for" },
                  { label: "80+ Service Areas", href: "/services-areas-we-offer-marketing-services-in" },
                  { label: "About The NYC Marketing Company", href: "/about-digital-marketing-agency-consortium-nyc" },
                  { label: "Free SEO Audit", href: "/the-free-human+ai-seo-marketing-review" },
                  { label: "Contact Us", href: "/contact-nyc-marketing-company-consortium-nyc" },
                ].map((link) => (
                  <Link key={link.href} href={link.href} className="block text-teal-400 text-sm font-medium hover:text-teal-300 transition-colors">
                    {link.label} &rarr;
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ──────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4 font-heading">
              101 Lessons.{" "}
              <span className="text-teal-600">One Phone Call to Start.</span>
            </h2>
            <p className="text-slate-600 text-lg mb-8 max-w-2xl mx-auto">
              Whether you&apos;re on lesson 1 or lesson 101, we meet you where you are. <L href="/contact-nyc-marketing-company-consortium-nyc">Schedule a free strategy session</L> and we&apos;ll tell you exactly which lessons your business needs to focus on right now — for your <L href="/industries-we-offer-marketing-services-for">industry</L>, your <L href="/services-areas-we-offer-marketing-services-in">market</L>, and your budget.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/contact-nyc-marketing-company-consortium-nyc"
                className="inline-block px-8 py-4 text-base font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors shadow-lg font-cta"
              >
                Schedule a Free Strategy Session
              </Link>
              <a
                href="tel:+12122029220"
                className="inline-block px-8 py-4 text-base font-bold text-teal-600 rounded-lg bg-white border-2 border-teal-600 hover:bg-teal-50 transition-colors shadow-lg font-cta"
              >
                Call (212) 202-9220
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
