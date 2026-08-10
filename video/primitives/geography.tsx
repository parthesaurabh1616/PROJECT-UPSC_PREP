import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Theme, FONT, SAFE, eyebrow } from "../theme";
import { PrimProps, useStagger, asText } from "./shared";

/* GEOGRAPHY visual language — Earth, space, movement, process.
   The rule these exist to serve: if the process happens underground,
   inside the atmosphere or ocean, or over geological time, SHOW the
   mechanism moving rather than describing it (directive §8). */

const Frame: React.FC<{ children: React.ReactNode; t: Theme; label?: string }> = ({ children, t, label }) => (
  <div style={{ position: "absolute", inset: 0, padding: SAFE, display: "flex", flexDirection: "column", gap: 22 }}>
    {label && <div style={eyebrow(t)}>{label}</div>}
    <div style={{ flex: 1, position: "relative" }}>{children}</div>
  </div>
);

/** Earth's layers in section. Depth is spatial, so it is drawn spatially. */
export const CrossSection: React.FC<PrimProps> = ({ props, theme: t }) => {
  const layers: { name: string; colour?: string; depthKm?: number }[] = props.layers ?? [];
  const annotations: { label: string }[] = props.annotations ?? [];
  const total = layers.reduce((s, l) => s + (l.depthKm ?? 20), 0) || 1;
  const frame = useCurrentFrame();
  return (
    <Frame t={t} label="cross-section">
      <div style={{ display: "flex", height: "100%", gap: 32 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRadius: 18, overflow: "hidden", border: `1px solid ${t.line}` }}>
          {layers.map((l, i) => {
            const h = ((l.depthKm ?? 20) / total) * 100;
            const grow = interpolate(frame, [i * 6, i * 6 + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={i} style={{
                height: `${h}%`, background: l.colour ?? t.bgSoft, opacity: 0.35 + 0.5 * grow,
                display: "flex", alignItems: "center", paddingLeft: 28, borderBottom: `1px solid ${t.line}`,
                transform: `scaleY(${grow})`, transformOrigin: "top",
              }}>
                <span style={{ fontFamily: FONT.display, fontSize: 32, color: "#fff", textShadow: "0 2px 12px rgba(0,0,0,.7)" }}>
                  {asText(l.name)}{l.depthKm ? ` · ${l.depthKm} km` : ""}
                </span>
              </div>
            );
          })}
        </div>
        {annotations.length > 0 && (
          <div style={{ width: 520, display: "flex", flexDirection: "column", gap: 12, justifyContent: "center" }}>
            {annotations.map((a, i) => {
              const st = useStagger(i + layers.length, 7);
              return (
                <div key={i} style={{ ...st, border: `1px solid ${t.line}`, borderLeft: `3px solid ${t.accent}`, background: t.bgSoft, borderRadius: 10, padding: "14px 18px", fontFamily: FONT.body, fontSize: 26, color: t.ink2 }}>
                  {asText(a)}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Frame>
  );
};

/** Two plates actually moving. Direction encodes the boundary type. */
export const PlateBoundary: React.FC<PrimProps> = ({ props, theme: t }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = interpolate(frame, [0, durationInFrames], [0, 1], { extrapolateRight: "clamp" });
  const kind = String(props.kind ?? "convergent");
  const drift = 150 * p;

  const dx = kind === "divergent" ? -drift : kind === "convergent" ? drift : 0;
  const dy = kind === "transform" ? drift * 0.55 : 0;
  const left = props.left ?? { name: "Plate A", type: "oceanic" };
  const right = props.right ?? { name: "Plate B", type: "continental" };
  const sink = kind === "convergent" ? p * 130 : 0;

  const slab = (o: any, isLeft: boolean) => {
    const oceanic = o?.type === "oceanic";
    return (
      <div style={{
        width: 620, height: oceanic ? 90 : 150,
        background: oceanic ? `${t.accent}44` : "#8a6a4a66",
        border: `2px solid ${oceanic ? t.accent : "#c69c6d"}`,
        borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: FONT.display, fontSize: 30, color: t.ink,
        transform: isLeft
          ? `translate(${dx}px, ${dy + (oceanic ? sink : 0)}px) rotate(${kind === "convergent" && oceanic ? p * 16 : 0}deg)`
          : `translate(${-dx}px, ${-dy}px)`,
      }}>
        {asText(o?.name)}
      </div>
    );
  };

  return (
    <Frame t={t} label={`${kind} boundary`}>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: kind === "divergent" ? 60 : 0 }}>
        {slab(left, true)}
        {slab(right, false)}
      </div>
      {/* magma rises where the plates part */}
      {kind === "divergent" && (
        <div style={{
          position: "absolute", left: "50%", top: "48%", transform: "translateX(-50%)",
          width: 24, height: 90 * p, background: `linear-gradient(to top, ${t.accent2}, transparent)`, borderRadius: 12,
        }} />
      )}
      {props.outcome && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, textAlign: "center", fontFamily: FONT.display, fontSize: 40, color: t.accent2, opacity: interpolate(p, [0.45, 0.75], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          {asText(props.outcome)}
        </div>
      )}
    </Frame>
  );
};

/** Orthographic globe. SVG rather than WebGL: same spatial reading at a
    fraction of the render risk, and it composites predictably. */
export const EarthGlobe: React.FC<PrimProps> = ({ props, theme: t }) => {
  const frame = useCurrentFrame();
  const markers: { label: string; lat: number; lon: number }[] = props.markers ?? [];
  const spin = frame * 0.25;
  const R = 330, cx = 700, cy = 470;
  const project = (lat: number, lon: number) => {
    const la = (lat * Math.PI) / 180, lo = ((lon + spin) * Math.PI) / 180;
    return { x: cx + R * Math.cos(la) * Math.sin(lo), y: cy - R * Math.sin(la), front: Math.cos(la) * Math.cos(lo) > 0 };
  };
  return (
    <Frame t={t} label={props.overlay ? `globe · ${props.overlay}` : "globe"}>
      <svg viewBox="0 0 1728 890" style={{ width: "100%", height: "100%" }}>
        <defs>
          <radialGradient id="oc" cx="38%" cy="32%">
            <stop offset="0%" stopColor="#1b4a7a" /><stop offset="100%" stopColor="#061423" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cy} r={R + 16} fill="none" stroke={t.accent} strokeOpacity={0.18} strokeWidth={2} />
        <circle cx={cx} cy={cy} r={R} fill="url(#oc)" stroke={t.line} />
        {[-60, -30, 0, 30, 60].map((la) => {
          const rr = R * Math.cos((la * Math.PI) / 180);
          return <ellipse key={la} cx={cx} cy={cy - R * Math.sin((la * Math.PI) / 180)} rx={rr} ry={rr * 0.16} fill="none" stroke={t.accent} strokeOpacity={la === 0 ? 0.5 : 0.18} />;
        })}
        {markers.map((m, i) => {
          const { x, y, front } = project(m.lat ?? 0, m.lon ?? 0);
          if (!front) return null;
          const pulse = 1 + 0.25 * Math.sin((frame - i * 8) / 6);
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={9 * pulse} fill={t.accent2} />
              <line x1={x} y1={y} x2={x + 90} y2={y - 60} stroke={t.accent2} strokeOpacity={0.7} />
              <text x={x + 98} y={y - 62} fill={t.ink} fontSize={26} fontFamily={FONT.display}>{asText(m.label)}</text>
            </g>
          );
        })}
      </svg>
    </Frame>
  );
};

/** Region + labelled features. Schematic on purpose: a real basemap would
    add download weight and geographic precision the scene doesn't need. */
export const PhysicalMap: React.FC<PrimProps> = ({ props, theme: t }) => {
  const feats: { kind: string; label: string }[] = props.features ?? [];
  return (
    <Frame t={t} label={props.region ? `map · ${props.region}` : "map"}>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 900, height: 620, border: `1px solid ${t.line}`, borderRadius: 24, background: t.bgSoft, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 40% 40%, ${t.accent}22, transparent 60%)` }} />
          <div style={{ position: "absolute", top: 26, left: 30, fontFamily: FONT.display, fontSize: 40, color: t.ink }}>{asText(props.region)}</div>
        </div>
      </div>
      <div style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", width: 560, display: "flex", flexDirection: "column", gap: 12 }}>
        {feats.map((f, i) => {
          const st = useStagger(i, 8);
          return (
            <div key={i} style={{ ...st, border: `1px solid ${t.line}`, borderLeft: `3px solid ${t.accent2}`, background: t.bgSoft, borderRadius: 10, padding: "14px 18px" }}>
              <div style={{ ...eyebrow(t), fontSize: 15 }}>{asText(f.kind).replace(/_/g, " ")}</div>
              <div style={{ fontFamily: FONT.display, fontSize: 30, color: t.ink }}>{asText(f.label)}</div>
            </div>
          );
        })}
      </div>
    </Frame>
  );
};

/** Three-cell circulation with rising/sinking limbs. */
export const AtmosphericCell: React.FC<PrimProps> = ({ props, theme: t }) => {
  const cells: string[] = props.cells ?? ["hadley", "ferrel", "polar"];
  const frame = useCurrentFrame();
  return (
    <Frame t={t} label="atmospheric circulation">
      <div style={{ display: "flex", height: "100%", alignItems: "flex-end", gap: 18 }}>
        {cells.map((c, i) => {
          const h = 260 + i * 40;
          const rise = interpolate((frame + i * 20) % 90, [0, 90], [0, -30]);
          return (
            <div key={i} style={{ flex: 1, height: h, border: `1px solid ${t.line}`, borderRadius: 16, background: t.bgSoft, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontFamily: FONT.display, fontSize: 34, color: t.ink }}>{asText(c)}</div>
              <div style={{ position: "absolute", left: 30, bottom: 20, color: t.accent, fontSize: 40, transform: `translateY(${rise}px)` }}>↑</div>
              <div style={{ position: "absolute", right: 30, top: 20, color: t.accent2, fontSize: 40, transform: `translateY(${-rise}px)` }}>↓</div>
            </div>
          );
        })}
      </div>
    </Frame>
  );
};

export const OceanCurrent: React.FC<PrimProps> = ({ props, theme: t }) => {
  const cur: { name: string; temp?: string }[] = props.currents ?? [];
  return (
    <Frame t={t} label="ocean currents">
      <div style={{ display: "flex", flexDirection: "column", gap: 16, justifyContent: "center", height: "100%" }}>
        {cur.map((c, i) => {
          const st = useStagger(i, 8);
          const warm = c.temp === "warm";
          return (
            <div key={i} style={{ ...st, display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ width: 16, height: 16, borderRadius: 8, background: warm ? t.warn : t.accent }} />
              <div style={{ fontFamily: FONT.display, fontSize: 34, color: t.ink }}>{asText(c.name)}</div>
              <div style={{ ...eyebrow(t), fontSize: 18 }}>{asText(c.temp)}</div>
            </div>
          );
        })}
      </div>
    </Frame>
  );
};

export const PressureSystem: React.FC<PrimProps> = ({ props, theme: t }) => {
  const centres: { kind: string; label: string }[] = props.centres ?? [];
  return (
    <Frame t={t} label="pressure">
      <div style={{ display: "flex", gap: 30, height: "100%", alignItems: "center", justifyContent: "center" }}>
        {centres.map((c, i) => {
          const st = useStagger(i, 9);
          const high = c.kind === "high";
          return (
            <div key={i} style={{ ...st, width: 320, height: 320, borderRadius: 999, border: `2px solid ${high ? t.accent2 : t.accent}`, background: `${high ? t.accent2 : t.accent}14`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontFamily: FONT.display, fontSize: 72, color: high ? t.accent2 : t.accent }}>{high ? "H" : "L"}</div>
              <div style={{ fontFamily: FONT.body, fontSize: 24, color: t.ink2 }}>{asText(c.label)}</div>
            </div>
          );
        })}
      </div>
    </Frame>
  );
};

export const WindVector: React.FC<PrimProps> = ({ props, theme: t }) => {
  const v: { from: string; to: string; label?: string; deflect?: string }[] = props.vectors ?? [];
  return (
    <Frame t={t} label="wind">
      <div style={{ display: "flex", flexDirection: "column", gap: 18, justifyContent: "center", height: "100%" }}>
        {v.map((x, i) => {
          const st = useStagger(i, 8);
          return (
            <div key={i} style={{ ...st, display: "flex", alignItems: "center", gap: 18, fontFamily: FONT.display, fontSize: 32, color: t.ink }}>
              <span>{asText(x.from)}</span><span style={{ color: t.accent }}>→</span><span>{asText(x.to)}</span>
              {x.deflect && <span style={{ ...eyebrow(t), fontSize: 18 }}>deflects {x.deflect}</span>}
            </div>
          );
        })}
      </div>
    </Frame>
  );
};

export const ProfileDiagram: React.FC<PrimProps> = ({ props, theme: t }) => {
  const stops: { name: string; valueLabel?: string }[] = props.stops ?? [];
  return (
    <Frame t={t} label={props.axis ?? "profile"}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: "100%" }}>
        {stops.map((s, i) => {
          const st = useStagger(i, 6);
          const h = 20 + (i / Math.max(1, stops.length - 1)) * 70;
          return (
            <div key={i} style={{ ...st, flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
              <div style={{ height: `${h}%`, background: `${t.accent}33`, border: `1px solid ${t.accent}`, borderRadius: "10px 10px 0 0" }} />
              <div style={{ fontFamily: FONT.body, fontSize: 22, color: t.ink2, marginTop: 10, textAlign: "center" }}>{asText(s.name)}</div>
              {s.valueLabel && <div style={{ ...eyebrow(t), fontSize: 15, textAlign: "center" }}>{asText(s.valueLabel)}</div>}
            </div>
          );
        })}
      </div>
    </Frame>
  );
};
