// @ts-nocheck
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RoadwayPage } from "@/app/site/nycroadsideemergencyassistance/_components/RoadwayPage";
import { getRoadwayBySlug, getRoadwaysByKind } from "@/app/site/nycroadsideemergencyassistance/_data/roadways";

export function generateStaticParams() {
  return getRoadwaysByKind("tunnel").map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const r = getRoadwayBySlug("tunnel", slug);
  if (!r) return {};
  return {
    title: `${r.name} Roadside, Tow & Recovery — NYC 24/7 Emergency`,
    description: `Broken down at the ${r.name}? 24/7 NYC roadside emergency — coordinated with MTA Bridges & Tunnels / Port Authority tow protocol. $149/hr flat rate, $25 off online. 20-40 min typical arrival. (212) 470-4068.`,
    alternates: { canonical: `/tunnels/${slug}` },
  };
}

export default async function TunnelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const roadway = getRoadwayBySlug("tunnel", slug);
  if (!roadway) notFound();
  return <RoadwayPage roadway={roadway} />;
}