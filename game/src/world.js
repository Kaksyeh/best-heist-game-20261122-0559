// world.js — the Meridian Gallery: room layout, obstacles, loot, vent, exit.
// All coordinates are in play-area space: x 0..1280, y 0..744. The HUD bar
// (56px) is drawn above this area by render.js; canvas y = world y + 56.
export const WORLD = {
  W: 1280,
  H: 744,
  WALL: 14, // border wall thickness
};

export const EXIT = { x: 600, y: 0, w: 80, h: 26, label: 'Skylight' };

// Display cases, pillars and velvet-rope stands. Every one blocks movement
// AND line of sight.
export const OBSTACLES = [
  // Centre hall cases (Sun Opal sits in the middle one)
  { x: 596, y: 296, w: 88, h: 56, kind: 'case', loot: 'opal' },
  { x: 416, y: 176, w: 92, h: 44, kind: 'case' },
  { x: 772, y: 176, w: 92, h: 44, kind: 'case' },
  { x: 416, y: 484, w: 92, h: 44, kind: 'case' },
  { x: 772, y: 484, w: 92, h: 44, kind: 'case' },
  // West wing cases (Jade Mask sits in the middle one)
  { x: 146, y: 356, w: 88, h: 56, kind: 'case', loot: 'mask' },
  { x: 116, y: 176, w: 92, h: 44, kind: 'case' },
  { x: 246, y: 524, w: 92, h: 44, kind: 'case' },
  // East wing cases (Gold Ledger sits in the middle one)
  { x: 1046, y: 356, w: 88, h: 56, kind: 'case', loot: 'ledger' },
  { x: 1006, y: 176, w: 92, h: 44, kind: 'case' },
  { x: 876, y: 524, w: 92, h: 44, kind: 'case' },
  // Pillars
  { x: 300, y: 300, w: 38, h: 38, kind: 'pillar' },
  { x: 942, y: 300, w: 38, h: 38, kind: 'pillar' },
  { x: 300, y: 560, w: 38, h: 38, kind: 'pillar' },
  { x: 942, y: 560, w: 38, h: 38, kind: 'pillar' },
  // Velvet ropes (low stands; still block movement and sight)
  { x: 200, y: 256, w: 120, h: 9, kind: 'rope' },
  { x: 960, y: 256, w: 120, h: 9, kind: 'rope' },
  { x: 560, y: 600, w: 160, h: 9, kind: 'rope' },
  { x: 200, y: 640, w: 120, h: 9, kind: 'rope' },
  { x: 960, y: 640, w: 120, h: 9, kind: 'rope' },
];

// The vent crawlspace runs along the south wall from the grate (west end)
// to the east wing (east end). Its north wall is a solid obstacle except
// for the grate entrance and the east opening; the grate itself is a
// separate obstacle until the lockpick opens it. The tunnel interior is
// y 690..730 — tall enough for the thief (radius 13) to crawl through.
export const VENT = {
  grate: { x: 630, y: 676, w: 40, h: 14 }, // blocks entry while locked
  tunnelWall: { x: 670, y: 676, w: 370, h: 14 }, // x 670..1040
  tunnelWallEast: { x: 1080, y: 676, w: 200, h: 14 }, // x 1080..1280
  // East opening into the east wing: x 1040..1080.
  entry: { x: 650, y: 664 }, // where the thief stands to pick the lock
  open: false,
};

// Dark floor: standing here makes the thief harder to spot.
export const SHADOWS = [
  { x: 16, y: 540, w: 220, h: 188 }, // south-west corner
  { x: 1044, y: 540, w: 220, h: 188 }, // south-east corner
  { x: 16, y: 16, w: 200, h: 140 }, // north-west corner
  { x: 1064, y: 16, w: 200, h: 140 }, // north-east corner
  { x: 556, y: 372, w: 168, h: 92 }, // behind the Sun Opal case
];

// Loot targets: name, case centre, HUD slot order.
export const LOOT = [
  { id: 'opal', name: 'Sun Opal', x: 640, y: 324, slot: 0 },
  { id: 'mask', name: 'Jade Mask', x: 190, y: 384, slot: 1 },
  { id: 'ledger', name: 'Gold Ledger', x: 1090, y: 384, slot: 2 },
];

// Guard patrol definitions: loop waypoints, pause at each turn, speed.
export const GUARD_DEFS = [
  {
    name: 'Marble',
    waypoints: [
      { x: 450, y: 180 },
      { x: 830, y: 180 },
      { x: 830, y: 480 },
      { x: 450, y: 480 },
    ],
    pause: 1.2,
    speed: 58,
  },
  {
    name: 'West',
    waypoints: [
      { x: 120, y: 120 },
      { x: 300, y: 120 },
      { x: 300, y: 620 },
      { x: 120, y: 620 },
    ],
    pause: 1.4,
    speed: 52,
  },
  {
    name: 'East',
    waypoints: [
      { x: 980, y: 120 },
      { x: 1160, y: 120 },
      { x: 1160, y: 620 },
      { x: 980, y: 620 },
    ],
    pause: 1.4,
    speed: 52,
  },
];

// Wall cameras: position, base facing angle (radians, 0 = east), sweep.
export const CAMERA_DEFS = [
  { x: 640, y: 10, baseAngle: Math.PI / 2, sweep: 0.9, speed: 0.45, range: 250 },
  { x: 1270, y: 380, baseAngle: Math.PI, sweep: 0.8, speed: 0.4, range: 240 },
];

// Hack panels: stand here and hold E to power a camera down.
export const PANELS = [
  { x: 576, y: 64, camera: 0 },
  { x: 1220, y: 420, camera: 1 },
];

export const HIDEOUTS = [
  { x: 70, y: 700 },
  { x: 1210, y: 700 },
  { x: 70, y: 70 },
  { x: 1210, y: 70 },
];

export const THIEF_START = { x: 640, y: 650 };

// ---- geometry helpers -------------------------------------------------

export function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

export function circleHitsRect(cx, cy, r, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

function segSeg(x1, y1, x2, y2, x3, y3, x4, y4) {
  const d = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
  if (d === 0) return false;
  const t = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / d;
  const u = ((x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

export function segHitsRect(x1, y1, x2, y2, r) {
  if (pointInRect(x1, y1, r) || pointInRect(x2, y2, r)) return true;
  return (
    segSeg(x1, y1, x2, y2, r.x, r.y, r.x + r.w, r.y) ||
    segSeg(x1, y1, x2, y2, r.x + r.w, r.y, r.x + r.w, r.y + r.h) ||
    segSeg(x1, y1, x2, y2, r.x + r.w, r.y + r.h, r.x, r.y + r.h) ||
    segSeg(x1, y1, x2, y2, r.x, r.y + r.h, r.x, r.y)
  );
}

// Distance from point (px,py) to segment (x1,y1)-(x2,y2).
export function segPointDist(x1, y1, x2, y2, px, py) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// All sight-blocking rectangles right now (static obstacles + vent grate
// while it is locked + the room walls as four border rects, with a gap in
// the north wall at the skylight exit).
export function sightBlockers(ventOpen) {
  const list = OBSTACLES.slice();
  if (!ventOpen) list.push(VENT.grate);
  list.push(VENT.tunnelWall, VENT.tunnelWallEast);
  const W = WORLD.W;
  const H = WORLD.H;
  const T = WORLD.WALL;
  list.push({ x: 0, y: 0, w: EXIT.x, h: T }); // north wall, west of exit
  list.push({ x: EXIT.x + EXIT.w, y: 0, w: W - EXIT.x - EXIT.w, h: T }); // north, east
  list.push({ x: 0, y: H - T, w: W, h: T }); // south wall
  list.push({ x: 0, y: 0, w: T, h: H }); // west wall
  list.push({ x: W - T, y: 0, w: T, h: H }); // east wall
  return list;
}

// True when the segment is blocked by any sight blocker or smoke cloud.
export function losBlocked(x1, y1, x2, y2, blockers, smokes) {
  for (const b of blockers) {
    if (segHitsRect(x1, y1, x2, y2, b)) return true;
  }
  for (const s of smokes) {
    if (segPointDist(x1, y1, x2, y2, s.x, s.y) < s.r) return true;
  }
  return false;
}

export function inShadow(x, y) {
  for (const s of SHADOWS) {
    if (pointInRect(x, y, s)) return true;
  }
  return false;
}
