import Link from "next/link";
import { DASHBOARD_MODULES } from "@/lib/marketing/dashboardModules";

const FEATURES_URL = "/full-loop-crm-service-features";

export function FeaturesDesktopPanel() {
  return (
    <div className="w-[420px] p-2 max-h-[70vh] overflow-y-auto">
      {DASHBOARD_MODULES.map((mod) => (
        <Link
          key={mod.id}
          href={`${FEATURES_URL}#${mod.id}`}
          className="block rounded px-3 py-2.5 transition-colors hover:bg-[#FBFBF8]"
        >
          <span className="text-[13px]" style={{ color: "#1C1C1C" }}>{mod.name}</span>
          <span className="block text-[11px] mt-0.5" style={{ color: "#A8A8A4" }}>{mod.desc}</span>
        </Link>
      ))}
      <div className="my-1 h-px bg-[#EDEDE8]" />
      <Link
        href={FEATURES_URL}
        className="block rounded px-3 py-2.5 text-[13px] font-semibold transition-colors hover:bg-[#FBFBF8]"
        style={{ color: "#1C1C1C" }}
      >
        See All Features &rarr;
      </Link>
    </div>
  );
}

export function FeaturesMobileList({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="ml-4 flex flex-col gap-0.5 border-l-2 pl-3 max-h-[50vh] overflow-y-auto" style={{ borderColor: "#EDEDE8" }}>
      {DASHBOARD_MODULES.map((mod) => (
        <Link
          key={mod.id}
          href={`${FEATURES_URL}#${mod.id}`}
          onClick={onNavigate}
          className="rounded-lg px-2 py-1.5 text-sm text-slate-600 transition-colors hover:text-teal-600"
        >
          {mod.name}
        </Link>
      ))}
      <Link href={FEATURES_URL} onClick={onNavigate} className="rounded-lg px-2 py-2 text-sm font-semibold text-teal-600">
        See All Features &rarr;
      </Link>
    </div>
  );
}
