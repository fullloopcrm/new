import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Hazard/warning triangle: yellow triangle with black border and exclamation
// mark, set on the site's red brand background (#b91c1c).
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#b91c1c",
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Yellow triangle with black outline */}
          <polygon
            points="14,3 26,25 2,25"
            fill="#facc15"
            stroke="#000000"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Exclamation bar */}
          <rect x="12.5" y="11" width="3" height="8" fill="#000000" />
          {/* Exclamation dot */}
          <rect x="12.5" y="20.5" width="3" height="2.5" fill="#000000" />
        </svg>
      </div>
    ),
    size,
  );
}
