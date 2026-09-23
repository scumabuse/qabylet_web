"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, Volume2, Square, Loader2, Radio } from "lucide-react";
import { useAccessibility } from "@/components/AccessibilityProvider";
import { logChatMessage } from "@/app/actions";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";

export default function VoicePage() {
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("Нажмите для начала");
  const [transcript, setTranscript] = useState("Здесь появится ваша речь...");
  const [output, setOutput] = useState("Голосовой ответ появится здесь");
  const [isOutputActive, setIsOutputActive] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const router = useRouter();
  const { ttsEnabled } = useAccessibility();
  const { t } = useLanguage();

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const processTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const initSpeechRecognition = () => {
    if (typeof window === "undefined" || recognitionRef.current) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setStatus("Браузер не поддерживает голосовой ввод");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "ru-RU";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => { 
        setIsListening(true); 
        setIsStarting(false);
        setStatus("🔴 Слушаю вас..."); 
      };

      recognition.onresult = (event: any) => {
        let interim = "", final = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) final += trans;
          else interim += trans;
        }
        
        const display = final || interim;
        if (display) setTranscript(display);

        if (processTimeoutRef.current) clearTimeout(processTimeoutRef.current);
        
        if (final) {
          processCommand(final.toLowerCase().trim());
          recognition.stop();
        } else if (interim) {
          processTimeoutRef.current = setTimeout(() => {
            processCommand(interim.toLowerCase().trim());
            recognition.stop();
          }, 2000);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        setIsStarting(false);
        if (event.error === 'aborted') {
          setStatus("Нажмите для начала");
          return; 
        }
        console.error("SpeechRecognition error:", event.error);
        const msgs: Record<string, string> = {
          "not-allowed": "Разрешите доступ к микрофону",
          "no-speech": "Речь не обнаружена",
          "network": "Ошибка сети",
          "service-not-allowed": "Микрофон заблокирован",
        };
        setStatus(msgs[event.error] || `Ошибка: ${event.error}`);
      };

      recognition.onend = () => { 
        setIsListening(false); 
        setIsStarting(false);
        if (processTimeoutRef.current) clearTimeout(processTimeoutRef.current);
        setStatus("Нажмите для начала"); 
      };

      recognitionRef.current = recognition;
      return recognition;
    } catch (err) {
      console.error("Failed to initialize SpeechRecognition:", err);
      setStatus("Ошибка микрофона");
      return null;
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
    }
    initSpeechRecognition();
    return () => { stopSpeech(); };
  }, []);

  const logToSupabase = async (content: string, role: string) => {
    try {
      const res = await logChatMessage(content, role, 'voice_assistant');
      if (res.error) console.error("Server Action Failed:", res.error);
    } catch (err) { console.error("Failed to log chat:", err); }
  };

  const processCommand = async (text: string) => {
    if (!text || text === "здесь появится ваша речь...") return;
    
    logToSupabase(text, 'user');
    setIsLoading(true);
    setStatus("Обработка...");
    const lowerText = text.toLowerCase().trim();

    const isNavigation = lowerText.includes("открой") || 
                         lowerText.includes("перейди") || 
                         lowerText.includes("покажи") || 
                         lowerText.includes("перекинь") || 
                         lowerText.includes("перебрось") || 
                         lowerText.includes("верни") || 
                         lowerText.includes("открывай") ||
                         lowerText.includes("на главную") ||
                         lowerText.includes("в начало") ||
                         lowerText.includes("домой");

    if (isNavigation) {
      if (lowerText.includes("обучение") || lowerText.includes("урок")) { executeNavigation("/learn", "Открываю раздел обучения. Успехов в учебе!"); return; }
      if (lowerText.includes("жест") || lowerText.includes("алфавит")) { executeNavigation("/signs", "Перехожу к разделу жестового языка."); return; }
      if (lowerText.includes("тьютор") || lowerText.includes("ии") || lowerText.includes("чат")) { executeNavigation("/ai", "Открываю ИИ-тьютора."); return; }
      if (lowerText.includes("главн") || lowerText.includes("домой")) { executeNavigation("/", "Возвращаемся на главную."); return; }
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: [] }),
      });
      const data = await response.json();
      const reply = data.text || "Извините, я не смог обработать ваш запрос.";
      setVoiceOutput(reply);
      if (ttsEnabled) speakText(reply);
      logToSupabase(reply, 'assistant');
    } catch (error) {
      const errorReply = "Произошла ошибка при связи. Попробуйте еще раз.";
      setVoiceOutput(errorReply);
      if (ttsEnabled) speakText(errorReply);
    } finally {
      setIsLoading(false);
      setStatus("Нажмите для начала");
    }
  };

  const executeNavigation = (path: string, reply: string) => {
    setVoiceOutput(reply);
    if (ttsEnabled) speakText(reply);
    logToSupabase(reply, 'assistant');
    setTimeout(() => { router.push(path); setIsLoading(false); }, 1500);
  };

  const setVoiceOutput = (text: string) => {
    setOutput(text);
    setIsOutputActive(true);
    setTimeout(() => setIsOutputActive(false), 2500);
  };

  const speakText = (text: string) => {
    if (!ttsEnabled || !synthRef.current) return;
    const cleanedText = text.replace(/[*_#~`>|]/g, '').replace(/ {2,}/g, ' ').trim();
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.lang = "ru-RU";
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    const voices = synthRef.current.getVoices();
    const ruVoice = voices.find(v => v.lang.startsWith("ru"));
    if (ruVoice) utterance.voice = ruVoice;
    synthRef.current.speak(utterance);
  };

  const toggleVoice = () => {
    // 1. Immediate UI Feedback
    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsListening(false);
      setStatus("Нажмите для начала");
      return;
    }

    if (isStarting) return;

    setStatus("Инициализация...");
    setIsStarting(true);

    // 2. Watchdog timeout (reset if engine fails to start/respond in 5s)
    const watchdog = setTimeout(() => {
      if (isStarting && !isListening) {
        setIsStarting(false);
        setStatus("Тайм-аут: попробуйте еще раз");
      }
    }, 5000);

    // 3. Lazy Init & Start
    let recognition = recognitionRef.current;
    if (!recognition) {
      recognition = initSpeechRecognition();
    }

    if (!recognition) {
      setIsStarting(false);
      clearTimeout(watchdog);
      setStatus("Микрофон не поддерживается");
      return;
    }

    try {
      recognition.start();
    } catch (e) {
      setIsStarting(false);
      clearTimeout(watchdog);
      console.error("Mic start error:", e);
      // If already started, just sync the state
      if (e instanceof Error && e.message.includes("already started")) {
        setIsListening(true);
        setStatus("🔴 Слушаю вас...");
      } else {
        setStatus("Ошибка запуска");
      }
    }
  };

  const stopSpeech = () => {
    if (synthRef.current) synthRef.current.cancel();
    if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
    }
    setIsListening(false);
    setIsStarting(false);
  };

  const startGreeting = () => {
    const text = "Добро пожаловать в Qabilet! Я ваш голосовой помощник. Говорите команды или нажмите на микрофон.";
    setVoiceOutput(text);
    speakText(text);
    logToSupabase(text, 'assistant');
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto relative">

      {/* Ambient glow behind the mic button */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 pointer-events-none -z-0"
        style={{
          background: isListening
            ? 'radial-gradient(ellipse, rgba(239,68,68,0.1) 0%, transparent 65%)'
            : 'radial-gradient(ellipse, rgba(124,58,237,0.1) 0%, transparent 65%)',
          transition: 'background 0.6s ease',
        }}
      />

      {/* Page header */}
      <div className="text-center pt-4 relative z-10">
        <div className="flex justify-center mb-5">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(6,182,212,0.15))',
              border: '1px solid rgba(124,58,237,0.3)',
              boxShadow: '0 0 24px rgba(124,58,237,0.2)',
            }}
          >
            <Radio size={28} className="text-[var(--color-primary-light)]" />
          </div>
        </div>
        <h2 className="font-display text-3xl md:text-4xl font-black mb-2">
          {t('voice_title').split(' ')[0]} <span className="gradient-text">{t('voice_title').split(' ').slice(1).join(' ')}</span>
        </h2>
        <p className="text-[var(--text-secondary)]">{t('voice_subtitle')}</p>
      </div>

      {/* Mic button */}
      <div className="flex flex-col items-center py-6 relative z-10">
        <div className="relative">
          {/* Expanding rings when listening */}
          {isListening && (
            <div className="pointer-events-none">
              <div
                className="absolute inset-0 rounded-full border-2 animate-ping"
                style={{ borderColor: 'rgba(239,68,68,0.4)', animationDuration: '1.5s' }}
              />
              <div
                className="absolute -inset-4 rounded-full border animate-ping"
                style={{ borderColor: 'rgba(239,68,68,0.2)', animationDuration: '2s', animationDelay: '0.3s' }}
              />
              <div
                className="absolute -inset-8 rounded-full border animate-ping"
                style={{ borderColor: 'rgba(239,68,68,0.1)', animationDuration: '2.5s', animationDelay: '0.6s' }}
              />
            </div>
          )}

          <button
            onClick={toggleVoice}
            className="relative w-36 h-36 rounded-full flex items-center justify-center transition-all duration-500 active:scale-95"
            style={{
              background: isListening
                ? 'linear-gradient(135deg, #DC2626, #F87171)'
                : 'linear-gradient(135deg, #7C3AED, #A78BFA)',
              boxShadow: isListening
                ? '0 0 50px rgba(239,68,68,0.5), 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)'
                : '0 0 50px rgba(124,58,237,0.5), 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
              transform: isListening ? 'scale(1.05)' : 'scale(1)',
            }}
            aria-label={isListening ? t('voice_stop') : t('voice_btn_start')}
          >
            <Mic size={48} className="text-white relative z-10 drop-shadow-lg" />
          </button>
        </div>

        <p
          className="mt-6 font-semibold text-sm tracking-wide transition-colors duration-300"
          style={{ color: isListening ? '#F87171' : 'var(--text-secondary)' }}
        >
          {status}
        </p>
      </div>

      {/* Transcript card */}
      <div
        className="relative overflow-hidden rounded-2xl p-5 min-h-[80px] transition-all duration-300 z-10"
        style={{
          background: 'var(--bg-card)',
          border: `1px solid ${transcript !== "Здесь появится ваша речь..." ? 'rgba(124,58,237,0.3)' : 'var(--border-color)'}`,
          boxShadow: transcript !== "Здесь появится ваша речь..."
            ? '0 0 20px rgba(124,58,237,0.1)'
            : 'var(--shadow-card)',
        }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(167,139,250,0.25), transparent)' }}
        />
        <p
          className="leading-relaxed transition-all duration-300"
          style={{
            color: transcript !== "Здесь появится ваша речь..."
              ? 'var(--text-primary)'
              : 'var(--text-muted)',
            fontStyle: transcript !== "Здесь появится ваша речь..." ? 'normal' : 'italic',
          }}
        >
          {transcript}
        </p>
      </div>

      {/* AI Response card */}
      <div
        className="relative overflow-hidden rounded-2xl p-5 flex items-start gap-4 transition-all duration-500 z-10"
        style={{
          background: isOutputActive
            ? 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(6,182,212,0.08))'
            : 'linear-gradient(135deg, rgba(124,58,237,0.07), rgba(6,182,212,0.05))',
          border: `1px solid ${isOutputActive ? 'rgba(124,58,237,0.4)' : 'rgba(124,58,237,0.2)'}`,
          boxShadow: isOutputActive ? '0 0 30px rgba(124,58,237,0.2)' : 'none',
          transform: isOutputActive ? 'scale(1.01)' : 'scale(1)',
        }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(167,139,250,0.35), transparent)' }}
        />

        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          style={{
            background: 'rgba(124,58,237,0.15)',
            border: '1px solid rgba(124,58,237,0.25)',
          }}
        >
          {isLoading
            ? <Loader2 size={20} className="text-[var(--color-primary-light)] animate-spin" />
            : <Volume2 size={20} className="text-[var(--color-primary-light)]" />
          }
        </div>

        <div className="flex-1">
          {isLoading ? (
            <div className="flex gap-1.5 items-center h-7">
              <div className="w-2 h-2 bg-[var(--color-primary-light)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-[var(--color-primary-light)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-[var(--color-primary-light)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          ) : (
            <p className="text-[var(--text-primary)] font-medium leading-relaxed">{output}</p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 w-full pb-4 z-10 relative">
        <button
          onClick={startGreeting}
          className="btn-primary flex-1 py-4"
        >
          <Volume2 size={18} />
          Приветствие
        </button>
        <button
          onClick={stopSpeech}
          className="flex-1 py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-95"
          style={{
            background: 'var(--bg-card2)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.3)';
            (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color)';
            (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
          }}
        >
          <Square size={18} />
          {t('voice_stop')}
        </button>
      </div>
    </div>
  );
}
