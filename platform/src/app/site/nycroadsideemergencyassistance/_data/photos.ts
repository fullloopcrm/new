// Auto-generated photo manifest sourced from Pexels API.
// Regenerate by running the fetch script in scripts/fetch-photos.py (one-off).
import data from "./photos.json";

export type Photo = {
  url: string;
  alt: string;
  photographer: string | null;
  photographer_url: string | null;
  pexels_url: string | null;
  width: number;
  height: number;
};

const PHOTOS = data as Record<string, Photo | null>;

const FALLBACK: Photo = {
  url: "https://images.pexels.com/photos/10061763/pexels-photo-10061763.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  alt: "Tow truck on a New York City street",
  photographer: "Pexels",
  photographer_url: "https://www.pexels.com",
  pexels_url: null,
  width: 940,
  height: 650,
};

/** Look up a photo by key (service slug, or _home / _about / _pricing / _commercial / _careers / _franchise / _blog). */
export function getPhoto(key: string): Photo {
  return PHOTOS[key] ?? FALLBACK;
}