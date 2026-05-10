// @ts-nocheck
import servicesData from "@/app/site//_data/services.json";
import neighborhoodsData from "@/app/site//_data/neighborhoods.json";

export interface FAQ {
  q: string;
  a: string;
}

export interface Service {
  slug: string;
  name: string;
  category: string;
  description: string;
  extendedDescription: string;
  commonServices: string[];
  faqs: FAQ[];
  priceRange: string;
  emergencyAvailable: boolean;
  licensingNote: string;
  seoChecklist: string[];
  competitorSigns: string[];
  avgRating: number;
  reviewCount: number;
}

export interface Neighborhood {
  slug: string;
  name: string;
  region: string;
  type: "borough" | "neighborhood" | "city";
}

export function getAllServices(): Service[] {
  return servicesData as Service[];
}

export function getAllNeighborhoods(): Neighborhood[] {
  return neighborhoodsData as Neighborhood[];
}

export function getServiceBySlug(slug: string): Service | undefined {
  return (servicesData as Service[]).find((s) => s.slug === slug);
}

export function getNeighborhoodBySlug(slug: string): Neighborhood | undefined {
  return (neighborhoodsData as Neighborhood[]).find((n) => n.slug === slug);
}

export function getServicesByCategory(): Record<string, Service[]> {
  const grouped: Record<string, Service[]> = {};
  for (const service of servicesData as Service[]) {
    if (!grouped[service.category]) {
      grouped[service.category] = [];
    }
    grouped[service.category].push(service);
  }
  return grouped;
}

export function getNeighborhoodsByRegion(): Record<string, Neighborhood[]> {
  const grouped: Record<string, Neighborhood[]> = {};
  for (const n of neighborhoodsData as Neighborhood[]) {
    if (!grouped[n.region]) {
      grouped[n.region] = [];
    }
    grouped[n.region].push(n);
  }
  return grouped;
}

export function getRegions(): string[] {
  return [
    "Manhattan",
    "Brooklyn",
    "Queens",
    "Bronx",
    "Staten Island",
    "New Jersey",
    "Long Island",
    "Westchester",
  ];
}

export function getCategories(): string[] {
  const cats = new Set((servicesData as Service[]).map((s) => s.category));
  return Array.from(cats).sort();
}

export function categoryToSlug(category: string): string {
  return category.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-");
}

export function slugToCategory(slug: string): string | undefined {
  const all = getCategories();
  return all.find((c) => categoryToSlug(c) === slug);
}

export function getServicesByCategorySlug(slug: string): Service[] {
  const category = slugToCategory(slug);
  if (!category) return [];
  return (servicesData as Service[]).filter((s) => s.category === category);
}

export function getRelatedServices(service: Service, limit = 6): Service[] {
  return (servicesData as Service[])
    .filter((s) => s.category === service.category && s.slug !== service.slug)
    .slice(0, limit);
}

export function getCrossCategoryServices(service: Service, limit = 4): Service[] {
  return (servicesData as Service[])
    .filter((s) => s.category !== service.category)
    .filter((_, i) => i % 7 === 0)
    .slice(0, limit);
}

export function getNearbyNeighborhoods(
  neighborhood: Neighborhood,
  limit = 8
): Neighborhood[] {
  const byRegion = getNeighborhoodsByRegion();
  return (byRegion[neighborhood.region] || [])
    .filter((n) => n.slug !== neighborhood.slug)
    .slice(0, limit);
}

export function getOtherRegionNeighborhoods(
  neighborhood: Neighborhood,
  limit = 4
): Neighborhood[] {
  const byRegion = getNeighborhoodsByRegion();
  const otherRegions = Object.keys(byRegion).filter(
    (r) => r !== neighborhood.region
  );
  return otherRegions
    .flatMap((r) => byRegion[r].slice(0, 1))
    .slice(0, limit);
}
