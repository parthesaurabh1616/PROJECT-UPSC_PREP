import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { THEMES, FONT, gridBackground, FPS, SubjectKey } from "./theme";
import { SceneBody } from "./Scene";

export interface TimedScene {
  n: number;
  frames: number;
  primitive: string;
  props: Record<string, any>;
  narration: string;
  onScreenText?: string[];
  /** public/-relative path to this scene's narration wav, if any. */
  audio?: string | null;
}

export interface VideoProps {
  topic: string;
  subject: SubjectKey;
  scenes: TimedScene[];
}

/** Persistent chrome: subject, topic, progress. Anchors the viewer without
    competing with the scene (directive §37 — clarity over cinematics). */
const Chrome: React.FC<{ topic: string; subject: SubjectKey; progress: number }> = ({ topic, subject, progress }) => {
  const t = THEMES[subject];
  return (
    <>
      <div style={{ position: "absolute", top: 40, left: 96, right: 96, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: FONT.mono, fontSize: 19, letterSpacing: "0.22em", textTransform: "uppercase", color: t.accent }}>
          {subject === "PSIR" ? "PSIR · Optional" : "Geography · GS-I"}
        </span>
        <span style={{ fontFamily: FONT.mono, fontSize: 19, letterSpacing: "0.14em", color: t.ink3 }}>{topic}</span>
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, height: 4, width: `${progress * 100}%`, background: t.accent, opacity: 0.85 }} />
    </>
  );
};

/** Burned-in captions. Narration is the teaching channel; captions make it
    usable muted and are the accessibility floor. */
const Caption: React.FC<{ text: string; subject: SubjectKey }> = ({ text, subject }) => {
  const t = THEMES[subject];
  if (!text?.trim()) return null;
  return (
    <div style={{
      position: "absolute", bottom: 54, left: "50%", transform: "translateX(-50%)",
      maxWidth: 1500, textAlign: "center", fontFamily: FONT.body, fontSize: 30, lineHeight: 1.35,
      color: t.ink, background: "rgba(0,0,0,0.55)", padding: "14px 26px", borderRadius: 12,
      border: `1px solid ${t.line}`,
    }}>
      {text}
    </div>
  );
};

export const VisualRevision: React.FC<VideoProps> = ({ topic, subject, scenes }) => {
  const t = THEMES[subject];
  const total = scenes.reduce((s, x) => s + x.frames, 0);
  const frame = useCurrentFrame();
  let cursor = 0;

  return (
    <AbsoluteFill style={{ ...gridBackground(t) }}>
      {scenes.map((s) => {
        const from = cursor;
        cursor += s.frames;
        return (
          <Sequence key={s.n} from={from} durationInFrames={s.frames}>
            <SceneTransition>
              <SceneBody primitive={s.primitive} props={s.props} theme={t} />
              <Caption text={s.narration} subject={subject} />
            </SceneTransition>
            {s.audio && <Audio src={staticFile(s.audio)} />}
          </Sequence>
        );
      })}
      <Chrome topic={topic} subject={subject} progress={total ? frame / total : 0} />
    </AbsoluteFill>
  );
};

/** A short fade in/out so cuts read as deliberate rather than jarring. */
const SceneTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

export { FPS };
