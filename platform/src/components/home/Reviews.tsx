import Link from "next/link";
import { C, display, mono, proseStyle } from "./editorial";
import SectionHead from "./SectionHead";
import SectionCloser from "./SectionCloser";

interface Review {
  id: string;
  name: string;
  rating: number;
  text: string;
  neighborhood: string | null;
  cleaner_name: string | null;
  verified: boolean;
}

// Real customer reviews — fetched live from The NYC Maid (the business Full Loop
// runs). No fabricated blurbs; if the feed fails the section simply renders
// nothing rather than inventing reviews.
async function getReviews(): Promise<Review[]> {
  try {
    const res = await fetch("https://www.thenycmaid.com/api/reviews", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const all: Review[] = Array.isArray(data?.reviews) ? data.reviews : [];
    return all
      .filter((r) => r && typeof r.text === "string" && r.text.trim().length > 15 && r.rating >= 4)
      .slice(0, 12);
  } catch {
    return [];
  }
}

function Stars({ n }: { n: number }) {
  return (
    <div aria-label={`${n} out of 5 stars`} style={{ color: C.good, fontSize: "14px", letterSpacing: "2px" }}>
      {"★".repeat(Math.max(0, Math.min(5, n)))}
      <span style={{ color: C.line }}>{"★".repeat(5 - Math.max(0, Math.min(5, n)))}</span>
    </div>
  );
}

export default async function Reviews() {
  const reviews = await getReviews();
  if (reviews.length === 0) return null;

  return (
    <section style={{ background: C.cream, color: C.ink }} className="border-t">
      <div className="w-full max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 py-20 sm:py-28">
        <SectionHead
          label="Verified customer reviews"
          heading="Real Home Service Reviews: What The NYC Maid's Clients Say About a Business Run on Full Loop CRM"
          description={
            <>
              Not testimonials we wrote &mdash; real reviews from real customers of the home
              service business Full Loop runs, rated <strong>4.9&#9733; across 70 Google
              reviews.</strong>
            </>
          }
        />

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px" style={{ background: C.line, border: `1px solid ${C.line}` }}>
          {reviews.map((r) => (
            <figure key={r.id} className="p-6 flex flex-col" style={{ background: C.canvas }}>
              <Stars n={r.rating} />
              <blockquote
                className="mt-4 flex-1"
                style={{ fontFamily: display, fontWeight: 500, fontSize: "16px", lineHeight: 1.45, letterSpacing: "-0.01em", color: C.ink }}
              >
                &ldquo;{r.text}&rdquo;
              </blockquote>
              <figcaption className="mt-5" style={{ fontFamily: mono, fontSize: "11px", letterSpacing: "0.04em", color: C.muted }}>
                <span style={{ color: C.ink }}>{r.name}</span>
                {r.neighborhood ? ` · ${r.neighborhood}` : ""}
                {r.cleaner_name ? ` · cleaner: ${r.cleaner_name}` : ""}
                {r.verified ? (
                  <span style={{ color: C.good }}> · verified</span>
                ) : null}
              </figcaption>
            </figure>
          ))}
        </div>

        <p className="mt-8 max-w-3xl" style={{ ...proseStyle, fontSize: "15px" }}>
          These come straight from The NYC Maid&apos;s live review feed. The same automated
          review engine that earned them runs for every operator on{" "}
          <Link href="/full-loop-crm-service-features" style={{ color: C.good, textDecoration: "underline", textUnderlineOffset: "2px" }}>
            Full Loop CRM
          </Link>.
        </p>

        <SectionCloser href="/case-study/the-nyc-maid" label="See the full case study" formLabel="I Want Reviews Like This — Apply" />
      </div>
    </section>
  );
}
