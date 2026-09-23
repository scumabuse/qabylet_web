"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FINGERTIPS,
  HAND_CONNECTIONS,
  gestureTimeline,
  handLandmarks,
  poseAt,
  project,
  timelineBounds,
  type Point3,
} from "@/lib/hand-poses";

// View box in the aspect of the dialog preview (16:9).
const W = 320;
const H = 180;
const PAD = 22;
// Room left at the bottom for the caption and the controls.
const PAD_BOTTOM = 34;
// Fingertip positions kept for the motion trail.
const TRAIL = 12;
const SCAN_PERIOD = 3.2;

type Frame = { points: Point3[]; trails: Point3[][]; scan: number };

interface GestureAnimationProps {
  word: string;
  className?: string;
}

/**
 * Loops a dictionary sign on a MediaPipe-style hand skeleton, the same
 * picture the camera tab draws over the video.
 */
export default function GestureAnimation({ word, className }: GestureAnimationProps) {
  const timeline = useMemo(() => gestureTimeline(word), [word]);
  const reducedMotion = useReducedMotion();
  const [slow, setSlow] = useState(false);
  const [run, setRun] = useState(0);
  const [frame, setFrame] = useState<Frame | null>(null);
  const speedRef = useRef(1);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  // Fit the whole loop into the view once, so the hand never leaves it.
  const pointsAt = useMemo(() => {
    const box = timelineBounds(timeline);
    const scale = Math.min((W - 2 * PAD) / (box.maxX - box.minX), (H - PAD - PAD_BOTTOM) / (box.maxY - box.minY), 1.1);
    const cx = (box.minX + box.maxX) / 2;
    const cy = (box.minY + box.maxY) / 2;
    const midY = (PAD + H - PAD_BOTTOM) / 2;
    return (t: number) =>
      handLandmarks(poseAt(timeline, t))
        .map(project)
        .map((p) => ({ x: W / 2 + (p.x - cx) * scale, y: midY + (p.y - cy) * scale, z: p.z }));
  }, [timeline]);

  const firstFrame = useMemo<Frame>(() => ({ points: pointsAt(0), trails: [], scan: 0 }), [pointsAt]);
  const stillFrame = useMemo<Frame>(() => ({ points: pointsAt(timeline.still), trails: [], scan: 0 }), [pointsAt, timeline]);

  useEffect(() => {
    speedRef.current = slow ? 0.5 : 1;
  }, [slow]);

  useEffect(() => {
    if (reducedMotion) return;
    const trails: Point3[][] = FINGERTIPS.map(() => []);
    let clock = 0;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      // Cap the step so returning to a background tab does not jump.
      clock += (Math.min(now - last, 100) / 1000) * speedRef.current;
      last = now;
      const points = pointsAt(clock);
      FINGERTIPS.forEach((tip, i) => {
        trails[i].push(points[tip]);
        if (trails[i].length > TRAIL) trails[i].shift();
      });
      setFrame({ points, trails: trails.map((t) => [...t]), scan: (clock / SCAN_PERIOD) % 1 });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pointsAt, reducedMotion, run]);

  const { points, trails, scan } = reducedMotion ? stillFrame : (frame ?? firstFrame);
  const bones = HAND_CONNECTIONS.map(([a, b]) => ({ a: points[a], b: points[b], z: (points[a].z + points[b].z) / 2 })).sort(
    (u, v) => u.z - v.z
  );
  const scanY = scan * (H + 40) - 20;

  return (
    <div className={cn("absolute inset-0", className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="size-full"
        role="img"
        aria-label={`Анимация жеста «${word}»`}
      >
        <defs>
          <pattern id={`${uid}-grid`} width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="8" cy="8" r="0.7" className="fill-fg-subtle" opacity="0.35" />
          </pattern>
          <radialGradient id={`${uid}-spot`}>
            <stop offset="0%" style={{ stopColor: "var(--accent)", stopOpacity: 0.14 }} />
            <stop offset="100%" style={{ stopColor: "var(--accent)", stopOpacity: 0 }} />
          </radialGradient>
          <linearGradient id={`${uid}-scan`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--accent)", stopOpacity: 0 }} />
            <stop offset="100%" style={{ stopColor: "var(--accent)", stopOpacity: 0.1 }} />
          </linearGradient>
          <filter id={`${uid}-glow`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" />
          </filter>
        </defs>

        <rect width={W} height={H} fill={`url(#${uid}-grid)`} />
        <ellipse cx={W / 2} cy={H / 2} rx={W * 0.42} ry={H * 0.5} fill={`url(#${uid}-spot)`} />
        {!reducedMotion && (
          <g aria-hidden>
            <rect x="0" y={scanY - 24} width={W} height="24" fill={`url(#${uid}-scan)`} />
            <line x1="0" x2={W} y1={scanY} y2={scanY} className="stroke-accent" strokeOpacity="0.25" strokeWidth="0.6" />
          </g>
        )}

        <g filter={`url(#${uid}-glow)`} opacity="0.45" aria-hidden>
          {bones.map(({ a, b }, i) => (
            <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="stroke-accent" strokeWidth="6" strokeLinecap="round" />
          ))}
        </g>

        <g aria-hidden>
          {trails.map((trail, f) =>
            trail.slice(1).map((p, i) => (
              <line
                key={`${f}-${i}`}
                x1={trail[i].x}
                y1={trail[i].y}
                x2={p.x}
                y2={p.y}
                className="stroke-accent"
                strokeOpacity={((i + 1) / trail.length) * 0.55}
                strokeWidth={((i + 1) / trail.length) * 2.4}
                strokeLinecap="round"
              />
            ))
          )}
        </g>

        <g aria-hidden>
          {bones.map(({ a, b, z }, i) => (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className="stroke-accent"
              strokeOpacity={Math.min(Math.max(0.8 + z / 150, 0.45), 1)}
              strokeWidth={Math.min(Math.max(2.6 + z / 60, 1.6), 4)}
              strokeLinecap="round"
            />
          ))}
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={i === 0 || FINGERTIPS.includes(i) ? 2.8 : 2} className="fill-fg" />
          ))}
        </g>
      </svg>

      <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-mono text-[0.6875rem] uppercase tracking-wider text-fg-subtle">
          <span aria-hidden className="size-1.5 rounded-full bg-accent" />
          Анимация жеста
        </span>
        {!reducedMotion && (
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              aria-pressed={slow}
              onClick={() => setSlow((s) => !s)}
              title="Медленно"
              className={cn("h-7 px-2 font-mono text-xs", slow && "border-accent-border bg-accent-soft text-accent-text hover:bg-accent-soft-strong")}
            >
              0.5×
            </Button>
            <Button size="icon-sm" onClick={() => setRun((r) => r + 1)} aria-label="Повторить" className="size-7">
              <RotateCcw size={14} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
