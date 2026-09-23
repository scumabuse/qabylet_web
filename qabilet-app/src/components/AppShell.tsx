"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { FAB } from "@/components/FAB";
import { PageTransition } from "@/components/motion/primitives";

/**
 * Presentational frame around every route: sidebar navigation, content
 * column and route transition. The login route renders full-bleed.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return (
      <>
        <main id="main">{children}</main>
        <FAB variant="floating" />
      </>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:shadow-md"
      >
        Перейти к содержимому
      </a>
      <Sidebar />
      <main id="main" className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6 sm:px-6 md:pt-10 lg:px-10">
          <PageTransition key={pathname}>{children}</PageTransition>
        </div>
      </main>
    </div>
  );
}
