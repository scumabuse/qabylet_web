"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { getProfile, updateProfile } from "@/app/actions";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { LogoMark } from "./Brand";
import { setAssistantSpeechEnabled, speak, stopSpeaking } from "@/lib/speech";

type Theme = "default" | "blue" | "green" | "dark";

/** Upper bound for restoring the session before falling back to the login page. */
const SESSION_TIMEOUT_MS = 6000;

/** How long the pointer must rest on an element before it is read aloud. */
const HOVER_READ_DELAY_MS = 450;
const MAX_HOVER_TEXT_LENGTH = 300;

const HOVER_SKIP = 'input, textarea, select, [contenteditable="true"], video, canvas, iframe';
const HOVER_CONTROLS =
  'button, a[href], [role="button"], [role="tab"], [role="switch"], [role="radio"], [role="checkbox"], [role="menuitem"], [role="option"], label, summary';
const HOVER_BLOCKS =
  'h1, h2, h3, h4, h5, h6, p, li, dt, dd, th, td, figcaption, blockquote, legend, [role="status"], [role="alert"]';

/** Text a screen reader would announce: aria-label, else visible text without decorative parts. */
function readableText(element: Element): string {
  const label = element.getAttribute('aria-label')?.trim();
  if (label) return label;

  const parts: string[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (!parent || parent.closest('svg, style, script, noscript')) continue;
    const hidden = parent.closest('[aria-hidden="true"]');
    if (hidden && element.contains(hidden)) continue;
    const value = node.textContent?.trim();
    if (value) parts.push(value);
  }
  const text = parts.join(' ').replace(/\s+/g, ' ').trim();
  return (text || element.getAttribute('title')?.trim() || '').slice(0, MAX_HOVER_TEXT_LENGTH);
}

/**
 * The element whose text should be read for a hovered node: the whole
 * control (button, link, tab, label) or text block (heading, paragraph, list
 * item), not an inner fragment. Controls without text (icon buttons) fall
 * back to their aria-label or an enclosing labelled element.
 */
function findReadableElement(target: Element): Element | null {
  if (target.closest(HOVER_SKIP)) return null;
  let element: Element | null =
    target.closest(HOVER_CONTROLS) ?? target.closest(HOVER_BLOCKS) ?? target.closest('span');
  for (let i = 0; element && i < 3; i++) {
    if (readableText(element)) return element;
    element = element.parentElement?.closest(`${HOVER_CONTROLS}, ${HOVER_BLOCKS}`) ?? null;
  }
  return null;
}

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

  // Latest pathname for the auth callbacks below, so the session check runs
  // once per page load instead of on every navigation.
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const goToLogin = () => {
      if (pathnameRef.current !== '/login') router.replace('/login');
    };

    // 1. Get session from Supabase.
    // getSession() can reject (the auth storage lock gets stolen by a parallel
    // request) or hang for a long time (token refresh retries when the network
    // or project is unreachable). Either case used to leave the app on the
    // loading screen forever, so it is guarded with try/catch and a timeout.
    const initSession = async () => {
      try {
        const timeout = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('getSession timed out')), SESSION_TIMEOUT_MS);
        });
        const { data: { session } } = await Promise.race([supabase.auth.getSession(), timeout]);
        if (cancelled) return;

        if (session) {
          setProfileId(session.user.id);
          setSessionLoaded(true);
        } else if (pathnameRef.current === '/login') {
          setSessionLoaded(true);
        } else {
          goToLogin();
        }
      } catch (err) {
        if (cancelled) return;
        console.warn('Could not restore the session, redirecting to login:', err);
        goToLogin();
      } finally {
        clearTimeout(timeoutId);
      }
    };

    initSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setProfileId(session.user.id);
        setSessionLoaded(true);
      } else {
        goToLogin();
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      authListener.subscription.unsubscribe();
    };
  }, [router]);

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

  // TTS setting: persisted in localStorage (the profile table has no column
  // for it) and mirrored into the shared speech service, so pages with
  // long-lived speech-recognition callbacks always see the current value.
  useEffect(() => {
    const saved = localStorage.getItem('qabilet_tts_enabled');
    if (saved === 'false') setTtsEnabled(false);
  }, []);

  useEffect(() => {
    localStorage.setItem('qabilet_tts_enabled', ttsEnabled.toString());
    setAssistantSpeechEnabled(ttsEnabled);
  }, [ttsEnabled]);

  // Read text on hover effect
  useEffect(() => {
    // Load from local storage initially
    const saved = localStorage.getItem('qabilet_read_on_hover');
    if (saved === 'true') setReadOnHover(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('qabilet_read_on_hover', readOnHover.toString());

    if (!readOnHover) {
      stopSpeaking('hover');
      return;
    }

    let hoverTimer: ReturnType<typeof setTimeout> | undefined;
    let lastElement: Element | null = null;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      const element = target ? findReadableElement(target) : null;
      // Moving between children of the same element must not restart reading.
      if (element === lastElement) return;

      clearTimeout(hoverTimer);
      lastElement = element;
      if (!element) return;

      const text = readableText(element);
      if (!text) return;

      hoverTimer = setTimeout(() => {
        // Check local storage for the chosen language
        let lang = 'ru-RU';
        const savedLang = localStorage.getItem('qabilet_lang');
        if (savedLang === 'en') lang = 'en-US';
        else if (savedLang === 'kk') lang = 'kk-KZ';
        speak(text, { lang, source: 'hover' });
      }, HOVER_READ_DELAY_MS);
    };

    // Stop only when the pointer leaves the window. Leaving an element for
    // empty space lets the current phrase finish instead of cutting it off.
    const handleMouseOut = (e: MouseEvent) => {
      if (e.relatedTarget === null) {
        clearTimeout(hoverTimer);
        lastElement = null;
        stopSpeaking('hover');
      }
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      clearTimeout(hoverTimer);
      stopSpeaking('hover');
    };
  }, [readOnHover]);

  if (!sessionLoaded && pathname !== '/login') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-background" role="status" aria-live="polite">
        <LogoMark size={40} />
        <Loader2 size={18} className="animate-spin text-fg-subtle" aria-hidden />
        <span className="sr-only">Загрузка</span>
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
