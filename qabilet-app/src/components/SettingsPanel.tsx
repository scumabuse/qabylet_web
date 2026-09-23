"use client";

import React, { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useAccessibility } from "./AccessibilityProvider";
import { useLanguage } from "./LanguageProvider";
import { Lang } from "@/lib/translations";
import { Sheet } from "./ui/dialog";
import { Segmented } from "./ui/segmented";
import { SwitchVisual } from "./ui/switch";
import { cn } from "@/lib/utils";

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return <SwitchVisual checked={checked} onClick={() => onChange(!checked)} />;
}

function SettingRow({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-hover/60">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-fg">{title}</span>
        <span className="block text-[0.8125rem] text-fg-muted">{description}</span>
      </span>
      {children}
    </label>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-eyebrow px-5 pb-1.5 pt-5">{children}</h3>;
}

export function SettingsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const {
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
  } = useAccessibility();

  const { lang, setLang, t } = useLanguage();

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("open-settings", handleOpen);
    return () => window.removeEventListener("open-settings", handleOpen);
  }, []);

  // Rendered through <Sheet open={isOpen}> (instead of returning null when
  // closed) so the panel can animate out.
  const themes = [
    { id: 'default', color: '#5B5BD6', titleKey: 'settings_theme_purple' as const },
    { id: 'blue',    color: '#2563EB', titleKey: 'settings_theme_blue' as const },
    { id: 'green',   color: '#15803D', titleKey: 'settings_theme_green' as const },
    { id: 'dark',    color: '#18181B', titleKey: 'settings_theme_dark' as const },
  ];

  return (
    <Sheet
      open={isOpen}
      onOpenChange={setIsOpen}
      title={t('settings_title')}
      description={t('settings_subtitle')}
      closeLabel={t('settings_close')}
      footer={<p className="text-xs text-fg-subtle">{t('settings_footer')}</p>}
    >
      <div className="pb-4">
        {/* Language */}
        <SectionTitle>{t('settings_lang')}</SectionTitle>
        <div className="px-5 py-2">
          <Segmented<Lang>
            id="settings-lang"
            ariaLabel={t('settings_lang')}
            fullWidth
            value={lang}
            items={[
              { value: 'ru', label: 'Русский', onSelect: () => setLang('ru') },
              { value: 'kk', label: 'Қазақша', onSelect: () => setLang('kk') },
              { value: 'en', label: 'English', onSelect: () => setLang('en') },
            ]}
          />
        </div>

        {/* Reading */}
        <SectionTitle>{t('settings_reading')}</SectionTitle>
        <SettingRow title={t('settings_large_font')} description={t('settings_large_font_desc')}>
          <Toggle checked={largeFont} onChange={setLargeFont} />
        </SettingRow>
        <SettingRow title={t('settings_dyslexia')} description={t('settings_dyslexia_desc')}>
          <Toggle checked={dyslexiaFont} onChange={setDyslexiaFont} />
        </SettingRow>

        {/* Visual */}
        <SectionTitle>{t('settings_visual')}</SectionTitle>
        <SettingRow title={t('settings_high_contrast')} description={t('settings_high_contrast_desc')}>
          <Toggle checked={highContrast} onChange={setHighContrast} />
        </SettingRow>

        <div className="px-5 pb-2 pt-3">
          <p className="mb-2.5 text-sm font-medium text-fg">{t('settings_theme')}</p>
          <div role="radiogroup" aria-label={t('settings_theme')} className="grid grid-cols-4 gap-2">
            {themes.map((th) => {
              const selected = theme === th.id;
              return (
                <button
                  key={th.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  title={t(th.titleKey)}
                  onClick={() => setTheme(th.id as any)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border px-1 py-2.5 transition-[border-color,background-color] duration-150",
                    selected ? "border-accent bg-accent-soft" : "border-border hover:border-border-strong hover:bg-hover"
                  )}
                >
                  <span
                    className="flex size-6 items-center justify-center rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/10"
                    style={{ background: th.color }}
                  >
                    {selected && <Check size={13} strokeWidth={3} className="text-white" />}
                  </span>
                  <span className={cn("text-[0.6875rem] font-medium", selected ? "text-fg" : "text-fg-muted")}>
                    {t(th.titleKey)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sound */}
        <SectionTitle>{t('settings_sound')}</SectionTitle>
        <SettingRow title={t('settings_tts')} description={t('settings_tts_desc')}>
          <Toggle checked={ttsEnabled} onChange={setTtsEnabled} />
        </SettingRow>
        <SettingRow title={t('settings_hover_read')} description={t('settings_hover_read_desc')}>
          <Toggle checked={readOnHover} onChange={setReadOnHover} />
        </SettingRow>
      </div>
    </Sheet>
  );
}
