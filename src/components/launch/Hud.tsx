"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Activity, Radio, Satellite, Volume2, VolumeX, ShieldCheck, Globe2, Flame, Clock, ChevronRight, Loader2,
} from "lucide-react";
import { Ambience } from "@/lib/ambience";

interface Overview {
  exam?: { shortName?: string; targetYear?: number | null; daysToPrelims?: number | null };
  streak?: number | { streak?: number; current?: number; days?: number };
  studyToday?: number | { minutes?: number };
  coverage?: { ncert?: { pct?: number } };
}
interface Affair { id: string; title: string; category?: string; publishedAt?: string }

const num = (s: Overview["streak"]) =>
  typeof s === "number" ? s : s?.streak ?? s?.current ?? s?.days ?? 0;

/* live FPS, measured (not faked) */
function useFps() {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    let raf = 0, frames = 0, last = performance.now();
    const loop = (now: number) => {
      frames++;
      if (now - last >= 1000) { setFps(frames); frames = 0; last = now; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return fps;
}

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const panel = (delay: number) => ({
  hidden: { opacity: 0, y: 8, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, delay, ease: "easeOut" } },
});

export default function Hud({ arrived }: { arrived: boolean }) {
  const router = useRouter();
  const fps = useFps();
  const clock = useClock();
  const [ov, setOv] = useState<Overview | null>(null);
  const [dbOk, setDbOk] = useState<boolean | null>(null);
  const [feed, setFeed] = useState<Affair[]>([]);
  const [sound, setSound] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const amb = useRef<Ambience | null>(null);

  useEffect(() => {
    fetch("/api/overview", { cache: "no-store" })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((j) => { setOv(j); setDbOk(true); })
      .catch(() => setDbOk(false));
    fetch("/api/affairs", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((a: Affair[]) => setFeed(Array.isArray(a) ? a.slice(0, 4) : []))
      .catch(() => {});
  }, []);

  useEffect(() => () => { amb.current?.stop(); }, []);

  const toggleSound = () => {
    if (!amb.current) amb.current = new Ambience();
    if (sound) { amb.current.stop(); setSound(false); }
    else { amb.current.start(); setSound(true); }
  };

  const enter = () => {
    setLeaving(true);
    amb.current?.stop();
    setTimeout(() => router.push("/command"), 700);
  };

  // real JS heap when the browser exposes it (Chromium); recomputed each
  // render (the clock ticks ~1/s); omitted entirely on other browsers
  const heapMem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  const heap = heapMem ? Math.round(heapMem.usedJSHeapSize / 1048576) : null;

  const utc = clock?.toISOString().slice(11, 19) ?? "--:--:--";
  const local = clock?.toLocaleTimeString([], { hour12: false }) ?? "--:--:--";
  const streak = num(ov?.streak);
  const focus = typeof ov?.studyToday === "number" ? ov.studyToday : ov?.studyToday?.minutes ?? 0;
  const tPrelims = ov?.exam?.daysToPrelims ?? null;
  const cover = ov?.coverage?.ncert?.pct ?? 0;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 select-none font-mono text-[#cfe9ff]">
      {/* ── Leaving flash ── */}
      <motion.div className="absolute inset-0 z-50 bg-[#02060d]" initial={{ opacity: 0 }} animate={{ opacity: leaving ? 1 : 0 }} transition={{ duration: 0.7 }} />

      {/* ════ TOP LEFT — identity ════ */}
      <motion.div variants={panel(0.1)} initial="hidden" animate={arrived ? "show" : "hidden"}
        className="absolute left-5 top-5 md:left-8 md:top-7">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-md border border-[#2a6da0]/50 bg-[#0a1c2e]/70 text-[12px] font-bold text-[#5fd0ff] shadow-[0_0_18px_rgba(53,208,255,0.25)]">CC</span>
          <div className="leading-tight">
            <p className="text-[12.5px] font-semibold tracking-[0.18em] text-white">CONQUER CAPITAL</p>
            <p className="text-[8.5px] uppercase tracking-[0.34em] text-[#5b86a8]">Strategic Intelligence Platform</p>
          </div>
        </div>
        <div className="mt-3 space-y-1 text-[9px] uppercase tracking-[0.16em] text-[#5b86a8]">
          <Line ok label="AI Engine" value="Online" />
          <Line ok={dbOk ?? undefined} label="Knowledge Graph" value={dbOk === false ? "Offline" : "Connected"} />
          <Line ok label="Build" value="v1.0 · CORE" />
        </div>
      </motion.div>

      {/* ════ TOP RIGHT — clocks + real mission stats ════ */}
      <motion.div variants={panel(0.25)} initial="hidden" animate={arrived ? "show" : "hidden"}
        className="absolute right-5 top-5 flex flex-col items-end gap-2 md:right-8 md:top-7">
        <button onClick={toggleSound} className="pointer-events-auto mb-1 flex items-center gap-1.5 rounded border border-[#234a6b]/60 bg-[#08182a]/70 px-2 py-1 text-[8.5px] uppercase tracking-[0.2em] text-[#7fb8e0] transition-colors hover:border-[#3aa0ff]/70 hover:text-white">
          {sound ? <Volume2 size={11} /> : <VolumeX size={11} />} {sound ? "Ambience On" : "Ambience"}
        </button>
        <Stat icon={<Clock size={11} />} label="UTC" value={utc} />
        <Stat icon={<Clock size={11} />} label="Local" value={local} />
        <Stat icon={<Flame size={11} className="text-[#ffb454]" />} label="Streak" value={`${streak} D`} />
        <Stat icon={<Activity size={11} />} label="Focus today" value={`${focus} min`} />
        <Stat icon={<ShieldCheck size={11} />} label={`T–Prelims`} value={tPrelims != null ? `${tPrelims} D` : "—"} />
        <div className="mt-1 w-[148px]">
          <div className="mb-0.5 flex justify-between text-[8px] uppercase tracking-[0.18em] text-[#5b86a8]"><span>NCERT coverage</span><span>{cover}%</span></div>
          <div className="h-1 overflow-hidden rounded-full bg-[#0d2236]"><div className="h-full rounded-full bg-gradient-to-r from-[#2aa8ff] to-[#5fe0ff]" style={{ width: `${cover}%` }} /></div>
        </div>
      </motion.div>

      {/* ════ BOTTOM LEFT — live intelligence feed (real CA) ════ */}
      <motion.div variants={panel(0.4)} initial="hidden" animate={arrived ? "show" : "hidden"}
        className="absolute bottom-6 left-5 hidden max-w-[330px] lg:block md:left-8 md:bottom-8">
        <p className="mb-2 flex items-center gap-1.5 text-[8.5px] uppercase tracking-[0.3em] text-[#5b86a8]"><Radio size={11} className="text-[#3aa0ff]" /> Geopolitical Feed</p>
        <div className="space-y-1.5">
          {feed.length === 0 && <p className="text-[10px] text-[#4d6c88]">No briefings ingested yet — add current affairs to populate the feed.</p>}
          {feed.map((a) => (
            <div key={a.id} className="border-l border-[#2a6da0]/40 pl-2.5">
              <p className="line-clamp-1 text-[10.5px] text-[#bcd9f2]">{a.title}</p>
              <p className="text-[8px] uppercase tracking-[0.16em] text-[#4d6c88]">{a.category ?? "BRIEF"}{a.publishedAt ? ` · ${new Date(a.publishedAt).toLocaleDateString()}` : ""}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ════ BOTTOM RIGHT — real telemetry ════ */}
      <motion.div variants={panel(0.5)} initial="hidden" animate={arrived ? "show" : "hidden"}
        className="absolute bottom-6 right-5 hidden flex-col items-end gap-1 lg:flex md:right-8 md:bottom-8">
        <Stat icon={<Activity size={11} className={fps >= 50 ? "text-[#4ade80]" : fps >= 30 ? "text-[#ffb454]" : "text-[#ff6b6b]"} />} label="FPS" value={fps ? `${fps}` : "…"} />
        {heap != null && <Stat icon={<Activity size={11} />} label="JS Heap" value={`${heap} MB`} />}
        <Stat icon={<Satellite size={11} />} label="Sats" value="16 orbiting" />
        <Stat icon={<Globe2 size={11} />} label="Render" value={`${typeof window !== "undefined" ? window.innerWidth : 0}×${typeof window !== "undefined" ? window.innerHeight : 0}`} />
      </motion.div>

      {/* ════ BOTTOM CENTER — mission status + ENTER ════ */}
      <motion.div variants={panel(0.7)} initial="hidden" animate={arrived ? "show" : "hidden"}
        className="absolute bottom-7 left-1/2 flex -translate-x-1/2 flex-col items-center md:bottom-9">
        <div className="mb-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[8.5px] uppercase tracking-[0.22em]">
          <Mission ok={dbOk ?? undefined} text={dbOk === false ? "Database offline" : "Global database connected"} />
          <Mission ok text="Knowledge graph loaded" />
          <Mission ok text="AI mentor ready" />
        </div>
        <button onClick={enter}
          className="group pointer-events-auto relative overflow-hidden rounded-lg border border-[#3aa0ff]/50 bg-[#0a1c2e]/70 px-8 py-3.5 backdrop-blur transition-all hover:border-[#5fd0ff] hover:shadow-[0_0_40px_rgba(53,208,255,0.4)]">
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[#5fd0ff]/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          <span className="relative flex items-center gap-2.5 text-[12px] font-semibold uppercase tracking-[0.28em] text-[#dff1ff]">
            {leaving ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} className="text-[#5fd0ff]" />}
            Enter Command Center
            <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
          </span>
        </button>
        <p className="mt-2.5 text-[8px] uppercase tracking-[0.3em] text-[#4d6c88]">Drag to orbit · scroll to zoom</p>
      </motion.div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded border border-[#1c3a55]/50 bg-[#06121f]/60 px-2.5 py-1 backdrop-blur-sm">
      <span className="text-[#5fb0e8]">{icon}</span>
      <span className="text-[8px] uppercase tracking-[0.2em] text-[#5b86a8]">{label}</span>
      <span className="min-w-[52px] text-right text-[11px] tabular-nums tracking-wider text-white">{value}</span>
    </div>
  );
}

function Line({ ok, label, value }: { ok?: boolean; label: string; value: string }) {
  return (
    <p className="flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${ok === false ? "bg-[#ff6b6b]" : ok ? "bg-[#4ade80] shadow-[0_0_6px_#4ade80]" : "bg-[#5b86a8]"}`} />
      <span className="text-[#5b86a8]">{label}</span>
      <span className="text-[#9fc4e2]">{value}</span>
    </p>
  );
}

function Mission({ ok, text }: { ok?: boolean; text: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[#7fb8e0]">
      <span className={`h-1.5 w-1.5 rounded-full ${ok === false ? "bg-[#ff6b6b]" : "bg-[#4ade80] shadow-[0_0_6px_#4ade80]"}`} />
      {text}
    </span>
  );
}
