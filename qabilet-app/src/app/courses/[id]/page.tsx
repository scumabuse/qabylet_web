"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { PlayCircle, ChevronRight, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { Alert, EmptyState, Skeleton } from "@/components/ui/feedback";
import { Stagger, StaggerItem } from "@/components/motion/primitives";
import { getLessons } from "@/app/actions";

interface Lesson {
  id: string;
  course_id: string;
  title: string;
  content: string;
  video_url: string;
  order_index: number;
}

export default function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLessons = async () => {
      setLoading(true);
      try {
        const result = await getLessons(id);
        if (result.error) throw new Error(result.error);
        if (result.data) setLessons(result.data);
      } catch (err: any) {
        console.error(err);
        setError("Не удалось загрузить уроки. " + (err.message || ""));
      } finally {
        setLoading(false);
      }
    };
    fetchLessons();
  }, [id]);

  return (
    <div className="max-w-3xl space-y-10">
      <PageHeader
        back={{ href: "/learn", label: "Назад к обучению" }}
        title="Уроки курса"
        description="Изучайте материалы последовательно. Вы всегда можете вернуться к предыдущим урокам."
      />

      <section className="space-y-4">
        <SectionHeader
          title={
            <span className="inline-flex items-center gap-2">
              Программа
              {!loading && !error && lessons.length > 0 && (
                <Badge variant="neutral" className="h-5 px-1.5 font-mono tabular-nums">{lessons.length}</Badge>
              )}
            </span>
          }
        />

        {loading ? (
          <div className="overflow-hidden rounded-xl border border-border bg-surface" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 border-b border-border p-5 last:border-b-0">
                <Skeleton className="size-8 shrink-0 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/5" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <Alert tone="error">{error}</Alert>
        ) : lessons.length === 0 ? (
          <EmptyState icon={<Inbox />} title="В этом курсе пока нет уроков" />
        ) : (
          <Stagger className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
            {lessons.map((lesson, idx) => (
              <StaggerItem key={lesson.id} className="border-b border-border last:border-b-0">
                <Link
                  href={`/courses/${id}/${lesson.id}`}
                  className="group flex items-start gap-4 p-5 transition-colors hover:bg-subtle"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted font-mono text-[0.8125rem] tabular-nums text-fg-muted transition-colors group-hover:border-accent-border group-hover:bg-accent-soft group-hover:text-accent-text">
                    {lesson.order_index || idx + 1}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <h3 className="text-[0.9375rem] font-semibold tracking-[-0.01em] text-fg">{lesson.title}</h3>
                    {lesson.content && (
                      <p className="line-clamp-2 text-sm leading-relaxed text-fg-muted">{lesson.content}</p>
                    )}
                    {lesson.video_url && (
                      <span className="inline-flex items-center gap-1.5 pt-1 text-xs font-medium text-fg-muted">
                        <PlayCircle size={14} className="text-fg-subtle" />
                        Смотреть видеоурок
                      </span>
                    )}
                  </div>
                  <ChevronRight
                    size={16}
                    className="mt-2 shrink-0 text-fg-subtle transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-fg-muted"
                  />
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </section>
    </div>
  );
}
