// @ts-nocheck
import { renderBoroughOgImage, renderBrandOgImage, og_size, og_contentType, og_alt } from "@/app/site/nycroadsideemergencyassistance/_lib/og-image";
import { STATES, getStateBySlug } from "@/app/site/nycroadsideemergencyassistance/_data/cities";

export const size = og_size;
export const contentType = og_contentType;
export const alt = og_alt("NYC borough coverage");

export function generateStaticParams() { return [] }

export default async function Image({ params }: { params: Promise<{ state: string }> }) {
  const { state: stateSlug } = await params;
  const state = getStateBySlug(stateSlug);
  if (!state) return renderBrandOgImage();
  return renderBoroughOgImage(state.name, state.cities.length);
}