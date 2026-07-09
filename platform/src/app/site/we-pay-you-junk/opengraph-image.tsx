import { ImageResponse } from "next/og";

export const alt = "We Pay You Junk Removal — $200/hr, We Pay You For Your Stuff";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Dynamic social-share image (no static asset needed). Applies to the whole
// We Pay You Junk site; fixes the previously-blank OG/Twitter card.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #115e59 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, fontWeight: 600, letterSpacing: 4, textTransform: "uppercase", color: "#99f6e4" }}>
          Nationwide · 900+ Cities
        </div>
        <div style={{ display: "flex", fontSize: 84, fontWeight: 800, marginTop: 20, lineHeight: 1.05 }}>
          We Pay You Junk Removal
        </div>
        <div style={{ display: "flex", fontSize: 40, marginTop: 28, color: "rgba(255,255,255,0.9)" }}>
          $200/hr fully inclusive · Dump fees included · We pay you for your stuff
        </div>
      </div>
    ),
    { ...size },
  );
}
