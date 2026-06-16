"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Radio, Loader2, RefreshCw, ExternalLink, X, Globe2, Flag, Landmark, Sparkles, Target } from "lucide-react";
import { Card, Chip } from "@/components/ui";
import { GlobeCanvas, type Article } from "@/components/GlobeCanvas";
import { cn } from "@/lib/utils";

const REFRESH_MS = 5 * 60 * 1000;

type LayerKey = "all" | "global" | "india" | "maharashtra";

interface IntelEvent extends Article {
  importanceScore: number;
  tier: "critical" | "high" | "normal" | "low";
  layer: "global" | "india" | "maharashtra";
}

interface Briefing {
  summary: string;
  items: { headline: string; why: string; gs: string[] }[];
  focus: string[];
  examCode?: string;
}

const LAYERS: { key: LayerKey; label: string; icon: React.ElementType }[] = [
  { key: "all",          label: "All Layers",  icon: Radio },
  { key: "global",       label: "Global",      icon: Globe2 },
  { key: "india",        label: "India",       icon: Flag },
  { key: "maharashtra", label: "Maharashtra", icon: Landmark },
];

const TIER_CLS: Record<string, string> = {
  critical: "bg-danger/15 text-danger border-danger/30",
  high:     "bg-gold/15 text-gold border-gold/30",
  normal:   "bg-accent/15 text-accent border-accent/30",
  low:      "bg-surface-2 text-ink-3 border-line",
};

export default function IntelligencePage() {
  const [events, setEvents]   = useState<IntelEvent[]>([]);
  const [counts, setCounts]   = useState({ all: 0, global: 0, india: 0, maharashtra: 0 });
  const [layer, setLayer]     = useState<LayerKey>("all");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selected, setSelected] = useState<IntelEvent | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [briefLoading, setBriefLoading] = useState(true);
  const init = useRef(false);

  const loadBriefing = useCallback(async (force = false) => {
    setBriefLoading(true);
    try {
      const r = await fetch(`/api/intel/briefing${force ? "?force=1" : ""}`, { cache: "no-store" });
      setBriefing(await r.json() as Briefing);
    } catch { /* */ }
    setBriefLoading(false);
  }, []);

  const load = useCallback(async (lyr: LayerKey) => {
    try {
      const r = await fetch(`/api/intel/events?layer=${lyr}`, { cache: "no-store" });
      const d = await r.json() as { events: IntelEvent[]; counts: typeof counts };
      setEvents(Array.isArray(d.events) ? d.events : []);
      if (d.counts) setCounts(d.counts);
    } catch { /* keep */ }
    setLoading(false);
  }, []);

  const sync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try { await fetch("/api/affairs/ingest", { method: "POST" }); setLastSync(new Date()); }
    catch { /* */ }
    setSyncing(false);
    await load(layer);
  }, [syncing, load, layer]);

  useEffect(() => { void load(layer); }, [layer, load]);
  useEffect(() => {
    if (init.current) return;
    init.current = true;
    void loadBriefing();
    const id = setInterval(() => { void load("all"); }, REFRESH_MS);
    return () => clearInterval(id);
  }, [load, loadBriefing]);

  const critical = events.filter((e) => e.tier === "critical").length;
  const avgScore = events.length ? Math.round(events.reduce((a, e) => a + e.importanceScore, 0) / events.length) : 0;

  return (
    <div className="mx-auto max-w-[1280px] space-y-5">

      {/* Header */}
      <div className="flex animate-fade-up flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-[24px] font-semibold tracking-tight text-ink">
            <Radio size={18} className="text-danger animate-pulse" /> Live Actions
          </h2>
          <p className="mt-0.5 text-[12.5px] text-ink-3">
            Intelligence command center · {events.length} events · {critical} critical · avg score {avgScore}
            {lastSync && <span> · synced {lastSync.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>}
          </p>
        </div>
        <button onClick={() => { void sync(); }} disabled={syncing}
          className="flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-[12px] text-accent transition-colors hover:bg-accent/20 disabled:opacity-50">
          {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          {syncing ? "Syncing…" : "Sync now"}
        </button>
      </div>

      {/* Layer toggles */}
      <div className="flex animate-fade-up flex-wrap gap-1.5" style={{ animationDelay: "40ms" }}>
        {LAYERS.filter((l) => l.key !== "maharashtra" || counts.maharashtra > 0).map((l) => {
          const Icon = l.icon;
          const n = counts[l.key];
          return (
            <button key={l.key} onClick={() => setLayer(l.key)}
              className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] transition-colors",
                layer === l.key ? "bg-accent text-white" : "border border-line text-ink-2 hover:border-accent/40 hover:text-ink")}>
              <Icon size={12} /> {l.label}
              <span className={cn("rounded-full px-1.5 text-[10px]", layer === l.key ? "bg-white/20" : "bg-surface-2 text-ink-3")}>{n}</span>
            </button>
          );
        })}
      </div>

      {/* AI Daily Briefing */}
      <Card className="animate-fade-up p-5" style={{ animationDelay: "50ms" }}>
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-2">
            <Sparkles size={14} className="text-accent-2" /> Daily Briefing
            <span className="font-mono text-[9px] tracking-widest text-ink-3">AI · {briefing?.examCode ?? ""}</span>
          </p>
          <button onClick={() => { void loadBriefing(true); }} disabled={briefLoading}
            className="flex items-center gap-1 text-[11px] text-ink-3 hover:text-accent disabled:opacity-50">
            {briefLoading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />} regenerate
          </button>
        </div>

        {briefLoading && !briefing && (
          <p className="mt-3 flex items-center gap-2 text-[12.5px] text-ink-3"><Loader2 size={13} className="animate-spin" /> Generating today&apos;s briefing…</p>
        )}

        {briefing?.summary && (
          <p className="mt-3 text-[13.5px] leading-relaxed text-ink-2">{briefing.summary}</p>
        )}

        {briefing && briefing.items.length > 0 && (
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {briefing.items.slice(0, 6).map((it, i) => (
              <div key={i} className="flex gap-2.5 rounded-lg border border-line-subtle bg-surface-2/40 p-3">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-accent/15 font-mono text-[10px] font-bold text-accent">{i + 1}</span>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-medium leading-snug text-ink">{it.headline}</p>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-3">{it.why}</p>
                  <div className="mt-1 flex flex-wrap gap-1">{it.gs.map((g) => <Chip key={g} tone="accent">{g}</Chip>)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {briefing && briefing.focus.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-line-subtle pt-3">
            <span className="flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-widest text-ink-3"><Target size={11} /> Revise today:</span>
            {briefing.focus.map((f, i) => (
              <span key={i} className="rounded-full bg-accent-2/12 px-2 py-0.5 text-[11px] text-accent-2">{f}</span>
            ))}
          </div>
        )}
      </Card>

      {/* Globe + Ranked Intel Feed */}
      <div className="grid animate-fade-up grid-cols-[460px_1fr] gap-5" style={{ animationDelay: "60ms" }}>

        {/* Globe */}
        <div className="space-y-3">
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-2">Intelligence Globe</p>
                <p className="mt-0.5 text-[10.5px] text-ink-3">size + colour = importance · drag to rotate</p>
              </div>
              <div className="flex items-center gap-2.5 text-[10px] text-ink-3">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-danger" />Critical</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gold" />High</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-accent" />Normal</span>
              </div>
            </div>
            <div className="flex items-center justify-center bg-bg py-1">
              {events.length > 0 ? (
                <GlobeCanvas articles={events} onSelect={(a) => setSelected(a as IntelEvent)} />
              ) : (
                <div className="flex h-[420px] w-[420px] items-center justify-center">
                  <p className="text-[12.5px] text-ink-3">{loading ? "Loading…" : "Sync to populate the globe"}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Selected event mini-detail */}
          {selected && (
            <Card className="animate-fade-up p-4">
              <div className="flex items-start justify-between gap-2">
                <span className={cn("rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest", TIER_CLS[selected.tier])}>
                  {selected.tier} · {selected.importanceScore}
                </span>
                <button onClick={() => setSelected(null)} className="text-ink-3 hover:text-ink"><X size={14} /></button>
              </div>
              <p className="mt-2 text-[13.5px] font-semibold leading-snug text-ink">{selected.headline}</p>
              {selected.whyInNews && <p className="mt-1.5 text-[12px] leading-relaxed text-ink-2">{selected.whyInNews}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {selected.gsMapping.map((g) => <Chip key={g} tone="accent">{g}</Chip>)}
                {selected.sourceUrl && (
                  <a href={selected.sourceUrl} target="_blank" rel="noreferrer"
                    className="ml-auto inline-flex items-center gap-1 text-[11px] text-accent hover:underline">
                    {selected.source} <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Ranked Intel Feed */}
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-2">Intel Feed · ranked by importance</p>
            <span className="font-mono text-[10px] text-ink-3">{events.length} events</span>
          </div>
          <div className="max-h-[560px] overflow-y-auto divide-y divide-line-subtle">
            {loading && <div className="flex items-center gap-2 px-4 py-8 text-ink-3"><Loader2 size={15} className="animate-spin" /> Loading…</div>}
            {!loading && events.length === 0 && (
              <div className="px-4 py-10 text-center text-[12.5px] text-ink-3">No events in this layer. Click Sync.</div>
            )}
            {events.map((e, i) => (
              <button key={e.id} onClick={() => setSelected(e)}
                className={cn("flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2",
                  selected?.id === e.id && "bg-surface-2")}>
                <span className="mt-0.5 w-5 shrink-0 text-right font-mono text-[11px] text-ink-3">{i + 1}</span>
                <ScoreBar score={e.importanceScore} tier={e.tier} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-ink">{e.headline}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className={cn("rounded-full border px-1.5 py-px text-[8.5px] font-semibold uppercase tracking-widest", TIER_CLS[e.tier])}>{e.tier}</span>
                    {e.gsMapping.slice(0, 2).map((g) => <Chip key={g} tone="accent">{g}</Chip>)}
                    <span className="truncate text-[10.5px] text-ink-3">{e.source}</span>
                    <span className="ml-auto font-mono text-[11px] font-semibold text-ink-2">{e.importanceScore}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function ScoreBar({ score, tier }: { score: number; tier: string }) {
  const col = tier === "critical" ? "bg-danger" : tier === "high" ? "bg-gold" : tier === "low" ? "bg-ink-3" : "bg-accent";
  return (
    <div className="mt-1 flex h-8 w-1.5 shrink-0 items-end overflow-hidden rounded-full bg-surface-2">
      <div className={cn("w-full rounded-full", col)} style={{ height: `${Math.max(8, score)}%` }} />
    </div>
  );
}
