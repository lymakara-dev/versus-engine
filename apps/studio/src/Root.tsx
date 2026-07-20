import React from "react";
import { Composition } from "remotion";
import { Comparison16x9, computeTotalDurationInFrames } from "./compositions/Comparison16x9";
import { videoInputSchema, parseVideoInput, type VideoInput } from "./schema";
import exampleProps from "../../../examples/comparison-example.json";

const defaultProps = exampleProps as VideoInput;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Comparison16x9"
        component={Comparison16x9}
        schema={videoInputSchema}
        defaultProps={defaultProps}
        durationInFrames={computeTotalDurationInFrames(defaultProps)}
        fps={defaultProps.meta.fps}
        width={defaultProps.meta.resolution.width}
        height={defaultProps.meta.resolution.height}
        calculateMetadata={async ({ props }) => {
          const input = parseVideoInput(props);
          return {
            durationInFrames: computeTotalDurationInFrames(input),
            fps: input.meta.fps,
            width: input.meta.resolution.width,
            height: input.meta.resolution.height,
          };
        }}
      />
    </>
  );
};
