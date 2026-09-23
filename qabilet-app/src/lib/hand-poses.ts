/**
 * Parametric hand for the sign dictionary animations.
 *
 * A pose is a handful of numbers (finger curl, spread, thumb, wrist
 * rotation). handLandmarks() turns it into the 21 MediaPipe hand points, so
 * the dictionary draws the same skeleton the camera tab overlays.
 *
 * Units are "hand units" (the palm is about 100 long): x right, y down,
 * z toward the viewer. At rest the palm faces the viewer, fingers up.
 */

export type Point3 = { x: number; y: number; z: number };

export type HandPose = {
  /** Curl of index, middle, ring, pinky: 0 straight, 1 fist. */
  curl: [number, number, number, number];
  /** 0 fingers together, 1 spread wide. */
  spread: number;
  /** Extra turn of index, middle, ring, pinky in degrees (+ toward the
   *  pinky side), for shapes like V that spread only some fingers. */
  splay: [number, number, number, number];
  /** 0 thumb tucked over the fingers, 1 thumb stretched out. */
  thumb: number;
  /** Direction of the stretched thumb in the palm plane, degrees from "up"
   *  (negative points to the thumb side). */
  thumbAngle: number;
  /** Wrist rotation in degrees. Roll turns the hand clockwise on screen,
   *  pitch tips the fingers toward the viewer, yaw turns the palm sideways. */
  roll: number;
  pitch: number;
  yaw: number;
  /** Where the hand rotates: 0 wrist, 1 knuckles. */
  pivot: number;
  /** Shift after rotation, in hand units; z moves toward the viewer. */
  x: number;
  y: number;
  z: number;
};

export type Ease = "linear" | "inOut" | "out" | "back";

/** The pose reached at `at` seconds; `ease` shapes the way into it. */
export type Keyframe = { at: number; pose: HandPose; ease?: Ease };

export type GestureTimeline = {
  /** Starts at 0 and ends on the first pose, so the loop is seamless. */
  keyframes: Keyframe[];
  /** Time of the most telling pose, shown when motion is reduced. */
  still: number;
};

/** Same bones as MediaPipe HAND_CONNECTIONS. */
export const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];

export const FINGERTIPS = [4, 8, 12, 16, 20];

const DEG = Math.PI / 180;

// Knuckles (MCP) of index, middle, ring and pinky, and their bone lengths.
const KNUCKLES = [[-26, -92], [-6, -97], [13, -92], [30, -80]];
const PHALANGES = [[42, 26, 22], [46, 30, 23], [43, 28, 22], [33, 21, 19]];
// Finger direction in degrees from "up": fingers together, and spread.
const SPREAD_CLOSED = [-3, 0, 3, 7];
const SPREAD_OPEN = [-16, -3, 10, 24];
// Bend of the MCP, PIP and DIP joints in a full fist.
const FIST_BEND = [80, 100, 65];

const THUMB_BASE: Point3 = { x: -22, y: -22, z: 4 };
const THUMB_BONES = [32, 26, 22];
// Thumb bone directions when tucked over the curled fingers.
const THUMB_TUCKED = [norm(-0.05, -1, 0.9), norm(0.6, -0.6, 0.5), norm(1, -0.05, 0.05)];

const FOCAL = 420;

function norm(x: number, y: number, z: number): Point3 {
  const len = Math.hypot(x, y, z) || 1;
  return { x: x / len, y: y / len, z: z / len };
}

function lerp(a: number, b: number, k: number) {
  return a + (b - a) * k;
}

function move(p: Point3, d: Point3, len: number): Point3 {
  return { x: p.x + d.x * len, y: p.y + d.y * len, z: p.z + d.z * len };
}

/** The 21 hand points for a pose, before perspective. */
export function handLandmarks(pose: HandPose): Point3[] {
  const pts: Point3[] = new Array(21);
  pts[0] = { x: 0, y: 0, z: 0 };

  // Thumb: each bone blends from tucked to stretched out.
  const ta = pose.thumbAngle * DEG;
  const out = norm(Math.sin(ta), -Math.cos(ta), 0.3);
  let p = THUMB_BASE;
  pts[1] = p;
  THUMB_BONES.forEach((len, j) => {
    const t = THUMB_TUCKED[j];
    p = move(p, norm(lerp(t.x, out.x, pose.thumb), lerp(t.y, out.y, pose.thumb), lerp(t.z, out.z, pose.thumb)), len);
    pts[2 + j] = p;
  });

  // Fingers curl toward the viewer, since the palm faces the viewer.
  for (let f = 0; f < 4; f++) {
    const a = (lerp(SPREAD_CLOSED[f], SPREAD_OPEN[f], pose.spread) + pose.splay[f]) * DEG;
    const dx = Math.sin(a);
    const dy = -Math.cos(a);
    const base = 5 + f * 4;
    let q: Point3 = { x: KNUCKLES[f][0], y: KNUCKLES[f][1], z: 0 };
    let bend = 0;
    pts[base] = q;
    for (let j = 0; j < 3; j++) {
      bend += pose.curl[f] * FIST_BEND[j] * DEG;
      q = move(q, { x: dx * Math.cos(bend), y: dy * Math.cos(bend), z: Math.sin(bend) }, PHALANGES[f][j]);
      pts[base + 1 + j] = q;
    }
  }

  // Wrist rotation around the pivot: pitch, then yaw, then roll.
  const py = KNUCKLES[1][1] * pose.pivot;
  const [cp, sp] = [Math.cos(pose.pitch * DEG), Math.sin(pose.pitch * DEG)];
  const [cy, sy] = [Math.cos(pose.yaw * DEG), Math.sin(pose.yaw * DEG)];
  const [cr, sr] = [Math.cos(pose.roll * DEG), Math.sin(pose.roll * DEG)];
  return pts.map(({ x, y, z }) => {
    y -= py;
    [y, z] = [y * cp + z * sp, -y * sp + z * cp];
    [x, z] = [x * cy + z * sy, -x * sy + z * cy];
    [x, y] = [x * cr - y * sr, x * sr + y * cr];
    return { x: x + pose.x, y: y + py + pose.y, z: z + pose.z };
  });
}

/** Perspective: points closer to the viewer come out larger. */
export function project(p: Point3): Point3 {
  const s = FOCAL / (FOCAL - Math.min(p.z, FOCAL - 60));
  return { x: p.x * s, y: p.y * s, z: p.z };
}

const EASE: Record<Ease, (k: number) => number> = {
  linear: (k) => k,
  inOut: (k) => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2),
  out: (k) => 1 - (1 - k) ** 3,
  // Overshoots a little and settles, like a spring.
  back: (k) => 1 + 2.70158 * (k - 1) ** 3 + 1.70158 * (k - 1) ** 2,
};

function mixPose(a: HandPose, b: HandPose, k: number): HandPose {
  return {
    curl: a.curl.map((c, i) => lerp(c, b.curl[i], k)) as HandPose["curl"],
    spread: lerp(a.spread, b.spread, k),
    splay: a.splay.map((s, i) => lerp(s, b.splay[i], k)) as HandPose["splay"],
    thumb: lerp(a.thumb, b.thumb, k),
    thumbAngle: lerp(a.thumbAngle, b.thumbAngle, k),
    roll: lerp(a.roll, b.roll, k),
    pitch: lerp(a.pitch, b.pitch, k),
    yaw: lerp(a.yaw, b.yaw, k),
    pivot: lerp(a.pivot, b.pivot, k),
    x: lerp(a.x, b.x, k),
    y: lerp(a.y, b.y, k),
    z: lerp(a.z, b.z, k),
  };
}

export function timelineDuration({ keyframes }: GestureTimeline) {
  return keyframes[keyframes.length - 1].at;
}

/** The pose at `t` seconds; the timeline loops. */
export function poseAt(timeline: GestureTimeline, t: number): HandPose {
  const { keyframes } = timeline;
  const duration = timelineDuration(timeline);
  const time = ((t % duration) + duration) % duration;
  let i = 1;
  while (i < keyframes.length - 1 && keyframes[i].at < time) i++;
  const from = keyframes[i - 1];
  const to = keyframes[i];
  const span = to.at - from.at;
  const k = span > 0 ? Math.min(Math.max((time - from.at) / span, 0), 1) : 1;
  return mixPose(from.pose, to.pose, EASE[to.ease ?? "inOut"](k));
}

/** Box that holds the projected hand over the whole loop, for framing. */
export function timelineBounds(timeline: GestureTimeline, samples = 72) {
  const duration = timelineDuration(timeline);
  const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (let i = 0; i < samples; i++) {
    for (const p of handLandmarks(poseAt(timeline, (duration * i) / samples)).map(project)) {
      box.minX = Math.min(box.minX, p.x);
      box.minY = Math.min(box.minY, p.y);
      box.maxX = Math.max(box.maxX, p.x);
      box.maxY = Math.max(box.maxY, p.y);
    }
  }
  return box;
}

// ----- Gestures ---------------------------------------------------------

const OPEN: HandPose = {
  curl: [0, 0, 0, 0],
  spread: 0.85,
  splay: [0, 0, 0, 0],
  thumb: 1,
  thumbAngle: -55,
  roll: 0,
  pitch: 0,
  yaw: 0,
  pivot: 0,
  x: 0,
  y: 0,
  z: 0,
};
const FIST: HandPose = { ...OPEN, curl: [1, 1, 1, 1], spread: 0.1, thumb: 0, thumbAngle: -95 };
const POINT: HandPose = { ...FIST, curl: [0, 1, 1, 1] };
// Flat palm: fingers together, thumb along the index finger.
const FLAT: HandPose = { ...OPEN, spread: 0.1, thumbAngle: -20 };
// Thumb and pinky out, like a phone receiver.
const PHONE: HandPose = { ...FIST, curl: [1, 1, 1, 0], thumb: 1, thumbAngle: -70, splay: [0, 0, 0, 12] };

const pose = (base: HandPose, change: Partial<HandPose>): HandPose => ({ ...base, ...change });
const key = (at: number, p: HandPose, ease?: Ease): Keyframe => ({ at, pose: p, ease });

// Привет: open palm waving from the wrist.
const wave = (roll: number) => pose(OPEN, { roll });
// Да: a fist nodding forward, like a head.
const nod = (pitch: number, y: number) => pose(FIST, { yaw: 65, pitch, y });
// Нет: the index finger wagging side to side.
const wag = (roll: number) => pose(POINT, { roll });
// Хорошо / Плохо: the fist turned sideways so the thumb points up or down.
const thumbs = (thumb: number, roll: number, y = 0) => pose(FIST, { thumb, roll, y, thumbAngle: -70, yaw: 20, pivot: 0.6 });
// Стоп: a flat palm pushed toward the viewer.
const push = (z: number, pitch = 0) => pose(FLAT, { z, pitch });
// Пока: fingers folding down together and back up.
const flap = (c: number) => pose(OPEN, { spread: 0.25, yaw: 25, curl: [c, c * 0.95, c * 0.9, c * 0.85] });
// Иди сюда: seen from the side, palm up, fingers curling back in.
const beckon = (c: number) => pose(OPEN, { spread: 0.25, thumbAngle: -15, yaw: -70, roll: 90, curl: [c, c, c, c] });
// Подожди: the index finger up, with a short tap toward the viewer.
const hold = (z: number, pitch = 0) => pose(POINT, { z, pitch });
// Мир: index and middle open from a fist into a V.
const vee = (k: number, z = 0) => pose(FIST, { curl: [1 - k, 1 - k, 1, 1], splay: [-10 * k, 12 * k, 0, 0], z });
// Позвони: the phone hand rocking at the wrist.
const phone = (roll: number) => pose(PHONE, { roll, pivot: 0.6 });
// Я тебя люблю: thumb, index and pinky open from a fist.
const ily = (k: number, z = 0) =>
  pose(FIST, { curl: [1 - k, 1, 1, 1 - k], thumb: k, thumbAngle: -75, splay: [0, 0, 0, 12 * k], z });
// Any other word: an open palm that slowly breathes.
const breathe = (k: number) =>
  pose(OPEN, { spread: lerp(0.5, 0.85, k), curl: [0.12, 0.1, 0.12, 0.15].map((c) => c * (1 - k)) as HandPose["curl"], y: -3 * k });

const GESTURES: Record<string, GestureTimeline> = {
  "привет": {
    still: 0,
    keyframes: [
      key(0, wave(0)),
      key(0.35, wave(-18)),
      key(0.7, wave(16)),
      key(1.05, wave(-18)),
      key(1.4, wave(16)),
      key(1.8, wave(0)),
      key(2.6, wave(0)),
    ],
  },
  "да": {
    still: 0,
    keyframes: [
      key(0, nod(0, 0)),
      key(0.35, nod(40, 10)),
      key(0.7, nod(0, 0)),
      key(1.05, nod(40, 10)),
      key(1.4, nod(0, 0)),
      key(2.2, nod(0, 0)),
    ],
  },
  "нет": {
    still: 0,
    keyframes: [
      key(0, wag(0)),
      key(0.22, wag(-16)),
      key(0.5, wag(16)),
      key(0.78, wag(-16)),
      key(1.06, wag(16)),
      key(1.3, wag(0)),
      key(2.1, wag(0)),
    ],
  },
  "хорошо": {
    still: 1.6,
    keyframes: [
      key(0, thumbs(0, 90)),
      key(0.3, thumbs(0, 90)),
      key(0.75, thumbs(1, 90), "back"),
      key(0.95, thumbs(1, 90, -8), "out"),
      key(1.15, thumbs(1, 90)),
      key(1.3, thumbs(1, 90, -4), "out"),
      key(1.45, thumbs(1, 90)),
      key(2.4, thumbs(1, 90)),
      key(2.8, thumbs(0, 90)),
      key(3.0, thumbs(0, 90)),
    ],
  },
  "плохо": {
    still: 1.8,
    keyframes: [
      key(0, thumbs(1, 0)),
      key(0.35, thumbs(1, 0)),
      key(1.0, thumbs(1, -90)),
      key(1.3, thumbs(1, -90, 12), "out"),
      key(2.4, thumbs(1, -90, 12)),
      key(2.9, thumbs(1, 0)),
      key(3.1, thumbs(1, 0)),
    ],
  },
  "стоп": {
    still: 0.8,
    keyframes: [
      key(0, push(0)),
      key(0.3, push(0)),
      key(0.55, push(70, -8), "out"),
      key(1.4, push(70, -8)),
      key(1.9, push(0)),
      key(2.4, push(0)),
    ],
  },
  "пока": {
    still: 0.25,
    keyframes: [
      key(0, flap(0)),
      key(0.25, flap(0.75)),
      key(0.5, flap(0)),
      key(0.75, flap(0.75)),
      key(1.0, flap(0)),
      key(1.25, flap(0.75)),
      key(1.5, flap(0)),
      key(2.3, flap(0)),
    ],
  },
  "иди сюда": {
    still: 0.4,
    keyframes: [
      key(0, beckon(0)),
      key(0.4, beckon(0.8)),
      key(0.8, beckon(0)),
      key(1.2, beckon(0.8)),
      key(1.6, beckon(0)),
      key(2.4, beckon(0)),
    ],
  },
  "подожди": {
    still: 0,
    keyframes: [
      key(0, hold(0)),
      key(0.35, hold(0)),
      key(0.6, hold(50, 15), "out"),
      key(0.9, hold(0)),
      key(2.0, hold(0)),
    ],
  },
  "мир": {
    still: 1.5,
    keyframes: [
      key(0, vee(0)),
      key(0.3, vee(0)),
      key(0.75, vee(1), "back"),
      key(0.95, vee(1, 25), "out"),
      key(1.2, vee(1)),
      key(2.3, vee(1)),
      key(2.7, vee(0)),
      key(2.9, vee(0)),
    ],
  },
  "позвони": {
    still: 0,
    keyframes: [
      key(0, phone(50)),
      key(0.3, phone(38)),
      key(0.6, phone(62)),
      key(0.9, phone(38)),
      key(1.2, phone(62)),
      key(1.5, phone(50)),
      key(2.3, phone(50)),
    ],
  },
  "я тебя люблю": {
    still: 1.6,
    keyframes: [
      key(0, ily(0)),
      key(0.3, ily(0)),
      key(0.8, ily(1), "back"),
      key(1.05, ily(1, 30), "out"),
      key(1.35, ily(1)),
      key(2.4, ily(1)),
      key(2.8, ily(0)),
      key(3.0, ily(0)),
    ],
  },
};

const IDLE: GestureTimeline = {
  still: 1.6,
  keyframes: [key(0, breathe(0)), key(1.6, breathe(1)), key(3.2, breathe(0))],
};

/** The animation for a dictionary word; unknown words get a calm open palm. */
export function gestureTimeline(word: string): GestureTimeline {
  return GESTURES[word.trim().toLowerCase()] ?? IDLE;
}
