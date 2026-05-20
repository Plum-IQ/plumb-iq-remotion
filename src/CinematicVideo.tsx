import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  useVideoConfig,
  useCurrentFrame,
  interpolate,
  spring,
  CalculateMetadataFunction,
} from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Caption {
  text: string;
  startFrame: number;
  endFrame: number;
}

export interface CinematicVideoProps {
  [key: string]: unknown;
  assets: string[];
  voiceoverUrl?: string;
  musicUrl?: string;
  musicVolume?: number;
  captions?: Caption[];
  companyName?: string;
  letterbox?: boolean;
  aspectRatio?: "9:16" | "1:1" | "16:9";
  durationInSeconds?: number;
}

export const calculateCinematicMetadata: CalculateMetadataFunction<CinematicVideoProps> = async ({
  props,
}) => {
  const fps = 30;
  const durationInSeconds = props.durationInSeconds ?? 30;
  const ar = props.aspectRatio ?? "9:16";
  const [width, height] =
    ar === "16:9" ? [1920, 1080] : ar === "1:1" ? [1080, 1080] : [1080, 1920];
  return { durationInFrames: Math.round(durationInSeconds * fps), fps, width, height };
};

// ─── Constants ────────────────────────────────────────────────────────────────

const TRANSITION_FRAMES = 9; // 0.3s at 30fps

type KenBurnsPreset = {
  scale: [number, number];
  origin: string;
  tx?: [number, number];
  ty?: [number, number];
};

const KB_PRESETS: KenBurnsPreset[] = [
  { scale: [1.0, 1.15], origin: "50% 50%" },
  { scale: [1.15, 1.0], origin: "50% 50%" },
  { scale: [1.1, 1.1], origin: "50% 50%", tx: [-3, 3] },
  { scale: [1.1, 1.1], origin: "50% 50%", tx: [3, -3] },
  { scale: [1.1, 1.1], origin: "50% 50%", ty: [3, -3] },
  { scale: [1.1, 1.1], origin: "50% 50%", ty: [-3, 3] },
  { scale: [1.0, 1.15], origin: "20% 20%" },
  { scale: [1.0, 1.15], origin: "80% 80%" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const KenBurnsSlide: React.FC<{ url: string; preset: KenBurnsPreset }> = ({ url, preset }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const scale = interpolate(frame, [0, durationInFrames], preset.scale);
  const tx = preset.tx ? interpolate(frame, [0, durationInFrames], preset.tx) : 0;
  const ty = preset.ty ? interpolate(frame, [0, durationInFrames], preset.ty) : 0;

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {/* Image with Ken Burns + colour grade filter */}
      <AbsoluteFill
        style={{
          transform: `scale(${scale}) translate(${tx}%, ${ty}%)`,
          transformOrigin: preset.origin,
          filter: "brightness(1.05) contrast(1.1) saturate(1.15)",
        }}
      >
        <Img src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>

      {/* Warm tone overlay */}
      <AbsoluteFill
        style={{ background: "rgba(255,180,80,0.06)", pointerEvents: "none" }}
      />

      {/* Vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.45) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};

// Light-leak flash layered on top during a cross-dissolve
const LightLeak: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, TRANSITION_FRAMES / 2, TRANSITION_FRAMES],
    [0, 0.65, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(ellipse at 30% 50%, rgba(255,220,120,1) 0%, rgba(255,140,60,0.6) 40%, transparent 70%)",
        opacity,
        mixBlendMode: "screen",
        pointerEvents: "none",
      }}
    />
  );
};

// Synced caption pill — renders whichever caption is active at the current frame
const CaptionOverlay: React.FC<{ captions: Caption[] }> = ({ captions }) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();

  const active = captions.find((c) => frame >= c.startFrame && frame < c.endFrame);
  if (!active) return null;

  const fadeIn = interpolate(frame, [active.startFrame, active.startFrame + 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [active.endFrame - 6, active.endFrame], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          bottom: "12%",
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.62)",
          color: "#fff",
          fontSize: Math.round(width * 0.034),
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontWeight: 600,
          padding: "10px 22px",
          borderRadius: 100,
          whiteSpace: "nowrap",
          maxWidth: "85%",
          textAlign: "center",
          opacity: Math.min(fadeIn, fadeOut),
        }}
      >
        {active.text}
      </div>
    </AbsoluteFill>
  );
};

// Company name lower third: spring slide-up, visible 0.5s–3s
const LowerThird: React.FC<{ name: string }> = ({ name }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const translateY = spring({ frame, fps, from: 40, to: 0, config: { damping: 18 } });
  const opacity = interpolate(
    frame,
    [0, 15, Math.round(fps * 3), Math.round(fps * 3) + 15],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          bottom: "18%",
          left: "8%",
          transform: `translateY(${translateY}px)`,
          opacity,
          background: "rgba(0,0,0,0.55)",
          borderLeft: "4px solid #f59e0b",
          color: "#fff",
          fontSize: Math.round(width * 0.026),
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontWeight: 700,
          letterSpacing: 1,
          padding: "10px 18px",
        }}
      >
        {name}
      </div>
    </AbsoluteFill>
  );
};

// ─── Main composition ─────────────────────────────────────────────────────────

export const CinematicVideo: React.FC<CinematicVideoProps> = ({
  assets,
  voiceoverUrl,
  musicUrl,
  musicVolume = 0.08,
  captions = [],
  companyName,
  letterbox = false,
}) => {
  const { durationInFrames, fps } = useVideoConfig();

  // Per-asset duration = voiceover length ÷ assets, clamped 2.5–6s
  const perAssetSecs = Math.min(6, Math.max(2.5, durationInFrames / fps / Math.max(1, assets.length)));
  const slideDuration = Math.round(perAssetSecs * fps);

  // Transition i (0-indexed) starts at: (i+1) * (slideDuration - TRANSITION_FRAMES)
  // Light-leak fires at every 3rd transition: i = 2, 5, 8, ...
  const lightLeakStarts = assets
    .slice(1)
    .map((_, i) => (i + 1) * (slideDuration - TRANSITION_FRAMES))
    .filter((_, i) => (i + 1) % 3 === 0);

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {/* Photo slides with Ken Burns effect + cross-dissolve transitions */}
      <TransitionSeries>
        {assets.map((url, i) => (
          <React.Fragment key={i}>
            <TransitionSeries.Sequence durationInFrames={slideDuration}>
              <KenBurnsSlide url={url} preset={KB_PRESETS[i % KB_PRESETS.length]} />
            </TransitionSeries.Sequence>
            {i < assets.length - 1 && (
              <TransitionSeries.Transition
                presentation={fade()}
                timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
              />
            )}
          </React.Fragment>
        ))}
      </TransitionSeries>

      {/* Light-leak flash at every 3rd transition */}
      {lightLeakStarts.map((startFrame) => (
        <Sequence key={startFrame} from={startFrame} durationInFrames={TRANSITION_FRAMES} layout="none">
          <LightLeak />
        </Sequence>
      ))}

      {/* Company name lower third */}
      {companyName && <LowerThird name={companyName} />}

      {/* Synced captions */}
      {captions.length > 0 && <CaptionOverlay captions={captions} />}

      {/* Letterbox bars */}
      {letterbox && (
        <AbsoluteFill style={{ pointerEvents: "none" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "6%", background: "#000" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "6%", background: "#000" }} />
        </AbsoluteFill>
      )}

      {/* Voiceover */}
      {voiceoverUrl && <Audio src={voiceoverUrl} volume={1} />}

      {/* Background music with 2s fade-out before end */}
      {musicUrl && (
        <Audio
          src={musicUrl}
          volume={(f) =>
            interpolate(f, [durationInFrames - fps * 2, durationInFrames], [musicVolume, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          }
        />
      )}
    </AbsoluteFill>
  );
};
