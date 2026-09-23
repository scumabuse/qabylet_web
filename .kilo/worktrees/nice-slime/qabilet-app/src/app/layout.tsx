import type { Metadata } from "next";
import { Inter, Nunito } from "next/font/google";
import "./globals.css";
import { AccessibilityProvider } from "@/components/AccessibilityProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import { Sidebar } from "@/components/Sidebar";
import { FAB } from "@/components/FAB";
import { SettingsPanel } from "@/components/SettingsPanel";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Qabilet — Инклюзивная платформа доступности",
  description: "Универсальная платформа доступности: голосовой помощник, переводчик жестового языка, образование.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${inter.variable} ${nunito.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-screen flex bg-[var(--bg)] text-[var(--text-primary)] transition-colors duration-300">
        <LanguageProvider>
          <AccessibilityProvider>
            <Sidebar />
            <main className="flex-1 relative flex flex-col min-w-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-5xl mx-auto w-full">
                  {children}
                </div>
              </div>
            </main>
            <FAB />
            <SettingsPanel />
          </AccessibilityProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
