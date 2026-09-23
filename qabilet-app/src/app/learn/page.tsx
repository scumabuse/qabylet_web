"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronRight,
  History,
  TrendingUp,
  Award,
  Video,
  Clapperboard,
  Inbox,
  Users,
  Target,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, interactiveCard } from "@/components/ui/card";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { EmptyState, Progress, Skeleton } from "@/components/ui/feedback";
import { Stagger, StaggerItem } from "@/components/motion/primitives";
import { cn } from "@/lib/utils";
import { getCourses, getUserProgress, getLessons, getAIActivityCount, getLastStudiedLesson, getCommunityCourses } from "@/app/actions";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";

export default function LearnPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [activityCount, setActivityCount] = useState(0);
  const [lastLesson, setLastLesson] = useState<any>(null);
  const [hiddenCourses, setHiddenCourses] = useState<Set<string>>(new Set());
  const [communityCourses, setCommunityCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { t } = useLanguage();

  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const trimmed = url.trim();
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = trimmed.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  useEffect(() => {
    setMounted(true);
    // Load hidden courses from localStorage
    const saved = typeof window !== 'undefined' ? localStorage.getItem('hidden_courses') : null;
    const hiddenSet = saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
    setHiddenCourses(hiddenSet);

    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const userId = session.user.id;

        const [coursesRes, progressRes, activityRes, lastRes, commRes] = await Promise.all([
          getCourses(),
          getUserProgress(userId),
          getAIActivityCount(userId),
          getLastStudiedLesson(userId),
          getCommunityCourses()
        ]);

        const allProgress = progressRes.data || [];
        const completedLessonIds = new Set(allProgress.filter((p: any) => p.is_completed).map((p: any) => p.lesson_id));
        const startedLessonIds = new Set(allProgress.map((p: any) => p.lesson_id));
        setActivityCount(activityRes.count || 0);
        setLastLesson(lastRes.data);
        setCommunityCourses(commRes.data || []);

        const allCourses = coursesRes.data || [];
        const mappedData = allCourses.map((item: any) => {
          const courseLessons = item.lessons || [];
          const total = courseLessons.length;
          const completed = courseLessons.filter((l: any) => completedLessonIds.has(l.id)).length;
          const hasAnyProgress = courseLessons.some((l: any) => startedLessonIds.has(l.id));
          const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
          return { ...item, progress: percent, completed, total, hasAnyProgress };
        });

        setCourses(mappedData.filter(c => {
          const isMyCreation = c.category?.includes(`#creator:${userId}`);
          // If it's my creation, only show if I've actually started/added it
          if (isMyCreation && !c.hasAnyProgress) return false;
          if (hiddenSet.has(c.id)) return false;
          return c.hasAnyProgress;
        }));
      } catch (err) {
        console.error("Error fetching learn dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-12" aria-busy="true">
        <p className="sr-only" role="status">Загружаем ваш прогресс...</p>
        <div className="space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl md:col-span-2" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-video rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const renderThumbnail = (videoUrl: string) => {
    const youtubeId = getYoutubeId(videoUrl);
    const media = "h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]";
    if (youtubeId) {
      return <img src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`} alt="" className={media} />;
    }
    if (videoUrl) {
      return <video src={videoUrl} className={media} muted playsInline preload="metadata" />;
    }
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Video size={28} strokeWidth={1.5} className="text-fg-subtle" />
      </div>
    );
  };

  const courseCard = cn(
    "group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xs",
    interactiveCard
  );

  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow={t('learn_dashboard')}
        title={t('learn_title')}
        description={t('learn_subtitle')}
        actions={
          <Badge variant="outline" className="h-8 px-2.5 text-[0.8125rem]">
            <Award className="text-warning" />
            <span className="text-fg-subtle">{t('learn_level')}</span>
            <span className="text-fg">{t('learn_beginner')}</span>
          </Badge>
        }
      />

      {/* Overview */}
      <Stagger className="grid gap-4 md:grid-cols-3">
        <StaggerItem className="h-full">
          <Card className="flex h-full flex-col justify-between gap-6 p-5">
            <div className="flex items-center gap-2 text-sm text-fg-muted">
              <TrendingUp size={15} className="text-fg-subtle" />
              {t('learn_ai_activity')}
            </div>
            <div>
              <p className="font-mono text-4xl font-medium tabular-nums tracking-tight text-fg">{activityCount}</p>
              <p className="mt-1 text-[0.8125rem] text-fg-muted">{t('learn_msgs_today')}</p>
            </div>
          </Card>
        </StaggerItem>

        <StaggerItem className="h-full md:col-span-2">
          <Card className="flex h-full flex-col justify-between gap-6 p-5">
            <div className="flex items-center gap-2 text-sm text-fg-muted">
              <History size={15} className="text-fg-subtle" />
              {t('learn_last_lesson')}
            </div>
            {lastLesson ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold tracking-[-0.015em] text-fg">{lastLesson.lessons.title}</p>
                  <p className="text-[0.8125rem] text-fg-muted">{t('learn_click_continue')}</p>
                </div>
                <Link
                  href={`/courses/${lastLesson.lessons.course_id}/${lastLesson.lesson_id}`}
                  className={buttonVariants({ variant: "primary" })}
                >
                  {t('learn_continue')}
                  <ChevronRight size={16} />
                </Link>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <Target size={18} className="mt-0.5 shrink-0 text-fg-subtle" />
                <p className="text-sm text-fg-muted">
                  {t('learn_not_started').split('. ')[0]}.{" "}
                  <span className="font-medium text-fg">{t('learn_not_started').split('. ').slice(1).join('. ')}</span>
                </p>
              </div>
            )}
          </Card>
        </StaggerItem>
      </Stagger>

      {/* My courses */}
      <section className="space-y-5">
        <SectionHeader
          title={t('learn_my_courses')}
          actions={
            <Link href="/learn/studio" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              <Clapperboard size={15} />
              {t('learn_studio')}
            </Link>
          }
        />

        {courses.length > 0 ? (
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <StaggerItem key={course.id}>
                <Link href={`/courses/${course.id}`} className={courseCard}>
                  <div className="relative aspect-video overflow-hidden border-b border-border bg-muted">
                    {renderThumbnail(course.lessons?.[0]?.video_url)}
                    <Badge variant="overlay" className="absolute left-3 top-3">
                      {course.category?.split(' #')[0]?.replace('Авторский: ', '') || 'Курс'}
                    </Badge>
                  </div>
                  <div className="flex flex-1 flex-col gap-4 p-4">
                    <h3 className="line-clamp-2 text-[0.9375rem] font-semibold leading-snug tracking-[-0.01em] text-fg">{course.title}</h3>
                    <div className="mt-auto space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-fg-muted">
                          {course.completed}/{course.total} {t('learn_lessons_done')}
                        </span>
                        <span className="font-mono tabular-nums text-fg">{course.progress}%</span>
                      </div>
                      <Progress value={mounted ? course.progress : 0} label={t('learn_progress')} />
                    </div>
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        ) : (
          <EmptyState
            icon={<Inbox />}
            title={t('learn_no_active')}
            description={t('learn_no_active_desc')}
            action={
              <Link href="/" className={buttonVariants({ variant: "primary", size: "sm" })}>
                {t('learn_find_course')}
                <ChevronRight size={15} />
              </Link>
            }
          />
        )}
      </section>

      {/* Community courses */}
      <section className="space-y-5">
        <SectionHeader title={t('learn_community')} />

        {communityCourses.length > 0 ? (
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {communityCourses.map((course) => (
              <StaggerItem key={course.id}>
                <Link
                  href={course.lessons?.[0]?.id ? `/courses/${course.id}/${course.lessons[0].id}` : `/courses/${course.id}`}
                  className={courseCard}
                >
                  <div className="relative aspect-video overflow-hidden border-b border-border bg-muted">
                    {renderThumbnail(course.lessons?.[0]?.video_url)}
                    <Badge variant="overlay" className="absolute left-3 top-3">
                      {course.category.split(' #')[0].replace('Авторский: ', '')}
                    </Badge>
                  </div>
                  <div className="space-y-1.5 p-4">
                    <h3 className="line-clamp-1 text-[0.9375rem] font-semibold tracking-[-0.01em] text-fg">{course.title}</h3>
                    <p className="line-clamp-2 text-[0.8125rem] leading-relaxed text-fg-muted">{course.description}</p>
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        ) : (
          <EmptyState icon={<Users />} title={t('learn_community')} description={t('learn_no_community')} />
        )}
      </section>
    </div>
  );
}
