"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, ChevronDown } from "lucide-react";
import { GROUPINGS } from "@/lib/geo";

/* Standalone knowledge-graph explorer — pick any bloc and its full member
   network lights up on the globe, no country selection required. */
export default function GroupingsExplorer({ value, onPick }: { value: string | null; onPick: (key: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const activeName = value ? GROUPINGS.find((g) => g.key === value)?.name : null;

  return (
    <div className="pointer-events-auto absolute left-1/2 top-5 z-30 -translate-x-1/2 font-mono md:top-7">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] backdrop-blur transition-colors"
        style={{
          borderColor: value ? (GROUPINGS.find((g) => g.key === value)?.color ?? "#3aa0ff") + "99" : "#234a6b99",
          background: "#08182acc",
          color: value ? "#fff" : "#7fb8e0",
        }}
      >
        <Share2 size={12} />
        {activeName ? `Network · ${activeName}` : "Alliance Networks"}
        <ChevronDown size={12} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}
            className="absolute left-1/2 mt-2 flex w-[320px] -translate-x-1/2 flex-wrap justify-center gap-1.5 rounded-xl border border-[#173049]/80 bg-[#06121f]/90 p-3 backdrop-blur"
          >
            <p className="mb-1 w-full text-center text-[8.5px] uppercase tracking-[0.24em] text-[#4d6c88]">Tap a grouping to map its network</p>
            {GROUPINGS.map((g) => {
              const on = value === g.key;
              return (
                <button
                  key={g.key}
                  onClick={() => onPick(on ? null : g.key)}
                  title={`${g.name} · ${g.members.length} members`}
                  className="rounded-full border px-2.5 py-1 text-[10.5px] font-medium tracking-wide transition-all"
                  style={{
                    borderColor: g.color + (on ? "" : "66"),
                    background: on ? g.color + "26" : "transparent",
                    color: on ? "#fff" : g.color,
                    boxShadow: on ? `0 0 14px ${g.color}55` : "none",
                  }}
                >
                  {g.name}
                </button>
              );
            })}
            {value && (
              <button onClick={() => onPick(null)} className="mt-1 w-full text-center text-[9px] uppercase tracking-[0.2em] text-[#4d6c88] hover:text-[#7fb8e0]">
                Clear network
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
