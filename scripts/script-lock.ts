/* Script lock CLI — no LLM, no TTS, no network.
     npx tsx scripts/script-lock.ts status [key]
     npx tsx scripts/script-lock.ts lock   <key>
     npx tsx scripts/script-lock.ts verify [key]
     npx tsx scripts/script-lock.ts unlock <key>
*/
import fs from "fs";
import path from "path";
import { computeLock, readLock, verifyLock, writeLock } from "../src/lib/visual/lock";

const BOARDS = path.join(process.cwd(), "storyboards");
const keys = (only?: string) =>
  fs.readdirSync(BOARDS).filter((f) => f.endsWith(".json") && !f.endsWith(".lock.json"))
    .map((f) => f.replace(/\.json$/, "")).filter((k) => !only || k.startsWith(only));

const load = (key: string) => JSON.parse(fs.readFileSync(path.join(BOARDS, `${key}.json`), "utf8"));

/* The source text a board was built from. Scenes carry sourceAnchor values,
   which is the most faithful record we have inside the artefact itself. */
const sourceOf = (board: any) =>
  (board.storyboard.scenes ?? []).map((s: { sourceAnchor?: string }) => s.sourceAnchor ?? "").join("|");

const [cmd = "status", only] = process.argv.slice(2);

for (const key of keys(only)) {
  const board = load(key);
  const sb = board.storyboard;

  if (cmd === "lock") {
    writeLock(key, computeLock(sb, sourceOf(board)));
    console.log(`  🔒 locked  ${key}  (${sb.scenes.length} scenes)`);
  } else if (cmd === "unlock") {
    const p = path.join(BOARDS, `${key}.lock.json`);
    if (fs.existsSync(p)) { fs.rmSync(p); console.log(`  🔓 unlocked  ${key}`); }
    else console.log(`  —  ${key} was not locked`);
  } else {
    const v = verifyLock(key, sb, sourceOf(board));
    const lock = readLock(key);
    console.log(`  ${v.locked ? (v.intact ? "🔒" : "⚠ ") : "  "} ${key.padEnd(22)} ${v.summary}${lock ? `  · locked ${lock.lockedAt.slice(0, 16).replace("T", " ")}` : ""}`);
    if (v.driftedScenes.length) console.log(`      changed scenes : ${v.driftedScenes.join(", ")}`);
    if (v.narrationChanged.length) console.log(`      need new audio : ${v.narrationChanged.join(", ")}`);
    if (v.addedScenes.length) console.log(`      added          : ${v.addedScenes.join(", ")}`);
    if (v.removedScenes.length) console.log(`      removed        : ${v.removedScenes.join(", ")}`);
  }
}
