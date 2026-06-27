// @ts-nocheck
import { STREETS } from "./streets";
import { HIGHWAYS } from "./highways";
import { BRIDGES } from "./bridges";
import { TUNNELS } from "./tunnels";

/**
 * Shared roadway data model used by /streets, /highways, /bridges, /tunnels.
 *
 * Every entry is a real NYC corridor where stranded drivers actually call us.
 * Field intent:
 *   - slug:            URL slug
 *   - name:            Human display name ("Brooklyn Bridge", "FDR Drive")
 *   - shortName:       Optional shorter label for cross-links ("FDR")
 *   - kind:            Top-level category for routing
 *   - subType:         Finer label rendered in copy ("Expressway", "Avenue", etc.)
 *   - boroughs:        Borough slugs the corridor touches
 *   - segment:         Plain-English description of where it runs
 *   - hazards:         Real failure modes that generate roadside calls
 *   - commonCalls:     Service slugs (from services.ts) most often dispatched here
 *   - relatedNeighborhoods: { state, city } slugs to cross-link to neighborhood pages
 *   - nearestExits:    Notable exits / on-ramps drivers reference when calling
 *   - lanes / speedLimit / length: optional structured facts for the page
 */
export type RoadwayKind = "street" | "highway" | "bridge" | "tunnel";

export interface RelatedNeighborhood {
  state: string;
  city: string;
}

export interface Roadway {
  slug: string;
  name: string;
  shortName?: string;
  kind: RoadwayKind;
  subType: string;
  boroughs: string[];
  segment: string;
  hazards: string[];
  commonCalls: string[];
  relatedNeighborhoods: RelatedNeighborhood[];
  nearestExits?: string[];
  lanes?: string;
  speedLimit?: string;
  length?: string;
  /** Geo coordinates approximating the midpoint of the corridor. */
  geo?: { lat: number; lon: number };
}

export const KIND_LABEL: Record<RoadwayKind, { singular: string; plural: string; pathSeg: string }> = {
  street: { singular: "Street", plural: "Streets", pathSeg: "streets" },
  highway: { singular: "Highway", plural: "Highways & Parkways", pathSeg: "highways" },
  bridge: { singular: "Bridge", plural: "Bridges", pathSeg: "bridges" },
  tunnel: { singular: "Tunnel", plural: "Tunnels", pathSeg: "tunnels" },
};

export const ROADWAYS_BY_KIND: Record<RoadwayKind, Roadway[]> = {
  street: STREETS,
  highway: HIGHWAYS,
  bridge: BRIDGES,
  tunnel: TUNNELS,
};

export function getRoadwaysByKind(kind: RoadwayKind): Roadway[] {
  return ROADWAYS_BY_KIND[kind];
}

export function getRoadwayBySlug(kind: RoadwayKind, slug: string): Roadway | undefined {
  return ROADWAYS_BY_KIND[kind].find((r) => r.slug === slug);
}

export const ALL_ROADWAYS: Roadway[] = [...STREETS, ...HIGHWAYS, ...BRIDGES, ...TUNNELS];