import { type CaseStudyStats, formatGeneratedAt } from "@/lib/caseStudyStats";

/**
 * Live proof band — real, hourly-updated stats from The NYC Maid (the business
 * Full Loop CRM built and runs ~99% on AI). Server component; renders nothing
 * if the live feed is unavailable. Shared across homepage, industry, location.
 */
export default function LiveProofBand({ live }: { live?: CaseStudyStats | null }) {
  if (!live) return null;

  const stats = [
    { value: live.clients.toLocaleString(), label: "Clients" },
    { value: live.bookingsCompleted.toLocaleString(), label: "Bookings completed" },
    { value: live.conversations.toLocaleString(), label: "AI conversations" },
    { value: live.reviews.toLocaleString(), label: "Reviews" },
    { value: live.avgRating != null ? `${live.avgRating.toFixed(1)}★` : "—", label: "Avg rating" },
    { value: live.revenueRangeYtd, label: "Revenue YTD" },
  ];

  return (
    <section className="bg-white py-12 px-6">
      <div className="mx-auto max-w-5xl rounded-2xl border-2 border-teal-600 p-8 sm:p-10">
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-600 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal-600" />
          </span>
          <p className="font-mono text-xs tracking-[0.25em] uppercase text-teal-700">
            Live · The NYC Maid runs on Full Loop · updates hourly
          </p>
        </div>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900">
                {s.value}
              </p>
              <p className="mt-1 text-xs text-slate-500 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-slate-500">
          ~200 services a month, run by one person in under an hour a day. Pulled
          live from The NYC Maid&apos;s production system · as of{" "}
          {formatGeneratedAt(live.generatedAt)}
        </p>
      </div>
    </section>
  );
}
