// @ts-nocheck
// Stub: nycmaid source had nyc-classifieds as scaffold-only. These exports
// satisfy the imports so the marketing tree renders. Replace with real data
// when nyc-classifieds becomes a live tenant.

export const boroughs: Array<{ name: string; slug: string }> = []
export const categories: Array<{ name: string; slug: string }> = []
export const businessCategories: Array<{ name: string; slug: string }> = []

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function neighborhoodSlug(name: string): string {
  return slugify(name)
}

export function findNeighborhood(slug: string): { name: string; slug: string; borough?: string } | null {
  return null
}
