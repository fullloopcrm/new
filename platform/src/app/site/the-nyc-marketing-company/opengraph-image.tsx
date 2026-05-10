import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "The NYC Marketing Company — SEO, Branding, Web Design & AI Automation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #14b8a6 100%)",
          fontFamily: "system-ui, sans-serif",
          padding: "60px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.1)",
            borderRadius: "24px",
            padding: "60px 80px",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <div
            style={{
              fontSize: "72px",
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-2px",
              lineHeight: 1.1,
              textAlign: "center",
            }}
          >
            THE NYC
          </div>
          <div
            style={{
              fontSize: "72px",
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-2px",
              lineHeight: 1.1,
              textAlign: "center",
            }}
          >
            MARKETING CO
          </div>
          <div
            style={{
              fontSize: "24px",
              fontWeight: 500,
              color: "rgba(255,255,255,0.85)",
              marginTop: "24px",
              letterSpacing: "4px",
              textTransform: "uppercase",
            }}
          >
            SEO &bull; Branding &bull; Web Design &bull; AI
          </div>
          <div
            style={{
              fontSize: "20px",
              fontWeight: 400,
              color: "rgba(255,255,255,0.7)",
              marginTop: "16px",
            }}
          >
            thenycmarketingcompany.com &bull; (212) 202-9220
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
