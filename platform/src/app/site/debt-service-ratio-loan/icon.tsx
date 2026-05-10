import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 22,
          background: "#1a3c34",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#4ade80",
          borderRadius: 6,
          fontWeight: 800,
          fontFamily: "sans-serif",
        }}
      >
        $
      </div>
    ),
    { ...size }
  );
}
