import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 36,
          background: "linear-gradient(135deg, #E8A0BF 0%, #D4749B 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <div
          style={{
            fontSize: 48,
            fontWeight: 900,
            color: "white",
            letterSpacing: 4,
            lineHeight: 1,
          }}
        >
          NYC
        </div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "rgba(255,255,255,0.85)",
            letterSpacing: 6,
            lineHeight: 1.4,
          }}
        >
          MOBILE
        </div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "rgba(255,255,255,0.85)",
            letterSpacing: 6,
            lineHeight: 1.2,
          }}
        >
          SALON
        </div>
      </div>
    ),
    { ...size }
  );
}
