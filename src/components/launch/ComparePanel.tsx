"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, ArrowLeftRight, MapPin, Share2, GitCompareArrows } from "lucide-react";
import { COUNTRY_INFO, groupingsOf, type Grouping } from "@/lib/geo";
import type { CountrySelect } from "./Layers";

/* A ⇄ B comparison: the factual overlap of two countries' bloc
   memberships (shared / A-only / B-only). No fabricated figures. */
export default function ComparePanel({ a, b, onBack, onClose }: {
  a: CountrySelect | null; b: CountrySelect | null; onBack: () => void; onClose: () => void;
}) {
  const open = !!a && !!b;
  const ga = a ? groupingsOf(a.name) : [];
  const gb = b ? groupingsOf(b.name) : [];
  const shared = a && b ? ga.filter((g) => g.members.includes(b.name)) : [];
  const aOnly = a && b ? ga.filter((g) => !g.members.includes(b.name)) : [];
  const bOnly = a && b ? gb.filter((g) => !g.members.includes(a.name)) : [];
  const infoA = a ? COUNTRY_INFO[a.name] : undefined;
  const infoB = b ? COUNTRY_INFO[b.name] : undefined;

  return (
    <AnimatePresence>
      {open && a && b && (
        <motion.aside
          key={`${a.name}~${b.name}`}
          initial={{ x: "100%", opacity: 0.4 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0.2 }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
          className="pointer-events-auto absolute right-0 top-0 z-30 flex h-full w-[88vw] max-w-[380px] flex-col border-l border-[#1c3a55]/60 bg-[#040b14]/92 backdrop-blur-md"
        >
          {/* header */}
          <div className="relative border-b border-[#173049]/70 px-5 pb-4 pt-5">
            <button onClick={onClose} aria-label="Close"
              className="absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-md border border-[#234a6b]/60 text-[#7fb8e0] transition-colors hover:border-[#3aa0ff]/70 hover:text-white">
              <X size={14} />
            </button>
            <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.28em] text-[#5b86a8]">
              <GitCompareArrows size={11} className="text-[#5fd0ff]" /> Bilateral comparison
            </p>
            <h2 className="mt-1.5 flex items-center gap-2 font-display text-[19px] font-semibold leading-tight text-white">
              {a.name} <ArrowLeftRight size={15} className="shrink-0 text-[#5fb0e8]" /> {b.name}
            </h2>
            <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-[10px] text-[#9fc4e2]">
              {infoA && <span className="flex items-center gap-1"><MapPin size={10} className="text-[#5fb0e8]" /> {infoA.capital}</span>}
              {infoB && <span className="flex items-center gap-1"><MapPin size={10} className="text-[#5fb0e8]" /> {infoB.capital}</span>}
            </div>
          </div>

          {/* body */}
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="rounded-xl border border-[#173049]/70 bg-[#06121f]/50 p-3.5">
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7aa2ff]">
                <Share2 size={12} /> Shared groupings · {shared.length}
              </p>
              {shared.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">{shared.map((g) => <Chip key={g.key} g={g} on />)}</div>
              ) : (
                <p className="text-[11px] text-[#5b86a8]">No common bloc among the tracked groupings.</p>
              )}
              <p className="mt-2 text-[10px] text-[#4d6c88]">Shared blocs are drawn as arcs between the two on the globe.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#5b86a8]">Only {a.name}</p>
                <div className="flex flex-wrap gap-1.5">{aOnly.length ? aOnly.map((g) => <Chip key={g.key} g={g} />) : <span className="text-[10.5px] text-[#4d6c88]">—</span>}</div>
              </div>
              <div>
                <p className="mb-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#5b86a8]">Only {b.name}</p>
                <div className="flex flex-wrap gap-1.5">{bOnly.length ? bOnly.map((g) => <Chip key={g.key} g={g} />) : <span className="text-[10.5px] text-[#4d6c88]">—</span>}</div>
              </div>
            </div>

            <button onClick={onBack}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#234a6b]/60 bg-[#08182a]/60 px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-[#9fc4e2] transition-colors hover:border-[#3aa0ff]/70 hover:text-white">
              ← Back to {a.name}
            </button>
          </div>

          <div className="border-t border-[#173049]/70 px-5 py-2.5 text-center font-mono text-[8.5px] uppercase tracking-[0.24em] text-[#3f6b8f]">
            shift-click a third country to swap · × to close
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function Chip({ g, on }: { g: Grouping; on?: boolean }) {
  return (
    <span className="rounded-full border px-2.5 py-1 text-[10.5px] font-medium tracking-wide" title={g.name}
      style={{ borderColor: g.color + (on ? "" : "66"), background: on ? g.color + "26" : "transparent", color: on ? "#fff" : g.color, boxShadow: on ? `0 0 12px ${g.color}55` : "none" }}>
      {g.name}
    </span>
  );
}
