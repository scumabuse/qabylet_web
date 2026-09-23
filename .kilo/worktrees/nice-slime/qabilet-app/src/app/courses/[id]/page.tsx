"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft, PlayCircle, Lock, BookOpen } from "lucide-react";
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
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto relative">

      {/* Ambient glow */}
      <div
        className="absolute -top-16 right-0 w-80 h-64 pointer-events-none -z-0"
        style={{ background: 'radial-gradient(ellipse at 80% 20%, rgba(124,58,237,0.1) 0%, transparent 70%)' }}
      />

      {/* Back + Header card */}
      <div className="relative z-10">
        <Link
          href="/learn"
          className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--color-primary-light)] transition-colors mb-5 font-semibold text-sm group"
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 group-hover:bg-[rgba(124,58,237,0.15)]"
            style={{ border: '1px solid var(--border-color)' }}
          >
            <ArrowLeft size={14} />
          </div>
          Назад к обучению
        </Link>

        <div
          className="relative overflow-hidden rounded-3xl p-8"
          style={{
            background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-card2) 100%)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          {/* Decorative top line */}
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(167,139,250,0.4), transparent)' }}
          />

          {/* Watermark icon */}
          <div className="absolute -right-4 -bottom-4 opacity-[0.04] pointer-events-none">
            <BookOpen size={120} />
          </div>

          <div className="flex items-start gap-4 mb-6">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
              style={{
                background: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
                boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
              }}
            >
              📚
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold mb-1">Уроки курса</h1>
              <p className="text-[var(--text-secondary)] text-sm">
                Изучайте материалы последовательно. Вы всегда можете вернуться к предыдущим урокам.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="progress-bar-track" style={{ height: '8px' }}>
              <div className="progress-bar-fill" style={{ width: '25%' }} />
            </div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-[var(--text-muted)]">Прогресс курса</span>
              <span className="text-[var(--color-primary-light)]">25%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lessons list */}
      <div className="relative z-10 space-y-4">
        <div className="section-title-line mb-5">
          <h3 className="font-display text-2xl font-bold">Программа</h3>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="h-24 skeleton rounded-2xl" style={{ animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
        ) : error ? (
          <div
            className="p-6 rounded-2xl text-center"
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: 'rgb(252,165,165)',
            }}
          >
            <p className="font-semibold">{error}</p>
          </div>
        ) : lessons.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-muted)]">
            <span className="text-5xl block mb-4 opacity-50">📭</span>
            <p className="font-medium">В этом курсе пока нет уроков</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lessons.map((lesson, idx) => (
              <Link
                href={`/courses/${id}/${lesson.id}`}
                key={lesson.id}
                className="card-premium flex items-start gap-4 p-5 group"
              >
                {/* Order number badge */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-base shrink-0 transition-all duration-300 group-hover:scale-110"
                  style={{
                    background: 'rgba(124,58,237,0.12)',
                    border: '1px solid rgba(124,58,237,0.25)',
                    color: 'var(--color-primary-light)',
                    boxShadow: '0 0 0 0 rgba(124,58,237,0.3)',
                    transition: 'all 250ms cubic-bezier(0.4,0,0.2,1)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, #7C3AED, #A78BFA)';
                    (e.currentTarget as HTMLElement).style.color = 'white';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(124,58,237,0.5)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.12)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--color-primary-light)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '';
                  }}
                >
                  {lesson.order_index || idx + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-display font-bold text-base mb-1.5 group-hover:text-[var(--color-primary-light)] transition-colors duration-200">
                    {lesson.title}
                  </h4>
                  <p className="text-sm text-[var(--text-muted)] line-clamp-2 leading-relaxed mb-3">
                    {lesson.content}
                  </p>
                  {lesson.video_url && (
                    <div
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
                      style={{
                        background: 'rgba(124,58,237,0.1)',
                        border: '1px solid rgba(124,58,237,0.2)',
                        color: 'var(--color-primary-light)',
                      }}
                    >
                      <PlayCircle size={14} />
                      Смотреть видеоурок
                    </div>
                  )}
                </div>

                {/* Arrow indicator */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0"
                  style={{
                    background: 'rgba(124,58,237,0.15)',
                    color: 'var(--color-primary-light)',
                  }}
                >
                  <PlayCircle size={15} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
