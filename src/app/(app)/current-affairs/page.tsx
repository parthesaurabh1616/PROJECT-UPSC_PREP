"use client";

import { Bookmark, Layers, Link2, FileStack } from "lucide-react";
import { Card, Chip, Bar, Divider, SectionHeading } from "@/components/ui";
import { articles, type Article } from "@/lib/data";

export default function CurrentAffairsPage() {
  return (
    <div className="mx-auto max-w-[1280px] space-y-5">
      {/* header strip */}
      <div className="flex animate-fade-up flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[24px] font-semibold tracking-tight text-ink">
            Today&apos;s Newspaper
          </h2>
          <p className="mt-0.5 text-[12.5px] text-ink-3">
            20 May 2026 · 14 articles processed · 8 mapped to syllabus · 3
            high-priority
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip tone="muted">The Hindu</Chip>
          <Chip tone="muted">Indian Express</Chip>
          <Chip tone="muted">PIB</Chip>
          <Chip tone="success">Auto-synced</Chip>
        </div>
      </div>

      <div className="grid animate-fade-up grid-cols-[1.7fr_1fr] gap-5" style={{ animationDelay: "80ms" }}>
        {/* articles */}
        <div className="space-y-4">
          {articles.map((a) => (
            <ArticleCard key={a.title} article={a} />
          ))}
        </div>

        {/* right rail */}
        <div className="space-y-4">
          <Card>
            <SectionHeading
              title="Today's Reading Plan"
              sub="5 of 14 articles processed"
              icon={<FileStack size={15} className="text-accent" />}
            />
            <Bar value={36} className="mt-3" />
            <p className="mt-2 text-[11.5px] text-ink-3">
              Estimated remaining: 42 minutes
            </p>
            <Divider className="my-3.5" />
            <div className="space-y-1.5 text-[12.5px]">
              {[
                ["Front page (4)", "success"],
                ["Editorial (2)", "success"],
                ["Op-ed (3 — in progress)", "warning"],
                ["Business & economy (3)", "muted"],
                ["Sci-Tech (2)", "muted"],
              ].map(([label, tone]) => (
                <div key={label} className="flex items-center gap-2">
                  <span
                    className={
                      tone === "success"
                        ? "text-success"
                        : tone === "warning"
                          ? "text-warning"
                          : "text-ink-3"
                    }
                  >
                    ●
                  </span>
                  <span className="text-ink-2">{label}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionHeading
              title="Auto-tags Today"
              sub="Topic frequency across the 20 May papers"
              icon={<Layers size={15} className="text-accent" />}
            />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[
                ["Reservation × 4", "accent"],
                ["Monetary Policy × 3", "accent"],
                ["Climate × 5", "muted"],
                ["EU Trade × 2", "muted"],
                ["Space Tech × 2", "muted"],
                ["Agriculture × 3", "muted"],
                ["Federalism × 1", "muted"],
                ["Health × 2", "muted"],
              ].map(([t, tone]) => (
                <Chip key={t} tone={tone as "accent" | "muted"}>
                  {t}
                </Chip>
              ))}
            </div>
          </Card>

          <Card>
            <SectionHeading
              title="Consolidation Chain"
              sub="Daily → weekly → monthly"
              icon={<Link2 size={15} className="text-accent" />}
            />
            <div className="mt-3 space-y-1.5 text-[12px] text-ink-2">
              <p>
                Daily compilation: <strong className="text-ink">20 May</strong>
              </p>
              <p>
                Weekly digest:{" "}
                <strong className="text-ink">Week 21 · builds Sunday</strong>
              </p>
              <p>
                Monthly:{" "}
                <strong className="text-ink">May 2026 compilation</strong>
              </p>
              <Divider className="my-2.5" />
              <p className="text-[11.5px] text-ink-3">
                The AI will write a one-page weekly digest on Sunday at 21:00
                unless you reschedule it.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ArticleCard({ article: a }: { article: Article }) {
  return (
    <Card hover className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-[17px] font-semibold leading-snug tracking-tight text-ink">
            {a.title}
          </h3>
          <p className="mt-1 text-[10.5px] uppercase tracking-[0.07em] text-ink-3">
            {a.source}
          </p>
        </div>
        <button className="shrink-0 text-ink-3 hover:text-accent">
          <Bookmark size={16} />
        </button>
      </div>

      <div className="mt-3 space-y-2.5">
        <Field label="Why in news" text={a.whyInNews} />
        {a.background && <Field label="Background" text={a.background} />}
        {a.keyFacts && <Field label="Key facts" text={a.keyFacts} />}
      </div>

      <div className="mt-3.5 grid grid-cols-3 gap-3 border-t border-line-subtle pt-3.5">
        <Mapping label="Prelims angle" text={a.prelims} />
        <Mapping label="Mains angle" text={a.mains} />
        <Mapping label={a.third.label} text={a.third.text} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {a.priority === "high" && <Chip tone="danger">High priority</Chip>}
        {a.tags.map((t) => (
          <span
            key={t}
            className="rounded-full bg-surface-2 px-2 py-0.5 text-[10.5px] text-ink-2"
          >
            {t}
          </span>
        ))}
      </div>
    </Card>
  );
}

function Field({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-accent">
        {label}
      </p>
      <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">{text}</p>
    </div>
  );
}

function Mapping({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-ink-3">
        {label}
      </p>
      <p className="mt-0.5 text-[11.5px] leading-snug text-ink-2">{text}</p>
    </div>
  );
}
