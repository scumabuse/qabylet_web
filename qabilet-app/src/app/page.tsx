"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getCourses, getUserProgress } from "@/app/actions";
import { supabase } from "@/lib/supabase";
import { ArrowRight, Layers, Infinity as InfinityIcon, ShieldCheck, Video, MessageCircle, BookOpen, Activity, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge, StatusDot } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/page-header";
import { Alert, EmptyState, Skeleton } from "@/components/ui/feedback";
import { FadeIn, Reveal, Stagger, StaggerItem } from "@/components/motion/primitives";
import { stripEmoji } from "@/lib/utils";
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

  const modules = [
    { href: "/ai", icon: MessageCircle, title: t('home_ai_title'), desc: t('home_ai_desc'), cta: t('home_ai_cta') },
    { href: "/call", icon: Video, title: t('home_call_title'), desc: t('home_call_desc'), cta: t('home_call_cta') },
    { href: "/gestures", icon: Activity, title: t('home_gestures_title'), desc: t('home_gestures_desc'), cta: t('home_gestures_cta') },
    { href: "/signs", icon: BookOpen, title: t('home_signs_title'), desc: t('home_signs_desc'), cta: t('home_signs_cta') },
  ];

  return (
    <div className="space-y-16 md:space-y-20">
      {/* Hero */}
      <section className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
        <Stagger className="space-y-6" stagger={0.06}>
          <StaggerItem>
            <Badge variant="outline">
              <StatusDot tone="success" />
              {stripEmoji(t('home_badge'))}
            </Badge>
          </StaggerItem>
          <StaggerItem>
            <h1 className="text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.035em] text-fg sm:text-5xl md:text-[3.5rem]">
              {t('home_hero_title')}
              <br />
              <span className="text-fg-subtle">{t('home_hero_title2')}</span>
            </h1>
          </StaggerItem>
          <StaggerItem>
            <p className="max-w-xl text-[1.0625rem] leading-relaxed text-fg-muted">
              {t('home_hero_sub')} {t('home_hero_sub2')}
            </p>
          </StaggerItem>
          <StaggerItem className="flex flex-wrap gap-2 pt-1">
            <Link href="/learn" className={buttonVariants({ variant: "primary", size: "lg" })}>
              {t('nav_learn')}
              <ArrowRight size={16} />
            </Link>
            <Link href="/voice" className={buttonVariants({ variant: "secondary", size: "lg" })}>
              {t('nav_voice')}
            </Link>
          </StaggerItem>
        </Stagger>

        <FadeIn delay={0.2}>
          <dl className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-surface shadow-xs lg:grid-cols-1 lg:divide-x-0 lg:divide-y">
            {stats.map(({ value, labelKey, icon: Icon }) => (
              <div key={labelKey} className="flex flex-col gap-1 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-5">
                <dt className="flex items-center gap-2 text-xs text-fg-muted lg:text-sm">
                  <Icon size={14} className="hidden text-fg-subtle lg:block" aria-hidden />
                  {t(labelKey)}
                </dt>
                <dd className="font-mono text-xl font-medium tabular-nums tracking-tight text-fg lg:text-lg">{value}</dd>
              </div>
            ))}
          </dl>
        </FadeIn>
      </section>

      {/* Modules */}
      <section className="space-y-6">
        <Reveal>
          <SectionHeader title={t('home_features_title')} description={t('home_features_sub')} />
        </Reveal>
        <Reveal delay={0.05}>
          <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border shadow-xs sm:grid-cols-2">
            {modules.map(({ href, icon: Icon, title, desc, cta }, i) => (
              <Link
                key={href}
                href={href}
                className="group relative flex flex-col gap-5 bg-surface p-6 transition-colors duration-200 hover:bg-subtle focus-visible:z-10 md:p-7"
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-lg border border-border bg-surface text-fg-muted shadow-xs transition-colors group-hover:text-accent-text">
                    <Icon size={18} strokeWidth={1.75} />
                  </span>
                  <span className="font-mono text-xs text-fg-subtle">0{i + 1}</span>
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-[1.0625rem] font-semibold tracking-[-0.015em] text-fg">{title}</h3>
                  <p className="text-sm leading-relaxed text-fg-muted">{desc}</p>
                </div>
                <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-accent-text">
                  {cta}
                  <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Courses */}
      <section className="space-y-6">
        <Reveal>
          <SectionHeader
            title={t('home_courses_title')}
            description={t('home_courses_sub')}
            actions={
              <Link href="/learn" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                {t('home_courses_all')}
                <ArrowRight size={14} />
              </Link>
            }
          />
        </Reveal>

        {loading ? (
          <div className="overflow-hidden rounded-xl border border-border bg-surface" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-b-0">
                <Skeleton className="size-9 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <Alert tone="error">{error}</Alert>
        ) : courses.length === 0 ? (
          <EmptyState
            icon={<Layers />}
            title={t('home_courses_empty')}
            description={t('home_courses_empty_desc')}
          />
        ) : (
          <Stagger className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
            {courses.map((course) => (
              <StaggerItem key={course.id} className="border-b border-border last:border-b-0">
                <Link
                  href={`/courses/${course.id}`}
                  className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-subtle"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-fg-muted">
                    <BookOpen size={16} strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg">{course.title}</p>
                    {course.description && (
                      <p className="truncate text-[0.8125rem] text-fg-muted">{course.description}</p>
                    )}
                  </div>
                  {course.category && (
                    <Badge variant="outline" className="hidden sm:inline-flex">
                      {course.category.split(' #')[0].replace('Авторский: ', '')}
                    </Badge>
                  )}
                  <ChevronRight size={16} className="shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5" />
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </section>
    </div>
  );
}
