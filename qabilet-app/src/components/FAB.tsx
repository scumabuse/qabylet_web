"use client";

import React from "react";
import { Accessibility } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

/**
 * Opens the accessibility settings panel.
 * - "sidebar": full-width row at the bottom of the desktop sidebar
 * - "icon": compact icon button for the mobile top bar
 * - "floating": fixed pill in the corner, used where there is no sidebar
 */
export function FAB({ variant = "floating" }: { variant?: "floating" | "sidebar" | "icon" }) {
  const { t } = useLanguage();

  const openSettings = () => {
    window.dispatchEvent(new CustomEvent("open-settings"));
  };

  if (variant === "icon") {
    return (
      <Button variant="ghost" size="icon" onClick={openSettings} aria-label={t("settings_title")}>
        <Accessibility size={18} />
      </Button>
    );
  }

  if (variant === "sidebar") {
    return (
      <button
        type="button"
        onClick={openSettings}
        className="group flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium text-fg-muted transition-colors hover:bg-hover hover:text-fg"
      >
        <Accessibility size={16} strokeWidth={1.75} className="text-fg-subtle group-hover:text-fg-muted" />
        <span className="truncate">{t("settings_title")}</span>
      </button>
    );
  }

  return (
    <Button
      onClick={openSettings}
      className={cn("fixed bottom-5 right-5 z-50 h-10 rounded-full pl-3 pr-4 shadow-md")}
      aria-label={t("settings_title")}
    >
      <Accessibility size={16} />
      <span className="hidden sm:inline">{t("settings_title")}</span>
    </Button>
  );
}
