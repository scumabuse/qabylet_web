import React from "react";
import { cn } from "@/lib/utils";

/** Visual switch. Behavior (onClick) is supplied by the caller. */
export function SwitchVisual({
  checked,
  className,
  ...props
}: React.ComponentProps<"button"> & { checked: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-200",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        checked ? "border-transparent bg-accent" : "border-border-strong bg-muted",
        className
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block size-4 rounded-full shadow-xs transition-transform duration-200 ease-out",
          checked ? "translate-x-[17px] bg-accent-fg" : "translate-x-[1px] bg-surface ring-1 ring-border-strong"
        )}
      />
    </button>
  );
}
