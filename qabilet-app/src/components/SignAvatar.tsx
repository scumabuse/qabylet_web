"use client";

import React, { useState, useEffect, useRef } from "react";
import { Video, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface SignAvatarProps {
  currentWord: string | null;
  language?: 'ru' | 'kk';
  className?: string;
  /** Cover the area with a spinner while the video is looked up. Turn off
   *  when something is already shown underneath. */
  showLoading?: boolean;
}

export default function SignAvatar({ currentWord, language = 'ru', className = "", showLoading = true }: SignAvatarProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!currentWord) {
      setIsVisible(false);
      return;
    }

    const fetchGesture = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('gestures_library')
        .select('video_url')
        .eq('word', currentWord.toLowerCase())
        .eq('language', language)
        .single();

      if (data && data.video_url) {
        setVideoUrl(data.video_url);
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
      setLoading(false);
    };

    fetchGesture();
  }, [currentWord, language]);

  if (loading ? !showLoading : !isVisible) return null;

  return (
    <div className={cn("relative aspect-video overflow-hidden rounded-lg border border-border bg-black", className)}>
      {loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60" role="status">
          <Loader2 className="animate-spin text-white/70" size={22} aria-hidden />
          <span className="sr-only">Загрузка видео жеста</span>
        </div>
      ) : (
        <video
          ref={videoRef}
          src={videoUrl || ""}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/75 to-transparent px-3 pb-2.5 pt-6">
        <Video size={13} className="text-white/70" aria-hidden />
        <span className="truncate text-xs font-medium text-white">
          Демонстрация: {currentWord}
        </span>
      </div>
    </div>
  );
}
