import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "linear-gradient(135deg, #E8A0BF 0%, #D4749B 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 900,
            color: "white",
            letterSpacing: 1,
            lineHeight: 1,
          }}
        >
          NYC
        </div>
      </div>
    ),
    { ...size }
  );
}
