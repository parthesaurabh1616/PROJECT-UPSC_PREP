/* Next loads .env for the app; standalone tsx scripts get nothing.
   Import this first in any script that needs API keys. */
import fs from "fs";
import path from "path";

for (const file of [".env", ".env.local"]) {
  const p = path.join(process.cwd(), file);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    const value = m[2].replace(/^["']|["']$/g, "").replace(/\s+#.*$/, "").trim();
    if (value && !process.env[key]) process.env[key] = value;
  }
}
