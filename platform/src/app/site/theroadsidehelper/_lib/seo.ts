// @ts-nocheck
import type { Metadata } from "next";

const SITE_URL = "https://www.theroadsidehelper.com";

export interface PageSeoArgs {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
}

export function pageSeo(args: PageSeoArgs): Metadata {
  const ogTitle = args.ogTitle ?? args.title;
  const ogDescription = args.ogDescription ?? args.description;
  const url = args.path.startsWith("/") ? args.path : `/${args.path}`;
  const type = args.type ?? "website";

  const openGraph: NonNullable<Metadata["openGraph"]> =
    type === "article"
      ? {
          type: "article",
          siteName: "The Roadside Helper",
          title: ogTitle,
          description: ogDescription,
          url: `${SITE_URL}${url}`,
          locale: "en_US",
          publishedTime: args.publishedTime,
          modifiedTime: args.modifiedTime ?? args.publishedTime,
        }
      : {
          type: "website",
          siteName: "The Roadside Helper",
          title: ogTitle,
          description: ogDescription,
          url: `${SITE_URL}${url}`,
          locale: "en_US",
        };

  return {
    title: args.title,
    description: args.description,
    keywords: args.keywords,
    alternates: { canonical: url },
    openGraph,
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
    },
  };
}