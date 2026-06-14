// @ts-nocheck
import type { Metadata } from "next";
import {
  JsonLd,
  webPageSchema,
  faqSchema,
  breadcrumbSchema,
  aggregateRatingSchema,
} from "@/app/site/the-nyc-marketing-company/_lib/schema";
import { faqs } from "@/app/site/the-nyc-marketing-company/_lib/siteData";

export const metadata: Metadata = {
  title: "NYC Marketing Company | SEO, Web Design & Branding | Consortium NYC (Now The NYC Marketing Company)",
  description:
    "Full-service NYC marketing company serving 100+ industries across NYC, Long Island, and Westchester. SEO from $950/mo, custom websites from $4,600. 25+ years experience. No contracts. Call/text (212) 202-9220.",
  alternates: { canonical: "https://www.thenycmarketingcompany.com" },
};

// Home page sections
import Hero from "@/app/site/the-nyc-marketing-company/_components/home/Hero";
import Welcome from "@/app/site/the-nyc-marketing-company/_components/home/Welcome";
import TrustBar from "@/app/site/the-nyc-marketing-company/_components/home/TrustBar";
import ResultsTicker from "@/app/site/the-nyc-marketing-company/_components/home/ResultsTicker";
import PricingSlider from "@/app/site/the-nyc-marketing-company/_components/home/PricingSlider";
import Marquee from "@/app/site/the-nyc-marketing-company/_components/home/Marquee";
import NotLikeOthers from "@/app/site/the-nyc-marketing-company/_components/home/NotLikeOthers";
import TopServices from "@/app/site/the-nyc-marketing-company/_components/home/TopServices";
import ServicesGrid from "@/app/site/the-nyc-marketing-company/_components/home/ServicesGrid";
import ServiceDeepDives from "@/app/site/the-nyc-marketing-company/_components/home/ServiceDeepDives";
import Process from "@/app/site/the-nyc-marketing-company/_components/home/Process";
import Timeline from "@/app/site/the-nyc-marketing-company/_components/home/Timeline";
import BeforeAfter from "@/app/site/the-nyc-marketing-company/_components/home/BeforeAfter";
import CaseStudies from "@/app/site/the-nyc-marketing-company/_components/home/CaseStudies";
import StatsBar from "@/app/site/the-nyc-marketing-company/_components/home/StatsBar";
import Industries from "@/app/site/the-nyc-marketing-company/_components/home/Industries";
import AreasServed from "@/app/site/the-nyc-marketing-company/_components/home/AreasServed";
import NeighborhoodSlider from "@/app/site/the-nyc-marketing-company/_components/home/NeighborhoodSlider";
import WhyNYC from "@/app/site/the-nyc-marketing-company/_components/home/WhyNYC";
import Competitors from "@/app/site/the-nyc-marketing-company/_components/home/Competitors";
import Testimonials from "@/app/site/the-nyc-marketing-company/_components/home/Testimonials";
import SocialProof from "@/app/site/the-nyc-marketing-company/_components/home/SocialProof";
import Comparison from "@/app/site/the-nyc-marketing-company/_components/home/Comparison";
import ROICalculator from "@/app/site/the-nyc-marketing-company/_components/home/ROICalculator";
import TechStack from "@/app/site/the-nyc-marketing-company/_components/home/TechStack";
import Certifications from "@/app/site/the-nyc-marketing-company/_components/home/Certifications";
import Guarantees from "@/app/site/the-nyc-marketing-company/_components/home/Guarantees";
import WhatIsDigitalMarketing from "@/app/site/the-nyc-marketing-company/_components/home/WhatIsDigitalMarketing";
import FreeResources from "@/app/site/the-nyc-marketing-company/_components/home/FreeResources";
import VideoSection from "@/app/site/the-nyc-marketing-company/_components/home/VideoSection";
import QuickTips from "@/app/site/the-nyc-marketing-company/_components/home/QuickTips";
import ExpandedFAQ from "@/app/site/the-nyc-marketing-company/_components/home/ExpandedFAQ";
import BlogPreview from "@/app/site/the-nyc-marketing-company/_components/home/BlogPreview";
import FinalCTA from "@/app/site/the-nyc-marketing-company/_components/home/FinalCTA";
import ExitIntent from "@/app/site/the-nyc-marketing-company/_components/home/ExitIntent";

const breadcrumbs = [{ name: "Home", url: "https://www.thenycmarketingcompany.com" }];

export default function Home() {
  return (
    <>
      {/* Schema Markup */}
      <JsonLd
        data={webPageSchema(
          "NYC Marketing Company | Consortium NYC (Now The NYC Marketing Company)",
          "Full-service NYC marketing company specializing in SEO, branding, web design, business development, and automation for businesses in NYC, Long Island, and Westchester.",
          "https://www.thenycmarketingcompany.com",
          breadcrumbs
        )}
      />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={aggregateRatingSchema()} />
      <JsonLd data={faqSchema(faqs.homepageAll)} />


      {/* 1. Hero */}
      <Hero />

      {/* 1b. Quick marketing tips */}
      <QuickTips />

      {/* 2. Welcome / About */}
      <Welcome />

      {/* 3. Client trust logos — disabled for now */}
      {/* <TrustBar /> */}

      {/* 3. Results numbers */}
      <ResultsTicker />

      {/* 4. Pricing slider */}
      <PricingSlider />

      {/* 5. Testimonials / Reviews */}
      <Testimonials />

      {/* Scrolling marquee — disabled */}
      {/* <Marquee /> */}

      {/* Top 12 Services */}
      <TopServices />

      {/* Differentiator — disabled */}
      {/* <NotLikeOthers /> */}

      {/* Services overview — disabled */}
      {/* <ServicesGrid /> */}

      {/* 7. Service deep dives */}
      <ServiceDeepDives />

      {/* 8. Our process */}
      <Process />

      {/* 9. What happens timeline — removed, covered by Process */}
      {/* <Timeline /> */}

      {/* 10. Before & after */}
      <BeforeAfter />

      {/* 11. Case studies */}
      <CaseStudies />

      {/* 12. Stats strip — removed, covered by ResultsTicker */}
      {/* <StatsBar /> */}

      {/* 13. Industries */}
      <Industries />

      {/* 14. Areas we serve */}
      <AreasServed />

      {/* 14b. Neighborhood photo slider */}
      <NeighborhoodSlider />

      {/* 15. Why NYC needs digital marketing */}
      <WhyNYC />

      {/* 16. Competitor urgency */}
      <Competitors />

      {/* Social proof platforms */}
      <SocialProof />

      {/* 19. Agency vs in-house vs freelancer */}
      <Comparison />

      {/* 20. ROI calculator */}
      <ROICalculator />

      {/* 21. Tools & tech stack */}
      <TechStack />

      {/* 22. Certifications — removed */}
      {/* <Certifications /> */}

      {/* 23. Guarantees */}
      <Guarantees />

      {/* 24. What is digital marketing (SEO content) */}
      <WhatIsDigitalMarketing />

      {/* 25. Free resources */}
      <FreeResources />

      {/* 26. Video section — removed */}
      {/* <VideoSection /> */}

      {/* 28. Expanded FAQ (18 questions) */}
      <ExpandedFAQ />

      {/* 28. Blog preview */}
      <BlogPreview />

      {/* 29. Final CTA */}
      <FinalCTA />

      {/* 30. Exit intent popup */}
      <ExitIntent />
    </>
  );
}