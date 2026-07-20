import React from "react";
import { Audio, Sequence, staticFile } from "remotion";
import { createMusicVolumeFn } from "./music";
import type { SfxCue } from "./types";
import type { VideoInput } from "../schema";

export const AudioTrack: React.FC<{
  music: VideoInput["music"];
  cues: SfxCue[];
  totalDurationInFrames: number;
  fps: number;
}> = ({ music, cues, totalDurationInFrames, fps }) => {
  const musicVolume = createMusicVolumeFn(cues, music.volumeDb, totalDurationInFrames, fps);

  return (
    <>
      <Audio src={staticFile(music.src)} loop={music.loop} volume={musicVolume} />
      {cues.map((cue, index) => (
        <Sequence key={index} from={cue.frame} durationInFrames={cue.durationInFrames ?? fps}>
          <Audio src={staticFile(cue.src)} />
        </Sequence>
      ))}
    </>
  );
};
