/* ════════════════════════════════════════════════════════════════
   Narration synthesis behind a provider interface.

   The offline Windows SAPI provider exists so the whole pipeline can
   run end-to-end today at zero quota cost — you re-render many times
   while tuning pacing, and burning free-tier API calls on every pass
   would be wasteful. Swapping in Gemini/Groq TTS later means adding
   one class here; nothing else in the pipeline changes.
   ════════════════════════════════════════════════════════════════ */
import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";

const run = promisify(execFile);

export interface TtsResult { file: string; seconds: number }

export interface TtsProvider {
  readonly name: string;
  synthesize(text: string, outFile: string): Promise<TtsResult>;
}

/**
 * Real duration of a PCM wav, read from its header.
 * Timing the video off measured audio rather than an estimated words-per-second
 * is what keeps narration and animation actually in sync.
 */
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

export class WindowsSapiTts implements TtsProvider {
  readonly name = "windows-sapi";
  constructor(private voice = "Microsoft Zira Desktop", private rate = -1) {}

  async synthesize(text: string, outFile: string): Promise<TtsResult> {
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    const tmp = path.join(os.tmpdir(), `narr-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`);
    fs.writeFileSync(tmp, text, "utf8");
    try {
      const script = path.join(process.cwd(), "scripts", "tts-sapi.ps1");
      await run("powershell", [
        "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script,
        "-TextFile", tmp, "-OutFile", outFile, "-Voice", this.voice, "-Rate", String(this.rate),
      ], { windowsHide: true, maxBuffer: 1 << 22 });
      if (!fs.existsSync(outFile)) throw new Error("synthesis produced no file");
      return { file: outFile, seconds: wavSeconds(outFile) };
    } finally {
      fs.rmSync(tmp, { force: true });
    }
  }
}

/** Explicit no-audio path, so a silent render is a deliberate choice. */
export class NullTts implements TtsProvider {
  readonly name = "null";
  async synthesize(): Promise<TtsResult> { throw new Error("NullTts cannot synthesize"); }
}

export function getTtsProvider(kind = process.env.TTS_PROVIDER ?? "windows-sapi"): TtsProvider {
  switch (kind) {
    case "windows-sapi": return new WindowsSapiTts();
    case "null": return new NullTts();
    // Integration point: a GeminiTts / GroqTts class drops in here and the
    // rest of the pipeline is unchanged.
    default: throw new Error(`Unknown TTS provider "${kind}"`);
  }
}
