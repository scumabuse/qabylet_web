"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { Home, Mic, HandMetal, BrainCircuit, Menu, X, BookOpen, Video } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import { Wordmark } from "./Brand";
import { FAB } from "./FAB";
import { Button } from "./ui/button";
import { EASE } from "./motion/primitives";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/",       labelKey: "nav_home"  as const, icon: Home },
  { href: "/learn",  labelKey: "nav_learn" as const, icon: BookOpen },
  { href: "/voice",  labelKey: "nav_voice" as const, icon: Mic },
  { href: "/signs",  labelKey: "nav_signs" as const, icon: HandMetal },
  { href: "/call",   labelKey: "nav_call"  as const, icon: Video },
  { href: "/ai",     labelKey: "nav_ai"    as const, icon: BrainCircuit },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLanguage();

  const renderNav = (indicatorId: string) => (
    <nav aria-label="Основная навигация" className="flex flex-col gap-0.5">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        // Presentational only: nested learning routes keep "Learn" highlighted.
        const isCurrent =
          isActive ||
          (item.href === "/learn" && (pathname.startsWith("/learn/") || pathname.startsWith("/courses/")));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setIsOpen(false)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium outline-offset-0 transition-colors duration-150",
              isCurrent ? "text-fg" : "text-fg-muted hover:bg-hover hover:text-fg"
            )}
          >
            {isCurrent && (
              <motion.span
                layoutId={indicatorId}
                className="absolute inset-0 rounded-lg border border-border bg-surface shadow-xs"
                transition={{ type: "spring", bounce: 0, duration: 0.35 }}
              />
            )}
            <Icon
              size={16}
              strokeWidth={1.75}
              className={cn(
                "relative shrink-0 transition-colors",
                isCurrent ? "text-accent-text" : "text-fg-subtle group-hover:text-fg-muted"
              )}
            />
            <span className="relative truncate">{t(item.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/90 px-3 backdrop-blur-md md:hidden">
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Меню"
            aria-expanded={isOpen}
          >
            <Menu size={18} />
          </Button>
          <Link href="/" onClick={() => setIsOpen(false)} className="rounded-lg">
            <Wordmark />
          </Link>
        </div>
        <FAB variant="icon" />
      </header>

      {/* Mobile drawer */}
      <DialogPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
        <AnimatePresence>
          {isOpen && (
            <DialogPrimitive.Portal forceMount>
              <DialogPrimitive.Overlay asChild forceMount>
                <motion.div
                  className="fixed inset-0 z-40 bg-[var(--overlay)] md:hidden"
                  onClick={() => setIsOpen(false)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                />
              </DialogPrimitive.Overlay>
              <DialogPrimitive.Content asChild forceMount aria-describedby={undefined}>
                <motion.aside
                  className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-border bg-subtle shadow-lg focus:outline-none md:hidden"
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ duration: 0.3, ease: EASE }}
                >
                  <DialogPrimitive.Title className="sr-only">Меню</DialogPrimitive.Title>
                  <div className="flex h-14 items-center justify-between px-3">
                    <Link href="/" onClick={() => setIsOpen(false)} className="rounded-lg px-1">
                      <Wordmark />
                    </Link>
                    <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} aria-label="Закрыть меню">
                      <X size={18} />
                    </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto px-3 py-2">{renderNav("nav-indicator-mobile")}</div>
                </motion.aside>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          )}
        </AnimatePresence>
      </DialogPrimitive.Root>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-subtle md:flex">
        <div className="flex h-16 items-center px-5">
          <Link href="/" className="rounded-lg">
            <Wordmark />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">{renderNav("nav-indicator-desktop")}</div>
        <div className="border-t border-border p-3">
          <FAB variant="sidebar" />
        </div>
      </aside>
    </>
  );
}
