import { renderBrandOgImage, og_size, og_contentType, og_alt } from "@/app/site/nycroadsideemergencyassistance/_lib/og-image";

export const size = og_size;
export const contentType = og_contentType;
export const alt = og_alt("NYC Roadside Emergency Assistance");

export default function Image() {
  return renderBrandOgImage();
}