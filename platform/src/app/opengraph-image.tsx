import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Full Loop CRM — The First Full-Cycle CRM for Home Service Businesses";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "40px",
          }}
        >
          <span
            style={{
              fontSize: "64px",
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "0.1em",
            }}
          >
            FULL LOOP
          </span>
          <span
            style={{
              fontSize: "64px",
              fontWeight: 800,
              color: "#2dd4bf",
              letterSpacing: "0.1em",
              marginLeft: "8px",
            }}
          >
            CRM
          </span>
        </div>
        <div
          style={{
            fontSize: "32px",
            color: "#94a3b8",
            textAlign: "center",
            maxWidth: "900px",
            lineHeight: 1.4,
            marginBottom: "40px",
          }}
        >
          The First Full-Cycle CRM for Home Service Businesses
        </div>
        <div
          style={{
            display: "flex",
            gap: "24px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {[
            "Lead Gen",
            "AI Sales",
            "Scheduling",
            "GPS Ops",
            "Payments",
            "Reviews",
            "Retargeting",
          ].map((stage) => (
            <div
              key={stage}
              style={{
                background: "rgba(45, 212, 191, 0.15)",
                border: "1px solid rgba(45, 212, 191, 0.3)",
                borderRadius: "8px",
                padding: "10px 20px",
                fontSize: "18px",
                color: "#2dd4bf",
                fontWeight: 600,
              }}
            >
              {stage}
            </div>
          ))}
        </div>
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            fontSize: "20px",
            color: "#64748b",
          }}
        >
          fullloopcrm.com — One partner per trade per metro
        </div>
      </div>
    ),
    { ...size }
  );
}
