// @ts-nocheck
import { renderNeighborhoodOgImage, renderBrandOgImage, og_size, og_contentType, og_alt } from "@/app/site/nycroadsideemergencyassistance/_lib/og-image";
import { getCityBySlug, getAllCities } from "@/app/site/nycroadsideemergencyassistance/_data/cities";

export const size = og_size;
export const contentType = og_contentType;
export const alt = og_alt("NYC neighborhood coverage");

export function generateStaticParams() { return [] }

export default async function Image({
  params,
}: {
  params: Promise<{ state: string; city: string }>;
}) {
  const { state: stateSlug, city: citySlug } = await params;
  const result = getCityBySlug(stateSlug, citySlug);
  if (!result) return renderBrandOgImage();
  return renderNeighborhoodOgImage(result.city.name, result.state.name);
}