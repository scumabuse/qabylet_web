/**
 * Hand-sign recognition on top of MediaPipe Hands landmarks.
 *
 * Two recognizers:
 * 1. classifyStaticSign(): rule-based recognition of static Russian dactyl
 *    letters (following the descriptions in ALPHABET_DATA) and a few word
 *    gestures. Rules use finger shapes and directions computed so they do not
 *    depend on hand position, size, rotation or which hand is used.
 * 2. matchLibrary(): nearest-neighbour matching against gestures recorded by
 *    users ("Режим обучения"), after normalising position, scale, rotation
 *    and handedness.
 * GestureSmoother turns per-frame guesses into a stable result.
 *
 * Landmark indices (MediaPipe): 0 wrist; thumb 1-4; index 5-8; middle 9-12;
 * ring 13-16; pinky 17-20 (MCP, PIP, DIP, TIP for fingers).
 */

export type Landmark = { x: number; y: number; z?: number };

export type SignResult = { label: string; kind: "letter" | "word" };

type Vec = { x: number; y: number; z: number };
type FingerName = "index" | "middle" | "ring" | "pinky";
type FingerState = "extended" | "bent" | "curled";

const FINGERS: Record<FingerName, [number, number, number, number]> = {
  index: [5, 6, 7, 8],
  middle: [9, 10, 11, 12],
  ring: [13, 14, 15, 16],
  pinky: [17, 18, 19, 20],
};

/** Letters that need movement and cannot be read from a single frame. */
export const DYNAMIC_LETTERS = ["Ё", "Ж", "З", "Й", "Щ", "Ъ", "Ы", "Ь"];

/** Everything classifyStaticSign() can return, for help text in the UI. */
export const SUPPORTED_LETTERS = [
  "А", "Б", "В", "Г", "Д", "Е", "И", "К", "Л", "М", "Н/П", "О", "Р", "С", "У", "Х", "Ц", "Ш", "Э", "Ю", "Я",
];
export const SUPPORTED_WORDS = ["Привет", "Хорошо", "Плохо"];

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const len = (v: Vec) => Math.hypot(v.x, v.y, v.z);
const dist = (a: Vec, b: Vec) => len(sub(a, b));
const mid = (a: Vec, b: Vec): Vec => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 });
const norm = (v: Vec): Vec => {
  const l = len(v) || 1;
  return { x: v.x / l, y: v.y / l, z: v.z / l };
};
const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y + a.z * b.z;
const angleDeg = (a: Vec, b: Vec) => (Math.acos(Math.max(-1, Math.min(1, dot(norm(a), norm(b))))) * 180) / Math.PI;

/**
 * MediaPipe x is normalised by image width and y by image height, so x is
 * multiplied by the aspect ratio to get equal units. z uses the same scale
 * as x.
 */
function toPoints(landmarks: Landmark[], aspect: number): Vec[] {
  return landmarks.map((p) => ({ x: p.x * aspect, y: p.y, z: (p.z ?? 0) * aspect }));
}

// ---------------------------------------------------------------------------
// Hand features
// ---------------------------------------------------------------------------

type HandFeatures = {
  pts: Vec[];
  palm: number;
  state: Record<FingerName, FingerState>;
  /** 2D unit direction MCP -> tip in image space (y grows downward). */
  dir: Record<FingerName, { x: number; y: number }>;
  /** Angle between the palm (wrist -> MCP) and the finger (MCP -> tip). */
  mcpBend: Record<FingerName, number>;
  /** Angle between the palm (wrist -> MCP) and the first finger bone (MCP -> PIP). */
  proximalBend: Record<FingerName, number>;
  thumbOut: boolean;
  /** Thumb straight and lifted clear of the fist (thumbs up / down). */
  thumbRaised: boolean;
  thumbDir: { x: number; y: number };
  /** Distance helper in palm units. */
  d: (a: number | Vec, b: number | Vec) => number;
};

function straightness(pts: Vec[], [mcp, pip, dip, tip]: number[]) {
  const path = dist(pts[mcp], pts[pip]) + dist(pts[pip], pts[dip]) + dist(pts[dip], pts[tip]);
  return path > 0 ? dist(pts[mcp], pts[tip]) / path : 0;
}

function dir2d(from: Vec, to: Vec) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const l = Math.hypot(dx, dy) || 1;
  return { x: dx / l, y: dy / l };
}

function analyze(landmarks: Landmark[], aspect: number): HandFeatures | null {
  if (!landmarks || landmarks.length < 21) return null;
  const pts = toPoints(landmarks, aspect);
  const palm = dist(pts[0], pts[9]);
  if (palm < 1e-4) return null;

  const at = (p: number | Vec) => (typeof p === "number" ? pts[p] : p);
  const d = (a: number | Vec, b: number | Vec) => dist(at(a), at(b)) / palm;

  const state = {} as Record<FingerName, FingerState>;
  const dir = {} as Record<FingerName, { x: number; y: number }>;
  const mcpBend = {} as Record<FingerName, number>;
  const proximalBend = {} as Record<FingerName, number>;
  (Object.keys(FINGERS) as FingerName[]).forEach((name) => {
    const [mcp, pip, dip, tip] = FINGERS[name];
    const s = straightness(pts, FINGERS[name]);
    const tipFartherThanPip = dist(pts[0], pts[tip]) > dist(pts[0], pts[pip]) * 1.05;
    const pipAngle = angleDeg(sub(pts[pip], pts[mcp]), sub(pts[dip], pts[pip]));
    // A gently curved finger (the "С" shape, or a relaxed hand) still has a
    // chord/arc ratio of ~0.9, so "extended" also needs a straight PIP joint.
    state[name] =
      s > 0.9 && pipAngle < 30 && tipFartherThanPip ? "extended" : s < 0.62 || !tipFartherThanPip ? "curled" : "bent";
    dir[name] = dir2d(pts[mcp], pts[tip]);
    mcpBend[name] = angleDeg(sub(pts[mcp], pts[0]), sub(pts[tip], pts[mcp]));
    proximalBend[name] = angleDeg(sub(pts[mcp], pts[0]), sub(pts[pip], pts[mcp]));
  });

  const thumbStraight = straightness(pts, [1, 2, 3, 4]);
  const thumbOut = d(4, 5) > 0.55 && d(4, 9) > 0.6 && thumbStraight > 0.8;
  const thumbRaised = thumbStraight > 0.85 && d(4, 6) > 0.5;

  return { pts, palm, state, dir, mcpBend, proximalBend, thumbOut, thumbRaised, thumbDir: dir2d(pts[2], pts[4]), d };
}

// ---------------------------------------------------------------------------
// Rule-based static signs
// ---------------------------------------------------------------------------

const isUp = (v: { y: number }) => v.y < -0.55;
const isDown = (v: { y: number }) => v.y > 0.55;
const isSide = (v: { x: number }) => Math.abs(v.x) > 0.75;

/**
 * Recognises a static letter or word gesture, or returns null when the hand
 * shape does not clearly match any rule (no guessing).
 */
export function classifyStaticSign(landmarks: Landmark[], aspect = 4 / 3): SignResult | null {
  const f = analyze(landmarks, aspect);
  if (!f) return null;
  const { state: s, dir, d } = f;
  const letter = (label: string): SignResult => ({ label, kind: "letter" });
  const word = (label: string): SignResult => ({ label, kind: "word" });

  const ext = (n: FingerName) => s[n] === "extended";
  const curled = (n: FingerName) => s[n] === "curled";
  const bent = (n: FingerName) => s[n] === "bent";
  const allFour = (st: FingerState) => (["index", "middle", "ring", "pinky"] as FingerName[]).every((n) => s[n] === st);
  const avgDir = (names: FingerName[]) => {
    const x = names.reduce((a, n) => a + dir[n].x, 0) / names.length;
    const y = names.reduce((a, n) => a + dir[n].y, 0) / names.length;
    return { x, y };
  };
  const tipsNearThumb = (names: FingerName[], limit: number) =>
    names.every((n) => d(FINGERS[n][3], 4) < limit);

  // Hook: index rises from the palm, then bends sharply (Х). Checked before
  // the fist, where the index is folded at the knuckle instead.
  if (!ext("index") && f.proximalBend.index < 35 && curled("middle") && curled("ring") && curled("pinky")) {
    if (d(8, 4) < 0.35) return letter("Э");
    if (!f.thumbOut) return letter("Х");
    return null;
  }

  // Fist: thumbs up/down, А, Е.
  if (allFour("curled")) {
    if (f.thumbRaised && isUp(f.thumbDir)) return word("Хорошо");
    if (f.thumbRaised && isDown(f.thumbDir)) return word("Плохо");
    if (tipsNearThumb(["index", "middle", "ring", "pinky"], 0.5) && d(4, 13) < 0.55) return letter("Е");
    // Thumb pressed along the side of the index finger, not across the fist.
    if (d(4, 6) < 0.6 && d(4, 13) > 0.45 && f.thumbDir.y < 0) return letter("А");
    return null;
  }

  // Four fingers straight.
  if (allFour("extended")) {
    const bentForward = (["index", "middle", "ring", "pinky"] as FingerName[]).every((n) => f.mcpBend[n] > 55);
    if (bentForward && !f.thumbOut) return letter("Б");
    const spread = d(8, 20) / Math.max(d(5, 17), 1e-3);
    const up = isUp(avgDir(["index", "middle", "ring", "pinky"]));
    if (up && f.thumbOut && spread > 1.5) return word("Привет");
    if (up && !f.thumbOut && spread < 1.4) return letter("В");
    return null;
  }

  // Four fingers curved: О (ring with the thumb) or С (open curve).
  if ((["index", "middle", "ring", "pinky"] as FingerName[]).every((n) => bent(n) || curled(n)) && bent("index") && bent("middle")) {
    const gap = d(8, 4);
    if (gap < 0.3) return letter("О");
    if (gap > 0.35 && gap < 1.1 && !curled("ring") && !curled("pinky")) return letter("С");
  }

  // Pinky only: И, or Я with the thumb out.
  if (ext("pinky") && curled("index") && curled("middle") && curled("ring")) {
    return f.thumbOut ? letter("Я") : letter("И");
  }

  // Index + pinky: У (index up), Ю (index to the side).
  if (ext("index") && ext("pinky") && curled("middle") && curled("ring")) {
    return isSide(dir.index) ? letter("Ю") : letter("У");
  }

  // Index + middle + ring.
  if (ext("index") && ext("middle") && ext("ring") && !ext("pinky")) {
    const d3 = avgDir(["index", "middle", "ring"]);
    if (isDown(d3)) return letter("М");
    if (isUp(d3)) {
      const spread = d(8, 16) / Math.max(d(5, 13), 1e-3);
      return spread > 1.7 ? letter("Ш") : letter("Ц");
    }
    return null;
  }

  // Index + middle.
  if (ext("index") && ext("middle") && curled("ring") && curled("pinky")) {
    const d2 = avgDir(["index", "middle"]);
    if (isDown(d2)) return letter("Н/П");
    if (isUp(d2) && d(4, mid(f.pts[6], f.pts[10])) < 0.4) return letter("К");
    return null;
  }

  // Index only.
  if (ext("index") && curled("middle") && curled("ring") && curled("pinky")) {
    if (isDown(dir.index)) return f.thumbOut ? letter("Г") : letter("Р");
    if (isUp(dir.index)) {
      if (f.thumbOut) return letter("Л");
      if (tipsNearThumb(["middle"], 0.45)) return letter("Д");
    }
    return null;
  }

  // Index curved towards the thumb, the rest folded: Э (oval).
  if (bent("index") && curled("middle") && curled("ring") && curled("pinky") && d(8, 4) < 0.35) {
    return letter("Э");
  }

  return null;
}

// ---------------------------------------------------------------------------
// Recorded gestures (library)
// ---------------------------------------------------------------------------

/**
 * Normalises raw landmarks for comparison: wrist at the origin, wrist->middle
 * MCP pointing up with length 1, left hands mirrored onto right hands.
 * Recordings are stored as raw MediaPipe landmarks (saveGesturePattern), so
 * the live camera's aspect ratio is applied to both sides; recordings made
 * with the same camera then compare exactly under rotation.
 */
export function normalizeForMatch(landmarks: Landmark[], aspect = 4 / 3): { x: number; y: number }[] {
  const w = landmarks[0];
  const m = landmarks[9];
  const vx = (m.x - w.x) * aspect;
  const vy = m.y - w.y;
  const scale = Math.hypot(vx, vy) || 1;
  // Rotate so (vx, vy) maps to (0, -1).
  const angle = Math.atan2(vx, -vy);
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  const pts = landmarks.map((p) => {
    const x = ((p.x - w.x) * aspect) / scale;
    const y = (p.y - w.y) / scale;
    return { x: x * cos - y * sin, y: x * sin + y * cos };
  });
  // Handedness: index MCP should be on the left of the pinky MCP.
  if (pts[5].x > pts[17].x) pts.forEach((p) => (p.x = -p.x));
  return pts;
}

const TIPS = [4, 8, 12, 16, 20];

function patternDistance(a: { x: number; y: number }[], b: { x: number; y: number }[]) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.hypot(a[i].x - b[i].x, a[i].y - b[i].y);
  const maxTip = Math.max(...TIPS.map((i) => Math.hypot(a[i].x - b[i].x, a[i].y - b[i].y)));
  return { mean: sum / a.length, maxTip };
}

type LibraryEntry = { word: string; pattern_json?: unknown };

// Distances in palm lengths. Different hand shapes are >= ~0.2 apart on
// average, and at least one fingertip moves by >= ~0.5; repeated attempts at
// the same shape stay well below both limits.
const MATCH_MEAN_LIMIT = 0.17;
const MATCH_TIP_LIMIT = 0.4;
const MATCH_MARGIN = 0.03;

/** Best recorded gesture for these landmarks, or null if none is close enough. */
export function matchLibrary(landmarks: Landmark[], library: LibraryEntry[], aspect = 4 / 3): string | null {
  if (!landmarks || landmarks.length < 21 || !library?.length) return null;
  const live = normalizeForMatch(landmarks, aspect);
  let best: { word: string; dist: number; maxTip: number } | null = null;
  let secondDist = Infinity;

  for (const entry of library) {
    if (!entry.pattern_json) continue;
    let pattern: unknown = entry.pattern_json;
    try {
      if (typeof pattern === "string") pattern = JSON.parse(pattern);
    } catch {
      continue;
    }
    if (!Array.isArray(pattern) || pattern.length !== 21) continue;
    const { mean, maxTip } = patternDistance(live, normalizeForMatch(pattern as Landmark[], aspect));
    const dist = mean + 0.25 * maxTip;
    if (!best || dist < best.dist) {
      // Another recording of the same word does not count as a competitor.
      if (best && best.word !== entry.word) secondDist = best.dist;
      best = { word: entry.word, dist, maxTip };
    } else if (entry.word !== best.word && dist < secondDist) {
      secondDist = dist;
    }
  }

  if (!best) return null;
  if (best.dist - 0.25 * best.maxTip > MATCH_MEAN_LIMIT || best.maxTip > MATCH_TIP_LIMIT) return null;
  if (secondDist - best.dist < MATCH_MARGIN) return null;
  return best.word;
}

// ---------------------------------------------------------------------------
// Temporal smoothing
// ---------------------------------------------------------------------------

/**
 * Reports a label only after it wins most of the recent frames, and keeps it
 * briefly when the hand leaves, so the result does not flicker.
 */
export class GestureSmoother {
  private history: (string | null)[] = [];
  private stable: string | null = null;

  constructor(private windowSize = 8, private minVotes = 5) {}

  push(label: string | null): string | null {
    this.history.push(label);
    if (this.history.length > this.windowSize) this.history.shift();

    const counts = new Map<string | null, number>();
    for (const l of this.history) counts.set(l, (counts.get(l) ?? 0) + 1);
    let top: string | null = null;
    let topCount = 0;
    counts.forEach((c, l) => {
      if (c > topCount) {
        top = l;
        topCount = c;
      }
    });

    if (topCount >= this.minVotes) this.stable = top;
    return this.stable;
  }

  reset() {
    this.history = [];
    this.stable = null;
  }
}
