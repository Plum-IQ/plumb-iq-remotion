import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Img } from "remotion";

interface Props {
  url: string;
  kenBurnsDirection: "zoom-in" | "zoom-out";
}

export const PhotoSlide: React.FC<Props> = ({ url, kenBurnsDirection }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const scale = interpolate(
    frame,
    [0, durationInFrames],
    kenBurnsDirection === "zoom-in" ? [1.0, 1.2] : [1.2, 1.0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        <Img
          src={url}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
