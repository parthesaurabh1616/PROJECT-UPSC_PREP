import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Theme, FONT, SAFE, eyebrow } from "../theme";
import { PrimProps, useStagger, asText } from "./shared";

/* PSIR visual language — ideas, thinkers, power, states, institutions.
   These show STRUCTURE: what depends on what, what transforms into what,
   where power sits. A list of bullet points would teach none of that. */

const Frame: React.FC<{ children: React.ReactNode; t: Theme; label?: string }> = ({ children, t, label }) => (
  <div style={{ position: "absolute", inset: 0, padding: SAFE, display: "flex", flexDirection: "column", gap: 22 }}>
    {label && <div style={eyebrow(t)}>{label}</div>}
    <div style={{ flex: 1, position: "relative" }}>{children}</div>
  </div>
);

/** Nodes and labelled edges — the shape of an argument. */
export const ConceptGraph: React.FC<PrimProps> = ({ props, theme: t }) => {
  const nodes: { id: string; label: string; kind?: string }[] = props.nodes ?? [];
  const edges: { from: string; to: string; label?: string }[] = props.edges ?? [];
  const cols = Math.min(3, Math.max(1, Math.ceil(nodes.length / 2)));
  const pos = new Map<string, { x: number; y: number }>();
  nodes.forEach((n, i) => {
    const r = Math.floor(i / cols), c = i % cols;
    pos.set(n.id, { x: 180 + c * (1400 / cols), y: 180 + r * 260 });
  });
  const frame = useCurrentFrame();

  return (
    <Frame t={t} label="structure">
      <svg viewBox="0 0 1728 780" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        {edges.map((e, i) => {
          const a = pos.get(e.from), b = pos.get(e.to);
          if (!a || !b) return null;
          const draw = interpolate(frame, [12 + i * 5, 30 + i * 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <g key={i}>
              <line x1={a.x} y1={a.y} x2={a.x + (b.x - a.x) * draw} y2={a.y + (b.y - a.y) * draw} stroke={t.accent} strokeOpacity={0.55} strokeWidth={2} />
              {e.label && draw > 0.9 && (
                <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 10} fill={t.ink3} fontSize={20} fontFamily={FONT.mono} textAnchor="middle">{asText(e.label)}</text>
              )}
            </g>
          );
        })}
      </svg>
      {nodes.map((n, i) => {
        const p = pos.get(n.id)!;
        const st = useStagger(i, 7);
        return (
          <div key={n.id} style={{
            ...st, position: "absolute", left: p.x, top: p.y, transform: `translate(-50%,-50%) ${st.transform}`,
            border: `1px solid ${t.line}`, background: t.bgSoft, borderRadius: 14, padding: "18px 24px", maxWidth: 380,
            fontFamily: FONT.display, fontSize: 30, color: t.ink, textAlign: "center",
          }}>
            {asText(n.label)}
          </div>
        );
      })}
    </Frame>
  );
};

/** The reusable thinker frame: context → problem → nature → solution → critique. */
export const ThinkerWorld: React.FC<PrimProps> = ({ props, theme: t }) => {
  const rows = [
    ["context", props.context], ["problem", props.problem], ["human nature", props.humanNature],
    ["state of nature", props.stateOfNature], ["solution", props.solution], ["criticism", props.criticism],
  ].filter(([, v]) => v);
  return (
    <Frame t={t} label={String(props.thinker ?? "thinker")}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {rows.map(([k, v], i) => {
          const st = useStagger(i, 7);
          return (
            <div key={i} style={{ ...st, display: "flex", gap: 22, alignItems: "flex-start" }}>
              <div style={{ ...eyebrow(t), minWidth: 300, paddingTop: 6 }}>{k as string}</div>
              <div style={{ fontFamily: FONT.body, fontSize: 30, color: t.ink, lineHeight: 1.35, maxWidth: 1180 }}>{asText(v)}</div>
            </div>
          );
        })}
      </div>
    </Frame>
  );
};

/** Power stacked vertically — the diagram IS the claim about hierarchy. */
export const InstitutionDiagram: React.FC<PrimProps> = ({ props, theme: t }) => {
  const levels: { name: string; powers?: string[] }[] = props.levels ?? [];
  return (
    <Frame t={t} label="institution">
      <div style={{ display: "flex", flexDirection: "column", gap: 18, alignItems: "center", justifyContent: "center", height: "100%" }}>
        {levels.map((l, i) => {
          const st = useStagger(i, 9);
          const top = i === 0;
          return (
            <React.Fragment key={i}>
              <div style={{
                ...st, width: top ? 980 : 760, border: `2px solid ${top ? t.accent : t.line}`,
                background: top ? `${t.accent}18` : t.bgSoft, borderRadius: 16, padding: "22px 30px", textAlign: "center",
              }}>
                <div style={{ fontFamily: FONT.display, fontSize: top ? 46 : 36, fontWeight: 700, color: top ? t.accent : t.ink }}>{asText(l.name)}</div>
                {l.powers?.length ? (
                  <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 12 }}>
                    {l.powers.map((p, j) => (
                      <span key={j} style={{ border: `1px solid ${t.line}`, borderRadius: 999, padding: "6px 16px", fontFamily: FONT.mono, fontSize: 20, color: t.ink2 }}>{asText(p)}</span>
                    ))}
                  </div>
                ) : null}
              </div>
              {i < levels.length - 1 && <div style={{ ...st, color: t.accent, fontSize: 34 }}>↓</div>}
            </React.Fragment>
          );
        })}
      </div>
    </Frame>
  );
};

/** Before → trigger → after. The transformation is the teaching point. */
export const StateTransition: React.FC<PrimProps> = ({ props, theme: t }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = interpolate(frame, [durationInFrames * 0.25, durationInFrames * 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const side = (o: any, active: number, accent: string) => (
    <div style={{
      flex: 1, border: `2px solid ${accent}`, background: `${accent}12`, borderRadius: 18, padding: 30,
      opacity: 0.35 + 0.65 * active, transform: `scale(${0.96 + 0.04 * active})`,
    }}>
      <div style={{ fontFamily: FONT.display, fontSize: 44, fontWeight: 700, color: accent, marginBottom: 14 }}>{asText(o?.label)}</div>
      {(o?.traits ?? []).map((x: string, i: number) => (
        <div key={i} style={{ fontFamily: FONT.body, fontSize: 27, color: t.ink2, marginBottom: 8 }}>· {asText(x)}</div>
      ))}
    </div>
  );
  return (
    <Frame t={t} label="transformation">
      <div style={{ display: "flex", alignItems: "center", gap: 26, height: "100%" }}>
        {side(props.before, 1 - p, t.ink3)}
        <div style={{ textAlign: "center", minWidth: 260 }}>
          <div style={{ color: t.accent, fontSize: 54 }}>→</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 22, color: t.accent, letterSpacing: "0.1em", marginTop: 8 }}>{asText(props.trigger)}</div>
        </div>
        {side(props.after, p, t.accent)}
      </div>
    </Frame>
  );
};

export const GeopoliticalMap: React.FC<PrimProps> = ({ props, theme: t }) => {
  const actors: { name: string; role?: string }[] = props.actors ?? [];
  const flows: { from: string; to: string; kind?: string }[] = props.flows ?? [];
  const colour = (r?: string) => (r === "threat" ? t.warn : r === "alliance" ? t.good : t.accent);
  return (
    <Frame t={t} label="strategic map">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "center", justifyContent: "center", height: "100%" }}>
        {actors.map((a, i) => {
          const st = useStagger(i, 8);
          return (
            <div key={i} style={{ ...st, border: `2px solid ${colour(a.role)}`, background: `${colour(a.role)}14`, borderRadius: 16, padding: "22px 30px" }}>
              <div style={{ fontFamily: FONT.display, fontSize: 36, color: t.ink }}>{asText(a.name)}</div>
              {a.role && <div style={{ ...eyebrow(t), fontSize: 16 }}>{asText(a.role)}</div>}
            </div>
          );
        })}
      </div>
      {flows.length > 0 && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          {flows.map((f, i) => (
            <div key={i} style={{ fontFamily: FONT.mono, fontSize: 22, color: colour(f.kind) }}>{asText(f.from)} → {asText(f.to)} · {asText(f.kind)}</div>
          ))}
        </div>
      )}
    </Frame>
  );
};
