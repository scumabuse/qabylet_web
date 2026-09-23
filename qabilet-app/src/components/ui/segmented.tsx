"use client";

import React, { useRef } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export type SegmentedItem<T extends string> = {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  /** Runs instead of onChange when this item is chosen. */
  onSelect?: () => void;
};

/**
 * Tab-style segmented control with a sliding indicator (shared layoutId).
 * Arrow keys move between items.
 */
export function Segmented<T extends string>({
  id,
  items,
  value,
  onChange,
  ariaLabel,
  size = "md",
  fullWidth = false,
  className,
}: {
  /** Unique per instance; used as the indicator's layoutId. */
  id: string;
  items: SegmentedItem<T>[];
  value: T;
  onChange?: (value: T) => void;
  ariaLabel?: string;
  size?: "sm" | "md";
  fullWidth?: boolean;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (item: SegmentedItem<T>) => {
    if (item.onSelect) item.onSelect();
    else onChange?.(item.value);
  };

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % items.length;
    if (e.key === "ArrowLeft") next = (index - 1 + items.length) % items.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = items.length - 1;
    refs.current[next]?.focus();
    select(items[next]);
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "relative inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted p-0.5",
        fullWidth && "flex w-full",
        className
      )}
    >
      {items.map((item, i) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => select(item)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors duration-150",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
              size === "sm" ? "h-7 px-2.5 text-[0.8125rem]" : "h-8 px-3 text-sm",
              fullWidth && "flex-1",
              active ? "text-fg" : "text-fg-muted hover:text-fg"
            )}
          >
            {active && (
              <motion.span
                layoutId={`segmented-${id}`}
                className="absolute inset-0 rounded-md border border-border bg-surface shadow-xs"
                transition={{ type: "spring", bounce: 0, duration: 0.35 }}
              />
            )}
            <span className="relative inline-flex items-center gap-1.5 [&_svg]:size-4">
              {item.icon}
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
