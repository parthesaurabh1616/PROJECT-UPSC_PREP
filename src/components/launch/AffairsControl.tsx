"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Radio, Loader2 } from "lucide-react";

/* Toggle for the "this week on the map" current-affairs overlay. */
export default function AffairsControl({ on, loading, onToggle, meta }: {
  on: boolean; loading: boolean; onToggle: () => void;
  meta: { total: number; located: number; countries: number };
}) {
  return (
    <div className="pointer-events-auto absolute left-5 top-[124px] z-30 font-mono md:left-8 md:top-[132px]">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] backdrop-blur transition-colors"
        style={{
          borderColor: on ? "#ff9a3c99" : "#234a6b99",
          background: on ? "#241300cc" : "#08182acc",
          color: on ? "#ffce9a" : "#7fb8e0",
        }}
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Radio size={12} />} This Week on the Map
      </button>
      <AnimatePresence>
        {on && !loading && (
          <motion.p
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-1.5 max-w-[220px] text-[9px] leading-relaxed tracking-[0.08em] text-[#8a6a4a]"
          >
            {meta.located} of {meta.total} affairs geo-located · {meta.countries} countries pinned. Click a pin for the dossier.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
