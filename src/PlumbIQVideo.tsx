import React from "react";
import { AbsoluteFill, Audio, Sequence, useVideoConfig, OffthreadVideo, CalculateMetadataFunction } from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { flip } from "@remotion/transitions/flip";
import { PhotoSlide } from "./PhotoSlide";
import { TextOverlay, MediaOverlay, OverlayData, TextOverlayData, MediaOverlayData } from "./TextOverlay";

export interface PlumbIQVideoProps {
  photos: string[];
  audioUrl?: string;   // required in script mode, unused in intro_video mode
  videoUrl?: string;   // talking-head video URL (intro_video mode only)
  musicUrl?: string;
  transitionStyle: "crossfade" | "slide" | "zoom" | "spin" | "none";
  musicVolume?: number;
  fps?: number;
  durationInSeconds?: number;
  overlays?: OverlayData[];
}

// Allow the composition duration to be driven by inputProps.durationInSeconds
export const calculateMetadata: CalculateMetadataFunction<PlumbIQVideoProps> = async ({ props }) => {
  const fps = 30;
  const durationInSeconds = props.durationInSeconds ?? 30;
  return {
    durationInFrames: Math.round(durationInSeconds * fps),
    fps,
  };
};

const TRANSITION_DURATION_FRAMES = 9; // 0.3s at 30fps

function getPresentation(style: string) {
  switch (style) {
    case "slide":     return slide({ direction: "from-right" });
    case "zoom":      return wipe({ direction: "from-center" });
    case "spin":      return flip({ direction: "from-right" });
    case "none":      return fade();
    case "crossfade":
    default:          return fade();
  }
}

const PHOTO_DISPLAY_FRAMES = 150; // 5 seconds per cycling photo in intro mode

export const PlumbIQVideo: React.FC<PlumbIQVideoProps> = ({
  photos,
  audioUrl,
  videoUrl,
  musicUrl,
  transitionStyle = "crossfade",
  musicVolume = 0.05,
  overlays = [],
}) => {
  const { fps, durationInFrames } = useVideoConfig();

  // ── Intro video mode ──────────────────────────────────────────────────────
  if (videoUrl) {
    return (
      <AbsoluteFill style={{ backgroundColor: "#000" }}>
        {/* Full-screen talking-head video (audio comes from the video itself) */}
        <OffthreadVideo
          src={videoUrl}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />

        {/* Overlay photos cycle in the top-right corner */}
        {photos.map((url, i) => {
          const startFrame = i * PHOTO_DISPLAY_FRAMES;
          if (startFrame >= durationInFrames) return null;
          const seqDuration = Math.min(PHOTO_DISPLAY_FRAMES, durationInFrames - startFrame);
          const overlayData: MediaOverlayData = {
            id: `photo-${i}`,
            type: "image",
            url,
            corner: "top-right",
            widthPct: 30,
            startTime: 0,
            endTime: 0,
          };
          return (
            <Sequence key={`photo-${i}`} from={startFrame} durationInFrames={seqDuration} layout="none">
              <MediaOverlay overlay={overlayData} durationInFrames={seqDuration} />
            </Sequence>
          );
        })}

        {/* Text / media overlays from job config */}
        {overlays.map((overlay) => {
          if (overlay.type === "text") {
            return <TextOverlay key={overlay.id} overlay={overlay as TextOverlayData} />;
          }
          const mediaOverlay = overlay as MediaOverlayData;
          const startFrame = Math.round(mediaOverlay.startTime * fps);
          const endFrame = mediaOverlay.endTime > 0
            ? Math.round(mediaOverlay.endTime * fps)
            : durationInFrames;
          const seqDuration = Math.max(1, endFrame - startFrame);
          return (
            <Sequence key={overlay.id} from={startFrame} durationInFrames={seqDuration} layout="none">
              <MediaOverlay overlay={mediaOverlay} durationInFrames={seqDuration} />
            </Sequence>
          );
        })}

        {/* Background music under the video's own audio */}
        {musicUrl && <Audio src={musicUrl} volume={musicVolume} />}
      </AbsoluteFill>
    );
  }

  // ── Script / photo-slideshow mode (original behaviour) ───────────────────
  const transitionFrames = transitionStyle === "none" ? 1 : TRANSITION_DURATION_FRAMES;
  const totalContentFrames = durationInFrames;
  const slideDuration = Math.floor(
    (totalContentFrames + (photos.length - 1) * transitionFrames) / photos.length
  );
  const presentation = getPresentation(transitionStyle);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Photos with transitions */}
      <TransitionSeries>
        {photos.map((url, i) => (
          <>
            <TransitionSeries.Sequence
              key={`slide-${i}`}
              durationInFrames={slideDuration}
            >
              <PhotoSlide
                url={url}
                kenBurnsDirection={i % 2 === 0 ? "zoom-in" : "zoom-out"}
              />
            </TransitionSeries.Sequence>

            {i < photos.length - 1 && (
              <TransitionSeries.Transition
                key={`transition-${i}`}
                presentation={presentation}
                timing={
                  transitionStyle === "spin"
                    ? springTiming({ durationInFrames: transitionFrames, config: { damping: 200 } })
                    : linearTiming({ durationInFrames: transitionFrames })
                }
              />
            )}
          </>
        ))}
      </TransitionSeries>

      {/* Overlays */}
      {overlays.map((overlay) => {
        if (overlay.type === "text") {
          return <TextOverlay key={overlay.id} overlay={overlay as TextOverlayData} />;
        }
        const mediaOverlay = overlay as MediaOverlayData;
        const startFrame = Math.round(mediaOverlay.startTime * fps);
        const endFrame = mediaOverlay.endTime > 0
          ? Math.round(mediaOverlay.endTime * fps)
          : durationInFrames;
        const seqDuration = Math.max(1, endFrame - startFrame);
        return (
          <Sequence
            key={overlay.id}
            from={startFrame}
            durationInFrames={seqDuration}
            layout="none"
          >
            <MediaOverlay overlay={mediaOverlay} durationInFrames={seqDuration} />
          </Sequence>
        );
      })}

      {/* Voiceover */}
      {audioUrl && <Audio src={audioUrl} volume={1} />}

      {/* Background music */}
      {musicUrl && <Audio src={musicUrl} volume={musicVolume} />}
    </AbsoluteFill>
  );
};
