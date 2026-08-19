import type { MetadataRoute } from "next";
import { SITE_URL } from "@/app/site/nyc-commercial-exterminator/_lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
