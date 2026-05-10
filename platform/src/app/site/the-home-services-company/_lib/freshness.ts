// @ts-nocheck
// Utilities for auto-renewing listing dates so Google Jobs / search don't mark listings stale.
// Pages using these should set `export const revalidate = 86400` (daily ISR) so the HTML
// regenerates and the returned dates stay inside the freshness window.

const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;
const VALID_THROUGH_DAYS = 45;

function isoDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function isoDateTime(date: Date): string {
  return date.toISOString();
}

/**
 * Returns a datePosted that always sits within the last 15 days.
 * Uses a deterministic offset based on the current calendar day so the
 * same page rendered twice on the same day returns the same value
 * (cache-friendly) while still refreshing every ~15 days in the aggregate.
 *
 * @param seed — optional string (e.g. city slug) to stagger dates across pages
 */
export function getDatePosted(seed?: string): string {
  const now = new Date();
  let offsetDays = now.getUTCDate() % 15;
  if (seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
    offsetDays = ((offsetDays + Math.abs(hash)) % 15);
  }
  const posted = new Date(now.getTime() - offsetDays * 24 * 60 * 60 * 1000);
  return isoDate(posted);
}

/** datePosted as a full ISO datetime (for JSON-LD structured data). */
export function getDatePostedISO(seed?: string): string {
  const datePosted = getDatePosted(seed);
  return new Date(datePosted + "T09:00:00Z").toISOString();
}

/** validThrough 45 days after datePosted. */
export function getValidThrough(seed?: string): string {
  const posted = new Date(getDatePosted(seed));
  const valid = new Date(posted.getTime() + VALID_THROUGH_DAYS * 24 * 60 * 60 * 1000);
  return isoDate(valid);
}

export function getValidThroughISO(seed?: string): string {
  return new Date(getValidThrough(seed) + "T23:59:59Z").toISOString();
}

/** Human-readable "Posted 3 days ago" string. */
export function getPostedLabel(seed?: string): string {
  const posted = new Date(getDatePosted(seed)).getTime();
  const diffDays = Math.max(0, Math.floor((Date.now() - posted) / (24 * 60 * 60 * 1000)));
  if (diffDays === 0) return "Posted today";
  if (diffDays === 1) return "Posted yesterday";
  return `Posted ${diffDays} days ago`;
}

export { FIFTEEN_DAYS_MS, isoDateTime };
