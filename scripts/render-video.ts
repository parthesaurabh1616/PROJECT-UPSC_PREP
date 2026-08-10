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
import { getTtsProvider } from "../src/lib/visual/tts";

const FPS = 30;
const ROOT = process.cwd();
const BOARDS = path.join(ROOT, "storyboards");
const NARRATION = path.join(ROOT, "public", "narration");
const VIDEOS = path.join(ROOT, "public", "videos");
/** Breathing room after a line lands, so scenes don't cut on the last syllable. */
const TAIL_SECONDS = 0.7;
const SILENT = new Set(["RECALL_FRAME", "MEMORY_ANCHOR"]);

async function buildTimeline(key: string, board: any) {
  const tts = getTtsProvider();
  const scenes = board.storyboard.scenes;
  const outDir = path.join(NARRATION, key);
  fs.mkdirSync(outDir, { recursive: true });

  const timed = [];
  for (const s of scenes) {
    const silent = SILENT.has(s.visual.primitive) || !s.narration?.trim();
    let seconds = s.seconds;
    let audio: string | null = null;

    if (!silent) {
      const wav = path.join(outDir, `${String(s.n).padStart(2, "0")}.wav`);
      const res = await tts.synthesize(s.narration.trim(), wav);
      seconds = res.seconds + TAIL_SECONDS;
      audio = `narration/${key}/${path.basename(wav)}`;
      process.stdout.write(`    scene ${String(s.n).padStart(2)} · ${res.seconds.toFixed(1)}s audio\n`);
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
  return timed;
}

(async () => {
  const only = process.argv[2];
  const files = fs.readdirSync(BOARDS).filter((f) => f.endsWith(".json") && (!only || f.startsWith(only)));
  if (!files.length) { console.error("no storyboards found"); process.exit(1); }

  fs.mkdirSync(VIDEOS, { recursive: true });

  /* Narration for EVERY board must exist before bundling: bundle() copies
     publicDir into a temp folder, so anything written afterwards is invisible
     to the renderer and 404s mid-render. */
  const jobs: { key: string; board: any; scenes: any[] }[] = [];
  for (const f of files) {
    const key = f.replace(/\.json$/, "");
    const board = JSON.parse(fs.readFileSync(path.join(BOARDS, f), "utf8"));
    console.log(`\n── ${board.storyboard.topic}\n  synthesising narration…`);
    jobs.push({ key, board, scenes: await buildTimeline(key, board) });
  }

  console.log("\nbundling the Remotion project…");
  const publicDir = path.join(ROOT, "public");
  const serveUrl = await bundle({ entryPoint: path.join(ROOT, "video", "index.ts"), publicDir });

  for (const { key, board, scenes } of jobs) {
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

    const size = fs.statSync(outputLocation).size;
    console.log(`  ✓ ${path.relative(ROOT, outputLocation)} · ${(size / 1048576).toFixed(1)} MB`);
  }
})().catch((e) => { console.error("\nRENDER FAILED:", e?.message ?? e); process.exit(1); });
