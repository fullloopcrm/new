// @ts-nocheck
import type { Metadata } from "next";
import { RoadwayIndex } from "@/app/site/nycroadsideemergencyassistance/_components/RoadwayIndex";
import { getRoadwaysByKind } from "@/app/site/nycroadsideemergencyassistance/_data/roadways";

export const metadata: Metadata = {
  title: "NYC Highways & Parkways We Cover — 24/7 Roadside &amp; Heavy Tow",
  description: `${getRoadwaysByKind("highway").length} NYC highways, parkways, and expressways covered for 24/7 roadside emergency — FDR, BQE, LIE, Belt, Cross Bronx, Verrazzano approach, and every parkway in between. Light, medium, and heavy-duty tow available. Flat $149/hour rate, $25 off online, 20-40 min arrival.`,
  alternates: { canonical: "/highways" },
};

export default function HighwaysIndexPage() {
  return (
    <RoadwayIndex
      kind="highway"
      intro="Every limited-access NYC highway, parkway, and expressway where breakdowns and accidents actually happen. No-shoulder corridors get priority dispatch. Heavy-duty wreckers staged for commercial breakdowns on the Cross Bronx, BQE, and LIE. Box-truck-on-parkway recoveries handled hourly."
    />
  );
}