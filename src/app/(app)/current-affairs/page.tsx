"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Bookmark, RefreshCw, Loader2, ChevronRight, X, Landmark, ExternalLink, Radio } from "lucide-react";
import { Card, Chip, Divider, SectionHeading } from "@/components/ui";
import { GlobeCanvas, type Article } from "@/components/GlobeCanvas";
import { cn } from "@/lib/utils";

const REFRESH_MS = 5 * 60 * 1000; // 5 minutes

type CatKey = "all" | "pib" | "editorial" | "news" | "economy" | "international" | "maharashtra";

const TABS: { key: CatKey; label: string }[] = [
  { key: "all",           label: "All" },
  { key: "pib",           label: "PIB · Govt" },
  { key: "editorial",     label: "Editorials" },
  { key: "news",          label: "National" },
  { key: "economy",       label: "Economy" },
  { key: "international", label: "World" },
  { key: "maharashtra",  label: "Maharashtra" },
];

export default function CurrentAffairsPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading]   = useState(true);
  const [syncing, setSyncing]   = useState(false);
  const [syncMsg, setSyncMsg]   = useState("");
  const [selected, setSelected] = useState<Article | null>(null);
  const [saved, setSaved]       = useState<Set<string>>(new Set());
  const [read, setRead]         = useState<Set<string>>(new Set());
  const [tab, setTab]           = useState<CatKey>("all");
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const initialised = useRef(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/affairs", { cache: "no-store" });
      const d: unknown = await r.json();
      const list = Array.isArray(d) ? (d as Article[]) : [];
      setArticles(list);
      setLoading(false);
      return list;
    } catch { setLoading(false); return [] as Article[]; }
  }, []);

  const sync = useCallback(async (silent = false) => {
    if (syncing) return;
    setSyncing(true);
    if (!silent) setSyncMsg("");
    try {
      const res = await fetch("/api/affairs/ingest", { method: "POST" });
      const d = await res.json() as { error?: string; ingested?: number; remaining?: number };
      setSyncMsg(d.error ? d.error : `+${d.ingested ?? 0} new${d.remaining ? ` · ${d.remaining} queued` : ""}`);
      setLastSync(new Date());
    } catch {
      setSyncMsg("Sync failed");
    }
    setSyncing(false);
    await load();
    if (!silent) setTimeout(() => setSyncMsg(""), 5000);
  }, [syncing, load]);

  // Bootstrap: load once, then auto-sync if empty or stale (>3h old).
  // This means opening the page after days away refreshes news automatically.
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    (async () => {
      const list = await load();
      const newest = list[0]?.publishedAt ? new Date(list[0].publishedAt).getTime() : 0;
      const stale = list.length === 0 || (Date.now() - newest) > 3 * 60 * 60 * 1000;
      if (stale) void sync(true);
    })();
    // Live auto-refresh every 5 minutes (silent background sync + reload)
    const id = setInterval(() => { void sync(true); }, REFRESH_MS);
    return () => clearInterval(id);
  }, [load, sync]);

  // Load existing read-receipts once.
  useEffect(() => {
    fetch("/api/ca/read").then((r) => r.json())
      .then((d: { read?: string[] }) => { if (Array.isArray(d.read)) setRead(new Set(d.read)); })
      .catch(() => {});
  }, []);

  const toggleSave = (id: string) =>
    setSaved((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  // Opening an article = reading it → real receipt + CA_READ activity.
  const markRead = useCallback((id: string) => {
    setRead((s) => {
      if (s.has(id)) return s;
      const n = new Set(s); n.add(id);
      fetch("/api/ca/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ affairId: id }) }).catch(() => {});
      return n;
    });
  }, []);

  const open = (a: Article) => {
    const opening = selected?.id !== a.id;
    setSelected(opening ? a : null);
    if (opening) markRead(a.id);
  };
  const unread = articles.filter((a) => !read.has(a.id)).length;

  const visible = tab === "all" ? articles : articles.filter((a) => (a.category ?? "news") === tab);
  const high    = articles.filter((a) => a.priority === "high").length;
  const pibCount = articles.filter((a) => a.category === "pib").length;
  const gsTags  = Array.from(new Set(visible.flatMap((a) => a.gsMapping)));

  const counts: Record<CatKey, number> = {
    all: articles.length,
    pib: pibCount,
    editorial: articles.filter((a) => a.category === "editorial").length,
    news: articles.filter((a) => a.category === "news").length,
    economy: articles.filter((a) => a.category === "economy").length,
    international: articles.filter((a) => a.category === "international").length,
    maharashtra: articles.filter((a) => a.category === "maharashtra").length,
  };

  return (
    <div className="mx-auto max-w-[1280px] space-y-5">

      {/* Header */}
      <div className="flex animate-fade-up flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[24px] font-semibold tracking-tight text-ink">
            Current Affairs Intelligence
          </h2>
          <p className="mt-0.5 flex items-center gap-2 text-[12.5px] text-ink-3">
            <span className="flex items-center gap-1 text-success">
              <Radio size={11} className="animate-pulse" /> LIVE
            </span>
            · {articles.length} articles · {unread} unread · {high} high-priority
            {lastSync && <span>· synced {lastSync.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {syncMsg && <span className="text-[11.5px] text-ink-2">{syncMsg}</span>}
          <button onClick={() => { void sync(); }} disabled={syncing}
            className="flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-[12px] text-accent transition-colors hover:bg-accent/20 disabled:opacity-50">
            {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            {syncing ? "Syncing…" : "Sync now"}
          </button>
        </div>
      </div>

      {/* Category tabs — Maharashtra tab only shows when MPSC news is present */}
      <div className="flex animate-fade-up flex-wrap gap-1.5" style={{ animationDelay: "40ms" }}>
        {TABS.filter((t) => t.key !== "maharashtra" || counts.maharashtra > 0).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] transition-colors",
              tab === t.key
                ? "bg-accent text-white"
                : "border border-line text-ink-2 hover:border-accent/40 hover:text-ink",
            )}>
            {t.key === "pib" && <Landmark size={12} />}
            {t.label}
            <span className={cn("rounded-full px-1.5 text-[10px]", tab === t.key ? "bg-white/20" : "bg-surface-2 text-ink-3")}>
              {counts[t.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Globe + Articles */}
      <div className="grid animate-fade-up grid-cols-[1fr_440px] gap-5" style={{ animationDelay: "60ms" }}>

        {/* Article list */}
        <div className="space-y-4 overflow-y-auto pr-1" style={{ maxHeight: "calc(100vh - 240px)" }}>
          {loading && (
            <div className="flex items-center gap-2 py-8 text-ink-3">
              <Loader2 size={16} className="animate-spin" /> Loading articles…
            </div>
          )}
          {!loading && visible.length === 0 && (
            <Card className="py-10 text-center">
              <p className="text-[14px] font-semibold text-ink">
                {articles.length === 0 ? "No articles yet" : "Nothing in this category yet"}
              </p>
              <p className="mt-1 text-[12.5px] text-ink-3">
                Click &ldquo;Sync now&rdquo; to fetch and AI-process the latest news.
              </p>
              <p className="mt-1 text-[11px] text-ink-3">Auto-refreshes every 5 minutes</p>
            </Card>
          )}
          {visible.map((a) => (
            <ArticleCard key={a.id} article={a}
              active={selected?.id === a.id}
              saved={saved.has(a.id)}
              unread={!read.has(a.id)}
              onSave={() => toggleSave(a.id)}
              onClick={() => open(a)}
            />
          ))}
        </div>

        {/* Globe panel */}
        <div className="space-y-4">
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-2">
                  Global Intelligence
                </p>
                <p className="mt-0.5 text-[10.5px] text-ink-3">
                  {articles.length} signals mapped · drag to rotate
                </p>
              </div>
              <div className="flex items-center gap-3 text-[10.5px] text-ink-3">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-danger" />High</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent" />Normal</span>
              </div>
            </div>

            <div className="flex items-center justify-center bg-bg py-1">
              {articles.length > 0 ? (
                <GlobeCanvas articles={articles} onSelect={setSelected} />
              ) : (
                <div className="flex h-[420px] w-[420px] items-center justify-center">
                  <p className="text-[12.5px] text-ink-3">Sync news to populate the globe</p>
                </div>
              )}
            </div>

            {selected && (
              <div className="animate-fade-up border-t border-line bg-surface-2 px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-ink">
                    {selected.headline}
                  </p>
                  <button onClick={() => setSelected(null)} className="shrink-0 text-ink-3 hover:text-ink">
                    <X size={14} />
                  </button>
                </div>
                {selected.whyInNews && (
                  <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-relaxed text-ink-2">
                    {selected.whyInNews}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-1">
                  {selected.priority === "high" && <Chip tone="danger">High priority</Chip>}
                  {selected.gsMapping.map((g) => <Chip key={g} tone="accent">{g}</Chip>)}
                </div>
                <button onClick={() => document.getElementById(`a-${selected.id}`)?.scrollIntoView({ behavior: "smooth" })}
                  className="mt-2 flex items-center gap-1 text-[11.5px] text-accent hover:underline">
                  Full analysis <ChevronRight size={11} />
                </button>
              </div>
            )}
          </Card>

          <Card>
            <SectionHeading title="GS Coverage" sub="Topics in this view" icon={<span className="text-accent">◈</span>} />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {gsTags.map((t) => <Chip key={t} tone="accent">{t}</Chip>)}
              {Array.from(new Set(visible.flatMap((a) => a.tags))).slice(0, 12).map((t, i) => (
                <span key={i} className="rounded-full bg-surface-2 px-2 py-0.5 text-[10.5px] text-ink-2">{t}</span>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Full detail panel */}
      {selected && (
        <div id={`a-${selected.id}`} className="animate-fade-up rounded-2xl border border-accent/30 bg-surface p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-[20px] font-semibold leading-snug tracking-tight text-ink">
                {selected.headline}
              </h3>
              <p className="mt-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.07em] text-ink-3">
                {selected.source} · {selected.publishedAt ? new Date(selected.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}
                {selected.sourceUrl && (
                  <a href={selected.sourceUrl} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-accent hover:underline">
                    source <ExternalLink size={10} />
                  </a>
                )}
              </p>
            </div>
            <button onClick={() => setSelected(null)} className="text-ink-3 hover:text-ink"><X size={18} /></button>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-5">
            <div className="space-y-4">
              {selected.whyInNews  && <Field label="Why in news"  text={selected.whyInNews} />}
              {selected.background && <Field label="Background"   text={selected.background} />}
              {selected.keyFacts   && <Field label="Key facts"    text={selected.keyFacts} />}
            </div>
            <div className="space-y-4">
              {selected.prelims   && <Field label="Prelims angle"   text={selected.prelims}   accent="gold" />}
              {selected.mains     && <Field label="Mains angle"     text={selected.mains}     accent="accent-2" />}
              {selected.interview && <Field label="Interview angle" text={selected.interview} accent="analyt" />}
            </div>
          </div>
          <Divider className="my-4" />
          <div className="flex flex-wrap gap-1.5">
            {selected.priority === "high" && <Chip tone="danger">High priority</Chip>}
            {selected.gsMapping.map((g) => <Chip key={g} tone="accent">{g}</Chip>)}
            {selected.tags.map((t, i) => <span key={i} className="rounded-full bg-surface-2 px-2 py-0.5 text-[10.5px] text-ink-2">{t}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}

const CAT_BADGE: Record<string, { label: string; cls: string }> = {
  pib:           { label: "PIB",         cls: "bg-gold/15 text-gold border-gold/30" },
  editorial:     { label: "Editorial",   cls: "bg-accent-2/15 text-accent-2 border-accent-2/30" },
  economy:       { label: "Economy",     cls: "bg-success/15 text-success border-success/30" },
  international: { label: "World",        cls: "bg-analyt/15 text-analyt border-analyt/30" },
  maharashtra:   { label: "Maharashtra", cls: "bg-gold/15 text-gold border-gold/30" },
  news:          { label: "News",        cls: "bg-surface-2 text-ink-3 border-line" },
};

function ArticleCard({ article: a, active, saved, unread, onSave, onClick }: {
  article: Article; active: boolean; saved: boolean; unread: boolean;
  onSave: () => void; onClick: () => void;
}) {
  const badge = CAT_BADGE[a.category ?? "news"] ?? CAT_BADGE.news;
  return (
    <Card id={`a-${a.id}`} hover onClick={onClick}
      className={cn("cursor-pointer p-5 transition-all", active && "border-accent/50 bg-surface-2", !unread && "opacity-70")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-1.5">
            {unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" title="Unread" />}
            <span className={cn("rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest", badge.cls)}>
              {badge.label}
            </span>
            <span className="truncate text-[10.5px] uppercase tracking-[0.07em] text-ink-3">
              {a.source} · {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString("en-IN") : ""}
            </span>
          </div>
          <h3 className="font-display text-[16px] font-semibold leading-snug tracking-tight text-ink line-clamp-2">
            {a.headline}
          </h3>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onSave(); }}
          className={cn("shrink-0 transition-colors", saved ? "text-accent" : "text-ink-3 hover:text-accent")}>
          <Bookmark size={16} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      {a.whyInNews && (
        <p className="mt-2.5 line-clamp-2 text-[12.5px] leading-relaxed text-ink-2">{a.whyInNews}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {a.priority === "high" && <Chip tone="danger">High priority</Chip>}
        {a.gsMapping.map((g) => <Chip key={g} tone="accent">{g}</Chip>)}
        {a.tags.slice(0, 3).map((t, i) => (
          <span key={i} className="rounded-full bg-surface-2 px-2 py-0.5 text-[10.5px] text-ink-2">{t}</span>
        ))}
        <span className="ml-auto flex items-center gap-1 text-[11px] text-ink-3">
          Analysis <ChevronRight size={11} />
        </span>
      </div>
    </Card>
  );
}

function Field({ label, text, accent = "accent" }: { label: string; text: string; accent?: string }) {
  return (
    <div>
      <p className={cn("mb-1 text-[10px] font-semibold uppercase tracking-[0.13em]",
        accent === "gold" ? "text-gold" : accent === "accent-2" ? "text-accent-2" :
        accent === "analyt" ? "text-analyt" : "text-accent")}>{label}</p>
      <p className="text-[13px] leading-relaxed text-ink-2">{text}</p>
    </div>
  );
}
