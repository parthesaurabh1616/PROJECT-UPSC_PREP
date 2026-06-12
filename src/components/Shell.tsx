"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Sparkles, FileText, Newspaper, RotateCcw, Library,
  Target, ClipboardCheck, PenLine, CalendarDays, BarChart3, Network,
  Focus, Search, Bell, Sun, Moon, Flame, Command, CornerDownLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";
import { StatusDot } from "@/components/ui";
import { user } from "@/lib/data";

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  badge?: string;
  soon?: boolean;
}
const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Command",
    items: [
      { label: "Dashboard", href: "/command", icon: LayoutDashboard },
      { label: "AI Mentor", href: "/mentor", icon: Sparkles, badge: "AI" },
      { label: "Notes", href: "/notes", icon: FileText },
      { label: "Current Affairs", href: "/current-affairs", icon: Newspaper },
      { label: "Revision", href: "/revision", icon: RotateCcw },
      { label: "Library", href: "/library", icon: Library },
    ],
  },
  {
    section: "Preparation",
    items: [
      { label: "PYQ Vault", href: "/library", icon: Target },
      { label: "Test Series", href: "/revision", icon: ClipboardCheck },
      { label: "Answer Writing", href: "/mentor", icon: PenLine },
      { label: "Calendar", href: "/command", icon: CalendarDays, soon: true },
    ],
  },
  {
    section: "Intelligence",
    items: [
      { label: "Analytics", href: "/command", icon: BarChart3, soon: true },
      { label: "Knowledge Graph", href: "/notes", icon: Network },
      { label: "Focus Mode", href: "/command", icon: Focus, soon: true },
    ],
  },
];

const PAGE_META: Record<string, { eyebrow: string; title: string; sub: string }> = {
  "/command": { eyebrow: "COMMAND CENTER", title: "Dashboard", sub: "Thursday · 21 May 2026 · Day 47 of preparation" },
  "/mentor": { eyebrow: "AI MENTOR", title: "Strategist", sub: "Grounded in the syllabus, PYQs and your own notes" },
  "/notes": { eyebrow: "KNOWLEDGE VAULT", title: "Notes", sub: "Second brain · 247 notes · 1,892 backlinks" },
  "/current-affairs": { eyebrow: "INTELLIGENCE FEED", title: "Current Affairs", sub: "Today's news, mapped to the GS syllabus" },
  "/revision": { eyebrow: "REVISION ENGINE", title: "Spaced Repetition", sub: "38 cards due · forgetting-curve aware" },
  "/library": { eyebrow: "ARCHIVE", title: "Library", sub: "Every book, newspaper and paper you've uploaded" },
};

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const meta = PAGE_META[pathname] ?? { eyebrow: "UPSC PREP OS", title: "Workspace", sub: "" };

  return (
    <div className="relative z-[1] grid h-screen grid-cols-[262px_1fr] grid-rows-[64px_1fr]">
      {/* ── SIDEBAR ── */}
      <aside className="row-span-2 flex flex-col overflow-y-auto border-r border-line bg-surface/60 px-3.5 py-4 backdrop-blur-xl">
        {/* Brand */}
        <Link href="/command" className="mb-3 flex items-center gap-3 px-2 pb-4 border-b border-line-subtle">
          <span className="relative grid h-10 w-10 place-items-center rounded-xl border border-line bg-gradient-to-br from-accent/30 via-accent-2/30 to-analyt/30 font-display text-base font-bold text-ink shadow-glow-amber">
            <span className="relative z-10">PO</span>
            <span className="absolute inset-0 rounded-xl bg-gradient-to-br from-accent/20 to-accent-2/20 blur-md" />
          </span>
          <div>
            <p className="font-display text-[15px] font-semibold tracking-tight text-ink leading-none">
              UPSC <span className="text-accent">PREP</span> OS
            </p>
            <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.24em] text-ink-3">
              <span className="inline-flex items-center gap-1.5">
                <StatusDot variant="green" /> Online · v0.1
              </span>
            </p>
          </div>
        </Link>

        <nav className="flex-1 space-y-5">
          {NAV.map((group) => (
            <div key={group.section}>
              <p className="px-2.5 pb-1.5 font-mono text-[9.5px] uppercase tracking-[0.22em] text-ink-3">
                {group.section}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href && !item.soon;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.label + item.href}
                      href={item.soon ? "#" : item.href}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-mono text-[11.5px] uppercase tracking-[0.14em] transition-all",
                        active
                          ? "bg-gradient-to-r from-accent/14 to-transparent text-ink"
                          : "text-ink-2 hover:bg-surface-2/60 hover:text-ink",
                      )}
                    >
                      {active && (
                        <span className="absolute -left-3.5 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-gradient-to-b from-accent to-gold shadow-glow-amber" />
                      )}
                      <Icon size={15} className={cn("shrink-0", active ? "text-accent" : "opacity-70")} />
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto rounded border border-analyt/40 bg-analyt/10 px-1.5 py-[1px] font-mono text-[8px] font-bold tracking-wider text-analyt">
                          {item.badge}
                        </span>
                      )}
                      {item.soon && (
                        <span className="ml-auto font-mono text-[8.5px] uppercase tracking-wide text-ink-3">soon</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Streak / status */}
        <div className="mt-4 border-t border-line-subtle pt-3">
          <div className="relative overflow-hidden rounded-xl border border-line bg-surface-2/60 p-3 backdrop-blur">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-4 -top-6 h-20 w-20 rounded-full bg-accent/14 blur-2xl"
            />
            <div className="relative flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-accent via-gold to-danger text-ink-2 shadow-glow-amber">
                <Flame size={15} className="text-bg" />
              </span>
              <div className="leading-tight">
                <p className="font-display text-lg font-semibold text-ink leading-none">{user.streak}</p>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-3">Day streak</p>
              </div>
              <div className="ml-auto text-right leading-tight">
                <p className="font-display text-[13px] font-semibold text-accent-2 leading-none">Tier IV</p>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-3">Tapasvi</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── TOPBAR ── */}
      <header className="z-10 flex items-center gap-4 border-b border-line bg-bg/70 px-7 backdrop-blur-2xl">
        <div>
          <p className="eyebrow flex items-center gap-2">
            <StatusDot variant="amber" />
            {meta.eyebrow}
          </p>
          <h1 className="mt-0.5 font-display text-[20px] font-semibold leading-none tracking-tight text-ink">
            {meta.title}
            <span className="ml-2 font-mono text-[10.5px] font-normal uppercase tracking-[0.18em] text-ink-3">
              {meta.sub}
            </span>
          </h1>
        </div>

        <button
          onClick={() => setPaletteOpen(true)}
          className="ml-auto flex w-80 items-center gap-2 rounded-xl border border-line bg-surface/60 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3 backdrop-blur transition-colors hover:border-accent/40 hover:text-ink-2"
        >
          <Search size={14} />
          Search or command…
          <span className="ml-auto flex items-center gap-0.5 rounded border border-line bg-surface-2/60 px-1.5 py-0.5 font-mono text-[9px] normal-case tracking-normal">
            <Command size={9} />K
          </span>
        </button>

        <div className="flex items-center gap-1.5">
          <IconBtn label="Notifications"><Bell size={14} /></IconBtn>
          <IconBtn label="Toggle theme" onClick={toggle}>
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </IconBtn>
          <span className="ml-1 grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-accent-2 via-accent to-gold font-display text-[12px] font-semibold text-bg shadow-glow-amber">
            {user.initials}
          </span>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="overflow-y-auto px-8 py-7">{children}</main>

      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </div>
  );
}

function IconBtn({
  children, label, onClick,
}: {
  children: ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-surface/60 text-ink-2 backdrop-blur transition-colors hover:border-accent/40 hover:text-ink"
    >
      {children}
    </button>
  );
}

function CommandPalette({ onClose }: { onClose: () => void }) {
  const actions = [
    { group: "QUICK ACTIONS", items: ["Start a 90-minute deep-work session", "New current-affairs note", "Begin today's revision queue", "Ask the AI mentor a question"] },
    { group: "JUMP TO", items: ["Polity · Fundamental Rights", "Geography · Indian Monsoon", "Economy · Monetary Policy"] },
  ];
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/55 pt-[14vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[580px] overflow-hidden rounded-2xl border border-line bg-surface shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          placeholder="Type a command, ask a question, or jump to a note…"
          className="w-full border-b border-line bg-transparent px-5 py-4 text-[14px] text-ink outline-none placeholder:text-ink-3"
        />
        <div className="max-h-[360px] overflow-y-auto p-2">
          {actions.map((a) => (
            <div key={a.group}>
              <p className="px-3 pb-1 pt-2 font-mono text-[9.5px] uppercase tracking-[0.22em] text-ink-3">
                {a.group}
              </p>
              {a.items.map((item) => (
                <button
                  key={item}
                  onClick={onClose}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] text-ink-2 hover:bg-surface-2 hover:text-ink"
                >
                  <CornerDownLeft size={13} className="text-ink-3" />
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
