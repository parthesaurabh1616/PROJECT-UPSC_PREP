import "./env";
/* ════════════════════════════════════════════════════════════════
   Storyboard → narration → timed composition → MP4.
   Run: npx tsx scripts/render-video.ts [boardKey]

   Scene durations come from the MEASURED length of each narration wav,
   not from the storyboard's estimate. Estimated pacing is what put the
   first boards out of sync; measured audio cannot drift.
   ════════════════════════════════════════════════════════════════ */
import fs from "fs";
import path from "path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { preflight, synthesizeSegment, assertProduction } from "../src/lib/visual/tts/router";
import type { TtsMode } from "../src/lib/visual/tts/types";

const FPS = 30;
const ROOT = process.cwd();
const BOARDS = path.join(ROOT, "storyboards");
const NARRATION = path.join(ROOT, "public", "narration");
const VIDEOS = path.join(ROOT, "public", "videos");
/** Breathing room after a line lands, so scenes don't cut on the last syllable. */
const TAIL_SECONDS = 0.7;
const SILENT = new Set(["RECALL_FRAME", "MEMORY_ANCHOR"]);

async function buildTimeline(key: string, board: any) {
  const mode = (process.env.TTS_MODE as TtsMode) ?? "free";
  const scenes = board.storyboard.scenes;

  /* Preflight BEFORE any synthesis: pick one provider that can cover the whole
     lesson, or refuse. A narrator who changes voice halfway is worse than a
     render that never started. */
  const segments = scenes
    .filter((s: any) => !SILENT.has(s.visual.primitive) && s.narration?.trim())
    .map((s: any) => ({ id: String(s.n), text: s.narration.trim() }));
  const pf = await preflight(segments, { mode });
  assertProduction(pf, mode);
  const provider = pf.chosen!;
  console.log(`  provider ${provider.label} · voice ${provider.defaultVoice} · ${pf.cached}/${pf.uniqueSegments} cached`);
  const outDir = path.join(NARRATION, key);
  fs.mkdirSync(outDir, { recursive: true });

  const timed = [];
  let degraded = 0;
  const voices = new Set<string>();
  for (const s of scenes) {
    const silent = SILENT.has(s.visual.primitive) || !s.narration?.trim();
    let seconds = s.seconds;
    let audio: string | null = null;

    if (!silent) {
      const wav = path.join(outDir, `${String(s.n).padStart(2, "0")}.wav`);
      const res = await synthesizeSegment(provider, s.narration.trim(), wav);
      seconds = res.durationMs / 1000 + TAIL_SECONDS;
      audio = `narration/${key}/${path.basename(wav)}`;
      // Track the voice that actually produced this line. A quality claim the
      // artefact cannot support is worse than an obviously bad voice.
      const placeholder = !res.productionQuality;
      if (placeholder) degraded++;
      voices.add(`${res.provider}:${res.voice}`);
      process.stdout.write(
        `    scene ${String(s.n).padStart(2)} · ${(res.durationMs / 1000).toFixed(1)}s` +
        `${res.cached ? " (cached)" : ""}${placeholder ? "  ⚠ placeholder" : ""}\n`);
    } else {
      process.stdout.write(`    scene ${String(s.n).padStart(2)} · silent (${seconds}s)\n`);
    }

    timed.push({
      n: s.n,
      frames: Math.max(30, Math.round(seconds * FPS)),
      primitive: s.visual.primitive,
      props: s.visual.props ?? {},
      narration: silent ? "" : s.narration,
      onScreenText: s.onScreenText ?? [],
      audio,
    });
  }
  if (degraded) {
    // A robotic line inside an otherwise natural narration is worse than an
    // obvious failure — surface it loudly rather than shipping it quietly.
    console.warn(`  ⚠ ${degraded} scene(s) used the PLACEHOLDER voice. Re-run to fill them from the natural voice.`);
  }
  return { timed, degraded, voices: [...voices] };
}

(async () => {
  const only = process.argv[2];
  const files = fs.readdirSync(BOARDS).filter((f) => f.endsWith(".json") && (!only || f.startsWith(only)));
  if (!files.length) { console.error("no storyboards found"); process.exit(1); }

  fs.mkdirSync(VIDEOS, { recursive: true });

  /* Narration for EVERY board must exist before bundling: bundle() copies
     publicDir into a temp folder, so anything written afterwards is invisible
     to the renderer and 404s mid-render. */
  const jobs: { key: string; board: any; scenes: any[]; degraded: number; voices: string[] }[] = [];
  for (const f of files) {
    const key = f.replace(/\.json$/, "");
    const board = JSON.parse(fs.readFileSync(path.join(BOARDS, f), "utf8"));
    console.log(`\n── ${board.storyboard.topic}\n  synthesising narration…`);
    const built = await buildTimeline(key, board);
    jobs.push({ key, board, scenes: built.timed, degraded: built.degraded, voices: built.voices });
  }

  console.log("\nbundling the Remotion project…");
  const publicDir = path.join(ROOT, "public");
  const serveUrl = await bundle({ entryPoint: path.join(ROOT, "video", "index.ts"), publicDir });

  for (const { key, board, scenes, degraded, voices } of jobs) {
    console.log(`\n── rendering ${board.storyboard.topic}`);
    const inputProps = {
      topic: board.storyboard.topic,
      subject: board.storyboard.subject,
      scenes,
    };
    const totalFrames = scenes.reduce((s, x) => s + x.frames, 0);
    console.log(`  runtime ${(totalFrames / FPS / 60).toFixed(1)} min · ${scenes.length} scenes`);

    // Neither selectComposition nor renderMedia takes publicDir — bundle()
    // already copied public/ into the served bundle, which is what makes
    // staticFile() resolve the narration wavs.
    const composition = await selectComposition({ serveUrl, id: "VisualRevision", inputProps });
    const outputLocation = path.join(VIDEOS, `${key}.mp4`);

    let lastPct = -1;
    await renderMedia({
      composition: { ...composition, durationInFrames: totalFrames },
      serveUrl,
      codec: "h264",
      outputLocation,
      inputProps,
      onProgress: ({ progress }) => {
        const pct = Math.round(progress * 100);
        if (pct >= lastPct + 10) { lastPct = pct; process.stdout.write(`  render ${pct}%\n`); }
      },
    });

    /* Voice provenance travels with the artefact, so the UI reports what the
       file actually contains rather than what we hoped it would. */
    fs.writeFileSync(outputLocation.replace(/\.mp4$/, ".voice.json"), JSON.stringify({
      voices, placeholderScenes: degraded, natural: degraded === 0 && !voices.some((v) => v.includes("sapi")),
      renderedAt: new Date().toISOString(),
    }, null, 2), "utf8");

    const size = fs.statSync(outputLocation).size;
    console.log(`  ${degraded ? "⚠" : "✓"} ${path.relative(ROOT, outputLocation)} · ${(size / 1048576).toFixed(1)} MB` +
      `${degraded ? ` · ⚠ ${degraded}/${scenes.length} scene(s) PLACEHOLDER voice` : " · natural voice throughout"}`);
  }
})().catch((e) => { console.error("\nRENDER FAILED:", e?.message ?? e); process.exit(1); });
