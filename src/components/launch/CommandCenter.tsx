"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";
import Globe from "./Globe";
import { Nodes, Arcs, Labels, Hotspots, GroupingEdges, Satellites, RadarSweep, SpaceField, type CountrySelect } from "./Layers";
import Hud from "./Hud";
import CountryPanel from "./CountryPanel";
import GroupingsExplorer from "./GroupingsExplorer";

const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const REST = new THREE.Vector3(1.9, 1.05, 2.7); // resting camera after fly-in
const FOCUS_DIST = 2.1;

/* ── Cinematic camera: scripted fly-in (~7s), then interactive orbit
   with auto-rotate; on country select, smooth fly-to that point. ── */
function Rig({ onArrived, focusDir, focusKey }: { onArrived: () => void; focusDir: THREE.Vector3 | null; focusKey: string | null }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controls = useRef<any>(null);
  const { camera } = useThree();
  const start = useRef<number | null>(null);
  const arrived = useRef(false);
  const prevKey = useRef<string | null | undefined>(undefined);
  const anim = useRef({ active: false, t0: 0, from: new THREE.Vector3(), to: new THREE.Vector3() });
  const FLY = 7;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (start.current === null) start.current = t;
    const e = t - start.current;

    // 1) scripted fly-in
    if (e < FLY) {
      const k = easeInOut(Math.min(e / FLY, 1));
      camera.position.set(lerp(0.15, REST.x, k), lerp(-0.18, REST.y, k), lerp(6.6, REST.z, k));
      camera.lookAt(0, 0, 0);
      if (controls.current) controls.current.enabled = false;
      return;
    }
    if (!arrived.current) {
      arrived.current = true;
      prevKey.current = focusKey; // adopt initial (null) without animating
      if (controls.current) controls.current.enabled = true;
      onArrived();
    }

    // 2) start a fly-to when the selection changes
    if (focusKey !== prevKey.current) {
      prevKey.current = focusKey;
      anim.current.from.copy(camera.position);
      anim.current.to.copy(focusDir ? focusDir.clone().multiplyScalar(FOCUS_DIST) : REST);
      anim.current.t0 = t;
      anim.current.active = true;
    }

    // 3) run the fly-to, else hand control back
    if (anim.current.active) {
      const k = easeInOut(Math.min((t - anim.current.t0) / 1.2, 1));
      camera.position.lerpVectors(anim.current.from, anim.current.to, k);
      camera.lookAt(0, 0, 0);
      if (controls.current) controls.current.enabled = false;
      if (k >= 1) anim.current.active = false;
    } else if (controls.current) {
      controls.current.enabled = true;
      controls.current.autoRotate = !focusKey; // stop spinning while focused
      controls.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controls}
      enableDamping
      dampingFactor={0.05}
      rotateSpeed={0.45}
      autoRotate
      autoRotateSpeed={0.32}
      enablePan={false}
      minDistance={1.65}
      maxDistance={6}
      target={[0, 0, 0]}
    />
  );
}

function Scene({ onArrived, quality, frozen, focusDir, focusKey, onHover, onSelect, selectedName, activeGroup, exploreGroup }: {
  onArrived: () => void; quality: "high" | "low"; frozen: boolean;
  focusDir: THREE.Vector3 | null; focusKey: string | null;
  onHover: (n: string | null) => void; onSelect: (s: CountrySelect) => void;
  selectedName: string | null; activeGroup: string | null; exploreGroup: string | null;
}) {
  return (
    <>
      <color attach="background" args={["#02060d"]} />
      <fog attach="fog" args={["#02060d", 8, 16]} />
      <SpaceField />
      <Globe frozen={frozen}>
        <Nodes />
        <Arcs />
        <Labels />
        <GroupingEdges selectedName={selectedName} active={activeGroup} exploreGroup={exploreGroup} />
        <Hotspots onHover={onHover} onSelect={onSelect} />
      </Globe>
      <Satellites count={quality === "high" ? 16 : 8} />
      <RadarSweep />
      <Rig onArrived={onArrived} focusDir={focusDir} focusKey={focusKey} />
      <EffectComposer multisampling={quality === "high" ? 4 : 0}>
        <Bloom intensity={0.9} luminanceThreshold={0.2} luminanceSmoothing={0.5} mipmapBlur radius={0.7} />
        <Vignette eskil={false} offset={0.25} darkness={0.85} />
      </EffectComposer>
    </>
  );
}

export default function CommandCenter() {
  const [booted, setBooted] = useState(false); // webgl first frame painted
  const [arrived, setArrived] = useState(false); // camera reached rest
  const [quality, setQuality] = useState<"high" | "low">("high");
  const [hovering, setHovering] = useState<string | null>(null);
  const [selected, setSelected] = useState<CountrySelect | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [exploreGroup, setExploreGroup] = useState<string | null>(null);

  useEffect(() => {
    const small = window.matchMedia("(max-width: 820px)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (small || reduced) setQuality("low");
  }, []);

  const frozen = hovering !== null || selected !== null;
  // country selection and the standalone explorer are mutually exclusive
  const selectCountry = (s: CountrySelect | null) => { setSelected(s); setActiveGroup(null); if (s) setExploreGroup(null); };
  const pickExplore = (k: string | null) => { setExploreGroup(k); if (k) selectCountry(null); };

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#02060d]">
      <Canvas
        gl={{ antialias: true, powerPreference: "high-performance", alpha: false }}
        dpr={[1, quality === "high" ? 2 : 1.5]}
        camera={{ position: [0.15, -0.18, 6.6], fov: 42, near: 0.1, far: 100 }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
          setBooted(true);
        }}
        onPointerMissed={() => selectCountry(null)} // click empty space / globe to deselect
      >
        <Suspense fallback={null}>
          <Scene
            onArrived={() => setArrived(true)}
            quality={quality}
            frozen={frozen}
            focusDir={selected?.dir ?? null}
            focusKey={selected?.name ?? null}
            onHover={setHovering}
            onSelect={selectCountry}
            selectedName={selected?.name ?? null}
            activeGroup={activeGroup}
            exploreGroup={exploreGroup}
          />
        </Suspense>
      </Canvas>

      {/* Boot black-out: covers the WebGL warm-up, then fades to reveal space */}
      <AnimatePresence>
        {!booted && (
          <motion.div
            className="pointer-events-none absolute inset-0 bg-black"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.6, ease: "easeInOut" }}
          />
        )}
      </AnimatePresence>

      {/* Subtle scanlines + corner frame for the command-center texture */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-10 opacity-[0.06]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg, #7fd4ff 0px, #7fd4ff 1px, transparent 1px, transparent 3px)" }} />
      <div aria-hidden className="pointer-events-none absolute inset-0 z-10"
        style={{ boxShadow: "inset 0 0 180px 40px rgba(0,0,0,0.85)" }} />

      {/* HUD overlay (DOM) — reveals after the fly-in */}
      <Hud arrived={arrived} />

      {/* Standalone alliance-network explorer */}
      {arrived && <GroupingsExplorer value={exploreGroup} onPick={pickExplore} />}

      {/* Country dossier — slides in on select, real platform data */}
      <CountryPanel
        selected={selected}
        onClose={() => selectCountry(null)}
        activeGroup={activeGroup}
        onToggleGroup={(k) => setActiveGroup((cur) => (cur === k ? null : k))}
      />
    </div>
  );
}
