// All services, areas, and data for programmatic page generation

export interface SubService {
  name: string;
  slug: string;
  shortDesc: string;
}

export interface ServiceCategory {
  name: string;
  slug: string;
  tagline: string;
  shortDesc: string;
  description: string;
  icon: string;
  features: string[];
  subServices: SubService[];
}

export const serviceCategories: ServiceCategory[] = [
  {
    name: "SEO",
    slug: "search-engine-optimization-seo-nyc",
    tagline: "Dominate Search Results in NYC",
    shortDesc:
      "Data-driven SEO strategies that put your NYC business at the top of Google.",
    description:
      "Our SEO services combine technical optimization, strategic content creation, and authoritative link building to drive organic traffic that converts. We help local businesses across New York City build sustainable search visibility that generates leads month after month. Stop losing customers to competitors who rank above you.",
    icon: "search",
    features: [
      "Technical SEO Audits & Fixes",
      "On-Page Content Optimization",
      "Local SEO & Google Business Profile",
      "Strategic Link Building",
      "Keyword Research & Mapping",
      "Competitor Analysis & Benchmarking",
      "Monthly Reporting & Analytics",
      "Core Web Vitals Optimization",
    ],
    subServices: [
      {
        name: "SEO Services",
        slug: "seo-services-in-nyc",
        shortDesc:
          "Comprehensive SEO services designed to help NYC small businesses rank higher and attract more local customers.",
      },
      {
        name: "Local SEO",
        slug: "local-seo-in-nyc",
        shortDesc:
          "Optimize your local search presence so customers in your neighborhood find you first on Google Maps and local results.",
      },
      {
        name: "Technical SEO",
        slug: "technical-seo-in-nyc",
        shortDesc:
          "Fix the behind-the-scenes issues holding your site back — crawl errors, site speed, indexing, and structured data.",
      },
      {
        name: "On-Page SEO",
        slug: "on-page-seo-optimization-in-nyc",
        shortDesc:
          "Strategic optimization of your page titles, content, headers, and internal links to rank for the terms your customers search.",
      },
      {
        name: "Off-Page SEO & Link Building",
        slug: "off-page-seo-and-link-building-in-nyc",
        shortDesc:
          "Build authority and trust with quality backlinks from relevant, high-authority sites to boost your search rankings.",
      },
      {
        name: "Keyword Research",
        slug: "keyword-research-and-strategy-in-nyc",
        shortDesc:
          "Identify the exact search terms your NYC customers use and build a strategy to capture that traffic.",
      },
      {
        name: "SEO Audit",
        slug: "seo-audit-and-analysis-in-nyc",
        shortDesc:
          "A thorough analysis of your website's SEO health with a prioritized action plan to improve rankings and traffic.",
      },
      {
        name: "Google Business Profile",
        slug: "google-business-profile-management-in-nyc",
        shortDesc:
          "Set up, optimize, and manage your Google Business Profile to dominate the local map pack and drive foot traffic.",
      },
    ],
  },
  {
    name: "Web Design",
    slug: "web-design-nyc",
    tagline: "Websites That Convert Visitors Into Customers",
    shortDesc:
      "Custom websites built for speed, SEO, and conversion for NYC businesses.",
    description:
      "We design and develop high-performance websites that look incredible and drive results for local businesses. Every site is built with SEO architecture from day one, lightning-fast load times, and conversion-optimized layouts. Your website should be your hardest-working salesperson.",
    icon: "layout",
    features: [
      "Custom Design & Development",
      "Mobile-First Responsive Layouts",
      "SEO-Optimized Architecture",
      "Speed & Core Web Vitals Optimization",
      "Conversion Rate Optimization",
      "CMS Integration & Training",
      "E-Commerce Solutions",
      "Ongoing Maintenance & Support",
    ],
    subServices: [
      {
        name: "Website Design",
        slug: "website-design-in-nyc",
        shortDesc:
          "Professional website design for NYC businesses that builds trust, communicates your brand, and generates leads.",
      },
      {
        name: "Custom Website Design",
        slug: "custom-website-design-in-nyc",
        shortDesc:
          "Fully custom-built websites tailored to your business goals — no templates, no cookie-cutter layouts.",
      },
      {
        name: "Mobile Responsive",
        slug: "mobile-responsive-web-design-in-nyc",
        shortDesc:
          "Websites that look and perform flawlessly on every device, because most of your NYC customers are searching on their phones.",
      },
      {
        name: "Website Optimization",
        slug: "website-optimization-in-nyc",
        shortDesc:
          "Improve your existing website's speed, usability, and search performance without a full redesign.",
      },
      {
        name: "Landing Page Design",
        slug: "landing-page-design-in-nyc",
        shortDesc:
          "High-converting landing pages built to capture leads from your ad campaigns and marketing efforts.",
      },
      {
        name: "CRO",
        slug: "conversion-rate-optimization-cro-in-nyc",
        shortDesc:
          "Turn more of your website visitors into paying customers through data-driven design and testing.",
      },
      {
        name: "Micro-Site Design",
        slug: "micro-site-website-design-in-nyc",
        shortDesc:
          "Focused micro-sites for specific campaigns, locations, or service lines that drive targeted results.",
      },
    ],
  },
  {
    name: "Branding",
    slug: "brand-strategy-identity-in-nyc",
    tagline: "Build a Brand That Commands Attention",
    shortDesc:
      "Strategic brand identity that resonates with your NYC target market.",
    description:
      "Your brand is more than a logo — it's how customers perceive and remember you. We create comprehensive brand identities for local businesses that communicate your value, connect with your audience, and differentiate you from every competitor on the block. Stand out in the most competitive market in the country.",
    icon: "palette",
    features: [
      "Brand Strategy & Positioning",
      "Logo Design & Visual Identity",
      "Brand Style Guides",
      "Brand Voice & Messaging",
      "Rebranding & Brand Refresh",
      "Collateral Design",
      "Social Media Branding",
      "Brand Audit & Analysis",
    ],
    subServices: [
      {
        name: "Brand Strategy",
        slug: "brand-strategy-and-positioning-in-nyc",
        shortDesc:
          "Define your brand's unique position in the NYC market with a strategy that attracts and retains your ideal customers.",
      },
      {
        name: "Brand Identity Design",
        slug: "brand-identity-design-in-nyc",
        shortDesc:
          "A complete visual identity system — logo, colors, typography, and imagery — that makes your business instantly recognizable.",
      },
      {
        name: "Logo Design",
        slug: "logo-design-in-nyc",
        shortDesc:
          "Professional logo design that captures the essence of your business and works across every medium.",
      },
      {
        name: "Naming & Rebranding",
        slug: "brand-naming-and-rebranding-in-nyc",
        shortDesc:
          "Expert naming services and full rebranding for businesses ready to evolve and reach new audiences.",
      },
      {
        name: "Brand Style Guide",
        slug: "brand-style-guide-development-in-nyc",
        shortDesc:
          "A comprehensive style guide that keeps your brand consistent across every touchpoint, from signage to social media.",
      },
      {
        name: "Messaging & Copywriting",
        slug: "brand-messaging-and-copywriting-in-nyc",
        shortDesc:
          "Craft the words that sell — taglines, value propositions, and brand copy that speaks directly to your NYC customers.",
      },
    ],
  },
  {
    name: "Content Marketing",
    slug: "content-marketing-in-nyc",
    tagline: "Content That Drives Traffic and Trust",
    shortDesc:
      "Strategic content creation that attracts, educates, and converts your ideal customers.",
    description:
      "Great content is the foundation of every successful digital marketing strategy. We create targeted content that positions your local business as the go-to authority in your industry. From blog posts to video, every piece is designed to drive traffic and build trust with NYC customers.",
    icon: "pen",
    features: [
      "Content Strategy Development",
      "Blog Writing & Publishing",
      "Video Content Production",
      "Content Calendar Planning",
      "SEO Content Optimization",
      "Content Performance Tracking",
      "Thought Leadership Content",
      "Content Repurposing & Distribution",
    ],
    subServices: [
      {
        name: "Content Strategy",
        slug: "content-marketing-strategy-in-nyc",
        shortDesc:
          "A data-driven content strategy that aligns every piece of content with your business goals and audience needs.",
      },
      {
        name: "Blog Writing",
        slug: "blog-writing-and-content-creation-in-nyc",
        shortDesc:
          "SEO-optimized blog posts that drive organic traffic and establish your business as a local authority.",
      },
      {
        name: "Video Content",
        slug: "video-content-production-in-nyc",
        shortDesc:
          "Engaging video content that tells your story, showcases your work, and connects with customers across platforms.",
      },
      {
        name: "Content Planning",
        slug: "content-strategy-and-planning-in-nyc",
        shortDesc:
          "Organized content calendars and publishing schedules that keep your marketing consistent and on track.",
      },
    ],
  },
  {
    name: "Social Media",
    slug: "social-media-marketing-in-nyc",
    tagline: "Social Presence That Drives Real Business",
    shortDesc:
      "Strategic social media marketing that builds your brand and generates leads in NYC.",
    description:
      "Social media is where your NYC customers spend their time — and where they decide who to trust. We manage, create, and advertise across social platforms to build brand awareness, engage your community, and drive real business results for local companies.",
    icon: "share",
    features: [
      "Social Media Strategy",
      "Content Creation & Scheduling",
      "Community Management",
      "Paid Social Advertising",
      "Influencer Partnerships",
      "Analytics & Reporting",
      "Platform-Specific Optimization",
      "Social Listening & Monitoring",
    ],
    subServices: [
      {
        name: "Social Media Management",
        slug: "social-media-management-in-nyc",
        shortDesc:
          "Full-service social media management — we handle your accounts so you can focus on running your business.",
      },
      {
        name: "Social Media Strategy",
        slug: "social-media-marketing-strategy-in-nyc",
        shortDesc:
          "A tailored social media strategy that aligns with your brand and drives measurable results for your NYC business.",
      },
      {
        name: "Social Media Advertising",
        slug: "social-media-advertising-in-nyc",
        shortDesc:
          "Targeted paid social campaigns on Facebook, Instagram, and more to reach your ideal NYC customers.",
      },
      {
        name: "Influencer Marketing",
        slug: "influencer-marketing-in-nyc",
        shortDesc:
          "Connect with local influencers and content creators to amplify your brand's reach across New York City.",
      },
      {
        name: "Social Media Content",
        slug: "social-media-content-creation-in-nyc",
        shortDesc:
          "Scroll-stopping social content — graphics, videos, and copy — designed to engage your local audience.",
      },
    ],
  },
  {
    name: "Digital Advertising / PPC",
    slug: "digital-advertising-ppc-in-nyc",
    tagline: "Paid Ads That Actually Pay Off",
    shortDesc:
      "Targeted digital advertising campaigns that deliver measurable ROI for NYC businesses.",
    description:
      "Stop wasting money on ads that don't convert. We build and manage precision-targeted PPC and display campaigns that put your business in front of ready-to-buy customers across NYC. Every dollar is tracked, optimized, and accountable to your bottom line.",
    icon: "megaphone",
    features: [
      "Google Ads Management",
      "PPC Campaign Strategy",
      "Ad Copywriting & Creative",
      "Bid Management & Optimization",
      "Landing Page Alignment",
      "A/B Testing & Experimentation",
      "Conversion Tracking Setup",
      "Monthly Performance Reporting",
    ],
    subServices: [
      {
        name: "Google Ads",
        slug: "google-ads-management-in-nyc",
        shortDesc:
          "Expert Google Ads management that maximizes your budget and drives qualified leads to your NYC business.",
      },
      {
        name: "PPC Advertising",
        slug: "ppc-advertising-in-nyc",
        shortDesc:
          "Pay-per-click campaigns built to generate leads and sales at the lowest possible cost per acquisition.",
      },
      {
        name: "Paid Search",
        slug: "paid-search-campaigns-in-nyc",
        shortDesc:
          "Strategic paid search campaigns that capture high-intent customers actively searching for your services.",
      },
      {
        name: "Display Advertising",
        slug: "display-advertising-in-nyc",
        shortDesc:
          "Visual display ads that build brand awareness and retarget interested prospects across the web.",
      },
    ],
  },
  {
    name: "Email Marketing & Automation",
    slug: "email-marketing-automation-in-nyc",
    tagline: "Email That Nurtures and Converts",
    shortDesc:
      "Email marketing and automation systems that keep your customers engaged and coming back.",
    description:
      "Email is still the highest-ROI marketing channel — when done right. We build automated email systems for local businesses that nurture leads, retain customers, and drive repeat revenue. From welcome sequences to win-back campaigns, every email is designed to move your business forward.",
    icon: "mail",
    features: [
      "Email Campaign Design & Copywriting",
      "Marketing Automation Setup",
      "List Segmentation & Management",
      "Drip Campaign Development",
      "A/B Testing & Optimization",
      "Deliverability Monitoring",
      "Performance Analytics",
      "CRM & Email Platform Integration",
    ],
    subServices: [
      {
        name: "Email Campaigns",
        slug: "email-marketing-campaigns-in-nyc",
        shortDesc:
          "Professionally designed email campaigns that drive opens, clicks, and conversions for your NYC business.",
      },
      {
        name: "Marketing Automation",
        slug: "marketing-automation-in-nyc",
        shortDesc:
          "Automated marketing workflows that nurture leads and save your team hours of manual work every week.",
      },
      {
        name: "Campaign Management",
        slug: "email-campaign-management-in-nyc",
        shortDesc:
          "End-to-end email campaign management — from strategy and design to deployment and reporting.",
      },
      {
        name: "Drip Campaigns",
        slug: "drip-campaigns-and-nurture-sequences-in-nyc",
        shortDesc:
          "Automated drip sequences that guide prospects through your funnel and convert them into paying customers.",
      },
    ],
  },
  {
    name: "PR & Reputation",
    slug: "public-relations-reputation-in-nyc",
    tagline: "Protect and Elevate Your Reputation",
    shortDesc:
      "Reputation management and PR services that build trust and credibility for your NYC business.",
    description:
      "In New York, reputation is everything. We help local businesses manage online reviews, earn media coverage, and build the kind of credibility that turns searchers into customers. Whether you need damage control or proactive brand building, we have you covered.",
    icon: "shield",
    features: [
      "Online Reputation Monitoring",
      "Review Generation & Management",
      "Press Release Writing & Distribution",
      "Media Outreach & Pitching",
      "Crisis Communication",
      "Digital PR Campaigns",
      "Brand Sentiment Analysis",
      "Local Media Relationships",
    ],
    subServices: [
      {
        name: "Online Reputation Management",
        slug: "online-reputation-management-in-nyc",
        shortDesc:
          "Monitor, manage, and improve your online reviews and reputation across Google, Yelp, and other platforms.",
      },
      {
        name: "Press Releases",
        slug: "press-release-writing-and-distribution-in-nyc",
        shortDesc:
          "Professional press releases written and distributed to earn media coverage and build brand authority.",
      },
      {
        name: "Media Outreach",
        slug: "media-outreach-in-nyc",
        shortDesc:
          "Strategic outreach to journalists, bloggers, and media outlets to get your NYC business featured.",
      },
      {
        name: "Digital PR",
        slug: "digital-pr-campaigns-in-nyc",
        shortDesc:
          "Creative digital PR campaigns that earn backlinks, media mentions, and brand exposure online.",
      },
    ],
  },
  {
    name: "Analytics & Technology",
    slug: "analytics-technology-in-nyc",
    tagline: "Data-Driven Decisions, Real Results",
    shortDesc:
      "Marketing analytics and technology consulting that turns data into actionable growth insights.",
    description:
      "You can't improve what you don't measure. We set up, integrate, and manage the analytics and marketing technology stack your business needs to make smarter decisions. From Google Analytics to CRM integration, we give NYC businesses the data infrastructure to scale with confidence.",
    icon: "chart",
    features: [
      "Google Analytics Setup & Management",
      "Google Search Console Management",
      "CRM Integration & Setup",
      "Lead Tracking & Attribution",
      "Custom Dashboard & Reporting",
      "Marketing Technology Audits",
      "Performance KPI Tracking",
      "Data-Driven Strategy Recommendations",
    ],
    subServices: [
      {
        name: "Analytics & Reporting",
        slug: "marketing-analytics-and-reporting-in-nyc",
        shortDesc:
          "Clear, actionable marketing reports that show exactly what's working and where to invest next.",
      },
      {
        name: "Google Analytics Setup",
        slug: "google-analytics-setup-and-management-in-nyc",
        shortDesc:
          "Professional Google Analytics setup with conversion tracking, goals, and custom dashboards for your business.",
      },
      {
        name: "Google Console",
        slug: "google-console-setup-and-management-in-nyc",
        shortDesc:
          "Google Search Console setup and management to monitor your search performance and fix indexing issues.",
      },
      {
        name: "CRM Integration",
        slug: "crm-integration-in-nyc",
        shortDesc:
          "Connect your CRM with your marketing tools so leads flow seamlessly from first click to closed deal.",
      },
      {
        name: "Lead Tracking",
        slug: "lead-tracking-setup-and-management-in-nyc",
        shortDesc:
          "Track every lead from source to sale so you know exactly which marketing channels drive revenue.",
      },
      {
        name: "Marketing Tech Consulting",
        slug: "marketing-technology-consulting-in-nyc",
        shortDesc:
          "Expert guidance on selecting, implementing, and optimizing the right marketing technology for your business.",
      },
      {
        name: "Performance KPIs",
        slug: "performance-tracking-and-kpis-in-nyc",
        shortDesc:
          "Define and track the key performance indicators that matter most to your business growth.",
      },
    ],
  },
  {
    name: "Business Strategy",
    slug: "business-strategy-consulting-in-nyc",
    tagline: "Strategic Growth for NYC Businesses",
    shortDesc:
      "Business strategy and growth consulting tailored for local NYC companies ready to scale.",
    description:
      "Growth without strategy is just chaos. We provide hands-on business strategy consulting for local companies looking to scale smartly. From market research to competitive positioning, we help NYC business owners make the big decisions with confidence and clarity.",
    icon: "briefcase",
    features: [
      "Business Growth Consulting",
      "Market Research & Analysis",
      "Competitive Landscape Assessment",
      "Strategic Business Planning",
      "SWOT Analysis & Workshops",
      "Revenue Growth Strategies",
      "Scaling & Expansion Roadmaps",
      "Quarterly Strategy Reviews",
    ],
    subServices: [
      {
        name: "Growth Consulting",
        slug: "business-growth-consulting-in-nyc",
        shortDesc:
          "Hands-on growth consulting that helps NYC businesses identify and capture their biggest opportunities.",
      },
      {
        name: "Market Research",
        slug: "market-research-and-competitive-analysis-in-nyc",
        shortDesc:
          "In-depth market research and competitive analysis to inform smarter business and marketing decisions.",
      },
      {
        name: "SWOT Analysis",
        slug: "swot-analysis-in-nyc",
        shortDesc:
          "Structured SWOT analysis to uncover your strengths, weaknesses, opportunities, and threats in the NYC market.",
      },
      {
        name: "Strategic Planning",
        slug: "strategic-business-planning-in-nyc",
        shortDesc:
          "Comprehensive strategic business plans with clear milestones, timelines, and accountability built in.",
      },
      {
        name: "Scaling Strategy",
        slug: "scaling-and-expansion-strategy-in-nyc",
        shortDesc:
          "Expansion strategies for NYC businesses ready to grow into new markets, locations, or service lines.",
      },
    ],
  },
  {
    name: "Marketing Manager",
    slug: "marketing-manager-consulting-in-nyc",
    tagline: "Your Outsourced Marketing Department",
    shortDesc:
      "Fractional marketing management and consulting for local NYC businesses.",
    description:
      "You don't need a $75,000 marketing hire. You need a marketing partner who knows what they're doing. We step in as your outsourced marketing manager — handling strategy, execution, vendor management, and reporting so you can focus on running your business. Same expertise, fraction of the cost.",
    icon: "user",
    features: [
      "Fractional CMO / Marketing Manager",
      "Monthly Strategy & Planning",
      "Campaign Management & Execution",
      "Vendor & Freelancer Coordination",
      "Marketing Budget Management",
      "Performance Reporting & Analytics",
      "Brand Consistency Oversight",
      "Quarterly Business Reviews",
    ],
    subServices: [],
  },
  {
    name: "AI Automation",
    slug: "ai-automation-services-in-nyc",
    tagline: "AI That Works While You Sleep",
    shortDesc:
      "Custom AI chatbots, text bots, lead follow-up, review requests, and appointment booking — built for NYC businesses.",
    description:
      "Your competitors are answering leads at 2am while you sleep. Our AI automation services level the playing field. We build custom AI text bots (like Selena), chatbots, automated lead follow-up, review request systems, and appointment scheduling — all running 24/7 on our own infrastructure. Not a plugin. Not a widget. Real AI built on Telnyx, Supabase, and Claude AI.",
    icon: "cpu",
    features: [
      "Custom AI Text Bot (SMS-Based)",
      "Lead Qualification & Follow-Up",
      "Automated Appointment Booking",
      "Review Request Automation",
      "After-Hours Customer Service",
      "CRM Integration & Lead Tracking",
      "Custom Workflows & Triggers",
      "24/7 Operation — No Downtime",
    ],
    subServices: [
      {
        name: "AI Text Bot Development",
        slug: "ai-text-bot-development-in-nyc",
        shortDesc:
          "Custom SMS-based AI bots that qualify leads, answer questions, and book appointments via text message.",
      },
      {
        name: "Lead Follow-Up Automation",
        slug: "lead-follow-up-automation-in-nyc",
        shortDesc:
          "Automated lead response within seconds of form submission — never lose a lead to slow follow-up again.",
      },
      {
        name: "Review Request Automation",
        slug: "review-request-automation-in-nyc",
        shortDesc:
          "Automated review requests triggered after service completion. Timing and follow-up that gets 3-5x more reviews.",
      },
    ],
  },
  {
    name: "Programmatic SEO",
    slug: "programmatic-seo-services-in-nyc",
    tagline: "Hundreds of Ranking Pages — Deployed at Scale",
    shortDesc:
      "Deploy hundreds or thousands of keyword-targeted pages at scale. The strategy behind 2,000 page 1 rankings in 2 months.",
    description:
      "Programmatic SEO is how we took Moodap™ from zero to 25,000 pages and 2,000 page 1 rankings in 2 months. We build systems that generate hundreds or thousands of unique, keyword-targeted pages — each optimized for a specific search query. Not AI-generated filler. Not duplicate content with swapped city names. Real pages built to rank.",
    icon: "layers",
    features: [
      "Keyword Universe Research & Mapping",
      "Page Template Architecture",
      "Automated Content Generation (Human-Reviewed)",
      "Internal Linking at Scale",
      "Schema Markup for Every Page",
      "Indexation Strategy & Monitoring",
      "Performance Tracking per Page Cluster",
      "Ongoing Optimization & Expansion",
    ],
    subServices: [
      {
        name: "Micro Site (EMD Strategy)",
        slug: "micro-site-emd-strategy-in-nyc",
        shortDesc:
          "Exact match domain micro sites built to rank page 1 in days. Targeted keyword, fast site, leads funnel to your main business.",
      },
      {
        name: "Location Page Generation",
        slug: "location-page-generation-in-nyc",
        shortDesc:
          "Programmatic neighborhood and city pages for every area you serve — dominate local search at scale.",
      },
      {
        name: "Service Page Generation",
        slug: "service-page-generation-in-nyc",
        shortDesc:
          "Unique service pages for every variation of what you offer — capture long-tail searches your competitors miss.",
      },
    ],
  },
  {
    name: "Custom CRM Development",
    slug: "custom-crm-development-in-nyc",
    tagline: "Your Business, Your Platform",
    shortDesc:
      "Custom CRM platforms built from scratch — lead tracking, AI automation, scheduling, review management, all in one.",
    description:
      "Stop paying $300/month for a CRM you use 10% of. We build custom CRM platforms tailored to your exact workflow — lead tracking, automated follow-up, AI text bots, appointment scheduling, review management, and reporting. Built on Next.js, Supabase, Resend, and Telnyx. You own the code. You own the data. No monthly SaaS fees to a third party.",
    icon: "database",
    features: [
      "Custom-Built on Next.js + Supabase",
      "Lead Tracking & Pipeline Management",
      "AI-Powered Text Bot Integration",
      "Automated Follow-Up Sequences",
      "Appointment Scheduling",
      "Review Management & Automation",
      "Reporting & Analytics Dashboard",
      "Full Code & Data Ownership",
    ],
    subServices: [],
  },
  {
    name: "Google Business Profile Services",
    slug: "google-business-profile-services-in-nyc",
    tagline: "Your Most Important Listing — Done Right",
    shortDesc:
      "GBP creation, verification, optimization, and ongoing management for NYC businesses.",
    description:
      "Your Google Business Profile is often the first thing customers see. We handle everything — creation, verification submission, full optimization of every field, photo uploads, weekly posts, review response management, and ongoing monitoring. Verification is submitted through Google's process — we cannot guarantee approval as Google controls that process.",
    icon: "map-pin",
    features: [
      "GBP Creation & Verification Submission",
      "Full Profile Optimization (All Fields)",
      "Category & Service Configuration",
      "Photo & Video Uploads",
      "Weekly GBP Posts",
      "Review Response Management",
      "Q&A Monitoring & Responses",
      "Local Citation Consistency Checks",
    ],
    subServices: [],
  },
];

// Backward-compatible flat services array (category-level items)
export const services = serviceCategories.map((cat) => ({
  name: cat.name,
  slug: cat.slug,
  tagline: cat.tagline,
  shortDesc: cat.shortDesc,
  description: cat.description,
  icon: cat.icon,
  features: cat.features,
}));

// Helper: get all service slugs (categories + sub-services)
export function getAllServiceSlugs(): string[] {
  const slugs: string[] = [];
  for (const cat of serviceCategories) {
    slugs.push(cat.slug);
    for (const sub of cat.subServices) {
      slugs.push(sub.slug);
    }
  }
  return slugs;
}

// Helper: find a service (category or sub-service) by slug
export function findServiceBySlug(slug: string) {
  for (const cat of serviceCategories) {
    if (cat.slug === slug) return { category: cat, subService: null };
    for (const sub of cat.subServices) {
      if (sub.slug === slug) return { category: cat, subService: sub };
    }
  }
  return null;
}

// Badge → natural H1 label (adjective form that reads well before "Businesses")
const H1_LABELS: Record<string, string> = {
  "Home Services": "Home Service",
  "Personal Injury": "Personal Injury Law",
  "Dentists": "Dental",
  "Rehab Centers": "Addiction Treatment",
  "Auto Dealers": "Auto Dealership",
  "Plumbers": "Plumbing",
  "Electricians": "Electrical",
  "Contractors": "Contracting",
  "Financial Advisors": "Financial Advisory",
  "Restaurants": "Restaurant",
  "Movers": "Moving",
  "Criminal Defense": "Criminal Defense Law",
  "Estate Planning": "Estate Planning",
  "Workers Comp": "Workers Compensation",
  "Medical": "Medical Practice",
  "Orthopedics": "Orthopedic",
  "Dermatology": "Dermatology",
  "Fertility": "Fertility Clinic",
  "Chiropractic": "Chiropractic",
  "Orthodontics": "Orthodontic",
  "Kitchen Remodel": "Kitchen Remodeling",
  "Bathroom Remodel": "Bathroom Remodeling",
  "Pool Builders": "Pool Building",
  "Garage Doors": "Garage Door",
  "Water Damage": "Water Damage Restoration",
  "Mold Removal": "Mold Remediation",
  "Painters": "Painting",
  "Windows & Doors": "Window & Door",
  "Locksmiths": "Locksmith",
  "Salons & Spas": "Salon & Spa",
  "Accountants": "Accounting",
  "IT / MSP": "IT & Managed Services",
  "Property Mgmt": "Property Management",
  "Title Companies": "Title Company",
  "Private Schools": "Private School",
  "Wedding Venues": "Wedding Venue",
  "Event Venues": "Event Venue",
  "Hotels": "Hotel & Hospitality",
  "Bail Bonds": "Bail Bond",
  "Funeral Homes": "Funeral Home",
  "Commercial RE": "Commercial Real Estate",
  "Signs": "Sign Company",
  "Med Devices": "Medical Device",
  "Dental Labs": "Dental Lab",
  "Supplements": "Supplement & Nutrition",
};

export function h1Label(badge: string): string {
  return H1_LABELS[badge] || badge;
}

export const areas = [
  // === Manhattan ===
  { name: "Manhattan", slug: "manhattan-marketing-company", region: "Manhattan", type: "Borough" as const },
  { name: "Midtown", slug: "midtown-manhattan-marketing-company", region: "Manhattan", type: "Neighborhood" as const },
  { name: "Lower Manhattan", slug: "lower-manhattan-marketing-company", region: "Manhattan", type: "Neighborhood" as const },
  { name: "Upper East Side", slug: "upper-east-side-marketing-company", region: "Manhattan", type: "Neighborhood" as const },
  { name: "Upper West Side", slug: "upper-west-side-marketing-company", region: "Manhattan", type: "Neighborhood" as const },
  { name: "Harlem", slug: "harlem-marketing-company", region: "Manhattan", type: "Neighborhood" as const },
  { name: "SoHo", slug: "soho-marketing-company", region: "Manhattan", type: "Neighborhood" as const },
  { name: "Chelsea", slug: "chelsea-marketing-company", region: "Manhattan", type: "Neighborhood" as const },
  { name: "East Village", slug: "east-village-marketing-company", region: "Manhattan", type: "Neighborhood" as const },
  { name: "West Village", slug: "west-village-marketing-company", region: "Manhattan", type: "Neighborhood" as const },
  { name: "Tribeca", slug: "tribeca-marketing-company", region: "Manhattan", type: "Neighborhood" as const },
  { name: "Chinatown", slug: "chinatown-marketing-company", region: "Manhattan", type: "Neighborhood" as const },
  { name: "Financial District", slug: "financial-district-marketing-company", region: "Manhattan", type: "Neighborhood" as const },
  // === Brooklyn ===
  { name: "Brooklyn", slug: "brooklyn-marketing-company", region: "Brooklyn", type: "Borough" as const },
  { name: "Williamsburg", slug: "williamsburg-marketing-company", region: "Brooklyn", type: "Neighborhood" as const },
  { name: "Bushwick", slug: "bushwick-marketing-company", region: "Brooklyn", type: "Neighborhood" as const },
  { name: "Park Slope", slug: "park-slope-marketing-company", region: "Brooklyn", type: "Neighborhood" as const },
  { name: "DUMBO", slug: "dumbo-marketing-company", region: "Brooklyn", type: "Neighborhood" as const },
  { name: "Downtown Brooklyn", slug: "downtown-brooklyn-marketing-company", region: "Brooklyn", type: "Neighborhood" as const },
  { name: "Bay Ridge", slug: "bay-ridge-marketing-company", region: "Brooklyn", type: "Neighborhood" as const },
  { name: "Flatbush", slug: "flatbush-marketing-company", region: "Brooklyn", type: "Neighborhood" as const },
  { name: "Bensonhurst", slug: "bensonhurst-marketing-company", region: "Brooklyn", type: "Neighborhood" as const },
  { name: "Sunset Park", slug: "sunset-park-marketing-company", region: "Brooklyn", type: "Neighborhood" as const },
  { name: "Crown Heights", slug: "crown-heights-marketing-company", region: "Brooklyn", type: "Neighborhood" as const },
  { name: "Bedford-Stuyvesant", slug: "bed-stuy-marketing-company", region: "Brooklyn", type: "Neighborhood" as const },
  { name: "Greenpoint", slug: "greenpoint-marketing-company", region: "Brooklyn", type: "Neighborhood" as const },
  // === Queens ===
  { name: "Queens", slug: "queens-marketing-company", region: "Queens", type: "Borough" as const },
  { name: "Astoria", slug: "astoria-marketing-company", region: "Queens", type: "Neighborhood" as const },
  { name: "Flushing", slug: "flushing-marketing-company", region: "Queens", type: "Neighborhood" as const },
  { name: "Long Island City", slug: "long-island-city-marketing-company", region: "Queens", type: "Neighborhood" as const },
  { name: "Forest Hills", slug: "forest-hills-marketing-company", region: "Queens", type: "Neighborhood" as const },
  { name: "Jamaica", slug: "jamaica-queens-marketing-company", region: "Queens", type: "Neighborhood" as const },
  { name: "Bayside", slug: "bayside-marketing-company", region: "Queens", type: "Neighborhood" as const },
  { name: "Jackson Heights", slug: "jackson-heights-marketing-company", region: "Queens", type: "Neighborhood" as const },
  { name: "Ridgewood", slug: "ridgewood-marketing-company", region: "Queens", type: "Neighborhood" as const },
  { name: "Woodside", slug: "woodside-marketing-company", region: "Queens", type: "Neighborhood" as const },
  { name: "Rego Park", slug: "rego-park-marketing-company", region: "Queens", type: "Neighborhood" as const },
  { name: "Elmhurst", slug: "elmhurst-marketing-company", region: "Queens", type: "Neighborhood" as const },
  // === The Bronx ===
  { name: "The Bronx", slug: "bronx-marketing-company", region: "Bronx", type: "Borough" as const },
  { name: "Riverdale", slug: "riverdale-marketing-company", region: "Bronx", type: "Neighborhood" as const },
  { name: "Fordham", slug: "fordham-marketing-company", region: "Bronx", type: "Neighborhood" as const },
  { name: "Pelham Bay", slug: "pelham-bay-marketing-company", region: "Bronx", type: "Neighborhood" as const },
  { name: "Mott Haven", slug: "mott-haven-marketing-company", region: "Bronx", type: "Neighborhood" as const },
  { name: "Kingsbridge", slug: "kingsbridge-marketing-company", region: "Bronx", type: "Neighborhood" as const },
  { name: "Throgs Neck", slug: "throgs-neck-marketing-company", region: "Bronx", type: "Neighborhood" as const },
  // === Staten Island ===
  { name: "Staten Island", slug: "staten-island-marketing-company", region: "Staten Island", type: "Borough" as const },
  { name: "St. George", slug: "st-george-marketing-company", region: "Staten Island", type: "Neighborhood" as const },
  { name: "Tottenville", slug: "tottenville-marketing-company", region: "Staten Island", type: "Neighborhood" as const },
  { name: "New Dorp", slug: "new-dorp-marketing-company", region: "Staten Island", type: "Neighborhood" as const },
  { name: "Great Kills", slug: "great-kills-marketing-company", region: "Staten Island", type: "Neighborhood" as const },
  // === Long Island ===
  { name: "Long Island", slug: "long-island-marketing-company", region: "Long Island", type: "Region" as const },
  { name: "Nassau County", slug: "nassau-county-marketing-company", region: "Long Island", type: "County" as const },
  { name: "Suffolk County", slug: "suffolk-county-marketing-company", region: "Long Island", type: "County" as const },
  { name: "Garden City", slug: "garden-city-marketing-company", region: "Long Island", type: "Neighborhood" as const },
  { name: "Great Neck", slug: "great-neck-marketing-company", region: "Long Island", type: "Neighborhood" as const },
  { name: "Huntington", slug: "huntington-marketing-company", region: "Long Island", type: "Neighborhood" as const },
  { name: "Babylon", slug: "babylon-marketing-company", region: "Long Island", type: "Neighborhood" as const },
  { name: "Hempstead", slug: "hempstead-marketing-company", region: "Long Island", type: "Neighborhood" as const },
  { name: "Oyster Bay", slug: "oyster-bay-marketing-company", region: "Long Island", type: "Neighborhood" as const },
  { name: "Islip", slug: "islip-marketing-company", region: "Long Island", type: "Neighborhood" as const },
  { name: "Smithtown", slug: "smithtown-marketing-company", region: "Long Island", type: "Neighborhood" as const },
  { name: "Brookhaven", slug: "brookhaven-marketing-company", region: "Long Island", type: "Neighborhood" as const },
  { name: "Massapequa", slug: "massapequa-marketing-company", region: "Long Island", type: "Neighborhood" as const },
  { name: "Levittown", slug: "levittown-marketing-company", region: "Long Island", type: "Neighborhood" as const },
  { name: "Hicksville", slug: "hicksville-marketing-company", region: "Long Island", type: "Neighborhood" as const },
  // === Westchester ===
  { name: "Westchester County", slug: "westchester-marketing-company", region: "Westchester", type: "County" as const },
  { name: "White Plains", slug: "white-plains-marketing-company", region: "Westchester", type: "Neighborhood" as const },
  { name: "Yonkers", slug: "yonkers-marketing-company", region: "Westchester", type: "Neighborhood" as const },
  { name: "New Rochelle", slug: "new-rochelle-marketing-company", region: "Westchester", type: "Neighborhood" as const },
  { name: "Scarsdale", slug: "scarsdale-marketing-company", region: "Westchester", type: "Neighborhood" as const },
  { name: "Mount Vernon", slug: "mount-vernon-marketing-company", region: "Westchester", type: "Neighborhood" as const },
  { name: "Rye", slug: "rye-marketing-company", region: "Westchester", type: "Neighborhood" as const },
  { name: "Mamaroneck", slug: "mamaroneck-marketing-company", region: "Westchester", type: "Neighborhood" as const },
  { name: "Tarrytown", slug: "tarrytown-marketing-company", region: "Westchester", type: "Neighborhood" as const },
  { name: "Dobbs Ferry", slug: "dobbs-ferry-marketing-company", region: "Westchester", type: "Neighborhood" as const },
  { name: "Larchmont", slug: "larchmont-marketing-company", region: "Westchester", type: "Neighborhood" as const },
  // === New Jersey (Tri-State) ===
  { name: "Jersey City", slug: "jersey-city-marketing-company", region: "New Jersey", type: "City" as const },
  { name: "Hoboken", slug: "hoboken-marketing-company", region: "New Jersey", type: "City" as const },
  { name: "Newark", slug: "newark-marketing-company", region: "New Jersey", type: "City" as const },
  { name: "Fort Lee", slug: "fort-lee-marketing-company", region: "New Jersey", type: "City" as const },
  { name: "Edgewater", slug: "edgewater-marketing-company", region: "New Jersey", type: "City" as const },
];

// Industries — first 20 shown on homepage, all 100 shown on /industries page
// Only industries that actually spend on marketing
export const industries = [
  // === TOP 20 — Homepage featured ===
  { name: "Home Service Business Marketing", slug: "home-service-business-marketing", badge: "Home Services", desc: "Dominate local search for plumbing, HVAC, electrical, and every home service vertical. We build the SEO machine that generates calls 24/7." },
  { name: "Personal Injury Law Firm Marketing", slug: "personal-injury-law-firm-marketing", badge: "Personal Injury", desc: "The most competitive legal vertical in the country. We rank PI firms against the biggest spenders in NYC and win." },
  { name: "Plastic Surgery & Med Spa Marketing", slug: "plastic-surgery-med-spa-marketing", badge: "Plastic Surgery", desc: "High-ticket patient acquisition for cosmetic surgeons and med spas. SEO that targets patients ready to book consultations." },
  { name: "Dental Practice Marketing", slug: "dental-practice-marketing", badge: "Dentists", desc: "New patient acquisition on autopilot. SEO, Google Business, and review generation built for dental practices and DSOs." },
  { name: "HVAC Company Marketing", slug: "hvac-company-marketing", badge: "HVAC", desc: "Own every 'AC repair near me' search in your territory. Seasonal campaigns that keep the phone ringing year-round." },
  { name: "Roofing Company Marketing", slug: "roofing-company-marketing", badge: "Roofing", desc: "Turn storm season into your highest revenue quarter ever. SEO + Google Business for roofing contractors." },
  { name: "Real Estate Agent Marketing", slug: "real-estate-agent-marketing", badge: "Real Estate", desc: "Generate buyer and seller leads without paying Zillow. Own your local market with organic search domination." },
  { name: "Addiction Treatment Center Marketing", slug: "addiction-treatment-center-marketing", badge: "Rehab Centers", desc: "Reach families searching for help right now. Ethical, compliant marketing for detox, rehab, and recovery centers." },
  { name: "Car Dealership Marketing", slug: "car-dealership-marketing", badge: "Auto Dealers", desc: "Sell more cars with local SEO that puts your inventory in front of ready-to-buy shoppers searching right now." },
  { name: "Insurance Agency Marketing", slug: "insurance-agency-marketing", badge: "Insurance", desc: "Generate policy leads from people actively shopping for coverage. Auto, home, life, and commercial insurance." },
  { name: "Plumber Marketing", slug: "plumber-marketing", badge: "Plumbers", desc: "Be the first call when the pipe bursts at 2am. Emergency and scheduled plumbing leads from organic search." },
  { name: "Electrician Marketing", slug: "electrician-marketing", badge: "Electricians", desc: "Show up first for every emergency and project search. Residential and commercial electrical leads on demand." },
  { name: "Solar Company Marketing", slug: "solar-company-marketing", badge: "Solar", desc: "Generate qualified solar installation leads from homeowners actively searching for energy savings and tax credits." },
  { name: "Contractor Marketing", slug: "contractor-marketing", badge: "Contractors", desc: "Turn Google searches into signed contracts. General contractors, remodelers, and builders — we get you found." },
  { name: "Financial Advisor Marketing", slug: "financial-advisor-marketing", badge: "Financial Advisors", desc: "Attract high-net-worth clients searching for wealth management, retirement planning, and financial guidance." },
  { name: "Restaurant & Food Service Marketing", slug: "restaurant-food-service-marketing", badge: "Restaurants", desc: "Fill every seat and drive online orders. Local SEO, Google Maps domination, and review management for restaurants." },
  { name: "E-Commerce Business Marketing", slug: "ecommerce-business-marketing", badge: "E-Commerce", desc: "Turn browsers into buyers and first-timers into repeat customers. Product SEO, conversion optimization, and growth." },
  { name: "SaaS Company Marketing", slug: "saas-company-marketing", badge: "SaaS", desc: "Drive trial sign-ups and reduce churn with content marketing, SEO, and conversion optimization built for software companies." },
  { name: "Moving Company Marketing", slug: "moving-company-marketing", badge: "Movers", desc: "Capture every 'movers near me' search in your radius. Local and long-distance moving leads that convert." },
  { name: "Staffing Agency Marketing", slug: "staffing-agency-marketing", badge: "Staffing", desc: "Attract clients and candidates searching for staffing solutions. Temp, permanent, and executive placement SEO." },
  // === 21–100 — Extended list ===
  { name: "Criminal Defense Lawyer Marketing", slug: "criminal-defense-lawyer-marketing", badge: "Criminal Defense", desc: "Reach people searching for a lawyer right now. DUI, drug charges, assault — urgent legal searches that convert immediately." },
  { name: "Family Law Attorney Marketing", slug: "family-law-attorney-marketing", badge: "Family Law", desc: "Divorce, custody, child support — generate qualified family law inquiries from people actively searching for representation." },
  { name: "Immigration Lawyer Marketing", slug: "immigration-lawyer-marketing", badge: "Immigration Law", desc: "Connect with individuals and families searching for visa, green card, and asylum representation in your area." },
  { name: "Bankruptcy Attorney Marketing", slug: "bankruptcy-attorney-marketing", badge: "Bankruptcy Law", desc: "Reach people in financial distress searching for Chapter 7 and Chapter 13 bankruptcy attorneys near them." },
  { name: "Estate Planning Attorney Marketing", slug: "estate-planning-attorney-marketing", badge: "Estate Planning", desc: "Attract clients searching for wills, trusts, and estate planning services. High-value, relationship-based leads." },
  { name: "Workers Compensation Lawyer Marketing", slug: "workers-compensation-lawyer-marketing", badge: "Workers Comp", desc: "Generate case inquiries from injured workers searching for workers comp attorneys. High-intent, high-value leads." },
  { name: "Medical Practice Marketing", slug: "medical-practice-marketing", badge: "Medical", desc: "Attract patients searching for your exact specialties. HIPAA-compliant marketing that fills your appointment book." },
  { name: "Orthopedic Surgeon Marketing", slug: "orthopedic-surgeon-marketing", badge: "Orthopedics", desc: "Attract patients searching for joint replacement, sports medicine, and orthopedic care in your market." },
  { name: "Dermatologist Marketing", slug: "dermatologist-marketing", badge: "Dermatology", desc: "New patient acquisition for medical and cosmetic dermatology. Acne, skin cancer, Botox — we rank it all." },
  { name: "Fertility Clinic Marketing", slug: "fertility-clinic-marketing", badge: "Fertility", desc: "Reach couples searching for IVF, IUI, and fertility treatments. Sensitive, compliant marketing that converts." },
  { name: "Urgent Care Marketing", slug: "urgent-care-marketing", badge: "Urgent Care", desc: "Be the first result when someone searches 'urgent care near me.' Walk-in patient acquisition from local search." },
  { name: "Ophthalmologist Marketing", slug: "ophthalmologist-marketing", badge: "Eye Care", desc: "LASIK, cataract surgery, and comprehensive eye care marketing that generates high-value patient consultations." },
  { name: "Veterinarian Marketing", slug: "veterinarian-marketing", badge: "Veterinary", desc: "Be the vet pet owners trust before they even walk in. Local SEO and Google Business for veterinary clinics." },
  { name: "Chiropractor Marketing", slug: "chiropractor-marketing", badge: "Chiropractic", desc: "Fill your schedule with patients searching for pain relief. Back pain, sports injuries, and wellness SEO." },
  { name: "Physical Therapy Marketing", slug: "physical-therapy-marketing", badge: "Physical Therapy", desc: "Attract patients looking for recovery — not just referrals from doctors. PT clinic marketing that drives direct bookings." },
  { name: "Cosmetic Dentistry Marketing", slug: "cosmetic-dentistry-marketing", badge: "Cosmetic Dentistry", desc: "Veneers, implants, Invisalign — attract high-ticket cosmetic dental patients searching for smile transformations." },
  { name: "Orthodontist Marketing", slug: "orthodontist-marketing", badge: "Orthodontics", desc: "Generate new patient consultations for braces and Invisalign from parents and adults searching in your area." },
  { name: "Senior Care & Home Health Marketing", slug: "senior-care-home-health-marketing", badge: "Senior Care", desc: "Reach families searching for in-home care, assisted living, and senior services. Compassionate marketing that converts." },
  { name: "Kitchen Remodeling Marketing", slug: "kitchen-remodeling-marketing", badge: "Kitchen Remodel", desc: "High-ticket leads for kitchen remodelers. Homeowners searching for kitchen renovation spend $25K–$75K+ on average." },
  { name: "Bathroom Remodeling Marketing", slug: "bathroom-remodeling-marketing", badge: "Bathroom Remodel", desc: "Capture homeowners searching for bathroom renovations. High-intent searches that turn into $15K–$40K+ projects." },
  { name: "Pool Builder Marketing", slug: "pool-builder-marketing", badge: "Pool Builders", desc: "Generate leads for pool construction and renovation. $50K–$100K+ projects from homeowners searching for pool builders." },
  { name: "Garage Door Company Marketing", slug: "garage-door-company-marketing", badge: "Garage Doors", desc: "Emergency repair and new installation leads. Garage door searches are high-intent and convert same-day." },
  { name: "Water Damage Restoration Marketing", slug: "water-damage-restoration-marketing", badge: "Water Damage", desc: "24/7 emergency leads from homeowners and property managers dealing with floods, leaks, and water damage right now." },
  { name: "Mold Remediation Marketing", slug: "mold-remediation-marketing", badge: "Mold Removal", desc: "Capture urgent searches from property owners who just found mold. High-ticket remediation leads from organic search." },
  { name: "Foundation Repair Marketing", slug: "foundation-repair-marketing", badge: "Foundation Repair", desc: "Generate leads for foundation crack repair, waterproofing, and structural work. $5K–$30K+ project values." },
  { name: "Pest Control Marketing", slug: "pest-control-marketing", badge: "Pest Control", desc: "Be the first result when something is crawling where it shouldn't be. Termite, rodent, and bed bug control SEO." },
  { name: "Fence Company Marketing", slug: "fence-company-marketing", badge: "Fencing", desc: "Generate installation and repair leads from homeowners searching for fence contractors in your service area." },
  { name: "Paving Company Marketing", slug: "paving-company-marketing", badge: "Paving", desc: "Capture commercial and residential paving leads. Driveways, parking lots, and asphalt repair from local search." },
  { name: "Tree Service Marketing", slug: "tree-service-marketing", badge: "Tree Service", desc: "Emergency tree removal and trimming leads. Storm damage searches spike and we make sure you show up first." },
  { name: "Painting Company Marketing", slug: "painting-company-marketing", badge: "Painters", desc: "Interior and exterior painting leads from homeowners and property managers searching for painters near them." },
  { name: "Flooring Company Marketing", slug: "flooring-company-marketing", badge: "Flooring", desc: "Hardwood, tile, carpet — generate installation leads from homeowners searching for flooring contractors." },
  { name: "Window & Door Company Marketing", slug: "window-door-company-marketing", badge: "Windows & Doors", desc: "Replacement window and door leads. Energy efficiency searches drive high-ticket home improvement projects." },
  { name: "Junk Removal Marketing", slug: "junk-removal-marketing", badge: "Junk Removal", desc: "Capture every 'junk removal near me' search. Same-day booking leads for cleanouts, hoarding, and estate clearing." },
  { name: "Pressure Washing Marketing", slug: "pressure-washing-marketing", badge: "Pressure Washing", desc: "Residential and commercial power washing leads. Driveways, decks, buildings — seasonal demand that SEO captures." },
  { name: "Landscaping Company Marketing", slug: "landscaping-company-marketing", badge: "Landscaping", desc: "Own the spring rush and keep the pipeline full year-round. Lawn care, hardscaping, and tree service SEO." },
  { name: "Cleaning Service Marketing", slug: "cleaning-service-marketing", badge: "Cleaning", desc: "Book recurring commercial and residential clients, not one-time jobs. Cleaning service leads from local search." },
  { name: "Dumpster Rental Marketing", slug: "dumpster-rental-marketing", badge: "Dumpster Rental", desc: "Own every 'dumpster rental near me' search. Roll-off container leads for construction and cleanout projects." },
  { name: "Appliance Repair Marketing", slug: "appliance-repair-marketing", badge: "Appliance Repair", desc: "Emergency repair leads for washers, dryers, refrigerators, and dishwashers. Same-day intent searches that convert." },
  { name: "Locksmith Marketing", slug: "locksmith-marketing", badge: "Locksmiths", desc: "Be the locksmith that shows up first when someone is locked out. Emergency and commercial locksmith SEO." },
  { name: "Towing Company Marketing", slug: "towing-company-marketing", badge: "Towing", desc: "Show up first for every roadside emergency. 24/7 towing and roadside assistance leads from Google." },
  { name: "Auto Body Shop Marketing", slug: "auto-body-shop-marketing", badge: "Auto Body", desc: "Collision repair and auto body leads from drivers searching after accidents. Insurance-paid, high-ticket work." },
  { name: "Auto Repair Shop Marketing", slug: "auto-repair-shop-marketing", badge: "Auto Repair", desc: "Be the trusted shop that shows up when the check engine light comes on. Local SEO for mechanics." },
  { name: "Salon & Spa Marketing", slug: "salon-spa-marketing", badge: "Salons & Spas", desc: "Keep your chairs full with a steady stream of new clients. Hair salons, nail salons, med spas, and day spas." },
  { name: "Gym & Fitness Marketing", slug: "gym-fitness-marketing", badge: "Fitness", desc: "Drive membership sign-ups with local search domination. CrossFit, yoga studios, personal trainers, and gyms." },
  { name: "Martial Arts Studio Marketing", slug: "martial-arts-studio-marketing", badge: "Martial Arts", desc: "Fill classes and drive trial sign-ups for MMA, karate, jiu-jitsu, and boxing gyms from local search." },
  { name: "Accounting Firm Marketing", slug: "accounting-firm-marketing", badge: "Accountants", desc: "Attract business owners who need your expertise — not just tax prep. CPA and bookkeeping firm SEO." },
  { name: "IT Services & MSP Marketing", slug: "it-services-msp-marketing", badge: "IT / MSP", desc: "Generate B2B leads for managed IT services, cybersecurity, and cloud solutions. Decision-makers search Google too." },
  { name: "Cybersecurity Company Marketing", slug: "cybersecurity-company-marketing", badge: "Cybersecurity", desc: "Reach businesses searching for security assessments, compliance, and managed security services." },
  { name: "Construction Company Marketing", slug: "construction-company-marketing", badge: "Construction", desc: "Win more bids and attract commercial and residential construction clients from organic search." },
  { name: "Architecture Firm Marketing", slug: "architecture-firm-marketing", badge: "Architecture", desc: "Attract residential and commercial clients searching for architects. Portfolio SEO that showcases your work." },
  { name: "Interior Design Marketing", slug: "interior-design-marketing", badge: "Interior Design", desc: "Generate high-ticket design clients from homeowners and businesses searching for interior designers near them." },
  { name: "Property Management Marketing", slug: "property-management-marketing", badge: "Property Mgmt", desc: "Generate landlord and property owner leads searching for management services. Residential and commercial." },
  { name: "Mortgage Broker Marketing", slug: "mortgage-broker-marketing", badge: "Mortgage", desc: "Capture home buyers searching for mortgage rates, refinancing, and pre-approval. High-value lead generation." },
  { name: "Title Company Marketing", slug: "title-company-marketing", badge: "Title Companies", desc: "Generate referral relationships and direct leads from buyers, sellers, and agents searching for title services." },
  { name: "Private School Marketing", slug: "private-school-marketing", badge: "Private Schools", desc: "Drive enrollment inquiries from parents searching for private education options in your area." },
  { name: "Daycare & Childcare Marketing", slug: "daycare-childcare-marketing", badge: "Childcare", desc: "Reach parents searching for trusted childcare in their neighborhood. Daycare, preschool, and after-school SEO." },
  { name: "Tutoring & Test Prep Marketing", slug: "tutoring-test-prep-marketing", badge: "Tutoring", desc: "Connect with parents searching for SAT prep, ACT tutoring, and academic help. Education leads that convert." },
  { name: "Wedding Venue Marketing", slug: "wedding-venue-marketing", badge: "Wedding Venues", desc: "Book every weekend with engaged couples searching for the perfect venue. $20K–$50K+ event bookings from search." },
  { name: "Event Venue Marketing", slug: "event-venue-marketing", badge: "Event Venues", desc: "Fill your calendar with corporate events, galas, and private parties. Venue marketing that drives bookings." },
  { name: "Catering Company Marketing", slug: "catering-company-marketing", badge: "Catering", desc: "Fill your calendar with corporate events, weddings, and private parties. Catering business SEO and lead generation." },
  { name: "Hotel & Hospitality Marketing", slug: "hotel-hospitality-marketing", badge: "Hotels", desc: "Drive direct bookings and reduce OTA dependency. Hotel SEO that competes with Booking.com and Expedia." },
  { name: "Storage Facility Marketing", slug: "storage-facility-marketing", badge: "Storage", desc: "Fill empty units with local SEO. Self-storage searches are high-intent — people need space now, not later." },
  { name: "Bail Bonds Marketing", slug: "bail-bonds-marketing", badge: "Bail Bonds", desc: "Be the first call at 3am. Emergency bail bond leads from Google when families need you most." },
  { name: "Funeral Home Marketing", slug: "funeral-home-marketing", badge: "Funeral Homes", desc: "Be there when families need you most. Respectful marketing for funeral homes and cremation services." },
  { name: "Jewelry Store Marketing", slug: "jewelry-store-marketing", badge: "Jewelry", desc: "Attract engagement ring shoppers and luxury buyers searching for jewelers near them. High-ticket retail SEO." },
  { name: "Furniture Store Marketing", slug: "furniture-store-marketing", badge: "Furniture", desc: "Drive showroom traffic and online sales from shoppers searching for furniture stores and home furnishings." },
  { name: "Luxury Brand Marketing", slug: "luxury-brand-marketing", badge: "Luxury", desc: "Premium positioning for luxury brands. SEO and content marketing that attracts affluent buyers." },
  { name: "Fashion & Apparel Marketing", slug: "fashion-apparel-marketing", badge: "Fashion", desc: "E-commerce SEO and brand building for fashion brands, boutiques, and streetwear companies." },
  { name: "Manufacturing Company Marketing", slug: "manufacturing-company-marketing", badge: "Manufacturing", desc: "Generate B2B leads for custom manufacturing, fabrication, and industrial services from organic search." },
  { name: "Wholesale & Distribution Marketing", slug: "wholesale-distribution-marketing", badge: "Wholesale", desc: "Attract retailers and B2B buyers searching for wholesale suppliers and distributors in your industry." },
  { name: "Commercial Real Estate Marketing", slug: "commercial-real-estate-marketing", badge: "Commercial RE", desc: "Generate tenant and buyer leads for commercial properties, office space, and industrial real estate." },
  { name: "Plastic Surgeon Marketing", slug: "plastic-surgeon-marketing", badge: "Plastic Surgery", desc: "Breast augmentation, rhinoplasty, facelifts — attract patients searching for cosmetic surgery consultations." },
  { name: "Weight Loss Clinic Marketing", slug: "weight-loss-clinic-marketing", badge: "Weight Loss", desc: "Reach patients searching for medical weight loss, Ozempic, bariatric surgery, and body contouring services." },
  { name: "Mental Health Practice Marketing", slug: "mental-health-practice-marketing", badge: "Mental Health", desc: "Therapists, psychiatrists, and counselors — reach patients searching for mental health support in your area." },
  { name: "Home Inspection Marketing", slug: "home-inspection-marketing", badge: "Home Inspection", desc: "Generate inspection bookings from buyers, agents, and sellers. Every real estate transaction needs an inspector." },
  { name: "Security Company Marketing", slug: "security-company-marketing", badge: "Security", desc: "Generate leads for alarm installation, surveillance systems, and security guard services from local search." },
  { name: "Printing Company Marketing", slug: "printing-company-marketing", badge: "Printing", desc: "Attract B2B and retail clients searching for commercial printing, signage, and custom print services." },
  { name: "Sign Company Marketing", slug: "sign-company-marketing", badge: "Signs", desc: "Generate leads for business signage, vehicle wraps, and custom signs from local and commercial search." },
  { name: "Trucking & Logistics Marketing", slug: "trucking-logistics-marketing", badge: "Trucking", desc: "Generate freight leads and shipper contracts from businesses searching for trucking and logistics partners." },
  { name: "Courier & Delivery Service Marketing", slug: "courier-delivery-service-marketing", badge: "Courier", desc: "Capture same-day delivery and courier leads from businesses and individuals who need fast, reliable service." },
  { name: "Accounting Software Marketing", slug: "accounting-software-marketing", badge: "FinTech", desc: "Drive trial sign-ups and demos for accounting, invoicing, and financial software from organic search." },
  { name: "Dental Lab Marketing", slug: "dental-lab-marketing", badge: "Dental Labs", desc: "Generate dentist partnerships and case volume for crowns, implants, and prosthetics. B2B dental lab SEO." },
  { name: "Medical Device Marketing", slug: "medical-device-marketing", badge: "Med Devices", desc: "Reach healthcare providers and procurement teams searching for medical equipment and device solutions." },
  { name: "Dispensary & Cannabis Marketing", slug: "dispensary-cannabis-marketing", badge: "Cannabis", desc: "Compliant marketing for dispensaries and cannabis brands. SEO that works within advertising restrictions." },
  { name: "Supplement & Nutrition Marketing", slug: "supplement-nutrition-marketing", badge: "Supplements", desc: "E-commerce SEO for supplement brands, nutrition companies, and health product retailers." },
];

export const testimonials = [
  {
    name: "Rachel M.",
    business: "Residential Cleaning · Dallas, TX",
    text: "I've been in the cleaning business for 12 years. I use Jobber for scheduling, Mailchimp for emails, SimpleTexting for SMS, QuickBooks for invoicing, and a spreadsheet to track leads. When I saw Full Loop replace all of that in one screen — with lead generation built in — I literally said 'where has this been?'",
    rating: 5,
  },
  {
    name: "Marcus T.",
    business: "Maid Service · Atlanta, GA",
    text: "The AI chatbot blew my mind. I get leads at 11pm, 2am, weekends — and they used to just sit there until Monday. Watching Selena engage a lead, qualify them, answer their pricing question, and push them to book — all via text, all automatic — that alone is worth it.",
    rating: 5,
  },
  {
    name: "Diana L.",
    business: "House Cleaning Company · Phoenix, AZ",
    text: "I have 14 team members and payroll was a nightmare every week. Full Loop calculates it all automatically from their GPS check-in/out. I just open the payroll tab and hit 'Mark Paid.' I got 3 hours of my week back.",
    rating: 5,
  },
  {
    name: "Carlos R.",
    business: "Pest Control Service · Houston, TX",
    text: "The exclusivity is what sold me. I'm the only pest control company in Houston with this platform. My competitors can't get it. The organic leads from those neighborhood websites are mine — nobody else's.",
    rating: 5,
  },
  {
    name: "Anthony S.",
    business: "Pressure Washing Service · Tampa, FL",
    text: "I was skeptical about the organic lead gen. I've been burning $3,000/month on Google Ads for two years. When they showed me the domain portfolio — 100+ neighborhood websites all ranking organically — I turned off my ads the next day.",
    rating: 5,
  },
  {
    name: "Sofia G.",
    business: "Residential Cleaning · Miami, FL",
    text: "My cleaners are all Spanish-speaking. Every other app I've tried, they can't use it. Full Loop's team portal is fully bilingual — the login, the job list, check-in, earnings, everything.",
    rating: 5,
  },
  {
    name: "Andre M.",
    business: "Handyman Service · Minneapolis, MN",
    text: "I've tried Housecall Pro and Launch27. Both are good at scheduling. But neither one generates a single lead for you. Full Loop starts with lead gen. That's the difference.",
    rating: 5,
  },
  {
    name: "Jason R.",
    business: "HVAC Maintenance · Sacramento, CA",
    text: "ChatGPT is sending me leads. I didn't even know that was possible. Full Loop tracks visitors from ChatGPT, Claude, Perplexity — AI search engines. 8.7% of my traffic comes from AI search now.",
    rating: 5,
  },
  {
    name: "Gregory T.",
    business: "Lawn Care & Landscaping · Jacksonville, FL",
    text: "Two things sealed it: I can see my net margin by month — real P&L. And I can see exactly which neighborhoods are profitable. I stopped servicing two zip codes and my margin went from 38% to 49%.",
    rating: 5,
  },
  {
    name: "Natasha K.",
    business: "Residential Cleaning · Columbus, OH",
    text: "Nobody else is doing one partner per city. That's what made me act fast. I called within an hour. Best business decision I've made in five years.",
    rating: 5,
  },
];

export const faqs = {
  /** All homepage FAQs — plain-text versions for JSON-LD schema */
  homepageAll: [
    {
      question: "What is Full Loop CRM and how is it different from other home service CRMs?",
      answer: "Full Loop CRM is the first and only CRM that handles every stage of a home service business — from organic lead generation and AI-powered sales through scheduling, GPS-verified field operations, payment collection, automated review generation, referral tracking, and client retargeting. Unlike traditional CRMs that cover one or two stages, Full Loop CRM replaces 9+ separate tools with one unified platform. It is exclusively available to one service provider per trade per metro area.",
    },
    {
      question: "How does the AI sales chatbot convert leads into booked appointments?",
      answer: "Selenas is a bilingual AI SMS sales assistant that engages every inbound lead within seconds, 24 hours a day. She qualifies prospects by asking about their location, service needs, home size, and budget, then guides them to book online. She answers 12+ common questions about pricing, insurance, cancellation policy, eco-friendly products, and more.",
    },
    {
      question: "What types of home service businesses can use Full Loop CRM?",
      answer: "Full Loop CRM is designed for any home service trade including cleaning services, carpet cleaning, window cleaning, pressure washing, landscaping, lawn care, handyman services, pest control, HVAC, plumbing, electrical, painting, junk removal, pool cleaning, and any field-service company that books recurring or one-time appointments.",
    },
    {
      question: "How does multi-domain organic SEO lead generation work?",
      answer: "Full Loop CRM deploys neighborhood-specific websites that rank organically in local search results. For example, a service company might have westsideservice.com, downtownpro.com, and northsideservice.com — each optimized for hyper-local long-tail keywords. The platform tracks every visitor, attributes leads to specific websites, and measures revenue per domain.",
    },
    {
      question: "Can Full Loop CRM track which website generated a paying client?",
      answer: "Yes. The attribution engine maps a client's address to their neighborhood, then matches that to the most relevant domain. It uses time-decay confidence scoring: 100% within 30 minutes, 75% within 1 hour, 50% within 2 hours.",
    },
    {
      question: "What does the admin dashboard show?",
      answer: "11 purpose-built pages: Executive Dashboard, Client Management, Bookings & Calendar, Team Management, Lead Tracking, Finance & P&L, Notification Center, AI Dashboard, Referral Program, Settings, and Technical Documentation.",
    },
    {
      question: "How does GPS-verified check-in/out work?",
      answer: "Team members tap Check In on their mobile portal. GPS coordinates are captured and distance from the client's address is calculated. If distance exceeds 528 feet, a mismatch flag is raised. On checkout, hours are auto-calculated and pay is computed.",
    },
    {
      question: "Does Full Loop CRM have a bilingual team portal?",
      answer: "Yes. Fully bilingual in English and Spanish. PIN-based login, today's job list, one-tap navigation, GPS check-in/out, earnings dashboard, availability management, and emergency job claiming.",
    },
    {
      question: "How does recurring booking management work?",
      answer: "7 recurring patterns: daily, weekly, biweekly, triweekly, monthly by date, monthly by weekday, and custom interval. Edit a single instance or all future bookings in a series.",
    },
    {
      question: "What payment methods does Full Loop CRM support?",
      answer: "Tracks payments via Zelle, Apple Pay, Venmo, Cash, Check, and credit card. The finance dashboard shows revenue, payroll with one-click Mark Paid, expense tracking, and auto-generated 1099 reports.",
    },
    {
      question: "How does the automated review system work?",
      answer: "Three days after a first-time service, clients get a personalized thank-you with a 10% rebooking discount. When negative sentiment is detected via text, AI escalates to a phone call rather than attempting resolution over text.",
    },
    {
      question: "Is Full Loop CRM available in my city?",
      answer: "Exclusive territory model — one provider per trade per metropolitan area. First-come-first-serve. Currently accepting partnership requests in 400+ US cities.",
    },
    {
      question: "Why one business per trade per city?",
      answer: "Exclusivity is core to the Full Loop CRM model. Our organic lead generation builds neighborhood-specific domains. If we gave the same domains to competing businesses, value would be diluted. Your leads are your leads.",
    },
    {
      question: "What does Full Loop CRM look for in a partner?",
      answer: "Business owners committed to organic, sustainable growth. Partners who appreciate consulting guidance and real-world experience from 20+ years in home services.",
    },
    {
      question: "How much does Full Loop CRM cost?",
      answer: "Plans start at $199/month for solo operators, $499/month for teams up to 5, and $999/month for unlimited team members. Every tier gets the complete platform — website, CRM, Selena AI, SEO, team portal, hiring pages, and full automation. $999 one-time setup fee. No contracts, cancel anytime.",
    },
    {
      question: "Who owns what in a Full Loop CRM partnership?",
      answer: "100% transparent from day one. You own: your Telnyx phone number, your Resend email account, your business name/LLC, and any $500 microsites you purchase. Full Loop owns: the CRM platform, Selenas AI, the full SEO site and domain (unless you complete the buyout), any Google Business Profiles we create, and all website code and templates.",
    },
    {
      question: "What happens if I cancel my partnership?",
      answer: "You keep everything that's yours — your phone number (Telnyx), your email account (Resend), your business name, and any microsites you purchased. Full Loop retains the CRM platform access, the full SEO site, the Google Business Profiles, and the lead generation network. If you want to take the full SEO site with you, you can buy it for $5,000 upfront or pay the buyout price of $20,000 + 10%/mo compound.",
    },
    {
      question: "Can I buy the full SEO site that Full Loop builds for my business?",
      answer: "Yes. The full Next.js SEO site is included in your partnership — you get all the leads it generates exclusively. If you want to own the site and domain outright, the buyout starts at $25,000 in year one and increases $10,000 annually to reflect the SEO value invested. Year 2: $35K. Year 3: $45K. Year 5: $65K. Once purchased, the site and domain are 100% yours.",
    },
    {
      question: "Can Full Loop CRM replace Jobber, Housecall Pro, or ServiceTitan?",
      answer: "Yes. Full Loop CRM replaces Jobber (scheduling), Housecall Pro (field management), ServiceTitan (operations), Mailchimp (email), SimpleTexting (SMS), Google Analytics (tracking), QuickBooks (finance), and more. The key difference: those tools don't generate leads.",
    },
    {
      question: "How does the client booking portal work?",
      answer: "Mobile-friendly with phone + email 2FA. 3-step wizard: client info, service type with pricing, date/time from live availability. Confirmation via email and SMS plus automated reminders.",
    },
    {
      question: "Does Full Loop CRM offer a referral program?",
      answer: "Yes. Self-service signup, unique codes, trackable links, real-time analytics, automatic 10% commission on first booking, one-click payout processing.",
    },
    {
      question: "What analytics and reporting does it provide?",
      answer: "Website tracking across 100+ domains, traffic source breakdown including AI search engines, domain health classification, revenue attribution, client lifecycle analytics, retention rates, LTV, forecasting, and full P&L.",
    },
    {
      question: "How does it track leads from ChatGPT and AI search?",
      answer: "Every website visit tracks the referring source including ChatGPT, Claude, and Perplexity. Each visit captures domain, referrer, device, session, scroll depth, and time on page.",
    },
    {
      question: "Can it run my business without me being involved daily?",
      answer: "Yes. Website tracking, lead attribution, AI sales, online booking, reminders, recurring generation, GPS check-in/out, pay calculation, follow-ups, lifecycle updates, and referral tracking all run without human intervention.",
    },
    {
      question: "What notifications does it send?",
      answer: "20+ types via email, SMS, and push: hot leads, bookings, check-ins, payments, cancellations, team applications, referrals, emergency broadcasts, daily summaries, and error alerts.",
    },
    {
      question: "How secure is Full Loop CRM?",
      answer: "Enterprise-grade security: HMAC-SHA256 sessions, rate limiting, CSP headers, HSTS, XSS protection, Row Level Security on every table. Client 2FA, team PIN auth, all data encrypted.",
    },
    {
      question: "Does it work for businesses in any US city?",
      answer: "Yes. Designed for any mid-to-large US metropolitan area. Multi-domain SEO, AI sales, scheduling, GPS ops, and financial tools work identically regardless of geography.",
    },
    {
      question: "How do I apply to become a partner?",
      answer: "Text us at (212) 202-9220, call us, or email hello@fullloopcrm.com. Tell us your trade and city. We'll check territory availability. Or submit a partnership request online at fullloopcrm.com/crm-partnership-request-form.",
    },
  ],
};
