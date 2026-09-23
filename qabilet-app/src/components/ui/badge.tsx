import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-2 text-xs font-medium [&_svg]:size-3.5",
  {
    variants: {
      variant: {
        neutral: "border-border bg-muted text-fg-muted",
        outline: "border-border bg-surface text-fg-muted",
        accent: "border-accent-border bg-accent-soft text-accent-text",
        success: "border-transparent bg-success-soft text-success",
        warning: "border-transparent bg-warning-soft text-warning",
        danger: "border-transparent bg-danger-soft text-danger",
        overlay: "border-white/15 bg-black/55 text-white backdrop-blur-sm",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/** Small status dot. Pulses only when it represents a live signal. */
export function StatusDot({
  tone = "neutral",
  live = false,
}: {
  tone?: "neutral" | "success" | "warning" | "danger";
  live?: boolean;
}) {
  const color = {
    neutral: "bg-fg-subtle",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
  }[tone];
  return (
    <span className="relative inline-flex size-2 shrink-0" aria-hidden>
      {live && <span className={cn("absolute inset-0 animate-ping rounded-full opacity-50", color)} />}
      <span className={cn("relative inline-flex size-2 rounded-full", color)} />
    </span>
  );
}
