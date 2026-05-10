import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 110,
          background: "#374151",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#bfdbfe",
          borderRadius: 36,
          fontWeight: 800,
          fontFamily: "sans-serif",
        }}
      >
        &#127912;
      </div>
    ),
    { ...size }
  );
}
