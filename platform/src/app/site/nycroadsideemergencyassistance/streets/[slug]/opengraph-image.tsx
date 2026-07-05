import { renderRoadwayOgImage, og_size, og_contentType } from "@/app/site/nycroadsideemergencyassistance/_lib/og-image";
import { getRoadwayBySlug, getRoadwaysByKind } from "@/app/site/nycroadsideemergencyassistance/_data/roadways";

export const size = og_size;
export const contentType = og_contentType;
export const alt = "NYC street roadside emergency, tow, and recovery";

export function generateStaticParams() { return [] }

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = getRoadwayBySlug("street", slug);
  return renderRoadwayOgImage("street", r?.slug ?? slug);
}