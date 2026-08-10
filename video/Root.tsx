import React from "react";
import { Composition, getInputProps } from "remotion";
import { VisualRevision, VideoProps } from "./Video";
import { FPS } from "./theme";

/* One composition, driven entirely by input props, so a single bundle
   renders every board. The renderer passes the timed storyboard in. */

const FALLBACK: VideoProps = {
  topic: "No storyboard supplied",
  subject: "GEOGRAPHY",
  scenes: [{ n: 1, frames: 90, primitive: "TITLE", props: { title: "No storyboard", subtitle: "pass inputProps" }, narration: "", audio: null }],
};

export const RemotionRoot: React.FC = () => {
  const input = getInputProps() as Partial<VideoProps>;
  const props: VideoProps = {
    topic: input.topic ?? FALLBACK.topic,
    subject: (input.subject as VideoProps["subject"]) ?? FALLBACK.subject,
    scenes: input.scenes?.length ? input.scenes : FALLBACK.scenes,
  };
  const duration = props.scenes.reduce((s, x) => s + x.frames, 0);

  return (
    <Composition
      id="VisualRevision"
      component={VisualRevision as unknown as React.FC<Record<string, unknown>>}
      durationInFrames={Math.max(30, duration)}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={props as unknown as Record<string, unknown>}
    />
  );
};
