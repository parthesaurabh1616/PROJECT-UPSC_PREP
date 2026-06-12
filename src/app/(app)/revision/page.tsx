"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Brain, Loader2, CheckCircle2, ChevronRight } from "lucide-react";
import { Card, Chip } from "@/components/ui";
import { cn } from "@/lib/utils";

interface RevisionCard {
  id: string; front: string; back: string; subject: string | null;
  interval: number; repetitions: number; easeFactor: number;
  dueAt: string; reviewCount: number;
}

const GRADES = [
  { q: 0 as const, label: "Blackout", color: "bg-danger/20 text-danger border-danger/30", short: "0" },
  { q: 1 as const, label: "Wrong", color: "bg-danger/10 text-danger/80 border-danger/20", short: "1" },
  { q: 2 as const, label: "Hard", color: "bg-warning/10 text-warning border-warning/30", short: "2" },
  { q: 3 as const, label: "Good", color: "bg-success/10 text-success border-success/30", short: "3" },
  { q: 4 as const, label: "Easy", color: "bg-accent/10 text-accent border-accent/30", short: "4" },
  { q: 5 as const, label: "Perfect", color: "bg-accent-2/10 text-accent-2 border-accent-2/30", short: "5" },
];

const SUBJECTS = ["Polity", "History", "Geography", "Economy", "Environment", "Ethics", "Current Affairs", "Science & Tech"];

export default function RevisionPage() {
  const [cards, setCards] = useState<RevisionCard[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [done, setDone] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [newSubject, setNewSubject] = useState("Polity");
  const [adding, setAdding] = useState(false);
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0 });

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/revision/cards")
      .then((r) => r.json())
      .then((data: RevisionCard[]) => {
        setCards(Array.isArray(data) ? data : []);
        setIdx(0); setFlipped(false); setDone(false);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const grade = useCallback(async (q: 0 | 1 | 2 | 3 | 4 | 5) => {
    if (reviewing || cards.length === 0) return;
    setReviewing(true);
    const card = cards[idx];
    await fetch("/api/revision/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: card.id, quality: q }),
    });
    setSessionStats((s) => ({ reviewed: s.reviewed + 1, correct: s.correct + (q >= 3 ? 1 : 0) }));
    setReviewing(false);
    setFlipped(false);
    if (idx + 1 >= cards.length) setDone(true);
    else setIdx((i) => i + 1);
  }, [reviewing, cards, idx]);

  const addCard = async () => {
    if (!newFront.trim() || !newBack.trim()) return;
    setAdding(true);
    await fetch("/api/revision/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ front: newFront, back: newBack, subject: newSubject }),
    });
    setNewFront(""); setNewBack(""); setAdding(false); setShowAdd(false);
    load();
  };

  const card = cards[idx];

  return (
    <div className="mx-auto max-w-[1280px] space-y-5">
      <div className="flex animate-fade-up flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[24px] font-semibold tracking-tight text-ink">Revision Engine</h2>
          <p className="mt-0.5 text-[12.5px] text-ink-3">
            {cards.length} cards due · SM-2 spaced repetition · {sessionStats.reviewed} reviewed this session
          </p>
        </div>
        <div className="flex gap-2">
          {sessionStats.reviewed > 0 && (
            <Chip tone="success">{sessionStats.correct}/{sessionStats.reviewed} correct</Chip>
          )}
          <button onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-[12px] text-accent hover:bg-accent/20">
            <Plus size={13} /> Add card
          </button>
        </div>
      </div>

      {showAdd && (
        <Card className="animate-fade-up p-5 space-y-3">
          <p className="text-[13px] font-semibold text-ink">Create flashcard</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10.5px] uppercase tracking-widest text-ink-3 mb-1 block">Front (question)</label>
              <textarea rows={3} value={newFront} onChange={(e) => setNewFront(e.target.value)}
                placeholder="e.g. What is the doctrine of basic structure?"
                className="w-full rounded-lg border border-line bg-surface-2 p-2.5 text-[13px] text-ink outline-none focus:border-accent/50 resize-none" />
            </div>
            <div>
              <label className="text-[10.5px] uppercase tracking-widest text-ink-3 mb-1 block">Back (answer)</label>
              <textarea rows={3} value={newBack} onChange={(e) => setNewBack(e.target.value)}
                placeholder="e.g. Kesavananda Bharati 1973 — Parliament cannot amend basic features..."
                className="w-full rounded-lg border border-line bg-surface-2 p-2.5 text-[13px] text-ink outline-none focus:border-accent/50 resize-none" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select value={newSubject} onChange={(e) => setNewSubject(e.target.value)}
              className="rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-[12.5px] text-ink outline-none">
              {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
            </select>
            <button onClick={addCard} disabled={adding || !newFront.trim() || !newBack.trim()}
              className="rounded-lg bg-accent px-4 py-1.5 text-[12.5px] font-medium text-white disabled:opacity-50">
              {adding ? "Adding..." : "Add card"}
            </button>
            <button onClick={() => setShowAdd(false)} className="text-[12.5px] text-ink-3 hover:text-ink">Cancel</button>
          </div>
        </Card>
      )}

      {loading && <div className="flex items-center gap-2 py-10 text-ink-3"><Loader2 size={16} className="animate-spin" /> Loading cards...</div>}

      {!loading && cards.length === 0 && (
        <Card className="py-14 text-center">
          <Brain size={32} className="mx-auto mb-3 text-ink-3" />
          <p className="text-[14px] font-semibold text-ink">No cards due right now</p>
          <p className="mt-1 text-[12.5px] text-ink-3">Add some flashcards to get started with spaced repetition.</p>
        </Card>
      )}

      {!loading && done && (
        <Card className="py-14 text-center animate-fade-up">
          <CheckCircle2 size={40} className="mx-auto mb-3 text-success" />
          <p className="text-[18px] font-semibold text-ink">Session complete!</p>
          <p className="mt-1 text-[13px] text-ink-2">{sessionStats.correct} of {sessionStats.reviewed} correct · Great work, Saurabh.</p>
          <button onClick={load} className="mt-4 rounded-lg bg-accent px-5 py-2 text-[13px] font-medium text-white">Review again</button>
        </Card>
      )}

      {!loading && !done && card && (
        <div className="grid grid-cols-[1fr_300px] gap-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-[12px] text-ink-3">
              <span>Card {idx + 1} of {cards.length} · {card.subject ?? "General"}</span>
              <span>Interval: {card.interval}d · Reviews: {card.reviewCount}</span>
            </div>

            <Card className="min-h-[200px] cursor-pointer p-8 transition-all hover:border-accent/40" onClick={() => setFlipped(!flipped)}>
              <p className="text-[10px] uppercase tracking-[0.2em] text-ink-3 mb-4">
                {flipped ? "ANSWER" : "QUESTION — click to reveal"}
              </p>
              <p className={cn("text-[18px] leading-relaxed text-ink font-display", flipped && "font-normal text-[15px] leading-loose text-ink-2")}>
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
                      <span className="block text-[18px] font-bold font-mono">{g.short}</span>
                      <span className="block text-[11px] uppercase tracking-wider">{g.label}</span>
                    </button>
                  ))}
                </div>
                {reviewing && <p className="text-center text-[12px] text-ink-3 animate-pulse">Saving...</p>}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Card className="p-4">
              <p className="text-[10.5px] uppercase tracking-widest text-ink-3 mb-2">SM-2 Schedule</p>
              <div className="space-y-1.5 text-[12px]">
                <div className="flex justify-between"><span className="text-ink-3">Ease factor</span><span className="text-ink font-mono">{card.easeFactor.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-ink-3">Interval</span><span className="text-ink font-mono">{card.interval}d</span></div>
                <div className="flex justify-between"><span className="text-ink-3">Repetitions</span><span className="text-ink font-mono">{card.repetitions}</span></div>
                <div className="flex justify-between"><span className="text-ink-3">Due</span><span className="text-ink font-mono">{new Date(card.dueAt).toLocaleDateString("en-IN")}</span></div>
              </div>
            </Card>
            <Card className="p-4">
              <p className="text-[10.5px] uppercase tracking-widest text-ink-3 mb-2">Grading Guide</p>
              <div className="space-y-1 text-[11px] text-ink-2">
                <p><strong className="text-danger">0-2</strong> — Wrong / hard → reset to day 1</p>
                <p><strong className="text-success">3</strong> — Correct but effortful → progress</p>
                <p><strong className="text-accent">4-5</strong> — Easy / perfect → long interval</p>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
