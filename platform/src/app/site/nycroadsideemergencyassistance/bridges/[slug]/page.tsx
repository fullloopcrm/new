import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RoadwayPage } from "@/app/site/nycroadsideemergencyassistance/_components/RoadwayPage";
import { getRoadwayBySlug, getRoadwaysByKind } from "@/app/site/nycroadsideemergencyassistance/_data/roadways";

export function generateStaticParams() { return [] }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const r = getRoadwayBySlug("bridge", slug);
  if (!r) return {};
  return {
    title: `${r.name} Roadside, Tow & Recovery — NYC 24/7 Emergency`,
    description: `Stranded on the ${r.name}? 24/7 NYC roadside emergency — jump, tire, lockout, fuel, accident recovery, heavy-duty tow. MTA / Port Authority tow protocol coordinated. $149/hr flat rate, $25 off online. (212) 470-4068.`,
    alternates: { canonical: `/bridges/${slug}` },
  };
}

export default async function BridgePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const roadway = getRoadwayBySlug("bridge", slug);
  if (!roadway) notFound();
  return <RoadwayPage roadway={roadway} />;
}