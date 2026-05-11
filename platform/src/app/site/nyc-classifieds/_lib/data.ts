// @ts-nocheck
// Stub: nycmaid source had nyc-classifieds as scaffold-only.
// Replace with real data when nyc-classifieds becomes a live tenant.

export type Category = { name: string; slug: string; subcategories?: Array<{ name: string; slug: string }> }
export type Borough = { name: string; slug: string; neighborhoods?: Array<{ name: string; slug: string }> }

export const boroughs: Borough[] = []
export const categories: Category[] = []
export const businessCategories: Category[] = []
export const homepageColumns: Category[][] = []
export const mobileHomepageColumns: Category[][] = []
export const subcategoryExamples: Record<string, string[]> = {}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function neighborhoodSlug(name: string): string {
  return slugify(name)
}

export function findNeighborhood(_slug: string): { name: string; slug: string; borough?: string } | null {
  return null
}

export function boroughBySlug(_slug: string): Borough | null {
  return null
}

export function categoryBySlug(_slug: string): Category | null {
  return null
}

export function businessProfileUrl(_args: Record<string, unknown>): string {
  return '/'
}

export const porchPostTypes: Array<{ slug: string; name: string }> = []
export const porchPostTypeBySlug: Record<string, { slug: string; name: string }> = {}
