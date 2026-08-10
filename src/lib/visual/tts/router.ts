/* ════════════════════════════════════════════════════════════════
   Provider router + preflight.

   Two rules do most of the work here:

   1. PROVIDER IS CHOSEN PER VIDEO, NOT PER SEGMENT. A lesson whose narrator
      changes voice halfway through is worse than one rendered in a lesser
      voice throughout, so a provider is only eligible if it can cover the
      WHOLE job.
   2. NEVER DEGRADE SILENTLY. If no production-quality provider can cover the
      job, throw NoProductionTtsAvailable. Robotic audio wearing a
      production label is the failure mode this whole design exists to stop.
   ════════════════════════════════════════════════════════════════ */
import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import { ALL_PROVIDERS } from "./providers";
import { canCoverJob, markExhausted } from "./quota";
import { NoProductionTtsAvailable, TtsMode, TtsOptions, TtsProvider, TtsResult } from "./types";

const CACHE_DIR = path.join(process.cwd(), ".cache", "narration");

/** Permanent, content-addressed. Deleting an MP4 must never cost TTS again. */
export function cacheKey(text: string, provider: string, voice: string, speed: number) {
  return createHash("sha256").update(`${provider}|${voice}|${speed}|${text}`).digest("hex").slice(0, 24);
}

export interface Segment { id: string; text: string }

export interface Preflight {
  segments: number;
  uniqueSegments: number;
  characters: number;
  cached: number;
  required: number;
  chosen: TtsProvider | null;
  candidates: { id: string; label: string; available: boolean; verdict: string }[];
  status: "READY" | "INSUFFICIENT";
}

const MODE_FILTER: Record<TtsMode, (p: TtsProvider) => boolean> = {
  quality:     (p) => p.productionQuality,
  free:        (p) => p.productionQuality,
  "zero-cost": (p) => p.productionQuality && p.alwaysFree,
  offline:     (p) => p.productionQuality && p.offlineCapable,
  dev:         (p) => p.offlineCapable,
  test:        (p) => p.productionQuality,
};

/** Order to try. Local last for quality, first when cost or offline rules. */
function priority(mode: TtsMode): string[] {
  const configured = (process.env.TTS_PRIORITY || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (configured.length) return configured;
  if (mode === "zero-cost" || mode === "offline" || mode === "dev") return ["kokoro", "azure", "gemini-tts"];
  return ["azure", "gemini-tts", "kokoro"];
}

/** Duplicate narration must never be paid for twice (directive §33). */
export function dedupe(segments: Segment[]): Map<string, string> {
  const byText = new Map<string, string>();
  for (const s of segments) if (!byText.has(s.text)) byText.set(s.text, s.id);
  return byText;
}

export async function preflight(segments: Segment[], opts: { mode?: TtsMode; voice?: string; speed?: number } = {}): Promise<Preflight> {
  const mode = (opts.mode ?? (process.env.TTS_MODE as TtsMode) ?? "free");
  const allowBillable = process.env.ALLOW_BILLABLE_TTS === "true";
  const unique = [...dedupe(segments).keys()];
  const characters = unique.reduce((n, t) => n + t.length, 0);

  const candidates: Preflight["candidates"] = [];
  let chosen: TtsProvider | null = null;

  for (const id of priority(mode)) {
    const p = ALL_PROVIDERS.find((x) => x.id === id);
    if (!p) continue;
    if (!MODE_FILTER[mode](p)) { candidates.push({ id: p.id, label: p.label, available: false, verdict: `excluded by TTS_MODE=${mode}` }); continue; }

    const available = await p.isAvailable();
    if (!available) { candidates.push({ id: p.id, label: p.label, available: false, verdict: "not configured / unavailable" }); continue; }

    // How many of these does the cache already hold for THIS provider+voice?
    const voice = opts.voice ?? p.defaultVoice;
    const speed = opts.speed ?? 1;
    const cachedHere = unique.filter((t) => fs.existsSync(path.join(CACHE_DIR, `${cacheKey(t, p.id, voice, speed)}.wav`))).length;
    const need = unique.length - cachedHere;
    const needChars = unique.filter((t) => !fs.existsSync(path.join(CACHE_DIR, `${cacheKey(t, p.id, voice, speed)}.wav`))).reduce((n, t) => n + t.length, 0);

    const cover = canCoverJob(p.id, need, needChars);
    if (!cover.ok) { candidates.push({ id: p.id, label: p.label, available: true, verdict: `cannot cover job — ${cover.why}` }); continue; }
    if (!p.alwaysFree && !allowBillable && !cover.ok) { candidates.push({ id: p.id, label: p.label, available: true, verdict: "would exceed free allowance (ALLOW_BILLABLE_TTS=false)" }); continue; }

    candidates.push({ id: p.id, label: p.label, available: true, verdict: `${cover.why} · ${cachedHere}/${unique.length} cached` });
    if (!chosen) chosen = p;
  }

  const voice = chosen ? (opts.voice ?? chosen.defaultVoice) : "";
  const speed = opts.speed ?? 1;
  const cached = chosen ? unique.filter((t) => fs.existsSync(path.join(CACHE_DIR, `${cacheKey(t, chosen!.id, voice, speed)}.wav`))).length : 0;

  return {
    segments: segments.length,
    uniqueSegments: unique.length,
    characters,
    cached,
    required: unique.length - cached,
    chosen,
    candidates,
    status: chosen ? "READY" : "INSUFFICIENT",
  };
}

/** Synthesize one segment through the chosen provider, cache-first. */
export async function synthesizeSegment(
  provider: TtsProvider, text: string, outFile: string, o: TtsOptions = {},
): Promise<TtsResult> {
  const voice = o.voice ?? provider.defaultVoice;
  const speed = o.speed ?? 1;
  const key = cacheKey(text, provider.id, voice, speed);
  const cached = path.join(CACHE_DIR, `${key}.wav`);
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(outFile), { recursive: true });

  if (fs.existsSync(cached)) {
    fs.copyFileSync(cached, outFile);
    const meta = JSON.parse(fs.readFileSync(cached.replace(/\.wav$/, ".json"), "utf8"));
    return { ...meta, audioPath: outFile, cached: true };
  }

  let res;
  try {
    res = await provider.synthesize(text, outFile, { ...o, voice, speed });
  } catch (e) {
    // A 429 is the provider telling us the truth about quota. Believe it and
    // remember it, so the next preflight does not plan around stale optimism.
    if (/429|quota|rate limit/i.test((e as Error).message)) markExhausted(provider.id);
    throw e;
  }
  fs.copyFileSync(outFile, cached);
  fs.writeFileSync(cached.replace(/\.wav$/, ".json"), JSON.stringify({ ...res, audioPath: cached }, null, 2), "utf8");
  return res;
}

export function assertProduction(pf: Preflight, mode: TtsMode) {
  if (pf.status === "READY") return;
  throw new NoProductionTtsAvailable(
    `mode=${mode}, ${pf.required} segments needed. ` +
    pf.candidates.map((c) => `${c.id}: ${c.verdict}`).join(" | ")
  );
}
