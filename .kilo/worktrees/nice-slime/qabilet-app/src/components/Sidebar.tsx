"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Mic, HandMetal, BrainCircuit, Menu, X, BookOpen, Zap, Video } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

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

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl text-[var(--text-primary)] transition-all duration-200 active:scale-95"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-card)',
        }}
        aria-label="Меню"
      >
        {isOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 backdrop-blur-md"
          style={{ background: 'rgba(4, 2, 14, 0.75)' }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:sticky top-0 left-0 z-40
          h-screen w-64 flex flex-col
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
        style={{
          background: 'linear-gradient(180deg, var(--bg-card) 0%, rgba(12,10,24,0.97) 100%)',
          borderRight: '1px solid var(--border-color)',
          boxShadow: '4px 0 32px rgba(0,0,0,0.4)',
        }}
      >
        {/* Ambient glow behind logo */}
        <div
          className="absolute top-0 left-0 w-48 h-32 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 20% 20%, rgba(124,58,237,0.18) 0%, transparent 70%)',
          }}
        />

        {/* Logo */}
        <div className="p-6 relative z-10">
          <Link
            href="/"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 group"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3"
              style={{
                background: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
                boxShadow: '0 4px 16px rgba(124,58,237,0.5)',
              }}
            >
              <Zap size={18} color="white" />
            </div>
            <span
              className="font-display font-black text-2xl tracking-tight gradient-text"
            >
              Qabilet
            </span>
          </Link>
        </div>

        <div className="px-4 mb-2">
          <div className="divider" />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`sidebar-item group ${isActive ? "sidebar-item-active" : "sidebar-item-inactive"}`}
              >
                <div
                  className={`
                    w-9 h-9 rounded-xl flex items-center justify-center shrink-0
                    transition-all duration-300
                    ${isActive
                      ? "text-[var(--color-primary-light)]"
                      : "text-[var(--text-muted)] group-hover:text-[var(--color-primary-light)]"
                    }
                  `}
                  style={isActive ? {
                    background: 'rgba(124,58,237,0.2)',
                    boxShadow: '0 0 12px rgba(124,58,237,0.25)',
                  } : {
                    background: 'rgba(255,255,255,0.04)',
                  }}
                >
                  <Icon
                    size={18}
                    className="transition-transform duration-300 group-hover:scale-110"
                  />
                </div>
                <span className="transition-colors duration-200">{t(item.labelKey)}</span>
                {isActive && (
                  <div
                    className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{
                      background: 'var(--color-primary-light)',
                      boxShadow: '0 0 6px var(--color-primary-light)',
                    }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom ambient */}
        <div
          className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
          style={{
            background: 'linear-gradient(0deg, rgba(124,58,237,0.07) 0%, transparent 100%)',
          }}
        />
      </aside>
    </>
  );
}
