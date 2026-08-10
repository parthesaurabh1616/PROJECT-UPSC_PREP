/* ════════════════════════════════════════════════════════════════
   SCRIPT LOCK (§20).

   This exists because of a specific, expensive failure: chasing one
   term-ordering error, ten whole-board regenerations were fired and the
   day's text quota was gone. The board was 95% correct every time.

   A lock records the hash of the source, the teaching plan, and EACH
   SCENE separately. Once locked:
     · a whole-board regeneration is refused,
     · drift is reported per scene, so only the broken scene is repaired,
     · TTS and rendering can trust the script is the approved one.

   Hashing is per-scene precisely so repair can be surgical. A single
   script-level hash would tell you something changed but not what, which
   is what pushes you back into regenerating everything.
   ════════════════════════════════════════════════════════════════ */
import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import { Storyboard } from "./types";

const sha = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16);

export interface SceneLock {
  n: number;
  /** Everything the learner receives: narration + on-screen + visual spec. */
  hash: string;
  /** Narration alone — drives whether cached audio is still valid. */
  narrationHash: string;
  primitive: string;
}

export interface ScriptLock {
  version: 1;
  topic: string;
  subject: string;
  lockedAt: string;
  /** Hash of the class material the board was built from. */
  sourceHash: string;
  teachingPlanHash: string;
  /** Hash over all scenes — cheap "did anything change at all" check. */
  scriptHash: string;
  scenes: SceneLock[];
}

export function sceneHash(s: Storyboard["scenes"][number]) {
  return {
    n: s.n,
    hash: sha(JSON.stringify({ b: s.beat, v: s.visual, t: s.onScreenText, nar: s.narration })),
    narrationHash: sha(s.narration ?? ""),
    primitive: s.visual?.primitive ?? "",
  };
}

export function computeLock(sb: Storyboard, sourceText: string): ScriptLock {
  const scenes = sb.scenes.map(sceneHash);
  return {
    version: 1,
    topic: sb.topic,
    subject: sb.subject,
    lockedAt: new Date().toISOString(),
    sourceHash: sha(sourceText),
    teachingPlanHash: sha(JSON.stringify(sb.teachingPlan ?? {})),
    scriptHash: sha(scenes.map((s) => s.hash).join("|")),
    scenes,
  };
}

const lockPath = (key: string) => path.join(process.cwd(), "storyboards", `${key}.lock.json`);

export function readLock(key: string): ScriptLock | null {
  try { return JSON.parse(fs.readFileSync(lockPath(key), "utf8")); } catch { return null; }
}

export function writeLock(key: string, lock: ScriptLock) {
  fs.writeFileSync(lockPath(key), JSON.stringify(lock, null, 2), "utf8");
}

export function isLocked(key: string) { return fs.existsSync(lockPath(key)); }

export interface LockVerdict {
  locked: boolean;
  intact: boolean;
  /** Scenes whose visible content changed since the lock. */
  driftedScenes: number[];
  /** Scenes whose NARRATION changed — the only ones needing new audio. */
  narrationChanged: number[];
  addedScenes: number[];
  removedScenes: number[];
  sourceChanged: boolean;
  summary: string;
}

/** Compare a board against its lock. Never mutates anything. */
export function verifyLock(key: string, sb: Storyboard, sourceText: string): LockVerdict {
  const lock = readLock(key);
  if (!lock) {
    return { locked: false, intact: true, driftedScenes: [], narrationChanged: [], addedScenes: [], removedScenes: [], sourceChanged: false, summary: "not locked" };
  }
  const now = sb.scenes.map(sceneHash);
  const byN = new Map(lock.scenes.map((s) => [s.n, s]));
  const nowN = new Set(now.map((s) => s.n));

  const drifted: number[] = [], narration: number[] = [], added: number[] = [];
  for (const s of now) {
    const was = byN.get(s.n);
    if (!was) { added.push(s.n); continue; }
    if (was.hash !== s.hash) drifted.push(s.n);
    if (was.narrationHash !== s.narrationHash) narration.push(s.n);
  }
  const removed = lock.scenes.filter((s) => !nowN.has(s.n)).map((s) => s.n);
  const sourceChanged = lock.sourceHash !== sha(sourceText);
  const intact = !drifted.length && !added.length && !removed.length;

  return {
    locked: true, intact,
    driftedScenes: drifted, narrationChanged: narration, addedScenes: added, removedScenes: removed,
    sourceChanged,
    summary: intact
      ? `locked and intact (${lock.scenes.length} scenes)`
      : `drift: ${drifted.length} changed, ${added.length} added, ${removed.length} removed` +
        `${narration.length ? `, ${narration.length} need new audio` : ""}` +
        `${sourceChanged ? ", SOURCE CHANGED" : ""}`,
  };
}

/** Thrown when something tries to regenerate an approved script wholesale. */
export class ScriptLockedError extends Error {
  constructor(key: string, verdict: LockVerdict) {
    super(
      `SCRIPT_LOCKED — "${key}" is locked (${verdict.summary}). ` +
      `Repair the failing scene instead of regenerating the board, or unlock deliberately: ` +
      `npx tsx scripts/script-lock.ts unlock ${key}`
    );
    this.name = "ScriptLockedError";
  }
}
