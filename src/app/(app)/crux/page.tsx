"use client";

import { useEffect, useMemo, useState } from "react";
import { BookMarked, Loader2, Search, FileText, Image as ImageIcon, Presentation, FolderOpen, RefreshCw } from "lucide-react";
import { Card, Chip } from "@/components/ui";
import { cn } from "@/lib/utils";

/* Crux — the institute-notes shelf. Drop StudyIQ CRUX sheets, handwritten
   notes and PPTs into the Crux folder (subfolder = subject); they appear
   here newest-class-first, searchable, and open right in the browser. */

interface CruxFile { rel: string; subject: string; name: string; ext: string; size: number; day: string | null; mtime: string }
interface Data { subjects: { subject: string; files: CruxFile[] }[]; total: number; root: string }

const fmtSize = (n: number) => n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(1)} MB`;
const fmtDay = (d: string | null) => d ? new Date(`${d}T12:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "—";
const FileIcon = ({ ext }: { ext: string }) =>
  ["png", "jpg", "jpeg", "webp"].includes(ext) ? <ImageIcon size={14} className="text-accent-2" />
  : ["ppt", "pptx"].includes(ext) ? <Presentation size={14} className="text-warning" />
  : <FileText size={14} className="text-accent" />;

export default function CruxPage() {
  const [d, setD] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => {
    fetch("/api/crux", { cache: "no-store" }).then((r) => r.json())
      .then(setD).catch(() => {}).finally(() => { setLoading(false); setBusy(false); });
  };
  useEffect(load, []);

  const filtered = useMemo(() => {
    if (!d) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return d.subjects;
    return d.subjects
      .map((s) => ({ ...s, files: s.files.filter((f) => f.name.toLowerCase().includes(needle) || s.subject.toLowerCase().includes(needle)) }))
      .filter((s) => s.files.length > 0);
  }, [d, q]);

  if (loading) return <div className="flex items-center gap-2 py-20 text-ink-3"><Loader2 size={16} className="animate-spin" /> Opening the shelf…</div>;

  return (
    <div className="mx-auto max-w-[1000px]">
      <div className="mb-4 flex animate-fade-up flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-[24px] font-semibold tracking-tight text-ink">
            <BookMarked size={18} className="text-accent" /> Crux — Institute Notes
          </h2>
          <p className="mt-0.5 text-[12.5px] text-ink-3">
            Drop CRUX sheets, handwritten notes &amp; PPTs into the <span className="font-mono text-[11px]">Crux</span> folder (subfolder = subject) — they show up here, newest class first.
          </p>
        </div>
        <button onClick={() => { setBusy(true); load(); }} disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-accent hover:bg-accent/20 disabled:opacity-50">
          {busy ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />} Rescan
        </button>
      </div>

      <div className="mb-4 flex animate-fade-up items-center gap-2 rounded-xl border border-line bg-surface-2/40 px-3 py-2">
        <Search size={14} className="shrink-0 text-ink-3" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes — subject, topic, date…"
          className="w-full bg-transparent text-[13px] text-ink placeholder:text-ink-3 focus:outline-none" />
        {d && <span className="shrink-0 font-mono text-[10px] text-ink-3">{d.total} notes</span>}
      </div>

      {(!d || d.total === 0) && (
        <Card className="animate-fade-up p-8 text-center">
          <FolderOpen size={28} className="mx-auto mb-3 text-ink-3" />
          <p className="text-[14px] font-semibold text-ink">The shelf is empty — honestly empty.</p>
          <p className="mx-auto mt-1.5 max-w-[520px] text-[12.5px] leading-relaxed text-ink-3">
            Save the institute&apos;s files into <span className="font-mono text-[11px] text-ink-2">{d?.root ?? "the Crux folder"}</span>.
            Make a subfolder per subject (<span className="font-mono text-[11px]">PSIR</span>, <span className="font-mono text-[11px]">GS - Geography</span>, …) and they&apos;ll appear here instantly — no upload step, the folder is the database.
          </p>
        </Card>
      )}

      <div className="space-y-4">
        {filtered.map((s) => (
          <Card key={s.subject} className="animate-fade-up p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-2">
                <FolderOpen size={13} className="text-accent" /> {s.subject}
              </p>
              <Chip tone="muted">{s.files.length} file{s.files.length === 1 ? "" : "s"}</Chip>
            </div>
            <div className="space-y-1.5">
              {s.files.map((f) => (
                <a key={f.rel} href={`/api/crux?file=${encodeURIComponent(f.rel)}`} target="_blank" rel="noreferrer"
                  className="group flex items-center gap-3 rounded-xl border border-line-subtle px-3 py-2 transition-colors hover:border-accent/40 hover:bg-surface-2/40">
                  <FileIcon ext={f.ext} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-ink group-hover:text-accent">{f.name}</p>
                    <p className="font-mono text-[9.5px] text-ink-3">{fmtDay(f.day)} · {fmtSize(f.size)}</p>
                  </div>
                  <Chip tone={f.ext === "pdf" ? "accent" : "muted"}>{f.ext.toUpperCase()}</Chip>
                </a>
              ))}
            </div>
          </Card>
        ))}
        {q && filtered.length === 0 && d && d.total > 0 && (
          <p className={cn("py-8 text-center text-[12.5px] text-ink-3")}>Nothing matches “{q}”.</p>
        )}
      </div>
    </div>
  );
}
