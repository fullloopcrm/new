import { ImageResponse } from "next/og";

export const alt =
  "The Roadside Helper — 24/7 roadside assistance at flat $149/hr. Call (888) 944-3001.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 80px",
          background:
            "linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #064e3b 100%)",
          color: "white",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: "#fcd34d",
              boxShadow: "0 0 24px rgba(252,211,77,0.7)",
            }}
          />
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: "0.32em",
              color: "#fcd34d",
              textTransform: "uppercase",
            }}
          >
            24/7 Nationwide Roadside Assistance
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              fontSize: 100,
              fontWeight: 800,
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
            }}
          >
            <span style={{ color: "#fcd34d", marginRight: 24 }}>Stranded?</span>
            <span>We&apos;ll be there in under an hour.</span>
          </div>
          <div
            style={{
              fontSize: 36,
              color: "rgba(255,255,255,0.85)",
              lineHeight: 1.25,
              maxWidth: 1000,
            }}
          >
            Flat $149/hr. 1-hour minimum. No membership. 12 services, 900+
            cities, all 50 states.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255,255,255,0.18)",
            paddingTop: 28,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div
              style={{
                fontSize: 22,
                color: "rgba(255,255,255,0.6)",
                textTransform: "uppercase",
                letterSpacing: "0.24em",
              }}
            >
              Call now
            </div>
            <div
              style={{
                fontSize: 56,
                fontWeight: 800,
                color: "white",
                letterSpacing: "-0.02em",
              }}
            >
              (888) 944-3001
            </div>
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              padding: "20px 32px",
              background: "#fcd34d",
              color: "#0f172a",
              borderRadius: 14,
            }}
          >
            theroadsidehelper.com
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}