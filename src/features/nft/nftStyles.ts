import type { CSSProperties } from "react";

export const NFT_PAGE_STYLE: CSSProperties = {
  display: "grid",
  gap: "clamp(22px, 3vw, 36px)",
  margin: "0 auto",
  maxWidth: 1180,
  padding: "clamp(20px, 4vw, 56px)",
  width: "100%",
};

export const NFT_CENTER_HEADER_STYLE: CSSProperties = {
  display: "grid",
  gap: 12,
  justifyItems: "center",
  margin: "0 auto",
  maxWidth: 760,
  textAlign: "center",
};

export const NFT_AUTO_GRID_STYLE: CSSProperties = {
  display: "grid",
  gap: "clamp(16px, 2vw, 24px)",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
};

export const NFT_CARD_STYLE: CSSProperties = {
  borderWidth: 2,
  display: "grid",
  gap: 18,
  padding: "clamp(18px, 2.5vw, 28px)",
};

export const NFT_PIXEL_STAGE_STYLE: CSSProperties = {
  alignItems: "center",
  background: "var(--surface-soft)",
  border: "2px solid var(--border)",
  borderRadius: 8,
  display: "flex",
  imageRendering: "pixelated",
  justifyContent: "center",
  overflow: "hidden",
};
