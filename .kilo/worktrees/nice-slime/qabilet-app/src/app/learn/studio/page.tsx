"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Upload, Video, Play, Plus, X, FileVideo, CheckCircle2, AlertCircle } from "lucide-react";
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
    <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500 relative pb-20">

      {/* Ambient Glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-64 pointer-events-none -z-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.15) 0%, transparent 70%)',
        }}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10 pt-2">
        <div>
          <Link href="/learn" className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--color-primary-light)] transition-colors mb-4 text-sm font-medium">
            <ArrowLeft size={16} /> Назад к обучению
          </Link>
          <h2 className="font-display text-4xl md:text-5xl font-black leading-tight flex items-center gap-4">
            Авторская студия
          </h2>
          <p className="text-[var(--text-secondary)] mt-2">Загружайте и управляйте своими видеокурсами</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-6 py-3.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-white rounded-xl font-bold text-sm transition-all shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:shadow-[0_0_30px_rgba(124,58,237,0.6)] hover:-translate-y-1 active:scale-95 shrink-0"
        >
          <Upload size={18} />
          Загрузить курс
        </button>
      </div>

      {/* Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
        {courses.map((course) => (
          <div
            key={course.id}
            className="group relative overflow-hidden rounded-3xl transition-all duration-300 hover:-translate-y-2"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            {/* Thumbnail Area */}
            <div className="w-full aspect-video relative overflow-hidden bg-[var(--surface)]">
              <div className="absolute inset-0 bg-gradient-to-t from-[#04020E] via-transparent to-transparent z-10 opacity-80" />
              
              {course.videoUrl ? (
                getYoutubeId(course.videoUrl) ? (
                  <img 
                    src={`https://img.youtube.com/vi/${getYoutubeId(course.videoUrl)}/mqdefault.jpg`}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-80"
                  />
                ) : (
                  <video 
                    src={course.videoUrl} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-80"
                    muted
                    playsInline
                    preload="metadata"
                  />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[var(--bg-card2)]">
                   <Video size={48} className="text-[var(--text-muted)] opacity-20" />
                </div>
              )}
              
              <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button className="w-14 h-14 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white shadow-[0_0_30px_rgba(124,58,237,0.5)] transform scale-75 group-hover:scale-100 transition-all duration-300">
                  <Play size={24} className="ml-1" />
                </button>
              </div>

              <div className="absolute top-4 left-4 z-20">
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${course.status === 'published'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                  {course.status === 'published' ? 'Опубликован' : 'В обработке'}
                </span>
              </div>
            </div>

            {/* Content Area */}
            <div className="p-6 relative z-20 flex justify-between items-start">
              <div className="flex-1">
                <div className="text-xs text-[var(--text-muted)] mb-2 font-medium">{course.date}</div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2 line-clamp-1">{course.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] line-clamp-2">{course.description}</p>
              </div>
              
              {currentUserId && course.category?.includes(`#creator:${currentUserId}`) && (
                <button
                  onClick={(e) => { e.preventDefault(); handleDelete(course.id); }}
                  className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors ml-4"
                  title="Удалить курс"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Hover Glow */}
            <div className="absolute inset-0 border-2 border-[var(--color-primary)]/0 group-hover:border-[var(--color-primary)]/30 rounded-3xl pointer-events-none transition-colors duration-300" />
          </div>
        ))}

        {/* Upload Card Placeholder */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="group flex flex-col items-center justify-center h-full min-h-[300px] rounded-3xl transition-all duration-300 border-2 border-dashed border-[var(--border-color)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5"
        >
          <div className="w-16 h-16 rounded-full bg-[var(--surface)] border border-[var(--border-color)] flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-[var(--color-primary)] group-hover:border-[var(--color-primary)] transition-all duration-300 shadow-xl">
            <Plus size={32} className="text-[var(--text-muted)] group-hover:text-white transition-colors" />
          </div>
          <h3 className="font-bold text-lg text-[var(--text-primary)] mb-1">Создать курс</h3>
          <p className="text-sm text-[var(--text-muted)] text-center px-6">Загрузите новое видео для ваших учеников</p>
        </button>
      </div>

      {/* Upload Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => uploadState === 'idle' && setIsModalOpen(false)}
          />

          <div
            className="relative w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-300"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)] bg-[var(--bg-card)]/50">
              <h3 className="text-2xl font-black text-[var(--text-primary)] flex items-center gap-3">
                <Video className="text-[var(--color-primary)]" />
                Загрузка нового курса
              </h3>
              {uploadState === 'idle' && (
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 bg-[var(--surface)] hover:bg-[var(--bg-card2)] rounded-full transition-colors text-[var(--text-secondary)] hover:text-white"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-8 max-h-[70vh] overflow-y-auto">
              {uploadState === 'idle' ? (
                <form onSubmit={handleUpload} className="space-y-6">
                  {/* Upload Type Toggle */}
                  <div className="flex bg-[var(--surface)] p-1 rounded-xl border border-[var(--border-color)]">
                    <button
                      type="button"
                      onClick={() => setUploadType("file")}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${uploadType === "file" ? "bg-[var(--color-primary)] text-white shadow-lg" : "text-[var(--text-muted)] hover:text-white"}`}
                    >
                      Загрузить файл
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadType("url")}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${uploadType === "url" ? "bg-[var(--color-primary)] text-white shadow-lg" : "text-[var(--text-muted)] hover:text-white"}`}
                    >
                      Ссылка (YouTube/S3)
                    </button>
                  </div>

                  {uploadType === "file" ? (
                    /* Drag & Drop Zone */
                    <div
                      className="w-full h-48 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer relative overflow-hidden group"
                      style={{ borderColor: file ? 'var(--color-primary)' : 'var(--border-color)', background: file ? 'var(--color-primary)/5' : 'var(--surface)' }}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                      />

                      {file ? (
                        <div className="flex flex-col items-center text-center animate-in fade-in">
                          <FileVideo size={48} className="text-[var(--color-primary)] mb-3" />
                          <p className="font-bold text-[var(--text-primary)]">{file.name}</p>
                          <p className="text-xs text-[var(--text-muted)] mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB • Видео выбрано</p>
                          <div className="mt-4 px-4 py-1.5 rounded-full bg-[var(--bg-card2)] text-[10px] uppercase font-bold text-[var(--text-muted)] hover:text-white transition-colors">
                            Выбрать другой файл
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-center px-4">
                          <div className="w-16 h-16 rounded-full bg-[var(--bg-card2)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Upload size={24} className="text-[var(--text-muted)] group-hover:text-[var(--color-primary)] transition-colors" />
                          </div>
                          <p className="font-bold text-[var(--text-primary)] mb-1">Нажмите или перетащите видео сюда</p>
                          <p className="text-sm text-[var(--text-muted)]">Поддерживаются форматы MP4, MOV, AVI до 500MB</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Ссылка на видео</label>
                      <input
                        type="url"
                        required
                        value={videoUrlInput}
                        onChange={(e) => setVideoUrlInput(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full bg-[var(--surface)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all"
                      />
                      <p className="text-[10px] text-[var(--text-muted)] mt-2">Поддерживаются YouTube, Vimeo и прямые ссылки на видеофайлы</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Название курса</label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Например: Основы дактиля"
                        className="w-full bg-[var(--surface)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Описание</label>
                      <textarea
                        required
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Кратко опишите, о чем этот курс..."
                        rows={3}
                        className="w-full bg-[var(--surface)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Для кого это видео</label>
                      <select
                        required
                        value={targetAudience}
                        onChange={(e) => setTargetAudience(e.target.value)}
                        className="w-full bg-[var(--surface)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all appearance-none"
                      >
                        <option value="Для глухих">Для глухих</option>
                        <option value="Для слабослышащих">Для слабослышащих</option>
                        <option value="Для сурдопереводчиков">Для сурдопереводчиков</option>
                        <option value="Для всех">Для всех</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={(!file && !videoUrlInput) || !title || uploadState !== 'idle'}
                    className="w-full py-4 rounded-xl font-bold text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: ((!file && !videoUrlInput) || !title) ? 'var(--surface)' : 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
                      boxShadow: ((!file && !videoUrlInput) || !title) ? 'none' : '0 10px 30px rgba(124,58,237,0.4)'
                    }}
                  >
                    Опубликовать курс
                  </button>
                </form>
              ) : (
                /* Uploading / Success State */
                <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in duration-500">
                  {uploadState === 'uploading' ? (
                    <>
                      <div className="relative w-24 h-24 mb-8">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="45" fill="none" stroke="var(--surface)" strokeWidth="8" />
                          <circle
                            cx="50" cy="50" r="45"
                            fill="none"
                            stroke="url(#gradient)"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray="283"
                            strokeDashoffset={283 - (progress / 100) * 283}
                            className="transition-all duration-300 ease-out"
                          />
                          <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#7C3AED" />
                              <stop offset="100%" stopColor="#06B6D4" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xl font-black text-[var(--text-primary)]">{progress}%</span>
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Загрузка видео...</h3>
                      <p className="text-[var(--text-muted)]">Пожалуйста, не закрывайте это окно</p>
                    </>
                  ) : (
                    <>
                      <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-8 animate-in zoom-in spin-in-12 duration-500">
                        <CheckCircle2 size={48} className="text-emerald-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">Успешно опубликовано!</h3>
                      <p className="text-[var(--text-muted)]">Ваш курс теперь доступен для учеников.</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
