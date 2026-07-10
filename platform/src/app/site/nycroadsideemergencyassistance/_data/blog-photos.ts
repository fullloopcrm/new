// Auto-generated per-blog-post photo manifest from Pexels.
// Each blog post slug → topic-matched image with SEO alt text.
import data from "./blog-photos.json";

export type BlogPhoto = {
  url: string;
  alt: string;
  photographer: string | null;
  photographer_url: string | null;
  pexels_url: string | null;
  width: number;
  height: number;
  query: string;
};

const PHOTOS = data as Record<string, BlogPhoto | null>;

const FALLBACK: BlogPhoto = {
  url: "https://images.pexels.com/photos/10061763/pexels-photo-10061763.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  alt: "Tow truck on a New York City street",
  photographer: "Pexels",
  photographer_url: "https://www.pexels.com",
  pexels_url: null,
  width: 940,
  height: 650,
  query: "tow truck nyc",
};

/** Returns a topic-matched photo for a blog post slug. Used by /blog and /blog/[slug]. */
export function getBlogPhoto(slug: string): BlogPhoto {
  return PHOTOS[slug] ?? FALLBACK;
}