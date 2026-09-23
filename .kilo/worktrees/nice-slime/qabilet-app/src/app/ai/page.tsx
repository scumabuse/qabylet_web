"use client";

import React, { useState, useRef, useEffect } from "react";
import { BrainCircuit, Send, Mic, TrendingUp, Sparkles, Volume2, X, RefreshCw } from "lucide-react";
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

  const speakText = (text: string) => {
    if (!ttsEnabled || !synthRef.current) return;
    synthRef.current.cancel();
    const cleaned = cleanTextForSpeech(text);
    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.lang = "ru-RU";
    utterance.rate = 1.0;
    synthRef.current.speak(utterance);
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
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto animate-in slide-in-from-bottom-4 duration-500 relative">

      {/* Sign Avatar overlay */}
      <div className="fixed top-24 right-8 z-30 w-64 group">
        <div className="rounded-[20px] overflow-hidden shadow-2xl" style={{ border: '2px solid rgba(124,58,237,0.5)' }}>
          <SignAvatar currentWord={activeWord} className="w-full" />
        </div>
        {activeWord && (
          <button
            onClick={() => setActiveWord(null)}
            className="absolute -top-2 -right-2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-40"
            style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 mb-5 shrink-0">

        {/* Title card */}
        <div
          className="flex-1 flex items-center justify-between p-5 rounded-2xl"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-13 h-13 w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                boxShadow: '0 4px 16px rgba(245,158,11,0.4)',
              }}
            >
              <BrainCircuit size={24} className="text-white" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold">{t('ai_title')}</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-xs text-[var(--text-muted)] font-medium">{t('ai_online')}</p>
              </div>
            </div>
          </div>

          {gestureLibrary.length === 0 && (
            <button
              onClick={handleSeed}
              disabled={isSeeding}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200"
              style={{
                background: 'rgba(124,58,237,0.1)',
                border: '1px solid rgba(124,58,237,0.2)',
                color: 'var(--color-primary-light)',
              }}
            >
              <RefreshCw size={12} className={isSeeding ? "animate-spin" : ""} />
              {isSeeding ? t('ai_syncing') : t('ai_sync')}
            </button>
          )}
        </div>

        {/* Analytics widget */}
        <div
          className="flex-1 relative overflow-hidden rounded-2xl p-5 group"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(6,182,212,0.06))',
            border: '1px solid rgba(124,58,237,0.2)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-px pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(167,139,250,0.35), transparent)' }}
          />
          <div className="absolute top-3 right-3 opacity-30 group-hover:opacity-80 transition-opacity duration-500">
            <Sparkles size={18} className="text-[var(--color-primary-light)] animate-pulse" />
          </div>

          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={15} className="text-[var(--color-primary-light)]" />
            <h3 className="font-semibold text-xs uppercase tracking-widest text-[var(--color-primary-light)]">
              {t('ai_analytics')}
            </h3>
          </div>

          <div className="flex items-end gap-1.5 h-11">
            {[40, 65, 45, 80, 55, 90, 75].map((h, i) => (
              <div key={i} className="flex-1 relative h-full" style={{ borderRadius: '4px 4px 0 0', overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
                <div
                  className="absolute bottom-0 w-full rounded-t transition-all duration-700"
                  style={{
                    height: `${h}%`,
                    background: 'linear-gradient(180deg, var(--color-primary-light), var(--color-secondary))',
                    animationDelay: `${i * 80}ms`,
                    opacity: 0.8,
                  }}
                />
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[var(--text-muted)] mt-2 text-right font-medium">
            {t('ai_productivity')}
          </p>
        </div>
      </div>

      {/* Chat area */}
      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '20px',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 max-w-[85%] ${msg.isUser ? 'ml-auto flex-row-reverse' : ''}`}>

              {/* Avatar */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base"
                style={msg.isUser ? {
                  background: 'var(--surface)',
                  border: '1px solid var(--border-color)',
                } : {
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                  boxShadow: '0 2px 12px rgba(124,58,237,0.4)',
                }}
              >
                {msg.isUser ? '👤' : '🤖'}
              </div>

              {/* Bubble */}
              <div
                className="relative px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap group"
                style={msg.isUser ? {
                  background: 'var(--surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '18px 4px 18px 18px',
                  color: 'var(--text-primary)',
                } : {
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(6,182,212,0.07))',
                  border: '1px solid rgba(124,58,237,0.2)',
                  borderRadius: '4px 18px 18px 18px',
                  color: 'var(--text-primary)',
                }}
              >
                {msg.text}
                {!msg.isUser && (
                  <button
                    onClick={() => speakText(msg.text)}
                    className="absolute -right-9 top-1 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
                    style={{
                      background: 'var(--bg-card2)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-muted)',
                    }}
                    title="Озвучить"
                  >
                    <Volume2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex gap-3 max-w-[85%]">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                  boxShadow: '0 2px 12px rgba(124,58,237,0.4)',
                }}
              >
                🤖
              </div>
              <div
                className="px-5 py-4 flex items-center gap-1.5"
                style={{
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(6,182,212,0.07))',
                  border: '1px solid rgba(124,58,237,0.2)',
                  borderRadius: '4px 18px 18px 18px',
                }}
              >
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-[var(--color-primary-light)] animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div
          className="shrink-0 p-4"
          style={{
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-card2)',
            borderRadius: '0 0 20px 20px',
          }}
        >
          {/* Suggestions */}
          <div className="flex gap-2 overflow-x-auto pb-3" style={{ scrollbarWidth: 'none' }}>
            {suggestions.map((sug, i) => (
              <button
                key={i}
                onClick={() => handleSend(sug)}
                className="whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 shrink-0"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.4)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--color-primary-light)';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.08)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                  (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)';
                }}
              >
                {sug}
              </button>
            ))}
          </div>

          {/* Input row */}
          <div className="flex gap-2">
            {/* Mic button */}
            <button
              onClick={toggleListening}
              className="p-3 rounded-xl shrink-0 transition-all duration-200 active:scale-95"
              style={isListening ? {
                background: '#DC2626',
                color: 'white',
                border: '1px solid #F87171',
                boxShadow: '0 0 16px rgba(220,38,38,0.4)',
                animation: 'pulse 1.5s infinite',
              } : {
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
              }}
            >
              <Mic size={19} />
            </button>

            {/* Text input */}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isListening ? t('ai_listening') : t('ai_placeholder')}
              className="flex-1 px-4 py-3 rounded-xl outline-none text-sm transition-all duration-200"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
              }}
              onFocus={e => {
                (e.target as HTMLElement).style.borderColor = 'rgba(124,58,237,0.5)';
                (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)';
              }}
              onBlur={e => {
                (e.target as HTMLElement).style.borderColor = 'var(--border-color)';
                (e.target as HTMLElement).style.boxShadow = 'none';
              }}
            />

            {/* Send button */}
            <button
              onClick={() => handleSend()}
              disabled={!input.trim()}
              className="p-3 rounded-xl shrink-0 transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
                color: 'white',
                boxShadow: input.trim() ? '0 4px 16px rgba(124,58,237,0.4)' : 'none',
              }}
            >
              <Send size={19} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
