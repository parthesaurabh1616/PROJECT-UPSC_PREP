"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crosshair, Target, Newspaper, ArrowRight } from "lucide-react";
import { matchCountries } from "@/lib/geo";

const DAY = 86400000;

/* Daily country focus — a rotating study nudge. Deterministic per day, drawn
   from real data: it ranks countries by PYQ frequency + this week's current
   affairs, then rotates through the top ten (one per day). Nothing invented;
   "Begin focus" opens that country's real dossier. */
export default function DailyFocus({ onFocus }: { onFocus: (name: string) => void }) {
  const [focus, setFocus] = useState<{ name: string; pyq: number; ca: number } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/pyq-geo", { cache: "no-store" }).then((r) => (r.ok ? r.json() : { pins: [] })),
      fetch("/api/affairs", { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([geo, affairs]: [{ pins: { name: string; all: number }[] }, Array<{ title?: string; headline?: string; summary?: string; publishedAt?: string }>]) => {
        const weekAgo = Date.now() - 7 * DAY;
        const ca = new Map<string, number>();
        for (const a of Array.isArray(affairs) ? affairs : []) {
          if (!a.publishedAt || new Date(a.publishedAt).getTime() < weekAgo) continue;
          for (const c of matchCountries(`${a.title ?? a.headline ?? ""} ${a.summary ?? ""}`)) ca.set(c, (ca.get(c) ?? 0) + 1);
        }
        const ranked = (geo.pins ?? [])
          .map((p) => ({ name: p.name, pyq: p.all, ca: ca.get(p.name) ?? 0 }))
          .sort((a, b) => b.pyq + 4 * b.ca - (a.pyq + 4 * a.ca))
          .slice(0, 10);
        if (!ranked.length) return;
        setFocus(ranked[Math.floor(Date.now() / DAY) % ranked.length]);
      })
      .catch(() => {});
  }, []);

  return (
    <AnimatePresence>
      {focus && (
        <motion.div
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="pointer-events-auto absolute right-5 top-1/2 z-20 w-[220px] -translate-y-1/2 rounded-xl border border-[#1c3a55]/60 bg-[#040b14]/85 p-3.5 backdrop-blur-md md:right-8"
        >
          <p className="flex items-center gap-1.5 font-mono text-[8.5px] uppercase tracking-[0.26em] text-[#5b86a8]">
            <Crosshair size={11} className="text-[#5fd0ff]" /> Today&apos;s Focus
          </p>
          <p className="mt-1 font-display text-[20px] font-semibold leading-tight text-white">{focus.name}</p>
          <div className="mt-2 space-y-1 font-mono text-[10px] text-[#9fc4e2]">
            <span className="flex items-center gap-1.5"><Target size={10} className="text-[#ff8f6b]" /> {focus.pyq} PYQ mentions</span>
            <span className="flex items-center gap-1.5"><Newspaper size={10} className="text-[#5fb0e8]" /> {focus.ca} affairs this week</span>
          </div>
          <button onClick={() => onFocus(focus.name)}
            className="group mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#3aa0ff]/45 bg-[#0a1c2e]/70 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#dff1ff] transition-colors hover:border-[#5fd0ff] hover:bg-[#0d2438]">
            Begin focus <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
          </button>
          <p className="mt-2 text-[8.5px] leading-relaxed tracking-[0.05em] text-[#4d6c88]">
            Rotates daily through the most-asked countries, weighted by this week&apos;s news.
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
