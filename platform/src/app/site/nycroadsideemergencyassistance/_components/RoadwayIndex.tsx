// @ts-nocheck
import Link from "next/link";
import { CtaButtons } from "@/app/site/nycroadsideemergencyassistance/_components/CtaButtons";
import { JsonLd, breadcrumbSchema, itemListSchema } from "@/app/site/nycroadsideemergencyassistance/_lib/schema";
import { getRoadwaysByKind, KIND_LABEL, type RoadwayKind } from "@/app/site/nycroadsideemergencyassistance/_data/roadways";

/**
 * Shared index page for /streets, /highways, /bridges, /tunnels.
 * Lists every roadway of the given kind grouped by borough.
 */
export function RoadwayIndex({ kind, intro }: { kind: RoadwayKind; intro: string }) {
  const meta = KIND_LABEL[kind];
  const roadways = getRoadwaysByKind(kind);

  // Group by primary borough.
  const byBorough = new Map<string, typeof roadways>();
  for (const r of roadways) {
    const primary = r.boroughs[0] ?? "manhattan";
    if (!byBorough.has(primary)) byBorough.set(primary, []);
    byBorough.get(primary)!.push(r);
  }

  const boroughOrder = ["manhattan", "brooklyn", "queens", "bronx", "staten-island"];
  const boroughName: Record<string, string> = {
    manhattan: "Manhattan",
    brooklyn: "Brooklyn",
    queens: "Queens",
    bronx: "Bronx",
    "staten-island": "Staten Island",
  };

  const schemas: Array<Record<string, unknown>> = [
    breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: meta.plural, url: `/${meta.pathSeg}` },
    ]),
    itemListSchema(
      roadways.map((r) => ({
        name: r.name,
        url: `/${meta.pathSeg}/${r.slug}`,
        description: r.subType,
      })),
      `NYC ${meta.plural}`,
    ),
  ];

  return (
    <>
      <JsonLd schema={schemas} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            24/7 Roadside Emergency · All 5 Boroughs
          </p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            <span className="gradient-text">NYC {meta.plural}</span> &mdash; Roadside &amp; Tow Coverage
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">{intro}</p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      {/* Grid grouped by borough */}
      {boroughOrder
        .filter((b) => byBorough.has(b))
        .map((b, idx) => {
          const list = byBorough.get(b)!;
          const sectionClass = idx % 2 === 0 ? "bg-section-white" : "bg-section-teal";
          return (
            <section key={b} className={`${sectionClass} py-16`}>
              <div className="mx-auto max-w-5xl px-6">
                <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
                  {boroughName[b]} {meta.plural}
                </h2>
                <p className="mx-auto mt-3 max-w-3xl text-center text-base text-slate-600">
                  {list.length} {list.length === 1 ? meta.singular.toLowerCase() : meta.plural.toLowerCase()} we dispatch trucks to in {boroughName[b]}.
                </p>
                <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((r) => (
                    <Link
                      key={r.slug}
                      href={`/${meta.pathSeg}/${r.slug}`}
                      className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md"
                    >
                      <h3 className="text-base font-bold text-slate-900 font-heading group-hover:text-teal-700 transition-colors">{r.name}</h3>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-teal-600 font-cta">{r.subType}</p>
                      <p className="mt-3 text-sm text-slate-600 line-clamp-3">{r.segment}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          );
        })}
    </>
  );
}