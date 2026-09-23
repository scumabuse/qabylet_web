"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { getProfile, updateProfile } from "@/app/actions";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";

type Theme = "default" | "blue" | "green" | "dark";

interface AccessibilityContextProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  highContrast: boolean;
  setHighContrast: (val: boolean) => void;
  largeFont: boolean;
  setLargeFont: (val: boolean) => void;
  dyslexiaFont: boolean;
  setDyslexiaFont: (val: boolean) => void;
  ttsEnabled: boolean;
  setTtsEnabled: (val: boolean) => void;
  readOnHover: boolean;
  setReadOnHover: (val: boolean) => void;
}

const AccessibilityContext = createContext<AccessibilityContextProps | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("default");
  const [highContrast, setHighContrast] = useState(false);
  const [largeFont, setLargeFont] = useState(false);
  const [dyslexiaFont, setDyslexiaFont] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [readOnHover, setReadOnHover] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const isLoaded = useRef(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 1. Get session from Supabase
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session && pathname !== '/login') {
        router.push('/login');
        return;
      }
      
      if (session) {
        setProfileId(session.user.id);
      }
      setSessionLoaded(true);
    };

    initSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setProfileId(session.user.id);
      } else if (pathname !== '/login') {
        router.push('/login');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [pathname, router]);

  // Load accessibility settings from Supabase ONLY when profileId is ready
  useEffect(() => {
    if (!profileId || isLoaded.current) return;

    // Fetch profile from supabase
    const fetchProfile = async () => {
      const res = await getProfile(profileId);
      if (res.data) {
        const data = res.data;
        if (data.high_contrast !== null) setHighContrast(data.high_contrast);
        if (data.font_size === 'large') setLargeFont(true);
        if (data.dyslexic_font !== null) setDyslexiaFont(data.dyslexic_font);
      } else {
        // First time login - Create empty profile to avoid errors later
        updateProfile(profileId, {});
      }
      isLoaded.current = true;
    };

    fetchProfile();
  }, [profileId]);

  // Sync to HTML classes and save to Supabase when settings change
  useEffect(() => {
    if (!isLoaded.current) return;

    const html = document.documentElement;
    html.className = "";
    if (theme !== "default") html.classList.add(`theme-${theme}`);
    if (highContrast) html.classList.add("high-contrast");
    if (largeFont) html.classList.add("large-font");
    if (dyslexiaFont) html.classList.add("dyslexia-font");

    // Save to Supabase
    if (profileId) {
      updateProfile(profileId, {
        theme,
        high_contrast: highContrast,
        large_font: largeFont,
        dyslexia_font: dyslexiaFont,
        tts_enabled: ttsEnabled
      }).then((res) => {
        if (res.error) console.error("Error saving profile:", res.error);
      });
    }

  }, [theme, highContrast, largeFont, dyslexiaFont, ttsEnabled, profileId]);

  // Read text on hover effect
  useEffect(() => {
    // Load from local storage initially
    const saved = localStorage.getItem('qabilet_read_on_hover');
    if (saved === 'true') setReadOnHover(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('qabilet_read_on_hover', readOnHover.toString());
    
    if (!readOnHover) {
      window.speechSynthesis.cancel();
      return;
    }

    let hoverTimer: NodeJS.Timeout;
    let lastElement: HTMLElement | null = null;
    
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const tagsToRead = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'SPAN', 'BUTTON', 'A', 'LABEL', 'LI'];
      const closest = target.closest(tagsToRead.join(','));
      
      if (closest && closest !== lastElement && closest.textContent) {
        lastElement = closest as HTMLElement;
        const text = closest.textContent.trim();
        if (!text) return;
        
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          // Check local storage for the chosen language
          let lang = 'ru-RU';
          const savedLang = localStorage.getItem('qabilet_lang');
          if (savedLang === 'en') lang = 'en-US';
          else if (savedLang === 'kk') lang = 'kk-KZ';
          
          utterance.lang = lang;
          
          // Try to explicitly set a matching voice for better accents
          const voices = window.speechSynthesis.getVoices();
          const voice = voices.find(v => v.lang.startsWith(lang.substring(0, 2)));
          if (voice) {
            utterance.voice = voice;
          }
          
          window.speechSynthesis.speak(utterance);
        }, 500); // 500ms hover delay to prevent spamming
      }
    };
    
    const handleMouseOut = (e: MouseEvent) => {
      // Only cancel if moving completely out of the reading element
      const target = e.target as HTMLElement;
      if (lastElement && !lastElement.contains(e.relatedTarget as Node)) {
        clearTimeout(hoverTimer);
        window.speechSynthesis.cancel();
        lastElement = null;
      }
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      clearTimeout(hoverTimer);
      window.speechSynthesis.cancel();
    };
  }, [readOnHover]);

  if (!sessionLoaded && pathname !== '/login') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6" style={{ background: 'var(--bg)' }}>
        <div className="relative">
          {/* Outer glow ring */}
          <div
            className="absolute -inset-4 rounded-full opacity-40"
            style={{
              background: 'radial-gradient(ellipse, rgba(124,58,237,0.3) 0%, transparent 70%)',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
          {/* Logo */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center relative z-10"
            style={{
              background: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
              boxShadow: '0 8px 32px rgba(124,58,237,0.5)',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L4.5 13.5H12L11 22L19.5 10.5H12L13 2Z" fill="white" stroke="white" strokeWidth="1" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        {/* Spinner */}
        <div
          className="w-6 h-6 rounded-full"
          style={{
            border: '2px solid rgba(124,58,237,0.15)',
            borderTopColor: 'var(--color-primary)',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      </div>
    );
  }

  return (
    <AccessibilityContext.Provider
      value={{
        theme,
        setTheme,
        highContrast,
        setHighContrast,
        largeFont,
        setLargeFont,
        dyslexiaFont,
        setDyslexiaFont,
        ttsEnabled,
        setTtsEnabled,
        readOnHover,
        setReadOnHover,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error("useAccessibility must be used within AccessibilityProvider");
  return ctx;
}
