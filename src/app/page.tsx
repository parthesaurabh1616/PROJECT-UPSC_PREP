import Link from "next/link";
import {
  ArrowRight, Brain, BookOpen, Target, Newspaper, RotateCcw, Network,
} from "lucide-react";
import { StatusDot } from "@/components/ui";

/* Six REAL tools that exist in the app today. No invented modules. */
const MODULES = [
  { icon: Brain,     title: "AI Mentor",         desc: "Ask anything. Grounded in NCERTs, the syllabus and past papers." },
  { icon: BookOpen,  title: "NCERT Library",     desc: "Class 6–12, organised into a clean digital library with AI study tools." },
  { icon: Target,    title: "PYQ Intelligence",  desc: "Past papers decoded by AI — every question mapped to topic, marks and syllabus." },
  { icon: Newspaper, title: "Current Affairs",   desc: "Daily news with GS mapping and prelims / mains / interview angles." },
  { icon: RotateCcw, title: "Revision",          desc: "Spaced repetition that schedules exactly what you're about to forget." },
  { icon: Network,   title: "Knowledge Hub",     desc: "Your notes, news, NCERTs and PYQs linked through the syllabus spine." },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-bg">
      {/* Calm background — soft glows + faint grid, no clutter */}
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="absolute -left-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-accent/8 blur-3xl" />
        <div className="absolute -right-40 top-40 h-[32rem] w-[32rem] rounded-full bg-accent-2/8 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.035]"
          style={{ backgroundImage: "linear-gradient(rgb(var(--ink) / 1) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--ink) / 1) 1px, transparent 1px)", backgroundSize: "44px 44px" }} />
      </div>

      {/* Nav */}
      <nav className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-6 py-6 md:px-10">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-gradient-to-br from-accent/40 via-accent-2/30 to-analyt/30 font-display text-[12px] font-bold text-ink">CC</span>
          <span className="font-display text-[15px] font-semibold tracking-tight text-ink">
            Conquer <span className="text-accent">Capital</span>
          </span>
        </Link>
        <Link href="/command"
          className="group inline-flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-4 py-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-accent transition-colors hover:bg-accent/20">
          Enter <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-20 text-center md:px-10 md:pt-28">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface/50 px-3.5 py-1.5 backdrop-blur">
          <StatusDot variant="green" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-2">UPSC &amp; MPSC preparation platform</span>
        </div>

        <h1 className="font-display text-[52px] font-bold leading-[1.02] tracking-tight text-ink md:text-[80px]">
          <span className="text-gradient">Conquer</span> Capital
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-ink-2 md:text-[16px]">
          One calm, connected place to prepare — your NCERTs, past papers, current affairs and revision, organised around the syllabus and helped by AI.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link href="/command"
            className="group inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-6 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition-all hover:brightness-110">
            Enter Platform <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </Link>
          <a href="#tools"
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface/50 px-6 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-2 backdrop-blur transition-colors hover:border-accent/40 hover:text-ink">
            See what&apos;s inside
          </a>
        </div>

        {/* Honest facts — not metrics */}
        <p className="mt-10 font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-3">
          NCERT Class 6–12 · PYQs 2016–2026 · UPSC + MPSC · AI mentor
        </p>
      </section>

      {/* Tools — only the real ones */}
      <section id="tools" className="relative z-10 mx-auto max-w-6xl px-6 py-20 md:px-10">
        <div className="mb-10 text-center">
          <h2 className="font-display text-[28px] font-semibold tracking-tight text-ink md:text-[34px]">Everything in one place</h2>
          <p className="mt-2 text-[14px] text-ink-2">Six connected tools, built around the syllabus.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.title}
                className="rounded-2xl border border-line bg-surface/50 p-6 backdrop-blur transition-colors hover:border-accent/40">
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-accent/20 bg-accent/10 text-accent">
                  <Icon size={18} />
                </span>
                <h3 className="mt-4 font-display text-[16px] font-semibold tracking-tight text-ink">{m.title}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">{m.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Closing line + CTA */}
      <section className="relative z-10 mx-auto max-w-3xl px-6 pb-24 text-center md:px-10">
        <p className="font-editorial text-[22px] italic leading-snug text-ink md:text-[26px]">
          <span className="text-accent">योगः कर्मसु कौशलम्</span> — excellence in action.
        </p>
        <p className="mt-3 text-[13px] text-ink-3">The tools are ready. The discipline is yours.</p>
        <div className="mt-8">
          <Link href="/command"
            className="group inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-7 py-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition-all hover:brightness-110">
            Enter Platform <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-7 md:px-10">
          <p className="font-display text-[13px] font-semibold text-ink">Conquer <span className="text-accent">Capital</span></p>
          <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-ink-3">UPSC + MPSC · built for focused preparation</p>
        </div>
      </footer>
    </div>
  );
}
