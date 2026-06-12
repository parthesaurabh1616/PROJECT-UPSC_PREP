import Link from "next/link";
import {
  ArrowRight, Brain, Sparkles, Newspaper, RotateCcw, Library, Target,
  PenLine, BarChart3, Network, Compass, Mic, FileBarChart,
} from "lucide-react";
import { Tag, StatusDot, Eyebrow } from "@/components/ui";
import { NeuralHero } from "@/components/landing/NeuralHero";

const MODULES = [
  { icon: Brain,        title: "AI Mentor",                   desc: "A tutor grounded in your notes, the syllabus and 22 years of PYQs." },
  { icon: Newspaper,    title: "Current Affairs Intelligence", desc: "Every editorial broken into why-in-news, GS mapping, prelims/mains/interview angles." },
  { icon: FileBarChart, title: "Notes & Knowledge Graph",     desc: "Second brain — backlinks, nested pages, visual neural map." },
  { icon: RotateCcw,    title: "Revision Engine",             desc: "Forgetting-curve aware spaced repetition with AI retention forecasting." },
  { icon: Target,       title: "PYQ Intelligence",            desc: "Pattern analysis across two decades · probable-question prediction." },
  { icon: PenLine,      title: "Mains Answer Lab",            desc: "Upload answers · AI structure scoring · intro-body-conclusion analysis." },
  { icon: Library,      title: "Books & Sources Archive",     desc: "NCERT · Spectrum · Laxmikanth · Shankar IAS · Economic Survey · ARC reports." },
  { icon: Mic,          title: "Interview Simulator",         desc: "Mock UPSC interview with AI board panel grounded in your DAF." },
  { icon: BarChart3,    title: "Cognitive Analytics",         desc: "Consistency · burnout detection · subject-wise mastery · accuracy trends." },
  { icon: Network,      title: "Cross-Linking Engine",        desc: "Static syllabus + dynamic current affairs · concept-to-PYQ bridges." },
  { icon: Compass,      title: "Strategic Planner",           desc: "Daily war room · revision blocks · deep work timer · habit tracker." },
  { icon: Sparkles,     title: "Memory Compression",          desc: "AI converts 50 pages → 5 pages → 1 page → flashcards." },
];

const STATS = [
  { v: "12",        l: "Integrated modules" },
  { v: "2003–2024", l: "PYQ corpus" },
  { v: "T-369",     l: "Days to Prelims" },
  { v: "94%",       l: "7-day retention" },
];

export default function LandingPage() {
  return (
    <div className="relative">
      <section className="relative isolate min-h-screen overflow-hidden">
        <NeuralHero />

        {/* Nav */}
        <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 pt-7 md:px-10">
          <Link href="/" className="flex items-center gap-3">
            <span className="relative grid h-10 w-10 place-items-center rounded-xl border border-line bg-gradient-to-br from-accent/40 via-accent-2/30 to-analyt/30 font-display text-[13px] font-bold text-ink">
              CC
              <span className="absolute inset-0 rounded-xl bg-accent/20 blur-md" />
            </span>
            <span className="hidden font-display text-[15px] font-semibold tracking-tight text-ink sm:block">
              Conquer <span className="text-accent">Capital</span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 rounded-full border border-line bg-surface/40 px-2 py-1.5 backdrop-blur-xl md:flex">
            {["Dashboard", "Mentor", "Notes", "Affairs", "Revision"].map((n) => (
              <a key={n} href="#capabilities"
                className="rounded-full px-3.5 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-2 transition-colors hover:bg-surface-2/60 hover:text-ink">
                {n}
              </a>
            ))}
          </div>

          <Link href="/command"
            className="group inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-accent backdrop-blur transition-all hover:bg-accent/20 hover:shadow-glow-amber">
            Enter Platform
            <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </nav>

        {/* Hero */}
        <div className="relative z-10 mx-auto max-w-7xl px-6 pb-32 pt-24 md:px-10 md:pt-32">
          <div className="max-w-4xl">
            <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-line bg-surface/40 px-4 py-2 backdrop-blur">
              <StatusDot variant="amber" />
              <span className="font-mono text-[10.5px] uppercase tracking-[0.26em] text-ink-2">
                conquercapital.in · AI Preparation Platform
              </span>
            </div>

            <h1 className="editorial text-[64px] font-semibold leading-[0.98] tracking-tight text-ink md:text-[88px] lg:text-[112px]">
              <span className="text-gradient">Conquer</span>
              <br />
              <span className="font-display font-bold">Capital</span>
            </h1>

            <p className="mt-7 max-w-2xl font-display text-[18px] font-medium leading-snug text-ink md:text-[22px]">
              The AI-powered intelligence platform for <span className="text-accent">elite</span> UPSC preparation.
            </p>
            <p className="mt-4 max-w-2xl text-[14.5px] leading-relaxed text-ink-2 md:text-[15.5px]">
              Build deep mastery through intelligent revision, AI mentorship, current-affairs intelligence, and strategic analytics — engineered for aspirants who treat preparation as a craft.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/command"
                className="group relative inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent via-gold to-accent-2 px-7 py-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-bg shadow-glow-amber transition-all hover:brightness-110">
                Enter Platform
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <a href="#capabilities"
                className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/50 px-7 py-3.5 font-mono text-[11px] uppercase tracking-[0.24em] text-ink-2 backdrop-blur transition-colors hover:border-accent/40 hover:text-ink">
                Explore Modules
              </a>
            </div>

            <div className="mt-16 grid max-w-3xl grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-4">
              {STATS.map((s) => (
                <div key={s.l} className="border-l border-line pl-4">
                  <p className="font-display text-[26px] font-semibold leading-none tracking-tight text-ink">{s.v}</p>
                  <p className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-3">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
      </section>

      {/* Modules */}
      <section id="capabilities" className="relative mx-auto max-w-7xl px-6 py-32 md:px-10">
        <div className="mb-14 max-w-3xl">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="h-px w-8 bg-gradient-to-r from-accent/0 via-accent to-accent-2" />
            <Eyebrow>The System</Eyebrow>
            <span className="h-px w-8 bg-gradient-to-r from-accent-2 via-accent to-accent/0" />
          </div>
          <h2 className="section-title">
            <span className="text-gradient-cool">Twelve modules</span>,<br />one cognitive war room.
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-ink-2">
            Not another EdTech dashboard — a strategic preparation laboratory built for future IAS officers.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m, i) => {
            const Icon = m.icon;
            return (
              <div key={m.title}
                className="group relative overflow-hidden rounded-2xl border border-line bg-surface/50 p-6 backdrop-blur-xl transition-all duration-500 hover:-translate-y-0.5 hover:border-accent/40 hover:bg-surface">
                <div aria-hidden className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: "radial-gradient(420px circle at 50% 0%, rgb(var(--accent) / 0.14), transparent 55%)" }} />
                <div className="relative z-10">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="grid h-10 w-10 place-items-center rounded-xl border border-accent/20 bg-accent/10 text-accent">
                      <Icon size={17} />
                    </span>
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-ink-3">
                      {String(i + 1).padStart(2, "0")} / 12
                    </span>
                  </div>
                  <h3 className="font-display text-[16px] font-semibold tracking-tight text-ink">{m.title}</h3>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">{m.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Philosophy */}
      <section className="relative mx-auto max-w-5xl px-6 py-24 md:px-10">
        <div className="relative overflow-hidden rounded-3xl border border-line bg-surface/40 p-12 backdrop-blur-xl md:p-16">
          <div aria-hidden className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-accent/12 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-accent-2/12 blur-3xl" />
          <div className="relative">
            <Eyebrow className="mb-6">Operating principle</Eyebrow>
            <p className="editorial text-[36px] font-medium italic leading-[1.18] tracking-tight text-ink md:text-[48px]">
              <span className="text-accent">योगः कर्मसु कौशलम्</span> — excellence in action is yoga.
            </p>
            <p className="mt-6 text-[15px] leading-relaxed text-ink-2">
              Preparation is not a checklist; it is a discipline you live inside. Bhagavad Gita 2.50
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative mx-auto max-w-7xl px-6 py-24 md:px-10">
        <div className="text-center">
          <Eyebrow className="mb-5">Begin the journey</Eyebrow>
          <h2 className="section-title mb-6"><span className="text-gradient">Step into</span> your command center.</h2>
          <p className="mx-auto max-w-2xl text-[15px] leading-relaxed text-ink-2">
            Your dashboard knows the syllabus. It knows the PYQs. It will know your notes. The only thing left is your discipline.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link href="/command"
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent via-gold to-accent-2 px-8 py-4 font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-bg shadow-glow-amber transition-all hover:brightness-110">
              Enter Platform <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="/mentor"
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/50 px-8 py-4 font-mono text-[11px] uppercase tracking-[0.24em] text-ink-2 backdrop-blur transition-colors hover:border-accent/40 hover:text-ink">
              Meet the AI Mentor
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line bg-bg-subtle">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-8 md:px-10">
          <div>
            <p className="font-display text-[13px] font-semibold text-ink">
              Conquer <span className="text-accent">Capital</span>
            </p>
            <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.22em] text-ink-3">
              conquercapital.in · Built for the aspirant who treats preparation as a craft
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tag intent="muted">Next.js 15</Tag>
            <Tag intent="muted">Gemini 2.5</Tag>
            <Tag intent="muted">pgvector</Tag>
          </div>
        </div>
      </footer>
    </div>
  );
}
