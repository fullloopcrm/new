import dynamic from "next/dynamic";
import {
  JsonLd,
  webPageSchema,
  faqSchema,
  breadcrumbSchema,
  localBusinessSchema,
  softwareApplicationSchema,
} from "@/lib/schema";
import { faqs } from "@/lib/siteData";

// Above the fold — static imports (no lazy loading)
import Hero from "@/components/home/Hero";
import QuickTips from "@/components/home/QuickTips";
import Welcome from "@/components/home/Welcome";
import ResultsTicker from "@/components/home/ResultsTicker";

// Below the fold — lazy loaded
const CostBreakdown = dynamic(() => import("@/components/home/CostBreakdown"));
const PricingSlider = dynamic(() => import("@/components/home/PricingSlider"));
const Testimonials = dynamic(() => import("@/components/home/Testimonials"));
const TopServices = dynamic(() => import("@/components/home/TopServices"));
const ServiceDeepDives = dynamic(() => import("@/components/home/ServiceDeepDives"));
const Process = dynamic(() => import("@/components/home/Process"));
const BeforeAfter = dynamic(() => import("@/components/home/BeforeAfter"));
const Industries = dynamic(() => import("@/components/home/Industries"));
const WhyNYC = dynamic(() => import("@/components/home/WhyNYC"));
const AssetPricing = dynamic(() => import("@/components/home/AssetPricing"));
const Competitors = dynamic(() => import("@/components/home/Competitors"));
const Comparison = dynamic(() => import("@/components/home/Comparison"));
const SocialProof = dynamic(() => import("@/components/home/SocialProof"));
const ROICalculator = dynamic(() => import("@/components/home/ROICalculator"));
const TechStack = dynamic(() => import("@/components/home/TechStack"));
const Guarantees = dynamic(() => import("@/components/home/Guarantees"));
const WhatIsDigitalMarketing = dynamic(() => import("@/components/home/WhatIsDigitalMarketing"));
const FreeResources = dynamic(() => import("@/components/home/FreeResources"));
const ExpandedFAQ = dynamic(() => import("@/components/home/ExpandedFAQ"));
const CaseStudies = dynamic(() => import("@/components/home/CaseStudies"));
const BlogPreview = dynamic(() => import("@/components/home/BlogPreview"));
const FinalCTA = dynamic(() => import("@/components/home/FinalCTA"));
const ExitIntent = dynamic(() => import("@/components/home/ExitIntent"));

const breadcrumbs = [{ name: "Home", url: "https://homeservicesbusinesscrm.com" }];

export default function Home() {
  return (
    <>
      {/* Schema Markup */}
      <JsonLd
        data={webPageSchema(
          "Full Loop CRM | The All-in-One Home Service CRM Platform",
          "The first full-cycle CRM for home service businesses. AI-powered lead generation, sales automation, scheduling, GPS field operations, payments, reviews, and retargeting — one platform, zero integrations.",
          "https://homeservicesbusinesscrm.com",
          breadcrumbs
        )}
      />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={softwareApplicationSchema()} />
      <JsonLd data={faqSchema(faqs.homepageAll)} />
      <JsonLd data={localBusinessSchema("United States", "Country")} />

      {/* Sticky bar removed — footer handles CTAs */}

      {/* 1. Hero */}
      <Hero />

      {/* 1b. Why we built this */}
      <QuickTips />

      {/* 2. Welcome / About */}
      <Welcome />

      {/* 3. Stats bar */}
      <ResultsTicker />

      {/* 4. Cost breakdown table */}
      <CostBreakdown />

      {/* 5. Pricing slider */}
      <PricingSlider />

      {/* 6. Reviews from home service owners */}
      <Testimonials />

      {/* 7. Seven stages overview */}
      <TopServices />

      {/* 8. Feature deep dives — 7 stages */}
      <ServiceDeepDives />

      {/* 9. The Full Loop — 7-step process */}
      <Process />

      {/* 10. Selenas replaces your front office */}
      <BeforeAfter />

      {/* 11. 50+ industries */}
      <Industries />

      {/* 11b. Asset pricing — buy now or pay later */}
      <AssetPricing />

      {/* 12. Founder story */}
      <WhyNYC />

      {/* 13. Autonomy — hands-free vs human */}
      <Competitors />

      {/* 14. Full Loop vs. others comparison */}
      <Comparison />

      {/* 15. Social proof */}
      <SocialProof />

      {/* 16. ROI calculator */}
      <ROICalculator />

      {/* 17. Tech stack */}
      <TechStack />

      {/* 18. Guarantees */}
      <Guarantees />

      {/* 19. What is a CRM */}
      <WhatIsDigitalMarketing />

      {/* 20. Free resources */}
      <FreeResources />

      {/* 21. FAQ — 25 questions */}
      <ExpandedFAQ />

      {/* 22. Case studies */}
      <CaseStudies />

      {/* 23. Blog preview */}
      <BlogPreview />

      {/* 24. Final CTA */}
      <FinalCTA />

      {/* 18. Exit intent popup */}
      <ExitIntent />
    </>
  );
}
