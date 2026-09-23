"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, Volume2, Square, Loader2, AudioLines } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { cn, stripEmoji } from "@/lib/utils";
import { speak } from "@/lib/speech";
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

  // The shared speech service also checks the current TTS setting, so
  // replies triggered from the long-lived recognition callbacks respect it.
  const speakText = (text: string) => {
    if (!ttsEnabled) return;
    speak(text, { lang: "ru-RU", rate: 0.95, source: "assistant" });
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

  const hasTranscript = transcript !== "Здесь появится ваша речь...";

  return (
    <div className="space-y-8">
      <PageHeader title={t('voice_title')} description={t('voice_subtitle')} />

      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* Control panel */}
        <Card className="flex flex-col items-center gap-8 px-6 py-10">
          <div className="relative flex size-32 items-center justify-center">
            {isListening && (
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-full bg-danger/25"
                initial={{ scale: 0.85, opacity: 0.6 }}
                animate={{ scale: 1.15, opacity: 0 }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
              />
            )}
            <motion.button
              type="button"
              onClick={toggleVoice}
              whileTap={{ scale: 0.97 }}
              className={cn(
                "relative flex size-28 items-center justify-center rounded-full shadow-md transition-colors duration-300",
                "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
                isListening ? "bg-danger-solid text-white" : "bg-fg text-background hover:opacity-90"
              )}
              aria-label={isListening ? t('voice_stop') : t('voice_btn_start')}
              aria-pressed={isListening}
            >
              {isListening ? <Square size={30} fill="currentColor" /> : <Mic size={36} strokeWidth={1.75} />}
            </motion.button>
          </div>

          <p
            role="status"
            aria-live="polite"
            className={cn(
              "flex min-h-5 items-center gap-2 text-sm font-medium",
              isListening ? "text-danger" : "text-fg-muted"
            )}
          >
            {isListening && <StatusDot tone="danger" live />}
            {stripEmoji(status)}
          </p>

          <div className="grid w-full grid-cols-2 gap-2">
            <Button onClick={startGreeting}>
              <Volume2 size={16} />
              Приветствие
            </Button>
            <Button variant="ghost" onClick={stopSpeech}>
              <Square size={11} fill="currentColor" />
              {t('voice_stop')}
            </Button>
          </div>
        </Card>

        {/* Conversation */}
        <div className="grid gap-4">
          <Card className="flex min-h-40 flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AudioLines size={15} className="text-fg-subtle" />
                Распознанная речь
              </CardTitle>
            </CardHeader>
            <CardBody className="flex-1">
              <p
                className={cn(
                  "text-lg leading-relaxed transition-colors",
                  hasTranscript ? "text-fg" : "text-fg-subtle"
                )}
              >
                {transcript}
              </p>
            </CardBody>
          </Card>

          <Card
            className={cn(
              "flex min-h-40 flex-col transition-[border-color,background-color] duration-500",
              isOutputActive && "border-accent-border bg-accent-soft"
            )}
          >
            <CardHeader className={cn("transition-colors duration-500", isOutputActive && "border-accent-border")}>
              <CardTitle className="flex items-center gap-2">
                {isLoading
                  ? <Loader2 size={15} className="animate-spin text-fg-subtle" />
                  : <Volume2 size={15} className="text-fg-subtle" />}
                Ответ помощника
              </CardTitle>
            </CardHeader>
            <CardBody className="flex-1" aria-live="polite">
              {isLoading ? (
                <div className="space-y-2.5" aria-label="Обработка">
                  <Skeleton className="h-4 w-11/12" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-4 w-2/5" />
                </div>
              ) : (
                <p className="text-[0.9375rem] leading-relaxed text-fg">{output}</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
