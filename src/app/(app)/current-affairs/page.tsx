"use client";

import { useState, useEffect, useCallback } from "react";
import { Bookmark, Layers, Link2, FileStack, RefreshCw, Loader2 } from "lucide-react";
import { Card, Chip, Bar, Divider, SectionHeading } from "@/components/ui";
import { cn } from "@/lib/utils";

interface CurrentAffair {
  id: string; headline: string; summary: string; whyInNews: string | null;
  background: string | null; keyFacts: string | null; prelims: string | null;
  mains: string | null; interview: string | null; gsMapping: string[];
  tags: string[]; priority: string; source: string | null; publishedAt: string;
}

export default function CurrentAffairsPage() {
  const [articles, setArticles] = useState<CurrentAffair[]>([]);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [ingestMsg, setIngestMsg] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/affairs")
      .then((r) => r.json())
      .then((data) => { setArticles(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const ingest = async () => {
    setIngesting(true); setIngestMsg("");
    const res = await fetch("/api/affairs/ingest", { method: "POST" });
    const data = await res.json();
    if (data.error) setIngestMsg(data.error);
    else setIngestMsg(`Ingested ${data.ingested} new articles.`);
    setIngesting(false);
    load();
  };

  const high = articles.filter((a) => a.priority === "high").length;

  return (
    <div className="mx-auto max-w-[1280px] space-y-5">
      <div className="flex animate-fade-up flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[24px] font-semibold tracking-tight text-ink">Current Affairs Intelligence</h2>
          <p className="mt-0.5 text-[12.5px] text-ink-3">
            {articles.length} articles · {high} high-priority · AI-processed, UPSC-mapped
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ingestMsg && <span className="text-[11.5px] text-ink-2">{ingestMsg}</span>}
          <button onClick={ingest} disabled={ingesting}
            className="flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-[12px] text-accent transition-colors hover:bg-accent/20 disabled:opacity-50">
            {ingesting ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            {ingesting ? "Syncing..." : "Sync news now"}
          </button>
          <Chip tone="muted">The Hindu</Chip>
          <Chip tone="muted">NDTV</Chip>
          <Chip tone="muted">Times of India</Chip>
        </div>
      </div>

      <div className="grid animate-fade-up grid-cols-[1.7fr_1fr] gap-5" style={{ animationDelay: "80ms" }}>
        <div className="space-y-4">
          {loading && <div className="flex items-center gap-2 py-8 text-ink-3"><Loader2 size={16} className="animate-spin" /> Loading articles...</div>}
          {!loading && articles.length === 0 && (
            <Card className="py-10 text-center">
              <p className="text-[14px] font-semibold text-ink">No articles yet</p>
              <p className="mt-1 text-[12.5px] text-ink-3">Click Sync news now to fetch and AI-process today s news.</p>
              <p className="mt-2 text-[11px] text-ink-3">Requires ANTHROPIC_API_KEY in your .env file.</p>
            </Card>
          )}
          {articles.map((a) => <ArticleCard key={a.id} article={a} />)}
        </div>

        <div className="space-y-4">
          <Card>
            <SectionHeading title="Today s Reading" sub={`${articles.length} articles processed`} icon={<FileStack size={15} className="text-accent" />} />
            <Bar value={articles.length > 0 ? Math.min(100, articles.length * 10) : 0} className="mt-3" />
            <Divider className="my-3.5" />
            <div className="space-y-1.5 text-[12.5px]">
              {[["High priority", high, "danger"], ["Normal", articles.filter(a => a.priority === "normal").length, "success"], ["Low", articles.filter(a => a.priority === "low").length, "muted"]]
                .map(([label, count, tone]) => (
                  <div key={String(label)} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-xs", tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : "text-ink-3")}>●</span>
                      <span className="text-ink-2">{label}</span>
                    </div>
                    <span className="font-mono text-[11px] text-ink-3">{count}</span>
                  </div>
                ))}
            </div>
          </Card>

          <Card>
            <SectionHeading title="GS Mapping" sub="Topics across today s articles" icon={<Layers size={15} className="text-accent" />} />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Array.from(new Set(articles.flatMap((a) => a.gsMapping))).map((t) => (
                <Chip key={t} tone="accent">{t}</Chip>
              ))}
              {articles.flatMap((a) => a.tags).slice(0, 8).map((t, i) => (
                <Chip key={i} tone="muted">{t}</Chip>
              ))}
            </div>
          </Card>

          <Card>
            <SectionHeading title="Consolidation" sub="Daily -> weekly -> monthly" icon={<Link2 size={15} className="text-accent" />} />
            <div className="mt-3 space-y-1.5 text-[12px] text-ink-2">
              <p>Auto-sync: <strong className="text-ink">3 RSS feeds</strong></p>
              <p>AI processing: <strong className="text-ink">UPSC-mapped analysis</strong></p>
              <Divider className="my-2.5" />
              <p className="text-[11.5px] text-ink-3">Click Sync to ingest latest news and process with AI.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ArticleCard({ article: a }: { article: CurrentAffair }) {
  const [saved, setSaved] = useState(false);
  return (
    <Card hover className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-[17px] font-semibold leading-snug tracking-tight text-ink">{a.headline}</h3>
          <p className="mt-1 text-[10.5px] uppercase tracking-[0.07em] text-ink-3">{a.source} · {new Date(a.publishedAt).toLocaleDateString("en-IN")}</p>
        </div>
        <button onClick={() => setSaved(!saved)} className={cn("shrink-0 transition-colors", saved ? "text-accent" : "text-ink-3 hover:text-accent")}>
          <Bookmark size={16} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="mt-3 space-y-2.5">
        {a.whyInNews && <Field label="Why in news" text={a.whyInNews} />}
        {a.background && <Field label="Background" text={a.background} />}
        {a.keyFacts && <Field label="Key facts" text={a.keyFacts} />}
      </div>
      {(a.prelims || a.mains || a.interview) && (
        <div className="mt-3.5 grid grid-cols-3 gap-3 border-t border-line-subtle pt-3.5">
          {a.prelims && <Mapping label="Prelims angle" text={a.prelims} />}
          {a.mains && <Mapping label="Mains angle" text={a.mains} />}
          {a.interview && <Mapping label="Interview angle" text={a.interview} />}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {a.priority === "high" && <Chip tone="danger">High priority</Chip>}
        {a.gsMapping.map((g) => <Chip key={g} tone="accent">{g}</Chip>)}
        {a.tags.map((t) => <span key={t} className="rounded-full bg-surface-2 px-2 py-0.5 text-[10.5px] text-ink-2">{t}</span>)}
      </div>
    </Card>
  );
}

function Field({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-accent">{label}</p>
      <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">{text}</p>
    </div>
  );
}

function Mapping({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-ink-3">{label}</p>
      <p className="mt-0.5 text-[11.5px] leading-snug text-ink-2">{text}</p>
    </div>
  );
}
