import Link from "next/link";
import { CHAPTERS } from "@/components/case-study/cs";

const CASE_STUDY_URL = "/case-study/the-nyc-maid";

export function CaseStudyDesktopPanel() {
  return (
    <div className="w-[340px] p-2">
      <Link
        href={CASE_STUDY_URL}
        className="block rounded px-3 py-2.5 mb-1 text-[13px] font-semibold transition-colors hover:bg-[#FBFBF8]"
        style={{ color: "#1C1C1C" }}
      >
        Read the Full Case Study &rarr;
      </Link>
      <div className="my-1 h-px bg-[#EDEDE8]" />
      {CHAPTERS.map((chapter) => (
        <Link
          key={chapter.id}
          href={`${CASE_STUDY_URL}#${chapter.id}`}
          className="flex items-baseline gap-3 rounded px-3 py-2 text-[13px] transition-colors hover:bg-[#FBFBF8]"
        >
          <span className="font-mono text-[10px] uppercase tracking-wider shrink-0" style={{ color: "#A8A8A4" }}>
            {chapter.part}
          </span>
          <span style={{ color: "#1C1C1C" }}>{chapter.nav}</span>
        </Link>
      ))}
    </div>
  );
}

export function CaseStudyMobileList({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="ml-4 flex flex-col gap-0.5 border-l-2 pl-3" style={{ borderColor: "#EDEDE8" }}>
      <Link
        href={CASE_STUDY_URL}
        onClick={onNavigate}
        className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:text-teal-600"
      >
        Read the Full Case Study &rarr;
      </Link>
      {CHAPTERS.map((chapter) => (
        <Link
          key={chapter.id}
          href={`${CASE_STUDY_URL}#${chapter.id}`}
          onClick={onNavigate}
          className="rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:text-teal-600"
        >
          {chapter.part} — {chapter.nav}
        </Link>
      ))}
    </div>
  );
}
