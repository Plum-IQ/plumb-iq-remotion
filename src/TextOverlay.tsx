import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, AbsoluteFill, Img, OffthreadVideo } from "remotion";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TextOverlayData {
  id: string;
  type: "text";
  text: string;
  position: "top" | "center" | "bottom";
  fontSize?: number;
  color?: string;
  startTime: number; // seconds
  endTime: number;   // seconds, 0 = end of video
}

export interface MediaOverlayData {
  id: string;
  type: "image" | "video";
  url: string;       // signed URL resolved at render time
  assetId?: string;  // stored in DB; resolved to url before render
  corner: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center" | "full";
  widthPct?: number; // % of video width (ignored when corner="full")
  startTime: number;
  endTime: number;
}

export type OverlayData = TextOverlayData | MediaOverlayData;

// ─── TextOverlay ─────────────────────────────────────────────────────────────
// Uses absolute frame timing — no Sequence needed.

export const TextOverlay: React.FC<{ overlay: TextOverlayData }> = ({ overlay }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const startFrame = Math.round(overlay.startTime * fps);
  const endFrame = overlay.endTime > 0
    ? Math.round(overlay.endTime * fps)
    : durationInFrames;

  if (frame < startFrame || frame > endFrame) return null;

  const fadeFrames = Math.min(10, Math.floor((endFrame - startFrame) / 4));
  const opacity = interpolate(
    frame,
    [startFrame, startFrame + fadeFrames, endFrame - fadeFrames, endFrame],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const positionStyle: React.CSSProperties =
    overlay.position === "top"
      ? { justifyContent: "flex-start", paddingTop: 100 }
      : overlay.position === "bottom"
      ? { justifyContent: "flex-end", paddingBottom: 140 }
      : { justifyContent: "center" };

  return (
    <AbsoluteFill
      style={{
        ...positionStyle,
        display: "flex",
        alignItems: "center",
        opacity,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          backgroundColor: "rgba(0,0,0,0.55)",
          paddingTop: 20,
          paddingBottom: 20,
          paddingLeft: 40,
          paddingRight: 40,
          borderRadius: 16,
          maxWidth: "88%",
          textAlign: "center",
        }}
      >
        <span
          style={{
            color: overlay.color || "#ffffff",
            fontSize: overlay.fontSize || 52,
            fontWeight: 700,
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
            lineHeight: 1.25,
            letterSpacing: -0.5,
            textShadow: "0 2px 8px rgba(0,0,0,0.4)",
          }}
        >
          {overlay.text}
        </span>
      </div>
    </AbsoluteFill>
  );
};

// ─── MediaOverlay ─────────────────────────────────────────────────────────────
// Must be wrapped in <Sequence from={startFrame} durationInFrames={duration}>
// so that useCurrentFrame() returns 0 at the overlay's start (OffthreadVideo
// uses the Sequence-relative frame to pick the right source frame).

function getCornerStyle(corner: MediaOverlayData["corner"]): React.CSSProperties {
  switch (corner) {
    case "top-left":     return { top: 30, left: 30 };
    case "top-right":    return { top: 30, right: 30 };
    case "bottom-left":  return { bottom: 80, left: 30 };
    case "bottom-right": return { bottom: 80, right: 30 };
    case "center":       return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    case "full":         return { top: 0, left: 0, right: 0, bottom: 0 };
  }
}

export const MediaOverlay: React.FC<{
  overlay: MediaOverlayData;
  durationInFrames: number;
}> = ({ overlay, durationInFrames }) => {
  const frame = useCurrentFrame(); // 0 = start of this overlay (inside Sequence)

  const fadeFrames = Math.min(10, Math.floor(durationInFrames / 4));
  const opacity = interpolate(
    frame,
    [0, fadeFrames, durationInFrames - fadeFrames, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const isFull = overlay.corner === "full";
  const widthPct = overlay.widthPct ?? 30;
  const cornerStyle = getCornerStyle(overlay.corner);

  const containerStyle: React.CSSProperties = {
    position: "absolute",
    ...cornerStyle,
    ...(isFull
      ? {}
      : { width: `${widthPct}%` }),
    opacity,
    borderRadius: isFull ? 0 : 12,
    overflow: "hidden",
    boxShadow: isFull ? "none" : "0 4px 20px rgba(0,0,0,0.4)",
  };

  return (
    <div style={containerStyle}>
      {overlay.type === "image" ? (
        <Img
          src={overlay.url}
          style={{ width: "100%", height: "auto", display: "block" }}
        />
      ) : (
        <OffthreadVideo
          src={overlay.url}
          style={{
            width: "100%",
            height: isFull ? "100%" : "auto",
            display: "block",
            objectFit: isFull ? "cover" : "contain",
          }}
          muted
        />
      )}
    </div>
  );
};
