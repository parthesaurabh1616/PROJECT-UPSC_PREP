"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Brain, Loader2, CheckCircle2, ChevronRight, Layers, ListChecks, Trash2, Search, AlertTriangle } from "lucide-react";
import { Card, Chip } from "@/components/ui";
import { cn } from "@/lib/utils";
import { TopicMemoryPanel } from "@/components/TopicMemoryPanel";

/* Revision Engine — two memory layers, one clear tab each:
     · Review due  — today's flashcard queue (SM-2 micro-memory)
     · All cards   — every saved card: search, filter, delete (proof of save)
     · Topic ladder— big-picture topics on the 1/7/21/60/120 ladder (COS) */

interface RevisionCard {
  id: string; front: string; back: string; subject: string | null;
  interval: number; repetitions: number; easeFactor: number;
  dueAt: string; reviewCount: number; createdAt: string;
}

const GRADES = [
  { q: 0 as const, label: "Blackout", color: "bg-danger/20 text-danger border-danger/30", short: "0" },
  { q: 1 as const, label: "Wrong", color: "bg-danger/10 text-danger/80 border-danger/20", short: "1" },
  { q: 2 as const, label: "Hard", color: "bg-warning/10 text-warning border-warning/30", short: "2" },
  { q: 3 as const, label: "Good", color: "bg-success/10 text-success border-success/30", short: "3" },
  { q: 4 as const, label: "Easy", color: "bg-accent/10 text-accent border-accent/30", short: "4" },
  { q: 5 as const, label: "Perfect", color: "bg-accent-2/10 text-accent-2 border-accent-2/30", short: "5" },
];

const SUBJECTS = ["PSIR", "Polity", "History", "Geography", "Economy", "Environment", "Ethics", "Science & Tech", "Current Affairs", "Essay"];

type Tab = "due" | "all" | "topics";

export default function RevisionPage() {
  const [tab, setTab] = useState<Tab>("due");
  const [cards, setCards] = useState<RevisionCard[]>([]);       // due queue
  const [allCards, setAllCards] = useState<RevisionCard[]>([]); // full library
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [done, setDone] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [newSubject, setNewSubject] = useState("PSIR");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0 });
  const [q, setQ] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);

  const load = useCallback((resetSession = true) => {
    setLoading(true);
    Promise.all([
      fetch("/api/revision/cards").then((r) => r.json()),
      fetch("/api/revision/cards?all=true").then((r) => r.json()),
    ])
      .then(([due, all]: [RevisionCard[], RevisionCard[]]) => {
        setCards(Array.isArray(due) ? due : []);
        setAllCards(Array.isArray(all) ? all : []);
        if (resetSession) { setIdx(0); setFlipped(false); setDone(false); }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const grade = useCallback(async (g: 0 | 1 | 2 | 3 | 4 | 5) => {
    if (reviewing || cards.length === 0) return;
    setReviewing(true);
    const card = cards[idx];
    await fetch("/api/revision/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: card.id, quality: g }),
    }).catch(() => {});
    setSessionStats((s) => ({ reviewed: s.reviewed + 1, correct: s.correct + (g >= 3 ? 1 : 0) }));
    setReviewing(false);
    setFlipped(false);
    if (idx + 1 >= cards.length) setDone(true);
    else setIdx((i) => i + 1);
  }, [reviewing, cards, idx]);

  /* Save with honest feedback: failures surface, success confirms. */
  const addCard = async () => {
    if (!newFront.trim() || !newBack.trim()) return;
    setAdding(true); setAddError(""); setSavedMsg("");
    try {
      const res = await fetch("/api/revision/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ front: newFront, back: newBack, subject: newSubject }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((j as { error?: string }).error || `Save failed (HTTP ${res.status})`);
      setNewFront(""); setNewBack("");
      setSavedMsg(`Saved ✓ — "${(j as RevisionCard).front?.slice(0, 40)}…" is due now (see All cards)`);
      setTimeout(() => setSavedMsg(""), 6000);
      load(false); // refresh lists without restarting the review session
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Save failed — is the server running?");
    } finally {
      setAdding(false);
    }
  };

  const removeCard = async (c: RevisionCard) => {
    if (!window.confirm(`Delete this card?\n\n"${c.front.slice(0, 80)}"`)) return;
    await fetch(`/api/revision/cards?id=${c.id}`, { method: "DELETE" }).catch(() => {});
    load(false);
  };

  const filteredAll = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return allCards
      .filter((c) => !subjectFilter || (c.subject ?? "General") === subjectFilter)
      .filter((c) => !needle || c.front.toLowerCase().includes(needle) || c.back.toLowerCase().includes(needle))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [allCards, q, subjectFilter]);

  const allSubjects = useMemo(
    () => [...new Set(allCards.map((c) => c.subject ?? "General"))].sort(),
    [allCards]
  );

  const card = cards[idx];

  return (
    <div className="mx-auto max-w-[1280px] space-y-4">
      {/* Header */}
      <div className="flex animate-fade-up flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[24px] font-semibold tracking-tight text-ink">Revision Engine</h2>
          <p className="mt-0.5 text-[12.5px] text-ink-3">
            Two memory layers: <span className="text-ink-2">flashcards</span> for facts (SM-2) · <span className="text-ink-2">topic ladder</span> for whole topics (1→7→21→60→120 days).
          </p>
        </div>
        <div className="flex items-center gap-2">
          {sessionStats.reviewed > 0 && <Chip tone="success">{sessionStats.correct}/{sessionStats.reviewed} correct</Chip>}
          <button onClick={() => { setShowAdd(!showAdd); setAddError(""); }}
            className="flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-[12px] text-accent hover:bg-accent/20">
            <Plus size={13} /> Add card
          </button>
        </div>
      </div>

      {/* Tabs — one thing on screen at a time */}
      <div className="flex animate-fade-up gap-1.5 border-b border-line pb-0">
        {([
          { k: "due" as Tab, icon: Brain, label: `Review due (${cards.length})` },
          { k: "all" as Tab, icon: ListChecks, label: `All cards (${allCards.length})` },
          { k: "topics" as Tab, icon: Layers, label: "Topic ladder" },
        ]).map(({ k, icon: Icon, label }) => (
          <button key={k} onClick={() => setTab(k)}
            className={cn(
              "flex items-center gap-1.5 rounded-t-lg border border-b-0 px-3.5 py-2 font-mono text-[10.5px] uppercase tracking-[0.12em] transition-colors",
              tab === k ? "border-line bg-surface text-accent" : "border-transparent text-ink-3 hover:text-ink"
            )}>
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {/* Add card (available from every tab) */}
      {showAdd && (
        <Card className="animate-fade-up space-y-3 p-5">
          <p className="text-[13px] font-semibold text-ink">Create flashcard</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10.5px] uppercase tracking-widest text-ink-3">Front (question)</label>
              <textarea rows={3} value={newFront} onChange={(e) => setNewFront(e.target.value)}
                placeholder="e.g. What is the doctrine of basic structure?"
                className="w-full resize-none rounded-lg border border-line bg-surface-2 p-2.5 text-[13px] text-ink outline-none focus:border-accent/50" />
            </div>
            <div>
              <label className="mb-1 block text-[10.5px] uppercase tracking-widest text-ink-3">Back (answer)</label>
              <textarea rows={3} value={newBack} onChange={(e) => setNewBack(e.target.value)}
                placeholder="e.g. Kesavananda Bharati 1973 — Parliament cannot amend basic features..."
                className="w-full resize-none rounded-lg border border-line bg-surface-2 p-2.5 text-[13px] text-ink outline-none focus:border-accent/50" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select value={newSubject} onChange={(e) => setNewSubject(e.target.value)}
              className="rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-[12.5px] text-ink outline-none">
              {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
            </select>
            <button onClick={addCard} disabled={adding || !newFront.trim() || !newBack.trim()}
              className="rounded-lg bg-accent px-4 py-1.5 text-[12.5px] font-medium text-white disabled:opacity-50">
              {adding ? "Saving…" : "Save card"}
            </button>
            <button onClick={() => setShowAdd(false)} className="text-[12.5px] text-ink-3 hover:text-ink">Close</button>
            {addError && (
              <span className="flex items-center gap-1.5 rounded-lg border border-danger/40 bg-danger/10 px-2.5 py-1 text-[11.5px] text-danger">
                <AlertTriangle size={12} /> {addError}
              </span>
            )}
          </div>
        </Card>
      )}
      {savedMsg && (
        <div className="animate-fade-up rounded-xl border border-success/40 bg-success/10 px-3.5 py-2 text-[12.5px] text-success">
          <CheckCircle2 size={13} className="mr-1.5 inline" /> {savedMsg}
        </div>
      )}

      {loading && <div className="flex items-center gap-2 py-10 text-ink-3"><Loader2 size={16} className="animate-spin" /> Loading cards…</div>}

      {/* ── TAB: Review due ── */}
      {!loading && tab === "due" && (
        <>
          {cards.length === 0 && (
            <Card className="py-14 text-center">
              <Brain size={32} className="mx-auto mb-3 text-ink-3" />
              <p className="text-[14px] font-semibold text-ink">No cards due right now</p>
              <p className="mt-1 text-[12.5px] text-ink-3">
                {allCards.length > 0
                  ? `All ${allCards.length} cards are scheduled for later — the ladder is working.`
                  : "Add a flashcard to start spaced repetition."}
              </p>
            </Card>
          )}

          {done && (
            <Card className="animate-fade-up py-14 text-center">
              <CheckCircle2 size={40} className="mx-auto mb-3 text-success" />
              <p className="text-[18px] font-semibold text-ink">Session complete!</p>
              <p className="mt-1 text-[13px] text-ink-2">{sessionStats.correct} of {sessionStats.reviewed} correct · Great work, Saurabh.</p>
              <button onClick={() => load()} className="mt-4 rounded-lg bg-accent px-5 py-2 text-[13px] font-medium text-white">Check for more</button>
            </Card>
          )}

          {!done && card && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-[12px] text-ink-3">
                  <span>Card {idx + 1} of {cards.length} · {card.subject ?? "General"}</span>
                  <span>Interval: {card.interval}d · Reviews: {card.reviewCount}</span>
                </div>

                <Card className="min-h-[200px] cursor-pointer p-8 transition-all hover:border-accent/40" onClick={() => setFlipped(!flipped)}>
                  <p className="mb-4 text-[10px] uppercase tracking-[0.2em] text-ink-3">
                    {flipped ? "ANSWER" : "QUESTION — click to reveal"}
                  </p>
                  <p className={cn("font-display text-[18px] leading-relaxed text-ink", flipped && "text-[15px] font-normal leading-loose text-ink-2")}>
                    {flipped ? card.back : card.front}
                  </p>
                  {!flipped && (
                    <div className="mt-6 flex items-center gap-1.5 text-[11.5px] text-ink-3">
                      <ChevronRight size={12} /> Click to flip
                    </div>
                  )}
                </Card>

                {flipped && (
                  <div className="animate-fade-up space-y-2">
                    <p className="text-[11px] uppercase tracking-widest text-ink-3">How well did you recall it?</p>
                    <div className="grid grid-cols-3 gap-2">
                      {GRADES.map((g) => (
                        <button key={g.q} onClick={() => { void grade(g.q); }} disabled={reviewing}
                          className={cn("rounded-xl border px-4 py-3 text-center transition-all hover:scale-[1.02] disabled:opacity-50", g.color)}>
                          <span className="block font-mono text-[18px] font-bold">{g.short}</span>
                          <span className="block text-[11px] uppercase tracking-wider">{g.label}</span>
                        </button>
                      ))}
                    </div>
                    {reviewing && <p className="animate-pulse text-center text-[12px] text-ink-3">Saving…</p>}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Card className="p-4">
                  <p className="mb-2 text-[10.5px] uppercase tracking-widest text-ink-3">SM-2 Schedule</p>
                  <div className="space-y-1.5 text-[12px]">
                    <div className="flex justify-between"><span className="text-ink-3">Ease factor</span><span className="font-mono text-ink">{card.easeFactor.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-ink-3">Interval</span><span className="font-mono text-ink">{card.interval}d</span></div>
                    <div className="flex justify-between"><span className="text-ink-3">Repetitions</span><span className="font-mono text-ink">{card.repetitions}</span></div>
                    <div className="flex justify-between"><span className="text-ink-3">Due</span><span className="font-mono text-ink">{new Date(card.dueAt).toLocaleDateString("en-IN")}</span></div>
                  </div>
                </Card>
                <Card className="p-4">
                  <p className="mb-2 text-[10.5px] uppercase tracking-widest text-ink-3">Grading Guide</p>
                  <div className="space-y-1 text-[11px] text-ink-2">
                    <p><strong className="text-danger">0-2</strong> — Wrong / hard → reset to day 1</p>
                    <p><strong className="text-success">3</strong> — Correct but effortful → progress</p>
                    <p><strong className="text-accent">4-5</strong> — Easy / perfect → long interval</p>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── TAB: All cards (the manager — every save is visible here) ── */}
      {!loading && tab === "all" && (
        <div className="animate-fade-up space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-line bg-surface-2/40 px-3 py-2">
              <Search size={13} className="shrink-0 text-ink-3" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search front or back…"
                className="w-full bg-transparent text-[13px] text-ink placeholder:text-ink-3 focus:outline-none" />
            </div>
            <button onClick={() => setSubjectFilter(null)}
              className={cn("rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider",
                subjectFilter === null ? "border-accent/50 bg-accent/15 text-accent" : "border-line text-ink-3 hover:text-ink")}>
              All
            </button>
            {allSubjects.map((s) => (
              <button key={s} onClick={() => setSubjectFilter(subjectFilter === s ? null : s)}
                className={cn("rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider",
                  subjectFilter === s ? "border-accent/50 bg-accent/15 text-accent" : "border-line text-ink-3 hover:text-ink")}>
                {s}
              </button>
            ))}
          </div>

          {filteredAll.length === 0 && (
            <Card className="py-12 text-center">
              <p className="text-[13px] text-ink-3">{allCards.length === 0 ? "No cards saved yet." : "Nothing matches the filter."}</p>
            </Card>
          )}

          <div className="space-y-1.5">
            {filteredAll.map((c) => {
              const due = new Date(c.dueAt) <= new Date();
              return (
                <div key={c.id} className="flex items-start gap-3 rounded-xl border border-line-subtle px-3.5 py-2.5 transition-colors hover:border-accent/30">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-ink">{c.front}</p>
                    <p className="mt-0.5 line-clamp-1 text-[11.5px] text-ink-3">{c.back}</p>
                    <p className="mt-1 font-mono text-[9.5px] text-ink-3">
                      {c.subject ?? "General"} · {c.reviewCount} reviews · interval {c.interval}d ·
                      {due ? " due now" : ` due ${new Date(c.dueAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
                    </p>
                  </div>
                  <Chip tone={due ? "warning" : "muted"}>{due ? "DUE" : `${c.interval}d`}</Chip>
                  <button onClick={() => removeCard(c)} title="Delete card" className="mt-0.5 text-ink-3 transition-colors hover:text-danger">
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB: Topic ladder (COS macro memory) ── */}
      {!loading && tab === "topics" && (
        <div className="animate-fade-up space-y-3">
          <p className="text-[12px] text-ink-3">
            Whole topics (not facts) on the 1→7→21→60→120-day ladder. Track a topic from the Syllabus page; when it&apos;s due, grade your recall here or on the Sprint Board.
          </p>
          <TopicMemoryPanel />
        </div>
      )}
    </div>
  );
}
