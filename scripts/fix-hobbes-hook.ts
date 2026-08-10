/* One-off repair of the Hobbes opening scene.
   HAND-WRITTEN, not generated — the text-model quota is exhausted, and the
   saved board opens with "Today, we explore Thomas Hobbes…", which the
   standard forbids (§68: don't spend the first seconds announcing a syllabus).
   The systemic fix is already in place: the validator now rejects that opener
   punctuation-tolerantly, so a regenerated board would be caught and retried.
   This only repairs today's artefact.

   Run: npx tsx scripts/fix-hobbes-hook.ts */
import fs from "fs";
import path from "path";
import { validateStoryboard } from "../src/lib/visual/storyboard";

const file = path.join(process.cwd(), "storyboards", "psir-hobbes.json");
const j = JSON.parse(fs.readFileSync(file, "utf8"));
const s1 = j.storyboard.scenes[0];

const before = s1.narration;

/* Opens on the everyday situation, not the thinker. Sets up the mechanism
   (no authority → everyone free → nobody safe) before any term is spoken,
   which is also what the ordering rule wants. Grounded in the class notes. */
s1.narration = "Imagine waking up tomorrow and finding there is no government, no police, no law. You are completely free. So is everyone else.";
s1.onScreenText = ["No government", "No police", "No law"];
s1.beat = "Hook: put the viewer inside the problem before naming any theory.";

// Re-time from the new word count, exactly as the generator would.
const words = s1.narration.trim().split(/\s+/).length;
s1.seconds = Math.max(4, Math.ceil(words / 2.4));
j.storyboard.totalSeconds = j.storyboard.scenes.reduce((t: number, x: { seconds: number }) => t + x.seconds, 0);

// Re-run the full validator so the stored problems reflect the current rules.
j.problems = validateStoryboard(j.storyboard, j.score);

fs.writeFileSync(file, JSON.stringify(j, null, 2), "utf8");
console.log("before :", before);
console.log("after  :", s1.narration);
console.log("seconds:", s1.seconds, "· total", j.storyboard.totalSeconds + "s");
console.log("QA     :", j.problems.length ? j.problems.join(" | ") : "PASSED");
