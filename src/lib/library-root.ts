/* ════════════════════════════════════════════════════════════════
   Where the aspirant's study material actually lives.

   Single source of truth. The library used to sit under OneDrive,
   but OneDrive dehydrated files into cloud placeholders (NCERT's
   vanished from it entirely), so the whole "UPSC PREP" folder was
   moved to the plain Desktop. Five modules had the OneDrive path
   hardcoded and were silently reading the abandoned copy — the CA
   pipeline saw 47 of 206 files and NCERT scans hit a missing folder.

   Everything derives from LIBRARY_ROOT now. Set UPSC_LIBRARY_ROOT
   in .env if the folder ever moves again; nothing else changes.

   NOTE: the app itself deliberately lives at C:\Users\saura\Projects\
   upsc-prep-os, NOT inside this folder — Postgres bind-mounts
   .docker-data/postgres from there, so the app directory must stay
   put and must stay out of any sync root.
   ════════════════════════════════════════════════════════════════ */
import path from "path";

export const LIBRARY_ROOT =
  process.env.UPSC_LIBRARY_ROOT || "C:\\Users\\saura\\Desktop\\UPSC PREP";

/** Resolve a folder inside the study library. */
export const libraryPath = (...parts: string[]) => path.join(LIBRARY_ROOT, ...parts);
