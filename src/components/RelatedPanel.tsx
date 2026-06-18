"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, Loader2, Newspaper, Target, BookOpen, FileText, Network } from "lucide-react";

/* Related-across-the-platform panel — semantic neighbours of an item
   (or free-text), grouped by content type. Powered by /api/related. */

interface Related {
  ca: { id: string; headline: string; gsMapping: string[]; importanceScore: number; publishedAt: string }[];
  pyq: { id: string; paperId: string; text: string; marks: number | null; year: number; stage: string; paperCode: string }[];
  ncert: { id: string; title: string; klass: number; subject: string; book: string }[];
  notes: { id: string; title: string; subject: string | null }[];
  counts: { ca: number; pyq: number; ncert: number; notes: number };
}

export function RelatedPanel({ refKind, refId, query, title = "Related across your platform" }:
  { refKind?: string; refId?: string; query?: string; title?: string }) {
  const [data, setData] = useState<Related | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const qs = refKind && refId ? `kind=${refKind}&refId=${refId}` : query ? `q=${encodeURIComponent(query)}` : "";
    if (!qs) { setLoading(false); return; }
    setLoading(true);
    fetch(`/api/related?${qs}`).then((r) => r.json())
      .then((d: Related) => setData(d)).catch(() => {}).finally(() => setLoading(false));
  }, [refKind, refId, query]);

  const total = data ? data.pyq.length + data.ca.length + data.ncert.length + data.notes.length : 0;

  return (
    <div className="rounded-xl border border-line-subtle bg-surface-2/30 p-3.5">
      <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-2">
        <Network size={12} /> {title}
      </p>

      {loading && <div className="flex items-center gap-2 py-3 text-[11.5px] text-ink-3"><Loader2 size={13} className="animate-spin" /> Finding connections…</div>}
      {!loading && total === 0 && <p className="py-2 text-[11.5px] text-ink-3">No strong connections found yet. As more of your library is indexed, links appear here.</p>}

      {!loading && data && total > 0 && (
        <div className="space-y-3">
          {data.pyq.length > 0 && (
            <Group icon={<Target size={11} className="text-rose-400" />} label="Past questions">
              {data.pyq.slice(0, 4).map((q) => (
                <Link key={q.id} href="/pyq" className="block rounded-md px-2 py-1.5 text-[11.5px] leading-snug text-ink-2 hover:bg-surface-2">
                  <span className="font-mono text-[9.5px] text-rose-300">{q.stage} {q.year || ""} {q.paperCode}</span>{" "}
                  {q.text.slice(0, 90)}{q.text.length > 90 ? "…" : ""}
                </Link>
              ))}
            </Group>
          )}
          {data.ca.length > 0 && (
            <Group icon={<Newspaper size={11} className="text-accent" />} label="Current affairs">
              {data.ca.slice(0, 4).map((c) => (
                <Link key={c.id} href="/current-affairs" className="block rounded-md px-2 py-1.5 text-[11.5px] leading-snug text-ink-2 hover:bg-surface-2">
                  {c.headline.slice(0, 100)}{c.headline.length > 100 ? "…" : ""}
                  {c.gsMapping[0] && <span className="ml-1 font-mono text-[9px] text-accent">· {c.gsMapping[0]}</span>}
                </Link>
              ))}
            </Group>
          )}
          {data.ncert.length > 0 && (
            <Group icon={<BookOpen size={11} className="text-emerald-400" />} label="NCERT chapters">
              {data.ncert.slice(0, 4).map((c) => (
                <Link key={c.id} href="/ncert" className="block rounded-md px-2 py-1.5 text-[11.5px] leading-snug text-ink-2 hover:bg-surface-2">
                  {c.title} <span className="font-mono text-[9px] text-emerald-300">· Class {c.klass} {c.subject}</span>
                </Link>
              ))}
            </Group>
          )}
          {data.notes.length > 0 && (
            <Group icon={<FileText size={11} className="text-gold" />} label="Your notes">
              {data.notes.slice(0, 4).map((n) => (
                <Link key={n.id} href="/notes" className="block rounded-md px-2 py-1.5 text-[11.5px] leading-snug text-ink-2 hover:bg-surface-2">
                  {n.title}{n.subject ? <span className="font-mono text-[9px] text-gold"> · {n.subject}</span> : null}
                </Link>
              ))}
            </Group>
          )}
        </div>
      )}
    </div>
  );
}

function Group({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-3">{icon} {label}</p>
      <div className="-mx-1">{children}</div>
    </div>
  );
}
