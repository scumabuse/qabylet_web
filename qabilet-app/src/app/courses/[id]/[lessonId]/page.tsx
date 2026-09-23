"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { CheckCircle, Play, Circle, Plus, Minus, Loader2, SearchX } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { BackLink } from "@/components/ui/page-header";
import { EmptyState, Skeleton } from "@/components/ui/feedback";
import { FadeIn } from "@/components/motion/primitives";
import { cn } from "@/lib/utils";
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
    <div className="space-y-6" aria-busy="true">
      <span className="sr-only" role="status">Загрузка урока</span>
      <Skeleton className="h-4 w-40" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6">
          <Skeleton className="aspect-video rounded-xl" />
          <Skeleton className="h-8 w-2/3" />
          <div className="space-y-2.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );

  if (!currentLesson) return (
    <EmptyState
      icon={<SearchX />}
      title="Урок не найден"
      action={
        <Link href={`/courses/${id}`} className={buttonVariants({ variant: "primary", size: "sm" })}>
          Вернуться к курсу
        </Link>
      }
    />
  );

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackLink href={isAdded ? `/courses/${id}` : "/learn"}>
          {isAdded ? "Назад к списку уроков" : "Назад к обучению"}
        </BackLink>
        <Badge variant="outline">
          <StatusDot tone="success" />
          Онлайн обучение
        </Badge>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Content column */}
        <div className="min-w-0 space-y-8">
          <FadeIn className="relative aspect-video overflow-hidden rounded-xl border border-border bg-black shadow-sm">
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
                  title={currentLesson.title}
                  className="w-full h-full"
                  allowFullScreen
                />
              )
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-muted">
                <span className="flex size-12 items-center justify-center rounded-full border border-border bg-surface text-fg-muted">
                  <Play size={20} className="ml-0.5" />
                </span>
                <p className="text-sm text-fg-muted">Видеоматериал отсутствует</p>
              </div>
            )}
          </FadeIn>

          <article className="space-y-5">
            <h1 className="text-display text-fg">{currentLesson.title}</h1>
            <div className="max-w-prose space-y-4 text-[0.9375rem] leading-7 text-fg-muted">
              {currentLesson.content.split('\n').map((para: string, i: number) => (
                para.trim() ? <p key={i}>{para}</p> : <br key={i} />
              ))}
            </div>
          </article>

          {/* Status + actions */}
          <div className="flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              {isCompleted ? (
                <Badge variant="success">
                  <CheckCircle />
                  Завершено
                </Badge>
              ) : (
                <Badge variant="neutral">
                  <Circle />
                  В процессе
                </Badge>
              )}

              {currentLesson.course_id && (
                isAdded ? (
                  <Button
                    variant="danger-ghost"
                    size="sm"
                    onClick={handleRemoveFromMyCourses}
                    disabled={completing}
                  >
                    <Minus size={14} />
                    Удалить из «Мои курсы»
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAddToMyCourses}
                    disabled={completing}
                  >
                    <Plus size={14} />
                    Добавить в «Мои курсы»
                  </Button>
                )
              )}
            </div>

            <Button
              variant={isCompleted ? "secondary" : "primary"}
              size="lg"
              onClick={handleComplete}
              disabled={isCompleted || completing}
              className={isCompleted ? "text-success disabled:opacity-100" : undefined}
            >
              {isCompleted
                ? <><CheckCircle size={16} /> Урок завершён</>
                : completing
                  ? <><Loader2 size={16} className="animate-spin" /> Сохранение...</>
                  : <><CheckCircle size={16} /> Завершить урок</>
              }
            </Button>
          </div>
        </div>

        {/* Course outline */}
        <aside>
          <Card className="overflow-hidden lg:sticky lg:top-8">
            <CardHeader>
              <CardTitle>Содержание курса</CardTitle>
              <span className="font-mono text-xs tabular-nums text-fg-subtle">{lessons.length}</span>
            </CardHeader>
            <nav aria-label="Содержание курса" className="max-h-[60vh] space-y-0.5 overflow-y-auto p-2">
              {lessons.map((lesson, idx) => {
                const isCurrent = lesson.id === lessonId;
                return (
                  <Link
                    key={lesson.id}
                    href={`/courses/${id}/${lesson.id}`}
                    aria-current={isCurrent ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors",
                      isCurrent ? "bg-accent-soft" : "hover:bg-hover"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-md font-mono text-[0.6875rem] tabular-nums",
                        isCurrent ? "bg-accent text-accent-fg" : "border border-border bg-muted text-fg-subtle"
                      )}
                    >
                      {lesson.order_index || idx + 1}
                    </span>
                    <span className={cn("flex-1 truncate text-sm", isCurrent ? "font-medium text-fg" : "text-fg-muted")}>
                      {lesson.title}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </Card>
        </aside>
      </div>
    </div>
  );
}
