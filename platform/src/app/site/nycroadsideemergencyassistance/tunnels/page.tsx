import type { Metadata } from "next";
import { RoadwayIndex } from "@/app/site/nycroadsideemergencyassistance/_components/RoadwayIndex";
import { getRoadwaysByKind } from "@/app/site/nycroadsideemergencyassistance/_data/roadways";

export const metadata: Metadata = {
  title: "NYC Tunnels We Cover — 24/7 Roadside, Tow & Recovery",
  description: `Every NYC vehicle tunnel covered for 24/7 roadside emergency — Holland, Lincoln, Queens-Midtown, Hugh L. Carey (Brooklyn-Battery). Port Authority and MTA Bridges & Tunnels tow protocol coordinated. Height-limit and breakdown-recovery specialists. (212) 470-4068.`,
  alternates: { canonical: "/tunnels" },
};

export default function TunnelsIndexPage() {
  return (
    <RoadwayIndex
      kind="tunnel"
      intro="The four NYC vehicle tunnels each have their own tow protocol — Port Authority for the Holland and Lincoln, MTA Bridges & Tunnels for the Queens-Midtown and Hugh L. Carey. We coordinate with agency dispatch so you get the wrecker you want, going where you actually need to go. Height-limit recoveries are routine — call before you back out of a tunnel in front of traffic."
    />
  );
}