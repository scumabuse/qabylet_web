"use client";

import React, { useState, useEffect, useRef } from "react";
import { Video, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface SignAvatarProps {
  currentWord: string | null;
  language?: 'ru' | 'kk';
  className?: string;
}

export default function SignAvatar({ currentWord, language = 'ru', className = "" }: SignAvatarProps) {
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

  if (!isVisible && !loading) return null;

  return (
    <div className={`relative overflow-hidden rounded-2xl border-4 border-[var(--color-primary)] shadow-2xl bg-black aspect-video transition-all duration-500 animate-in fade-in zoom-in ${className}`}>
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
          <Loader2 className="animate-spin text-white" size={32} />
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
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex items-center gap-2">
        <Video size={14} className="text-[var(--color-primary-light)]" />
        <span className="text-[10px] text-white font-bold uppercase tracking-widest">
          Демонстрация: {currentWord}
        </span>
      </div>
    </div>
  );
}
