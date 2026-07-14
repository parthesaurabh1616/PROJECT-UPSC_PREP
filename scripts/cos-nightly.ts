/* COS nightly job (idempotent — safe to run any time, D-4 budget).
   ① materialize due topic-revisions as sprint tickets
   ② persist the Sunday profile snapshot
   ③ drain the artifact queue (≤10 generations, stops early on quota)
   Run: npx tsx scripts/cos-nightly.ts  (optionally via Task Scheduler 04:05) */
import { readFileSync } from "fs";
try {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* */ }

async function main() {
  const { materializeDueRevisions } = await import("../src/lib/cos");
  const { maybeSnapshot } = await import("../src/lib/cos-profile");
  const { drainArtifactQueue } = await import("../src/lib/cos-artifacts");

  const tickets = await materializeDueRevisions();
  console.log(`① revisions materialized: ${tickets}`);
  await maybeSnapshot();
  console.log("② snapshot: done (Sundays only)");
  const { generated, failed } = await drainArtifactQueue(10);
  console.log(`③ artifacts: ${generated} generated, ${failed} failed`);
  const { boardBatch } = await import("../src/lib/upsc-board");
  const b = await boardBatch(10);
  console.log(`④ examination board: ${b.judged} judged (${b.worthy} worthy · ${b.rejected} rejected · ${b.failed} failed)`);
  const { scanSources, decodeSourceBatch } = await import("../src/lib/ca-sources");
  const scan = await scanSources();
  const dec = await decodeSourceBatch(4);
  console.log(`⑤ source PDFs: +${scan.added} new/${scan.changed} changed · decoded ${dec.decoded} → ${dec.items} items (${dec.failed} failed)`);
  const { ensureSheets } = await import("../src/lib/ca-sheets");
  console.log(`⑥ daily CA sheets refreshed: ${await ensureSheets()}`);
  try {
    const { generateDailyQuiz } = await import("../src/lib/ca-quiz");
    const yday = new Date(Date.now() - 86400000);
    const today = new Date();
    const a = await generateDailyQuiz(yday).catch(() => null);
    const b = await generateDailyQuiz(today).catch(() => null);
    console.log(`⑦ MCQ drills ready: ${[a && "yesterday", b && "today"].filter(Boolean).join(" + ") || "none (no sheets/quota)"}`);
  } catch { console.log("⑦ MCQ drills: skipped"); }
  const { scanScheduleDocs, decodeScheduleBatch, syncClassTickets } = await import("../src/lib/class-schedule");
  const ss = await scanScheduleDocs();
  const sd = await decodeScheduleBatch(2);
  const ct = await syncClassTickets(2);
  console.log(`⑧ class schedule: +${ss.added} new/${ss.changed} changed weekly PDFs · decoded ${sd.decoded} (${sd.entries} days) · ${ct.created} class tickets created${ct.reason ? ` (${ct.reason})` : ""}`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
