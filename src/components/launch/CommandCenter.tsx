"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";
import Globe from "./Globe";
import { Nodes, Arcs, Satellites, RadarSweep, SpaceField } from "./Layers";
import Hud from "./Hud";

const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* ── Cinematic camera: scripted fly-in for ~7s, then interactive
   orbit with slow auto-rotate + damping inertia. ── */
function Rig({ onArrived }: { onArrived: () => void }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controls = useRef<any>(null);
  const { camera } = useThree();
  const start = useRef<number | null>(null);
  const arrived = useRef(false);
  const FLY = 7;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (start.current === null) start.current = t;
    const e = t - start.current;
    if (e < FLY) {
      const k = easeInOut(Math.min(e / FLY, 1));
      camera.position.set(lerp(0.15, 1.9, k), lerp(-0.18, 1.05, k), lerp(6.6, 2.7, k));
      camera.lookAt(0, 0, 0);
      if (controls.current) controls.current.enabled = false;
    } else if (controls.current) {
      if (!arrived.current) {
        arrived.current = true;
        controls.current.enabled = true;
        onArrived();
      }
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

function Scene({ onArrived, quality }: { onArrived: () => void; quality: "high" | "low" }) {
  return (
    <>
      <color attach="background" args={["#02060d"]} />
      <fog attach="fog" args={["#02060d", 8, 16]} />
      <SpaceField />
      <Globe>
        <Nodes />
        <Arcs />
      </Globe>
      <Satellites count={quality === "high" ? 16 : 8} />
      <RadarSweep />
      <Rig onArrived={onArrived} />
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

  useEffect(() => {
    const small = window.matchMedia("(max-width: 820px)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (small || reduced) setQuality("low");
  }, []);

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
      >
        <Suspense fallback={null}>
          <Scene onArrived={() => setArrived(true)} quality={quality} />
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
    </div>
  );
}
