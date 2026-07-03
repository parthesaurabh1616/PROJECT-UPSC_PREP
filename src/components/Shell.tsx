"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Sparkles, FileText, Newspaper, RotateCcw, Library,
  Sun, Moon, Flame, Command, CornerDownLeft, Search, RefreshCw, Loader2,
  TrendingUp, Radio, Network, BookOpen, Target, Settings, PenLine, ClipboardCheck, CalendarRange, BookMarked, Scale, Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";
import { StatusDot } from "@/components/ui";
import { user } from "@/lib/data";
import { MiniGlobe } from "@/components/MiniGlobe";
import { ExamSwitcher } from "@/components/ExamSwitcher";

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  badge?: string;
}

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Workspace",
    items: [
      { label: "Dashboard",       href: "/command",        icon: LayoutDashboard },
      { label: "Command Center",  href: "/exam",            icon: Command },
      { label: "Sprint Board",    href: "/program",         icon: Rocket },
      { label: "Weekly Review",   href: "/review",          icon: CalendarRange },
      { label: "AI Mentor",       href: "/mentor",          icon: Sparkles, badge: "AI" },
      { label: "Notes",           href: "/notes",           icon: FileText },
      { label: "Current Affairs", href: "/current-affairs", icon: Newspaper },
      { label: "Live Actions",    href: "/intelligence",    icon: Radio, badge: "LIVE" },
      { label: "Knowledge Hub",   href: "/knowledge",       icon: Network },
      { label: "Syllabus",        href: "/syllabus",        icon: BookMarked },
      { label: "Optional Decision",href: "/optional",        icon: Scale, badge: "AI" },
      { label: "NCERT Library",   href: "/ncert",           icon: BookOpen },
      { label: "PYQ Intelligence",href: "/pyq",             icon: Target, badge: "AI" },
      { label: "Answer Lab",      href: "/answers",         icon: PenLine, badge: "AI" },
      { label: "Test Arena",      href: "/tests",           icon: ClipboardCheck, badge: "AI" },
      { label: "Revision",        href: "/revision",        icon: RotateCcw },
      { label: "Library",         href: "/library",         icon: Library },
    ],
  },
];

const PAGE_META: Record<string, { eyebrow: string; title: string }> = {
  "/command":         { eyebrow: "COMMAND CENTER",    title: "Dashboard" },
  "/exam":            { eyebrow: "EXAM INTELLIGENCE",  title: "UPSC Command Center" },
  "/program":         { eyebrow: "PROGRAM OS",          title: "Sprint Board" },
  "/review":          { eyebrow: "WEEKLY REVIEW",      title: "Your Week" },
  "/mentor":          { eyebrow: "AI MENTOR",          title: "Strategist" },
  "/notes":           { eyebrow: "KNOWLEDGE VAULT",    title: "Notes" },
  "/current-affairs": { eyebrow: "INTELLIGENCE FEED",  title: "Current Affairs" },
  "/intelligence":    { eyebrow: "COMMAND CENTER",     title: "Live Actions" },
  "/knowledge":       { eyebrow: "KNOWLEDGE GRAPH",    title: "Knowledge Hub" },
  "/syllabus":        { eyebrow: "SYLLABUS INTELLIGENCE", title: "Official UPSC Syllabus" },
  "/optional":        { eyebrow: "OPTIONAL DECISION",   title: "Sociology · PSIR · Public Administration" },
  "/ncert":           { eyebrow: "DIGITAL LIBRARY",    title: "NCERT Library" },
  "/pyq":             { eyebrow: "PYQ INTELLIGENCE",   title: "Past Papers Decoded" },
  "/answers":         { eyebrow: "MAINS ANSWER LAB",   title: "Answer Evaluation" },
  "/tests":           { eyebrow: "PRELIMS ARENA",       title: "Test Series" },
  "/revision":        { eyebrow: "REVISION ENGINE",    title: "Spaced Repetition" },
  "/settings":        { eyebrow: "CONFIGURATION",       title: "Settings" },
  "/library":         { eyebrow: "ARCHIVE",            title: "Library" },
};

/* ── Global Intelligence widget (topbar) ─────────────────────── */
function GlobalIntelligence() {
  const [total,    setTotal]    = useState<number | null>(null);
  const [high,     setHigh]     = useState(0);
  const [syncing,  setSyncing]  = useState(false);
  const [syncDone, setSyncDone] = useState("");
  const isAffairs = usePathname() === "/current-affairs";

  useEffect(() => {
    fetch("/api/affairs")
      .then((r) => r.json())
      .then((d: unknown) => {
        if (!Array.isArray(d)) return;
        setTotal(d.length);
        setHigh((d as { priority: string }[]).filter((a) => a.priority === "high").length);
      })
      .catch(() => {});
  }, [syncing]);

  const sync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true); setSyncDone("");
    try {
      const res = await fetch("/api/affairs/ingest", { method: "POST" });
      const d   = await res.json() as { ingested?: number; error?: string };
      setSyncDone(d.error ? "Key needed" : `+${d.ingested ?? 0} new`);
    } catch { setSyncDone("Failed"); }
    setSyncing(false);
    setTimeout(() => setSyncDone(""), 4000);
  }, [syncing]);

  return (
    <div className="flex items-center gap-2">
      {/* Globe + stats */}
      <Link
        href="/current-affairs"
        className="group flex items-center gap-2.5 rounded-xl border border-line bg-surface/60 px-3 py-1.5 backdrop-blur transition-all hover:border-accent/40 hover:bg-surface"
      >
        <MiniGlobe size={36} />

        <div className="min-w-0">
          <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-ink-3 leading-none">
            Global Intelligence
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-display text-[14px] font-semibold leading-none text-ink">
              {total === null ? "—" : total}
            </span>
            <span className="font-mono text-[9.5px] text-ink-3">signals</span>
            {high > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-danger/15 px-1.5 py-0.5 font-mono text-[9px] text-danger">
                <TrendingUp size={9} />
                {high} priority
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Sync button — always visible (not just on affairs page) */}
      <button
        onClick={() => { void sync(); }}
        disabled={syncing}
        title="Sync latest news"
        className={cn(
          "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-all disabled:opacity-60",
          isAffairs
            ? "border-accent/50 bg-accent/12 text-accent hover:bg-accent/20"
            : "border-line bg-surface/60 text-ink-3 hover:border-accent/40 hover:text-accent",
        )}
      >
        {syncing ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
        <span className="hidden sm:inline">{syncDone || (syncing ? "Syncing…" : "Sync")}</span>
      </button>
    </div>
  );
}

/* ── Shell ───────────────────────────────────────────────────── */
export function Shell({ children }: { children: ReactNode }) {
  const pathname       = usePathname();
  const { theme, toggle } = useTheme();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const meta = PAGE_META[pathname] ?? { eyebrow: "CONQUER CAPITAL", title: "Workspace" };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen((v) => !v); }
      if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative z-[1] grid h-screen grid-cols-[240px_1fr] grid-rows-[56px_1fr] overflow-hidden">

      {/* ── SIDEBAR ── */}
      <aside className="row-span-2 flex flex-col overflow-y-auto border-r border-line bg-surface/60 px-3 py-4 backdrop-blur-xl">

        <Link href="/command" className="mb-4 flex items-center gap-2.5 border-b border-line-subtle px-2 pb-4">
          <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-gradient-to-br from-accent/30 via-accent-2/30 to-analyt/30 font-display text-[13px] font-bold text-ink">
            <span className="relative z-10">CC</span>
            <span className="absolute inset-0 rounded-xl bg-gradient-to-br from-accent/20 to-accent-2/20 blur-md" />
          </span>
          <div>
            <p className="font-display text-[14px] font-semibold tracking-tight text-ink leading-none">
              Conquer <span className="text-accent">Capital</span>
            </p>
            <p className="mt-1 font-mono text-[8.5px] uppercase tracking-[0.22em] text-ink-3">
              <StatusDot variant="green" className="mr-1" /> conquercapital.in
            </p>
          </div>
        </Link>

        {/* Exam switcher — UPSC / MPSC / future PCS */}
        <ExamSwitcher />

        <nav className="flex-1">
          {NAV.map((group) => (
            <div key={group.section} className="mb-2">
              <p className="px-2.5 pb-1.5 pt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-ink-3">
                {group.section}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  const Icon   = item.icon;
                  return (
                    <Link key={item.label} href={item.href}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-mono text-[11px] uppercase tracking-[0.14em] transition-all",
                        active ? "bg-gradient-to-r from-accent/14 to-transparent text-ink" : "text-ink-2 hover:bg-surface-2/60 hover:text-ink",
                      )}>
                      {active && <span className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-gradient-to-b from-accent to-gold" />}
                      <Icon size={14} className={cn("shrink-0", active ? "text-accent" : "opacity-60")} />
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto rounded border border-analyt/40 bg-analyt/10 px-1.5 py-[1px] font-mono text-[8px] font-bold tracking-wider text-analyt">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-line-subtle pt-3">
          <StreakBadge />
        </div>
      </aside>

      {/* ── TOPBAR ── */}
      <header className="z-10 flex items-center gap-3 border-b border-line bg-bg/80 px-5 backdrop-blur-2xl">

        {/* Page title */}
        <div className="min-w-0 shrink-0">
          <p className="eyebrow flex items-center gap-1.5 leading-none">
            <StatusDot variant="amber" />
            {meta.eyebrow}
          </p>
          <h1 className="truncate font-display text-[17px] font-semibold leading-tight tracking-tight text-ink">
            {meta.title}
          </h1>
        </div>

        <div className="mx-3 h-8 w-px shrink-0 bg-line" />

        {/* ── Global Intelligence — globe + signal count + sync ── */}
        <GlobalIntelligence />

        {/* ── Live Actions — intelligence command center ── */}
        <Link href="/intelligence"
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-all",
            pathname === "/intelligence"
              ? "border-danger/50 bg-danger/12 text-danger"
              : "border-line bg-surface/60 text-ink-3 hover:border-danger/40 hover:text-danger",
          )}>
          <Radio size={12} className="animate-pulse" />
          <span className="hidden lg:inline">Live Actions</span>
        </Link>

        {/* Search */}
        <button
          onClick={() => setPaletteOpen(true)}
          className="ml-auto flex w-56 shrink-0 items-center gap-2 rounded-xl border border-line bg-surface/60 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3 backdrop-blur hover:border-accent/40 hover:text-ink-2"
        >
          <Search size={13} />
          Search…
          <span className="ml-auto flex items-center gap-0.5 rounded border border-line bg-surface-2/60 px-1.5 py-0.5 text-[9px] normal-case tracking-normal">
            <Command size={9} />K
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1.5">
          <Link href="/settings" aria-label="Settings"
            className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-surface/60 text-ink-2 backdrop-blur transition-colors hover:border-accent/40 hover:text-ink">
            <Settings size={14} />
          </Link>
          <IconBtn label="Toggle theme" onClick={toggle}>
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </IconBtn>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-accent-2 via-accent to-gold font-display text-[11px] font-semibold text-bg shadow-glow-amber">
            {user.initials}
          </span>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="overflow-y-auto scroll-smooth px-7 py-6">
        {children}
      </main>

      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </div>
  );
}

/* ── Streak badge — real streak from the activity ledger ─────── */
function StreakBadge() {
  const [s, setS] = useState<{ streak: number; active30: number } | null>(null);
  useEffect(() => {
    fetch("/api/overview", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { streak?: { streak: number; active30: number } }) => { if (d.streak) setS(d.streak); })
      .catch(() => {});
  }, []);
  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-surface-2/60 p-3 backdrop-blur">
      <div aria-hidden className="pointer-events-none absolute -right-4 -top-6 h-20 w-20 rounded-full bg-accent/14 blur-2xl" />
      <div className="relative flex items-center gap-2.5">
        <span className={cn("grid h-8 w-8 place-items-center rounded-lg shadow-glow-amber",
          s && s.streak > 0 ? "bg-gradient-to-br from-accent via-gold to-danger" : "bg-surface-2 border border-line")}>
          <Flame size={13} className={s && s.streak > 0 ? "text-bg" : "text-ink-3"} />
        </span>
        <div>
          <p className="font-display text-[17px] font-semibold text-ink leading-none">{s ? s.streak : "—"}</p>
          <p className="mt-0.5 font-mono text-[8.5px] uppercase tracking-[0.18em] text-ink-3">Day streak</p>
        </div>
        <div className="ml-auto text-right">
          <p className="font-display text-[12px] font-semibold text-accent-2 leading-none">{s ? s.active30 : "—"}<span className="text-ink-3">/30</span></p>
          <p className="mt-0.5 font-mono text-[8.5px] uppercase tracking-[0.18em] text-ink-3">Active days</p>
        </div>
      </div>
    </div>
  );
}

function IconBtn({ children, label, onClick }: { children: ReactNode; label: string; onClick?: () => void }) {
  return (
    <button aria-label={label} onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-surface/60 text-ink-2 backdrop-blur transition-colors hover:border-accent/40 hover:text-ink">
      {children}
    </button>
  );
}

function CommandPalette({ onClose }: { onClose: () => void }) {
  const ACTIONS = [
    { group: "QUICK ACTIONS", items: ["Start a 90-minute deep-work session", "New note", "Begin today's revision queue", "Ask the AI mentor a question"] },
    { group: "JUMP TO",       items: ["Polity · Fundamental Rights", "Geography · Indian Monsoon", "Economy · Monetary Policy"] },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/55 pt-[14vh] backdrop-blur-sm" onClick={onClose}>
      <div className="w-[560px] overflow-hidden rounded-2xl border border-line bg-surface shadow-soft" onClick={(e) => e.stopPropagation()}>
        <input autoFocus placeholder="Type a command or search…"
          className="w-full border-b border-line bg-transparent px-5 py-3.5 text-[13.5px] text-ink outline-none placeholder:text-ink-3" />
        <div className="max-h-[340px] overflow-y-auto p-2">
          {ACTIONS.map((a) => (
            <div key={a.group}>
              <p className="px-3 pb-1 pt-2 font-mono text-[9px] uppercase tracking-[0.22em] text-ink-3">{a.group}</p>
              {a.items.map((item) => (
                <button key={item} onClick={onClose}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12.5px] text-ink-2 hover:bg-surface-2 hover:text-ink">
                  <CornerDownLeft size={12} className="text-ink-3" />
                  {item}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
