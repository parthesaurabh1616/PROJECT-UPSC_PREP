"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Radio, Flame, Loader2 } from "lucide-react";

type Mode = "none" | "affairs" | "heat";
type Stage = "all" | "prelims" | "mains";

/* Two mutually-exclusive map overlays: this week's current affairs, or the
   PYQ heat-map (splittable by exam stage). Both real; captions state exactly
   what's shown. */
export default function MapOverlays({ mode, loading, onMode, affairs, heat, heatStage, onHeatStage }: {
  mode: Mode; loading: boolean; onMode: (m: Mode) => void;
  affairs: { total: number; located: number; countries: number };
  heat: { total: number; countries: number; top: string | null };
  heatStage: Stage; onHeatStage: (s: Stage) => void;
}) {
  const stageWord = heatStage === "all" ? "PYQs" : `${heatStage} questions`;
  const heatCaption = heat.total === 0
    ? `No ${heatStage === "all" ? "" : heatStage + " "}questions decoded yet — decode those papers to populate this.`
    : `${heat.countries} countries across ${heat.total} ${stageWord} · bigger, hotter = asked more. ${heat.top ? `Top: ${heat.top}.` : ""} Click for the questions.`;
  const caption =
    mode === "affairs" ? `${affairs.located} of ${affairs.total} affairs geo-located · ${affairs.countries} countries. Click a pin for the dossier.`
    : mode === "heat" ? heatCaption
    : "";

  return (
    <div className="pointer-events-auto absolute left-5 top-[124px] z-30 flex flex-col gap-1.5 font-mono md:left-8 md:top-[132px]">
      <Pill icon={<Radio size={12} />} label="This Week on the Map" active={mode === "affairs"} loading={loading && mode === "affairs"}
        color="#ff9a3c" onClick={() => onMode(mode === "affairs" ? "none" : "affairs")} />
      <Pill icon={<Flame size={12} />} label="PYQ Heat-Map" active={mode === "heat"} loading={loading && mode === "heat"}
        color="#ff5a5a" onClick={() => onMode(mode === "heat" ? "none" : "heat")} />

      {mode === "heat" && (
        <div className="flex gap-1">
          {(["all", "prelims", "mains"] as Stage[]).map((s) => (
            <button key={s} onClick={() => onHeatStage(s)}
              className="flex-1 rounded-md border px-2 py-1 text-[9px] uppercase tracking-[0.16em] transition-colors"
              style={{
                borderColor: heatStage === s ? "#ff5a5a99" : "#234a6b66",
                background: heatStage === s ? "#ff5a5a1f" : "#08182a99",
                color: heatStage === s ? "#fff" : "#7fb8e0",
              }}>
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
      )}
      <AnimatePresence>
        {mode !== "none" && !loading && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="max-w-[230px] text-[9px] leading-relaxed tracking-[0.06em] text-[#7a6a58]">
            {caption}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function Pill({ icon, label, active, loading, color, onClick }: {
  icon: React.ReactNode; label: string; active: boolean; loading: boolean; color: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] backdrop-blur transition-colors"
      style={{
        borderColor: active ? color + "99" : "#234a6b99",
        background: active ? color + "1f" : "#08182acc",
        color: active ? "#fff" : "#7fb8e0",
      }}>
      {loading ? <Loader2 size={12} className="animate-spin" /> : icon} {label}
    </button>
  );
}
