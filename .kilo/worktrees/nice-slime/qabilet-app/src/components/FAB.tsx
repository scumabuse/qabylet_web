"use client";

import React from "react";
import { Settings2 } from "lucide-react";

export function FAB() {
  const openSettings = () => {
    window.dispatchEvent(new CustomEvent("open-settings"));
  };

  return (
    <button
      onClick={openSettings}
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full text-white active:scale-95 transition-all duration-300 group"
      style={{
        background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)',
        boxShadow: '0 8px 32px rgba(124,58,237,0.5), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
      }}
      aria-label="Спец. возможности"
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(124,58,237,0.7), 0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)';
        (e.currentTarget as HTMLElement).style.transform = 'scale(1.08) translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(124,58,237,0.5), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)';
        (e.currentTarget as HTMLElement).style.transform = '';
      }}
    >
      <Settings2 size={26} className="transition-transform duration-700 group-hover:rotate-90" />
    </button>
  );
}
