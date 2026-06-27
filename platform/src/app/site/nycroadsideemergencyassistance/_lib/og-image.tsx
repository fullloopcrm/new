// @ts-nocheck
import { ImageResponse } from "next/og";
import { getRoadwayBySlug, KIND_LABEL, type RoadwayKind } from "@/app/site/nycroadsideemergencyassistance/_data/roadways";

export const og_size = { width: 1200, height: 630 };
export const og_contentType = "image/png";

interface OgInput {
  eyebrow: string;
  title: string;
  subhead: string;
  badge?: string;
}

/**
 * Shared OG card renderer. Cream brand colors, big title, brand mark + price chip.
 * Used by the root OG and every per-segment OG (services, locations, roadways, etc.).
 */
function renderOgCard(input: OgInput) {
  const titleSize = input.title.length > 38 ? 64 : input.title.length > 26 ? 80 : 100;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          background:
            "linear-gradient(135deg, #0f766e 0%, #115e59 50%, #134e4a 100%)",
          color: "#ffffff",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              padding: "6px 14px",
              background: "#facc15",
              color: "#0f172a",
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              borderRadius: 6,
              display: "flex",
            }}
          >
            24/7 Roadside Emergency
          </div>
          <div
            style={{
              fontSize: 22,
              color: "#fef3c7",
              fontWeight: 600,
              display: "flex",
            }}
          >
            · {input.eyebrow}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: titleSize,
              fontWeight: 800,
              letterSpacing: -2,
              lineHeight: 1.0,
              color: "#ffffff",
              display: "flex",
            }}
          >
            {input.title}
          </div>
          <div
            style={{
              fontSize: 32,
              color: "#a7f3d0",
              fontWeight: 500,
              maxWidth: 1050,
              display: "flex",
            }}
          >
            {input.subhead}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#facc15",
                display: "flex",
              }}
            >
              NYC Roadside Emergency Assistance
            </div>
            <div
              style={{
                fontSize: 30,
                fontWeight: 700,
                color: "#ffffff",
                display: "flex",
              }}
            >
              (212) 470-4068
            </div>
          </div>
          <div
            style={{
              padding: "16px 28px",
              background: "#facc15",
              color: "#0f172a",
              fontSize: 28,
              fontWeight: 800,
              borderRadius: 10,
              display: "flex",
            }}
          >
            {input.badge ?? "$149/hr · $25 off online"}
          </div>
        </div>
      </div>
    ),
    og_size,
  );
}

/** Default brand OG used on the homepage and any route without an override. */
export function renderBrandOgImage() {
  return renderOgCard({
    eyebrow: "All 5 NYC Boroughs",
    title: "NYC Roadside Emergency Assistance",
    subhead:
      "Jump start · Lockout · Flat tire · Fuel · Accident recovery · Winch-out · Tow — $149/hr, $25 off online, 20-40 min arrival.",
  });
}

/** Roadway OG (used by /streets|/highways|/bridges|/tunnels [slug]). */
export function renderRoadwayOgImage(kind: RoadwayKind, slug: string) {
  const r = getRoadwayBySlug(kind, slug);
  if (!r) return renderBrandOgImage();
  const meta = KIND_LABEL[kind];
  return renderOgCard({
    eyebrow: `NYC ${meta.singular}`,
    title: r.name,
    subhead:
      "Jump start · Lockout · Flat tire · Fuel · Tow — $149/hr, $25 off online, 20-40 min arrival across all 5 boroughs.",
  });
}

/** Service OG (used by /services/[slug]). */
export function renderServiceOgImage(title: string, subtitle: string) {
  return renderOgCard({
    eyebrow: "NYC Service",
    title,
    subhead: `${subtitle} — same $149/hr rate, 1-hour minimum, $25 off when you book online. 20-40 min arrival, all 5 boroughs.`,
  });
}

/** Borough OG (used by /locations/[state]). */
export function renderBoroughOgImage(boroughName: string, neighborhoodCount: number) {
  return renderOgCard({
    eyebrow: "NYC Borough Coverage",
    title: `${boroughName} Roadside &amp; Tow`,
    subhead: `24/7 dispatch across ${neighborhoodCount}+ ${boroughName} neighborhoods — jump, lockout, tire, fuel, accident recovery, full tow. Flat $149/hr.`,
  });
}

/** Neighborhood OG (used by /locations/[state]/[city]). */
export function renderNeighborhoodOgImage(cityName: string, boroughName: string) {
  return renderOgCard({
    eyebrow: `${boroughName} · NYC`,
    title: `${cityName} Roadside &amp; Tow`,
    subhead:
      "Jump start · Lockout · Flat tire · Fuel · Tow — $149/hr, $25 off online. 20-40 min typical arrival.",
  });
}

export const og_alt = (label: string) =>
  `${label} — NYC Roadside Emergency Assistance · 24/7 jump start, lockout, flat tire, fuel, tow · $149/hr, $25 off online · (212) 470-4068`;