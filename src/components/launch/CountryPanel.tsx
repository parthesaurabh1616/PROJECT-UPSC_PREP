"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { X, MapPin, Globe2, Anchor, MessageSquare, Network, Share2 } from "lucide-react";
import { RelatedPanel } from "@/components/RelatedPanel";
import { COUNTRY_INFO, NODES, groupingsOf } from "@/lib/geo";
import type { CountrySelect } from "./Layers";

/* Slide-in dossier for a clicked country / chokepoint. Everything shown
   is real: capital + continent are facts; the body is genuine platform
   content (PYQs, current affairs, NCERT, notes) via semantic search.
   No fabricated population / GDP / military figures. */
export default function CountryPanel({ selected, onClose, activeGroup, onToggleGroup }: {
  selected: CountrySelect | null; onClose: () => void;
  activeGroup: string | null; onToggleGroup: (key: string) => void;
}) {
  const info = selected ? COUNTRY_INFO[selected.name] : undefined;
  const choke = selected?.kind === "choke" ? NODES.find((n) => n.name === selected.name) : undefined;
  const groups = selected ? groupingsOf(selected.name) : [];

  return (
    <AnimatePresence>
      {selected && (
        <motion.aside
          key={selected.name}
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
              {choke ? <Anchor size={11} className="text-[#ffb454]" /> : <Globe2 size={11} className="text-[#5fd0ff]" />}
              {choke ? "Maritime chokepoint" : "Nation dossier"}
            </p>
            <h2 className="mt-1.5 font-display text-[24px] font-semibold leading-tight text-white">{selected.name}</h2>
            {info && (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10.5px] text-[#9fc4e2]">
                <span className="flex items-center gap-1.5"><MapPin size={11} className="text-[#5fb0e8]" /> {info.capital}</span>
                <span className="flex items-center gap-1.5"><Globe2 size={11} className="text-[#5fb0e8]" /> {info.continent}</span>
              </div>
            )}
            {choke && <p className="mt-2 text-[11.5px] leading-relaxed text-[#9fc4e2]">{choke.note}</p>}
          </div>

          {/* body — real linked platform content */}
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {/* Groupings & alliances — factual; click to light up the network */}
            {groups.length > 0 && (
              <div className="rounded-xl border border-[#173049]/70 bg-[#06121f]/50 p-3.5">
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7aa2ff]">
                  <Share2 size={12} /> Groupings &amp; alliances
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {groups.map((g) => {
                    const on = activeGroup === g.key;
                    return (
                      <button key={g.key} onClick={() => onToggleGroup(g.key)} title={g.name}
                        className="rounded-full border px-2.5 py-1 text-[10.5px] font-medium tracking-wide transition-all"
                        style={{
                          borderColor: g.color + (on ? "" : "66"),
                          background: on ? g.color + "26" : "transparent",
                          color: on ? "#fff" : g.color,
                          boxShadow: on ? `0 0 14px ${g.color}55` : "none",
                        }}>
                        {g.name}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[10px] text-[#4d6c88]">
                  {activeGroup ? "Showing this network on the globe — tap again to dim." : "Tap a grouping to light up its members on the globe."}
                </p>
              </div>
            )}

            <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-[#5b86a8]">
              <Network size={12} className="mt-0.5 shrink-0 text-[#3aa0ff]" />
              Everything below is pulled live from your library — past questions, current affairs, NCERTs and notes that mention {selected.name}. Nothing is invented.
            </p>

            <RelatedPanel query={selected.name} title={`${selected.name} across your platform`} />

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link href={`/mentor`} onClick={onClose}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-[#3aa0ff]/40 bg-[#0a1c2e]/60 px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-[#bcd9f2] transition-colors hover:border-[#5fd0ff] hover:text-white">
                <MessageSquare size={12} /> Ask AI mentor
              </Link>
              <Link href={`/current-affairs`} onClick={onClose}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-[#234a6b]/60 bg-[#08182a]/60 px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-[#9fc4e2] transition-colors hover:border-[#3aa0ff]/70 hover:text-white">
                <Globe2 size={12} /> Affairs
              </Link>
            </div>
          </div>

          <div className="border-t border-[#173049]/70 px-5 py-2.5 text-center font-mono text-[8.5px] uppercase tracking-[0.24em] text-[#3f6b8f]">
            shift-click another country to compare · × to close
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
