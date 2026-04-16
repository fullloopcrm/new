import { supabaseAdmin } from "@/lib/supabase";

export type TerritoryStatus = "available" | "pending" | "claimed";

export interface TerritoryInfo {
  status: TerritoryStatus;
  claimedAt: string | null;
  pendingSince: string | null;
}

const DEFAULT: TerritoryInfo = {
  status: "available",
  claimedAt: null,
  pendingSince: null,
};

// Lookup a single territory's status. Missing row = available.
// Errors degrade to "available" so the page never breaks on a DB issue.
export async function getTerritoryStatus(
  industrySlug: string,
  metroSlug: string
): Promise<TerritoryInfo> {
  try {
    const { data, error } = await supabaseAdmin
      .from("territories")
      .select("status, claimed_at, pending_since")
      .eq("industry_slug", industrySlug)
      .eq("metro_slug", metroSlug)
      .maybeSingle();

    if (error || !data) return DEFAULT;

    return {
      status: (data.status as TerritoryStatus) ?? "available",
      claimedAt: (data.claimed_at as string | null) ?? null,
      pendingSince: (data.pending_since as string | null) ?? null,
    };
  } catch {
    return DEFAULT;
  }
}

// Batch lookup used by metro and industry hub pages — returns a map of
// `{industry_slug}:{metro_slug}` → status so we don't N+1 the DB.
export async function getTerritoryStatusMap(
  pairs: Array<{ industrySlug: string; metroSlug: string }>
): Promise<Map<string, TerritoryInfo>> {
  const map = new Map<string, TerritoryInfo>();
  if (pairs.length === 0) return map;

  try {
    const industrySlugs = Array.from(new Set(pairs.map((p) => p.industrySlug)));
    const metroSlugs = Array.from(new Set(pairs.map((p) => p.metroSlug)));

    const { data, error } = await supabaseAdmin
      .from("territories")
      .select("industry_slug, metro_slug, status, claimed_at, pending_since")
      .in("industry_slug", industrySlugs)
      .in("metro_slug", metroSlugs);

    if (error || !data) return map;

    for (const row of data) {
      const key = `${row.industry_slug}:${row.metro_slug}`;
      map.set(key, {
        status: (row.status as TerritoryStatus) ?? "available",
        claimedAt: (row.claimed_at as string | null) ?? null,
        pendingSince: (row.pending_since as string | null) ?? null,
      });
    }
    return map;
  } catch {
    return map;
  }
}

export function territoryStatusLabel(status: TerritoryStatus): string {
  switch (status) {
    case "claimed":
      return "Claimed";
    case "pending":
      return "Application Under Review";
    default:
      return "Available";
  }
}

export function territoryStatusColor(status: TerritoryStatus): {
  bg: string;
  text: string;
  dot: string;
} {
  switch (status) {
    case "claimed":
      return { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-500" };
    case "pending":
      return { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-500" };
    default:
      return { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-500" };
  }
}
