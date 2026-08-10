/* TTS preflight — know before you render, not halfway through.
   Run: npx tsx scripts/tts-preflight.ts [boardKey] */
import "./env";
import fs from "fs";
import path from "path";
import { preflight } from "../src/lib/visual/tts/router";
import { ALL_PROVIDERS } from "../src/lib/visual/tts/providers";
import { remaining } from "../src/lib/visual/tts/quota";
import type { TtsMode } from "../src/lib/visual/tts/types";

const SILENT = new Set(["RECALL_FRAME", "MEMORY_ANCHOR"]);

(async () => {
  const only = process.argv[2];
  const mode = (process.env.TTS_MODE as TtsMode) ?? "free";
  const dir = path.join(process.cwd(), "storyboards");
  const files = fs.readdirSync(dir)// .lock.json sidecars sit beside boards — they are not boards.
    .filter((f) => f.endsWith(".json") && !f.endsWith(".lock.json") && (!only || f.startsWith(only)));

  console.log(`\nPROVIDERS                                    available  free allowance left`);
  console.log("─".repeat(78));
  for (const p of ALL_PROVIDERS) {
    const ok = await p.isAvailable();
    const r = remaining(p.id);
    const left = r.window === "none" ? "unmetered"
      : `${r.requestsRemaining ?? "—"} req / ${r.charactersRemaining ?? "—"} chars per ${r.window}`;
    console.log(`${p.label.padEnd(42)} ${(ok ? "yes" : "no").padEnd(10)} ${left}${p.productionQuality ? "" : "   (PLACEHOLDER)"}`);
  }

  for (const f of files) {
    const board = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    const segments = board.storyboard.scenes
      .filter((s: { visual: { primitive: string }; narration?: string }) => !SILENT.has(s.visual.primitive) && s.narration?.trim())
      .map((s: { n: number; narration: string }) => ({ id: String(s.n), text: s.narration.trim() }));

    const pf = await preflight(segments, { mode });
    console.log(`\nTTS PREFLIGHT — ${board.storyboard.topic}`);
    console.log("─".repeat(78));
    console.log(`  mode           ${mode}   ALLOW_BILLABLE_TTS=${process.env.ALLOW_BILLABLE_TTS ?? "false"}`);
    console.log(`  segments       ${pf.segments}  (${pf.uniqueSegments} unique, ${pf.characters} chars)`);
    console.log(`  cached         ${pf.cached}`);
    console.log(`  required       ${pf.required}`);
    for (const c of pf.candidates) console.log(`    · ${c.id.padEnd(12)} ${c.verdict}`);
    console.log(`  PROVIDER       ${pf.chosen ? `${pf.chosen.label} · voice ${pf.chosen.defaultVoice}` : "—"}`);
    console.log(`  STATUS         ${pf.status}`);
    if (pf.status === "INSUFFICIENT") console.log(`  → render blocked; configure another provider or free quota`);
  }
  console.log();
})();
