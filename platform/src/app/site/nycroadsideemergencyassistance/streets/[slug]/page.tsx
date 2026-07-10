import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RoadwayPage } from "@/app/site/nycroadsideemergencyassistance/_components/RoadwayPage";
import { getRoadwayBySlug, getRoadwaysByKind } from "@/app/site/nycroadsideemergencyassistance/_data/roadways";

export function generateStaticParams() { return [] }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const r = getRoadwayBySlug("street", slug);
  if (!r) return {};
  return {
    title: `${r.name} Roadside, Tow & Jump Start — NYC 24/7 Emergency`,
    description: `Stranded on ${r.name}? 24/7 roadside help across NYC — jump start, lockout, flat tire, fuel, accident recovery, full tow. $149/hr flat rate, $25 off online, 20-40 min arrival. (212) 470-4068.`,
    alternates: { canonical: `/streets/${slug}` },
  };
}

export default async function StreetPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const roadway = getRoadwayBySlug("street", slug);
  if (!roadway) notFound();
  return <RoadwayPage roadway={roadway} />;
}