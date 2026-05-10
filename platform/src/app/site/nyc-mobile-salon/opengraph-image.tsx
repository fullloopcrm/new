import { ImageResponse } from "next/og";

export const alt = "The NYC Mobile Salon — Mobile Beauty Services in NYC";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "linear-gradient(135deg, #E8A0BF 0%, #BA5A8A 50%, #9B3D6E 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Subtle pattern overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.08) 0%, transparent 50%)",
            display: "flex",
          }}
        />

        {/* Top badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 24,
            padding: "8px 24px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.25)",
          }}
        >
          <div style={{ fontSize: 16, color: "white", fontWeight: 600, letterSpacing: 3 }}>
            ALL 5 NYC BOROUGHS
          </div>
        </div>

        {/* Main title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: "white",
            letterSpacing: 2,
            lineHeight: 1.1,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <span>THE NYC</span>
          <span>MOBILE SALON</span>
        </div>

        {/* Divider */}
        <div
          style={{
            width: 80,
            height: 3,
            background: "rgba(255,255,255,0.5)",
            borderRadius: 2,
            margin: "28px 0",
            display: "flex",
          }}
        />

        {/* Tagline */}
        <div
          style={{
            fontSize: 24,
            color: "rgba(255,255,255,0.9)",
            fontWeight: 500,
            letterSpacing: 1,
            textAlign: "center",
            display: "flex",
          }}
        >
          Licensed Beauty Pros — Delivered to Your Door
        </div>

        {/* Services row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginTop: 28,
          }}
        >
          {["Hair", "Nails", "Makeup", "Grooming", "Events"].map((s) => (
            <div
              key={s}
              style={{
                fontSize: 14,
                color: "white",
                fontWeight: 600,
                letterSpacing: 2,
                padding: "6px 16px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.3)",
                display: "flex",
              }}
            >
              {s.toUpperCase()}
            </div>
          ))}
        </div>

        {/* URL */}
        <div
          style={{
            position: "absolute",
            bottom: 28,
            fontSize: 16,
            color: "rgba(255,255,255,0.6)",
            fontWeight: 500,
            letterSpacing: 2,
            display: "flex",
          }}
        >
          THENYCMOBILESALON.COM
        </div>
      </div>
    ),
    { ...size }
  );
}
