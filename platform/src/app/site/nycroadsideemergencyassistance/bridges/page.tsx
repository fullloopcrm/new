import type { Metadata } from "next";
import { RoadwayIndex } from "@/app/site/nycroadsideemergencyassistance/_components/RoadwayIndex";
import { getRoadwaysByKind } from "@/app/site/nycroadsideemergencyassistance/_data/roadways";

export const metadata: Metadata = {
  title: "NYC Bridges We Cover — 24/7 Roadside, Tow & Recovery",
  description: `${getRoadwaysByKind("bridge").length} NYC bridges covered for 24/7 roadside emergency and accident recovery — Brooklyn, Manhattan, Williamsburg, Queensboro, RFK/Triboro, GWB, Verrazzano, Throgs Neck, Whitestone, Henry Hudson, and every Harlem River span. MTA / Port Authority tow protocol coordinated. (212) 470-4068.`,
  alternates: { canonical: "/bridges" },
};

export default function BridgesIndexPage() {
  return (
    <RoadwayIndex
      kind="bridge"
      intro="Every NYC vehicle bridge where stranded drivers actually call. Tolled MTA and Port Authority spans, free East River crossings, the Harlem River swing bridges, and the smaller spans that still see daily breakdowns. We coordinate with MTA Bridges & Tunnels and PAPD where the agency tow protocol requires it."
    />
  );
}