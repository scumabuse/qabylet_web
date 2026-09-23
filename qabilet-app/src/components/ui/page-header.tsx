import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-1.5 rounded-md text-[0.8125rem] font-medium text-fg-muted transition-colors hover:text-fg"
    >
      <ArrowLeft size={14} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
      {children}
    </Link>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  back,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: React.ReactNode };
  className?: string;
}) {
  return (
    <header className={cn("space-y-4", className)}>
      {back && <BackLink href={back.href}>{back.label}</BackLink>}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 space-y-2">
          {eyebrow && <p className="text-eyebrow">{eyebrow}</p>}
          <h1 className="text-display text-fg">{title}</h1>
          {description && <p className="max-w-2xl text-[0.9375rem] text-fg-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function SectionHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0 space-y-1">
        <h2 className="text-base font-semibold tracking-[-0.015em] text-fg">{title}</h2>
        {description && <p className="text-sm text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
