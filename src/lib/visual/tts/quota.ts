/* Local quota ledger.

   Providers do not reliably tell you how much free allowance is left, and
   discovering it by failing halfway through a 34-segment render is exactly
   how a day's quota gets wasted. So we count what we spend, locally, and
   refuse to start renders we cannot finish. */
import fs from "fs";
import path from "path";

const LEDGER = path.join(process.cwd(), ".cache", "tts-quota.json");

export interface LedgerEntry { requests: number; characters: number }
type Ledger = Record<string, Record<string, LedgerEntry>>; // provider → period → usage

/** Free allowances, as documented by each provider. */
export const FREE_ALLOWANCE: Record<string, { window: "day" | "month" | "none"; requests: number | null; characters: number | null }> = {
  // Observed directly from a 429: GenerateRequestsPerDayPerProjectPerModel-FreeTier = 10
  "gemini-tts": { window: "day", requests: 10, characters: null },
  // Azure Speech F0: 0.5M characters/month of neural TTS.
  azure: { window: "month", requests: null, characters: 500_000 },
  // Google Cloud TTS: 1M characters/month of Neural2 on the free allocation.
  "google-cloud": { window: "month", requests: null, characters: 1_000_000 },
  elevenlabs: { window: "month", requests: null, characters: 10_000 },
  kokoro: { window: "none", requests: null, characters: null },
  sapi: { window: "none", requests: null, characters: null },
};

const period = (window: "day" | "month" | "none") => {
  const d = new Date();
  if (window === "day") return d.toISOString().slice(0, 10);
  if (window === "month") return d.toISOString().slice(0, 7);
  return "all";
};

function read(): Ledger {
  try { return JSON.parse(fs.readFileSync(LEDGER, "utf8")); } catch { return {}; }
}
function write(l: Ledger) {
  fs.mkdirSync(path.dirname(LEDGER), { recursive: true });
  fs.writeFileSync(LEDGER, JSON.stringify(l, null, 2), "utf8");
}

export function recordUsage(provider: string, characters: number) {
  const allow = FREE_ALLOWANCE[provider] ?? { window: "none" as const, requests: null, characters: null };
  const p = period(allow.window);
  const l = read();
  l[provider] ??= {};
  l[provider][p] ??= { requests: 0, characters: 0 };
  l[provider][p].requests += 1;
  l[provider][p].characters += characters;
  write(l);
}

/** Record that the provider itself said we are out, regardless of our count.
    The ledger only knows what it has seen; usage predating it is invisible,
    so a 429 is the authoritative signal and must be remembered. */
export function markExhausted(provider: string) {
  const allow = FREE_ALLOWANCE[provider];
  if (!allow || allow.window === "none") return;
  const p = period(allow.window);
  const l = read();
  l[provider] ??= {};
  l[provider][p] = {
    requests: allow.requests ?? Number.MAX_SAFE_INTEGER,
    characters: allow.characters ?? Number.MAX_SAFE_INTEGER,
  };
  write(l);
}

export function usage(provider: string): LedgerEntry {
  const allow = FREE_ALLOWANCE[provider] ?? { window: "none" as const };
  return read()[provider]?.[period(allow.window)] ?? { requests: 0, characters: 0 };
}

/** What is left of the free allocation, by our own count. */
export function remaining(provider: string) {
  const allow = FREE_ALLOWANCE[provider];
  const used = usage(provider);
  if (!allow || allow.window === "none") {
    return { requestsRemaining: null, charactersRemaining: null, window: "none" as const };
  }
  return {
    requestsRemaining: allow.requests === null ? null : Math.max(0, allow.requests - used.requests),
    charactersRemaining: allow.characters === null ? null : Math.max(0, allow.characters - used.characters),
    window: allow.window,
  };
}

/** Can this provider cover the WHOLE job? Partial coverage is not useful:
    switching provider mid-video changes the narrator's voice halfway. */
export function canCoverJob(provider: string, segments: number, characters: number): { ok: boolean; why: string } {
  const r = remaining(provider);
  if (r.requestsRemaining !== null && r.requestsRemaining < segments) {
    return { ok: false, why: `needs ${segments} requests, ${r.requestsRemaining} left today` };
  }
  if (r.charactersRemaining !== null && r.charactersRemaining < characters) {
    return { ok: false, why: `needs ${characters} chars, ${r.charactersRemaining} left this ${r.window}` };
  }
  return { ok: true, why: r.window === "none" ? "unmetered" : "within free allowance" };
}
