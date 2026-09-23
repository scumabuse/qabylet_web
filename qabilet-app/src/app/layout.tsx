import type { Metadata, Viewport } from "next";
import { Onest, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AccessibilityProvider } from "@/components/AccessibilityProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import { SettingsPanel } from "@/components/SettingsPanel";
import { AppShell } from "@/components/AppShell";
import { MotionProvider } from "@/components/motion/primitives";

// Font variables live on <body>: AccessibilityProvider rewrites <html> classes.
const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Qabilet — Инклюзивная платформа доступности",
  description: "Универсальная платформа доступности: голосовой помощник, переводчик жестового языка, образование.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${onest.variable} ${jetbrainsMono.variable} min-h-dvh bg-background text-fg antialiased`}>
        <MotionProvider>
          <LanguageProvider>
            <AccessibilityProvider>
              <AppShell>{children}</AppShell>
              <SettingsPanel />
            </AccessibilityProvider>
          </LanguageProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
