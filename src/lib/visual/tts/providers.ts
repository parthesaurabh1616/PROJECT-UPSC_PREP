/* Concrete TTS providers behind the common interface. */
import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";
import { CostEstimate, QuotaInfo, TtsOptions, TtsProvider, TtsResult } from "./types";
import { FREE_ALLOWANCE, canCoverJob, recordUsage, remaining } from "./quota";
import { applyPronunciation, pcmToWav, wavSeconds } from "../tts";

const run = promisify(execFile);
const ROOT = process.cwd();

const free = (provider: string, characters: number): CostEstimate => ({
  provider, characters,
  withinFreeAllowance: canCoverJob(provider, 1, characters).ok,
  estimatedInr: 0,
});

async function quotaOf(provider: string): Promise<QuotaInfo> {
  const r = remaining(provider);
  return { provider, requestsRemaining: r.requestsRemaining, charactersRemaining: r.charactersRemaining, window: r.window };
}

/* ── Kokoro: local, open weights, no key, no quota, works offline ──
   This is the safety net. Nothing about the study system may depend on a
   cloud provider being reachable. */
export class KokoroTts implements TtsProvider {
  readonly id = "kokoro";
  readonly label = "Kokoro (local)";
  readonly productionQuality = true;
  readonly alwaysFree = true;
  readonly offlineCapable = true;
  readonly defaultVoice = process.env.KOKORO_VOICE || "af_heart";

  private python = path.join(ROOT, ".venv-tts", "Scripts", "python.exe");
  private script = path.join(ROOT, "scripts", "kokoro_tts.py");
  private models = path.join(ROOT, ".cache", "kokoro");

  async isAvailable(): Promise<boolean> {
    return fs.existsSync(this.python) && fs.existsSync(this.script)
      && fs.existsSync(path.join(this.models, "kokoro-v1.0.onnx"))
      && fs.existsSync(path.join(this.models, "voices-v1.0.bin"));
  }

  async listVoices(): Promise<string[]> {
    if (!(await this.isAvailable())) return [];
    const { stdout } = await run(this.python, [this.script, "--list-voices", "--text-file", "-", "--out", "-"], { maxBuffer: 1 << 22 });
    return JSON.parse(stdout).voices as string[];
  }

  getRemainingQuota() { return quotaOf(this.id); }
  estimateCost(text: string) { return free(this.id, text.length); }

  async synthesize(text: string, outFile: string, o: TtsOptions = {}): Promise<TtsResult> {
    const tmp = path.join(os.tmpdir(), `kok-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`);
    fs.writeFileSync(tmp, applyPronunciation(text), "utf8");
    try {
      /* Kokoro runs fast — measured 2.3–2.7 w/s against Gemini's ~1.95. For
         teaching that is too quick, so the default is deliberately slowed. */
      const speed = o.speed ?? Number(process.env.KOKORO_SPEED ?? 0.8);
      const { stdout } = await run(this.python, [
        this.script, "--text-file", tmp, "--out", outFile,
        "--voice", o.voice ?? this.defaultVoice, "--speed", String(speed),
      ], { maxBuffer: 1 << 24 });
      const r = JSON.parse(stdout.trim().split("\n").pop() as string);
      shapeProsody(outFile);
      recordUsage(this.id, text.length);
      return {
        audioPath: outFile, durationMs: wavSeconds(outFile) * 1000,
        provider: this.id, voice: o.voice ?? this.defaultVoice,
        format: "wav", sampleRate: r.sampleRate, cached: false, productionQuality: true,
      };
    } finally { fs.rmSync(tmp, { force: true }); }
  }
}

/**
 * Loudness normalisation for local output.
 * Measured: Kokoro lands around -21 dBFS RMS against Gemini's -16, so without
 * this a mixed library would jump in volume between lessons.
 */
export function shapeProsody(file: string, targetDb = -17) {
  const b = fs.readFileSync(file);
  if (b.toString("ascii", 0, 4) !== "RIFF") return;
  let pos = 12, dataStart = 0, dataSize = 0;
  while (pos + 8 <= b.length) {
    const id = b.toString("ascii", pos, pos + 4);
    const size = b.readUInt32LE(pos + 4);
    if (id === "data") { dataStart = pos + 8; dataSize = size; break; }
    pos += 8 + size + (size % 2);
  }
  if (!dataStart) return;
  const n = Math.floor(dataSize / 2);
  let sumSq = 0;
  for (let i = 0; i < n; i++) { const v = b.readInt16LE(dataStart + i * 2) / 32768; sumSq += v * v; }
  const rms = Math.sqrt(sumSq / n) || 1e-9;
  const gain = Math.pow(10, targetDb / 20) / rms;
  if (!isFinite(gain) || gain <= 0) return;
  for (let i = 0; i < n; i++) {
    const v = (b.readInt16LE(dataStart + i * 2) / 32768) * gain;
    b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(Math.max(-1, Math.min(1, v)) * 32767))), dataStart + i * 2);
  }
  fs.writeFileSync(file, b);
}

/* ── Azure Neural TTS — F0 free tier is 0.5M characters/month ──
   IMPLEMENTED BUT UNVERIFIED: no AZURE_SPEECH_KEY is configured on this
   machine, so this code path has never executed. Treated as unavailable
   until a key exists rather than assumed to work. */
export class AzureTts implements TtsProvider {
  readonly id = "azure";
  readonly label = "Azure Neural TTS";
  readonly productionQuality = true;
  readonly alwaysFree = false; // F0 is free; S0 bills. Guarded by the ledger.
  readonly offlineCapable = false;
  readonly defaultVoice = process.env.AZURE_TTS_VOICE || "en-IN-NeerjaNeural";

  async isAvailable() { return Boolean(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION); }
  async listVoices() { return [this.defaultVoice]; }
  getRemainingQuota() { return quotaOf(this.id); }
  estimateCost(text: string) { return free(this.id, text.length); }

  async synthesize(text: string, outFile: string, o: TtsOptions = {}): Promise<TtsResult> {
    const key = process.env.AZURE_SPEECH_KEY, region = process.env.AZURE_SPEECH_REGION;
    if (!key || !region) throw new Error("AZURE_SPEECH_KEY / AZURE_SPEECH_REGION not set");
    const voice = o.voice ?? this.defaultVoice;
    const rate = o.speed ? `${Math.round((o.speed - 1) * 100)}%` : "-8%";
    // Light SSML only: a break after each sentence for processing time.
    const body = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
<voice name="${voice}"><prosody rate="${rate}">${escapeXml(applyPronunciation(text)).replace(/\.\s+/g, '.<break time="320ms"/> ')}</prosody></voice></speak>`;

    const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "riff-24khz-16bit-mono-pcm",
        "User-Agent": "conquer-capital",
      },
      body,
    });
    if (!res.ok) throw new Error(`Azure TTS ${res.status}: ${(await res.text()).slice(0, 160)}`);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, Buffer.from(await res.arrayBuffer()));
    recordUsage(this.id, text.length);
    return {
      audioPath: outFile, durationMs: wavSeconds(outFile) * 1000,
      provider: this.id, voice, format: "wav", sampleRate: 24000, cached: false, productionQuality: true,
    };
  }
}

const escapeXml = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c] as string));

/* ── Gemini TTS — excellent, but 10 requests/day on the free tier ── */
export class GeminiTtsProvider implements TtsProvider {
  readonly id = "gemini-tts";
  readonly label = "Gemini 2.5 Flash TTS";
  readonly productionQuality = true;
  readonly alwaysFree = false;
  readonly offlineCapable = false;
  readonly defaultVoice = process.env.TTS_VOICE || "Charon";

  async isAvailable() { return Boolean(process.env.GOOGLE_API_KEY); }
  async listVoices() { return ["Charon", "Sulafat", "Vindemiatrix"]; }
  getRemainingQuota() { return quotaOf(this.id); }
  estimateCost(text: string) { return free(this.id, text.length); }

  async synthesize(text: string, outFile: string, o: TtsOptions = {}): Promise<TtsResult> {
    const key = process.env.GOOGLE_API_KEY;
    if (!key) throw new Error("GOOGLE_API_KEY not set");
    const voice = o.voice ?? this.defaultVoice;
    const style = o.style ?? "Read as a warm, patient teacher explaining to a student hearing this for the first time. Calm, unhurried, pause at full stops.";
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${key}`,
      {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${style}\n\n${applyPronunciation(text)}` }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
          },
        }),
      });
    if (!res.ok) throw new Error(`Gemini TTS ${res.status}: ${(await res.text()).slice(0, 160)}`);
    type Part = { inlineData?: { data: string; mimeType?: string } };
    const j = await res.json() as { candidates?: { content?: { parts?: Part[] } }[] };
    const part = j?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
    if (!part) throw new Error("Gemini returned no audio");
    const rate = Number(/rate=(\d+)/.exec(part.mimeType ?? "")?.[1] ?? 24000);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, pcmToWav(Buffer.from(part.data, "base64"), rate));
    recordUsage(this.id, text.length);
    return {
      audioPath: outFile, durationMs: wavSeconds(outFile) * 1000,
      provider: this.id, voice, format: "wav", sampleRate: rate, cached: false, productionQuality: true,
    };
  }
}

/* ── SAPI — development only. Never auto-selected. ── */
export class SapiTts implements TtsProvider {
  readonly id = "sapi";
  readonly label = "Windows SAPI (PLACEHOLDER)";
  readonly productionQuality = false;
  readonly alwaysFree = true;
  readonly offlineCapable = true;
  readonly defaultVoice = "Microsoft Zira Desktop";

  async isAvailable() { return process.platform === "win32"; }
  async listVoices() { return ["Microsoft Zira Desktop", "Microsoft David Desktop"]; }
  getRemainingQuota() { return quotaOf(this.id); }
  estimateCost(text: string) { return free(this.id, text.length); }

  async synthesize(text: string, outFile: string, o: TtsOptions = {}): Promise<TtsResult> {
    const tmp = path.join(os.tmpdir(), `sapi-${Date.now()}.txt`);
    fs.writeFileSync(tmp, applyPronunciation(text), "utf8");
    try {
      await run("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
        path.join(ROOT, "scripts", "tts-sapi.ps1"), "-TextFile", tmp, "-OutFile", outFile,
        "-Voice", o.voice ?? this.defaultVoice, "-Rate", "-1"], { windowsHide: true, maxBuffer: 1 << 22 });
      return {
        audioPath: outFile, durationMs: wavSeconds(outFile) * 1000,
        provider: this.id, voice: o.voice ?? this.defaultVoice,
        format: "wav", sampleRate: 22050, cached: false, productionQuality: false,
      };
    } finally { fs.rmSync(tmp, { force: true }); }
  }
}

export const ALL_PROVIDERS: TtsProvider[] = [
  new AzureTts(), new GeminiTtsProvider(), new KokoroTts(), new SapiTts(),
];

export { FREE_ALLOWANCE };
