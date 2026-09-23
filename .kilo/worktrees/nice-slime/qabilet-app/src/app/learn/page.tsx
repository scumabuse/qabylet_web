"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  MessageCircle,
  ChevronRight,
  History,
  TrendingUp,
  Award,
  Sparkles,
  Video,
} from "lucide-react";
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-5">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{
            background: 'rgba(124,58,237,0.1)',
            border: '2px solid rgba(124,58,237,0.2)',
            animation: 'spin 1s linear infinite',
          }}
        >
          <Sparkles size={22} className="text-[var(--color-primary-light)]" />
        </div>
        <p className="text-[var(--text-secondary)] font-medium">Загружаем ваш прогресс...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500 relative">

      {/* Ambient glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-64 pointer-events-none -z-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.1) 0%, transparent 70%)',
        }}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10 pt-2">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-bold mb-2">
            {t('learn_dashboard')}
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-black leading-tight">
            {t('learn_title')}
          </h2>
          <p className="text-[var(--text-secondary)] mt-2">{t('learn_subtitle')}</p>
        </div>

        {/* Level Badge */}
        <div
          className="flex items-center gap-3 p-4 rounded-2xl shrink-0"
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.06))',
            border: '1px solid rgba(245,158,11,0.25)',
            boxShadow: '0 4px 20px rgba(245,158,11,0.1)',
          }}
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{
              background: 'rgba(245,158,11,0.2)',
              boxShadow: '0 0 16px rgba(245,158,11,0.3)',
            }}
          >
            <Award size={22} className="text-amber-400" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-amber-500/70 uppercase tracking-widest">{t('learn_level')}</div>
            <div className="text-base font-bold text-amber-300">{t('learn_beginner')}</div>
          </div>
        </div>
      </div>

      {/* Stats Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative z-10">

        {/* Activity Widget */}
        <div
          className="relative overflow-hidden rounded-3xl p-6 group"
          style={{
            background: 'linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)',
            boxShadow: '0 8px 32px rgba(124,58,237,0.4), 0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          {/* Subtle inner highlight */}
          <div
            className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)' }}
          />
          <div
            className="absolute -right-6 -bottom-6 opacity-15 group-hover:scale-110 transition-transform duration-700"
          >
            <MessageCircle size={110} color="white" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-white/70 font-semibold text-xs uppercase tracking-widest mb-3">
              <TrendingUp size={14} />
              {t('learn_ai_activity')}
            </div>
            <div className="text-5xl font-black text-white mb-1">{activityCount}</div>
            <p className="text-white/60 text-xs font-medium">{t('learn_msgs_today')}</p>
          </div>
        </div>

        {/* Last Lesson Widget — spans 2 cols */}
        <div
          className="md:col-span-2 relative overflow-hidden rounded-3xl p-6 flex flex-col justify-between group transition-all duration-300"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-card)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.4)';
            (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card-hover)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color)';
            (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)';
          }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-px pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(167,139,250,0.3), transparent)' }}
          />
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: 'rgba(124,58,237,0.12)',
                border: '1px solid rgba(124,58,237,0.2)',
              }}
            >
              <History size={18} className="text-[var(--color-primary-light)]" />
            </div>
            <h3 className="font-bold text-base text-[var(--text-primary)]">{t('learn_last_lesson')}</h3>
          </div>

          {lastLesson ? (
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-xl mb-1 text-[var(--text-primary)]">
                  {lastLesson.lessons.title}
                </h4>
                <p className="text-sm text-[var(--text-muted)]">{t('learn_click_continue')}</p>
              </div>
              <Link
                href={`/courses/${lastLesson.lessons.course_id}/${lastLesson.lesson_id}`}
                className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 hover:scale-110 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
                  boxShadow: '0 4px 20px rgba(124,58,237,0.5)',
                }}
              >
                <ChevronRight size={22} color="white" />
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎯</span>
              <p className="text-[var(--text-muted)] text-sm">
                {t('learn_not_started').split('. ')[0]}.{" "}
                <span className="text-[var(--color-primary-light)] font-semibold">{t('learn_not_started').split('. ').slice(1).join('. ')}</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* My Courses */}
      <div className="relative z-10 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="section-title-line">
            <BookOpen size={20} className="text-[var(--color-primary-light)]" />
            <h3 className="font-display text-2xl font-bold">{t('learn_my_courses')}</h3>
          </div>
          <Link
            href="/learn/studio"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-white rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-[var(--color-primary)]/40 hover:-translate-y-1 active:scale-95 shrink-0"
          >
            <Video size={18} />
            {t('learn_studio')}
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {courses.length > 0 ? (
            courses.map((course) => (
              <Link
                href={`/courses/${course.id}`}
                key={course.id}
                className="group relative overflow-hidden rounded-3xl transition-all duration-300 hover:-translate-y-2 block"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                {/* Thumbnail Area */}
                <div className="w-full aspect-video relative overflow-hidden bg-[var(--surface)]">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#04020E] via-transparent to-transparent z-10 opacity-80" />
                  
                  {(() => {
                    const videoUrl = course.lessons?.[0]?.video_url;
                    const youtubeId = getYoutubeId(videoUrl);

                    if (youtubeId) {
                      return (
                        <img 
                          src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-80"
                        />
                      );
                    }
                    
                    if (videoUrl) {
                      return (
                        <video 
                          src={videoUrl} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-80"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      );
                    }

                    return (
                      <div className="w-full h-full flex items-center justify-center bg-[var(--bg-card2)]">
                         <Video size={48} className="text-[var(--text-muted)] opacity-20" />
                      </div>
                    );
                  })()}

                  {/* Progress Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-2 text-white/90">
                      <span>{t('learn_progress')}</span>
                      <span>{course.progress}%</span>
                    </div>
                    <div className="progress-bar-track bg-white/20 h-1.5 backdrop-blur-sm">
                      <div
                        className="progress-bar-fill shadow-[0_0_10px_rgba(124,58,237,0.5)]"
                        style={{ width: mounted ? `${course.progress}%` : "0%" }}
                      />
                    </div>
                  </div>

                  <div className="absolute top-4 left-4 z-20">
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-[var(--color-primary)]/20 text-[var(--color-primary-light)] border border-[var(--color-primary)]/30 backdrop-blur-md">
                      {course.category?.split(' #')[0]?.replace('Авторский: ', '') || 'Курс'}
                    </span>
                  </div>
                </div>

                {/* Content Area */}
                <div className="p-6 relative z-20">
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mb-1 line-clamp-1 group-hover:text-[var(--color-primary-light)] transition-colors">{course.title}</h3>
                  <p className="text-xs text-[var(--text-muted)]">{course.completed}/{course.total} {t('learn_lessons_done')}</p>
                </div>
              </Link>
            ))
          ) : (
            <div
              className="col-span-full p-12 rounded-3xl text-center space-y-4"
              style={{
                background: 'var(--bg-card)',
                border: '1px dashed var(--border-color)',
              }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-3xl"
                style={{ background: 'var(--bg-card2)' }}
              >
                📭
              </div>
              <h4 className="font-bold text-xl text-[var(--text-secondary)]">
                {t('learn_no_active')}
              </h4>
              <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto leading-relaxed">
                {t('learn_no_active_desc')}
              </p>
              <Link
                href="/"
                className="btn-primary inline-flex mt-4"
              >
                {t('learn_find_course')}
                <ChevronRight size={18} />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Community Courses */}
      <div className="relative z-10 space-y-5 pt-10">
        <div className="section-title-line">
          <Sparkles size={20} className="text-[var(--color-primary-light)]" />
          <h3 className="font-display text-2xl font-bold">{t('learn_community')}</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {communityCourses.length > 0 ? (
            communityCourses.map((course) => (
              <Link
                key={course.id}
                href={course.lessons?.[0]?.id ? `/courses/${course.id}/${course.lessons[0].id}` : `/courses/${course.id}`}
                className="group relative overflow-hidden rounded-3xl transition-all duration-300 hover:-translate-y-2 block"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                {/* Thumbnail Area */}
                <div className="w-full aspect-video relative overflow-hidden bg-[var(--surface)]">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#04020E] via-transparent to-transparent z-10 opacity-80" />
                  
                  {(() => {
                    const videoUrl = course.lessons?.[0]?.video_url;
                    const youtubeId = getYoutubeId(videoUrl);

                    if (youtubeId) {
                      return (
                        <img 
                          src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-80"
                        />
                      );
                    }
                    
                    if (videoUrl) {
                      return (
                        <video 
                          src={videoUrl} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-80"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      );
                    }

                    return (
                      <div className="w-full h-full flex items-center justify-center bg-[var(--bg-card2)]">
                         <Video size={48} className="text-[var(--text-muted)] opacity-20" />
                      </div>
                    );
                  })()}

                  <div className="absolute top-4 left-4 z-20">
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-[var(--color-primary)]/20 text-[var(--color-primary-light)] border border-[var(--color-primary)]/30 backdrop-blur-md">
                      {course.category.split(' #')[0].replace('Авторский: ', '')}
                    </span>
                  </div>
                </div>

                {/* Content Area */}
                <div className="p-6 relative z-20">
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2 line-clamp-1 group-hover:text-[var(--color-primary-light)] transition-colors">{course.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2">{course.description}</p>
                </div>
              </Link>
            ))
          ) : (
            <div className="col-span-full p-8 text-center text-[var(--text-muted)] bg-[var(--surface)] rounded-3xl border border-dashed border-[var(--border-color)]">
              {t('learn_no_community')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
