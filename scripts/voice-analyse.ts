/* Objective waveform analysis of the candidate voices.
   This does NOT judge timbre or warmth — that needs ears. It measures the
   things that ARE measurable and that the selection criteria depend on:
   speaking pace, pause structure, loudness consistency and headroom. */
import fs from "fs";
import path from "path";

const SAMPLE_WORDS = 33; // the identical test line spoken by every candidate

function readPcm(file: string) {
  const b = fs.readFileSync(file);
  let pos = 12, sampleRate = 0, channels = 1, bits = 16, dataStart = 0, dataSize = 0;
  while (pos + 8 <= b.length) {
    const id = b.toString("ascii", pos, pos + 4);
    const size = b.readUInt32LE(pos + 4);
    if (id === "fmt ") {
      channels = b.readUInt16LE(pos + 10);
      sampleRate = b.readUInt32LE(pos + 12);
      bits = b.readUInt16LE(pos + 22);
    }
    if (id === "data") { dataStart = pos + 8; dataSize = size; break; }
    pos += 8 + size + (size % 2);
  }
  const n = Math.floor(dataSize / (bits / 8) / channels);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) s[i] = b.readInt16LE(dataStart + i * 2 * channels) / 32768;
  return { samples: s, sampleRate };
}

function analyse(file: string) {
  const { samples, sampleRate } = readPcm(file);
  const seconds = samples.length / sampleRate;

  let sumSq = 0, peak = 0;
  for (const v of samples) { sumSq += v * v; peak = Math.max(peak, Math.abs(v)); }
  const rms = Math.sqrt(sumSq / samples.length);

  // 20 ms frames; a frame under 2% of peak counts as silence.
  const frame = Math.floor(sampleRate * 0.02);
  const thresh = peak * 0.02;
  const frames: boolean[] = [];
  for (let i = 0; i + frame <= samples.length; i += frame) {
    let m = 0;
    for (let j = i; j < i + frame; j++) m = Math.max(m, Math.abs(samples[j]));
    frames.push(m < thresh);
  }
  let pauses = 0, run = 0, silent = 0, longest = 0;
  for (const q of frames) {
    if (q) { run++; silent++; } else { if (run >= 7) pauses++; longest = Math.max(longest, run); run = 0; }
  }
  if (run >= 7) pauses++;
  longest = Math.max(longest, run);

  // Loudness consistency: spread of per-frame RMS across speech frames only.
  const speechRms: number[] = [];
  for (let i = 0; i + frame <= samples.length; i += frame) {
    let s2 = 0;
    for (let j = i; j < i + frame; j++) s2 += samples[j] * samples[j];
    const r = Math.sqrt(s2 / frame);
    if (r > thresh) speechRms.push(r);
  }
  const mean = speechRms.reduce((a, b) => a + b, 0) / (speechRms.length || 1);
  const varc = speechRms.reduce((a, b) => a + (b - mean) ** 2, 0) / (speechRms.length || 1);

  return {
    seconds,
    sampleRate,
    wordsPerSec: SAMPLE_WORDS / seconds,
    rmsDb: 20 * Math.log10(rms || 1e-9),
    peakDb: 20 * Math.log10(peak || 1e-9),
    crestDb: 20 * Math.log10((peak || 1e-9) / (rms || 1e-9)),
    silencePct: (silent / frames.length) * 100,
    pauses,
    longestPauseMs: longest * 20,
    loudnessCv: Math.sqrt(varc) / (mean || 1e-9),
  };
}

const dir = path.join(process.cwd(), "public", "narration", "_samples");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".wav"));
console.log("voice          secs  w/s   RMS dB  peak dB  crest  silence%  pauses  longest  loudnessCV");
for (const f of files) {
  const a = analyse(path.join(dir, f));
  const name = f.replace(/^voice-|\.wav$/g, "");
  console.log(
    name.padEnd(14) +
    a.seconds.toFixed(1).padStart(5) +
    a.wordsPerSec.toFixed(2).padStart(6) +
    a.rmsDb.toFixed(1).padStart(9) +
    a.peakDb.toFixed(1).padStart(9) +
    a.crestDb.toFixed(1).padStart(7) +
    a.silencePct.toFixed(1).padStart(10) +
    String(a.pauses).padStart(8) +
    (a.longestPauseMs + "ms").padStart(9) +
    a.loudnessCv.toFixed(2).padStart(12)
  );
}
