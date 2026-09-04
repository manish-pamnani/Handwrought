import { ImageResponse } from "next/og";

// Generated at request time from the same color tokens as globals.css
// (kept in sync by hand — this file can't import CSS custom properties)
// rather than a hand-designed asset, so there's a real OG image on day one
// without needing a design pass. Next.js wires this up automatically as
// the og:image/twitter:image for every page that doesn't define its own
// opengraph-image, purely by this file's name/location.
export const alt = "HandWrought — AI writing editor, in your document";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
          alignItems: "flex-start",
          padding: "80px",
          background: "#fbfaf7",
          fontFamily: "serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "48px",
          }}
        >
          <div
            style={{
              display: "flex",
              width: "56px",
              height: "56px",
              borderRadius: "12px",
              background: "#3b5ba9",
            }}
          />
          <div style={{ display: "flex", fontSize: "36px", fontWeight: 700, color: "#22252a" }}>HandWrought</div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: "58px",
            fontWeight: 700,
            lineHeight: 1.15,
            color: "#22252a",
            maxWidth: "920px",
          }}
        >
          Written by hand, shaped by AI.
        </div>
        <div
          style={{
            display: "flex",
            marginTop: "32px",
            fontSize: "28px",
            color: "#928d7e",
            maxWidth: "820px",
          }}
        >
          AI edits land inside your document — review, accept, or reject in place. No copy-paste.
        </div>
      </div>
    ),
    { ...size }
  );
}
