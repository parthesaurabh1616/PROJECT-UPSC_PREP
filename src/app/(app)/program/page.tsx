"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Rocket, Loader2, Plus, Trash2, CheckCircle2, Circle, Flame, Save, History, ListChecks, Gauge, ArrowUpRight,
} from "lucide-react";
import { Card, Chip, Bar } from "@/components/ui";
import { cn } from "@/lib/utils";

/* Sprint Board — the Agile program OS. Metric tasks track themselves from
   the real activity ledger; manual tasks are honest checkboxes. */

interface TaskT {
  id: string; title: string; metric: string; target: number; done: boolean;
  progress: number; complete: boolean; metricLabel: string | null;
}
interface CurrentT {
  id: string; goal: string; retro: string | null; startsAt: string; endsAt: string;
  dayOfSprint: number; days: number; tasks: TaskT[]; completed: number; total: number;
  velocity: { focusMinutes: number; events: Record<string, number>; daily: { day: number; minutes: number }[] };
}
interface HistoryT { id: string; goal: string; retro: string | null; startsAt: string; endsAt: string; completed: number; total: number; focusMinutes: number }
interface Data { current: CurrentT | null; history: HistoryT[]; metricKeys: string[] }

const METRIC_LABEL: Record<string, string> = {
  manual: "checkbox", answers: "answers", pyq: "PYQs", ncert: "chapters", ca: "affairs read",
  revision: "cards reviewed", focus: "focus min", tests: "tests", notes: "notes",
};

/* Where each AUTO metric gets earned — clicking the task opens the tool. */
const METRIC_LINK: Record<string, string> = {
  answers: "/answers", pyq: "/pyq", ncert: "/ncert", ca: "/current-affairs",
  revision: "/revision", focus: "/command", tests: "/tests", notes: "/notes",
};

/* Sprint-1 template from the program charter (P0 · Foundation). */
const TEMPLATE = [
  { title: "Write & evaluate answers in the Answer Lab", metric: "answers", target: 6 },
  { title: "Prelims PYQs from the corpus", metric: "pyq", target: 40 },
  { title: "NCERT chapters (Democratic Politics I–II)", metric: "ncert", target: 8 },
  { title: "Revision cards reviewed (queue → zero daily)", metric: "revision", target: 100 },
  { title: "Current-affairs briefs read", metric: "ca", target: 30 },
  { title: "Deep-work focus minutes", metric: "focus", target: 1800 },
  { title: "Optional decision memo (Sociology vs PSIR) in Notes", metric: "manual", target: 1 },
];

export default function ProgramPage() {
  const router = useRouter();
  const [d, setD] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [retro, setRetro] = useState("");

  // planner state
  const [goal, setGoal] = useState("");
  const [rows, setRows] = useState<{ title: string; metric: string; target: number }[]>([]);

  const load = useCallback(() => {
    fetch("/api/program", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: Data) => { setD(j); setRetro(j.current?.retro ?? ""); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const patch = async (body: object) => { setBusy(true); await fetch("/api/program", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => {}); setBusy(false); load(); };

  /* Manual toggle — optimistic: the check flips instantly, then syncs. */
  const toggleManual = (t: TaskT) => {
    const next = !t.done;
    setD((prev) => {
      if (!prev?.current) return prev;
      const tasks = prev.current.tasks.map((x) => (x.id === t.id ? { ...x, done: next, progress: next ? 1 : 0, complete: next } : x));
      return { ...prev, current: { ...prev.current, tasks, completed: tasks.filter((x) => x.complete).length } };
    });
    fetch("/api/program", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taskId: t.id, done: next }) })
      .catch(() => {})
      .finally(load);
  };

  /* Row click: manual → toggle; auto → open the tool that earns the metric. */
  const rowClick = (t: TaskT) => {
    if (t.metric === "manual") toggleManual(t);
    else router.push(METRIC_LINK[t.metric] ?? "/command");
  };

  const plan = async () => {
    if (!goal.trim() || rows.length === 0) return;
    setBusy(true);
    await fetch("/api/program", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goal, tasks: rows }) }).catch(() => {});
    setBusy(false); setGoal(""); setRows([]); load();
  };

  if (loading) return <div className="flex items-center gap-2 py-20 text-ink-3"><Loader2 size={16} className="animate-spin" /> Loading the board…</div>;
  if (!d) return <div className="py-20 text-ink-3">Couldn&apos;t load the board.</div>;

  const c = d.current;
  const maxDaily = c ? Math.max(60, ...c.velocity.daily.map((x) => x.minutes)) : 60;

  return (
    <div className="mx-auto max-w-[1000px]">
      <div className="mb-4 animate-fade-up">
        <h2 className="flex items-center gap-2 font-display text-[24px] font-semibold tracking-tight text-ink">
          <Rocket size={18} className="text-accent" /> Sprint Board
        </h2>
        <p className="mt-0.5 text-[12.5px] text-ink-3">
          One week, one sprint. Metric tasks track themselves from your real activity — the board can&apos;t be gamed.
        </p>
      </div>

      {c ? (
        <>
          {/* Active sprint header */}
          <Card className="mb-4 animate-fade-up p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-ink-3">Active sprint · day {c.dayOfSprint} of {c.days}</p>
                <p className="mt-0.5 font-display text-[17px] font-semibold text-ink">{c.goal}</p>
              </div>
              <div className="text-right">
                <p className="font-display text-[22px] font-bold text-accent">{c.completed}<span className="text-[13px] text-ink-3">/{c.total}</span></p>
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-3">tasks complete</p>
              </div>
            </div>
            <Bar value={c.total ? Math.round((c.completed / c.total) * 100) : 0} className="mt-3" />
          </Card>

          {/* Tasks */}
          <Card className="mb-4 animate-fade-up p-5">
            <p className="mb-3 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-2"><ListChecks size={13} className="text-accent" /> Sprint backlog</p>
            <div className="space-y-2.5">
              {c.tasks.map((t) => (
                <div
                  key={t.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => rowClick(t)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); rowClick(t); } }}
                  title={t.metric === "manual" ? "Click to check off" : `Auto-tracked — click to open ${METRIC_LINK[t.metric] ?? "the tool"} and earn it`}
                  className="group flex cursor-pointer items-center gap-3 rounded-xl border border-line-subtle px-3 py-2.5 transition-colors hover:border-accent/40 hover:bg-surface-2/40"
                >
                  <span className="shrink-0">
                    {t.complete ? <CheckCircle2 size={17} className="text-success" /> : <Circle size={17} className={cn("text-ink-3", t.metric === "manual" && "group-hover:text-accent")} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-[13px]", t.complete ? "text-ink-3 line-through" : "text-ink")}>{t.title}</p>
                    {t.metric !== "manual" && (
                      <div className="mt-1 flex items-center gap-2">
                        <Bar value={Math.min(100, Math.round((t.progress / t.target) * 100))} className="h-1 flex-1" />
                        <span className="shrink-0 font-mono text-[10px] tabular-nums text-ink-3">{t.progress}/{t.target} {METRIC_LABEL[t.metric] ?? t.metric}</span>
                      </div>
                    )}
                  </div>
                  {t.metric !== "manual" && (
                    <span className="hidden shrink-0 items-center gap-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-accent opacity-0 transition-opacity group-hover:opacity-100 sm:flex">
                      open <ArrowUpRight size={11} />
                    </span>
                  )}
                  <Chip tone={t.metric === "manual" ? "muted" : "accent"}>{t.metric === "manual" ? "tap ✓" : "auto"}</Chip>
                  <button
                    onClick={(e) => { e.stopPropagation(); patch({ taskId: t.id, remove: true }); }}
                    disabled={busy}
                    className="text-ink-3 transition-colors hover:text-danger"
                    title="Remove task"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <AddTask onAdd={(t) => patch({ sprintId: c.id, addTask: t })} busy={busy} />
          </Card>

          {/* Velocity */}
          <Card className="mb-4 animate-fade-up p-5">
            <p className="mb-3 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-2"><Gauge size={13} className="text-accent-2" /> Velocity (real, this sprint)</p>
            <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1.5 font-mono text-[11px] text-ink-2">
              <span className="flex items-center gap-1.5"><Flame size={12} className="text-warning" /> {c.velocity.focusMinutes} focus min</span>
              {Object.entries(c.velocity.events).filter(([k]) => k !== "STUDY_SESSION").map(([k, v]) => (
                <span key={k}>{v} × {k.toLowerCase().replace(/_/g, " ")}</span>
              ))}
              {Object.keys(c.velocity.events).length === 0 && <span className="text-ink-3">no activity yet — the ledger fills this as you work</span>}
            </div>
            <p className="mb-1 font-mono text-[9px] uppercase tracking-wider text-ink-3">Daily focus minutes</p>
            <div className="flex h-16 items-end gap-1">
              {c.velocity.daily.map((day) => (
                <div key={day.day} className="flex flex-1 flex-col items-center gap-1">
                  <div className="w-full rounded-t bg-gradient-to-t from-accent/70 to-accent-2/70" style={{ height: `${Math.max(2, (day.minutes / maxDaily) * 56)}px` }} title={`${day.minutes} min`} />
                  <span className="font-mono text-[8.5px] text-ink-3">D{day.day}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Retro */}
          <Card className="mb-4 animate-fade-up p-5">
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-2">Retrospective — keep / drop / try</p>
            <textarea value={retro} onChange={(e) => setRetro(e.target.value)} rows={3}
              placeholder="Keep: … · Drop: … · Try next sprint: …"
              className="w-full resize-y rounded-xl border border-line bg-surface-2/40 px-3 py-2 text-[13px] text-ink placeholder:text-ink-3 focus:border-accent/50 focus:outline-none" />
            <button onClick={() => patch({ sprintId: c.id, retro })} disabled={busy}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3.5 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-accent transition-colors hover:bg-accent/20">
              <Save size={12} /> Save retro
            </button>
          </Card>
        </>
      ) : (
        /* Planner */
        <Card className="mb-4 animate-fade-up p-5">
          <p className="mb-1 text-[13px] font-semibold text-ink">No sprint running — plan this week</p>
          <p className="mb-3 text-[11.5px] text-ink-3">Set the goal, load the charter template or add your own tasks. Metric tasks auto-complete from your real activity.</p>
          <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Sprint goal — e.g. GS-II class-sync + optional decision"
            className="mb-3 w-full rounded-xl border border-line bg-surface-2/40 px-3 py-2 text-[13px] text-ink placeholder:text-ink-3 focus:border-accent/50 focus:outline-none" />
          <button onClick={() => { setRows(TEMPLATE); if (!goal) setGoal("Sprint 1 · GS-II foundation + optional decision"); }}
            className="mb-3 inline-flex items-center gap-1.5 rounded-lg border border-accent-2/40 bg-accent-2/10 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-accent-2 transition-colors hover:bg-accent-2/20">
            <Plus size={12} /> Load charter template (Sprint 1)
          </button>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={r.title} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                  className="flex-1 rounded-lg border border-line bg-surface-2/40 px-2.5 py-1.5 text-[12.5px] text-ink focus:border-accent/50 focus:outline-none" />
                <select value={r.metric} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, metric: e.target.value } : x)))}
                  className="rounded-lg border border-line bg-surface-2/60 px-2 py-1.5 text-[11.5px] text-ink-2 focus:outline-none">
                  {(d.metricKeys ?? []).map((k) => <option key={k} value={k}>{METRIC_LABEL[k] ?? k}</option>)}
                </select>
                {r.metric !== "manual" && (
                  <input type="number" value={r.target} min={1} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, target: Number(e.target.value) || 1 } : x)))}
                    className="w-20 rounded-lg border border-line bg-surface-2/40 px-2 py-1.5 text-[12px] text-ink focus:outline-none" />
                )}
                <button onClick={() => setRows(rows.filter((_, j) => j !== i))} className="text-ink-3 hover:text-danger"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button onClick={() => setRows([...rows, { title: "", metric: "manual", target: 1 }])}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-2 transition-colors hover:border-accent/40 hover:text-ink">
              <Plus size={12} /> Add task
            </button>
            <button onClick={plan} disabled={busy || !goal.trim() || rows.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-4 py-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white transition-all hover:brightness-110 disabled:opacity-40">
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Rocket size={12} />} Start sprint
            </button>
          </div>
        </Card>
      )}

      {/* History */}
      {d.history.length > 0 && (
        <Card className="animate-fade-up p-5">
          <p className="mb-3 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-2"><History size={13} className="text-ink-3" /> Past sprints</p>
          <div className="space-y-2">
            {d.history.map((h) => (
              <div key={h.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line-subtle px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] text-ink">{h.goal}</p>
                  <p className="font-mono text-[9.5px] text-ink-3">{new Date(h.startsAt).toLocaleDateString()} – {new Date(h.endsAt).toLocaleDateString()}{h.retro ? " · retro ✓" : ""}</p>
                </div>
                <div className="flex items-center gap-3 font-mono text-[10.5px] text-ink-2">
                  <span>{h.completed}/{h.total} tasks</span>
                  <span className="flex items-center gap-1"><Flame size={11} className="text-warning" /> {h.focusMinutes} min</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function AddTask({ onAdd, busy }: { onAdd: (t: { title: string; metric: string; target: number }) => void; busy: boolean }) {
  const [title, setTitle] = useState("");
  const [metric, setMetric] = useState("manual");
  const [target, setTarget] = useState(1);
  return (
    <div className="mt-3 flex items-center gap-2 border-t border-line-subtle pt-3">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task mid-sprint…"
        className="flex-1 rounded-lg border border-line bg-surface-2/40 px-2.5 py-1.5 text-[12.5px] text-ink placeholder:text-ink-3 focus:border-accent/50 focus:outline-none" />
      <select value={metric} onChange={(e) => setMetric(e.target.value)} className="rounded-lg border border-line bg-surface-2/60 px-2 py-1.5 text-[11.5px] text-ink-2 focus:outline-none">
        {Object.keys(METRIC_LABEL).map((k) => <option key={k} value={k}>{METRIC_LABEL[k]}</option>)}
      </select>
      {metric !== "manual" && (
        <input type="number" value={target} min={1} onChange={(e) => setTarget(Number(e.target.value) || 1)}
          className="w-20 rounded-lg border border-line bg-surface-2/40 px-2 py-1.5 text-[12px] text-ink focus:outline-none" />
      )}
      <button disabled={busy || !title.trim()} onClick={() => { onAdd({ title, metric, target }); setTitle(""); }}
        className="inline-flex items-center gap-1 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-accent transition-colors hover:bg-accent/20 disabled:opacity-40">
        <Plus size={12} /> Add
      </button>
    </div>
  );
}
