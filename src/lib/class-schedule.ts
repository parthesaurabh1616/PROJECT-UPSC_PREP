/* ════════════════════════════════════════════════════════════════
   Unified StudyIQ class schedule — GS Foundation (Pratigya P2I,
   evening Hinglish batch) + PSIR optional (July batch).

   Three layers, most specific wins:
     1. ClassOverride rows in the DB — decoded from the weekly-schedule
        PDFs the institute publishes (dropped into the Class Schedules
        folder, or added manually). topic = null means "No class".
     2. STATIC_WEEKLY below — weekly PDFs already hand-decoded.
     3. Year blocks — the official (tentative) brochure timetables.

   Sessions drive dated CLASS tickets on the Sprint Board: the nightly
   job materializes the next days automatically; a class gets marked
   done when it's attended. Sundays are off for both tracks.
   ════════════════════════════════════════════════════════════════ */
import { prisma, DEMO_USER_ID } from "@/lib/db";
import { PSIR_CLASSES, PSIR_TESTS } from "@/lib/psir-schedule";

export type Track = "PSIR" | "GS";

export interface ClassSession {
  track: Track;
  subject: string;      // block subject ("Geography", "Paper 2B", …)
  topic: string;        // the day's topic (specific when a weekly PDF covers it)
  time: string;         // "5:30–9 pm"
  faculty?: string;
  exact: boolean;       // true = weekly-PDF detail, false = tentative year block
}

/* ── GS Foundation year blocks (brochure p.21 — tentative) ────── */
interface GsBlock { from: string; to: string; subject: string; time: string; faculty?: string; topic?: string }

export const GS_BLOCKS: GsBlock[] = [
  { from: "2026-07-07", to: "2026-07-07", subject: "Orientation", time: "6–8 pm", topic: "Orientation & decoding the syllabus of GS Papers 1–4" },
  { from: "2026-07-08", to: "2026-07-08", subject: "Geography (intro)", time: "6–8 pm", topic: "From Himalayas to Oceans: unlocking the Geography of India & the World" },
  { from: "2026-07-09", to: "2026-07-09", subject: "Ethics (intro)", time: "6–8 pm", topic: "The Making of an IAS Officer: Ethics, Integrity & Aptitude beyond the exam" },
  { from: "2026-07-10", to: "2026-07-10", subject: "Society (intro)", time: "6–8 pm", topic: "Understanding India: Society, Change & the Pursuit of Justice" },
  { from: "2026-07-13", to: "2026-08-14", subject: "Geography", time: "5:30–9 pm", faculty: "Bhuvan Jha" },
  { from: "2026-08-15", to: "2026-09-16", subject: "Ancient, Medieval & Art and Culture", time: "5–9 pm" },
  { from: "2026-09-17", to: "2026-10-23", subject: "Modern History", time: "6–9 pm" },
  { from: "2026-10-24", to: "2026-11-28", subject: "Economy", time: "5:30–9 pm" },
  { from: "2026-11-30", to: "2027-01-07", subject: "Polity", time: "5:30–9 pm" },
  { from: "2027-01-08", to: "2027-02-11", subject: "Ethics & Essay", time: "6–9 pm" },
  { from: "2027-02-12", to: "2027-03-13", subject: "World History & Post Independence", time: "6–8:30 pm" },
  { from: "2027-03-15", to: "2027-04-10", subject: "Environment & Disaster Management", time: "6–8:30 pm" },
  { from: "2027-04-12", to: "2027-05-08", subject: "Science & Tech", time: "6–9 pm" },
  // 2027-05-09 → 2027-05-25: Prelims Break (Prelims: 23 May 2027)
  { from: "2027-05-26", to: "2027-06-15", subject: "Society & Social Justice", time: "6–9 pm" },
  { from: "2027-06-16", to: "2027-07-10", subject: "International Relations, Internal Security & Governance", time: "5–9 pm" },
];

/* ── Weekly PDFs already decoded by hand (13–18 Jul 2026) ─────── */
/* value: topic string, or null = the PDF explicitly says "No class". */
const STATIC_WEEKLY: Record<Track, Record<string, string | null>> = {
  PSIR: {
    "2026-07-13": "India and the nuclear question",
    "2026-07-14": "India and the nuclear question",
    "2026-07-15": "Recent developments in Indian foreign policy",
    "2026-07-16": "Recent developments in Indian foreign policy",
    "2026-07-17": "Recent developments in Indian foreign policy",
    "2026-07-18": null, // No class (weekly notice)
  },
  GS: {
    "2026-07-13": null, // No class
    "2026-07-14": null, // No class
    "2026-07-15": "Universe & Solar System",
    "2026-07-16": "Earth's Interior",
    "2026-07-17": "Rocks & Minerals",
    "2026-07-18": "Earth's Crust",
  },
};

const PSIR_TIME = "12–3:30 pm";
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** All sessions on one calendar day (DB override > weekly const > year block). */
export async function sessionsOn(date: Date): Promise<ClassSession[]> {
  if (date.getDay() === 0) return []; // Sundays off (Mon–Sat batches)
  const key = iso(date);
  const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
  const overrides = await prisma.classOverride.findMany({ where: { day: dayStart } }).catch(() => []);
  const out: ClassSession[] = [];

  for (const track of ["PSIR", "GS"] as Track[]) {
    const ov = overrides.find((o) => o.track === track);
    // 1) DB override from a decoded weekly PDF
    if (ov) {
      if (ov.topic) out.push({ track, subject: track === "PSIR" ? "PSIR" : "GS", topic: ov.topic, time: ov.time ?? (track === "PSIR" ? PSIR_TIME : "evening"), faculty: ov.faculty ?? undefined, exact: true });
      continue; // topic null = explicitly no class
    }
    // 2) hand-decoded weekly constant
    if (key in STATIC_WEEKLY[track]) {
      const t = STATIC_WEEKLY[track][key];
      if (t !== null) {
        const blk = track === "GS" ? GS_BLOCKS.find((b) => key >= b.from && key <= b.to) : undefined;
        out.push({ track, subject: blk?.subject ?? (track === "PSIR" ? "PSIR" : "GS"), topic: t, time: track === "PSIR" ? PSIR_TIME : blk?.time ?? "evening", faculty: blk?.faculty, exact: true });
      }
      continue;
    }
    // 3) tentative year block
    if (track === "PSIR") {
      const c = PSIR_CLASSES.find((x) => key >= x.from && key <= x.to);
      if (c) out.push({ track, subject: "PSIR", topic: c.title, time: PSIR_TIME, exact: false });
    } else {
      const b = GS_BLOCKS.find((x) => key >= x.from && key <= x.to);
      if (b) out.push({ track, subject: b.subject, topic: b.topic ?? "topic as per weekly schedule", time: b.time, faculty: b.faculty, exact: false });
    }
  }
  return out;
}

/* ── Sprint Board materialization ─────────────────────────────── */
const DAY_LABEL = (d: Date) => d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

/** Stable per-day ticket prefix — dedupe key even if the topic later
    sharpens from a tentative block to weekly-PDF detail. */
const prefix = (track: Track, d: Date) => `${track} · ${DAY_LABEL(d)} ·`;

export interface ProposedTicket { title: string; metric: "manual"; target: 1; type: "CLASS" | "PRACTICE"; day: string; exact: boolean }

/** Proposed class/test tickets for [today, today+days). Pure preview — no writes. */
export async function upcomingClassTickets(days = 7): Promise<ProposedTicket[]> {
  const out: ProposedTicket[] = [];
  const start = new Date(); start.setHours(0, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    for (const s of await sessionsOn(d)) {
      const subj = s.track === "GS" && s.subject !== "GS" ? ` ${s.subject} —` : "";
      out.push({
        title: `${prefix(s.track, d)}${subj} ${s.topic} (${s.time})`.slice(0, 200),
        metric: "manual", target: 1, type: "CLASS", day: iso(d), exact: s.exact,
      });
    }
    const key = iso(d);
    for (const t of PSIR_TESTS.filter((t) => t.date === key)) {
      out.push({ title: `PSIR test ${t.n} · ${DAY_LABEL(d)} · ${t.name}`, metric: "manual", target: 1, type: "PRACTICE", day: key, exact: true });
    }
  }
  return out;
}

/** Create missing class/test tickets in the ACTIVE sprint (idempotent —
    a day+track already on the board is never duplicated). */
export async function syncClassTickets(days = 2): Promise<{ created: number; skipped: number; reason?: string }> {
  const now = new Date();
  const sprint = await prisma.sprint.findFirst({
    where: { userId: DEMO_USER_ID, startsAt: { lte: now }, endsAt: { gte: now } },
    include: { tasks: { select: { title: true } } },
  });
  if (!sprint) return { created: 0, skipped: 0, reason: "no active sprint" };

  // never beyond the sprint window
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const horizon = Math.max(1, Math.min(days, Math.ceil((sprint.endsAt.getTime() - todayStart.getTime()) / 86400000)));
  const proposed = await upcomingClassTickets(horizon);
  const existing = sprint.tasks.map((t) => t.title);
  let created = 0, skipped = 0;

  for (const p of proposed) {
    const d = new Date(`${p.day}T12:00:00`);
    const track: Track = p.title.startsWith("GS") ? "GS" : "PSIR";
    const dup = p.type === "PRACTICE"
      ? existing.some((t) => t === p.title)
      : existing.some((t) => t.startsWith(prefix(track, d)));
    if (dup) { skipped++; continue; }
    await prisma.sprintTask.create({
      data: { sprintId: sprint.id, title: p.title, metric: "manual", target: 1, type: p.type },
    });
    existing.push(p.title);
    created++;
  }
  return { created, skipped };
}

/* ── Weekly-schedule PDF pickup (Class Schedules folder) ──────── */
import fs from "fs";
import path from "path";

export const SCHEDULE_ROOT = "C:\\Users\\saura\\OneDrive\\Desktop\\UPSC PREP\\Class Schedules";

/** Register new/changed weekly-schedule PDFs (idempotent). */
export async function scanScheduleDocs(): Promise<{ found: number; added: number; changed: number }> {
  let found = 0, added = 0, changed = 0;
  if (!fs.existsSync(SCHEDULE_ROOT)) return { found, added, changed };
  for (const f of fs.readdirSync(SCHEDULE_ROOT)) {
    if (!f.toLowerCase().endsWith(".pdf")) continue;
    const p = path.join(SCHEDULE_ROOT, f);
    let st: fs.Stats;
    try { st = fs.statSync(p); } catch { continue; }
    found++;
    const existing = await prisma.scheduleDoc.findUnique({ where: { path: p } });
    if (!existing) {
      await prisma.scheduleDoc.create({ data: { path: p, filename: f, size: st.size, mtimeMs: st.mtimeMs } });
      added++;
    } else if (existing.size !== st.size || Math.abs(existing.mtimeMs - st.mtimeMs) > 1000) {
      await prisma.scheduleDoc.update({ where: { id: existing.id }, data: { size: st.size, mtimeMs: st.mtimeMs, status: "PENDING", error: null } });
      changed++;
    }
  }
  return { found, added, changed };
}

/** Weekly notices often omit the year and the model can guess wrong.
    A weekly schedule is always near today — snap the year to whichever
    candidate lands within 60 days of now, else reject the entry. */
function snapYear(d: Date, now: Date): Date | null {
  if (isNaN(d.getTime())) return null;
  const near = (x: Date) => Math.abs(x.getTime() - now.getTime()) <= 60 * 86400000;
  if (near(d)) return d;
  for (const y of [now.getFullYear(), now.getFullYear() + 1, now.getFullYear() - 1]) {
    const c = new Date(d); c.setFullYear(y);
    if (near(c)) return c;
  }
  return null;
}

/** Decode pending weekly-schedule PDFs → ClassOverride rows.
    Quota errors keep the doc PENDING for automatic retry. */
export async function decodeScheduleBatch(limit = 2): Promise<{ decoded: number; entries: number; failed: number }> {
  const { extractScheduleFromPdf } = await import("@/lib/ai");
  const pending = await prisma.scheduleDoc.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, take: Math.min(5, Math.max(1, limit)) });
  let decoded = 0, entries = 0, failed = 0;

  for (const doc of pending) {
    if (!fs.existsSync(doc.path)) {
      await prisma.scheduleDoc.update({ where: { id: doc.id }, data: { status: "FAILED", error: "file missing on disk" } });
      failed++; continue;
    }
    try {
      const rows = await extractScheduleFromPdf(doc.path);
      for (const r of rows) {
        const day = snapYear(new Date(`${r.date}T00:00:00`), new Date());
        if (!day) continue; // implausible date — never poison the planner
        await prisma.classOverride.upsert({
          where: { day_track: { day, track: r.track } },
          create: { day, track: r.track, topic: r.topic, time: r.time, faculty: r.faculty, source: doc.filename },
          update: { topic: r.topic, time: r.time, faculty: r.faculty, source: doc.filename },
        });
        entries++;
      }
      await prisma.scheduleDoc.update({ where: { id: doc.id }, data: { status: "DECODED", entries: rows.length, decodedAt: new Date(), error: null } });
      decoded++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const quota = /quota|rate.?limit|429|resource.?exhausted/i.test(msg);
      await prisma.scheduleDoc.update({
        where: { id: doc.id },
        data: { status: quota ? "PENDING" : "FAILED", error: msg.slice(0, 500) },
      });
      failed++;
      if (quota) break; // no point hammering a dead quota
    }
  }
  return { decoded, entries, failed };
}
