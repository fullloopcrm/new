// Reusable feature-comparison block for industry/location/combo pages.
// Compares Full Loop's actual shipped capabilities (from the case study,
// nothing invented) against a generic field-service CRM category — no
// specific claims about any single named competitor's current feature set,
// since that changes and isn't something this codebase can verify live.
const ROWS: { feature: string; fullLoop: string; generic: string }[] = [
  { feature: "Lead generation", fullLoop: "Organic SEO network you own, no paid ads required", generic: "Bring your own leads or pay for ads" },
  { feature: "Front-office coverage", fullLoop: "AI agent answers every call/text 24/7, qualifies and books", generic: "Voicemail or a human answering service" },
  { feature: "Territory model", fullLoop: "One exclusive operator per trade per city", generic: "Unlimited competitors on the same software" },
  { feature: "Scheduling", fullLoop: "Smart-dispatch scoring, recurring patterns, travel time", generic: "Manual calendar assignment" },
  { feature: "Payments & payouts", fullLoop: "Automatic collection and crew payouts on completion", generic: "Manual invoicing, separate payroll" },
  { feature: "Reviews", fullLoop: "Automated request + sync on every completed job", generic: "Manual follow-up, if any" },
  { feature: "Ownership", fullLoop: "You own your site, your domain, your client list, your reviews", generic: "Varies by vendor" },
];

export function ComparisonTable({ trade }: { trade: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left px-4 py-3 font-heading font-bold text-slate-900">Capability</th>
            <th className="text-left px-4 py-3 font-heading font-bold text-teal-700">Full Loop CRM</th>
            <th className="text-left px-4 py-3 font-heading font-bold text-slate-500">Generic {trade} CRM</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, idx) => (
            <tr key={row.feature} className={idx % 2 === 1 ? "bg-slate-50" : "bg-white"}>
              <td className="px-4 py-3 font-semibold text-slate-800 align-top">{row.feature}</td>
              <td className="px-4 py-3 text-teal-800 align-top">{row.fullLoop}</td>
              <td className="px-4 py-3 text-slate-500 align-top">{row.generic}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
