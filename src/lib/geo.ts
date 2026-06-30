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
