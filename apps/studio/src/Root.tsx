import React from "react";
import { Composition, Still } from "remotion";
import { Comparison16x9, computeTotalDurationInFrames } from "./compositions/Comparison16x9";
import { ComparisonShort9x16 } from "./compositions/ComparisonShort9x16";
import { Thumbnail16x9 } from "./compositions/Thumbnail16x9";
import { Thumbnail16x9B } from "./compositions/Thumbnail16x9B";
import { videoInputSchema, parseVideoInput, type VideoInput } from "./schema";
import exampleProps from "../../../examples/comparison-example.json";
import examplePropsShort from "../../../examples/comparison-example-9x16.json";

const defaultProps = exampleProps as VideoInput;
const defaultPropsShort = examplePropsShort as VideoInput;

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
      <Composition
        id="ComparisonShort9x16"
        component={ComparisonShort9x16}
        schema={videoInputSchema}
        defaultProps={defaultPropsShort}
        durationInFrames={computeTotalDurationInFrames(defaultPropsShort)}
        fps={defaultPropsShort.meta.fps}
        width={defaultPropsShort.meta.resolution.width}
        height={defaultPropsShort.meta.resolution.height}
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
      <Still
        id="Thumbnail16x9"
        component={Thumbnail16x9}
        schema={videoInputSchema}
        defaultProps={defaultProps}
        width={1280}
        height={720}
      />
      <Still
        id="Thumbnail16x9B"
        component={Thumbnail16x9B}
        schema={videoInputSchema}
        defaultProps={defaultProps}
        width={1280}
        height={720}
      />
    </>
  );
};
