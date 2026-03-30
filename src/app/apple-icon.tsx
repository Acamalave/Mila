import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          borderRadius: 36,
        }}
      >
        <svg
          width="140"
          height="120"
          viewBox="0 0 32 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Geometric M */}
          <path
            d="M2 24 L2 6 L9 16 L16 6 L16 24"
            stroke="#C4A96A"
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* À */}
          <path
            d="M19 6 L23.5 24 L28 6"
            stroke="#C4A96A"
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line
            x1="20.5"
            y1="17"
            x2="26.5"
            y2="17"
            stroke="#C4A96A"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          {/* Accent */}
          <line
            x1="25"
            y1="2"
            x2="27"
            y2="4.5"
            stroke="#C4A96A"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
