"use client";

import { useEffect, useState } from "react";
import { Fingerprint } from "lucide-react";
import { Card, Bar } from "@/components/ui";

/* COS M1 — Learning Profile. L2: traits below their evidence gate show
   a "collecting evidence" state with real n/N — never a guess. */

interface Trait { key: string; label: string; ready: boolean; n: number; need: number; value: string | null; detail: string | null }

export function ProfilePanel() {
  const [traits, setTraits] = useState<Trait[] | null>(null);

  useEffect(() => {
    fetch("/api/cos/profile", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { traits: Trait[] }) => setTraits(j.traits))
      .catch(() => setTraits([]));
  }, []);

  if (traits === null || traits.length === 0) return null;
  const ready = traits.filter((t) => t.ready).length;

  return (
    <Card className="p-5">
      <div className="mb-1 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-2">
          <Fingerprint size={13} className="text-accent-2" /> Learning profile
        </p>
        <span className="font-mono text-[10px] text-ink-3">{ready}/{traits.length} traits with enough evidence</span>
      </div>
      <p className="mb-3 text-[11px] text-ink-3">Derived from your real activity — traits appear only once there is enough evidence to be honest.</p>
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
        {traits.map((t) => (
          <div key={t.key} className="rounded-xl border border-line-subtle px-3 py-2.5">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-3">{t.label}</p>
            {t.ready ? (
              <>
                <p className="mt-1 text-[13px] font-medium text-ink">{t.value}</p>
                {t.detail && <p className="mt-0.5 text-[10.5px] text-ink-3">{t.detail}</p>}
              </>
            ) : (
              <>
                <div className="mt-1.5 flex items-center gap-2">
                  <Bar value={Math.min(100, Math.round((t.n / t.need) * 100))} className="h-1 flex-1" />
                  <span className="shrink-0 font-mono text-[9.5px] text-ink-3">{t.n}/{t.need}</span>
                </div>
                <p className="mt-1 text-[10.5px] text-ink-3">Collecting evidence — {t.detail}</p>
              </>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
