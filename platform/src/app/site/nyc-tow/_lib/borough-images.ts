import { IMG, unsplash } from "./images";

/** Slugs match entries in src/data/cities.ts STATES array. */
const BOROUGH_IMAGE_IDS: Record<string, string> = {
  manhattan: IMG.nycSkylineYellowCab,
  brooklyn: IMG.nycBrooklynBridge,
  queens: IMG.borough3,
  bronx: IMG.borough4,
  "staten-island": IMG.borough5,
};

const DEFAULT_BOROUGH_IMAGE = IMG.nycNightSkyline;

export function getBoroughImage(slug: string, width = 1600): string {
  const id = BOROUGH_IMAGE_IDS[slug] ?? DEFAULT_BOROUGH_IMAGE;
  return unsplash(id, width);
}
