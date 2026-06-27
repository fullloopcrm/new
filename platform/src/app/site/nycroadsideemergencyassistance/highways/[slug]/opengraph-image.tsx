// @ts-nocheck
import { renderRoadwayOgImage, og_size, og_contentType } from "@/app/site/nycroadsideemergencyassistance/_lib/og-image";
import { getRoadwaysByKind } from "@/app/site/nycroadsideemergencyassistance/_data/roadways";

export const size = og_size;
export const contentType = og_contentType;
export const alt = "NYC highway roadside emergency, heavy-duty tow, accident recovery";

export function generateStaticParams() {
  return getRoadwaysByKind("highway").map((r) => ({ slug: r.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return renderRoadwayOgImage("highway", slug);
}