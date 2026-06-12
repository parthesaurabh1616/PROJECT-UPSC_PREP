"use client";

import { useState } from "react";
import {
  Plus, Paperclip, Mic, ArrowUp, Save, Layers, RotateCcw,
  Map, FileBarChart, CornerDownLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { conversations, mentorSuggestions } from "@/lib/data";

export default function MentorPage() {
  const [active, setActive] = useState("c1");
  const groups = ["Today", "This week", "Earlier"];

  return (
    <div className="mx-auto grid h-[calc(100vh-64px-3.5rem)] max-w-[1280px] grid-cols-[240px_1fr] gap-4">
      {/* ── Conversation sidebar ── */}
      <aside className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="p-3">
          <button className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-accent py-2 text-[12.5px] font-medium text-accent transition-colors hover:bg-accent/10">
            <Plus size={14} /> New conversation
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {groups.map((g) => (
            <div key={g} className="mb-3">
              <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-ink-3">
                {g}
              </p>
              {conversations
                .filter((c) => c.group === g)
                .map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActive(c.id)}
                    className={cn(
                      "block w-full truncate rounded-lg px-2.5 py-1.5 text-left text-[12.5px] transition-colors",
                      active === c.id
                        ? "bg-accent/12 font-medium text-accent"
                        : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                    )}
                  >
                    {c.title}
                  </button>
                ))}
            </div>
          ))}
        </div>
      </aside>

      {/* ── Chat ── */}
      <section className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex-1 space-y-7 overflow-y-auto px-8 py-7">
          <UserMsg>
            Explain the doctrine of basic structure. I need a concise, UPSC-ready
            answer with the key cases and why it matters today.
          </UserMsg>

          <AiMsg>
            <p>
              The <strong>doctrine of basic structure</strong> holds that while
              Parliament has wide power to amend the Constitution under Article
              368, it <em>cannot alter the Constitution&apos;s fundamental
              framework</em>. The doctrine is judicially evolved — nowhere
              written in the text — yet it is the keystone of Indian
              constitutionalism.
            </p>
            <h4>Evolution — four landmark cases</h4>
            <ul>
              <li>
                <strong>Shankari Prasad (1951)</strong> &amp;{" "}
                <strong>Sajjan Singh (1965)</strong>: amendments are not
                &quot;law&quot; under Art. 13; Fundamental Rights amendable.
              </li>
              <li>
                <strong>Golak Nath (1967)</strong>: reversed — FRs placed beyond
                the amending power.
              </li>
              <li>
                <strong>Kesavananda Bharati (1973)</strong>: 13-judge bench, 7:6
                — Parliament may amend any provision but cannot destroy the basic
                structure. The doctrine is born.
              </li>
              <li>
                <strong>Minerva Mills (1980)</strong>: struck down clauses (4)
                &amp; (5) of Art. 368 — limited amending power is itself a basic
                feature.
              </li>
            </ul>
            <div className="callout">
              <strong>Why it matters in 2026:</strong> recent debates — the
              Election Commissioners law, the NJAC verdict, sub-classification
              within SC/ST reservations — all turn on whether an amendment
              touches a basic feature. The doctrine remains the judiciary&apos;s
              primary firewall.
            </div>
            <h4>UPSC angle</h4>
            <ul>
              <li>
                <strong>Prelims:</strong> match cases to outcomes; identify basic
                features.
              </li>
              <li>
                <strong>Mains GS-II:</strong> &quot;Critically examine the
                doctrine as a constitutional safeguard&quot; — 15-marker.
              </li>
              <li>
                <strong>Essay:</strong> a sub-theme under &quot;the Constitution
                as a living document&quot;.
              </li>
            </ul>
          </AiMsg>
        </div>

        {/* Input */}
        <div className="border-t border-line bg-bg-subtle px-6 py-4">
          <div className="mb-2.5 flex flex-wrap gap-2">
            {mentorSuggestions.map((s) => (
              <button
                key={s}
                className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11.5px] text-ink-2 transition-colors hover:border-accent/50 hover:bg-accent/8 hover:text-accent"
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2 rounded-xl border border-line bg-surface p-2.5 focus-within:border-accent/50">
            <button className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:text-ink">
              <Paperclip size={15} />
            </button>
            <textarea
              rows={1}
              placeholder="Ask anything — a concept, a PYQ, an editorial. Drop a PDF to summarise, or paste your answer for evaluation."
              className="max-h-40 flex-1 resize-none bg-transparent py-1.5 text-[13.5px] text-ink outline-none placeholder:text-ink-3"
            />
            <button className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:text-ink">
              <Mic size={15} />
            </button>
            <button className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-white transition-transform hover:scale-105">
              <ArrowUp size={15} strokeWidth={2.5} />
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between px-1 text-[10.5px] text-ink-3">
            <span>
              Model: <strong className="text-ink-2">Lakshya-UPSC</strong> ·
              grounded in your notes, syllabus and 22 years of PYQs
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft size={11} /> to send
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ── Message bubbles ──────────────────────────────────── */
function UserMsg({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex max-w-3xl gap-3.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-[11px] font-semibold text-ink-2">
        SP
      </span>
      <div>
        <p className="mb-1 text-[12px] font-semibold text-ink">You</p>
        <p className="text-[13.5px] leading-relaxed text-ink-2">{children}</p>
      </div>
    </div>
  );
}

function AiMsg({ children }: { children: React.ReactNode }) {
  const actions = [
    { icon: Save, label: "Save to notes" },
    { icon: Layers, label: "Make 6 flashcards" },
    { icon: RotateCcw, label: "Add to revision" },
    { icon: FileBarChart, label: "Link PYQs (12)" },
    { icon: Map, label: "Mind map" },
  ];
  return (
    <div className="flex max-w-3xl gap-3.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-accent to-accent-2 font-display text-[13px] font-semibold text-white">
        ल
      </span>
      <div className="min-w-0 flex-1">
        <p className="mb-1.5 text-[12px] font-semibold text-ink">
          Lakshya{" "}
          <span className="ml-1.5 text-[10px] font-normal uppercase tracking-[0.1em] text-ink-3">
            UPSC Mentor
          </span>
        </p>
        <div className="prose-os text-[13.5px]">{children}</div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.label}
                className="flex items-center gap-1.5 rounded-md border border-line bg-bg px-2.5 py-1 text-[11px] text-ink-2 transition-colors hover:border-accent hover:bg-accent/8 hover:text-accent"
              >
                <Icon size={12} /> {a.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
