import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Theme, FONT, SAFE, eyebrow } from "../theme";

/* Shared scene primitives. Every one takes the scene's props object and a
   theme. Motion is always in service of structure: things appear in the
   order the argument builds, never because movement looks nice. */

export interface PrimProps { props: Record<string, any>; theme: Theme; }

/**
 * Coerce anything the generator handed us into renderable text.
 * The model sometimes emits {label:"…"} where the schema asked for a plain
 * string; React then throws "Objects are not valid as a React child" and the
 * whole render dies. A board with a slightly-off prop shape should degrade to
 * readable text, never take down a four-minute render.
 */
export function asText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.map(asText).filter(Boolean).join(" · ");
  const o = v as Record<string, unknown>;
  for (const k of ["label", "name", "text", "title", "value", "point"]) {
    if (typeof o[k] === "string") return o[k] as string;
  }
  return Object.values(o).filter((x) => typeof x === "string").join(" · ");
}

/** Staggered entrance — item i settles a beat after item i-1. */
export function useStagger(i: number, delayFrames = 6) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - i * delayFrames, fps, config: { damping: 200 } });
  return { opacity: s, transform: `translateY(${interpolate(s, [0, 1], [18, 0])}px)` };
}

const Wrap: React.FC<{ children: React.ReactNode; t: Theme; eyebrowText?: string }> = ({ children, t, eyebrowText }) => (
  <div style={{ position: "absolute", inset: 0, padding: SAFE, display: "flex", flexDirection: "column", justifyContent: "center", gap: 28 }}>
    {eyebrowText && <div style={eyebrow(t)}>{eyebrowText}</div>}
    {children}
  </div>
);

export const Title: React.FC<PrimProps> = ({ props, theme: t }) => {
  const a = useStagger(0), b = useStagger(1);
  return (
    <Wrap t={t}>
      <div style={{ ...a, fontFamily: FONT.display, fontSize: 104, fontWeight: 700, color: t.ink, lineHeight: 1.05 }}>
        {asText(props.title)}
      </div>
      {props.subtitle && (
        <div style={{ ...b, fontFamily: FONT.body, fontSize: 40, color: t.accent }}>{asText(props.subtitle)}</div>
      )}
    </Wrap>
  );
};

export const CausalChain: React.FC<PrimProps> = ({ props, theme: t }) => {
  const steps: { label: string; note?: string }[] = props.steps ?? [];
  const vertical = steps.length > 4;
  return (
    <Wrap t={t} eyebrowText="mechanism">
      <div style={{ display: "flex", flexDirection: vertical ? "column" : "row", gap: vertical ? 14 : 22, alignItems: vertical ? "flex-start" : "stretch" }}>
        {steps.map((s, i) => (
          <Step key={i} i={i} step={s} t={t} last={i === steps.length - 1} vertical={vertical} />
        ))}
      </div>
    </Wrap>
  );
};

const Step: React.FC<{ i: number; step: { label: string; note?: string }; t: Theme; last: boolean; vertical: boolean }> = ({ i, step, t, last, vertical }) => {
  const st = useStagger(i, 8);
  return (
    <div style={{ ...st, display: "flex", flexDirection: vertical ? "row" : "column", alignItems: vertical ? "center" : "flex-start", gap: 14, flex: vertical ? undefined : 1 }}>
      <div style={{ border: `1px solid ${t.line}`, background: t.bgSoft, borderRadius: 14, padding: "20px 24px", minWidth: vertical ? 620 : undefined }}>
        <div style={{ fontFamily: FONT.display, fontSize: 34, fontWeight: 600, color: t.ink }}>{asText(step.label)}</div>
        {step.note && <div style={{ fontFamily: FONT.body, fontSize: 22, color: t.ink3, marginTop: 6 }}>{asText(step.note)}</div>}
      </div>
      {!last && <div style={{ color: t.accent, fontSize: 40, lineHeight: 1 }}>{vertical ? "↓" : "→"}</div>}
    </div>
  );
};

export const ComparisonSplit: React.FC<PrimProps> = ({ props, theme: t }) => {
  const cols: { label: string; points: string[] }[] = props.columns ?? [];
  return (
    <Wrap t={t} eyebrowText={props.axis ?? "comparison"}>
      <div style={{ display: "flex", gap: 24 }}>
        {cols.map((c, i) => {
          const st = useStagger(i, 10);
          return (
            <div key={i} style={{ ...st, flex: 1, border: `1px solid ${t.line}`, background: t.bgSoft, borderRadius: 16, padding: 28 }}>
              <div style={{ fontFamily: FONT.display, fontSize: 40, fontWeight: 700, color: t.accent, marginBottom: 16 }}>{asText(c.label)}</div>
              {(c.points ?? []).map((p, j) => (
                <div key={j} style={{ fontFamily: FONT.body, fontSize: 26, color: t.ink2, marginBottom: 10, lineHeight: 1.35 }}>· {asText(p)}</div>
              ))}
            </div>
          );
        })}
      </div>
    </Wrap>
  );
};

export const DefinitionReveal: React.FC<PrimProps> = ({ props, theme: t }) => {
  const a = useStagger(0), b = useStagger(2);
  return (
    <Wrap t={t} eyebrowText="definition">
      <div style={{ ...a, fontFamily: FONT.display, fontSize: 76, fontWeight: 700, color: t.accent }}>{asText(props.term)}</div>
      <div style={{ ...b, fontFamily: FONT.body, fontSize: 38, color: t.ink, lineHeight: 1.4, maxWidth: 1500 }}>{asText(props.definition)}</div>
    </Wrap>
  );
};

export const QuoteReveal: React.FC<PrimProps> = ({ props, theme: t }) => {
  const a = useStagger(0), b = useStagger(2);
  return (
    <Wrap t={t}>
      <div style={{ ...a, fontFamily: FONT.display, fontSize: 58, color: t.ink, lineHeight: 1.3, maxWidth: 1500 }}>&ldquo;{asText(props.quote)}&rdquo;</div>
      <div style={{ ...b, fontFamily: FONT.mono, fontSize: 26, color: t.accent, letterSpacing: "0.1em" }}>— {asText(props.attribution)}</div>
    </Wrap>
  );
};

export const Timeline: React.FC<PrimProps> = ({ props, theme: t }) => {
  const ev: { when: string; label: string; consequence?: string }[] = props.events ?? [];
  return (
    <Wrap t={t} eyebrowText="sequence">
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {ev.map((e, i) => {
          const st = useStagger(i, 9);
          return (
            <div key={i} style={{ ...st, display: "flex", gap: 22, alignItems: "flex-start" }}>
              <div style={{ fontFamily: FONT.mono, fontSize: 26, color: t.accent, minWidth: 190, letterSpacing: "0.08em" }}>{asText(e.when)}</div>
              <div style={{ width: 2, alignSelf: "stretch", background: t.line }} />
              <div>
                <div style={{ fontFamily: FONT.display, fontSize: 36, color: t.ink }}>{asText(e.label)}</div>
                {e.consequence && <div style={{ fontFamily: FONT.body, fontSize: 24, color: t.ink3, marginTop: 4 }}>{asText(e.consequence)}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </Wrap>
  );
};

export const MemoryAnchor: React.FC<PrimProps> = ({ props, theme: t }) => {
  const chain: string[] = props.chain ?? [];
  return (
    <Wrap t={t} eyebrowText="carry this out of the room">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
        {chain.map((c, i) => {
          const st = useStagger(i, 7);
          return (
            <React.Fragment key={i}>
              <div style={{ ...st, border: `1px solid ${t.accent}55`, background: `${t.accent}14`, color: t.ink, borderRadius: 999, padding: "14px 24px", fontFamily: FONT.display, fontSize: 30 }}>{asText(c)}</div>
              {i < chain.length - 1 && <div style={{ ...st, color: t.accent, fontSize: 30 }}>→</div>}
            </React.Fragment>
          );
        })}
      </div>
    </Wrap>
  );
};

/** Silent reconstruction beat — blanks hold, then the answer arrives (§31). */
export const RecallFrame: React.FC<PrimProps> = ({ props, theme: t }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const revealAt = durationInFrames * 0.62;
  const revealed = frame > revealAt;
  const o = interpolate(frame, [revealAt, revealAt + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const blanks: string[] = props.blanks ?? [];
  return (
    <Wrap t={t} eyebrowText="recall — reconstruct it before it appears">
      <div style={{ fontFamily: FONT.display, fontSize: 56, color: t.ink, maxWidth: 1500 }}>{asText(props.prompt)}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
        {blanks.map((b, i) => (
          <div key={i} style={{ fontFamily: FONT.mono, fontSize: 32, color: revealed ? t.good : t.ink3, opacity: revealed ? o : 1 }}>
            {revealed ? asText(b) : asText(b).replace(/[^:\s]/g, "_")}
          </div>
        ))}
      </div>
    </Wrap>
  );
};

export const UpscPanel: React.FC<PrimProps> = ({ props, theme: t }) => {
  const rows = [["concept", props.concept], ["example", props.example], ["in the answer", props.answerUse]].filter(([, v]) => v);
  return (
    <Wrap t={t} eyebrowText="upsc application">
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {rows.map(([k, v], i) => {
          const st = useStagger(i, 9);
          return (
            <div key={i} style={{ ...st, display: "flex", gap: 24 }}>
              <div style={{ ...eyebrow(t), minWidth: 260, paddingTop: 8 }}>{k as string}</div>
              <div style={{ fontFamily: FONT.body, fontSize: 32, color: t.ink, lineHeight: 1.4, maxWidth: 1300 }}>{asText(v)}</div>
            </div>
          );
        })}
      </div>
    </Wrap>
  );
};

/** Never crash a render because a board used a primitive we haven't built. */
export const Fallback: React.FC<PrimProps & { name: string }> = ({ props, theme: t, name }) => (
  <Wrap t={t} eyebrowText={`primitive not implemented — ${name}`}>
    <div style={{ fontFamily: FONT.mono, fontSize: 24, color: t.ink2, whiteSpace: "pre-wrap" }}>
      {JSON.stringify(props, null, 2).slice(0, 900)}
    </div>
  </Wrap>
);
