"use client";

import React from "react";
import { motion } from "motion/react";
import { AlertCircle, CheckCircle2, Info, Loader2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { EASE } from "@/components/motion/primitives";

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div aria-hidden className={cn("skeleton", className)} {...props} />;
}

export function Spinner({ className, size = 16 }: { className?: string; size?: number }) {
  return <Loader2 size={size} className={cn("animate-spin text-fg-subtle", className)} aria-hidden />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  bordered = true,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  bordered?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-4 rounded-xl px-6 py-8 sm:flex-row sm:items-center",
        bordered && "border border-dashed border-border-strong",
        className
      )}
    >
      {icon && (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-fg-muted shadow-xs [&_svg]:size-[18px]">
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-semibold text-fg">{title}</p>
        {description && <p className="max-w-prose text-sm text-fg-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

const alertTone = {
  error: { cls: "border-danger/25 bg-danger-soft text-danger", Icon: AlertCircle },
  success: { cls: "border-success/25 bg-success-soft text-success", Icon: CheckCircle2 },
  warning: { cls: "border-warning/25 bg-warning-soft text-warning", Icon: TriangleAlert },
  info: { cls: "border-border bg-muted text-fg-muted", Icon: Info },
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: keyof typeof alertTone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const { cls, Icon } = alertTone[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-lg border px-3.5 py-3 text-sm", cls, className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 space-y-0.5">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cn(title && "text-fg-muted")}>{children}</div>}
      </div>
    </div>
  );
}

export function Progress({ value, className, label }: { value: number; className?: string; label?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-label={label}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <motion.div
        className="h-full rounded-full bg-accent"
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.6, ease: EASE }}
      />
    </div>
  );
}
