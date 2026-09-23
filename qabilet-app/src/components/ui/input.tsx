import React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const controlClass = [
  "w-full rounded-lg border border-border bg-surface text-sm text-fg shadow-xs",
  "placeholder:text-fg-subtle",
  "transition-[border-color,box-shadow] duration-150",
  "hover:border-border-strong",
  "focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-soft-strong",
  "disabled:cursor-not-allowed disabled:opacity-50",
].join(" ");

type InputProps = React.ComponentProps<"input"> & { leadingIcon?: React.ReactNode };

export function Input({ className, leadingIcon, ...props }: InputProps) {
  if (!leadingIcon) {
    return <input className={cn(controlClass, "h-10 px-3", className)} {...props} />;
  }
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle [&_svg]:size-4">
        {leadingIcon}
      </span>
      <input className={cn(controlClass, "h-10 pl-9 pr-3", className)} {...props} />
    </div>
  );
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(controlClass, "min-h-24 resize-none px-3 py-2.5 leading-relaxed", className)}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cn(controlClass, "h-10 appearance-none pl-3 pr-9", className)} {...props}>
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
      />
    </div>
  );
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("block text-[0.8125rem] font-medium text-fg", className)} {...props} />;
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-fg-subtle">{hint}</p>}
    </div>
  );
}
