import React from "react";
import { registerRoot } from "remotion";
import { Composition } from "remotion";
import { PlumbIQVideo, calculateMetadata } from "./PlumbIQVideo";

const Root: React.FC = () => (
  <>
    <Composition
      id="PlumbIQVideo"
      component={PlumbIQVideo}
      calculateMetadata={calculateMetadata}
      durationInFrames={900}  // fallback — overridden by calculateMetadata via durationInSeconds prop
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        photos: [
          "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1080",
          "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1080",
          "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1080",
        ],
        audioUrl: "",
        transitionStyle: "crossfade",
        musicVolume: 0.05,
        durationInSeconds: 30,
        overlays: [],
      }}
    />
  </>
);

registerRoot(Root);
