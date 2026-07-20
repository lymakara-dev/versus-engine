"use client";

import { Player } from "@remotion/player";
import { Comparison16x9, computeTotalDurationInFrames, type VideoInput } from "studio";

export function PreviewPlayer({ videoInput }: { videoInput: VideoInput }) {
  return (
    <Player
      component={Comparison16x9}
      inputProps={videoInput}
      durationInFrames={computeTotalDurationInFrames(videoInput)}
      fps={videoInput.meta.fps}
      compositionWidth={videoInput.meta.resolution.width}
      compositionHeight={videoInput.meta.resolution.height}
      controls
      style={{ width: "100%", aspectRatio: `${videoInput.meta.resolution.width} / ${videoInput.meta.resolution.height}` }}
    />
  );
}
