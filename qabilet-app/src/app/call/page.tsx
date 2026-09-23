"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Copy,
  Check,
  Plus,
  UserPlus,
  Maximize2,
  MessageSquare,
  ArrowRight,
  HandMetal,
  Ear,
  Captions,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Card, interactiveCard } from "@/components/ui/card";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/primitives";
import { cn } from "@/lib/utils";
import { SIGNS_DATA } from "@/lib/data";
import { PeerConnection } from "@/lib/PeerConnection";
import { getGesturesLibrary } from "@/app/actions";
import { useLanguage } from "@/components/LanguageProvider";

type CallState = "idle" | "selecting_role" | "creating" | "joining" | "connected";
type UserRole = "mute" | "hearing";
type HandLandmark = { x: number; y: number; z: number };

export default function CallPage() {
  const [state, setState] = useState<CallState>("idle");
  const [roomCode, setRoomCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isHandTrackingOn, setIsHandTrackingOn] = useState(true);
  const [recognizedText, setRecognizedText] = useState("");
  const [peerText, setPeerText] = useState<string | null>(null);
  const [status, setStatus] = useState("Initializing...");
  const [role, setRole] = useState<UserRole>("mute");
  const [gesturesLibrary, setGesturesLibrary] = useState<any[]>([]);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnRef = useRef<PeerConnection | null>(null);
  const handsRef = useRef<any>(null);
  const requestRef = useRef<number | null>(null);
  const isTrackingRef = useRef(false);
  const libraryRef = useRef<any[]>([]);
  const recognitionRef = useRef<any>(null);
  const drawingModuleRef = useRef<any>(null);
  const handsModuleRef = useRef<any>(null);
  const [isListening, setIsListening] = useState(false);
  const { t } = useLanguage();

  // Load gestures library
  useEffect(() => {
    const loadLibrary = async () => {
      const res = await getGesturesLibrary();
      if (res.data) {
        console.log('Загружено жестов из БД:', res.data.length);
        setGesturesLibrary(res.data);
        libraryRef.current = res.data;
      }
    };
    loadLibrary();
  }, []);

  // Sync local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const isInitializingHands = useRef(false);

  // Initialize MediaPipe Hands
  useEffect(() => {
    if (handsRef.current || isInitializingHands.current) return;
    
    const initHands = async () => {
      isInitializingHands.current = true;
      try {
        const handsModule = await import("@mediapipe/hands");
        const drawingModule = await import("@mediapipe/drawing_utils");
        
        handsModuleRef.current = handsModule;
        drawingModuleRef.current = drawingModule;

        // Handle different export patterns (ESM vs CJS)
        const HandsClass = handsModule.Hands || (handsModule as any).default?.Hands || handsModule;
        
        const hands = new HandsClass({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        await hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        hands.onResults(onResults);
        handsRef.current = hands;
        console.log("MediaPipe Hands initialized for Call");
      } catch (error) {
        console.error("Failed to initialize MediaPipe", error);
      } finally {
        isInitializingHands.current = false;
      }
    };

    initHands();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (handsRef.current) {
        try {
          handsRef.current.close();
        } catch (e) {}
        handsRef.current = null;
      }
    };
  }, []);

  const onResults = (results: any) => {
    if (!canvasRef.current) return;
    const canvasCtx = canvasRef.current.getContext("2d");
    if (!canvasCtx) return;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      
      console.log('Начинаю поиск совпадений для координат...');

      // Drawing logic using cached modules
      if (drawingModuleRef.current && handsModuleRef.current) {
        const drawing = drawingModuleRef.current;
        const hands = handsModuleRef.current;
        const connections = hands.HAND_CONNECTIONS || [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]];
        
        for (const handLandmarks of results.multiHandLandmarks) {
          drawing.drawConnectors(canvasCtx, handLandmarks, connections, {
            color: "#6C3AE8",
            lineWidth: 4,
          });
          drawing.drawLandmarks(canvasCtx, handLandmarks, {
            color: "#FFFFFF",
            lineWidth: 1,
            radius: 3,
          });
        }
      }

      let bestMatch = null;
      let minDistance = 0.18; // Threshold for a good match
      let closestFoundDist = 999;

      for (const gesture of libraryRef.current) {
        if (gesture.pattern_json) {
          try {
            const pattern = typeof gesture.pattern_json === 'string' 
              ? JSON.parse(gesture.pattern_json) 
              : gesture.pattern_json;
              
            const dist = compareGestures(landmarks, pattern);
            if (dist < closestFoundDist) closestFoundDist = dist;
            
            if (dist < minDistance) {
              minDistance = dist;
              bestMatch = gesture.word;
            }
          } catch (e) {
            console.warn("Error parsing gesture pattern for word:", gesture.word, e);
          }
        }
      }

      console.log(`Дистанция до ближайшего жеста: ${closestFoundDist.toFixed(4)} (Threshold: ${minDistance})`);

      if (bestMatch && bestMatch !== recognizedText) {
        console.log('Слово из БД:', bestMatch);
        setRecognizedText(bestMatch);
        
        // PeerJS send check
        if (peerConnRef.current) {
          peerConnRef.current.sendData(bestMatch);
        } else {
          console.warn("PeerJS connection not available, cannot send data");
        }

        // Clear after a while
        setTimeout(() => setRecognizedText(""), 3000);
      }
    }
    canvasCtx.restore();
  };

  const normalizeLandmarks = (landmarks: HandLandmark[]) => {
    if (!landmarks || landmarks.length === 0) return [];
    const base = landmarks[0];
    const scale = Math.sqrt(
      Math.pow(landmarks[5].x - landmarks[0].x, 2) + 
      Math.pow(landmarks[5].y - landmarks[0].y, 2)
    ) || 1;

    return landmarks.map(p => ({
      x: (p.x - base.x) / scale,
      y: (p.y - base.y) / scale
    }));
  };

  const compareGestures = (detected: HandLandmark[], pattern: any[]) => {
    if (!detected || !pattern || detected.length !== pattern.length) return 100;
    const normDetected = normalizeLandmarks(detected);
    const normPattern = normalizeLandmarks(pattern);

    let dist = 0;
    for (let i = 0; i < normDetected.length; i++) {
      dist += Math.sqrt(
        Math.pow(normDetected[i].x - normPattern[i].x, 2) + 
        Math.pow(normDetected[i].y - normPattern[i].y, 2)
      );
    }
    return dist / normDetected.length;
  };

  const startSpeechToText = () => {
    if (isListening) return;
    if (typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = "ru-RU";
      recognition.continuous = true;
      recognition.interimResults = false;

      recognition.onresult = (event: any) => {
        const text = event.results[event.results.length - 1][0].transcript;
        console.log("🎙️ Speech detected:", text); // Иконка для заметности в консоли
        setRecognizedText(text);
        peerConnRef.current?.sendData(text);
        // Clear after 3 seconds
        setTimeout(() => setRecognizedText(""), 3000);
      };

      recognition.onerror = (event: any) => {
        const error = event.error;
        if (error === "no-speech" || error === "aborted" || (typeof error === 'string' && error.includes('abort'))) return;
        
        console.error("❌ Speech recognition error:", error);
        if (error === "not-allowed") {
           alert("Доступ к микрофону запрещен. Пожалуйста, разрешите доступ к микрофону в настройках браузера для распознавания речи.");
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        // Restart recognition if it hasn't been explicitly stopped
        if (recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            // Ignore already started errors
          }
        }
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
        setIsListening(true);
        console.log("✅ Слушаю микрофон...");
      } catch (e) {
        console.error("❌ Ошибка при запуске распознавания:", e);
      }
    } else {
      console.error("❌ Распознавание речи не поддерживается в этом браузере.");
      alert("Распознавание речи не поддерживается. Пожалуйста, используйте Google Chrome.");
    }
  };

  const stopSpeechToText = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null; // Disable restart loop
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  useEffect(() => {
    return () => {
      stopSpeechToText();
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (handsRef.current) {
        try {
          handsRef.current.close();
        } catch (e) {}
        handsRef.current = null;
      }
    };
  }, []);

  const startDetectionLoop = () => {
    const process = async () => {
      if (!isTrackingRef.current) return;
      
      if (localVideoRef.current && localVideoRef.current.readyState >= 2 && handsRef.current) {
        try {
          await handsRef.current.send({ image: localVideoRef.current });
        } catch (e) {
          console.error("MediaPipe send error", e);
        }
      }
      
      if (isTrackingRef.current) {
        requestRef.current = requestAnimationFrame(process);
      }
    };
    requestRef.current = requestAnimationFrame(process);
  };

  // Generate 4-digit code
  const generateCode = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setRoomCode(code);
    setState("creating");
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const joinRoom = () => {
    if (inputCode.length === 4) {
      setRoomCode(inputCode);
      setState("selecting_role");
    }
  };

  const startCall = async (isCreator: boolean = true, selectedRole: UserRole) => {
    // Cleanup existing connection if any
    if (peerConnRef.current) {
      console.log("Cleaning up existing connection before starting new one...");
      peerConnRef.current.destroy();
      peerConnRef.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setLocalStream(stream);
      
      // Initialize PeerConnection
      peerConnRef.current = new PeerConnection(
        roomCode,
        isCreator,
        stream,
        (remoteStream) => {
          setRemoteStream(remoteStream);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        },
        (data) => {
          setPeerText(data);
          // Clear after a while
          setTimeout(() => setPeerText(null), 5000);
        },
        (status) => setStatus(status)
      );

      setState("connected");
      
      // Start tracking or speech based on the actual selected role
      if (selectedRole === "mute") {
        isTrackingRef.current = true;
        startDetectionLoop();
      } else if (selectedRole === "hearing") {
        startSpeechToText();
      }

    } catch (err) {
      console.error("Error accessing media devices:", err);
      setStatus("Camera error");
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const newState = !isVideoOn;
      localStream.getVideoTracks().forEach(track => {
        track.enabled = newState;
      });
      setIsVideoOn(newState);
    }
  };

  const toggleMic = () => {
    if (localStream) {
      const newState = !isMicOn;
      localStream.getAudioTracks().forEach(track => {
        track.enabled = newState;
      });
      setIsMicOn(newState);
    }
  };

  const endCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    peerConnRef.current?.destroy();
    peerConnRef.current = null;
    isTrackingRef.current = false;
    stopSpeechToText();
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    
    setLocalStream(null);
    setRemoteStream(null);
    setState("idle");
    setRoomCode("");
    setInputCode("");
  };

  const optionCard = cn(
    "group flex w-full items-start gap-4 rounded-xl border border-border bg-surface p-5 text-left shadow-xs",
    interactiveCard
  );
  const controlBtn = (active: boolean) =>
    cn(
      "flex size-11 items-center justify-center rounded-full border transition-colors duration-150",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40",
      active ? "border-border bg-surface text-fg hover:bg-hover" : "border-transparent bg-danger-solid text-white hover:opacity-90"
    );

  return (
    <div className="space-y-8">
      {state !== "connected" && (
        <PageHeader eyebrow="Qabilet Video" title={t('call_title')} description={t('call_subtitle')} />
      )}

      {state === "idle" && (
        <Stagger className="grid max-w-3xl gap-3 sm:grid-cols-2">
          <StaggerItem>
            <button type="button" onClick={generateCode} className={optionCard}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-fg">
                <Plus size={18} />
              </span>
              <span className="min-w-0 flex-1 space-y-0.5">
                <span className="block text-[0.9375rem] font-semibold text-fg">{t('call_create')}</span>
                <span className="block text-[0.8125rem] text-fg-muted">{t('call_get_code')}</span>
              </span>
              <ArrowRight size={16} className="mt-1 text-fg-subtle transition-transform group-hover:translate-x-0.5" />
            </button>
          </StaggerItem>
          <StaggerItem>
            <button type="button" onClick={() => setState("joining")} className={optionCard}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-fg-muted">
                <UserPlus size={18} />
              </span>
              <span className="min-w-0 flex-1 space-y-0.5">
                <span className="block text-[0.9375rem] font-semibold text-fg">{t('call_join')}</span>
                <span className="block text-[0.8125rem] text-fg-muted">{t('call_enter_code_desc')}</span>
              </span>
              <ArrowRight size={16} className="mt-1 text-fg-subtle transition-transform group-hover:translate-x-0.5" />
            </button>
          </StaggerItem>
        </Stagger>
      )}

      {state === "selecting_role" && (
        <FadeIn className="max-w-3xl space-y-4">
          <SectionHeader title={t('call_role_title')} description={t('call_role_sub')} />
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => { setRole("mute"); startCall(!inputCode, "mute"); }}
              className={cn(optionCard, "flex-col", role === "mute" && "border-accent-border ring-1 ring-accent-border")}
            >
              <span className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted text-fg-muted">
                <HandMetal size={18} />
              </span>
              <span className="space-y-1">
                <span className="block text-[0.9375rem] font-semibold text-fg">{t('call_role_mute')}</span>
                <span className="block text-[0.8125rem] leading-relaxed text-fg-muted">{t('call_role_mute_desc')}</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => { setRole("hearing"); startCall(!inputCode, "hearing"); }}
              className={cn(optionCard, "flex-col", role === "hearing" && "border-accent-border ring-1 ring-accent-border")}
            >
              <span className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted text-fg-muted">
                <Ear size={18} />
              </span>
              <span className="space-y-1">
                <span className="block text-[0.9375rem] font-semibold text-fg">{t('call_role_hearing')}</span>
                <span className="block text-[0.8125rem] leading-relaxed text-fg-muted">{t('call_role_hearing_desc')}</span>
              </span>
            </button>
          </div>
        </FadeIn>
      )}

      {state === "creating" && (
        <FadeIn className="max-w-md">
          <Card className="space-y-6 p-6">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-fg">{t('call_your_code')}</h2>
              <p className="text-[0.8125rem] text-fg-muted">{t('call_get_code')}</p>
            </div>
            <div className="flex gap-2" aria-label={`${t('call_room_code')} ${roomCode}`}>
              {roomCode.split('').map((digit, i) => (
                <span
                  key={i}
                  className="flex h-16 flex-1 items-center justify-center rounded-lg border border-border bg-muted font-mono text-3xl font-medium tabular-nums text-fg"
                >
                  {digit}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleCopyCode}>
                {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                {copied ? t('call_copied') : t('call_copy')}
              </Button>
              <Button variant="primary" onClick={() => setState("selecting_role")}>
                {t('call_select_role')}
                <ArrowRight size={16} />
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setState("idle")} className="w-full">
              {t('call_cancel')}
            </Button>
          </Card>
        </FadeIn>
      )}

      {state === "joining" && (
        <FadeIn className="max-w-md">
          <Card className="space-y-6 p-6">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-fg">{t('call_enter_code')}</h2>
              <p className="text-[0.8125rem] text-fg-muted">{t('call_enter_code_desc')}</p>
            </div>
            <div className="flex gap-2">
              {[0, 1, 2, 3].map((i) => (
                <input
                  key={i}
                  type="text"
                  inputMode="numeric"
                  aria-label={`${t('call_enter_code')} ${i + 1}`}
                  maxLength={1}
                  className="h-16 w-full min-w-0 flex-1 rounded-lg border border-border bg-surface text-center font-mono text-3xl font-medium tabular-nums text-fg shadow-xs transition-[border-color,box-shadow] hover:border-border-strong focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent-soft-strong"
                  value={inputCode[i] || ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    if (val) {
                      const newCode = inputCode.split("");
                      newCode[i] = val;
                      setInputCode(newCode.join(""));
                      if (i < 3) (e.target.nextElementSibling as HTMLInputElement)?.focus();
                    } else {
                      const newCode = inputCode.split("");
                      newCode[i] = "";
                      setInputCode(newCode.join(""));
                      if (i > 0) (e.target.previousElementSibling as HTMLInputElement)?.focus();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !inputCode[i] && i > 0) {
                      (e.currentTarget.previousElementSibling as HTMLInputElement)?.focus();
                    }
                  }}
                  autoFocus={i === 0}
                />
              ))}
            </div>
            <Button
              variant="primary"
              size="lg"
              disabled={inputCode.length < 4}
              onClick={joinRoom}
              className="w-full"
            >
              <UserPlus size={16} />
              {t('call_join_room')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setState("idle")} className="w-full">
              {t('call_back')}
            </Button>
          </Card>
        </FadeIn>
      )}

      {state === "connected" && (
        <FadeIn className="flex flex-col gap-3">
          {/* Stage */}
          <div className="relative h-[calc(100dvh-13rem)] min-h-[420px] overflow-hidden rounded-xl border border-border bg-black shadow-sm md:h-[calc(100dvh-11rem)]">
            {/* Remote video (main view) */}
            <div className="absolute inset-0 z-0 bg-black">
              {remoteStream ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  onLoadedMetadata={(e) => e.currentTarget.play()}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-neutral-950 text-center">
                  <span className="flex size-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50">
                    <UserPlus size={22} />
                  </span>
                  <p className="text-sm font-medium text-white/85">{t('call_waiting')}</p>
                  <p className="font-mono text-xs text-white/50">{t('call_room_code')} {roomCode}</p>
                </div>
              )}
            </div>

            {/* Local video (PiP) */}
            <div className="absolute right-3 top-3 z-20 aspect-video w-36 overflow-hidden rounded-lg border border-white/15 bg-neutral-900 shadow-lg sm:w-48 md:w-64">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={(e) => e.currentTarget.play()}
                className="w-full h-full object-cover"
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none z-10"
                width={640}
                height={480}
              />
              {!isVideoOn && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-950">
                  <VideoOff className="text-white/40" size={22} />
                </div>
              )}
              <span className="absolute bottom-1.5 left-1.5 z-20 rounded bg-black/60 px-1.5 py-0.5 text-[0.625rem] font-medium text-white">
                Вы ({role === "mute" ? "Жесты" : "Слушатель"})
              </span>
            </div>

            {/* Captions */}
            <AnimatePresence>
              {role === "hearing" && peerText && (
                <motion.div
                  key="caption-hearing"
                  className="pointer-events-none absolute inset-x-0 bottom-6 z-30 flex justify-center px-4"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="max-w-2xl rounded-xl bg-black/80 px-6 py-4 text-center" aria-live="polite">
                    <p className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-white/55">Перевод жестов</p>
                    <p className="mt-1 text-3xl font-semibold tracking-[-0.02em] text-white">{peerText}</p>
                  </div>
                </motion.div>
              )}
              {role === "mute" && peerText && (
                <motion.div
                  key="caption-mute"
                  className="pointer-events-none absolute inset-x-0 bottom-6 z-30 flex justify-center px-4"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="max-w-2xl rounded-xl bg-black/80 px-6 py-4 text-center" aria-live="polite">
                    <p className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-white/55">Слышащий говорит:</p>
                    <p className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-white">{peerText}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* What you are sending */}
            <AnimatePresence>
              {recognizedText && (
                <motion.div
                  key="sending"
                  className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center px-4"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="min-w-[min(360px,85vw)] rounded-xl border border-white/10 bg-neutral-950/90 px-8 py-6 text-center shadow-lg">
                    <p className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-white/55">Передаю собеседнику</p>
                    <p className="mt-2 text-4xl font-semibold tracking-[-0.025em] text-white">{recognizedText}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Status badges */}
            <div className="absolute left-3 top-3 z-20 flex flex-col items-start gap-1.5">
              <Badge variant="overlay">
                <StatusDot tone={status === "Connected" ? "success" : "warning"} live={status === "Connected"} />
                {status}
              </Badge>
              <Badge variant="overlay">
                <Captions />
                AI Translate On
              </Badge>
            </div>
          </div>

          {/* Control bar */}
          <Card className="flex items-center justify-between gap-2 px-3 py-2.5">
            <p className="hidden min-w-0 truncate font-mono text-xs text-fg-subtle sm:block">
              {t('call_room_code')} {roomCode}
            </p>

            <div className="mx-auto flex items-center gap-2 sm:mx-0">
              <button
                type="button"
                onClick={toggleMic}
                aria-label={t('call_mute')}
                aria-pressed={!isMicOn}
                className={controlBtn(isMicOn)}
              >
                {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
              </button>
              <button
                type="button"
                onClick={toggleVideo}
                aria-label={t('call_camera')}
                aria-pressed={!isVideoOn}
                className={controlBtn(isVideoOn)}
              >
                {isVideoOn ? <Video size={18} /> : <VideoOff size={18} />}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isListening) stopSpeechToText();
                  else startSpeechToText();
                }}
                aria-label="Распознавание речи"
                aria-pressed={isListening}
                className={cn(
                  controlBtn(true),
                  isListening && "border-success/40 bg-success-soft text-success hover:bg-success-soft"
                )}
              >
                <Captions size={18} />
              </button>
              <button type="button" disabled aria-label="Чат" className={controlBtn(true)}>
                <MessageSquare size={18} />
              </button>
              <button
                type="button"
                onClick={endCall}
                aria-label={t('call_end')}
                className="ml-1 flex h-11 items-center justify-center gap-2 rounded-full bg-danger-solid px-5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.98]"
              >
                <PhoneOff size={18} />
                <span className="hidden sm:inline">{t('call_end')}</span>
              </button>
            </div>

            <button
              type="button"
              disabled
              aria-label="Полный экран"
              className="hidden size-9 items-center justify-center rounded-lg text-fg-subtle disabled:opacity-40 sm:flex"
            >
              <Maximize2 size={16} />
            </button>
          </Card>
        </FadeIn>
      )}
    </div>
  );
}
