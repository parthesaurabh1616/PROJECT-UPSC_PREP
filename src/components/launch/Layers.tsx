"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Line, Stars, Text } from "@react-three/drei";
import * as THREE from "three";
import { NODES, CORRIDORS, GEO_LABELS, GROUPINGS, countryCoord, latLngToVector3, greatCircleArc, greatCircleCurve } from "@/lib/geo";

const CYAN = new THREE.Color("#35d0ff");
const AMBER = new THREE.Color("#ffb454");
const ARC = "#3aa0ff";

/* ════════════ Strategic nodes — pulsing geo points ════════════ */
export function Nodes() {
  const { gl } = useThree();
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const { positions, phases, colors } = useMemo(() => {
    const positions = new Float32Array(NODES.length * 3);
    const phases = new Float32Array(NODES.length);
    const colors = new Float32Array(NODES.length * 3);
    NODES.forEach((n, i) => {
      const p = latLngToVector3(n.lat, n.lng, 1.012);
      positions.set([p.x, p.y, p.z], i * 3);
      phases[i] = Math.random() * Math.PI * 2;
      const c = n.kind === "chokepoint" ? AMBER : CYAN;
      colors.set([c.r, c.g, c.b], i * 3);
    });
    return { positions, phases, colors };
  }, []);

  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.uniforms.time.value = clock.elapsedTime;
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-phase" args={[phases, 1]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={{ time: { value: 0 }, pixelRatio: { value: gl.getPixelRatio() } }}
        vertexShader={/* glsl */ `
          attribute float phase;
          uniform float time;
          uniform float pixelRatio;
          varying vec3 vColor;
          void main() {
            vColor = color;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            float pulse = 0.55 + 0.45 * sin(time * 2.2 + phase);
            gl_PointSize = pulse * 18.0 * pixelRatio * (2.6 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }
        `}
        fragmentShader={/* glsl */ `
          varying vec3 vColor;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float halo = smoothstep(0.5, 0.0, d);
            float core = smoothstep(0.16, 0.0, d);
            gl_FragColor = vec4(vColor * (0.5 + core * 1.6), halo);
          }
        `}
        vertexColors
      />
    </points>
  );
}

/* ════════════ Geographic labels — continents · oceans · countries · chokepoints ════════════ */
type LabelTier = "continent" | "ocean" | "country" | "choke";
const LABEL_STYLE: Record<LabelTier, { size: number; color: string; fillOpacity: number; spacing: number; outline: number }> = {
  continent: { size: 0.05, color: "#dbe9f7", fillOpacity: 0.5, spacing: 0.22, outline: 0.0035 },
  ocean: { size: 0.037, color: "#6fa0c8", fillOpacity: 0.55, spacing: 0.26, outline: 0.003 },
  country: { size: 0.026, color: "#cfe6fb", fillOpacity: 0.95, spacing: 0.02, outline: 0.004 },
  choke: { size: 0.02, color: "#ffb454", fillOpacity: 0.9, spacing: 0.04, outline: 0.004 },
};
interface LabelItem { text: string; lat: number; lng: number; tier: LabelTier; primary?: boolean }
const LABEL_FONT = "/fonts/Rajdhani-Medium.ttf"; // bundled — no runtime CDN fetch

export function Labels() {
  const root = useRef<THREE.Group>(null);
  const refs = useRef<(THREE.Group | null)[]>([]);

  const items = useMemo<LabelItem[]>(
    () => [
      ...GEO_LABELS.map((g) => ({ text: g.text, lat: g.lat, lng: g.lng, tier: g.tier as LabelTier, primary: g.primary })),
      ...NODES.filter((n) => n.kind === "chokepoint").map((n) => ({ text: n.name, lat: n.lat, lng: n.lng, tier: "choke" as LabelTier })),
    ],
    []
  );

  const tmp = useMemo(
    () => ({
      parentQ: new THREE.Quaternion(), parentQInv: new THREE.Quaternion(), bbQ: new THREE.Quaternion(),
      wp: new THREE.Vector3(), n: new THREE.Vector3(), v: new THREE.Vector3(),
    }),
    []
  );

  useFrame(({ camera }) => {
    const parent = root.current?.parent;
    if (!parent) return;
    parent.getWorldQuaternion(tmp.parentQ);
    tmp.parentQInv.copy(tmp.parentQ).invert();
    tmp.bbQ.copy(tmp.parentQInv).multiply(camera.quaternion); // billboard within the spinning frame
    for (const g of refs.current) {
      if (!g) continue;
      g.quaternion.copy(tmp.bbQ);
      g.getWorldPosition(tmp.wp);
      tmp.n.copy(tmp.wp).normalize();
      tmp.v.copy(camera.position).sub(tmp.wp).normalize();
      g.visible = tmp.n.dot(tmp.v) > 0.12; // cull the far hemisphere
    }
  });

  return (
    <group ref={root}>
      {items.map((l, i) => {
        const s = LABEL_STYLE[l.tier];
        return (
          <group key={i} ref={(el) => { refs.current[i] = el; }} position={latLngToVector3(l.lat, l.lng, 1.02)}>
            <Text
              font={LABEL_FONT}
              fontSize={l.primary ? s.size * 1.25 : s.size}
              color={l.primary ? "#5fe0ff" : s.color}
              anchorX="center"
              anchorY="middle"
              letterSpacing={s.spacing}
              outlineWidth={s.outline}
              outlineColor="#02060d"
              outlineOpacity={0.85}
              fillOpacity={l.primary ? 1 : s.fillOpacity}
              renderOrder={10}
              material-transparent
              material-depthTest={false}
              material-depthWrite={false}
            >
              {l.text}
            </Text>
          </group>
        );
      })}
    </group>
  );
}

/* ════════════ Clickable hotspots — hover ring + select (camera fly-to) ════════════ */
export interface CountrySelect { name: string; kind: "country" | "choke"; dir: THREE.Vector3 }

function Hotspot({ name, lat, lng, kind, onHover, onSelect }: {
  name: string; lat: number; lng: number; kind: "country" | "choke";
  onHover: (n: string | null) => void; onSelect: (s: CountrySelect, shift: boolean) => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const [hov, setHov] = useState(false);
  const pos = useMemo(() => latLngToVector3(lat, lng, 1.0), [lat, lng]);
  const ringPos = useMemo(() => latLngToVector3(lat, lng, 1.014), [lat, lng]);
  const ringQuat = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), pos.clone().normalize()),
    [pos]
  );
  const color = kind === "choke" ? "#ffb454" : "#5fe0ff";

  return (
    <group>
      <mesh
        ref={ref}
        position={pos}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHov(true); onHover(name); document.body.style.cursor = "pointer"; }}
        onPointerOut={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHov(false); onHover(null); document.body.style.cursor = "default"; }}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          const v = new THREE.Vector3();
          ref.current?.getWorldPosition(v);
          onSelect({ name, kind, dir: v.normalize() }, e.nativeEvent.shiftKey);
        }}
      >
        <sphereGeometry args={[0.03, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {hov && (
        <mesh position={ringPos} quaternion={ringQuat} renderOrder={11}>
          <ringGeometry args={[0.022, 0.032, 28]} />
          <meshBasicMaterial color={color} transparent opacity={0.95} side={THREE.DoubleSide} depthTest={false} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      )}
    </group>
  );
}

export function Hotspots({ onHover, onSelect }: { onHover: (n: string | null) => void; onSelect: (s: CountrySelect, shift: boolean) => void }) {
  const spots = useMemo(
    () => [
      ...GEO_LABELS.filter((g) => g.tier === "country").map((g) => ({ name: g.text, lat: g.lat, lng: g.lng, kind: "country" as const })),
      ...NODES.filter((n) => n.kind === "chokepoint").map((n) => ({ name: n.name, lat: n.lat, lng: n.lng, kind: "choke" as const })),
    ],
    []
  );
  return (
    <group>
      {spots.map((s) => (
        <Hotspot key={s.name} {...s} onHover={onHover} onSelect={onSelect} />
      ))}
    </group>
  );
}

/* ════════════ Knowledge-graph edges — groupings, with travelling packets ════════════ */
type Arc = { pts: THREE.Vector3[]; color: string };
export function GroupingEdges({ selectedName, active, exploreGroup, compare }: { selectedName: string | null; active: string | null; exploreGroup: string | null; compare: { a: string; b: string } | null }) {
  const data = useMemo(() => {
    const arcs: Arc[] = [];
    const dots = new Map<string, { pos: THREE.Vector3; color: string }>();

    // ── Compare mode: bilateral corridor + one arc per shared grouping ──
    if (compare) {
      const A = countryCoord(compare.a), B = countryCoord(compare.b);
      if (A && B) {
        arcs.push({ pts: greatCircleArc([A.lat, A.lng], [B.lat, B.lng], 52, 0.16), color: "#dff1ff" }); // corridor
        const shared = GROUPINGS.filter((g) => g.members.includes(compare.a) && g.members.includes(compare.b));
        shared.forEach((g, i) => arcs.push({ pts: greatCircleArc([A.lat, A.lng], [B.lat, B.lng], 52, 0.28 + i * 0.12), color: g.color }));
        dots.set(compare.a, { pos: latLngToVector3(A.lat, A.lng, 1.02), color: "#dff1ff" });
        dots.set(compare.b, { pos: latLngToVector3(B.lat, B.lng, 1.02), color: "#dff1ff" });
      }
      return { arcs, dots: [...dots.values()] };
    }

    // ── Explore mode: light up an entire grouping as a ring of members ──
    if (exploreGroup) {
      const g = GROUPINGS.find((x) => x.key === exploreGroup);
      if (!g) return { arcs, dots: [] };
      const mem = g.members
        .map((m) => ({ name: m, c: countryCoord(m) }))
        .filter((x): x is { name: string; c: { lat: number; lng: number } } => !!x.c)
        .sort((a, b) => a.c.lng - b.c.lng);
      for (let i = 0; i < mem.length; i++) {
        const a = mem[i].c, b = mem[(i + 1) % mem.length].c;
        arcs.push({ pts: greatCircleArc([a.lat, a.lng], [b.lat, b.lng], 40, 0.26), color: g.color });
        dots.set(mem[i].name, { pos: latLngToVector3(a.lat, a.lng, 1.02), color: g.color });
      }
      return { arcs, dots: [...dots.values()] };
    }

    // ── Country mode: star from the selected country to its co-members ──
    if (!selectedName) return { arcs, dots: [] };
    const src = countryCoord(selectedName);
    if (!src) return { arcs, dots: [] };
    const groups = GROUPINGS.filter((g) => g.members.includes(selectedName) && (!active || g.key === active));
    for (const g of groups) {
      for (const m of g.members) {
        if (m === selectedName) continue;
        const d = countryCoord(m);
        if (!d) continue;
        arcs.push({ pts: greatCircleArc([src.lat, src.lng], [d.lat, d.lng], 40, 0.26), color: g.color });
        if (active) dots.set(m, { pos: latLngToVector3(d.lat, d.lng, 1.02), color: g.color });
      }
    }
    return { arcs, dots: [...dots.values()] };
  }, [selectedName, active, exploreGroup, compare]);

  const focused = !!active || !!exploreGroup || !!compare;
  const packetCount = Math.min(data.arcs.length, 26);
  const arcsRef = useRef<Arc[]>(data.arcs);
  arcsRef.current = data.arcs;
  const pRefs = useRef<(THREE.Mesh | null)[]>([]);
  const vtmp = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const a = arcsRef.current;
    for (let i = 0; i < packetCount; i++) {
      const arc = a[i];
      const m = pRefs.current[i];
      if (!arc || !m) continue;
      const seg = (t * 0.16 + i * 0.11) % 1;
      const f = seg * (arc.pts.length - 1);
      const idx = Math.floor(f);
      const nxt = arc.pts[idx + 1] || arc.pts[idx];
      m.position.copy(vtmp.copy(arc.pts[idx]).lerp(nxt, f - idx));
    }
  });

  return (
    <group>
      {data.arcs.map((a, i) => (
        <Line key={i} points={a.pts} color={a.color} lineWidth={focused ? 1.6 : 1} transparent opacity={focused ? 0.85 : 0.42} />
      ))}
      {data.dots.map((d, i) => (
        <mesh key={i} position={d.pos} renderOrder={9}>
          <sphereGeometry args={[0.013, 10, 10]} />
          <meshBasicMaterial color={d.color} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
      {Array.from({ length: packetCount }).map((_, i) => (
        <mesh key={`p${i}`} ref={(el) => { pRefs.current[i] = el; }} renderOrder={10}>
          <sphereGeometry args={[0.009, 8, 8]} />
          <meshBasicMaterial color={data.arcs[i]?.color || "#ffffff"} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ════════════ Communication arcs + travelling data packets ════════════ */
export function Arcs() {
  const curves = useMemo(() => CORRIDORS.map(([a, b]) => greatCircleCurve(a, b, 0.32)), []);
  const arcPoints = useMemo(() => curves.map((c) => c.getPoints(56)), [curves]);
  const packets = useRef<THREE.Group>(null);

  // two packets per corridor, staggered, varied speed
  const meta = useMemo(
    () =>
      curves.flatMap((c, i) =>
        [0, 0.5].map((off) => ({ curve: c, offset: off + i * 0.13, speed: 0.12 + (i % 4) * 0.03 }))
      ),
    [curves]
  );

  useFrame(({ clock }) => {
    if (!packets.current) return;
    const t = clock.elapsedTime;
    packets.current.children.forEach((child, idx) => {
      const m = meta[idx];
      const u = (t * m.speed + m.offset) % 1;
      const p = m.curve.getPoint(u);
      child.position.set(p.x, p.y, p.z);
      const s = 0.6 + 0.4 * Math.sin(u * Math.PI); // fade in/out along the arc
      child.scale.setScalar(s);
    });
  });

  return (
    <group>
      {arcPoints.map((pts, i) => (
        <Line key={i} points={pts} color={ARC} lineWidth={1} transparent opacity={0.34} />
      ))}
      <group ref={packets}>
        {meta.map((_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.008, 8, 8]} />
            <meshBasicMaterial color="#8fe0ff" blending={THREE.AdditiveBlending} transparent depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ════════════ Satellite network — orbits (trails) + moving sats ════════════ */
function Satellite({ seed }: { seed: number }) {
  const rng = useMemo(() => mulberry(seed), [seed]);
  const radius = 1.32 + rng() * 0.28;
  const speed = 0.18 + rng() * 0.22;
  const phase = rng() * Math.PI * 2;
  const rot = useMemo(
    () => new THREE.Euler(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI * 0.5),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const ringPts = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    return pts;
  }, [radius]);
  const sat = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const a = clock.elapsedTime * speed + phase;
    if (sat.current) sat.current.position.set(Math.cos(a) * radius, 0, Math.sin(a) * radius);
  });

  return (
    <group rotation={rot}>
      <Line points={ringPts} color="#1d5e8f" lineWidth={1} transparent opacity={0.2} />
      <mesh ref={sat}>
        <sphereGeometry args={[0.012, 8, 8]} />
        <meshBasicMaterial color="#bfe9ff" blending={THREE.AdditiveBlending} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

export function Satellites({ count = 16 }: { count?: number }) {
  return (
    <group>
      {Array.from({ length: count }).map((_, i) => (
        <Satellite key={i} seed={i * 1337 + 7} />
      ))}
    </group>
  );
}

/* ════════════ Equatorial radar sweep ════════════ */
export function RadarSweep() {
  const ref = useRef<THREE.ShaderMaterial>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.uniforms.time.value = clock.elapsedTime;
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.02, 1.9, 96, 1]} />
      <shaderMaterial
        ref={ref}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        uniforms={{ time: { value: 0 }, color: { value: new THREE.Color("#2fb6ff") } }}
        vertexShader={/* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `}
        fragmentShader={/* glsl */ `
          uniform float time;
          uniform vec3 color;
          varying vec2 vUv;
          void main() {
            vec2 c = vUv - 0.5;
            float ang = atan(c.y, c.x);
            float sweep = mod(ang - time * 0.8, 6.2831853) / 6.2831853;
            float beam = smoothstep(0.0, 0.06, sweep) * (1.0 - smoothstep(0.06, 0.5, sweep));
            float radial = smoothstep(0.0, 0.15, length(c)) * (1.0 - smoothstep(0.15, 0.5, length(c)));
            gl_FragColor = vec4(color, beam * radial * 0.5);
          }
        `}
      />
    </mesh>
  );
}

/* ════════════ Deep-space backdrop ════════════ */
export function SpaceField() {
  return (
    <>
      <Stars radius={80} depth={40} count={4500} factor={3.2} saturation={0} fade speed={0.4} />
      <Stars radius={30} depth={10} count={800} factor={1.4} saturation={0} fade speed={0.6} />
    </>
  );
}

/* tiny deterministic PRNG so satellites are stable across renders */
function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
