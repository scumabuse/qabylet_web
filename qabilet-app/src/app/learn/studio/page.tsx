"use client";

import React, { useState, useRef } from "react";
import { Upload, Video, Play, Plus, FileVideo, CheckCircle2, Trash2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { interactiveCard } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Segmented } from "@/components/ui/segmented";
import { PageHeader } from "@/components/ui/page-header";
import { Stagger, StaggerItem } from "@/components/motion/primitives";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { publishUserCourse, getCommunityCourses, uploadCourseVideo } from "@/app/actions";

interface CourseUpload {
  id: string;
  title: string;
  description: string;
  status: "processing" | "published";
  date: string;
  thumbnail: string;
  videoUrl?: string;
  category?: string;
}

export default function CreatorStudioPage() {
  const [courses, setCourses] = useState<CourseUpload[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "success">("idle");
  const [progress, setProgress] = useState(0);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("Для глухих");
  const [uploadType, setUploadType] = useState<"file" | "url">("file");
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const fetchCourses = async () => {
      const res = await getCommunityCourses();
      if (res.data) {
        const formatted = res.data.map((c: any) => ({
          id: c.id,
          title: c.title,
          description: c.description,
          status: "published" as const,
          date: new Date(c.created_at).toLocaleDateString('ru-RU'),
          thumbnail: c.image_url || "/images/bg-abstract.jpg",
          videoUrl: c.lessons?.[0]?.video_url,
          category: c.category
        }));
        setCourses(formatted);
      }
    };
    fetchCourses();
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || (!file && !videoUrlInput) || !targetAudience) return;

    setUploadState("uploading");
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress(p => p >= 90 ? 90 : p + 5);
    }, 500);

    try {
      let finalVideoUrl = videoUrlInput;

      if (uploadType === "file" && file) {
        const formData = new FormData();
        formData.append('file', file);

        const uploadResult = await uploadCourseVideo(formData);
        if (uploadResult.error) throw new Error(uploadResult.error);
        if (!uploadResult.url) throw new Error("Сервер не вернул ссылку на видео");
        finalVideoUrl = uploadResult.url;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user.id || "anonymous";

      const result = await publishUserCourse(title, description, targetAudience, finalVideoUrl, userId);
      if (result.error) throw new Error(result.error);

      clearInterval(progressInterval);
      setProgress(100);
      setUploadState("success");

      const newCourse = {
        id: result.course?.id || Math.random().toString(),
        title,
        description,
        status: "published" as const,
        date: new Date().toLocaleDateString('ru-RU'),
        thumbnail: "/images/bg-abstract.jpg",
        category: `Авторский: ${targetAudience} #creator:${userId}`,
        videoUrl: finalVideoUrl
      };

      setCourses(prev => [newCourse as any, ...prev]);

      setTimeout(() => {
        setIsModalOpen(false);
        setUploadState("idle");
        setTitle("");
        setDescription("");
        setFile(null);
        setProgress(0);
      }, 2000);

    } catch (err: any) {
      console.error("Upload failed", err);
      clearInterval(progressInterval);
      alert(`Ошибка загрузки: ${err.message}`);
      setUploadState("idle");
    }
  };

  const handleDelete = async (courseId: string) => {
    if (!confirm("Вы уверены, что хотите удалить этот курс?")) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await (await import("@/app/actions")).deleteCourse(courseId, session.user.id);
      if (res.error) throw new Error(res.error);

      setCourses(prev => prev.filter(c => c.id !== courseId));
      alert("Курс успешно удален");
    } catch (err: any) {
      alert(`Ошибка удаления: ${err.message}`);
    }
  };

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user.id || null);
    });
  }, []);

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url?.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  return (
    <div className="space-y-10">
      <PageHeader
        back={{ href: "/learn", label: "Назад к обучению" }}
        title="Авторская студия"
        description="Загружайте и управляйте своими видеокурсами"
        actions={
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            <Upload size={16} />
            Загрузить курс
          </Button>
        }
      />

      {/* Course grid */}
      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <StaggerItem key={course.id}>
            <div
              className={cn(
                "group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xs",
                interactiveCard
              )}
            >
              <div className="relative aspect-video overflow-hidden border-b border-border bg-muted">
                {course.videoUrl ? (
                  getYoutubeId(course.videoUrl) ? (
                    <img
                      src={`https://img.youtube.com/vi/${getYoutubeId(course.videoUrl)}/mqdefault.jpg`}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                    />
                  ) : (
                    <video
                      src={course.videoUrl}
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  )
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Video size={28} strokeWidth={1.5} className="text-fg-subtle" />
                  </div>
                )}

                <span
                  aria-hidden
                  className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                >
                  <span className="flex size-11 items-center justify-center rounded-full bg-white/95 text-black shadow-md">
                    <Play size={18} className="ml-0.5" />
                  </span>
                </span>

                <Badge
                  variant={course.status === 'published' ? 'success' : 'warning'}
                  className="absolute left-3 top-3 bg-surface/95 shadow-xs"
                >
                  {course.status === 'published' ? 'Опубликован' : 'В обработке'}
                </Badge>
              </div>

              <div className="flex flex-1 items-start gap-3 p-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-mono text-[0.6875rem] tabular-nums text-fg-subtle">{course.date}</p>
                  <h3 className="line-clamp-1 text-[0.9375rem] font-semibold tracking-[-0.01em] text-fg">{course.title}</h3>
                  <p className="line-clamp-2 text-[0.8125rem] leading-relaxed text-fg-muted">{course.description}</p>
                </div>

                {currentUserId && course.category?.includes(`#creator:${currentUserId}`) && (
                  <Button
                    variant="danger-ghost"
                    size="icon-sm"
                    onClick={(e) => { e.preventDefault(); handleDelete(course.id); }}
                    title="Удалить курс"
                    aria-label="Удалить курс"
                    className="-mr-1 -mt-1"
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>
            </div>
          </StaggerItem>
        ))}

        {/* Create card */}
        <StaggerItem>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="group flex h-full min-h-[260px] w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border-strong px-6 text-center transition-colors duration-200 hover:border-accent-border hover:bg-accent-soft"
          >
            <span className="flex size-10 items-center justify-center rounded-lg border border-border bg-surface text-fg-muted shadow-xs transition-colors group-hover:text-accent-text">
              <Plus size={18} />
            </span>
            <span className="space-y-1">
              <span className="block text-sm font-semibold text-fg">Создать курс</span>
              <span className="block text-[0.8125rem] text-fg-muted">Загрузите новое видео для ваших учеников</span>
            </span>
          </button>
        </StaggerItem>
      </Stagger>

      {/* Upload dialog */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => { if (!open && uploadState === 'idle') setIsModalOpen(false); }}
        title="Загрузка нового курса"
        showClose={uploadState === 'idle'}
        className="sm:max-w-xl"
      >
        <div className="p-5">
          {uploadState === 'idle' ? (
            <form onSubmit={handleUpload} className="space-y-5">
              <Segmented<"file" | "url">
                id="upload-type"
                ariaLabel="Источник видео"
                fullWidth
                value={uploadType}
                items={[
                  { value: "file", label: "Загрузить файл", icon: <Upload />, onSelect: () => setUploadType("file") },
                  { value: "url", label: "Ссылка (YouTube/S3)", icon: <Link2 />, onSelect: () => setUploadType("url") },
                ]}
              />

              {uploadType === "file" ? (
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Выбрать видеофайл"
                  className={cn(
                    "group relative flex h-44 w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 text-center transition-colors",
                    file ? "border-accent-border bg-accent-soft" : "border-border-strong bg-muted/50 hover:border-accent-border hover:bg-accent-soft"
                  )}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                >
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />

                  {file ? (
                    <div className="flex flex-col items-center gap-1">
                      <FileVideo size={28} strokeWidth={1.5} className="mb-1 text-accent-text" />
                      <p className="max-w-full truncate text-sm font-medium text-fg">{file.name}</p>
                      <p className="font-mono text-xs text-fg-muted">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB • Видео выбрано
                      </p>
                      <p className="mt-2 text-xs font-medium text-accent-text">Выбрать другой файл</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <span className="mb-2 flex size-10 items-center justify-center rounded-lg border border-border bg-surface text-fg-muted shadow-xs transition-colors group-hover:text-accent-text">
                        <Upload size={18} />
                      </span>
                      <p className="text-sm font-medium text-fg">Нажмите или перетащите видео сюда</p>
                      <p className="text-xs text-fg-muted">Поддерживаются форматы MP4, MOV, AVI до 500MB</p>
                    </div>
                  )}
                </div>
              ) : (
                <Field
                  label="Ссылка на видео"
                  htmlFor="upload-url"
                  hint="Поддерживаются YouTube, Vimeo и прямые ссылки на видеофайлы"
                >
                  <Input
                    id="upload-url"
                    type="url"
                    required
                    value={videoUrlInput}
                    onChange={(e) => setVideoUrlInput(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </Field>
              )}

              <Field label="Название курса" htmlFor="upload-title">
                <Input
                  id="upload-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Например: Основы дактиля"
                />
              </Field>
              <Field label="Описание" htmlFor="upload-description">
                <Textarea
                  id="upload-description"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Кратко опишите, о чем этот курс..."
                  rows={3}
                />
              </Field>
              <Field label="Для кого это видео" htmlFor="upload-audience">
                <Select
                  id="upload-audience"
                  required
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                >
                  <option value="Для глухих">Для глухих</option>
                  <option value="Для слабослышащих">Для слабослышащих</option>
                  <option value="Для сурдопереводчиков">Для сурдопереводчиков</option>
                  <option value="Для всех">Для всех</option>
                </Select>
              </Field>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={(!file && !videoUrlInput) || !title || uploadState !== 'idle'}
                className="w-full"
              >
                Опубликовать курс
              </Button>
            </form>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center" role="status" aria-live="polite">
              {uploadState === 'uploading' ? (
                <>
                  <div className="relative mb-6 size-20">
                    <svg className="size-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
                      <circle cx="50" cy="50" r="45" fill="none" stroke="var(--surface-muted)" strokeWidth="6" />
                      <circle
                        cx="50" cy="50" r="45"
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray="283"
                        strokeDashoffset={283 - (progress / 100) * 283}
                        className="transition-all duration-300 ease-out"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center font-mono text-base font-medium tabular-nums text-fg">
                      {progress}%
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-fg">Загрузка видео...</h3>
                  <p className="mt-1 text-sm text-fg-muted">Пожалуйста, не закрывайте это окно</p>
                </>
              ) : (
                <>
                  <span className="mb-5 flex size-14 items-center justify-center rounded-full bg-success-soft text-success">
                    <CheckCircle2 size={28} />
                  </span>
                  <h3 className="text-base font-semibold text-fg">Успешно опубликовано!</h3>
                  <p className="mt-1 text-sm text-fg-muted">Ваш курс теперь доступен для учеников.</p>
                </>
              )}
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
}
