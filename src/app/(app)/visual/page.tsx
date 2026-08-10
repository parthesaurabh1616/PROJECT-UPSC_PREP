"use client";

import { useEffect, useState } from "react";
import { Loader2, Film, Clock, CheckCircle2, AlertTriangle, Anchor, HelpCircle, Target } from "lucide-react";
import { Card, Chip } from "@/components/ui";
import { cn } from "@/lib/utils";

/* Visual Revision Engine — storyboard review.
   There is no rendered video yet. This page exists so the PEDAGOGY can be
   judged before any render effort is spent: scene order, what each beat is
   for, whether the narration explains rather than describes. */

interface Scene {
  n: number; seconds: number; beat: string;
  visual: { primitive: string; props: Record<string, unknown>; motion?: string };
  narration: string; onScreenText?: string[]; emphasis?: string[]; sourceAnchor?: string;
}
interface Board {
  key: string;
  video: string | null;
  videoBytes: number;
  score: { total: number; tier: string; priority: string; archetype: string; reasons: string[] };
  storyboard: {
    topic: string; subject: string; archetype: string; learningObjective: string;
    teachingPlan?: {
      coreProblem: string; simpleExplanation: string; technicalDefinition: string;
      causalChain: string[]; visualMetaphor: string; upscBridge: string;
      priorKnowledgeRequired?: string[];
    };
    totalSeconds: number; scenes: Scene[]; memoryAnchor: string[];
    recallFrame: { prompt: string; answer: string };
    upscApplication: { concept: string; example: string; answerUse: string };
    flags?: string[];
  };
  problems: string[];
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function VisualPage() {
  const [boards, setBoards] = useState<Board[] | null>(null);
  const [active, setActive] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    fetch("/api/visual/storyboards", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setBoards(Array.isArray(j) ? j : []))
      .catch(() => setBoards([]));
  }, []);

  if (boards === null) {
    return <div className="flex items-center gap-2 py-10 text-ink-3"><Loader2 size={16} className="animate-spin" /> Loading storyboards…</div>;
  }
  if (!boards.length) {
    return (
      <Card className="py-12 text-center">
        <Film size={28} className="mx-auto mb-3 text-ink-3" />
        <p className="text-[14px] font-semibold text-ink">No storyboards yet</p>
        <p className="mx-auto mt-1 max-w-[460px] text-[12.5px] text-ink-3">
          Run <span className="font-mono text-ink-2">npx tsx scripts/visual-storyboard.ts</span> to generate them.
        </p>
      </Card>
    );
  }

  const b = boards[active];
  const sb = b.storyboard;

  return (
    <div className="animate-fade-up space-y-4">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">Visual Revision Engine</p>
        <h1 className="mt-1 text-[20px] font-semibold text-ink">Storyboard review</h1>
        <p className="mt-1 max-w-[680px] text-[12.5px] leading-relaxed text-ink-3">
          Not yet rendered — this is the plan for the video. Judge the teaching here, before any animation
          effort is spent: is the scene order right, does every beat earn its place, does the narration
          explain the meaning rather than describe the picture?
        </p>
      </div>

      {/* Board switcher */}
      <div className="flex flex-wrap gap-1.5">
        {boards.map((x, i) => (
          <button key={x.key} onClick={() => { setActive(i); setShowAnswer(false); }}
            className={cn("rounded-lg border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors",
              i === active ? "border-accent/40 bg-accent/15 text-accent" : "border-line text-ink-3 hover:text-ink")}>
            {x.storyboard.subject} · {x.storyboard.topic.slice(0, 34)}
          </button>
        ))}
      </div>

      {/* The video itself, when one has actually been rendered. */}
      {b.video ? (
        <Card className="overflow-hidden p-0">
          <video
            key={b.video}
            src={b.video}
            controls
            playsInline
            preload="metadata"
            className="block w-full bg-black"
            style={{ aspectRatio: "16 / 9" }}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
              {mmss(sb.totalSeconds)} · {(b.videoBytes / 1048576).toFixed(1)} MB · 1920×1080
            </span>
            <a href={b.video} download className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent hover:underline">Download</a>
          </div>
        </Card>
      ) : (
        <Card className="py-8 text-center">
          <p className="text-[13px] text-ink-2">Not rendered yet</p>
          <p className="mt-1 text-[12px] text-ink-3">
            Run <span className="font-mono text-ink-2">npx tsx scripts/render-video.ts {b.key}</span>
          </p>
        </Card>
      )}

      {/* Why this video? (directive §53) */}
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-ink">{sb.topic}</p>
            <p className="mt-1 text-[12.5px] text-ink-2">{sb.learningObjective}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Chip tone="accent">{b.score.priority}</Chip>
            <Chip tone="accent-2">{b.score.archetype.replace(/_/g, " ")}</Chip>
            <span className="flex items-center gap-1 font-mono text-[11px] text-ink-3"><Clock size={11} /> {mmss(sb.totalSeconds)}</span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line-subtle pt-3">
          <span className="font-mono text-[9.5px] uppercase tracking-widest text-ink-3">Why visualised — {b.score.total}/100</span>
          {b.score.reasons.map((r) => <Chip key={r} tone="accent-2">{r}</Chip>)}
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[11.5px]">
          {b.problems.length === 0
            ? <span className="flex items-center gap-1.5 text-success"><CheckCircle2 size={12} /> QA passed</span>
            : <span className="flex items-center gap-1.5 text-danger"><AlertTriangle size={12} /> {b.problems.length} QA issue(s): {b.problems.join(" · ")}</span>}
          {sb.flags?.length ? <span className="ml-2 text-warning">⚠ {sb.flags.join(" · ")}</span> : null}
        </div>
      </Card>

      {/* Teaching plan — if this reads as confusing, the video will be too. */}
      {sb.teachingPlan && (
        <Card className="space-y-3 p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">Teaching plan</p>
          {([
            ["The problem", sb.teachingPlan.coreProblem],
            ["In plain words", sb.teachingPlan.simpleExplanation],
            ["Technically", sb.teachingPlan.technicalDefinition],
            ["Visual metaphor", sb.teachingPlan.visualMetaphor],
            ["In the exam", sb.teachingPlan.upscBridge],
          ] as const).filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="flex flex-col gap-1 sm:flex-row sm:gap-4">
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-ink-3 sm:w-[140px] sm:pt-1">{k}</span>
              <span className="text-[12.5px] leading-relaxed text-ink-2">{v}</span>
            </div>
          ))}
          {sb.teachingPlan.causalChain?.length ? (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-line-subtle pt-3">
              {sb.teachingPlan.causalChain.map((c, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <Chip tone="accent">{c}</Chip>
                  {i < sb.teachingPlan!.causalChain.length - 1 && <span className="text-ink-3">→</span>}
                </span>
              ))}
            </div>
          ) : null}
        </Card>
      )}

      {/* Scenes */}
      <div className="space-y-2">
        {sb.scenes.map((s) => {
          const silent = s.visual.primitive === "RECALL_FRAME" || s.visual.primitive === "MEMORY_ANCHOR";
          return (
            <Card key={s.n} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 shrink-0 text-center">
                  <p className="font-mono text-[15px] font-semibold text-accent">{String(s.n).padStart(2, "0")}</p>
                  <p className="font-mono text-[9.5px] text-ink-3">{s.seconds}s</p>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Chip tone="accent">{s.visual.primitive.replace(/_/g, " ")}</Chip>
                    {s.visual.motion && <span className="font-mono text-[10px] text-ink-3">{s.visual.motion}</span>}
                  </div>
                  <p className="mt-2 text-[12.5px] text-ink-2"><span className="text-ink-3">Beat — </span>{s.beat}</p>
                  {silent
                    ? <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-ink-3">— silent by design —</p>
                    : <p className="mt-2 border-l-2 border-accent/30 pl-3 text-[13px] leading-relaxed text-ink">{s.narration}</p>}
                  {s.onScreenText?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {s.onScreenText.map((t, i) => <Chip key={i} tone="accent-2">{t}</Chip>)}
                    </div>
                  ) : null}
                  <details className="mt-2">
                    <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-widest text-ink-3 hover:text-ink">visual props</summary>
                    <pre className="mt-1.5 overflow-x-auto rounded-lg bg-surface-2/60 p-2.5 text-[11px] leading-relaxed text-ink-2">
{JSON.stringify(s.visual.props, null, 2)}</pre>
                  </details>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Recall + memory anchor + UPSC */}
      <Card className="space-y-3 p-4">
        <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3"><HelpCircle size={11} className="text-accent" /> Active recall</p>
        <p className="text-[13px] text-ink">{sb.recallFrame.prompt}</p>
        {showAnswer
          ? <p className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-[12.5px] text-ink-2">{sb.recallFrame.answer}</p>
          : <button onClick={() => setShowAnswer(true)} className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-[12px] text-accent hover:bg-accent/20">Reveal</button>}
      </Card>

      <Card className="p-4">
        <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3"><Anchor size={11} className="text-accent-2" /> Memory anchor</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {sb.memoryAnchor.map((m, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <Chip tone="accent-2">{m}</Chip>
              {i < sb.memoryAnchor.length - 1 && <span className="text-ink-3">→</span>}
            </span>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3"><Target size={11} className="text-accent" /> UPSC application</p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">{sb.upscApplication.answerUse}</p>
      </Card>
    </div>
  );
}
