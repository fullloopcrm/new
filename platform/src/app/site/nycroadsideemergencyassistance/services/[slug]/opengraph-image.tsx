// @ts-nocheck
import { renderServiceOgImage, renderBrandOgImage, og_size, og_contentType, og_alt } from "@/app/site/nycroadsideemergencyassistance/_lib/og-image";
import { SERVICES } from "@/app/site/nycroadsideemergencyassistance/_data/services";

export const size = og_size;
export const contentType = og_contentType;
export const alt = og_alt("NYC service");

export function generateStaticParams() { return [] }

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = SERVICES.find((x) => x.slug === slug);
  if (!s) return renderBrandOgImage();
  return renderServiceOgImage(s.title, s.subtitle);
}