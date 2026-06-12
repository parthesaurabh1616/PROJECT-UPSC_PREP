"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { UploadCloud, BookOpen, FileText, Loader2, ExternalLink } from "lucide-react";
import { Card, Chip } from "@/components/ui";
import { cn } from "@/lib/utils";

interface LibraryFile {
  id: string; name: string; size: number; mimeType: string; kind: string;
  subject: string | null; description: string | null; createdAt: string; url: string | null;
}

const FILTERS = ["All", "NCERT", "Standard", "Optional", "Govt Report"] as const;
const KINDS = ["NCERT", "Standard", "Optional", "Govt Report"];

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function LibraryPage() {
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [filter, setFilter] = useState<typeof FILTERS[number]>("All");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [kind, setKind] = useState("Standard");
  const [subject, setSubject] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    fetch("/api/library")
      .then((r) => r.json())
      .then((data) => { setFiles(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const upload = async (f: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", f);
    fd.append("kind", kind);
    fd.append("subject", subject);
    await fetch("/api/library/upload", { method: "POST", body: fd });
    setUploading(false);
    load();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) { void upload(f); }
  };

  const displayed = filter === "All" ? files : files.filter((f) => f.kind === filter);

  const stats = [
    { label: "Total files", value: files.length },
    { label: "PDFs", value: files.filter((f) => f.mimeType === "application/pdf").length },
    { label: "NCERTs", value: files.filter((f) => f.kind === "NCERT").length },
    { label: "Total size", value: fmtSize(files.reduce((acc, f) => acc + f.size, 0)) },
  ];

  return (
    <div className="mx-auto max-w-[1280px] space-y-5">
      <div className="grid animate-fade-up grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <p className="font-display text-[24px] font-semibold leading-none tracking-tight text-ink">{s.value}</p>
            <p className="mt-1.5 text-[10.5px] font-medium uppercase tracking-[0.1em] text-ink-3">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-[3fr_1fr] gap-4 animate-fade-up" style={{ animationDelay: "60ms" }}>
        <div
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileRef.current?.click()}
          className={cn(
            "flex cursor-pointer items-center gap-4 rounded-2xl border-2 border-dashed p-6 transition-colors",
            dragOver ? "border-accent bg-accent/8" : "border-line bg-bg-subtle hover:border-accent/50",
          )}
        >
          {uploading ? <Loader2 size={28} className="text-accent animate-spin" /> : <UploadCloud size={28} className="text-accent" />}
          <div>
            <p className="font-display text-[15px] font-semibold text-ink">
              {uploading ? "Uploading..." : "Drop a file or click to upload"}
            </p>
            <p className="mt-0.5 text-[12px] text-ink-3">PDF, EPUB, images, documents — books, newspapers, PYQs</p>
          </div>
          <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { void upload(f); } }} />
        </div>

        <div className="flex flex-col gap-2">
          <select value={kind} onChange={(e) => setKind(e.target.value)}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-[12.5px] text-ink outline-none">
            {KINDS.map((k) => <option key={k}>{k}</option>)}
          </select>
          <input value={subject} onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject (optional)"
            className="rounded-lg border border-line bg-surface px-3 py-2 text-[12.5px] text-ink outline-none placeholder:text-ink-3" />
        </div>
      </div>

      <div className="flex gap-1.5">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn("rounded-lg px-3 py-1.5 text-[12px] transition-colors",
              f === filter ? "bg-accent text-white" : "border border-line text-ink-2 hover:border-accent/40 hover:text-ink")}>
            {f}
          </button>
        ))}
      </div>

      {loading && <div className="flex items-center gap-2 py-8 text-ink-3"><Loader2 size={16} className="animate-spin" /> Loading library...</div>}
      {!loading && displayed.length === 0 && (
        <Card className="py-12 text-center">
          <BookOpen size={32} className="mx-auto mb-3 text-ink-3" />
          <p className="text-[14px] font-semibold text-ink">Library is empty</p>
          <p className="mt-1 text-[12.5px] text-ink-3">Upload your NCERTs, Laxmikanth, Spectrum, and other references.</p>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        {displayed.map((f) => (
          <Card key={f.id} hover className="flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-surface-2 text-ink-3">
              <FileText size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-ink">{f.name}</p>
              <p className="mt-0.5 text-[11px] text-ink-3">{f.kind} · {fmtSize(f.size)} · {f.subject ?? "General"}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Chip tone="muted">{f.kind}</Chip>
              {f.url && (
                <a href={f.url} target="_blank" rel="noreferrer"
                  className="grid h-7 w-7 place-items-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink">
                  <ExternalLink size={13} />
                </a>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
