"use client";

import { useState, useEffect, useCallback } from "react";
import { Bookmark, RefreshCw, Loader2, ChevronRight, X } from "lucide-react";
import { Card, Chip, Divider, SectionHeading } from "@/components/ui";
import { GlobeCanvas, type Article } from "@/components/GlobeCanvas";
import { cn } from "@/lib/utils";

export default function CurrentAffairsPage() {
  const [articles, setArticles]   = useState<Article[]>([]);
  const [loading, setLoading]     = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [ingestMsg, setIngestMsg] = useState("");
  const [selected, setSelected]   = useState<Article | null>(null);
  const [saved, setSaved]         = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/affairs")
      .then((r) => r.json())
      .then((d: unknown) => { setArticles(Array.isArray(d) ? d as Article[] : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const ingest = async () => {
    setIngesting(true); setIngestMsg("");
    const res  = await fetch("/api/affairs/ingest", { method: "POST" });
    const d    = await res.json() as { error?: string; ingested?: number };
    setIngestMsg(d.error ? d.error : `Ingested ${d.ingested ?? 0} new articles`);
    setIngesting(false);
    load();
  };

  const toggleSave = (id: string) =>
    setSaved((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const high   = articles.filter((a) => a.priority === "high").length;
  const gsTags = Array.from(new Set(articles.flatMap((a) => a.gsMapping)));

  return (
    <div className="mx-auto max-w-[1280px] space-y-5">

      {/* Header */}
      <div className="flex animate-fade-up flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[24px] font-semibold tracking-tight text-ink">
            Current Affairs Intelligence
          </h2>
          <p className="mt-0.5 text-[12.5px] text-ink-3">
            {articles.length} articles · {high} high-priority · AI-processed &amp; UPSC-mapped
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ingestMsg && <span className="text-[11.5px] text-ink-2">{ingestMsg}</span>}
          <button onClick={() => { void ingest(); }} disabled={ingesting}
            className="flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-[12px] text-accent transition-colors hover:bg-accent/20 disabled:opacity-50">
            {ingesting ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            {ingesting ? "Syncing..." : "Sync news now"}
          </button>
        </div>
      </div>

      {/* Globe + Articles */}
      <div className="grid animate-fade-up grid-cols-[1fr_440px] gap-5" style={{ animationDelay: "60ms" }}>

        {/* Article list */}
        <div className="space-y-4 overflow-y-auto pr-1" style={{ maxHeight: "calc(100vh - 200px)" }}>
          {loading && (
            <div className="flex items-center gap-2 py-8 text-ink-3">
              <Loader2 size={16} className="animate-spin" /> Loading articles...
            </div>
          )}
          {!loading && articles.length === 0 && (
            <Card className="py-10 text-center">
              <p className="text-[14px] font-semibold text-ink">No articles yet</p>
              <p className="mt-1 text-[12.5px] text-ink-3">
                Click &ldquo;Sync news now&rdquo; to fetch and AI-process today&apos;s news.
              </p>
              <p className="mt-1 text-[11px] text-ink-3">Requires GOOGLE_API_KEY in .env</p>
            </Card>
          )}
          {articles.map((a) => (
            <ArticleCard key={a.id} article={a}
              active={selected?.id === a.id}
              saved={saved.has(a.id)}
              onSave={() => toggleSave(a.id)}
              onClick={() => setSelected(selected?.id === a.id ? null : a)}
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
            <SectionHeading title="GS Coverage" sub="Topics across synced articles" icon={<span className="text-accent">◈</span>} />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {gsTags.map((t) => <Chip key={t} tone="accent">{t}</Chip>)}
              {Array.from(new Set(articles.flatMap((a) => a.tags))).slice(0, 12).map((t, i) => (
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
              <p className="mt-1 text-[11px] uppercase tracking-[0.07em] text-ink-3">
                {selected.source} · {selected.publishedAt ? new Date(selected.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}
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

function ArticleCard({ article: a, active, saved, onSave, onClick }: {
  article: Article; active: boolean; saved: boolean;
  onSave: () => void; onClick: () => void;
}) {
  return (
    <Card id={`a-${a.id}`} hover onClick={onClick}
      className={cn("cursor-pointer p-5 transition-all", active && "border-accent/50 bg-surface-2")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-[16px] font-semibold leading-snug tracking-tight text-ink line-clamp-2">
            {a.headline}
          </h3>
          <p className="mt-1 text-[10.5px] uppercase tracking-[0.07em] text-ink-3">
            {a.source} · {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString("en-IN") : ""}
          </p>
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
