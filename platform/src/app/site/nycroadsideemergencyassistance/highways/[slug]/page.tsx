import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RoadwayPage } from "@/app/site/nycroadsideemergencyassistance/_components/RoadwayPage";
import { getRoadwayBySlug, getRoadwaysByKind } from "@/app/site/nycroadsideemergencyassistance/_data/roadways";

export function generateStaticParams() { return [] }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const r = getRoadwayBySlug("highway", slug);
  if (!r) return {};
  return {
    title: `${r.name} Roadside, Tow & Accident Recovery — NYC 24/7`,
    description: `Stranded on the ${r.name}? 24/7 roadside emergency — jump, tire, lockout, fuel, accident recovery, winch-out, heavy-duty tow. $149/hr flat rate, $25 off online. 20-40 min typical arrival. (212) 470-4068.`,
    alternates: { canonical: `/highways/${slug}` },
  };
}

export default async function HighwayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const roadway = getRoadwayBySlug("highway", slug);
  if (!roadway) notFound();
  return <RoadwayPage roadway={roadway} />;
}