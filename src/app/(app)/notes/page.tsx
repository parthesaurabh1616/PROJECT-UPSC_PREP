"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Trash2, Loader2, Save, Search, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface Note {
  id: string; title: string; content: string; subject: string | null; tags: string[]; updatedAt: string;
}

const SUBJECTS = ["GS-I History", "GS-I Geography", "GS-II Polity", "GS-II IR", "GS-III Economy", "GS-III Environment", "GS-IV Ethics", "Optional PSIR", "Current Affairs", "Essay"];

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = notes.find((n) => n.id === activeId);

  const load = useCallback(() => {
    fetch("/api/notes")
      .then((r) => r.json())
      .then((data: Note[]) => {
        setNotes(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const createNote = async () => {
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled note", content: "", subject: "GS-II Polity", tags: [] }),
    });
    const note: Note = await res.json();
    setNotes((prev) => [note, ...prev]);
    setActiveId(note.id);
  };

  const updateNote = useCallback(async (id: string, patch: Partial<Note>) => {
    setNotes((prev) => prev.map((n) => n.id === id ? { ...n, ...patch } : n));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = setTimeout(async () => {
      const note = notes.find((n) => n.id === id);
      if (!note) return;
      const merged = { ...note, ...patch };
      await fetch(`/api/notes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: merged.title, content: merged.content, subject: merged.subject, tags: merged.tags }),
      });
      setSaving(false);
    }, 800);
  }, [notes]);

  const deleteNote = async (id: string) => {
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (activeId === id) setActiveId(notes.find((n) => n.id !== id)?.id ?? null);
  };

  const filtered = notes.filter((n) =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    (n.content ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mx-auto grid h-[calc(100vh-56px-3rem)] max-w-[1280px] grid-cols-[260px_1fr] gap-4">
      <aside className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="p-3 space-y-2">
          <button onClick={createNote}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-accent py-2 text-[12.5px] font-medium text-accent hover:bg-accent/10">
            <Plus size={14} /> New note
          </button>
          <div className="flex items-center gap-1.5 rounded-lg border border-line bg-bg-subtle px-2.5 py-1.5">
            <Search size={13} className="text-ink-3" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes..."
              className="flex-1 bg-transparent text-[12.5px] text-ink outline-none placeholder:text-ink-3" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
          {loading && <p className="px-2 text-[11.5px] text-ink-3 py-3">Loading...</p>}
          {!loading && filtered.length === 0 && (
            <p className="px-2 text-[11.5px] text-ink-3 py-3">No notes yet. Create one!</p>
          )}
          {filtered.map((n) => (
            <div key={n.id} onClick={() => setActiveId(n.id)}
              className={cn("group cursor-pointer rounded-lg px-2.5 py-2 transition-colors",
                n.id === activeId ? "bg-accent/12" : "hover:bg-surface-2")}>
              <div className="flex items-center justify-between gap-1">
                <p className={cn("truncate text-[12.5px] font-medium", n.id === activeId ? "text-accent" : "text-ink")}>{n.title}</p>
                <button onClick={(e) => { e.stopPropagation(); void deleteNote(n.id); }}
                  className="hidden shrink-0 text-ink-3 hover:text-danger group-hover:block">
                  <Trash2 size={12} />
                </button>
              </div>
              <p className="mt-0.5 truncate text-[11px] text-ink-3">
                {n.subject ?? "No subject"} · {new Date(n.updatedAt).toLocaleDateString("en-IN")}
              </p>
            </div>
          ))}
        </div>
      </aside>

      <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface">
        {!active ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="text-[15px] font-semibold text-ink">Select or create a note</p>
            <p className="mt-1 text-[12.5px] text-ink-3">Your second brain — all your UPSC notes in one place.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-line px-6 py-3">
              <div className="flex items-center gap-3">
                <select value={active.subject ?? "GS-II Polity"}
                  onChange={(e) => { void updateNote(active.id, { subject: e.target.value }); }}
                  className="rounded-md border border-line bg-surface-2 px-2 py-1 text-[11.5px] text-ink-2 outline-none">
                  {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                </select>
                <div className="flex items-center gap-1 text-[11px] text-ink-3">
                  <Tag size={11} /> {active.tags.join(", ") || "no tags"}
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-ink-3">
                {saving && <><Loader2 size={12} className="animate-spin" /> Saving...</>}
                {!saving && <><Save size={12} /> Saved</>}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <input
                value={active.title}
                onChange={(e) => { void updateNote(active.id, { title: e.target.value }); }}
                placeholder="Note title..."
                className="w-full bg-transparent font-display text-[28px] font-semibold tracking-tight text-ink outline-none placeholder:text-ink-3 mb-4"
              />
              <textarea
                value={active.content}
                onChange={(e) => { void updateNote(active.id, { content: e.target.value }); }}
                placeholder="Start writing your notes here...&#10;&#10;Use **bold** for key terms, bullet points for lists, and structure your notes for UPSC answers."
                className="prose-os w-full flex-1 resize-none bg-transparent text-[14px] leading-relaxed text-ink-2 outline-none placeholder:text-ink-3"
                style={{ minHeight: "60vh" }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
