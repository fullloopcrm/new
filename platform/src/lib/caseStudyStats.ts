// Live case-study stats for The NYC Maid, pulled from its public read-only
// aggregate endpoint. Server-side fetch, ISR-cached for 1h so the marketing
// site refreshes hourly without ever hitting NYC Maid per visitor.
export type CaseStudyStats = {
  clients: number
  bookingsCompleted: number
  teamSize: number
  conversations: number
  reviews: number
  avgRating: number | null
  revenueRangeYtd: string
  generatedAt: string
}

const ENDPOINT = "https://www.thenycmaid.com/api/public/case-study-stats";

export async function getCaseStudyStats(): Promise<CaseStudyStats | null> {
  try {
    const res = await fetch(ENDPOINT, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<CaseStudyStats>;
    if (typeof data.generatedAt !== "string") return null;
    return data as CaseStudyStats;
  } catch {
    return null;
  }
}

// "2026-06-23T18:00:00.000Z" -> "Jun 23, 2026 · 2:00 PM ET"
export function formatGeneratedAt(iso: string): string {
  try {
    const d = new Date(iso);
    return (
      d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/New_York",
      }) + " ET"
    );
  } catch {
    return iso;
  }
}
