"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { NotebookPen, Loader2, CheckCircle2, AlertTriangle, Search, Trash2, Pencil, ChevronDown, ChevronUp, Anchor, CalendarDays, X } from "lucide-react";
import { Card, Chip } from "@/components/ui";
import { cn } from "@/lib/utils";
import { SYLLABUS } from "@/lib/syllabus-data";

/* Class summaries — "what I learned in class today."
   One card per class: pick the paper + syllabus topic, paste your own
   quick organiser, add anchor hooks. Saved day by day → the archive IS
   the pre-exam revision book, and each save puts the topic on the
   1/7/21/60/120 ladder so it resurfaces instead of decaying. */

interface Summary {
  id: string; day: string; subject: string; nodeId: string | null;
  topic: string; body: string; anchors: string[]; createdAt: string;
}

/* Flatten the official syllabus into paper → topics for the picker. */
const PAPERS = SYLLABUS.flatMap((g) =>
  g.papers.map((p) => ({
    label: `${g.label} · ${p.name.split(":")[0].trim()}`,
    topics: p.sections.flatMap((s) => s.nodes.map((nd) => ({ id: nd.id, title: nd.title, section: s.heading ?? "" }))),
  }))
);
const CUSTOM = "__custom__";

const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function ClassSummaries() {
  const [rows, setRows] = useState<Summary[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [day, setDay] = useState(todayIso());
  const [paperIdx, setPaperIdx] = useState(() => Math.max(0, PAPERS.findIndex((p) => p.label.includes("Political Science"))));
  const [topicId, setTopicId] = useState<string>("");
  const [customTopic, setCustomTopic] = useState("");
  const [body, setBody] = useState("");
  const [anchors, setAnchors] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    fetch("/api/revision/class-summaries", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: Summary[]) => setRows(Array.isArray(j) ? j : []))
      .catch(() => setRows([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  const paper = PAPERS[paperIdx];
  const topic = paper?.topics.find((t) => t.id === topicId);

  const resetForm = () => {
    setEditId(null); setDay(todayIso()); setTopicId(""); setCustomTopic("");
    setBody(""); setAnchors(""); setError("");
  };

  const startEdit = (s: Summary) => {
    setShowForm(true); setEditId(s.id); setDay(dayKey(s.day));
    const pi = PAPERS.findIndex((p) => p.label === s.subject);
    if (pi >= 0) { setPaperIdx(pi); setTopicId(s.nodeId ?? CUSTOM); }
    else { setTopicId(CUSTOM); }
    if (!s.nodeId) setCustomTopic(s.topic);
    setBody(s.body); setAnchors(s.anchors.join(", ")); setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async () => {
    const topicTitle = topicId === CUSTOM ? customTopic.trim() : topic?.title ?? "";
    if (!topicTitle) { setError("Pick the topic (or type a custom one)."); return; }
    if (!body.trim()) { setError("The summary itself is the whole point — write it."); return; }
    setSaving(true); setError(""); setSavedMsg("");
    try {
      const payload = {
        id: editId ?? undefined,
        day, subject: paper.label,
        nodeId: topicId === CUSTOM ? null : topicId,
        topic: topicTitle,
        body,
        anchors: anchors.split(",").map((a) => a.trim()).filter(Boolean),
      };
      const res = await fetch("/api/revision/class-summaries", {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((j as { error?: string }).error || `Save failed (HTTP ${res.status})`);
      setSavedMsg(editId
        ? "Updated ✓"
        : payload.nodeId
          ? "Saved ✓ — topic is on the revision ladder (first revisit: tomorrow)"
          : "Saved ✓");
      setTimeout(() => setSavedMsg(""), 6000);
      resetForm(); setShowForm(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed — is the server running?");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s: Summary) => {
    if (!window.confirm(`Delete the summary "${s.topic}" (${fmtDay(s.day)})?`)) return;
    await fetch(`/api/revision/class-summaries?id=${s.id}`, { method: "DELETE" }).catch(() => {});
    load();
  };

  const toggle = (id: string) => setOpen((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const filtered = useMemo(() => {
    if (!rows) return [];
    const needle = q.trim().toLowerCase();
    return needle
      ? rows.filter((s) => s.topic.toLowerCase().includes(needle) || s.body.toLowerCase().includes(needle)
          || s.subject.toLowerCase().includes(needle) || s.anchors.some((a) => a.toLowerCase().includes(needle)))
      : rows;
  }, [rows, q]);

  const byDay = useMemo(() => {
    const m = new Map<string, Summary[]>();
    for (const s of filtered) {
      const k = dayKey(s.day);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(s);
    }
    return [...m.entries()];
  }, [filtered]);

  if (rows === null) return <div className="flex items-center gap-2 py-10 text-ink-3"><Loader2 size={16} className="animate-spin" /> Opening the class diary…</div>;

  return (
    <div className="animate-fade-up space-y-4">
      {/* Intro + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[640px] text-[12px] leading-relaxed text-ink-3">
          After every class: write the <span className="text-ink-2">quick organiser</span> in your own words, pick the exact syllabus topic, add 5–7 <span className="text-ink-2">anchors</span>.
          Day by day this becomes your pre-exam revision book — and each topic joins the 1→7→21→60→120-day ladder automatically.
        </p>
        <button onClick={() => { if (showForm) { resetForm(); } setShowForm(!showForm); }}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-[12px] text-accent hover:bg-accent/20">
          {showForm ? <X size={13} /> : <NotebookPen size={13} />} {showForm ? "Close" : "Write today's summary"}
        </button>
      </div>

      {/* Compose */}
      {showForm && (
        <Card className="space-y-3 p-5">
          <p className="text-[13px] font-semibold text-ink">{editId ? "Edit summary" : "What did the class teach today?"}</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[160px_1fr_1fr]">
            <div>
              <label className="mb-1 block text-[10.5px] uppercase tracking-widest text-ink-3">Class day</label>
              <input type="date" value={day} onChange={(e) => setDay(e.target.value)}
                className="w-full rounded-lg border border-line bg-surface-2 px-2.5 py-2 text-[12.5px] text-ink outline-none focus:border-accent/50" />
            </div>
            <div>
              <label className="mb-1 block text-[10.5px] uppercase tracking-widest text-ink-3">Subject / paper</label>
              <select value={paperIdx} onChange={(e) => { setPaperIdx(Number(e.target.value)); setTopicId(""); }}
                className="w-full rounded-lg border border-line bg-surface-2 px-2.5 py-2 text-[12.5px] text-ink outline-none">
                {PAPERS.map((p, i) => <option key={p.label} value={i}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10.5px] uppercase tracking-widest text-ink-3">Syllabus topic</label>
              <select value={topicId} onChange={(e) => setTopicId(e.target.value)}
                className="w-full rounded-lg border border-line bg-surface-2 px-2.5 py-2 text-[12.5px] text-ink outline-none">
                <option value="" disabled>Pick the topic…</option>
                {paper?.topics.map((t) => <option key={t.id} value={t.id}>{t.section ? `${t.section} — ` : ""}{t.title}</option>)}
                <option value={CUSTOM}>Custom topic (not in the list)…</option>
              </select>
            </div>
          </div>
          {topicId === CUSTOM && (
            <input value={customTopic} onChange={(e) => setCustomTopic(e.target.value)} placeholder="Type the topic name…"
              className="w-full rounded-lg border border-line bg-surface-2 px-2.5 py-2 text-[12.5px] text-ink outline-none focus:border-accent/50" />
          )}
          <div>
            <label className="mb-1 block text-[10.5px] uppercase tracking-widest text-ink-3">Quick organiser — your own words (read twice, close it)</label>
            <textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)}
              placeholder={"India's claim rests on: …\nStrategies India uses: …\nChallenges (counter-view): …"}
              className="w-full resize-y rounded-lg border border-line bg-surface-2 p-3 text-[13px] leading-relaxed text-ink outline-none focus:border-accent/50" />
          </div>
          <div>
            <label className="mb-1 block text-[10.5px] uppercase tracking-widest text-ink-3">Anchors — comma-separated memory hooks</label>
            <input value={anchors} onChange={(e) => setAnchors(e.target.value)}
              placeholder="world of 1945, 2 lakh+ peacekeepers, G4, Coffee Club / UfC, China blocks, veto = gatekeepers are beneficiaries"
              className="w-full rounded-lg border border-line bg-surface-2 px-2.5 py-2 text-[12.5px] text-ink outline-none focus:border-accent/50" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={save} disabled={saving}
              className="rounded-lg bg-accent px-4 py-1.5 text-[12.5px] font-medium text-white disabled:opacity-50">
              {saving ? "Saving…" : editId ? "Update summary" : "Save summary"}
            </button>
            {error && (
              <span className="flex items-center gap-1.5 rounded-lg border border-danger/40 bg-danger/10 px-2.5 py-1 text-[11.5px] text-danger">
                <AlertTriangle size={12} /> {error}
              </span>
            )}
          </div>
        </Card>
      )}

      {savedMsg && (
        <div className="rounded-xl border border-success/40 bg-success/10 px-3.5 py-2 text-[12.5px] text-success">
          <CheckCircle2 size={13} className="mr-1.5 inline" /> {savedMsg}
        </div>
      )}

      {/* Search */}
      {rows.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2/40 px-3 py-2">
          <Search size={13} className="shrink-0 text-ink-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search topic, content, anchors…"
            className="w-full bg-transparent text-[13px] text-ink placeholder:text-ink-3 focus:outline-none" />
          <span className="shrink-0 font-mono text-[10px] text-ink-3">{rows.length} summaries</span>
        </div>
      )}

      {rows.length === 0 && !showForm && (
        <Card className="py-12 text-center">
          <NotebookPen size={28} className="mx-auto mb-3 text-ink-3" />
          <p className="text-[14px] font-semibold text-ink">No class summaries yet</p>
          <p className="mx-auto mt-1 max-w-[460px] text-[12.5px] text-ink-3">
            After today&apos;s class, write what you learned in your own words. One card per class — the archive becomes your revision book.
          </p>
        </Card>
      )}

      {/* Day-by-day archive */}
      {byDay.map(([k, list]) => (
        <div key={k}>
          <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
            <CalendarDays size={11} className="text-accent" /> {fmtDay(list[0].day)}
          </p>
          <div className="space-y-2">
            {list.map((s) => {
              const expanded = open.has(s.id);
              return (
                <Card key={s.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <button onClick={() => toggle(s.id)} className="min-w-0 flex-1 text-left">
                      <p className="text-[13.5px] font-semibold text-ink hover:text-accent">{s.topic}</p>
                      <p className="mt-0.5 font-mono text-[9.5px] uppercase tracking-wider text-ink-3">{s.subject}{s.nodeId ? " · on the ladder" : ""}</p>
                    </button>
                    <button onClick={() => startEdit(s)} title="Edit" className="text-ink-3 hover:text-accent"><Pencil size={14} /></button>
                    <button onClick={() => remove(s)} title="Delete" className="text-ink-3 hover:text-danger"><Trash2 size={14} /></button>
                    <button onClick={() => toggle(s.id)} className="text-ink-3">{expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</button>
                  </div>
                  {expanded && (
                    <div className="mt-3 border-t border-line-subtle pt-3">
                      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink-2">{s.body}</p>
                    </div>
                  )}
                  {s.anchors.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <Anchor size={11} className="text-accent-2" />
                      {s.anchors.map((a) => <Chip key={a} tone="accent-2">{a}</Chip>)}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
