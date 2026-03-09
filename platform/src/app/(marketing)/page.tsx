import {
  JsonLd,
  webPageSchema,
  faqSchema,
  breadcrumbSchema,
  localBusinessSchema,
  softwareApplicationSchema,
} from "@/lib/schema";
import { faqs } from "@/lib/siteData";

// Home page sections
// import StickyBar from "@/components/home/StickyBar";
import Hero from "@/components/home/Hero";
import QuickTips from "@/components/home/QuickTips";
import Welcome from "@/components/home/Welcome";
import ResultsTicker from "@/components/home/ResultsTicker";
import CostBreakdown from "@/components/home/CostBreakdown";
import PricingSlider from "@/components/home/PricingSlider";
import Testimonials from "@/components/home/Testimonials";
import TopServices from "@/components/home/TopServices";
import ServiceDeepDives from "@/components/home/ServiceDeepDives";
import Process from "@/components/home/Process";
import BeforeAfter from "@/components/home/BeforeAfter";
import Industries from "@/components/home/Industries";
import WhyNYC from "@/components/home/WhyNYC";
import Competitors from "@/components/home/Competitors";
import Comparison from "@/components/home/Comparison";
import SocialProof from "@/components/home/SocialProof";
import ROICalculator from "@/components/home/ROICalculator";
import TechStack from "@/components/home/TechStack";
import Guarantees from "@/components/home/Guarantees";
import WhatIsDigitalMarketing from "@/components/home/WhatIsDigitalMarketing";
import FreeResources from "@/components/home/FreeResources";
import ExpandedFAQ from "@/components/home/ExpandedFAQ";
import CaseStudies from "@/components/home/CaseStudies";
import BlogPreview from "@/components/home/BlogPreview";
import FinalCTA from "@/components/home/FinalCTA";
import ExitIntent from "@/components/home/ExitIntent";

const breadcrumbs = [{ name: "Home", url: "https://fullloopcrm.com" }];

export default function Home() {
  return (
    <>
      {/* Schema Markup */}
      <JsonLd
        data={webPageSchema(
          "Full Loop CRM | The All-in-One Home Service CRM Platform",
          "The first full-cycle CRM for home service businesses. AI-powered lead generation, sales automation, scheduling, GPS field operations, payments, reviews, and retargeting — one platform, zero integrations.",
          "https://fullloopcrm.com",
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
