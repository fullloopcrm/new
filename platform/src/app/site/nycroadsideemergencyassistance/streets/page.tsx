// @ts-nocheck
import type { Metadata } from "next";
import { RoadwayIndex } from "@/app/site/nycroadsideemergencyassistance/_components/RoadwayIndex";
import { getRoadwaysByKind } from "@/app/site/nycroadsideemergencyassistance/_data/roadways";

export const metadata: Metadata = {
  title: "NYC Streets We Cover — Roadside, Tow & Recovery 24/7",
  description: `${getRoadwaysByKind("street").length}+ major NYC streets, avenues, and boulevards covered for 24/7 roadside emergency — jump start, lockout, flat tire, fuel, accident recovery, full tow. Flat $149/hour rate, $25 off online, 20-40 min arrival. (212) 470-4068.`,
  alternates: { canonical: "/streets" },
};

export default function StreetsIndexPage() {
  return (
    <RoadwayIndex
      kind="street"
      intro="Major NYC commercial spines, crosstown arteries, and neighborhood-defining boulevards. We dispatch trucks to every street listed below — and most of the side streets in between. Tap one to see the corridor, the failure modes that generate roadside calls there, and the services we run most often."
    />
  );
}