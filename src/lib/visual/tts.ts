/* ════════════════════════════════════════════════════════════════
   Narration synthesis behind a provider interface.

   PRODUCTION VOICE  gemini-2.5-flash-preview-tts — neural, warm, and it
     accepts a style instruction, which is how the "patient teacher" tone
     is actually achieved rather than hoped for.
   DEVELOPMENT VOICE Windows SAPI — offline, zero quota, obviously robotic.
     Kept because you re-render many times while tuning pacing and burning
     API quota on every pass is wasteful. Marked `natural: false` so a
     placeholder voice can never be mistaken for a finished one.

   Groq's playai-tts was evaluated and is decommissioned (HTTP 400).
   ════════════════════════════════════════════════════════════════ */
import { execFile } from "child_process";
import { createHash } from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";

const run = promisify(execFile);

export interface TtsResult { file: string; seconds: number; cached?: boolean; provider?: string }

export interface VoiceConfig {
  /** Provider-specific voice id. */
  voice?: string;
  /** Tone instruction. Honoured by providers that support style prompts. */
  style?: string;
  /** Relative speaking rate for providers that expose one. */
  rate?: number;
}

export interface TtsProvider {
  readonly name: string;
  /** False = development placeholder, not fit to ship. */
  readonly natural: boolean;
  synthesize(text: string, outFile: string, cfg?: VoiceConfig): Promise<TtsResult>;
}

/* ── Pronunciation dictionary ────────────────────────────────────
   Applied to the SPOKEN string only — captions keep correct spelling.
   Generic TTS mangles exactly the words a UPSC answer depends on. */
export const PRONUNCIATION: Record<string, string> = {
  Machiavelli: "Mack-ee-a-VEL-ee",
  Leviathan: "Le-VY-a-than",
  Rousseau: "Roo-SOH",
  Aurobindo: "Oh-ro-BIN-do",
  Kautilya: "Cow-TIL-ya",
  Hobbes: "Hobz",
  hegemony: "hi-JEM-o-nee",
  Coriolis: "Kor-ee-OH-lis",
  orographic: "or-o-GRAF-ic",
  subduction: "sub-DUK-shun",
  lithosphere: "LITH-o-sfeer",
  asthenosphere: "as-THEN-o-sfeer",
  Wadati: "Wa-DAH-tee",
  Benioff: "BEN-ee-off",
  Nazca: "NAZ-ka",
  Tethys: "TETH-is",
  Gondwana: "Gond-WAH-na",
  Bodin: "Bo-DAN",
  Galileo: "Gal-i-LAY-o",
};

export function applyPronunciation(text: string): string {
  let out = text;
  for (const [word, say] of Object.entries(PRONUNCIATION)) {
    out = out.replace(new RegExp(`\\b${word}\\b`, "g"), say);
  }
  return out;
}

/* ── WAV helpers ─────────────────────────────────────────────────── */

/** Real duration of a PCM wav, read from its header — measured, never estimated. */
export function wavSeconds(file: string): number {
  const b = fs.readFileSync(file);
  if (b.length < 44 || b.toString("ascii", 0, 4) !== "RIFF") throw new Error(`not a wav: ${file}`);
  let pos = 12, byteRate = 0, dataSize = 0;
  while (pos + 8 <= b.length) {
    const id = b.toString("ascii", pos, pos + 4);
    const size = b.readUInt32LE(pos + 4);
    if (id === "fmt ") byteRate = b.readUInt32LE(pos + 16);
    if (id === "data") { dataSize = size; break; }
    pos += 8 + size + (size % 2);
  }
  if (!byteRate || !dataSize) throw new Error(`unreadable wav header: ${file}`);
  return dataSize / byteRate;
}

/** Gemini returns headerless L16 PCM; Remotion needs a real container. */
export function pcmToWav(pcm: Buffer, sampleRate = 24000, channels = 1, bits = 16): Buffer {
  const byteRate = (sampleRate * channels * bits) / 8;
  const blockAlign = (channels * bits) / 8;
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);            // PCM
  h.writeUInt16LE(channels, 22);
  h.writeUInt32LE(sampleRate, 24);
  h.writeUInt32LE(byteRate, 28);
  h.writeUInt16LE(blockAlign, 32);
  h.writeUInt16LE(bits, 34);
  h.write("data", 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

/* ── Providers ───────────────────────────────────────────────────── */

const TEACHER_STYLE =
  "Read this aloud as a warm, patient teacher explaining to a student who is " +
  "hearing the idea for the first time. Calm and clear, gently encouraging, " +
  "unhurried. Pause briefly at full stops. Give slight emphasis to technical " +
  "terms. Do not sound like a news anchor or a documentary narrator.";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class GeminiTts implements TtsProvider {
  readonly name = "gemini-2.5-flash-preview-tts";
  readonly natural = true;
  /** Shared across instances — the quota is per key, not per object. */
  private static lastCallAt = 0;
  /** Free-tier TTS rate-limits hard. Pace requests instead of firing and retrying. */
  private static minIntervalMs = Number(process.env.TTS_MIN_INTERVAL_MS ?? 7000);

  /** Configurable — never bind the project to one voice (TTS_VOICE). */
  constructor(private defaultVoice = process.env.TTS_VOICE || "Charon") {}

  async synthesize(text: string, outFile: string, cfg: VoiceConfig = {}): Promise<TtsResult> {
    const key = process.env.GOOGLE_API_KEY;
    if (!key) throw new Error("GOOGLE_API_KEY is not set");
    fs.mkdirSync(path.dirname(outFile), { recursive: true });

    const spoken = applyPronunciation(text);
    const prompt = `${cfg.style ?? TEACHER_STYLE}\n\n${spoken}`;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${key}`;
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: cfg.voice ?? this.defaultVoice } } },
      },
    };

    let lastErr = "";
    for (let attempt = 0; attempt < 6; attempt++) {
      const wait = GeminiTts.minIntervalMs - (Date.now() - GeminiTts.lastCallAt);
      if (wait > 0) await sleep(wait);
      GeminiTts.lastCallAt = Date.now();

      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) {
        type InlinePart = { inlineData?: { data: string; mimeType?: string } };
        const j = await res.json() as { candidates?: { content?: { parts?: InlinePart[] } }[] };
        const part = j?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
        if (!part) throw new Error("Gemini returned no audio part");
        const rate = Number(/rate=(\d+)/.exec(part.mimeType ?? "")?.[1] ?? 24000);
        fs.writeFileSync(outFile, pcmToWav(Buffer.from(part.data, "base64"), rate));
        return { file: outFile, seconds: wavSeconds(outFile), provider: this.name };
      }

      const bodyText = await res.text();
      lastErr = `HTTP ${res.status} ${bodyText.slice(0, 140)}`;
      if (res.status !== 429 && res.status !== 503 && res.status !== 500) break;
      // Honour the server's own backoff hint when it gives one.
      const hinted = Number(/"retryDelay"\s*:\s*"(\d+)s"/.exec(bodyText)?.[1] ?? 0);
      const backoff = Math.max(hinted * 1000, 15000 * (attempt + 1));
      console.warn(`    · rate limited, waiting ${Math.round(backoff / 1000)}s (attempt ${attempt + 1}/6)`);
      await sleep(backoff);
    }
    throw new Error(`Gemini TTS failed: ${lastErr}`);
  }
}

/**
 * Content-addressed narration cache.
 * Re-rendering is the normal case while tuning pacing, and re-synthesising
 * unchanged lines burns quota for nothing. Keyed on text + voice + provider,
 * so any edit to a line regenerates only that line.
 */
export class CachedTts implements TtsProvider {
  readonly name: string;
  readonly natural: boolean;
  constructor(private inner: TtsProvider, private cacheDir: string) {
    this.name = `cached(${inner.name})`;
    this.natural = inner.natural;
  }
  async synthesize(text: string, outFile: string, cfg: VoiceConfig = {}): Promise<TtsResult> {
    const hash = createHash("sha1")
      .update(`${this.inner.name}|${cfg.voice ?? ""}|${cfg.style ?? ""}|${text}`)
      .digest("hex").slice(0, 16);
    const cached = path.join(this.cacheDir, `${hash}.wav`);
    fs.mkdirSync(this.cacheDir, { recursive: true });
    fs.mkdirSync(path.dirname(outFile), { recursive: true });

    if (fs.existsSync(cached)) {
      fs.copyFileSync(cached, outFile);
      return { file: outFile, seconds: wavSeconds(outFile), cached: true, provider: this.inner.name };
    }
    const res = await this.inner.synthesize(text, outFile, cfg);
    fs.copyFileSync(outFile, cached);
    return res;
  }
}

export class WindowsSapiTts implements TtsProvider {
  readonly name = "windows-sapi";
  readonly natural = false; // development placeholder
  constructor(private voice = "Microsoft Zira Desktop", private rate = -1) {}

  async synthesize(text: string, outFile: string, cfg: VoiceConfig = {}): Promise<TtsResult> {
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    const tmp = path.join(os.tmpdir(), `narr-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`);
    fs.writeFileSync(tmp, applyPronunciation(text), "utf8");
    try {
      const script = path.join(process.cwd(), "scripts", "tts-sapi.ps1");
      await run("powershell", [
        "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script,
        "-TextFile", tmp, "-OutFile", outFile,
        "-Voice", cfg.voice ?? this.voice, "-Rate", String(cfg.rate ?? this.rate),
      ], { windowsHide: true, maxBuffer: 1 << 22 });
      if (!fs.existsSync(outFile)) throw new Error("synthesis produced no file");
      return { file: outFile, seconds: wavSeconds(outFile), provider: this.name };
    } finally {
      fs.rmSync(tmp, { force: true });
    }
  }
}

/** Primary provider, falling back to the dev voice so a render never dies on quota. */
export class FallbackTts implements TtsProvider {
  readonly name: string;
  readonly natural: boolean;
  constructor(private primary: TtsProvider, private backup: TtsProvider) {
    this.name = `${primary.name} → ${backup.name}`;
    this.natural = primary.natural;
  }
  async synthesize(text: string, outFile: string, cfg?: VoiceConfig): Promise<TtsResult> {
    try {
      return await this.primary.synthesize(text, outFile, cfg);
    } catch (e) {
      console.warn(`    ! ${this.primary.name} failed (${(e as Error).message.slice(0, 90)}) — using ${this.backup.name}`);
      return this.backup.synthesize(text, outFile, cfg);
    }
  }
}

export function getTtsProvider(kind = process.env.TTS_PROVIDER ?? "gemini"): TtsProvider {
  switch (kind) {
    case "gemini": {
      const dir = path.join(process.cwd(), ".cache", "narration");
      return new FallbackTts(
        new CachedTts(new GeminiTts(), dir),
        new CachedTts(new WindowsSapiTts(), dir),
      );
    }
    case "gemini-only": return new GeminiTts();
    case "windows-sapi": return new WindowsSapiTts();
    default: throw new Error(`Unknown TTS provider "${kind}"`);
  }
}
