"use client";

import React, { useState, useRef, useEffect } from "react";
import { BrainCircuit, Mic, Volume2, X, RefreshCw, ArrowUp } from "lucide-react";
import { motion } from "motion/react";
import { LogoMark } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EASE } from "@/components/motion/primitives";
import { cn, stripEmoji } from "@/lib/utils";
import { speak } from "@/lib/speech";
import { AI_RESPONSES } from "@/lib/data";
import { logChatMessage, getChatHistory, getGesturesLibrary, seedGestures } from "@/app/actions";
import { supabase } from "@/lib/supabase";
import { useAccessibility } from "@/components/AccessibilityProvider";
import { useLanguage } from "@/components/LanguageProvider";
import SignAvatar from "@/components/SignAvatar";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  isTyping?: boolean;
}

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      text: "Привет! Я ваш интеллектуальный помощник Qabilet. Задайте любой вопрос — я помогу с обучением, объясню сложные темы или просто поддержу вас! 💙",
      isUser: false,
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [gestureLibrary, setGestureLibrary] = useState<any[]>([]);
  const [activeWord, setActiveWord] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { ttsEnabled } = useAccessibility();
  const { t } = useLanguage();

  useEffect(() => {
    const loadLibrary = async () => {
      const res = await getGesturesLibrary();
      if (res.data) setGestureLibrary(res.data);
    };
    loadLibrary();
  }, []);

  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && !lastMsg.isUser) {
      const text = lastMsg.text.toLowerCase();
      const match = gestureLibrary.find(g => text.includes(g.word.toLowerCase()));
      if (match) setActiveWord(match.word);
    }
  }, [messages, gestureLibrary]);

  const handleSeed = async () => {
    setIsSeeding(true);
    const res = await seedGestures();
    if (res.success) {
      const res2 = await getGesturesLibrary();
      if (res2.data) setGestureLibrary(res2.data);
    }
    setIsSeeding(false);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.lang = "ru-RU";
          recognition.continuous = false;
          recognition.interimResults = false;
          
          recognition.onstart = () => setIsListening(true);
          recognition.onend = () => setIsListening(false);
          
          recognition.onerror = (event: any) => {
            console.error("AI Voice Recognition Error:", event.error);
            setIsListening(false);
          };
          
          recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            handleSend(transcript);
          };
          
          recognitionRef.current = recognition;
        } catch (err) {
          console.error("Failed to init AI SpeechRecognition:", err);
        }
      }
    }
    return () => { if (synthRef.current) synthRef.current.cancel(); };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const cleanTextForSpeech = (text: string) =>
    text.replace(/[*_#~`>|]/g, '').replace(/ {2,}/g, ' ').trim();

  // `force` is for the explicit "read aloud" button, which works even when
  // automatic TTS is switched off. The speech service also checks the current
  // TTS setting, so answers sent from the voice-input callback respect it.
  const speakText = (text: string, force = false) => {
    if (!ttsEnabled && !force) return;
    speak(cleanTextForSpeech(text), { lang: "ru-RU", rate: 1.0, source: "assistant", force });
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) { recognitionRef.current.stop(); }
    else { recognitionRef.current.start(); }
  };

  useEffect(() => {
    const fetchHistory = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await getChatHistory(session.user.id);
      if (res.data && res.data.length > 0) {
        const historyMsgs = res.data.map((m: any) => ({
          id: m.id.toString(), text: m.content, isUser: m.role === 'user'
        }));
        setMessages(prev => {
          const existingIds = new Set(prev.map(msg => msg.id));
          const uniqueHistory = historyMsgs.filter((msg: any) => !existingIds.has(msg.id));
          return [...prev, ...uniqueHistory];
        });
      }
    };
    fetchHistory();
  }, []);

  const logToSupabase = async (content: string, role: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await logChatMessage(content, role, 'ai_tutor', session?.user.id);
      if (res.error) console.error("Server Action Failed:", res.error);
    } catch (err) { console.error("Failed to log chat:", err); }
  };

  const handleSend = async (text: string = input) => {
    if (!text.trim()) return;
    const newMsg: Message = { id: Date.now().toString(), text, isUser: true };
    setMessages(prev => [...prev, newMsg]);
    setInput("");
    setIsTyping(true);
    logToSupabase(text, 'user');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: messages })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      const aiResponse = data.text || "Извините, я не смог сгенерировать ответ.";
      setMessages(prev => [...prev, { id: Date.now().toString(), text: aiResponse, isUser: false }]);
      logToSupabase(aiResponse, 'assistant');
      speakText(aiResponse);
    } catch (err: any) {
      const errorMsg = `Ошибка ИИ: ${err.message || "Неизвестная ошибка"}. Попробуйте еще раз.`;
      setMessages(prev => [...prev, { id: Date.now().toString(), text: errorMsg, isUser: false }]);
      speakText(errorMsg);
    } finally {
      setIsTyping(false);
    }
  };

  const suggestions = [t('ai_sug1'), t('ai_sug2'), t('ai_sug3'), t('ai_sug4')];

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] min-h-[480px] flex-col gap-4 md:h-[calc(100dvh-5rem)]">

      {/* Sign avatar: appears when an answer contains a word from the gesture library */}
      <div className="group fixed bottom-40 right-4 z-30 w-52 md:right-8 md:w-64">
        <SignAvatar currentWord={activeWord} className="w-full shadow-lg" />
        {activeWord && (
          <Button
            variant="secondary"
            size="icon-sm"
            onClick={() => setActiveWord(null)}
            aria-label="Скрыть демонстрацию"
            className="absolute -right-2 -top-2 z-40 size-7 rounded-full opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          >
            <X size={13} />
          </Button>
        )}
      </div>

      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-fg shadow-xs">
            <BrainCircuit size={18} strokeWidth={1.75} />
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-[-0.015em] text-fg">{t('ai_title')}</h1>
            <p className="flex items-center gap-1.5 text-xs text-fg-muted">
              <StatusDot tone="success" />
              {t('ai_online')}
            </p>
          </div>
        </div>

        {gestureLibrary.length === 0 && (
          <Button size="sm" onClick={handleSeed} disabled={isSeeding} aria-label={isSeeding ? t('ai_syncing') : t('ai_sync')} className="shrink-0">
            <RefreshCw size={14} className={isSeeding ? "animate-spin" : ""} />
            <span className="hidden sm:inline">{isSeeding ? t('ai_syncing') : t('ai_sync')}</span>
          </Button>
        )}
      </div>

      {/* Conversation */}
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8" aria-live="polite">
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: EASE }}
                className={cn("group flex gap-3", msg.isUser && "justify-end")}
              >
                {msg.isUser ? (
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md border border-border bg-muted px-4 py-2.5 text-[0.9375rem] leading-relaxed text-fg">
                    {msg.text}
                  </div>
                ) : (
                  <>
                    <LogoMark size={28} className="mt-0.5" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-fg">
                        {msg.id === "welcome" ? stripEmoji(msg.text) : msg.text}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => speakText(msg.text, true)}
                        title="Озвучить"
                        className="-ml-2 h-7 px-2 text-xs opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        <Volume2 size={13} />
                        Озвучить
                      </Button>
                    </div>
                  </>
                )}
              </motion.div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex gap-3" role="status" aria-label="ИИ печатает">
                <LogoMark size={28} className="mt-0.5" />
                <div className="flex h-8 items-center gap-1">
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="size-1.5 animate-pulse rounded-full bg-fg-subtle"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Composer */}
        <div className="shrink-0 border-t border-border bg-subtle px-3 pb-3 pt-2.5 md:px-4 md:pb-4">
          <div className="mx-auto max-w-3xl space-y-2.5">
            <div className="scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1">
              {suggestions.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSend(sug)}
                  className="h-7 shrink-0 whitespace-nowrap rounded-full border border-border bg-surface px-3 text-xs font-medium text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
                >
                  {sug}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-1.5 shadow-xs transition-[border-color,box-shadow] focus-within:border-accent focus-within:ring-[3px] focus-within:ring-accent-soft-strong">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={toggleListening}
                aria-label={isListening ? t('ai_listening') : "Голосовой ввод"}
                aria-pressed={isListening}
                className={cn(isListening && "bg-danger-soft text-danger hover:bg-danger-soft hover:text-danger")}
              >
                <Mic size={17} />
              </Button>

              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={isListening ? t('ai_listening') : t('ai_placeholder')}
                aria-label={t('ai_placeholder')}
                className="h-8 min-w-0 flex-1 bg-transparent px-2 text-[0.9375rem] text-fg placeholder:text-fg-subtle focus:outline-none focus-visible:outline-none"
              />

              <Button
                variant="primary"
                size="icon-sm"
                onClick={() => handleSend()}
                disabled={!input.trim()}
                aria-label="Отправить"
              >
                <ArrowUp size={17} />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
