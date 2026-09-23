import React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-xl border border-border bg-surface shadow-xs", className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center justify-between gap-3 border-b border-border px-5 py-3.5", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 className={cn("text-sm font-semibold tracking-[-0.01em] text-fg", className)} {...props} />;
}

export function CardBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-5", className)} {...props} />;
}

/** Interactive card surface: 1px lift, stronger border and shadow on hover. */
export const interactiveCard =
  "transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-px hover:border-border-strong hover:shadow-md";
