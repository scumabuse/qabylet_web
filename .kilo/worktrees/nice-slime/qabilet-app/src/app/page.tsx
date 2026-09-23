"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getCourses, getUserProgress } from "@/app/actions";
import { supabase } from "@/lib/supabase";
import { ArrowRight, Layers, Infinity as InfinityIcon, ShieldCheck, Sparkles, Video, MessageCircle, BookOpen, Activity } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  icon?: string;
  iconBg?: string;
  progress?: number;
  completed?: number;
  total?: number;
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    setMounted(true);

    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const userId = session.user.id;

        const [coursesRes, progressRes] = await Promise.all([
          getCourses(),
          getUserProgress(userId)
        ]);

        if (coursesRes.error) throw new Error(coursesRes.error);
        if (!coursesRes.data) throw new Error("No data returned");

        const mappedData = coursesRes.data.map((item: any) => {
          return {
            ...item,
            icon: item.category === 'для глухих' ? '🤟' : '📚',
            iconBg: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
            progress: 0,
            completed: 0,
            total: 0
          };
        });

        setCourses(mappedData);
      } catch (err: any) {
        console.error("Error fetching dashboard data:", err);
        setError("Не удалось загрузить данные: " + (err.message || "Ошибка сети"));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const stats = [
    { value: "4", labelKey: "home_stat_modules" as const, icon: Layers },
    { value: "100%", labelKey: "home_stat_access" as const, icon: ShieldCheck },
    { value: "∞", labelKey: "home_stat_possibilities" as const, icon: InfinityIcon },
  ];

  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500 relative">

      {/* Ambient background glows */}
      <div
        className="absolute top-0 right-0 w-96 h-96 pointer-events-none -z-0"
        style={{
          background: 'radial-gradient(ellipse at 80% 10%, rgba(124,58,237,0.12) 0%, transparent 65%)',
        }}
      />
      <div
        className="absolute top-32 left-1/3 w-72 h-72 pointer-events-none -z-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, rgba(6,182,212,0.07) 0%, transparent 70%)',
        }}
      />

      {/* Hero Section */}
      <div className="text-center py-10 relative z-10">
        <div className="flex justify-center mb-5">
          <span className="hero-badge">
            {t('home_badge')}
          </span>
        </div>

        <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-black mb-4 leading-[1.1] tracking-tight">
          {t('home_hero_title')}
          <br />
          <span className="gradient-text">{t('home_hero_title2')}</span>
        </h2>

        <p className="text-[var(--text-secondary)] text-lg max-w-md mx-auto leading-relaxed">
          {t('home_hero_sub')}<br className="hidden md:block" />
          <span className="text-[var(--text-muted)]">{t('home_hero_sub2')}</span>
        </p>
      </div>

      {/* Stats Row */}
      <div
        className="grid grid-cols-3 gap-px relative z-10 overflow-hidden"
        style={{
          background: 'var(--border-color)',
          borderRadius: '20px',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {stats.map(({ value, labelKey, icon: Icon }, i) => (
          <div
            key={labelKey}
            className="stat-card flex flex-col items-center justify-center py-7 px-4 gap-2"
            style={{ borderRadius: i === 0 ? '20px 0 0 20px' : i === 2 ? '0 20px 20px 0' : '0' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-1"
              style={{
                background: 'rgba(124,58,237,0.15)',
                border: '1px solid rgba(124,58,237,0.25)',
              }}
            >
              <Icon size={18} className="text-[var(--color-primary-light)]" />
            </div>
            <span className="font-display text-3xl md:text-4xl font-black gradient-text-primary">
              {value}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold">
              {t(labelKey)}
            </span>
          </div>
        ))}
      </div>

      {/* Main Features Section */}
      <div className="relative z-10 space-y-8 pt-6">
        <div className="text-center space-y-3">
          <div className="section-title-line justify-center">
            <Sparkles size={20} className="text-[var(--color-primary-light)]" />
            <h3 className="font-display text-3xl font-bold">{t('home_features_title')}</h3>
          </div>
          <p className="text-[var(--text-muted)] text-sm max-w-lg mx-auto">
            {t('home_features_sub')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* AI Tutor */}
          <Link href="/ai" className="group card-premium p-8 relative overflow-hidden transition-all duration-500 hover:-translate-y-2">
            <div className="absolute -right-6 -bottom-6 opacity-[0.05] group-hover:scale-110 transition-transform duration-700">
               <Sparkles size={140} />
            </div>
            <div className="flex flex-col gap-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] shadow-[0_4px_20px_rgba(124,58,237,0.4)]">
                <MessageCircle size={28} color="white" />
              </div>
              <div>
                <h4 className="text-2xl font-bold mb-2 group-hover:text-[var(--color-primary-light)] transition-colors">{t('home_ai_title')}</h4>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  {t('home_ai_desc')}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--color-primary-light)] opacity-0 group-hover:opacity-100 transition-all duration-300">
                {t('home_ai_cta')} <ArrowRight size={14} />
              </div>
            </div>
          </Link>

          {/* Video Calls */}
          <Link href="/call" className="group card-premium p-8 relative overflow-hidden transition-all duration-500 hover:-translate-y-2">
            <div className="absolute -right-6 -bottom-6 opacity-[0.05] group-hover:scale-110 transition-transform duration-700">
               <Video size={140} />
            </div>
            <div className="flex flex-col gap-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#06B6D4] to-[#22D3EE] shadow-[0_4px_20px_rgba(6,182,212,0.4)]">
                <Video size={28} color="white" />
              </div>
              <div>
                <h4 className="text-2xl font-bold mb-2 group-hover:text-[#06B6D4] transition-colors">{t('home_call_title')}</h4>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  {t('home_call_desc')}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#06B6D4] opacity-0 group-hover:opacity-100 transition-all duration-300">
                {t('home_call_cta')} <ArrowRight size={14} />
              </div>
            </div>
          </Link>

          {/* Gesture Recognition */}
          <Link href="/gestures" className="group card-premium p-8 relative overflow-hidden transition-all duration-500 hover:-translate-y-2">
            <div className="absolute -right-6 -bottom-6 opacity-[0.05] group-hover:scale-110 transition-transform duration-700">
               <Activity size={140} />
            </div>
            <div className="flex flex-col gap-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#F59E0B] to-[#FBBF24] shadow-[0_4px_20px_rgba(245,158,11,0.4)]">
                <Activity size={28} color="white" />
              </div>
              <div>
                <h4 className="text-2xl font-bold mb-2 group-hover:text-[#F59E0B] transition-colors">{t('home_gestures_title')}</h4>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  {t('home_gestures_desc')}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#F59E0B] opacity-0 group-hover:opacity-100 transition-all duration-300">
                {t('home_gestures_cta')} <ArrowRight size={14} />
              </div>
            </div>
          </Link>

          {/* Alphabet Signs */}
          <Link href="/signs" className="group card-premium p-8 relative overflow-hidden transition-all duration-500 hover:-translate-y-2">
            <div className="absolute -right-6 -bottom-6 opacity-[0.05] group-hover:scale-110 transition-transform duration-700">
               <BookOpen size={140} />
            </div>
            <div className="flex flex-col gap-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#10B981] to-[#34D399] shadow-[0_4px_20px_rgba(16,185,129,0.4)]">
                <BookOpen size={28} color="white" />
              </div>
              <div>
                <h4 className="text-2xl font-bold mb-2 group-hover:text-[#10B981] transition-colors">{t('home_signs_title')}</h4>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  {t('home_signs_desc')}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#10B981] opacity-0 group-hover:opacity-100 transition-all duration-300">
                {t('home_signs_cta')} <ArrowRight size={14} />
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
