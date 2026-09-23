import React from "react";
import { cn } from "@/lib/utils";

/** Qabilet mark: a monochrome tile with a geometric Q. */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-lg bg-fg text-background", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none">
        <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="2.5" />
        <path d="M14.5 14.5L19 19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-[0.9375rem] font-semibold tracking-[-0.02em] text-fg">Qabilet</span>
    </span>
  );
}
