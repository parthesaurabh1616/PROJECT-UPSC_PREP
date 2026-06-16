/* ════════════════════════════════════════════════════════════
   Geo gazetteer — resolves a news item's text to lat/lng so the
   intelligence globe places markers at the real location.
   Precision order: district > state > city > country > GS fallback.
   ════════════════════════════════════════════════════════════ */

export type Coord = [number, number]; // [lat, lng]
export interface Place { name: string; coord: Coord; kind: "district" | "state" | "city" | "country"; }

// ── Indian states + UTs (centroid / capital approx) ───────────
const STATES: Place[] = [
  ["maharashtra", 19.75, 75.71], ["uttar pradesh", 26.85, 80.91], ["bihar", 25.10, 85.31],
  ["west bengal", 22.99, 87.85], ["madhya pradesh", 23.47, 77.95], ["tamil nadu", 11.13, 78.66],
  ["rajasthan", 27.02, 74.22], ["karnataka", 15.32, 75.71], ["gujarat", 22.26, 71.19],
  ["andhra pradesh", 15.91, 79.74], ["odisha", 20.95, 85.10], ["telangana", 17.12, 79.21],
  ["kerala", 10.85, 76.27], ["jharkhand", 23.61, 85.28], ["assam", 26.20, 92.94],
  ["punjab", 31.15, 75.34], ["chhattisgarh", 21.28, 81.87], ["haryana", 29.06, 76.09],
  ["delhi", 28.70, 77.10], ["jammu", 33.78, 76.58], ["kashmir", 34.08, 74.80],
  ["uttarakhand", 30.07, 79.09], ["himachal", 31.10, 77.17], ["tripura", 23.94, 91.99],
  ["meghalaya", 25.47, 91.37], ["manipur", 24.66, 93.91], ["nagaland", 26.16, 94.56],
  ["goa", 15.30, 74.12], ["arunachal", 28.22, 94.73], ["mizoram", 23.16, 92.94],
  ["sikkim", 27.53, 88.51], ["puducherry", 11.94, 79.81], ["chandigarh", 30.73, 76.78],
  ["ladakh", 34.15, 77.58], ["andaman", 11.74, 92.66], ["lakshadweep", 10.57, 72.64],
].map(([name, lat, lng]) => ({ name: name as string, coord: [lat as number, lng as number] as Coord, kind: "state" as const }));

// ── Maharashtra districts (36) ────────────────────────────────
const MAHA_DISTRICTS: Place[] = [
  ["mumbai", 18.96, 72.83], ["mumbai suburban", 19.18, 72.93], ["thane", 19.22, 72.97],
  ["palghar", 19.69, 72.77], ["raigad", 18.52, 73.18], ["ratnagiri", 16.99, 73.31],
  ["sindhudurg", 16.10, 73.65], ["pune", 18.52, 73.86], ["satara", 17.69, 74.00],
  ["sangli", 16.85, 74.58], ["solapur", 17.66, 75.91], ["kolhapur", 16.70, 74.24],
  ["nashik", 19.99, 73.79], ["dhule", 20.90, 74.77], ["nandurbar", 21.37, 74.24],
  ["jalgaon", 21.01, 75.56], ["ahmednagar", 19.09, 74.74], ["aurangabad", 19.88, 75.34],
  ["sambhajinagar", 19.88, 75.34], ["jalna", 19.84, 75.88], ["beed", 18.99, 75.76],
  ["latur", 18.40, 76.58], ["osmanabad", 18.19, 76.04], ["dharashiv", 18.19, 76.04],
  ["nanded", 19.16, 77.31], ["parbhani", 19.27, 76.77], ["hingoli", 19.72, 77.15],
  ["buldhana", 20.53, 76.18], ["akola", 20.71, 77.00], ["washim", 20.11, 77.13],
  ["amravati", 20.93, 77.78], ["yavatmal", 20.39, 78.13], ["wardha", 20.74, 78.60],
  ["nagpur", 21.15, 79.09], ["bhandara", 21.17, 79.65], ["gondia", 21.46, 80.20],
  ["chandrapur", 19.95, 79.30], ["gadchiroli", 20.18, 80.00],
].map(([name, lat, lng]) => ({ name: name as string, coord: [lat as number, lng as number] as Coord, kind: "district" as const }));

// ── Major cities (non-capital) ────────────────────────────────
const CITIES: Place[] = [
  ["bengaluru", 12.97, 77.59], ["bangalore", 12.97, 77.59], ["chennai", 13.08, 80.27],
  ["kolkata", 22.57, 88.36], ["hyderabad", 17.39, 78.49], ["ahmedabad", 23.03, 72.58],
  ["lucknow", 26.85, 80.95], ["jaipur", 26.91, 75.79], ["patna", 25.59, 85.14],
  ["bhopal", 23.26, 77.41], ["new delhi", 28.61, 77.21],
].map(([name, lat, lng]) => ({ name: name as string, coord: [lat as number, lng as number] as Coord, kind: "city" as const }));

// ── Countries / regions (global layer) ────────────────────────
const COUNTRIES: Place[] = [
  ["india", 22.0, 79.0], ["china", 35.86, 104.19], ["united states", 37.09, -95.71],
  ["usa", 37.09, -95.71], ["america", 37.09, -95.71], ["russia", 61.52, 105.32],
  ["ukraine", 48.38, 31.17], ["pakistan", 30.38, 69.35], ["bangladesh", 23.69, 90.36],
  ["sri lanka", 7.87, 80.77], ["nepal", 28.39, 84.12], ["myanmar", 19.16, 96.08],
  ["afghanistan", 33.94, 67.71], ["iran", 32.43, 53.69], ["israel", 31.05, 34.85],
  ["palestine", 31.95, 35.23], ["gaza", 31.50, 34.47], ["saudi", 23.89, 45.08],
  ["united kingdom", 55.38, -3.44], ["britain", 55.38, -3.44], ["france", 46.23, 2.21],
  ["germany", 51.17, 10.45], ["japan", 36.20, 138.25], ["korea", 35.91, 127.77],
  ["australia", -25.27, 133.78], ["canada", 56.13, -106.35], ["brazil", -14.24, -51.93],
  ["africa", 8.78, 34.51], ["europe", 54.52, 15.26], ["middle east", 29.30, 42.55],
  ["bhutan", 27.51, 90.43], ["maldives", 3.20, 73.22], ["asean", 1.35, 103.82],
  ["g20", 28.61, 77.21], ["brics", 28.61, 77.21], ["united nations", 40.71, -74.01],
  ["un ", 40.71, -74.01], ["wto", 46.23, 6.14], ["imf", 38.90, -77.04], ["world bank", 38.90, -77.04],
].map(([name, lat, lng]) => ({ name: name as string, coord: [lat as number, lng as number] as Coord, kind: "country" as const }));

// Ordered most-specific first so resolveCoords prefers districts/states.
const ALL: Place[] = [...MAHA_DISTRICTS, ...CITIES, ...STATES, ...COUNTRIES];

/** Deterministic pseudo-random in [-1,1) from an integer seed (spreads overlapping dots). */
function jitter(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

/**
 * Resolve a news item's text to coordinates.
 * `layer` lets us bias: maharashtra → districts, global → countries.
 */
export function resolveCoords(text: string, seed = 0, layer?: string): Coord {
  const t = text.toLowerCase();

  // Layer-biased ordering
  const pool =
    layer === "maharashtra" ? [...MAHA_DISTRICTS, ...STATES, ...CITIES, ...COUNTRIES]
    : layer === "global" ? [...COUNTRIES, ...STATES, ...CITIES]
    : ALL;

  for (const p of pool) {
    if (t.includes(p.name)) {
      const j = p.kind === "country" ? 1.2 : 0.6; // wider spread for big countries
      return [p.coord[0] + jitter(seed) * j, p.coord[1] + jitter(seed + 7) * j];
    }
  }

  // Fallback: scatter around India (most exam news is national).
  return [20.59 + jitter(seed) * 6, 78.96 + jitter(seed + 3) * 6];
}
