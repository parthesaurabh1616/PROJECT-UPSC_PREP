/* ════════════════════════════════════════════════════════════════
   Geo helpers for the Strategic Command Center globe.
   Pure math + real coordinates — no fabricated data. Coordinates are
   actual lat/lng of capitals, strategic nodes and chokepoints used in
   UPSC GS-II (IR) / GS-I (geography) so the globe is study-relevant.
   ════════════════════════════════════════════════════════════════ */
import * as THREE from "three";

export const GLOBE_RADIUS = 1;

/** Lat/Lng (degrees) → point on a sphere of `radius`. */
export function latLngToVector3(lat: number, lng: number, radius = GLOBE_RADIUS): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

/**
 * Great-circle arc between two lat/lng points, lifted off the surface
 * into a smooth bezier whose apex height scales with arc length — the
 * classic "comms arc" look. Returns sampled points.
 */
export function greatCircleCurve(
  a: [number, number],
  b: [number, number],
  lift = 0.35
): THREE.QuadraticBezierCurve3 {
  const start = latLngToVector3(a[0], a[1]);
  const end = latLngToVector3(b[0], b[1]);
  const mid = start.clone().add(end).multiplyScalar(0.5);
  const dist = start.distanceTo(end);
  // push the midpoint outward; longer arcs rise higher
  mid.normalize().multiplyScalar(GLOBE_RADIUS + dist * lift);
  return new THREE.QuadraticBezierCurve3(start, mid, end);
}

export function greatCircleArc(
  a: [number, number],
  b: [number, number],
  segments = 48,
  lift = 0.35
): THREE.Vector3[] {
  return greatCircleCurve(a, b, lift).getPoints(segments);
}

export interface StrategicNode {
  name: string;
  lat: number;
  lng: number;
  kind: "capital" | "chokepoint" | "hub";
  /** UPSC relevance one-liner — shown later on hover/focus. */
  note: string;
}

/** Real, geopolitically significant nodes (capitals + chokepoints). */
export const NODES: StrategicNode[] = [
  { name: "New Delhi", lat: 28.61, lng: 77.21, kind: "capital", note: "Seat of the Union government" },
  { name: "Washington D.C.", lat: 38.9, lng: -77.04, kind: "capital", note: "USA — QUAD, strategic partner" },
  { name: "Beijing", lat: 39.9, lng: 116.4, kind: "capital", note: "China — border & Indo-Pacific dynamics" },
  { name: "Moscow", lat: 55.75, lng: 37.62, kind: "capital", note: "Russia — defence & energy ties" },
  { name: "London", lat: 51.51, lng: -0.13, kind: "capital", note: "UK — Commonwealth, FTA" },
  { name: "Tokyo", lat: 35.68, lng: 139.69, kind: "capital", note: "Japan — QUAD, infrastructure" },
  { name: "Brussels", lat: 50.85, lng: 4.35, kind: "hub", note: "EU — trade & climate diplomacy" },
  { name: "Abu Dhabi", lat: 24.45, lng: 54.38, kind: "capital", note: "UAE — I2U2, energy, diaspora" },
  { name: "Tehran", lat: 35.69, lng: 51.39, kind: "capital", note: "Iran — Chabahar, energy" },
  { name: "Canberra", lat: -35.28, lng: 149.13, kind: "capital", note: "Australia — QUAD, critical minerals" },
  { name: "Pretoria", lat: -25.75, lng: 28.19, kind: "capital", note: "South Africa — BRICS, IBSA" },
  { name: "Brasília", lat: -15.79, lng: -47.88, kind: "capital", note: "Brazil — BRICS, IBSA" },
  { name: "Singapore", lat: 1.35, lng: 103.82, kind: "hub", note: "ASEAN gateway, finance hub" },
  { name: "Nairobi", lat: -1.29, lng: 36.82, kind: "hub", note: "Africa outreach, UNEP HQ" },
  // Strategic maritime chokepoints (GS-I geography / GS-II security)
  { name: "Strait of Hormuz", lat: 26.57, lng: 56.25, kind: "chokepoint", note: "~⅕ of global oil transits here" },
  { name: "Strait of Malacca", lat: 1.43, lng: 102.89, kind: "chokepoint", note: "India's Indo-Pacific lifeline" },
  { name: "Bab-el-Mandeb", lat: 12.58, lng: 43.33, kind: "chokepoint", note: "Red Sea–Indian Ocean gate" },
  { name: "Suez Canal", lat: 30.42, lng: 32.35, kind: "chokepoint", note: "Asia–Europe trade artery" },
  { name: "Cape of Good Hope", lat: -34.36, lng: 18.47, kind: "chokepoint", note: "Alt route around Africa" },
  { name: "Panama Canal", lat: 9.08, lng: -79.68, kind: "chokepoint", note: "Atlantic–Pacific shortcut" },
];

export interface GeoLabel {
  text: string;
  lat: number;
  lng: number;
  tier: "continent" | "ocean" | "country";
  primary?: boolean; // India — highlighted for the aspirant
}

/** Continents (approx. centroids) + oceans + UPSC-relevant countries.
   Real coordinates so the labels sit where they should geographically. */
export const GEO_LABELS: GeoLabel[] = [
  // ── Continents ──
  { text: "ASIA", lat: 48, lng: 88, tier: "continent" },
  { text: "AFRICA", lat: 6, lng: 20, tier: "continent" },
  { text: "EUROPE", lat: 52, lng: 14, tier: "continent" },
  { text: "NORTH AMERICA", lat: 46, lng: -100, tier: "continent" },
  { text: "SOUTH AMERICA", lat: -12, lng: -58, tier: "continent" },
  { text: "AUSTRALIA", lat: -25, lng: 134, tier: "continent" },
  { text: "ANTARCTICA", lat: -80, lng: 20, tier: "continent" },
  // ── Oceans ──
  { text: "Pacific Ocean", lat: 5, lng: -150, tier: "ocean" },
  { text: "Pacific Ocean", lat: 10, lng: 160, tier: "ocean" },
  { text: "Atlantic Ocean", lat: 8, lng: -32, tier: "ocean" },
  { text: "Indian Ocean", lat: -28, lng: 78, tier: "ocean" },
  { text: "Arctic Ocean", lat: 85, lng: 0, tier: "ocean" },
  { text: "Southern Ocean", lat: -60, lng: 110, tier: "ocean" },
  // ── Countries (capital/centroid) ──
  { text: "India", lat: 22, lng: 79, tier: "country", primary: true },
  { text: "China", lat: 35, lng: 103, tier: "country" },
  { text: "Russia", lat: 61, lng: 90, tier: "country" },
  { text: "United States", lat: 39, lng: -98, tier: "country" },
  { text: "Brazil", lat: -10, lng: -53, tier: "country" },
  { text: "Canada", lat: 58, lng: -106, tier: "country" },
  { text: "Japan", lat: 36, lng: 138, tier: "country" },
  { text: "Indonesia", lat: -2, lng: 118, tier: "country" },
  { text: "Pakistan", lat: 30, lng: 69, tier: "country" },
  { text: "Bangladesh", lat: 24, lng: 90, tier: "country" },
  { text: "Nepal", lat: 28, lng: 84, tier: "country" },
  { text: "Sri Lanka", lat: 7.8, lng: 80.7, tier: "country" },
  { text: "Iran", lat: 32, lng: 53, tier: "country" },
  { text: "Saudi Arabia", lat: 24, lng: 45, tier: "country" },
  { text: "UAE", lat: 24, lng: 54, tier: "country" },
  { text: "Egypt", lat: 26, lng: 30, tier: "country" },
  { text: "South Africa", lat: -29, lng: 24, tier: "country" },
  { text: "Nigeria", lat: 9, lng: 8, tier: "country" },
  { text: "Kenya", lat: 0.5, lng: 37.9, tier: "country" },
  { text: "United Kingdom", lat: 54, lng: -2, tier: "country" },
  { text: "France", lat: 46, lng: 2, tier: "country" },
  { text: "Germany", lat: 51, lng: 10, tier: "country" },
  { text: "Turkey", lat: 39, lng: 35, tier: "country" },
  { text: "Ukraine", lat: 49, lng: 32, tier: "country" },
  { text: "Mexico", lat: 23, lng: -102, tier: "country" },
  { text: "Argentina", lat: -34, lng: -64, tier: "country" },
  { text: "Myanmar", lat: 21, lng: 96, tier: "country" },
  { text: "Afghanistan", lat: 33, lng: 65, tier: "country" },
  { text: "Israel", lat: 31, lng: 35, tier: "country" },
];

/** Real capital + continent for the labelled countries (factual reference,
   no fabricated metrics). Used by the country panel header. */
export const COUNTRY_INFO: Record<string, { capital: string; continent: string }> = {
  India: { capital: "New Delhi", continent: "Asia" },
  China: { capital: "Beijing", continent: "Asia" },
  Russia: { capital: "Moscow", continent: "Europe / Asia" },
  "United States": { capital: "Washington, D.C.", continent: "North America" },
  Brazil: { capital: "Brasília", continent: "South America" },
  Canada: { capital: "Ottawa", continent: "North America" },
  Japan: { capital: "Tokyo", continent: "Asia" },
  Indonesia: { capital: "Jakarta", continent: "Asia" },
  Pakistan: { capital: "Islamabad", continent: "Asia" },
  Bangladesh: { capital: "Dhaka", continent: "Asia" },
  Nepal: { capital: "Kathmandu", continent: "Asia" },
  "Sri Lanka": { capital: "Sri Jayawardenepura Kotte", continent: "Asia" },
  Iran: { capital: "Tehran", continent: "Asia" },
  "Saudi Arabia": { capital: "Riyadh", continent: "Asia" },
  UAE: { capital: "Abu Dhabi", continent: "Asia" },
  Egypt: { capital: "Cairo", continent: "Africa" },
  "South Africa": { capital: "Pretoria (admin.)", continent: "Africa" },
  Nigeria: { capital: "Abuja", continent: "Africa" },
  Kenya: { capital: "Nairobi", continent: "Africa" },
  "United Kingdom": { capital: "London", continent: "Europe" },
  France: { capital: "Paris", continent: "Europe" },
  Germany: { capital: "Berlin", continent: "Europe" },
  Turkey: { capital: "Ankara", continent: "Asia / Europe" },
  Ukraine: { capital: "Kyiv", continent: "Europe" },
  Mexico: { capital: "Mexico City", continent: "North America" },
  Argentina: { capital: "Buenos Aires", continent: "South America" },
  Myanmar: { capital: "Naypyidaw", continent: "Asia" },
  Afghanistan: { capital: "Kabul", continent: "Asia" },
  Israel: { capital: "Jerusalem (seat of govt.)", continent: "Asia" },
};

/** International groupings — FACTUAL membership (current as of 2025), used
   for the on-globe knowledge graph + the dossier's alliances section.
   Member names match COUNTRY_INFO / GEO_LABELS so they map to coordinates. */
export interface Grouping { key: string; name: string; color: string; members: string[] }
export const GROUPINGS: Grouping[] = [
  { key: "QUAD", name: "Quad", color: "#5fd0ff", members: ["India", "Japan", "United States", "Australia"] },
  { key: "BRICS", name: "BRICS+", color: "#ff7a59", members: ["Brazil", "Russia", "India", "China", "South Africa", "Egypt", "Iran", "UAE"] },
  { key: "SCO", name: "SCO", color: "#b388ff", members: ["China", "Russia", "India", "Pakistan", "Iran"] },
  { key: "SAARC", name: "SAARC", color: "#4ade80", members: ["India", "Pakistan", "Bangladesh", "Nepal", "Sri Lanka", "Afghanistan"] },
  { key: "BIMSTEC", name: "BIMSTEC", color: "#ffd166", members: ["India", "Bangladesh", "Myanmar", "Sri Lanka", "Nepal"] },
  { key: "IBSA", name: "IBSA", color: "#ff8fc7", members: ["India", "Brazil", "South Africa"] },
  { key: "I2U2", name: "I2U2", color: "#5fe0c0", members: ["India", "Israel", "United States", "UAE"] },
  { key: "G7", name: "G7", color: "#7aa2ff", members: ["United States", "United Kingdom", "France", "Germany", "Japan", "Canada"] },
  { key: "G20", name: "G20", color: "#9aa6b8", members: ["Argentina", "Australia", "Brazil", "Canada", "China", "France", "Germany", "India", "Indonesia", "Japan", "Mexico", "Russia", "Saudi Arabia", "South Africa", "Turkey", "United Kingdom", "United States"] },
  { key: "NATO", name: "NATO", color: "#aeb8c8", members: ["United States", "United Kingdom", "France", "Germany", "Canada", "Turkey"] },
  { key: "OPEC", name: "OPEC", color: "#e0b341", members: ["Saudi Arabia", "Iran", "UAE", "Nigeria"] },
  { key: "CW", name: "Commonwealth", color: "#84d98a", members: ["India", "United Kingdom", "Canada", "Australia", "South Africa", "Nigeria", "Kenya", "Bangladesh", "Pakistan", "Sri Lanka"] },
];

export const groupingsOf = (name: string): Grouping[] => GROUPINGS.filter((g) => g.members.includes(name));

/** Coordinates for any grouping member (Australia isn't a clickable country
   label — it's the continent label — so it needs an explicit entry). */
const EXTRA_COORDS: Record<string, { lat: number; lng: number }> = { Australia: { lat: -25, lng: 134 } };
export function countryCoord(name: string): { lat: number; lng: number } | null {
  const g = GEO_LABELS.find((l) => l.text === name && l.tier === "country");
  if (g) return { lat: g.lat, lng: g.lng };
  if (EXTRA_COORDS[name]) return EXTRA_COORDS[name];
  const n = NODES.find((x) => x.name === name);
  return n ? { lat: n.lat, lng: n.lng } : null;
}

/** Communication corridors — real strategic links radiating from India. */
export const CORRIDORS: [[number, number], [number, number]][] = (() => {
  const delhi: [number, number] = [28.61, 77.21];
  const partners: [number, number][] = [
    [38.9, -77.04],  // Washington
    [35.68, 139.69], // Tokyo
    [-35.28, 149.13],// Canberra
    [55.75, 37.62],  // Moscow
    [51.51, -0.13],  // London
    [24.45, 54.38],  // Abu Dhabi
    [1.35, 103.82],  // Singapore
    [-25.75, 28.19], // Pretoria
    [-15.79, -47.88],// Brasília
    [35.69, 51.39],  // Tehran (Chabahar axis)
  ];
  const fromDelhi = partners.map((p) => [delhi, p] as [[number, number], [number, number]]);
  // a few non-Delhi corridors so traffic feels global, not radial-only
  const extra: [[number, number], [number, number]][] = [
    [[1.35, 103.82], [35.68, 139.69]],   // Singapore–Tokyo
    [[24.45, 54.38], [51.51, -0.13]],    // Abu Dhabi–London
    [[-25.75, 28.19], [-15.79, -47.88]], // Pretoria–Brasília (IBSA)
  ];
  return [...fromDelhi, ...extra];
})();
