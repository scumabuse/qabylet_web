"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Play, Circle } from "lucide-react";
import { getLessons, completeLesson, checkLessonProgress, removeLessonProgress } from "@/app/actions";
import { useAccessibility } from "@/components/AccessibilityProvider";
import { supabase } from "@/lib/supabase";

export default function LessonPage({ params }: { params: Promise<{ id: string, lessonId: string }> }) {
  const { id, lessonId } = use(params);

  const [lessons, setLessons] = useState<any[]>([]);
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const { ttsEnabled } = useAccessibility();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user.id;

        const result = await getLessons(id);
        if (result.data) {
          setLessons(result.data);
          const lesson = result.data.find((l: any) => l.id === lessonId);
          setCurrentLesson(lesson);
        }

          if (userId) {
          const res = await checkLessonProgress(userId, lessonId);
          if (res.data) {
             // For completed lessons, only consider it 'added' if it's not hidden
             const hidden = JSON.parse(localStorage.getItem('hidden_courses') || '[]');
             const isHidden = hidden.includes(id);
             
             setIsAdded(!isHidden);
             if (res.data.is_completed) setIsCompleted(true);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, lessonId]);

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await completeLesson(session.user.id, lessonId, true);
      if (res.success) setIsCompleted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setCompleting(false);
    }
  };

  const handleAddToMyCourses = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCompleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await completeLesson(session.user.id, lessonId, false);
      
      // Clear hidden state if any
      const hidden = JSON.parse(localStorage.getItem('hidden_courses') || '[]');
      const newHidden = hidden.filter((h: string) => h !== id);
      localStorage.setItem('hidden_courses', JSON.stringify(newHidden));
      
      setIsAdded(true);
      alert("Курс добавлен в раздел 'Мои курсы'!");
    } catch (err) {
      console.error(err);
    } finally {
      setCompleting(false);
    }
  };

  const handleRemoveFromMyCourses = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isCompleted) {
      // If completed, we just hide it from the dashboard using localStorage
      const hidden = JSON.parse(localStorage.getItem('hidden_courses') || '[]');
      if (!hidden.includes(id)) {
        hidden.push(id);
        localStorage.setItem('hidden_courses', JSON.stringify(hidden));
      }
      setIsAdded(false);
      alert("Курс скрыт из раздела 'Мои курсы'. Прогресс сохранен.");
      return;
    }

    setCompleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await removeLessonProgress(session.user.id, lessonId);
      setIsAdded(false);
      setIsCompleted(false);
      alert("Курс удален из раздела 'Мои курсы'");
    } catch (err) {
      console.error(err);
    } finally {
      setCompleting(false);
    }
  };

  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const getEmbedUrl = (url: string) => {
    const videoId = getYoutubeId(url);
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  };

  const isDirectVideo = (url: string) => {
    if (!url) return false;
    return url.match(/\.(mp4|webm|ogg|mov|avi)$/i) || url.includes('supabase.co/storage');
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div
        className="w-12 h-12 rounded-full border-2 animate-spin"
        style={{
          borderColor: 'rgba(124,58,237,0.15)',
          borderTopColor: 'var(--color-primary)',
        }}
      />
    </div>
  );

  if (!currentLesson) return (
    <div className="text-center py-16">
      <div className="text-5xl mb-4">🔍</div>
      <h2 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">Урок не найден</h2>
      <Link
        href={`/courses/${id}`}
        className="btn-primary inline-flex"
      >
        Вернуться к курсу
      </Link>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-7 animate-in slide-in-from-bottom-4 duration-500">

      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href={isAdded ? `/courses/${id}` : "/learn"}
          className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--color-primary-light)] transition-colors font-semibold text-sm group"
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 group-hover:bg-[rgba(124,58,237,0.15)]"
            style={{ border: '1px solid var(--border-color)' }}
          >
            <ArrowLeft size={14} />
          </div>
          {isAdded ? "Назад к списку уроков" : "Назад к обучению"}
        </Link>

        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Онлайн обучение</span>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">

        {/* Content column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Video player */}
          <div
            className="relative aspect-video rounded-3xl overflow-hidden"
            style={{
              background: '#000',
              border: '1px solid var(--border-color)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.1)',
            }}
          >
            {currentLesson.video_url ? (
              isDirectVideo(currentLesson.video_url) ? (
                <video 
                  src={currentLesson.video_url}
                  className="w-full h-full object-contain bg-black"
                  controls
                  controlsList="nodownload"
                  playsInline
                />
              ) : (
                <iframe
                  src={getEmbedUrl(currentLesson.video_url) || ""}
                  className="w-full h-full"
                  allowFullScreen
                />
              )
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)' }}
                >
                  <Play size={32} className="text-[var(--color-primary-light)] ml-1" />
                </div>
                <p className="text-[var(--text-muted)] text-sm">Видеоматериал отсутствует</p>
              </div>
            )}
          </div>

          {/* Lesson text card */}
          <div
            className="relative overflow-hidden rounded-3xl p-8"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            {/* Top highlight line */}
            <div
              className="absolute top-0 left-0 right-0 h-px pointer-events-none"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(167,139,250,0.35), transparent)' }}
            />

            <h1 className="font-display text-3xl font-bold mb-6 text-[var(--text-primary)]">
              {currentLesson.title}
            </h1>

            <div className="space-y-4 text-[var(--text-secondary)] leading-relaxed">
              {currentLesson.content.split('\n').map((para: string, i: number) => (
                para.trim() ? <p key={i}>{para}</p> : <br key={i} />
              ))}
            </div>

            {/* Footer: status + complete button */}
            <div
              className="mt-10 pt-6 flex flex-wrap gap-4 items-center justify-between"
              style={{ borderTop: '1px solid var(--border-color)' }}
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider">Статус:</span>
                  {isCompleted ? (
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                      style={{
                        background: 'rgba(52,211,153,0.1)',
                        border: '1px solid rgba(52,211,153,0.25)',
                        color: '#34D399',
                      }}
                    >
                      <CheckCircle size={13} />
                      ЗАВЕРШЕНО
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                      style={{
                        background: 'var(--bg-card2)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <Circle size={13} />
                      В ПРОЦЕССЕ
                    </span>
                  )}
                </div>

                {currentLesson.course_id && (
                  isAdded ? (
                    <button
                      onClick={handleRemoveFromMyCourses}
                      disabled={completing}
                      className="text-xs font-bold text-red-400 hover:underline disabled:opacity-50"
                    >
                      - Удалить из "Мои курсы"
                    </button>
                  ) : (
                    <button
                      onClick={handleAddToMyCourses}
                      disabled={completing}
                      className="text-xs font-bold text-[var(--color-primary-light)] hover:underline disabled:opacity-50"
                    >
                      + Добавить в "Мои курсы"
                    </button>
                  )
                )}
              </div>

              <button
                onClick={handleComplete}
                disabled={isCompleted || completing}
                className="btn-primary"
                style={isCompleted ? {
                  background: 'rgba(52,211,153,0.1)',
                  border: '1px solid rgba(52,211,153,0.25)',
                  color: '#34D399',
                  boxShadow: 'none',
                  cursor: 'default',
                } : completing ? { opacity: 0.6, cursor: 'wait' } : {}}
              >
                {isCompleted
                  ? <><CheckCircle size={18} /> Урок завершён</>
                  : completing
                    ? "Сохранение..."
                    : <><CheckCircle size={18} /> Завершить урок</>
                }
              </button>
            </div>
          </div>
        </div>

        {/* Playlist sidebar */}
        <div>
          <div
            className="sticky top-6 rounded-3xl overflow-hidden"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            {/* Sidebar header */}
            <div
              className="flex items-center gap-3 px-5 py-4"
              style={{ borderBottom: '1px solid var(--border-color)' }}
            >
              <div
                className="w-1.5 h-5 rounded-full"
                style={{ background: 'linear-gradient(180deg, var(--color-primary-light), var(--color-primary))' }}
              />
              <h3 className="font-display font-bold text-base">Содержание курса</h3>
            </div>

            <div className="p-3 space-y-1 max-h-[60vh] overflow-y-auto">
              {lessons.map((lesson, idx) => {
                const isCurrent = lesson.id === lessonId;
                return (
                  <Link
                    key={lesson.id}
                    href={`/courses/${id}/${lesson.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group"
                    style={{
                      background: isCurrent ? 'rgba(124,58,237,0.12)' : 'transparent',
                      border: `1px solid ${isCurrent ? 'rgba(124,58,237,0.3)' : 'transparent'}`,
                    }}
                    onMouseEnter={e => {
                      if (!isCurrent) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                    }}
                    onMouseLeave={e => {
                      if (!isCurrent) (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-all duration-200"
                      style={isCurrent ? {
                        background: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
                        color: 'white',
                        boxShadow: '0 2px 8px rgba(124,58,237,0.4)',
                      } : {
                        background: 'var(--bg-card2)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {lesson.order_index || idx + 1}
                    </div>
                    <span
                      className="flex-1 text-sm font-semibold truncate transition-colors duration-200"
                      style={{ color: isCurrent ? 'var(--color-primary-light)' : 'var(--text-secondary)' }}
                    >
                      {lesson.title}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
